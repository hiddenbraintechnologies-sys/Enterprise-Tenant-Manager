import { Router, type Request, type Response } from "express";
import { db } from "../../db";
import { attendance, insertAttendanceSchema } from "@shared/schema";
import { eq, and, desc, asc, sql, isNull } from "drizzle-orm";
import { z } from "zod";
import { authenticateJWT, requireMinimumRole } from "../auth-middleware";
import { requirePermission } from "../context";
import { tenantIsolationMiddleware, createTenantIsolation } from "../tenant-isolation";
import { auditService } from "../audit";

export const attendanceRouter = Router();

const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(50),
  sortBy: z.enum(["createdAt", "date", "status"]).default("date"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  studentId: z.string().optional(),
  batchId: z.string().optional(),
  status: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

const middleware = [
  authenticateJWT({ required: true }),
  tenantIsolationMiddleware(),
  requireMinimumRole("staff"),
];

attendanceRouter.get("/", ...middleware, async (req: Request, res: Response) => {
  try {
    const tenantId = req.context?.tenant?.id;
    if (!tenantId) {
      return res.status(403).json({ message: "Tenant context required" });
    }

    const query = paginationSchema.parse(req.query);
    const { page, limit, sortBy, sortOrder, studentId, batchId, status, dateFrom, dateTo } = query;
    const offset = (page - 1) * limit;

    const conditions = [eq(attendance.tenantId, tenantId)];

    if (studentId) {
      conditions.push(eq(attendance.studentId, studentId));
    }

    if (batchId) {
      conditions.push(eq(attendance.batchId, batchId));
    }

    if (status) {
      conditions.push(eq(attendance.status, status as any));
    }

    if (dateFrom) {
      conditions.push(sql`${attendance.date} >= ${dateFrom}`);
    }

    if (dateTo) {
      conditions.push(sql`${attendance.date} <= ${dateTo}`);
    }

    const orderColumn = {
      createdAt: attendance.createdAt,
      date: attendance.date,
      status: attendance.status,
    }[sortBy];

    const orderFn = sortOrder === "asc" ? asc : desc;

    const [data, countResult] = await Promise.all([
      db.select()
        .from(attendance)
        .where(and(...conditions))
        .orderBy(orderFn(orderColumn))
        .limit(limit)
        .offset(offset),
      db.select({ count: sql<number>`count(*)::int` })
        .from(attendance)
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

attendanceRouter.post("/", ...middleware, requirePermission("attendance:create"), async (req: Request, res: Response) => {
  try {
    const isolation = createTenantIsolation(req);
    const tenantId = isolation.getTenantId();

    const parsed = insertAttendanceSchema.safeParse({
      ...req.body,
      tenantId,
      markedBy: req.context?.user?.id,
    });

    if (!parsed.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const [record] = await db.insert(attendance).values(parsed.data).returning();

    await auditService.logAsync({
      tenantId,
      userId: req.context?.user?.id,
      action: "create",
      resource: "attendance",
      resourceId: record.id,
      metadata: { studentId: record.studentId, date: record.date, status: record.status },
    });

    res.status(201).json(record);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

attendanceRouter.post("/bulk", ...middleware, requirePermission("attendance:create"), async (req: Request, res: Response) => {
  try {
    const isolation = createTenantIsolation(req);
    const tenantId = isolation.getTenantId();

    const { records } = req.body as { records: any[] };

    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ message: "Records array is required" });
    }

    const parsedRecords = records.map(record => {
      const parsed = insertAttendanceSchema.safeParse({
        ...record,
        tenantId,
        markedBy: req.context?.user?.id,
      });
      if (!parsed.success) {
        throw new Error(`Validation failed: ${JSON.stringify(parsed.error.flatten().fieldErrors)}`);
      }
      return parsed.data;
    });

    const inserted = await db.insert(attendance).values(parsedRecords).returning();

    await auditService.logAsync({
      tenantId,
      userId: req.context?.user?.id,
      action: "create",
      resource: "attendance_bulk",
      metadata: { count: inserted.length },
    });

    res.status(201).json({ data: inserted, count: inserted.length });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

attendanceRouter.patch("/:id", ...middleware, requirePermission("attendance:update"), async (req: Request, res: Response) => {
  try {
    const isolation = createTenantIsolation(req);
    const { id } = req.params;

    const [existing] = await db.select()
      .from(attendance)
      .where(and(eq(attendance.id, id), eq(attendance.tenantId, isolation.getTenantId())));

    if (!existing) {
      return res.status(404).json({ message: "Attendance record not found" });
    }

    const updateSchema = insertAttendanceSchema.partial().omit({ tenantId: true });
    const parsed = updateSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const [updated] = await db.update(attendance)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(attendance.id, id))
      .returning();

    await auditService.logAsync({
      tenantId: isolation.getTenantId(),
      userId: req.context?.user?.id,
      action: "update",
      resource: "attendance",
      resourceId: id,
      metadata: { changes: Object.keys(parsed.data) },
    });

    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

attendanceRouter.delete("/:id", ...middleware, requirePermission("attendance:delete"), async (req: Request, res: Response) => {
  try {
    const isolation = createTenantIsolation(req);
    const { id } = req.params;

    const [existing] = await db.select()
      .from(attendance)
      .where(and(eq(attendance.id, id), eq(attendance.tenantId, isolation.getTenantId())));

    if (!existing) {
      return res.status(404).json({ message: "Attendance record not found" });
    }

    await db.delete(attendance).where(eq(attendance.id, id));

    await auditService.logAsync({
      tenantId: isolation.getTenantId(),
      userId: req.context?.user?.id,
      action: "delete",
      resource: "attendance",
      resourceId: id,
    });

    res.status(204).send();
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});
