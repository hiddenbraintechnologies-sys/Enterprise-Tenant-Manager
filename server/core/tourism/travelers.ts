import { Router, type Request, type Response } from "express";
import { db } from "../../db";
import { travelers, tourBookings, insertTravelerSchema } from "@shared/schema";
import { eq, and, desc, asc, sql, ilike, or } from "drizzle-orm";
import { z } from "zod";
import { authenticateJWT, requireMinimumRole } from "../auth-middleware";
import { requirePermission } from "../context";
import { tenantIsolationMiddleware, createTenantIsolation } from "../tenant-isolation";
import { auditService } from "../audit";

export const travelersRouter = Router();

const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  sortBy: z.enum(["createdAt", "firstName", "travelerType"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  search: z.string().optional(),
  bookingId: z.string().optional(),
  travelerType: z.string().optional(),
});

const middleware = [
  authenticateJWT({ required: true }),
  tenantIsolationMiddleware(),
  requireMinimumRole("staff"),
];

travelersRouter.get("/", ...middleware, async (req: Request, res: Response) => {
  try {
    const tenantId = req.context?.tenant?.id;
    if (!tenantId) {
      return res.status(403).json({ message: "Tenant context required" });
    }

    const query = paginationSchema.parse(req.query);
    const { page, limit, sortBy, sortOrder, search, bookingId, travelerType } = query;
    const offset = (page - 1) * limit;

    const conditions = [eq(travelers.tenantId, tenantId)];

    if (search) {
      conditions.push(
        or(
          ilike(travelers.firstName, `%${search}%`),
          ilike(travelers.lastName, `%${search}%`),
          ilike(travelers.email, `%${search}%`),
          ilike(travelers.passportNumber, `%${search}%`)
        )!
      );
    }

    if (bookingId) conditions.push(eq(travelers.bookingId, bookingId));
    if (travelerType) conditions.push(eq(travelers.travelerType, travelerType as any));

    const orderColumn = {
      createdAt: travelers.createdAt,
      firstName: travelers.firstName,
      travelerType: travelers.travelerType,
    }[sortBy];

    const orderFn = sortOrder === "asc" ? asc : desc;

    const [data, countResult] = await Promise.all([
      db.select({
        traveler: travelers,
        booking: tourBookings,
      })
        .from(travelers)
        .leftJoin(tourBookings, eq(travelers.bookingId, tourBookings.id))
        .where(and(...conditions))
        .orderBy(orderFn(orderColumn))
        .limit(limit)
        .offset(offset),
      db.select({ count: sql<number>`count(*)::int` })
        .from(travelers)
        .where(and(...conditions)),
    ]);

    const total = countResult[0]?.count || 0;

    res.json({
      data: data.map(d => ({ ...d.traveler, booking: d.booking })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

travelersRouter.get("/:id", ...middleware, async (req: Request, res: Response) => {
  try {
    const isolation = createTenantIsolation(req);
    const { id } = req.params;

    const [result] = await db.select({
      traveler: travelers,
      booking: tourBookings,
    })
      .from(travelers)
      .leftJoin(tourBookings, eq(travelers.bookingId, tourBookings.id))
      .where(and(eq(travelers.id, id), eq(travelers.tenantId, isolation.getTenantId())));

    if (!result) {
      return res.status(404).json({ message: "Traveler not found" });
    }

    res.json({ ...result.traveler, booking: result.booking });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

travelersRouter.post("/", ...middleware, requirePermission("travelers:create"), async (req: Request, res: Response) => {
  try {
    const isolation = createTenantIsolation(req);
    const tenantId = isolation.getTenantId();

    const [booking] = await db.select()
      .from(tourBookings)
      .where(and(eq(tourBookings.id, req.body.bookingId), eq(tourBookings.tenantId, tenantId)));

    if (!booking) {
      return res.status(400).json({ message: "Booking not found" });
    }

    const parsed = insertTravelerSchema.safeParse({
      ...req.body,
      tenantId,
    });

    if (!parsed.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const [traveler] = await db.insert(travelers).values(parsed.data).returning();

    await auditService.logAsync({
      tenantId,
      userId: req.context?.user?.id,
      action: "create",
      resource: "traveler",
      resourceId: traveler.id,
      metadata: { name: `${traveler.firstName} ${traveler.lastName}`, bookingId: traveler.bookingId },
    });

    res.status(201).json(traveler);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

travelersRouter.post("/bulk", ...middleware, requirePermission("travelers:create"), async (req: Request, res: Response) => {
  try {
    const isolation = createTenantIsolation(req);
    const tenantId = isolation.getTenantId();

    const { bookingId, travelers: travelersList } = req.body;

    if (!bookingId || !Array.isArray(travelersList) || travelersList.length === 0) {
      return res.status(400).json({ message: "bookingId and travelers array are required" });
    }

    const [booking] = await db.select()
      .from(tourBookings)
      .where(and(eq(tourBookings.id, bookingId), eq(tourBookings.tenantId, tenantId)));

    if (!booking) {
      return res.status(400).json({ message: "Booking not found" });
    }

    const validatedItems = [];
    for (const item of travelersList) {
      const parsed = insertTravelerSchema.safeParse({
        ...item,
        tenantId,
        bookingId,
      });

      if (!parsed.success) {
        return res.status(400).json({
          message: `Validation failed for traveler ${item.firstName}`,
          errors: parsed.error.flatten().fieldErrors,
        });
      }

      validatedItems.push(parsed.data);
    }

    const created = await db.insert(travelers).values(validatedItems).returning();

    await auditService.logAsync({
      tenantId,
      userId: req.context?.user?.id,
      action: "create",
      resource: "traveler",
      metadata: { count: created.length, bookingId, type: "bulk" },
    });

    res.status(201).json(created);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

travelersRouter.patch("/:id", ...middleware, requirePermission("travelers:update"), async (req: Request, res: Response) => {
  try {
    const isolation = createTenantIsolation(req);
    const { id } = req.params;

    const [existing] = await db.select()
      .from(travelers)
      .where(and(eq(travelers.id, id), eq(travelers.tenantId, isolation.getTenantId())));

    if (!existing) {
      return res.status(404).json({ message: "Traveler not found" });
    }

    const updateSchema = insertTravelerSchema.partial().omit({ tenantId: true, bookingId: true });
    const parsed = updateSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const [updated] = await db.update(travelers)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(travelers.id, id))
      .returning();

    await auditService.logAsync({
      tenantId: isolation.getTenantId(),
      userId: req.context?.user?.id,
      action: "update",
      resource: "traveler",
      resourceId: id,
      metadata: { changes: Object.keys(parsed.data) },
    });

    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

travelersRouter.delete("/:id", ...middleware, requirePermission("travelers:delete"), async (req: Request, res: Response) => {
  try {
    const isolation = createTenantIsolation(req);
    const { id } = req.params;

    const [existing] = await db.select()
      .from(travelers)
      .where(and(eq(travelers.id, id), eq(travelers.tenantId, isolation.getTenantId())));

    if (!existing) {
      return res.status(404).json({ message: "Traveler not found" });
    }

    await db.delete(travelers).where(eq(travelers.id, id));

    await auditService.logAsync({
      tenantId: isolation.getTenantId(),
      userId: req.context?.user?.id,
      action: "delete",
      resource: "traveler",
      resourceId: id,
    });

    res.status(204).send();
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});
