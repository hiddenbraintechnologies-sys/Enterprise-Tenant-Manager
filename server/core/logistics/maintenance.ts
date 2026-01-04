import { Router, type Request, type Response } from "express";
import { db } from "../../db";
import { maintenanceLogs, insertMaintenanceLogSchema } from "@shared/schema";
import { eq, and, desc, asc, sql, ilike, isNull } from "drizzle-orm";
import { z } from "zod";
import { authenticateJWT, requireMinimumRole } from "../auth-middleware";
import { requirePermission } from "../context";
import { tenantIsolationMiddleware, createTenantIsolation } from "../tenant-isolation";
import { auditService } from "../audit";

export const maintenanceRouter = Router();

const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  sortBy: z.enum(["createdAt", "scheduledDate", "status", "maintenanceType"]).default("scheduledDate"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  search: z.string().optional(),
  status: z.string().optional(),
  vehicleId: z.string().optional(),
  maintenanceType: z.string().optional(),
});

const middleware = [
  authenticateJWT({ required: true }),
  tenantIsolationMiddleware(),
  requireMinimumRole("staff"),
];

maintenanceRouter.get("/", ...middleware, async (req: Request, res: Response) => {
  try {
    const tenantId = req.context?.tenant?.id;
    if (!tenantId) {
      return res.status(403).json({ message: "Tenant context required" });
    }

    const query = paginationSchema.parse(req.query);
    const { page, limit, sortBy, sortOrder, search, status, vehicleId, maintenanceType } = query;
    const offset = (page - 1) * limit;

    const conditions = [eq(maintenanceLogs.tenantId, tenantId), isNull(maintenanceLogs.deletedAt)];

    if (search) {
      conditions.push(ilike(maintenanceLogs.description, `%${search}%`));
    }

    if (status) {
      conditions.push(eq(maintenanceLogs.status, status as any));
    }

    if (vehicleId) {
      conditions.push(eq(maintenanceLogs.vehicleId, vehicleId));
    }

    if (maintenanceType) {
      conditions.push(eq(maintenanceLogs.maintenanceType, maintenanceType as any));
    }

    const orderColumn = {
      createdAt: maintenanceLogs.createdAt,
      scheduledDate: maintenanceLogs.scheduledDate,
      status: maintenanceLogs.status,
      maintenanceType: maintenanceLogs.maintenanceType,
    }[sortBy];

    const orderFn = sortOrder === "asc" ? asc : desc;

    const [data, countResult] = await Promise.all([
      db.select()
        .from(maintenanceLogs)
        .where(and(...conditions))
        .orderBy(orderFn(orderColumn))
        .limit(limit)
        .offset(offset),
      db.select({ count: sql<number>`count(*)::int` })
        .from(maintenanceLogs)
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

maintenanceRouter.get("/:id", ...middleware, async (req: Request, res: Response) => {
  try {
    const isolation = createTenantIsolation(req);
    const { id } = req.params;

    const [record] = await db.select()
      .from(maintenanceLogs)
      .where(and(eq(maintenanceLogs.id, id), eq(maintenanceLogs.tenantId, isolation.getTenantId()), isNull(maintenanceLogs.deletedAt)));

    if (!record) {
      return res.status(404).json({ message: "Maintenance record not found" });
    }

    res.json(record);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

maintenanceRouter.post("/", ...middleware, requirePermission("maintenance:create"), async (req: Request, res: Response) => {
  try {
    const isolation = createTenantIsolation(req);
    const tenantId = isolation.getTenantId();

    const parsed = insertMaintenanceLogSchema.safeParse({
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

    const [record] = await db.insert(maintenanceLogs).values(parsed.data).returning();

    await auditService.logAsync({
      tenantId,
      userId: req.context?.user?.id,
      action: "create",
      resource: "maintenance_log",
      resourceId: record.id,
      metadata: { vehicleId: record.vehicleId, type: record.maintenanceType },
    });

    res.status(201).json(record);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

maintenanceRouter.patch("/:id", ...middleware, requirePermission("maintenance:update"), async (req: Request, res: Response) => {
  try {
    const isolation = createTenantIsolation(req);
    const { id } = req.params;

    const [existing] = await db.select()
      .from(maintenanceLogs)
      .where(and(eq(maintenanceLogs.id, id), eq(maintenanceLogs.tenantId, isolation.getTenantId()), isNull(maintenanceLogs.deletedAt)));

    if (!existing) {
      return res.status(404).json({ message: "Maintenance record not found" });
    }

    const updateSchema = insertMaintenanceLogSchema.partial().omit({ tenantId: true });
    const parsed = updateSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const [updated] = await db.update(maintenanceLogs)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(maintenanceLogs.id, id))
      .returning();

    await auditService.logAsync({
      tenantId: isolation.getTenantId(),
      userId: req.context?.user?.id,
      action: "update",
      resource: "maintenance_log",
      resourceId: id,
      metadata: { changes: Object.keys(parsed.data) },
    });

    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

maintenanceRouter.patch("/:id/complete", ...middleware, requirePermission("maintenance:update"), async (req: Request, res: Response) => {
  try {
    const isolation = createTenantIsolation(req);
    const { id } = req.params;
    const { completionDate, totalCost, notes } = req.body;

    const [existing] = await db.select()
      .from(maintenanceLogs)
      .where(and(eq(maintenanceLogs.id, id), eq(maintenanceLogs.tenantId, isolation.getTenantId()), isNull(maintenanceLogs.deletedAt)));

    if (!existing) {
      return res.status(404).json({ message: "Maintenance record not found" });
    }

    const [updated] = await db.update(maintenanceLogs)
      .set({
        status: "completed",
        completionDate: completionDate || new Date().toISOString().split("T")[0],
        totalCost: totalCost?.toString(),
        notes,
        updatedAt: new Date(),
      })
      .where(eq(maintenanceLogs.id, id))
      .returning();

    await auditService.logAsync({
      tenantId: isolation.getTenantId(),
      userId: req.context?.user?.id,
      action: "update",
      resource: "maintenance_log",
      resourceId: id,
      metadata: { statusChange: { from: existing.status, to: "completed" } },
    });

    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

maintenanceRouter.delete("/:id", ...middleware, requirePermission("maintenance:delete"), async (req: Request, res: Response) => {
  try {
    const isolation = createTenantIsolation(req);
    const { id } = req.params;

    const [existing] = await db.select()
      .from(maintenanceLogs)
      .where(and(eq(maintenanceLogs.id, id), eq(maintenanceLogs.tenantId, isolation.getTenantId()), isNull(maintenanceLogs.deletedAt)));

    if (!existing) {
      return res.status(404).json({ message: "Maintenance record not found" });
    }

    await db.update(maintenanceLogs).set({ deletedAt: new Date() }).where(eq(maintenanceLogs.id, id));

    await auditService.logAsync({
      tenantId: isolation.getTenantId(),
      userId: req.context?.user?.id,
      action: "delete",
      resource: "maintenance_log",
      resourceId: id,
    });

    res.status(204).send();
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});
