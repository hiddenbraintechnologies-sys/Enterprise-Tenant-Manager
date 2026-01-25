import { Router, type Request, type Response } from "express";
import { db } from "../../db";
import { vehicles, insertVehicleSchema } from "@shared/schema";
import { eq, and, desc, asc, sql, ilike, or, isNull } from "drizzle-orm";
import { z } from "zod";
import { authenticateHybrid, requireMinimumRole } from "../auth-middleware";
import { requirePermission } from "../context";
import { tenantIsolationMiddleware, createTenantIsolation } from "../tenant-isolation";
import { auditService } from "../audit";

export const vehiclesRouter = Router();

const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  sortBy: z.enum(["createdAt", "registrationNumber", "status", "vehicleType"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  search: z.string().optional(),
  status: z.string().optional(),
  vehicleType: z.string().optional(),
});

const middleware = [
  authenticateHybrid(),
  tenantIsolationMiddleware(),
  requireMinimumRole("staff"),
];

vehiclesRouter.get("/", ...middleware, async (req: Request, res: Response) => {
  try {
    const tenantId = req.context?.tenant?.id;
    if (!tenantId) {
      return res.status(403).json({ message: "Tenant context required" });
    }

    const query = paginationSchema.parse(req.query);
    const { page, limit, sortBy, sortOrder, search, status, vehicleType } = query;
    const offset = (page - 1) * limit;

    const conditions = [eq(vehicles.tenantId, tenantId), isNull(vehicles.deletedAt)];

    if (search) {
      conditions.push(
        or(
          ilike(vehicles.registrationNumber, `%${search}%`),
          ilike(vehicles.make, `%${search}%`),
          ilike(vehicles.model, `%${search}%`)
        )!
      );
    }

    if (status) {
      conditions.push(eq(vehicles.status, status as any));
    }

    if (vehicleType) {
      conditions.push(eq(vehicles.vehicleType, vehicleType));
    }

    const orderColumn = {
      createdAt: vehicles.createdAt,
      registrationNumber: vehicles.registrationNumber,
      status: vehicles.status,
      vehicleType: vehicles.vehicleType,
    }[sortBy];

    const orderFn = sortOrder === "asc" ? asc : desc;

    const [data, countResult] = await Promise.all([
      db.select()
        .from(vehicles)
        .where(and(...conditions))
        .orderBy(orderFn(orderColumn))
        .limit(limit)
        .offset(offset),
      db.select({ count: sql<number>`count(*)::int` })
        .from(vehicles)
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

vehiclesRouter.get("/:id", ...middleware, async (req: Request, res: Response) => {
  try {
    const isolation = createTenantIsolation(req);
    const { id } = req.params;

    const [vehicle] = await db.select()
      .from(vehicles)
      .where(and(eq(vehicles.id, id), eq(vehicles.tenantId, isolation.getTenantId()), isNull(vehicles.deletedAt)));

    if (!vehicle) {
      return res.status(404).json({ message: "Vehicle not found" });
    }

    res.json(vehicle);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

vehiclesRouter.post("/", ...middleware, requirePermission("vehicles:create"), async (req: Request, res: Response) => {
  try {
    const isolation = createTenantIsolation(req);
    const tenantId = isolation.getTenantId();

    const parsed = insertVehicleSchema.safeParse({
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

    const [vehicle] = await db.insert(vehicles).values(parsed.data).returning();

    await auditService.logAsync({
      tenantId,
      userId: req.context?.user?.id,
      action: "create",
      resource: "vehicle",
      resourceId: vehicle.id,
      metadata: { registrationNumber: vehicle.registrationNumber },
    });

    res.status(201).json(vehicle);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

vehiclesRouter.patch("/:id", ...middleware, requirePermission("vehicles:update"), async (req: Request, res: Response) => {
  try {
    const isolation = createTenantIsolation(req);
    const { id } = req.params;

    const [existing] = await db.select()
      .from(vehicles)
      .where(and(eq(vehicles.id, id), eq(vehicles.tenantId, isolation.getTenantId()), isNull(vehicles.deletedAt)));

    if (!existing) {
      return res.status(404).json({ message: "Vehicle not found" });
    }

    const updateSchema = insertVehicleSchema.partial().omit({ tenantId: true });
    const parsed = updateSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const [updated] = await db.update(vehicles)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(vehicles.id, id))
      .returning();

    await auditService.logAsync({
      tenantId: isolation.getTenantId(),
      userId: req.context?.user?.id,
      action: "update",
      resource: "vehicle",
      resourceId: id,
      metadata: { changes: Object.keys(parsed.data) },
    });

    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

vehiclesRouter.patch("/:id/location", ...middleware, requirePermission("vehicles:update"), async (req: Request, res: Response) => {
  try {
    const isolation = createTenantIsolation(req);
    const { id } = req.params;
    const { latitude, longitude } = req.body;

    const [existing] = await db.select()
      .from(vehicles)
      .where(and(eq(vehicles.id, id), eq(vehicles.tenantId, isolation.getTenantId()), isNull(vehicles.deletedAt)));

    if (!existing) {
      return res.status(404).json({ message: "Vehicle not found" });
    }

    const [updated] = await db.update(vehicles)
      .set({
        lastLatitude: latitude?.toString(),
        lastLongitude: longitude?.toString(),
        lastLocationUpdate: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(vehicles.id, id))
      .returning();

    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

vehiclesRouter.delete("/:id", ...middleware, requirePermission("vehicles:delete"), async (req: Request, res: Response) => {
  try {
    const isolation = createTenantIsolation(req);
    const { id } = req.params;

    const [existing] = await db.select()
      .from(vehicles)
      .where(and(eq(vehicles.id, id), eq(vehicles.tenantId, isolation.getTenantId()), isNull(vehicles.deletedAt)));

    if (!existing) {
      return res.status(404).json({ message: "Vehicle not found" });
    }

    await db.update(vehicles).set({ deletedAt: new Date() }).where(eq(vehicles.id, id));

    await auditService.logAsync({
      tenantId: isolation.getTenantId(),
      userId: req.context?.user?.id,
      action: "delete",
      resource: "vehicle",
      resourceId: id,
      metadata: { registrationNumber: existing.registrationNumber },
    });

    res.status(204).send();
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});
