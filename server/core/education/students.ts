import { Router, type Request, type Response } from "express";
import { db } from "../../db";
import { students, insertStudentSchema } from "@shared/schema";
import { eq, and, desc, asc, sql, ilike, or, isNull } from "drizzle-orm";
import { z } from "zod";
import { authenticateJWT, requireMinimumRole } from "../auth-middleware";
import { requirePermission } from "../context";
import { tenantIsolationMiddleware, createTenantIsolation } from "../tenant-isolation";
import { auditService } from "../audit";

export const studentsRouter = Router();

const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  sortBy: z.enum(["createdAt", "firstName", "lastName", "status", "enrollmentDate"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  search: z.string().optional(),
  status: z.string().optional(),
  grade: z.string().optional(),
});

const middleware = [
  authenticateJWT({ required: true }),
  tenantIsolationMiddleware(),
  requireMinimumRole("staff"),
];

studentsRouter.get("/", ...middleware, async (req: Request, res: Response) => {
  try {
    const tenantId = req.context?.tenant?.id;
    if (!tenantId) {
      return res.status(403).json({ message: "Tenant context required" });
    }

    const query = paginationSchema.parse(req.query);
    const { page, limit, sortBy, sortOrder, search, status, grade } = query;
    const offset = (page - 1) * limit;

    const conditions = [eq(students.tenantId, tenantId), isNull(students.deletedAt)];

    if (search) {
      conditions.push(
        or(
          ilike(students.firstName, `%${search}%`),
          ilike(students.lastName, `%${search}%`),
          ilike(students.email, `%${search}%`),
          ilike(students.enrollmentNumber, `%${search}%`)
        )!
      );
    }

    if (status) {
      conditions.push(eq(students.status, status as any));
    }

    // Note: grade field not in schema - filter removed

    const orderColumn = {
      createdAt: students.createdAt,
      firstName: students.firstName,
      lastName: students.lastName,
      status: students.status,
      enrollmentDate: students.enrollmentDate,
    }[sortBy];

    const orderFn = sortOrder === "asc" ? asc : desc;

    const [data, countResult] = await Promise.all([
      db.select()
        .from(students)
        .where(and(...conditions))
        .orderBy(orderFn(orderColumn))
        .limit(limit)
        .offset(offset),
      db.select({ count: sql<number>`count(*)::int` })
        .from(students)
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

studentsRouter.get("/:id", ...middleware, async (req: Request, res: Response) => {
  try {
    const isolation = createTenantIsolation(req);
    const { id } = req.params;

    const [student] = await db.select()
      .from(students)
      .where(and(
        eq(students.id, id),
        eq(students.tenantId, isolation.getTenantId()),
        isNull(students.deletedAt)
      ));

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    res.json(student);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

studentsRouter.post("/", ...middleware, requirePermission("students:create"), async (req: Request, res: Response) => {
  try {
    const isolation = createTenantIsolation(req);
    const tenantId = isolation.getTenantId();

    const parsed = insertStudentSchema.safeParse({
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

    const [student] = await db.insert(students).values(parsed.data).returning();

    await auditService.logAsync({
      tenantId,
      userId: req.context?.user?.id,
      action: "create",
      resource: "student",
      resourceId: student.id,
      metadata: { name: `${student.firstName} ${student.lastName}` },
    });

    res.status(201).json(student);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

studentsRouter.patch("/:id", ...middleware, requirePermission("students:update"), async (req: Request, res: Response) => {
  try {
    const isolation = createTenantIsolation(req);
    const { id } = req.params;

    const [existing] = await db.select()
      .from(students)
      .where(and(
        eq(students.id, id),
        eq(students.tenantId, isolation.getTenantId()),
        isNull(students.deletedAt)
      ));

    if (!existing) {
      return res.status(404).json({ message: "Student not found" });
    }

    const updateSchema = insertStudentSchema.partial().omit({ tenantId: true });
    const parsed = updateSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const [updated] = await db.update(students)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(students.id, id))
      .returning();

    await auditService.logAsync({
      tenantId: isolation.getTenantId(),
      userId: req.context?.user?.id,
      action: "update",
      resource: "student",
      resourceId: id,
      metadata: { changes: Object.keys(parsed.data) },
    });

    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

studentsRouter.delete("/:id", ...middleware, requirePermission("students:delete"), async (req: Request, res: Response) => {
  try {
    const isolation = createTenantIsolation(req);
    const { id } = req.params;

    const [existing] = await db.select()
      .from(students)
      .where(and(
        eq(students.id, id),
        eq(students.tenantId, isolation.getTenantId()),
        isNull(students.deletedAt)
      ));

    if (!existing) {
      return res.status(404).json({ message: "Student not found" });
    }

    await db.update(students)
      .set({ deletedAt: new Date() })
      .where(eq(students.id, id));

    await auditService.logAsync({
      tenantId: isolation.getTenantId(),
      userId: req.context?.user?.id,
      action: "delete",
      resource: "student",
      resourceId: id,
      metadata: { name: `${existing.firstName} ${existing.lastName}` },
    });

    res.status(204).send();
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});
