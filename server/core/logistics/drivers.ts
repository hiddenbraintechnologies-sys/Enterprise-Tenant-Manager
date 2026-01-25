import { Router, type Request, type Response } from "express";
import { db } from "../../db";
import { drivers, insertDriverSchema } from "@shared/schema";
import { eq, and, desc, asc, sql, ilike, or, isNull } from "drizzle-orm";
import { z } from "zod";
import { authenticateHybrid, requireMinimumRole } from "../auth-middleware";
import { requirePermission } from "../context";
import { tenantIsolationMiddleware, createTenantIsolation } from "../tenant-isolation";
import { auditService } from "../audit";

export const driversRouter = Router();

const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  sortBy: z.enum(["createdAt", "firstName", "lastName", "status"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  search: z.string().optional(),
  status: z.string().optional(),
  licenseType: z.string().optional(),
});

const middleware = [
  authenticateHybrid(),
  tenantIsolationMiddleware(),
  requireMinimumRole("staff"),
];

driversRouter.get("/", ...middleware, async (req: Request, res: Response) => {
  try {
    const tenantId = req.context?.tenant?.id;
    if (!tenantId) {
      return res.status(403).json({ message: "Tenant context required" });
    }

    const query = paginationSchema.parse(req.query);
    const { page, limit, sortBy, sortOrder, search, status, licenseType } = query;
    const offset = (page - 1) * limit;

    const conditions = [eq(drivers.tenantId, tenantId), isNull(drivers.deletedAt)];

    if (search) {
      conditions.push(
        or(
          ilike(drivers.firstName, `%${search}%`),
          ilike(drivers.lastName, `%${search}%`),
          ilike(drivers.email, `%${search}%`),
          ilike(drivers.phone, `%${search}%`),
          ilike(drivers.licenseNumber, `%${search}%`)
        )!
      );
    }

    if (status) {
      conditions.push(eq(drivers.status, status as any));
    }

    if (licenseType) {
      conditions.push(eq(drivers.licenseType, licenseType));
    }

    const orderColumn = {
      createdAt: drivers.createdAt,
      firstName: drivers.firstName,
      lastName: drivers.lastName,
      status: drivers.status,
    }[sortBy];

    const orderFn = sortOrder === "asc" ? asc : desc;

    const [data, countResult] = await Promise.all([
      db.select()
        .from(drivers)
        .where(and(...conditions))
        .orderBy(orderFn(orderColumn))
        .limit(limit)
        .offset(offset),
      db.select({ count: sql<number>`count(*)::int` })
        .from(drivers)
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

driversRouter.get("/:id", ...middleware, async (req: Request, res: Response) => {
  try {
    const isolation = createTenantIsolation(req);
    const { id } = req.params;

    const [driver] = await db.select()
      .from(drivers)
      .where(and(eq(drivers.id, id), eq(drivers.tenantId, isolation.getTenantId()), isNull(drivers.deletedAt)));

    if (!driver) {
      return res.status(404).json({ message: "Driver not found" });
    }

    res.json(driver);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

driversRouter.post("/", ...middleware, requirePermission("drivers:create"), async (req: Request, res: Response) => {
  try {
    const isolation = createTenantIsolation(req);
    const tenantId = isolation.getTenantId();

    const parsed = insertDriverSchema.safeParse({
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

    const [driver] = await db.insert(drivers).values(parsed.data).returning();

    await auditService.logAsync({
      tenantId,
      userId: req.context?.user?.id,
      action: "create",
      resource: "driver",
      resourceId: driver.id,
      metadata: { name: `${driver.firstName} ${driver.lastName}` },
    });

    res.status(201).json(driver);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

driversRouter.patch("/:id", ...middleware, requirePermission("drivers:update"), async (req: Request, res: Response) => {
  try {
    const isolation = createTenantIsolation(req);
    const { id } = req.params;

    const [existing] = await db.select()
      .from(drivers)
      .where(and(eq(drivers.id, id), eq(drivers.tenantId, isolation.getTenantId()), isNull(drivers.deletedAt)));

    if (!existing) {
      return res.status(404).json({ message: "Driver not found" });
    }

    const updateSchema = insertDriverSchema.partial().omit({ tenantId: true });
    const parsed = updateSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const [updated] = await db.update(drivers)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(drivers.id, id))
      .returning();

    await auditService.logAsync({
      tenantId: isolation.getTenantId(),
      userId: req.context?.user?.id,
      action: "update",
      resource: "driver",
      resourceId: id,
      metadata: { changes: Object.keys(parsed.data) },
    });

    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

driversRouter.patch("/:id/location", ...middleware, requirePermission("drivers:update"), async (req: Request, res: Response) => {
  try {
    const isolation = createTenantIsolation(req);
    const { id } = req.params;
    const { latitude, longitude } = req.body;

    const [existing] = await db.select()
      .from(drivers)
      .where(and(eq(drivers.id, id), eq(drivers.tenantId, isolation.getTenantId()), isNull(drivers.deletedAt)));

    if (!existing) {
      return res.status(404).json({ message: "Driver not found" });
    }

    const [updated] = await db.update(drivers)
      .set({
        lastLatitude: latitude?.toString(),
        lastLongitude: longitude?.toString(),
        lastLocationUpdate: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(drivers.id, id))
      .returning();

    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

driversRouter.delete("/:id", ...middleware, requirePermission("drivers:delete"), async (req: Request, res: Response) => {
  try {
    const isolation = createTenantIsolation(req);
    const { id } = req.params;

    const [existing] = await db.select()
      .from(drivers)
      .where(and(eq(drivers.id, id), eq(drivers.tenantId, isolation.getTenantId()), isNull(drivers.deletedAt)));

    if (!existing) {
      return res.status(404).json({ message: "Driver not found" });
    }

    await db.update(drivers).set({ deletedAt: new Date() }).where(eq(drivers.id, id));

    await auditService.logAsync({
      tenantId: isolation.getTenantId(),
      userId: req.context?.user?.id,
      action: "delete",
      resource: "driver",
      resourceId: id,
      metadata: { name: `${existing.firstName} ${existing.lastName}` },
    });

    res.status(204).send();
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});
