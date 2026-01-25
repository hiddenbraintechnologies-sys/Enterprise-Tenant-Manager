import { Router, type Request, type Response } from "express";
import { db } from "../../db";
import { realEstateCommissions, agents, properties, tenants, tenantBranding, insertRealEstateCommissionSchema } from "@shared/schema";
import { eq, and, desc, asc, sql, ilike, or } from "drizzle-orm";
import { z } from "zod";
import { authenticateHybrid, requireMinimumRole } from "../auth-middleware";
import { requirePermission } from "../context";
import { tenantIsolationMiddleware, createTenantIsolation } from "../tenant-isolation";
import { auditService } from "../audit";
import { baseFinancialService } from "../../services/base-financial";
import { sendCommissionNotification } from "../../services/real-estate-notification-adapter";

export const commissionsRouter = Router();

const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  sortBy: z.enum(["createdAt", "dealClosedDate", "status", "commissionAmount"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  agentId: z.string().optional(),
  status: z.string().optional(),
  commissionType: z.string().optional(),
  search: z.string().optional(),
});

const middleware = [
  authenticateHybrid(),
  tenantIsolationMiddleware(),
  requireMinimumRole("staff"),
];

commissionsRouter.get("/", ...middleware, async (req: Request, res: Response) => {
  try {
    const tenantId = req.context?.tenant?.id;
    if (!tenantId) {
      return res.status(403).json({ message: "Tenant context required" });
    }

    const query = paginationSchema.parse(req.query);
    const { page, limit, sortBy, sortOrder, agentId, status, commissionType, search } = query;
    const offset = (page - 1) * limit;

    const conditions = [eq(realEstateCommissions.tenantId, tenantId)];

    if (agentId) conditions.push(eq(realEstateCommissions.agentId, agentId));
    if (status) conditions.push(eq(realEstateCommissions.status, status as any));
    if (commissionType) conditions.push(eq(realEstateCommissions.commissionType, commissionType as any));
    if (search) {
      conditions.push(
        or(
          ilike(realEstateCommissions.clientName, `%${search}%`),
          ilike(realEstateCommissions.commissionNumber, `%${search}%`)
        )!
      );
    }

    const orderColumn = {
      createdAt: realEstateCommissions.createdAt,
      dealClosedDate: realEstateCommissions.dealClosedDate,
      status: realEstateCommissions.status,
      commissionAmount: realEstateCommissions.commissionAmount,
    }[sortBy];

    const orderFn = sortOrder === "asc" ? asc : desc;

    const [data, countResult] = await Promise.all([
      db.select()
        .from(realEstateCommissions)
        .where(and(...conditions))
        .orderBy(orderFn(orderColumn))
        .limit(limit)
        .offset(offset),
      db.select({ count: sql<number>`count(*)::int` })
        .from(realEstateCommissions)
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

commissionsRouter.get("/:id", ...middleware, async (req: Request, res: Response) => {
  try {
    const isolation = createTenantIsolation(req);
    const { id } = req.params;

    const [commission] = await db.select()
      .from(realEstateCommissions)
      .where(and(eq(realEstateCommissions.id, id), eq(realEstateCommissions.tenantId, isolation.getTenantId())));

    if (!commission) {
      return res.status(404).json({ message: "Commission not found" });
    }

    res.json(commission);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

commissionsRouter.post("/", ...middleware, requirePermission("commissions:create"), async (req: Request, res: Response) => {
  try {
    const isolation = createTenantIsolation(req);
    const tenantId = isolation.getTenantId();

    const commissionNumber = `COM-${Date.now().toString(36).toUpperCase()}`;

    const parsed = insertRealEstateCommissionSchema.safeParse({
      ...req.body,
      tenantId,
      commissionNumber,
      createdBy: req.context?.user?.id,
    });

    if (!parsed.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const [commission] = await db.insert(realEstateCommissions).values(parsed.data).returning();

    await auditService.logAsync({
      tenantId,
      userId: req.context?.user?.id,
      action: "create",
      resource: "real_estate_commission",
      resourceId: commission.id,
      metadata: { commissionNumber: commission.commissionNumber, amount: commission.commissionAmount },
    });

    res.status(201).json(commission);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

commissionsRouter.patch("/:id", ...middleware, requirePermission("commissions:update"), async (req: Request, res: Response) => {
  try {
    const isolation = createTenantIsolation(req);
    const { id } = req.params;

    const [existing] = await db.select()
      .from(realEstateCommissions)
      .where(and(eq(realEstateCommissions.id, id), eq(realEstateCommissions.tenantId, isolation.getTenantId())));

    if (!existing) {
      return res.status(404).json({ message: "Commission not found" });
    }

    const updateSchema = insertRealEstateCommissionSchema.partial().omit({ tenantId: true });
    const parsed = updateSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const [updated] = await db.update(realEstateCommissions)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(realEstateCommissions.id, id))
      .returning();

    await auditService.logAsync({
      tenantId: isolation.getTenantId(),
      userId: req.context?.user?.id,
      action: "update",
      resource: "real_estate_commission",
      resourceId: id,
      metadata: { changes: Object.keys(parsed.data) },
    });

    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

commissionsRouter.delete("/:id", ...middleware, requirePermission("commissions:delete"), async (req: Request, res: Response) => {
  try {
    const isolation = createTenantIsolation(req);
    const { id } = req.params;

    const [existing] = await db.select()
      .from(realEstateCommissions)
      .where(and(eq(realEstateCommissions.id, id), eq(realEstateCommissions.tenantId, isolation.getTenantId())));

    if (!existing) {
      return res.status(404).json({ message: "Commission not found" });
    }

    await db.delete(realEstateCommissions).where(eq(realEstateCommissions.id, id));

    await auditService.logAsync({
      tenantId: isolation.getTenantId(),
      userId: req.context?.user?.id,
      action: "delete",
      resource: "real_estate_commission",
      resourceId: id,
    });

    res.status(204).send();
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

commissionsRouter.get("/:id/pdf", ...middleware, async (req: Request, res: Response) => {
  try {
    const isolation = createTenantIsolation(req);
    const { id } = req.params;

    const [commission] = await db.select()
      .from(realEstateCommissions)
      .where(and(eq(realEstateCommissions.id, id), eq(realEstateCommissions.tenantId, isolation.getTenantId())));

    if (!commission) {
      return res.status(404).json({ message: "Commission not found" });
    }

    const [agent] = await db.select()
      .from(agents)
      .where(eq(agents.id, commission.agentId));

    const [tenant] = await db.select()
      .from(tenants)
      .where(eq(tenants.id, isolation.getTenantId()));

    const [branding] = await db.select()
      .from(tenantBranding)
      .where(eq(tenantBranding.tenantId, isolation.getTenantId()));

    let property = null;
    if (commission.propertyId) {
      const [prop] = await db.select()
        .from(properties)
        .where(eq(properties.id, commission.propertyId));
      property = prop;
    }

    const pdfBuffer = await baseFinancialService.generateInvoicePDF({
      invoice: {
        id: commission.id,
        invoiceNumber: commission.commissionNumber || `COM-${commission.id.slice(0, 8)}`,
        invoiceType: "commission_statement",
        status: commission.status === "paid" ? "paid" : commission.status === "approved" ? "issued" : "draft",
        invoiceDate: commission.dealClosedDate ? new Date(commission.dealClosedDate) : new Date(),
        dueDate: commission.paymentDueDate ? new Date(commission.paymentDueDate) : null,
        currency: commission.currency || "INR",
        baseCurrency: "INR",
        exchangeRate: 1,
        subtotal: parseFloat(commission.commissionAmount ?? "0"),
        discountAmount: 0,
        taxAmount: parseFloat(commission.taxAmount ?? "0"),
        totalAmount: parseFloat(commission.netAmount ?? "0"),
        paidAmount: parseFloat(commission.paidAmount ?? "0"),
        balanceAmount: parseFloat(commission.netAmount ?? "0") - parseFloat(commission.paidAmount ?? "0"),
        taxMetadata: {},
        billingName: agent?.name || "Agent",
        billingAddress: null,
        billingCity: null,
        billingState: null,
        billingPostalCode: null,
        billingCountry: "India",
        billingEmail: agent?.email || null,
        billingPhone: agent?.phone || null,
        customerTaxId: null,
        customerTaxIdType: null,
        tenantTaxId: null,
        tenantTaxIdType: null,
        tenantBusinessName: tenant?.name || null,
        tenantAddress: tenant?.address || null,
        notes: commission.notes,
        termsAndConditions: null,
        complianceCountry: "IN",
      },
      items: [
        {
          description: `Commission - ${commission.commissionType || "Sale"} - ${property?.name || commission.description || "Property Deal"}`,
          quantity: 1,
          unitPrice: parseFloat(commission.commissionAmount ?? "0"),
          discountAmount: 0,
          taxRate: parseFloat(commission.taxAmount ?? "0") > 0 ? 18 : 0,
          hsnCode: "997212",
        }
      ],
      branding: branding ? {
        logoUrl: branding.logoUrl ?? null,
        primaryColor: branding.primaryColor ?? "#1e40af",
        secondaryColor: branding.secondaryColor ?? "#3b82f6",
        fontFamily: "Inter",
        emailFromName: branding.emailFromName ?? null,
        supportEmail: branding.supportEmail ?? null,
        supportPhone: branding.supportPhone ?? null,
      } : null,
      tenant: {
        name: tenant?.name || "Tenant",
        address: tenant?.address || null,
      },
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="commission-${commission.commissionNumber || commission.id}.pdf"`);
    res.send(pdfBuffer);
  } catch (error: any) {
    console.error("[real-estate/commissions] PDF generation error:", error);
    res.status(500).json({ message: "Failed to generate PDF", error: error.message });
  }
});

commissionsRouter.post("/:id/notify", ...middleware, requirePermission("commissions:notify"), async (req: Request, res: Response) => {
  try {
    const isolation = createTenantIsolation(req);
    const { id } = req.params;
    const { eventType } = req.body;

    const [commission] = await db.select()
      .from(realEstateCommissions)
      .where(and(eq(realEstateCommissions.id, id), eq(realEstateCommissions.tenantId, isolation.getTenantId())));

    if (!commission) {
      return res.status(404).json({ message: "Commission not found" });
    }

    const [agent] = await db.select()
      .from(agents)
      .where(eq(agents.id, commission.agentId));

    if (!agent) {
      return res.status(404).json({ message: "Agent not found" });
    }

    let property = null;
    if (commission.propertyId) {
      const [prop] = await db.select()
        .from(properties)
        .where(eq(properties.id, commission.propertyId));
      property = prop;
    }

    const [tenant] = await db.select()
      .from(tenants)
      .where(eq(tenants.id, isolation.getTenantId()));

    const validEventTypes = ["INVOICE_CREATED", "PAYMENT_REMINDER", "PAYMENT_RECEIVED", "INVOICE_OVERDUE"];
    const notificationEventType = validEventTypes.includes(eventType) ? eventType : "INVOICE_CREATED";

    await sendCommissionNotification(
      isolation.getTenantId(),
      {
        agentName: agent.name,
        agentEmail: agent.email ?? undefined,
        agentPhone: agent.phone ?? undefined,
        clientName: commission.clientName ?? undefined,
        propertyAddress: property?.address ?? undefined,
        dealValue: commission.dealValue ?? "0",
        commissionAmount: commission.commissionAmount ?? "0",
        netAmount: commission.netAmount ?? "0",
        currency: commission.currency || "INR",
        commissionNumber: commission.commissionNumber || commission.id,
        dealClosedDate: commission.dealClosedDate ?? undefined,
        paymentDueDate: commission.paymentDueDate ?? undefined,
        commissionType: commission.commissionType ?? undefined,
        tenantName: tenant?.name ?? undefined,
      },
      notificationEventType
    );

    await auditService.logAsync({
      tenantId: isolation.getTenantId(),
      userId: req.context?.user?.id,
      action: "access",
      resource: "real_estate_commission",
      resourceId: id,
      metadata: { eventType: notificationEventType, notificationSent: true },
    });

    res.json({ success: true, message: "Notification sent successfully" });
  } catch (error: any) {
    console.error("[real-estate/commissions] Notification error:", error);
    res.status(500).json({ message: "Failed to send notification", error: error.message });
  }
});
