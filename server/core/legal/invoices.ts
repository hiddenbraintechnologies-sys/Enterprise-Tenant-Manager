import { Router, type Request, type Response } from "express";
import { db } from "../../db";
import { legalInvoices, legalClients, tenants, tenantBranding, insertLegalInvoiceSchema } from "@shared/schema";
import { eq, and, desc, asc, sql, ilike, isNull } from "drizzle-orm";
import { z } from "zod";
import { authenticateJWT, requireMinimumRole } from "../auth-middleware";
import { requirePermission } from "../context";
import { tenantIsolationMiddleware, createTenantIsolation } from "../tenant-isolation";
import { auditService } from "../audit";
import { baseFinancialService } from "../../services/base-financial";
import { sendLegalInvoiceNotification } from "../../services/legal-notification-adapter";

export const legalInvoicesRouter = Router();

const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  sortBy: z.enum(["createdAt", "invoiceNumber", "status", "dueDate", "totalAmount"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  search: z.string().optional(),
  clientId: z.string().optional(),
  caseId: z.string().optional(),
  status: z.string().optional(),
});

const middleware = [
  authenticateJWT({ required: true }),
  tenantIsolationMiddleware(),
  requireMinimumRole("staff"),
];

legalInvoicesRouter.get("/", ...middleware, async (req: Request, res: Response) => {
  try {
    const tenantId = req.context?.tenant?.id;
    if (!tenantId) {
      return res.status(403).json({ message: "Tenant context required" });
    }

    const query = paginationSchema.parse(req.query);
    const { page, limit, sortBy, sortOrder, search, clientId, caseId, status } = query;
    const offset = (page - 1) * limit;

    const conditions = [eq(legalInvoices.tenantId, tenantId), isNull(legalInvoices.deletedAt)];

    if (search) {
      conditions.push(ilike(legalInvoices.invoiceNumber, `%${search}%`));
    }

    if (clientId) {
      conditions.push(eq(legalInvoices.clientId, clientId));
    }

    if (caseId) {
      conditions.push(eq(legalInvoices.caseId, caseId));
    }

    if (status) {
      conditions.push(eq(legalInvoices.status, status as any));
    }

    const orderColumn = {
      createdAt: legalInvoices.createdAt,
      invoiceNumber: legalInvoices.invoiceNumber,
      status: legalInvoices.status,
      dueDate: legalInvoices.dueDate,
      totalAmount: legalInvoices.totalAmount,
    }[sortBy];

    const orderFn = sortOrder === "asc" ? asc : desc;

    const [data, countResult] = await Promise.all([
      db.select()
        .from(legalInvoices)
        .where(and(...conditions))
        .orderBy(orderFn(orderColumn))
        .limit(limit)
        .offset(offset),
      db.select({ count: sql<number>`count(*)::int` })
        .from(legalInvoices)
        .where(and(...conditions)),
    ]);

    const total = countResult[0]?.count || 0;

    res.json({
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

legalInvoicesRouter.get("/:id", ...middleware, async (req: Request, res: Response) => {
  try {
    const isolation = createTenantIsolation(req);
    const { id } = req.params;

    const [invoice] = await db.select()
      .from(legalInvoices)
      .where(and(eq(legalInvoices.id, id), eq(legalInvoices.tenantId, isolation.getTenantId()), isNull(legalInvoices.deletedAt)));

    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    res.json(invoice);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

legalInvoicesRouter.post("/", ...middleware, requirePermission("legal_invoices:create"), async (req: Request, res: Response) => {
  try {
    const isolation = createTenantIsolation(req);
    const tenantId = isolation.getTenantId();

    const parsed = insertLegalInvoiceSchema.safeParse({
      ...req.body,
      tenantId,
      createdBy: req.context?.user?.id,
    });

    if (!parsed.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const [invoice] = await db.insert(legalInvoices).values(parsed.data).returning();

    await auditService.logAsync({
      tenantId,
      userId: req.context?.user?.id,
      action: "create",
      resource: "legal_invoice",
      resourceId: invoice.id,
      metadata: { invoiceNumber: invoice.invoiceNumber, amount: invoice.totalAmount },
    });

    res.status(201).json(invoice);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

legalInvoicesRouter.patch("/:id", ...middleware, requirePermission("legal_invoices:update"), async (req: Request, res: Response) => {
  try {
    const isolation = createTenantIsolation(req);
    const { id } = req.params;

    const [existing] = await db.select()
      .from(legalInvoices)
      .where(and(eq(legalInvoices.id, id), eq(legalInvoices.tenantId, isolation.getTenantId()), isNull(legalInvoices.deletedAt)));

    if (!existing) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    const updateSchema = insertLegalInvoiceSchema.partial().omit({ tenantId: true });
    const parsed = updateSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const [updated] = await db.update(legalInvoices)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(legalInvoices.id, id))
      .returning();

    await auditService.logAsync({
      tenantId: isolation.getTenantId(),
      userId: req.context?.user?.id,
      action: "update",
      resource: "legal_invoice",
      resourceId: id,
      metadata: { changes: Object.keys(parsed.data) },
    });

    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

legalInvoicesRouter.post("/:id/payment", ...middleware, requirePermission("legal_invoices:update"), async (req: Request, res: Response) => {
  try {
    const isolation = createTenantIsolation(req);
    const { id } = req.params;
    const { amount, paymentDate } = req.body;

    const [existing] = await db.select()
      .from(legalInvoices)
      .where(and(eq(legalInvoices.id, id), eq(legalInvoices.tenantId, isolation.getTenantId()), isNull(legalInvoices.deletedAt)));

    if (!existing) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    const paidAmount = parseFloat(existing.paidAmount || "0") + parseFloat(amount);
    const totalAmount = parseFloat(existing.totalAmount || "0");
    const newStatus = paidAmount >= totalAmount ? "paid" : paidAmount > 0 ? "partial" : existing.status;
    const balanceAmount = totalAmount - paidAmount;

    const [updated] = await db.update(legalInvoices)
      .set({
        paidAmount: paidAmount.toString(),
        balanceAmount: balanceAmount.toString(),
        status: newStatus as any,
        lastPaymentDate: paymentDate || new Date().toISOString().split("T")[0],
        updatedAt: new Date(),
      })
      .where(eq(legalInvoices.id, id))
      .returning();

    await auditService.logAsync({
      tenantId: isolation.getTenantId(),
      userId: req.context?.user?.id,
      action: "update",
      resource: "legal_invoice_payment",
      resourceId: id,
      metadata: { 
        paymentAmount: amount, 
        previousPaid: existing.paidAmount, 
        newPaid: paidAmount.toString(),
        statusChange: { from: existing.status, to: newStatus },
      },
    });

    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

legalInvoicesRouter.patch("/:id/trust-account", ...middleware, requirePermission("legal_invoices:update"), async (req: Request, res: Response) => {
  try {
    const isolation = createTenantIsolation(req);
    const { id } = req.params;
    const { trustAccountApplied } = req.body;

    const [existing] = await db.select()
      .from(legalInvoices)
      .where(and(eq(legalInvoices.id, id), eq(legalInvoices.tenantId, isolation.getTenantId()), isNull(legalInvoices.deletedAt)));

    if (!existing) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    const [updated] = await db.update(legalInvoices)
      .set({
        trustAccountApplied: trustAccountApplied?.toString(),
        updatedAt: new Date(),
      })
      .where(eq(legalInvoices.id, id))
      .returning();

    await auditService.logAsync({
      tenantId: isolation.getTenantId(),
      userId: req.context?.user?.id,
      action: "update",
      resource: "legal_invoice_trust",
      resourceId: id,
      metadata: { trustAccountApplied },
    });

    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

legalInvoicesRouter.delete("/:id", ...middleware, requirePermission("legal_invoices:delete"), async (req: Request, res: Response) => {
  try {
    const isolation = createTenantIsolation(req);
    const { id } = req.params;

    const [existing] = await db.select()
      .from(legalInvoices)
      .where(and(eq(legalInvoices.id, id), eq(legalInvoices.tenantId, isolation.getTenantId()), isNull(legalInvoices.deletedAt)));

    if (!existing) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    await db.update(legalInvoices).set({ deletedAt: new Date() }).where(eq(legalInvoices.id, id));

    await auditService.logAsync({
      tenantId: isolation.getTenantId(),
      userId: req.context?.user?.id,
      action: "delete",
      resource: "legal_invoice",
      resourceId: id,
      metadata: { invoiceNumber: existing.invoiceNumber },
    });

    res.status(204).send();
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

legalInvoicesRouter.get("/:id/pdf", ...middleware, requirePermission("legal_invoices:read"), async (req: Request, res: Response) => {
  try {
    const isolation = createTenantIsolation(req);
    const { id } = req.params;

    const [invoice] = await db.select()
      .from(legalInvoices)
      .where(and(eq(legalInvoices.id, id), eq(legalInvoices.tenantId, isolation.getTenantId()), isNull(legalInvoices.deletedAt)));

    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    const [client] = invoice.clientId ? await db.select().from(legalClients).where(eq(legalClients.id, invoice.clientId)) : [null];
    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, isolation.getTenantId()));
    const [branding] = await db.select().from(tenantBranding).where(eq(tenantBranding.tenantId, isolation.getTenantId()));

    // Build client name from firstName/lastName or companyName
    const clientName = client
      ? (client.companyName || [client.firstName, client.lastName].filter(Boolean).join(" ") || null)
      : null;

    const pdfBuffer = await baseFinancialService.generateInvoicePDF({
      invoice: {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber || "",
        invoiceType: "tax_invoice",
        status: invoice.status || "draft",
        invoiceDate: new Date(invoice.invoiceDate),
        dueDate: invoice.dueDate ? new Date(invoice.dueDate) : null,
        currency: invoice.currency || "INR",
        baseCurrency: "INR",
        exchangeRate: 1,
        subtotal: parseFloat(invoice.subtotal),
        discountAmount: parseFloat(invoice.discountAmount || "0"),
        taxAmount: parseFloat(invoice.taxAmount || "0"),
        totalAmount: parseFloat(invoice.totalAmount),
        paidAmount: parseFloat(invoice.paidAmount || "0"),
        balanceAmount: parseFloat(invoice.balanceAmount || "0"),
        taxMetadata: {},
        billingName: clientName,
        billingAddress: client?.address || null,
        billingCity: null,
        billingState: null,
        billingPostalCode: null,
        billingCountry: null,
        billingEmail: client?.email || null,
        billingPhone: client?.phone || null,
        customerTaxId: null,
        customerTaxIdType: null,
        tenantTaxId: null,
        tenantTaxIdType: null,
        tenantBusinessName: tenant?.name || null,
        tenantAddress: null,
        notes: invoice.notes,
        termsAndConditions: null,
        complianceCountry: "IN",
      },
      items: [
        {
          description: invoice.notes || "Legal Services",
          quantity: 1,
          unitPrice: parseFloat(invoice.subtotal),
          discountAmount: parseFloat(invoice.discountAmount || "0"),
          taxRate: 18,
          hsnCode: "998231",
        }
      ],
      branding: branding ? {
        logoUrl: branding.logoUrl,
        primaryColor: branding.primaryColor || "#3B82F6",
        secondaryColor: branding.secondaryColor || "#1E40AF",
        fontFamily: branding.fontFamily || "Helvetica",
        emailFromName: branding.emailFromName,
        supportEmail: branding.supportEmail,
        supportPhone: branding.supportPhone,
      } : null,
      tenant: {
        name: tenant?.name || "Legal Firm",
        address: null,
      },
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="invoice-${invoice.invoiceNumber}.pdf"`);
    res.send(pdfBuffer);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

legalInvoicesRouter.post("/:id/notify", ...middleware, requirePermission("legal_invoices:update"), async (req: Request, res: Response) => {
  try {
    const isolation = createTenantIsolation(req);
    const { id } = req.params;
    const { eventType } = req.body;

    const [invoice] = await db.select()
      .from(legalInvoices)
      .where(and(eq(legalInvoices.id, id), eq(legalInvoices.tenantId, isolation.getTenantId()), isNull(legalInvoices.deletedAt)));

    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    const [client] = invoice.clientId ? await db.select().from(legalClients).where(eq(legalClients.id, invoice.clientId)) : [null];

    if (!client) {
      return res.status(400).json({ message: "No client associated with this invoice" });
    }

    // Build client name for notification
    const notifyClientName = client.companyName || [client.firstName, client.lastName].filter(Boolean).join(" ") || "Client";

    await sendLegalInvoiceNotification(
      isolation.getTenantId(),
      eventType || "INVOICE_ISSUED",
      {
        clientName: notifyClientName,
        clientEmail: client.email || undefined,
        clientPhone: client.phone || undefined,
        invoiceNumber: invoice.invoiceNumber || "",
        totalAmount: invoice.totalAmount,
        currency: invoice.currency || "INR",
        dueDate: invoice.dueDate || undefined,
        paidAmount: invoice.paidAmount || "0",
        balanceAmount: invoice.balanceAmount || "0",
        invoiceId: invoice.id,
      }
    );

    await auditService.logAsync({
      tenantId: isolation.getTenantId(),
      userId: req.context?.user?.id,
      action: "access",
      resource: "legal_invoice_notification",
      resourceId: id,
      metadata: { eventType, clientEmail: client.email },
    });

    res.json({ message: "Notification sent successfully" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});
