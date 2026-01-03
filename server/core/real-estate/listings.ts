import { Router, type Request, type Response } from "express";
import { db } from "../../db";
import { listings, properties, insertListingSchema } from "@shared/schema";
import { eq, and, desc, asc, sql, ilike, or, gte, lte } from "drizzle-orm";
import { z } from "zod";
import { authenticateJWT, requireMinimumRole } from "../auth-middleware";
import { requirePermission } from "../context";
import { tenantIsolationMiddleware, createTenantIsolation } from "../tenant-isolation";
import { auditService } from "../audit";

export const listingsRouter = Router();

const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  sortBy: z.enum(["createdAt", "price", "status", "listingType"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  search: z.string().optional(),
  status: z.string().optional(),
  listingType: z.string().optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  propertyId: z.string().optional(),
});

const middleware = [
  authenticateJWT({ required: true }),
  tenantIsolationMiddleware(),
  requireMinimumRole("staff"),
];

listingsRouter.get("/", ...middleware, async (req: Request, res: Response) => {
  try {
    const tenantId = req.context?.tenant?.id;
    if (!tenantId) {
      return res.status(403).json({ message: "Tenant context required" });
    }

    const query = paginationSchema.parse(req.query);
    const { page, limit, sortBy, sortOrder, search, status, listingType, minPrice, maxPrice, propertyId } = query;
    const offset = (page - 1) * limit;

    const conditions = [eq(listings.tenantId, tenantId)];

    if (search) {
      conditions.push(
        or(
          ilike(listings.title, `%${search}%`),
          ilike(listings.description, `%${search}%`)
        )!
      );
    }

    if (status) conditions.push(eq(listings.status, status as any));
    if (listingType) conditions.push(eq(listings.listingType, listingType as any));
    if (propertyId) conditions.push(eq(listings.propertyId, propertyId));
    if (minPrice) conditions.push(gte(listings.price, minPrice.toString()));
    if (maxPrice) conditions.push(lte(listings.price, maxPrice.toString()));

    const orderColumn = {
      createdAt: listings.createdAt,
      price: listings.price,
      status: listings.status,
      listingType: listings.listingType,
    }[sortBy];

    const orderFn = sortOrder === "asc" ? asc : desc;

    const [data, countResult] = await Promise.all([
      db.select({
        listing: listings,
        property: properties,
      })
        .from(listings)
        .leftJoin(properties, eq(listings.propertyId, properties.id))
        .where(and(...conditions))
        .orderBy(orderFn(orderColumn))
        .limit(limit)
        .offset(offset),
      db.select({ count: sql<number>`count(*)::int` })
        .from(listings)
        .where(and(...conditions)),
    ]);

    const total = countResult[0]?.count || 0;

    res.json({
      data: data.map(d => ({ ...d.listing, property: d.property })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

listingsRouter.get("/:id", ...middleware, async (req: Request, res: Response) => {
  try {
    const isolation = createTenantIsolation(req);
    const { id } = req.params;

    const [result] = await db.select({
      listing: listings,
      property: properties,
    })
      .from(listings)
      .leftJoin(properties, eq(listings.propertyId, properties.id))
      .where(and(eq(listings.id, id), eq(listings.tenantId, isolation.getTenantId())));

    if (!result) {
      return res.status(404).json({ message: "Listing not found" });
    }

    res.json({ ...result.listing, property: result.property });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

listingsRouter.post("/", ...middleware, requirePermission("listings:create"), async (req: Request, res: Response) => {
  try {
    const isolation = createTenantIsolation(req);
    const tenantId = isolation.getTenantId();

    if (req.body.propertyId) {
      const [property] = await db.select()
        .from(properties)
        .where(and(eq(properties.id, req.body.propertyId), eq(properties.tenantId, tenantId)));

      if (!property) {
        return res.status(400).json({ message: "Property not found" });
      }
    }

    const parsed = insertListingSchema.safeParse({
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

    const [listing] = await db.insert(listings).values(parsed.data).returning();

    await auditService.logAsync({
      tenantId,
      userId: req.context?.user?.id,
      action: "create",
      resource: "listing",
      resourceId: listing.id,
      metadata: { title: listing.title, listingType: listing.listingType },
    });

    res.status(201).json(listing);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

listingsRouter.patch("/:id", ...middleware, requirePermission("listings:update"), async (req: Request, res: Response) => {
  try {
    const isolation = createTenantIsolation(req);
    const { id } = req.params;

    const [existing] = await db.select()
      .from(listings)
      .where(and(eq(listings.id, id), eq(listings.tenantId, isolation.getTenantId())));

    if (!existing) {
      return res.status(404).json({ message: "Listing not found" });
    }

    const updateSchema = insertListingSchema.partial().omit({ tenantId: true });
    const parsed = updateSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const [updated] = await db.update(listings)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(listings.id, id))
      .returning();

    await auditService.logAsync({
      tenantId: isolation.getTenantId(),
      userId: req.context?.user?.id,
      action: "update",
      resource: "listing",
      resourceId: id,
      metadata: { changes: Object.keys(parsed.data) },
    });

    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

listingsRouter.delete("/:id", ...middleware, requirePermission("listings:delete"), async (req: Request, res: Response) => {
  try {
    const isolation = createTenantIsolation(req);
    const { id } = req.params;

    const [existing] = await db.select()
      .from(listings)
      .where(and(eq(listings.id, id), eq(listings.tenantId, isolation.getTenantId())));

    if (!existing) {
      return res.status(404).json({ message: "Listing not found" });
    }

    await db.delete(listings).where(eq(listings.id, id));

    await auditService.logAsync({
      tenantId: isolation.getTenantId(),
      userId: req.context?.user?.id,
      action: "delete",
      resource: "listing",
      resourceId: id,
    });

    res.status(204).send();
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});
