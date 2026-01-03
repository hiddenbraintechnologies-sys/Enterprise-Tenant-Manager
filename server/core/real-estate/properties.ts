import { Router, type Request, type Response } from "express";
import { db } from "../../db";
import { properties, insertPropertySchema, type Property } from "@shared/schema";
import { eq, and, desc, asc, sql, ilike, or } from "drizzle-orm";
import { z } from "zod";
import { authenticateJWT, requireMinimumRole } from "../auth-middleware";
import { requirePermission } from "../context";
import { tenantIsolationMiddleware, createTenantIsolation } from "../tenant-isolation";
import { auditService } from "../audit";

export const propertiesRouter = Router();

const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  sortBy: z.enum(["createdAt", "name", "status", "propertyType", "city"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  search: z.string().optional(),
  status: z.string().optional(),
  propertyType: z.string().optional(),
  city: z.string().optional(),
});

const middleware = [
  authenticateJWT({ required: true }),
  tenantIsolationMiddleware(),
  requireMinimumRole("staff"),
];

propertiesRouter.get("/", ...middleware, async (req: Request, res: Response) => {
  try {
    const tenantId = req.context?.tenant?.id;
    if (!tenantId) {
      return res.status(403).json({ message: "Tenant context required" });
    }

    const query = paginationSchema.parse(req.query);
    const { page, limit, sortBy, sortOrder, search, status, propertyType, city } = query;
    const offset = (page - 1) * limit;

    const conditions = [eq(properties.tenantId, tenantId)];

    if (search) {
      conditions.push(
        or(
          ilike(properties.name, `%${search}%`),
          ilike(properties.address, `%${search}%`),
          ilike(properties.ownerName, `%${search}%`)
        )!
      );
    }

    if (status) {
      conditions.push(eq(properties.status, status as any));
    }

    if (propertyType) {
      conditions.push(eq(properties.propertyType, propertyType as any));
    }

    if (city) {
      conditions.push(ilike(properties.city, `%${city}%`));
    }

    const orderColumn = {
      createdAt: properties.createdAt,
      name: properties.name,
      status: properties.status,
      propertyType: properties.propertyType,
      city: properties.city,
    }[sortBy];

    const orderFn = sortOrder === "asc" ? asc : desc;

    const [data, countResult] = await Promise.all([
      db.select()
        .from(properties)
        .where(and(...conditions))
        .orderBy(orderFn(orderColumn))
        .limit(limit)
        .offset(offset),
      db.select({ count: sql<number>`count(*)::int` })
        .from(properties)
        .where(and(...conditions)),
    ]);

    const total = countResult[0]?.count || 0;

    res.json({
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

propertiesRouter.get("/:id", ...middleware, async (req: Request, res: Response) => {
  try {
    const isolation = createTenantIsolation(req);
    const { id } = req.params;

    const [property] = await db.select()
      .from(properties)
      .where(and(eq(properties.id, id), eq(properties.tenantId, isolation.getTenantId())));

    if (!property) {
      return res.status(404).json({ message: "Property not found" });
    }

    res.json(property);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

propertiesRouter.post("/", ...middleware, requirePermission("properties:create"), async (req: Request, res: Response) => {
  try {
    const isolation = createTenantIsolation(req);
    const tenantId = isolation.getTenantId();

    const parsed = insertPropertySchema.safeParse({
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

    const [property] = await db.insert(properties).values(parsed.data).returning();

    await auditService.logAsync({
      tenantId,
      userId: req.context?.user?.id,
      action: "create",
      resource: "property",
      resourceId: property.id,
      metadata: { name: property.name, propertyType: property.propertyType },
    });

    res.status(201).json(property);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

propertiesRouter.patch("/:id", ...middleware, requirePermission("properties:update"), async (req: Request, res: Response) => {
  try {
    const isolation = createTenantIsolation(req);
    const { id } = req.params;

    const [existing] = await db.select()
      .from(properties)
      .where(and(eq(properties.id, id), eq(properties.tenantId, isolation.getTenantId())));

    if (!existing) {
      return res.status(404).json({ message: "Property not found" });
    }

    const updateSchema = insertPropertySchema.partial().omit({ tenantId: true });
    const parsed = updateSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const [updated] = await db.update(properties)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(properties.id, id))
      .returning();

    await auditService.logAsync({
      tenantId: isolation.getTenantId(),
      userId: req.context?.user?.id,
      action: "update",
      resource: "property",
      resourceId: id,
      metadata: { changes: Object.keys(parsed.data) },
    });

    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

propertiesRouter.delete("/:id", ...middleware, requirePermission("properties:delete"), async (req: Request, res: Response) => {
  try {
    const isolation = createTenantIsolation(req);
    const { id } = req.params;

    const [existing] = await db.select()
      .from(properties)
      .where(and(eq(properties.id, id), eq(properties.tenantId, isolation.getTenantId())));

    if (!existing) {
      return res.status(404).json({ message: "Property not found" });
    }

    await db.delete(properties).where(eq(properties.id, id));

    await auditService.logAsync({
      tenantId: isolation.getTenantId(),
      userId: req.context?.user?.id,
      action: "delete",
      resource: "property",
      resourceId: id,
      metadata: { name: existing.name },
    });

    res.status(204).send();
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});
