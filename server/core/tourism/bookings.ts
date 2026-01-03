import { Router, type Request, type Response } from "express";
import { db } from "../../db";
import { tourBookings, tourPackages, insertTourBookingSchema } from "@shared/schema";
import { eq, and, desc, asc, sql, ilike, or, gte, lte } from "drizzle-orm";
import { z } from "zod";
import { authenticateJWT, requireMinimumRole } from "../auth-middleware";
import { requirePermission } from "../context";
import { tenantIsolationMiddleware, createTenantIsolation } from "../tenant-isolation";
import { auditService } from "../audit";

export const bookingsRouter = Router();

const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  sortBy: z.enum(["createdAt", "departureDate", "status", "totalAmount"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  search: z.string().optional(),
  status: z.string().optional(),
  packageId: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

const middleware = [
  authenticateJWT({ required: true }),
  tenantIsolationMiddleware(),
  requireMinimumRole("staff"),
];

function generateBookingNumber(): string {
  const prefix = "BK";
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}${timestamp}${random}`;
}

bookingsRouter.get("/", ...middleware, async (req: Request, res: Response) => {
  try {
    const tenantId = req.context?.tenant?.id;
    if (!tenantId) {
      return res.status(403).json({ message: "Tenant context required" });
    }

    const query = paginationSchema.parse(req.query);
    const { page, limit, sortBy, sortOrder, search, status, packageId, dateFrom, dateTo } = query;
    const offset = (page - 1) * limit;

    const conditions = [eq(tourBookings.tenantId, tenantId)];

    if (search) {
      conditions.push(
        or(
          ilike(tourBookings.bookingNumber, `%${search}%`),
          ilike(tourBookings.notes, `%${search}%`)
        )!
      );
    }

    if (status) conditions.push(eq(tourBookings.status, status as any));
    if (packageId) conditions.push(eq(tourBookings.packageId, packageId));
    if (dateFrom) conditions.push(gte(tourBookings.departureDate, dateFrom));
    if (dateTo) conditions.push(lte(tourBookings.departureDate, dateTo));

    const orderColumn = {
      createdAt: tourBookings.createdAt,
      departureDate: tourBookings.departureDate,
      status: tourBookings.status,
      totalAmount: tourBookings.totalAmount,
    }[sortBy];

    const orderFn = sortOrder === "asc" ? asc : desc;

    const [data, countResult] = await Promise.all([
      db.select({
        booking: tourBookings,
        package: tourPackages,
      })
        .from(tourBookings)
        .leftJoin(tourPackages, eq(tourBookings.packageId, tourPackages.id))
        .where(and(...conditions))
        .orderBy(orderFn(orderColumn))
        .limit(limit)
        .offset(offset),
      db.select({ count: sql<number>`count(*)::int` })
        .from(tourBookings)
        .where(and(...conditions)),
    ]);

    const total = countResult[0]?.count || 0;

    res.json({
      data: data.map(d => ({ ...d.booking, package: d.package })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

bookingsRouter.get("/:id", ...middleware, async (req: Request, res: Response) => {
  try {
    const isolation = createTenantIsolation(req);
    const { id } = req.params;

    const [result] = await db.select({
      booking: tourBookings,
      package: tourPackages,
    })
      .from(tourBookings)
      .leftJoin(tourPackages, eq(tourBookings.packageId, tourPackages.id))
      .where(and(eq(tourBookings.id, id), eq(tourBookings.tenantId, isolation.getTenantId())));

    if (!result) {
      return res.status(404).json({ message: "Booking not found" });
    }

    res.json({ ...result.booking, package: result.package });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

bookingsRouter.post("/", ...middleware, requirePermission("bookings:create"), async (req: Request, res: Response) => {
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

    const bookingNumber = generateBookingNumber();

    const parsed = insertTourBookingSchema.safeParse({
      ...req.body,
      tenantId,
      bookingNumber,
      createdBy: req.context?.user?.id,
    });

    if (!parsed.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const [booking] = await db.insert(tourBookings).values(parsed.data).returning();

    await auditService.logAsync({
      tenantId,
      userId: req.context?.user?.id,
      action: "create",
      resource: "tour_booking",
      resourceId: booking.id,
      metadata: { bookingNumber: booking.bookingNumber },
    });

    res.status(201).json(booking);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

bookingsRouter.patch("/:id", ...middleware, requirePermission("bookings:update"), async (req: Request, res: Response) => {
  try {
    const isolation = createTenantIsolation(req);
    const { id } = req.params;

    const [existing] = await db.select()
      .from(tourBookings)
      .where(and(eq(tourBookings.id, id), eq(tourBookings.tenantId, isolation.getTenantId())));

    if (!existing) {
      return res.status(404).json({ message: "Booking not found" });
    }

    const updateSchema = insertTourBookingSchema.partial().omit({ tenantId: true, bookingNumber: true });
    const parsed = updateSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const updateData: any = { ...parsed.data, updatedAt: new Date() };
    
    if (parsed.data.status === "confirmed" && !existing.confirmedAt) {
      updateData.confirmedAt = new Date();
    }
    if (parsed.data.status === "completed" && !existing.completedAt) {
      updateData.completedAt = new Date();
    }
    if (parsed.data.status === "cancelled" && !existing.cancelledAt) {
      updateData.cancelledAt = new Date();
    }

    const [updated] = await db.update(tourBookings)
      .set(updateData)
      .where(eq(tourBookings.id, id))
      .returning();

    await auditService.logAsync({
      tenantId: isolation.getTenantId(),
      userId: req.context?.user?.id,
      action: "update",
      resource: "tour_booking",
      resourceId: id,
      metadata: { changes: Object.keys(parsed.data) },
    });

    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

bookingsRouter.delete("/:id", ...middleware, requirePermission("bookings:delete"), async (req: Request, res: Response) => {
  try {
    const isolation = createTenantIsolation(req);
    const { id } = req.params;

    const [existing] = await db.select()
      .from(tourBookings)
      .where(and(eq(tourBookings.id, id), eq(tourBookings.tenantId, isolation.getTenantId())));

    if (!existing) {
      return res.status(404).json({ message: "Booking not found" });
    }

    await db.delete(tourBookings).where(eq(tourBookings.id, id));

    await auditService.logAsync({
      tenantId: isolation.getTenantId(),
      userId: req.context?.user?.id,
      action: "delete",
      resource: "tour_booking",
      resourceId: id,
    });

    res.status(204).send();
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});
