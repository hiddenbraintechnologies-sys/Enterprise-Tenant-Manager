import { Router, type Request, type Response } from "express";
import { db } from "../../db";
import { legalInvoices, insertLegalInvoiceSchema } from "@shared/schema";
import { eq, and, desc, asc, sql, ilike, isNull } from "drizzle-orm";
import { z } from "zod";
import { authenticateJWT, requireMinimumRole } from "../auth-middleware";
import { requirePermission } from "../context";
import { tenantIsolationMiddleware, createTenantIsolation } from "../tenant-isolation";
import { auditService } from "../audit";

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
