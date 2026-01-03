import { Router, type Request, type Response } from "express";
import { db } from "../../db";
import { tourVendors, insertTourVendorSchema } from "@shared/schema";
import { eq, and, desc, asc, sql, ilike, or } from "drizzle-orm";
import { z } from "zod";
import { authenticateJWT, requireMinimumRole } from "../auth-middleware";
import { requirePermission } from "../context";
import { tenantIsolationMiddleware, createTenantIsolation } from "../tenant-isolation";
import { auditService } from "../audit";

export const vendorsRouter = Router();

const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  sortBy: z.enum(["createdAt", "name", "vendorType", "status", "rating"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  search: z.string().optional(),
  vendorType: z.string().optional(),
  status: z.string().optional(),
  city: z.string().optional(),
});

const middleware = [
  authenticateJWT({ required: true }),
  tenantIsolationMiddleware(),
  requireMinimumRole("staff"),
];

vendorsRouter.get("/", ...middleware, async (req: Request, res: Response) => {
  try {
    const tenantId = req.context?.tenant?.id;
    if (!tenantId) {
      return res.status(403).json({ message: "Tenant context required" });
    }

    const query = paginationSchema.parse(req.query);
    const { page, limit, sortBy, sortOrder, search, vendorType, status, city } = query;
    const offset = (page - 1) * limit;

    const conditions = [eq(tourVendors.tenantId, tenantId)];

    if (search) {
      conditions.push(
        or(
          ilike(tourVendors.name, `%${search}%`),
          ilike(tourVendors.email, `%${search}%`),
          ilike(tourVendors.contactPerson, `%${search}%`)
        )!
      );
    }

    if (vendorType) conditions.push(eq(tourVendors.vendorType, vendorType as any));
    if (status) conditions.push(eq(tourVendors.status, status as any));
    if (city) conditions.push(ilike(tourVendors.city, `%${city}%`));

    const orderColumn = {
      createdAt: tourVendors.createdAt,
      name: tourVendors.name,
      vendorType: tourVendors.vendorType,
      status: tourVendors.status,
      rating: tourVendors.rating,
    }[sortBy];

    const orderFn = sortOrder === "asc" ? asc : desc;

    const [data, countResult] = await Promise.all([
      db.select()
        .from(tourVendors)
        .where(and(...conditions))
        .orderBy(orderFn(orderColumn))
        .limit(limit)
        .offset(offset),
      db.select({ count: sql<number>`count(*)::int` })
        .from(tourVendors)
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

vendorsRouter.get("/:id", ...middleware, async (req: Request, res: Response) => {
  try {
    const isolation = createTenantIsolation(req);
    const { id } = req.params;

    const [vendor] = await db.select()
      .from(tourVendors)
      .where(and(eq(tourVendors.id, id), eq(tourVendors.tenantId, isolation.getTenantId())));

    if (!vendor) {
      return res.status(404).json({ message: "Vendor not found" });
    }

    res.json(vendor);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

vendorsRouter.post("/", ...middleware, requirePermission("vendors:create"), async (req: Request, res: Response) => {
  try {
    const isolation = createTenantIsolation(req);
    const tenantId = isolation.getTenantId();

    const parsed = insertTourVendorSchema.safeParse({
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

    const [vendor] = await db.insert(tourVendors).values(parsed.data).returning();

    await auditService.logAsync({
      tenantId,
      userId: req.context?.user?.id,
      action: "create",
      resource: "tour_vendor",
      resourceId: vendor.id,
      metadata: { name: vendor.name, vendorType: vendor.vendorType },
    });

    res.status(201).json(vendor);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

vendorsRouter.patch("/:id", ...middleware, requirePermission("vendors:update"), async (req: Request, res: Response) => {
  try {
    const isolation = createTenantIsolation(req);
    const { id } = req.params;

    const [existing] = await db.select()
      .from(tourVendors)
      .where(and(eq(tourVendors.id, id), eq(tourVendors.tenantId, isolation.getTenantId())));

    if (!existing) {
      return res.status(404).json({ message: "Vendor not found" });
    }

    const updateSchema = insertTourVendorSchema.partial().omit({ tenantId: true });
    const parsed = updateSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const [updated] = await db.update(tourVendors)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(tourVendors.id, id))
      .returning();

    await auditService.logAsync({
      tenantId: isolation.getTenantId(),
      userId: req.context?.user?.id,
      action: "update",
      resource: "tour_vendor",
      resourceId: id,
      metadata: { changes: Object.keys(parsed.data) },
    });

    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

vendorsRouter.delete("/:id", ...middleware, requirePermission("vendors:delete"), async (req: Request, res: Response) => {
  try {
    const isolation = createTenantIsolation(req);
    const { id } = req.params;

    const [existing] = await db.select()
      .from(tourVendors)
      .where(and(eq(tourVendors.id, id), eq(tourVendors.tenantId, isolation.getTenantId())));

    if (!existing) {
      return res.status(404).json({ message: "Vendor not found" });
    }

    await db.delete(tourVendors).where(eq(tourVendors.id, id));

    await auditService.logAsync({
      tenantId: isolation.getTenantId(),
      userId: req.context?.user?.id,
      action: "delete",
      resource: "tour_vendor",
      resourceId: id,
    });

    res.status(204).send();
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});
