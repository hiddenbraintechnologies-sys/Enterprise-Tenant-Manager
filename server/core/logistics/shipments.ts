import { Router, type Request, type Response } from "express";
import { db } from "../../db";
import { shipments, tenants, tenantBranding, insertShipmentSchema } from "@shared/schema";
import { eq, and, desc, asc, sql, ilike, or, isNull } from "drizzle-orm";
import { z } from "zod";
import { authenticateHybrid, requireMinimumRole } from "../auth-middleware";
import { requirePermission } from "../context";
import { tenantIsolationMiddleware, createTenantIsolation } from "../tenant-isolation";
import { auditService } from "../audit";
import { baseFinancialService } from "../../services/base-financial";
import { sendShipmentUpdate, sendDeliveryNotification } from "../../services/notification-adapters";

export const shipmentsRouter = Router();

const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  sortBy: z.enum(["createdAt", "trackingNumber", "status", "pickupDate"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  search: z.string().optional(),
  status: z.string().optional(),
  tripId: z.string().optional(),
});

const middleware = [
  authenticateHybrid(),
  tenantIsolationMiddleware(),
  requireMinimumRole("staff"),
];

shipmentsRouter.get("/", ...middleware, async (req: Request, res: Response) => {
  try {
    const tenantId = req.context?.tenant?.id;
    if (!tenantId) {
      return res.status(403).json({ message: "Tenant context required" });
    }

    const query = paginationSchema.parse(req.query);
    const { page, limit, sortBy, sortOrder, search, status, tripId } = query;
    const offset = (page - 1) * limit;

    const conditions = [eq(shipments.tenantId, tenantId), isNull(shipments.deletedAt)];

    if (search) {
      conditions.push(
        or(
          ilike(shipments.trackingNumber, `%${search}%`),
          ilike(shipments.senderName, `%${search}%`),
          ilike(shipments.receiverName, `%${search}%`)
        )!
      );
    }

    if (status) {
      conditions.push(eq(shipments.status, status as any));
    }

    if (tripId) {
      conditions.push(eq(shipments.tripId, tripId));
    }

    const orderColumn = {
      createdAt: shipments.createdAt,
      trackingNumber: shipments.trackingNumber,
      status: shipments.status,
      pickupDate: shipments.pickupDate,
    }[sortBy];

    const orderFn = sortOrder === "asc" ? asc : desc;

    const [data, countResult] = await Promise.all([
      db.select()
        .from(shipments)
        .where(and(...conditions))
        .orderBy(orderFn(orderColumn))
        .limit(limit)
        .offset(offset),
      db.select({ count: sql<number>`count(*)::int` })
        .from(shipments)
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

shipmentsRouter.get("/track/:trackingNumber", async (req: Request, res: Response) => {
  try {
    const { trackingNumber } = req.params;

    const [shipment] = await db.select({
      trackingNumber: shipments.trackingNumber,
      status: shipments.status,
      senderCity: shipments.senderCity,
      receiverCity: shipments.receiverCity,
      pickupDate: shipments.pickupDate,
      expectedDeliveryDate: shipments.expectedDeliveryDate,
      actualDeliveryDate: shipments.actualDeliveryDate,
      currentLatitude: shipments.currentLatitude,
      currentLongitude: shipments.currentLongitude,
      lastLocationUpdate: shipments.lastLocationUpdate,
    })
      .from(shipments)
      .where(and(eq(shipments.trackingNumber, trackingNumber), isNull(shipments.deletedAt)));

    if (!shipment) {
      return res.status(404).json({ message: "Shipment not found" });
    }

    res.json(shipment);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

shipmentsRouter.get("/:id", ...middleware, async (req: Request, res: Response) => {
  try {
    const isolation = createTenantIsolation(req);
    const { id } = req.params;

    const [shipment] = await db.select()
      .from(shipments)
      .where(and(eq(shipments.id, id), eq(shipments.tenantId, isolation.getTenantId()), isNull(shipments.deletedAt)));

    if (!shipment) {
      return res.status(404).json({ message: "Shipment not found" });
    }

    res.json(shipment);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

shipmentsRouter.post("/", ...middleware, requirePermission("shipments:create"), async (req: Request, res: Response) => {
  try {
    const isolation = createTenantIsolation(req);
    const tenantId = isolation.getTenantId();

    const parsed = insertShipmentSchema.safeParse({
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

    const [shipment] = await db.insert(shipments).values(parsed.data).returning();

    await auditService.logAsync({
      tenantId,
      userId: req.context?.user?.id,
      action: "create",
      resource: "shipment",
      resourceId: shipment.id,
      metadata: { trackingNumber: shipment.trackingNumber },
    });

    res.status(201).json(shipment);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

shipmentsRouter.patch("/:id", ...middleware, requirePermission("shipments:update"), async (req: Request, res: Response) => {
  try {
    const isolation = createTenantIsolation(req);
    const { id } = req.params;

    const [existing] = await db.select()
      .from(shipments)
      .where(and(eq(shipments.id, id), eq(shipments.tenantId, isolation.getTenantId()), isNull(shipments.deletedAt)));

    if (!existing) {
      return res.status(404).json({ message: "Shipment not found" });
    }

    const updateSchema = insertShipmentSchema.partial().omit({ tenantId: true });
    const parsed = updateSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const [updated] = await db.update(shipments)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(shipments.id, id))
      .returning();

    await auditService.logAsync({
      tenantId: isolation.getTenantId(),
      userId: req.context?.user?.id,
      action: "update",
      resource: "shipment",
      resourceId: id,
      metadata: { changes: Object.keys(parsed.data) },
    });

    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

shipmentsRouter.patch("/:id/status", ...middleware, requirePermission("shipments:update"), async (req: Request, res: Response) => {
  try {
    const isolation = createTenantIsolation(req);
    const { id } = req.params;
    const { status, currentLatitude, currentLongitude, actualDelivery } = req.body;

    const [existing] = await db.select()
      .from(shipments)
      .where(and(eq(shipments.id, id), eq(shipments.tenantId, isolation.getTenantId()), isNull(shipments.deletedAt)));

    if (!existing) {
      return res.status(404).json({ message: "Shipment not found" });
    }

    const updateData: any = { status, updatedAt: new Date() };
    
    if (currentLatitude) updateData.currentLatitude = currentLatitude.toString();
    if (currentLongitude) updateData.currentLongitude = currentLongitude.toString();
    if (currentLatitude || currentLongitude) updateData.lastLocationUpdate = new Date();
    if (actualDelivery) updateData.actualDelivery = new Date(actualDelivery);

    const [updated] = await db.update(shipments)
      .set(updateData)
      .where(eq(shipments.id, id))
      .returning();

    await auditService.logAsync({
      tenantId: isolation.getTenantId(),
      userId: req.context?.user?.id,
      action: "update",
      resource: "shipment",
      resourceId: id,
      metadata: { statusChange: { from: existing.status, to: status } },
    });

    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

shipmentsRouter.delete("/:id", ...middleware, requirePermission("shipments:delete"), async (req: Request, res: Response) => {
  try {
    const isolation = createTenantIsolation(req);
    const { id } = req.params;

    const [existing] = await db.select()
      .from(shipments)
      .where(and(eq(shipments.id, id), eq(shipments.tenantId, isolation.getTenantId()), isNull(shipments.deletedAt)));

    if (!existing) {
      return res.status(404).json({ message: "Shipment not found" });
    }

    await db.update(shipments).set({ deletedAt: new Date() }).where(eq(shipments.id, id));

    await auditService.logAsync({
      tenantId: isolation.getTenantId(),
      userId: req.context?.user?.id,
      action: "delete",
      resource: "shipment",
      resourceId: id,
      metadata: { trackingNumber: existing.trackingNumber },
    });

    res.status(204).send();
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

shipmentsRouter.get("/:id/pdf", ...middleware, requirePermission("shipments:read"), async (req: Request, res: Response) => {
  try {
    const isolation = createTenantIsolation(req);
    const { id } = req.params;

    const [shipment] = await db.select()
      .from(shipments)
      .where(and(eq(shipments.id, id), eq(shipments.tenantId, isolation.getTenantId()), isNull(shipments.deletedAt)));

    if (!shipment) {
      return res.status(404).json({ message: "Shipment not found" });
    }

    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, isolation.getTenantId()));
    const [branding] = await db.select().from(tenantBranding).where(eq(tenantBranding.tenantId, isolation.getTenantId()));

    const pdfBuffer = await baseFinancialService.generateInvoicePDF({
      invoice: {
        id: shipment.id,
        invoiceNumber: `SHP-${shipment.trackingNumber || shipment.id.substring(0, 8)}`,
        invoiceType: "tax_invoice",
        status: shipment.paymentStatus === "paid" ? "paid" : "issued",
        invoiceDate: shipment.createdAt ?? new Date(),
        dueDate: shipment.expectedDeliveryDate ? new Date(shipment.expectedDeliveryDate) : null,
        currency: shipment.currency || "INR",
        baseCurrency: "INR",
        exchangeRate: 1,
        subtotal: parseFloat(shipment.freightCharges || "0"),
        discountAmount: 0,
        taxAmount: 0,
        totalAmount: parseFloat(shipment.totalCharges || shipment.freightCharges || "0"),
        paidAmount: shipment.paymentStatus === "paid" ? parseFloat(shipment.totalCharges || shipment.freightCharges || "0") : 0,
        balanceAmount: shipment.paymentStatus === "paid" ? 0 : parseFloat(shipment.totalCharges || shipment.freightCharges || "0"),
        taxMetadata: {},
        billingName: shipment.senderName || null,
        billingAddress: shipment.senderAddress || null,
        billingCity: shipment.senderCity || null,
        billingState: shipment.senderState || null,
        billingPostalCode: shipment.senderPostalCode || null,
        billingCountry: null,
        billingEmail: shipment.senderEmail || null,
        billingPhone: shipment.senderPhone || null,
        customerTaxId: null,
        customerTaxIdType: null,
        tenantTaxId: null,
        tenantTaxIdType: null,
        tenantBusinessName: tenant?.name || null,
        tenantAddress: null,
        notes: shipment.specialInstructions,
        termsAndConditions: null,
        complianceCountry: "IN",
      },
      items: [
        {
          description: `Shipment: ${shipment.senderCity || "Origin"} to ${shipment.receiverCity || "Destination"} (${shipment.weight || 0}kg)`,
          quantity: 1,
          unitPrice: parseFloat(shipment.freightCharges || "0"),
          discountAmount: 0,
          taxRate: 0,
          hsnCode: "996521",
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
        name: tenant?.name || "Logistics Company",
        address: null,
      },
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="shipment-${shipment.trackingNumber}.pdf"`);
    res.send(pdfBuffer);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

shipmentsRouter.post("/:id/notify", ...middleware, requirePermission("shipments:update"), async (req: Request, res: Response) => {
  try {
    const isolation = createTenantIsolation(req);
    const { id } = req.params;
    const { eventType } = req.body;

    const [shipment] = await db.select()
      .from(shipments)
      .where(and(eq(shipments.id, id), eq(shipments.tenantId, isolation.getTenantId()), isNull(shipments.deletedAt)));

    if (!shipment) {
      return res.status(404).json({ message: "Shipment not found" });
    }

    if (!shipment.receiverEmail && !shipment.receiverPhone && !shipment.senderEmail && !shipment.senderPhone) {
      return res.status(400).json({ message: "No contact information for this shipment" });
    }

    const notificationEventType = eventType || "SHIPMENT_UPDATE";

    if (notificationEventType === "DELIVERY_COMPLETED" || notificationEventType === "DELIVERY_SCHEDULED") {
      await sendDeliveryNotification(
        isolation.getTenantId(),
        {
          receiverName: shipment.receiverName || "Recipient",
          receiverEmail: shipment.receiverEmail ?? undefined,
          receiverPhone: shipment.receiverPhone ?? undefined,
          senderName: shipment.senderName ?? undefined,
          senderEmail: shipment.senderEmail ?? undefined,
          trackingNumber: shipment.trackingNumber ?? "",
          deliveryDate: shipment.actualDeliveryDate ?? undefined,
          estimatedDelivery: shipment.expectedDeliveryDate ?? undefined,
        },
        notificationEventType as "DELIVERY_SCHEDULED" | "DELIVERY_COMPLETED"
      );
    } else {
      await sendShipmentUpdate(
        isolation.getTenantId(),
        {
          receiverName: shipment.receiverName || "Recipient",
          receiverEmail: shipment.receiverEmail ?? undefined,
          receiverPhone: shipment.receiverPhone ?? undefined,
          senderName: shipment.senderName ?? undefined,
          trackingNumber: shipment.trackingNumber ?? "",
          status: shipment.status ?? "pending",
          senderCity: shipment.senderCity ?? undefined,
          receiverCity: shipment.receiverCity ?? undefined,
          estimatedDelivery: shipment.expectedDeliveryDate ?? undefined,
        }
      );
    }

    await auditService.logAsync({
      tenantId: isolation.getTenantId(),
      userId: req.context?.user?.id,
      action: "access",
      resource: "shipment_notification",
      resourceId: id,
      metadata: { eventType: notificationEventType, receiverEmail: shipment.receiverEmail },
    });

    res.json({ message: "Notification sent successfully" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});
