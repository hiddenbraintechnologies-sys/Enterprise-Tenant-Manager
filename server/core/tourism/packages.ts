import { Router, type Request, type Response } from "express";
import { db } from "../../db";
import { tourPackages, insertTourPackageSchema } from "@shared/schema";
import { eq, and, desc, asc, sql, ilike, or, gte, lte } from "drizzle-orm";
import { z } from "zod";
import { authenticateJWT, requireMinimumRole } from "../auth-middleware";
import { requirePermission } from "../context";
import { tenantIsolationMiddleware, createTenantIsolation } from "../tenant-isolation";
import { auditService } from "../audit";

export const packagesRouter = Router();

const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  sortBy: z.enum(["createdAt", "name", "basePrice", "status", "packageType", "duration"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  search: z.string().optional(),
  status: z.string().optional(),
  packageType: z.string().optional(),
  isFeatured: z.coerce.boolean().optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
});

const middleware = [
  authenticateJWT({ required: true }),
  tenantIsolationMiddleware(),
  requireMinimumRole("staff"),
];

packagesRouter.get("/", ...middleware, async (req: Request, res: Response) => {
  try {
    const tenantId = req.context?.tenant?.id;
    if (!tenantId) {
      return res.status(403).json({ message: "Tenant context required" });
    }

    const query = paginationSchema.parse(req.query);
    const { page, limit, sortBy, sortOrder, search, status, packageType, isFeatured, minPrice, maxPrice } = query;
    const offset = (page - 1) * limit;

    const conditions = [eq(tourPackages.tenantId, tenantId)];

    if (search) {
      conditions.push(
        or(
          ilike(tourPackages.name, `%${search}%`),
          ilike(tourPackages.description, `%${search}%`),
          ilike(tourPackages.departureCity, `%${search}%`)
        )!
      );
    }

    if (status) conditions.push(eq(tourPackages.status, status as any));
    if (packageType) conditions.push(eq(tourPackages.packageType, packageType as any));
    if (isFeatured !== undefined) conditions.push(eq(tourPackages.isFeatured, isFeatured));
    if (minPrice) conditions.push(gte(tourPackages.basePrice, minPrice.toString()));
    if (maxPrice) conditions.push(lte(tourPackages.basePrice, maxPrice.toString()));

    const orderColumn = {
      createdAt: tourPackages.createdAt,
      name: tourPackages.name,
      basePrice: tourPackages.basePrice,
      status: tourPackages.status,
      packageType: tourPackages.packageType,
      duration: tourPackages.duration,
    }[sortBy];

    const orderFn = sortOrder === "asc" ? asc : desc;

    const [data, countResult] = await Promise.all([
      db.select()
        .from(tourPackages)
        .where(and(...conditions))
        .orderBy(orderFn(orderColumn))
        .limit(limit)
        .offset(offset),
      db.select({ count: sql<number>`count(*)::int` })
        .from(tourPackages)
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

packagesRouter.get("/:id", ...middleware, async (req: Request, res: Response) => {
  try {
    const isolation = createTenantIsolation(req);
    const { id } = req.params;

    const [pkg] = await db.select()
      .from(tourPackages)
      .where(and(eq(tourPackages.id, id), eq(tourPackages.tenantId, isolation.getTenantId())));

    if (!pkg) {
      return res.status(404).json({ message: "Package not found" });
    }

    res.json(pkg);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

packagesRouter.post("/", ...middleware, requirePermission("packages:create"), async (req: Request, res: Response) => {
  try {
    const isolation = createTenantIsolation(req);
    const tenantId = isolation.getTenantId();

    const parsed = insertTourPackageSchema.safeParse({
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

    const [pkg] = await db.insert(tourPackages).values(parsed.data).returning();

    await auditService.logAsync({
      tenantId,
      userId: req.context?.user?.id,
      action: "create",
      resource: "tour_package",
      resourceId: pkg.id,
      metadata: { name: pkg.name, packageType: pkg.packageType },
    });

    res.status(201).json(pkg);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

packagesRouter.patch("/:id", ...middleware, requirePermission("packages:update"), async (req: Request, res: Response) => {
  try {
    const isolation = createTenantIsolation(req);
    const { id } = req.params;

    const [existing] = await db.select()
      .from(tourPackages)
      .where(and(eq(tourPackages.id, id), eq(tourPackages.tenantId, isolation.getTenantId())));

    if (!existing) {
      return res.status(404).json({ message: "Package not found" });
    }

    const updateSchema = insertTourPackageSchema.partial().omit({ tenantId: true });
    const parsed = updateSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const [updated] = await db.update(tourPackages)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(tourPackages.id, id))
      .returning();

    await auditService.logAsync({
      tenantId: isolation.getTenantId(),
      userId: req.context?.user?.id,
      action: "update",
      resource: "tour_package",
      resourceId: id,
      metadata: { changes: Object.keys(parsed.data) },
    });

    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

packagesRouter.delete("/:id", ...middleware, requirePermission("packages:delete"), async (req: Request, res: Response) => {
  try {
    const isolation = createTenantIsolation(req);
    const { id } = req.params;

    const [existing] = await db.select()
      .from(tourPackages)
      .where(and(eq(tourPackages.id, id), eq(tourPackages.tenantId, isolation.getTenantId())));

    if (!existing) {
      return res.status(404).json({ message: "Package not found" });
    }

    await db.delete(tourPackages).where(eq(tourPackages.id, id));

    await auditService.logAsync({
      tenantId: isolation.getTenantId(),
      userId: req.context?.user?.id,
      action: "delete",
      resource: "tour_package",
      resourceId: id,
    });

    res.status(204).send();
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});
