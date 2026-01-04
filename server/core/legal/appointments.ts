import { Router, type Request, type Response } from "express";
import { db } from "../../db";
import { legalAppointments, insertLegalAppointmentSchema } from "@shared/schema";
import { eq, and, desc, asc, sql, isNull } from "drizzle-orm";
import { z } from "zod";
import { authenticateJWT, requireMinimumRole } from "../auth-middleware";
import { requirePermission } from "../context";
import { tenantIsolationMiddleware, createTenantIsolation } from "../tenant-isolation";
import { auditService } from "../audit";

export const legalAppointmentsRouter = Router();

const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  sortBy: z.enum(["createdAt", "scheduledDate", "status"]).default("scheduledDate"),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
  status: z.string().optional(),
  clientId: z.string().optional(),
  caseId: z.string().optional(),
  attendeeId: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

const middleware = [
  authenticateJWT({ required: true }),
  tenantIsolationMiddleware(),
  requireMinimumRole("staff"),
];

legalAppointmentsRouter.get("/", ...middleware, async (req: Request, res: Response) => {
  try {
    const tenantId = req.context?.tenant?.id;
    if (!tenantId) {
      return res.status(403).json({ message: "Tenant context required" });
    }

    const query = paginationSchema.parse(req.query);
    const { page, limit, sortBy, sortOrder, status, clientId, caseId, attendeeId, dateFrom, dateTo } = query;
    const offset = (page - 1) * limit;

    const conditions = [eq(legalAppointments.tenantId, tenantId), isNull(legalAppointments.deletedAt)];

    if (status) {
      conditions.push(eq(legalAppointments.status, status as any));
    }

    if (clientId) {
      conditions.push(eq(legalAppointments.clientId, clientId));
    }

    if (caseId) {
      conditions.push(eq(legalAppointments.caseId, caseId));
    }

    if (attendeeId) {
      conditions.push(eq(legalAppointments.attendeeId, attendeeId));
    }

    if (dateFrom) {
      conditions.push(sql`${legalAppointments.scheduledDate} >= ${dateFrom}`);
    }

    if (dateTo) {
      conditions.push(sql`${legalAppointments.scheduledDate} <= ${dateTo}`);
    }

    const orderColumn = {
      createdAt: legalAppointments.createdAt,
      scheduledDate: legalAppointments.scheduledDate,
      status: legalAppointments.status,
    }[sortBy];

    const orderFn = sortOrder === "asc" ? asc : desc;

    const [data, countResult] = await Promise.all([
      db.select()
        .from(legalAppointments)
        .where(and(...conditions))
        .orderBy(orderFn(orderColumn))
        .limit(limit)
        .offset(offset),
      db.select({ count: sql<number>`count(*)::int` })
        .from(legalAppointments)
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

legalAppointmentsRouter.get("/:id", ...middleware, async (req: Request, res: Response) => {
  try {
    const isolation = createTenantIsolation(req);
    const { id } = req.params;

    const [appointment] = await db.select()
      .from(legalAppointments)
      .where(and(eq(legalAppointments.id, id), eq(legalAppointments.tenantId, isolation.getTenantId()), isNull(legalAppointments.deletedAt)));

    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    res.json(appointment);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

legalAppointmentsRouter.post("/", ...middleware, requirePermission("legal_appointments:create"), async (req: Request, res: Response) => {
  try {
    const isolation = createTenantIsolation(req);
    const tenantId = isolation.getTenantId();

    const parsed = insertLegalAppointmentSchema.safeParse({
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

    const [appointment] = await db.insert(legalAppointments).values(parsed.data).returning();

    await auditService.logAsync({
      tenantId,
      userId: req.context?.user?.id,
      action: "create",
      resource: "legal_appointment",
      resourceId: appointment.id,
      metadata: { clientId: appointment.clientId, scheduledDate: appointment.scheduledDate },
    });

    res.status(201).json(appointment);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

legalAppointmentsRouter.patch("/:id", ...middleware, requirePermission("legal_appointments:update"), async (req: Request, res: Response) => {
  try {
    const isolation = createTenantIsolation(req);
    const { id } = req.params;

    const [existing] = await db.select()
      .from(legalAppointments)
      .where(and(eq(legalAppointments.id, id), eq(legalAppointments.tenantId, isolation.getTenantId()), isNull(legalAppointments.deletedAt)));

    if (!existing) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    const updateSchema = insertLegalAppointmentSchema.partial().omit({ tenantId: true });
    const parsed = updateSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const [updated] = await db.update(legalAppointments)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(legalAppointments.id, id))
      .returning();

    await auditService.logAsync({
      tenantId: isolation.getTenantId(),
      userId: req.context?.user?.id,
      action: "update",
      resource: "legal_appointment",
      resourceId: id,
      metadata: { changes: Object.keys(parsed.data) },
    });

    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

legalAppointmentsRouter.patch("/:id/complete", ...middleware, requirePermission("legal_appointments:update"), async (req: Request, res: Response) => {
  try {
    const isolation = createTenantIsolation(req);
    const { id } = req.params;
    const { duration, billedHours, notes, outcome } = req.body;

    const [existing] = await db.select()
      .from(legalAppointments)
      .where(and(eq(legalAppointments.id, id), eq(legalAppointments.tenantId, isolation.getTenantId()), isNull(legalAppointments.deletedAt)));

    if (!existing) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    const [updated] = await db.update(legalAppointments)
      .set({
        status: "completed",
        duration,
        billedHours: billedHours?.toString(),
        notes,
        outcome,
        updatedAt: new Date(),
      })
      .where(eq(legalAppointments.id, id))
      .returning();

    await auditService.logAsync({
      tenantId: isolation.getTenantId(),
      userId: req.context?.user?.id,
      action: "update",
      resource: "legal_appointment",
      resourceId: id,
      metadata: { statusChange: { from: existing.status, to: "completed" }, billedHours },
    });

    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

legalAppointmentsRouter.delete("/:id", ...middleware, requirePermission("legal_appointments:delete"), async (req: Request, res: Response) => {
  try {
    const isolation = createTenantIsolation(req);
    const { id } = req.params;

    const [existing] = await db.select()
      .from(legalAppointments)
      .where(and(eq(legalAppointments.id, id), eq(legalAppointments.tenantId, isolation.getTenantId()), isNull(legalAppointments.deletedAt)));

    if (!existing) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    await db.update(legalAppointments).set({ deletedAt: new Date() }).where(eq(legalAppointments.id, id));

    await auditService.logAsync({
      tenantId: isolation.getTenantId(),
      userId: req.context?.user?.id,
      action: "delete",
      resource: "legal_appointment",
      resourceId: id,
    });

    res.status(204).send();
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});
