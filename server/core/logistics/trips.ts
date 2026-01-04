import { Router, type Request, type Response } from "express";
import { db } from "../../db";
import { trips, insertTripSchema } from "@shared/schema";
import { eq, and, desc, asc, sql, ilike, isNull } from "drizzle-orm";
import { z } from "zod";
import { authenticateJWT, requireMinimumRole } from "../auth-middleware";
import { requirePermission } from "../context";
import { tenantIsolationMiddleware, createTenantIsolation } from "../tenant-isolation";
import { auditService } from "../audit";

export const tripsRouter = Router();

const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  sortBy: z.enum(["createdAt", "scheduledStart", "status"]).default("scheduledStart"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  search: z.string().optional(),
  status: z.string().optional(),
  vehicleId: z.string().optional(),
  driverId: z.string().optional(),
});

const middleware = [
  authenticateJWT({ required: true }),
  tenantIsolationMiddleware(),
  requireMinimumRole("staff"),
];

tripsRouter.get("/", ...middleware, async (req: Request, res: Response) => {
  try {
    const tenantId = req.context?.tenant?.id;
    if (!tenantId) {
      return res.status(403).json({ message: "Tenant context required" });
    }

    const query = paginationSchema.parse(req.query);
    const { page, limit, sortBy, sortOrder, search, status, vehicleId, driverId } = query;
    const offset = (page - 1) * limit;

    const conditions = [eq(trips.tenantId, tenantId), isNull(trips.deletedAt)];

    if (search) {
      conditions.push(ilike(trips.tripNumber, `%${search}%`));
    }

    if (status) {
      conditions.push(eq(trips.status, status as any));
    }

    if (vehicleId) {
      conditions.push(eq(trips.vehicleId, vehicleId));
    }

    if (driverId) {
      conditions.push(eq(trips.driverId, driverId));
    }

    const orderColumn = {
      createdAt: trips.createdAt,
      scheduledStart: trips.scheduledStart,
      status: trips.status,
    }[sortBy];

    const orderFn = sortOrder === "asc" ? asc : desc;

    const [data, countResult] = await Promise.all([
      db.select()
        .from(trips)
        .where(and(...conditions))
        .orderBy(orderFn(orderColumn))
        .limit(limit)
        .offset(offset),
      db.select({ count: sql<number>`count(*)::int` })
        .from(trips)
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

tripsRouter.get("/:id", ...middleware, async (req: Request, res: Response) => {
  try {
    const isolation = createTenantIsolation(req);
    const { id } = req.params;

    const [trip] = await db.select()
      .from(trips)
      .where(and(eq(trips.id, id), eq(trips.tenantId, isolation.getTenantId()), isNull(trips.deletedAt)));

    if (!trip) {
      return res.status(404).json({ message: "Trip not found" });
    }

    res.json(trip);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

tripsRouter.post("/", ...middleware, requirePermission("trips:create"), async (req: Request, res: Response) => {
  try {
    const isolation = createTenantIsolation(req);
    const tenantId = isolation.getTenantId();

    const parsed = insertTripSchema.safeParse({
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

    const [trip] = await db.insert(trips).values(parsed.data).returning();

    await auditService.logAsync({
      tenantId,
      userId: req.context?.user?.id,
      action: "create",
      resource: "trip",
      resourceId: trip.id,
      metadata: { tripNumber: trip.tripNumber },
    });

    res.status(201).json(trip);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

tripsRouter.patch("/:id", ...middleware, requirePermission("trips:update"), async (req: Request, res: Response) => {
  try {
    const isolation = createTenantIsolation(req);
    const { id } = req.params;

    const [existing] = await db.select()
      .from(trips)
      .where(and(eq(trips.id, id), eq(trips.tenantId, isolation.getTenantId()), isNull(trips.deletedAt)));

    if (!existing) {
      return res.status(404).json({ message: "Trip not found" });
    }

    const updateSchema = insertTripSchema.partial().omit({ tenantId: true });
    const parsed = updateSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const [updated] = await db.update(trips)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(trips.id, id))
      .returning();

    await auditService.logAsync({
      tenantId: isolation.getTenantId(),
      userId: req.context?.user?.id,
      action: "update",
      resource: "trip",
      resourceId: id,
      metadata: { changes: Object.keys(parsed.data) },
    });

    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

tripsRouter.patch("/:id/status", ...middleware, requirePermission("trips:update"), async (req: Request, res: Response) => {
  try {
    const isolation = createTenantIsolation(req);
    const { id } = req.params;
    const { status, actualStart, actualEnd, currentLatitude, currentLongitude } = req.body;

    const [existing] = await db.select()
      .from(trips)
      .where(and(eq(trips.id, id), eq(trips.tenantId, isolation.getTenantId()), isNull(trips.deletedAt)));

    if (!existing) {
      return res.status(404).json({ message: "Trip not found" });
    }

    const updateData: any = { status, updatedAt: new Date() };
    
    if (actualStart) updateData.actualStart = new Date(actualStart);
    if (actualEnd) updateData.actualEnd = new Date(actualEnd);
    if (currentLatitude) updateData.currentLatitude = currentLatitude.toString();
    if (currentLongitude) updateData.currentLongitude = currentLongitude.toString();
    if (currentLatitude || currentLongitude) updateData.lastLocationUpdate = new Date();

    const [updated] = await db.update(trips)
      .set(updateData)
      .where(eq(trips.id, id))
      .returning();

    await auditService.logAsync({
      tenantId: isolation.getTenantId(),
      userId: req.context?.user?.id,
      action: "update",
      resource: "trip",
      resourceId: id,
      metadata: { statusChange: { from: existing.status, to: status } },
    });

    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

tripsRouter.delete("/:id", ...middleware, requirePermission("trips:delete"), async (req: Request, res: Response) => {
  try {
    const isolation = createTenantIsolation(req);
    const { id } = req.params;

    const [existing] = await db.select()
      .from(trips)
      .where(and(eq(trips.id, id), eq(trips.tenantId, isolation.getTenantId()), isNull(trips.deletedAt)));

    if (!existing) {
      return res.status(404).json({ message: "Trip not found" });
    }

    await db.update(trips).set({ deletedAt: new Date() }).where(eq(trips.id, id));

    await auditService.logAsync({
      tenantId: isolation.getTenantId(),
      userId: req.context?.user?.id,
      action: "delete",
      resource: "trip",
      resourceId: id,
      metadata: { tripNumber: existing.tripNumber },
    });

    res.status(204).send();
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});
