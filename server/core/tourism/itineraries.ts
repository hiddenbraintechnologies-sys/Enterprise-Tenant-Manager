import { Router, type Request, type Response } from "express";
import { db } from "../../db";
import { itineraries, tourPackages, tourBookings, insertItinerarySchema } from "@shared/schema";
import { eq, and, desc, asc, sql } from "drizzle-orm";
import { z } from "zod";
import { authenticateJWT, requireMinimumRole } from "../auth-middleware";
import { requirePermission } from "../context";
import { tenantIsolationMiddleware, createTenantIsolation } from "../tenant-isolation";
import { auditService } from "../audit";

export const itinerariesRouter = Router();

const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(50),
  sortBy: z.enum(["createdAt", "dayNumber"]).default("dayNumber"),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
  packageId: z.string().optional(),
  bookingId: z.string().optional(),
  status: z.string().optional(),
});

const middleware = [
  authenticateJWT({ required: true }),
  tenantIsolationMiddleware(),
  requireMinimumRole("staff"),
];

itinerariesRouter.get("/", ...middleware, async (req: Request, res: Response) => {
  try {
    const tenantId = req.context?.tenant?.id;
    if (!tenantId) {
      return res.status(403).json({ message: "Tenant context required" });
    }

    const query = paginationSchema.parse(req.query);
    const { page, limit, sortBy, sortOrder, packageId, bookingId, status } = query;
    const offset = (page - 1) * limit;

    const conditions = [eq(itineraries.tenantId, tenantId)];

    if (packageId) conditions.push(eq(itineraries.packageId, packageId));
    if (bookingId) conditions.push(eq(itineraries.bookingId, bookingId));
    if (status) conditions.push(eq(itineraries.status, status as any));

    const orderColumn = {
      createdAt: itineraries.createdAt,
      dayNumber: itineraries.dayNumber,
    }[sortBy];

    const orderFn = sortOrder === "asc" ? asc : desc;

    const [data, countResult] = await Promise.all([
      db.select()
        .from(itineraries)
        .where(and(...conditions))
        .orderBy(orderFn(orderColumn))
        .limit(limit)
        .offset(offset),
      db.select({ count: sql<number>`count(*)::int` })
        .from(itineraries)
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

itinerariesRouter.get("/:id", ...middleware, async (req: Request, res: Response) => {
  try {
    const isolation = createTenantIsolation(req);
    const { id } = req.params;

    const [itinerary] = await db.select()
      .from(itineraries)
      .where(and(eq(itineraries.id, id), eq(itineraries.tenantId, isolation.getTenantId())));

    if (!itinerary) {
      return res.status(404).json({ message: "Itinerary not found" });
    }

    res.json(itinerary);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

itinerariesRouter.post("/", ...middleware, requirePermission("itineraries:create"), async (req: Request, res: Response) => {
  try {
    const isolation = createTenantIsolation(req);
    const tenantId = isolation.getTenantId();

    if (req.body.packageId) {
      const [pkg] = await db.select()
        .from(tourPackages)
        .where(and(eq(tourPackages.id, req.body.packageId), eq(tourPackages.tenantId, tenantId)));

      if (!pkg) {
        return res.status(400).json({ message: "Package not found" });
      }
    }

    if (req.body.bookingId) {
      const [booking] = await db.select()
        .from(tourBookings)
        .where(and(eq(tourBookings.id, req.body.bookingId), eq(tourBookings.tenantId, tenantId)));

      if (!booking) {
        return res.status(400).json({ message: "Booking not found" });
      }
    }

    const parsed = insertItinerarySchema.safeParse({
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

    const [itinerary] = await db.insert(itineraries).values(parsed.data).returning();

    await auditService.logAsync({
      tenantId,
      userId: req.context?.user?.id,
      action: "create",
      resource: "itinerary",
      resourceId: itinerary.id,
      metadata: { dayNumber: itinerary.dayNumber, title: itinerary.title },
    });

    res.status(201).json(itinerary);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

itinerariesRouter.post("/bulk", ...middleware, requirePermission("itineraries:create"), async (req: Request, res: Response) => {
  try {
    const isolation = createTenantIsolation(req);
    const tenantId = isolation.getTenantId();

    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Items array is required" });
    }

    const validatedItems = [];
    for (const item of items) {
      const parsed = insertItinerarySchema.safeParse({
        ...item,
        tenantId,
        createdBy: req.context?.user?.id,
      });

      if (!parsed.success) {
        return res.status(400).json({
          message: `Validation failed for day ${item.dayNumber}`,
          errors: parsed.error.flatten().fieldErrors,
        });
      }

      validatedItems.push(parsed.data);
    }

    const created = await db.insert(itineraries).values(validatedItems).returning();

    await auditService.logAsync({
      tenantId,
      userId: req.context?.user?.id,
      action: "create",
      resource: "itinerary",
      metadata: { count: created.length, type: "bulk" },
    });

    res.status(201).json(created);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

itinerariesRouter.patch("/:id", ...middleware, requirePermission("itineraries:update"), async (req: Request, res: Response) => {
  try {
    const isolation = createTenantIsolation(req);
    const { id } = req.params;

    const [existing] = await db.select()
      .from(itineraries)
      .where(and(eq(itineraries.id, id), eq(itineraries.tenantId, isolation.getTenantId())));

    if (!existing) {
      return res.status(404).json({ message: "Itinerary not found" });
    }

    const updateSchema = insertItinerarySchema.partial().omit({ tenantId: true });
    const parsed = updateSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const [updated] = await db.update(itineraries)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(itineraries.id, id))
      .returning();

    await auditService.logAsync({
      tenantId: isolation.getTenantId(),
      userId: req.context?.user?.id,
      action: "update",
      resource: "itinerary",
      resourceId: id,
      metadata: { changes: Object.keys(parsed.data) },
    });

    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

itinerariesRouter.delete("/:id", ...middleware, requirePermission("itineraries:delete"), async (req: Request, res: Response) => {
  try {
    const isolation = createTenantIsolation(req);
    const { id } = req.params;

    const [existing] = await db.select()
      .from(itineraries)
      .where(and(eq(itineraries.id, id), eq(itineraries.tenantId, isolation.getTenantId())));

    if (!existing) {
      return res.status(404).json({ message: "Itinerary not found" });
    }

    await db.delete(itineraries).where(eq(itineraries.id, id));

    await auditService.logAsync({
      tenantId: isolation.getTenantId(),
      userId: req.context?.user?.id,
      action: "delete",
      resource: "itinerary",
      resourceId: id,
    });

    res.status(204).send();
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});
