import { Router, type Request, type Response } from "express";
import { db } from "../../db";
import { exams, examResults, insertExamSchema, insertExamResultSchema } from "@shared/schema";
import { eq, and, desc, asc, sql, ilike, isNull } from "drizzle-orm";
import { z } from "zod";
import { authenticateHybrid, requireMinimumRole } from "../auth-middleware";
import { requirePermission } from "../context";
import { tenantIsolationMiddleware, createTenantIsolation } from "../tenant-isolation";
import { auditService } from "../audit";

export const examsRouter = Router();

const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  sortBy: z.enum(["createdAt", "name", "examDate", "status"]).default("examDate"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  search: z.string().optional(),
  status: z.string().optional(),
  courseId: z.string().optional(),
  batchId: z.string().optional(),
});

const middleware = [
  authenticateHybrid(),
  tenantIsolationMiddleware(),
  requireMinimumRole("staff"),
];

examsRouter.get("/", ...middleware, async (req: Request, res: Response) => {
  try {
    const tenantId = req.context?.tenant?.id;
    if (!tenantId) {
      return res.status(403).json({ message: "Tenant context required" });
    }

    const query = paginationSchema.parse(req.query);
    const { page, limit, sortBy, sortOrder, search, status, courseId, batchId } = query;
    const offset = (page - 1) * limit;

    const conditions = [eq(exams.tenantId, tenantId), isNull(exams.deletedAt)];

    if (search) {
      conditions.push(ilike(exams.name, `%${search}%`));
    }

    if (status) {
      conditions.push(eq(exams.status, status as any));
    }

    if (courseId) {
      conditions.push(eq(exams.courseId, courseId));
    }

    if (batchId) {
      conditions.push(eq(exams.batchId, batchId));
    }

    const orderColumn = {
      createdAt: exams.createdAt,
      name: exams.name,
      examDate: exams.examDate,
      status: exams.status,
    }[sortBy];

    const orderFn = sortOrder === "asc" ? asc : desc;

    const [data, countResult] = await Promise.all([
      db.select()
        .from(exams)
        .where(and(...conditions))
        .orderBy(orderFn(orderColumn))
        .limit(limit)
        .offset(offset),
      db.select({ count: sql<number>`count(*)::int` })
        .from(exams)
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

examsRouter.get("/:id", ...middleware, async (req: Request, res: Response) => {
  try {
    const isolation = createTenantIsolation(req);
    const { id } = req.params;

    const [exam] = await db.select()
      .from(exams)
      .where(and(eq(exams.id, id), eq(exams.tenantId, isolation.getTenantId()), isNull(exams.deletedAt)));

    if (!exam) {
      return res.status(404).json({ message: "Exam not found" });
    }

    res.json(exam);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

examsRouter.get("/:id/results", ...middleware, async (req: Request, res: Response) => {
  try {
    const isolation = createTenantIsolation(req);
    const { id } = req.params;

    const results = await db.select()
      .from(examResults)
      .where(and(eq(examResults.examId, id), eq(examResults.tenantId, isolation.getTenantId())));

    res.json(results);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

examsRouter.post("/", ...middleware, requirePermission("exams:create"), async (req: Request, res: Response) => {
  try {
    const isolation = createTenantIsolation(req);
    const tenantId = isolation.getTenantId();

    const parsed = insertExamSchema.safeParse({
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

    const [exam] = await db.insert(exams).values(parsed.data).returning();

    await auditService.logAsync({
      tenantId,
      userId: req.context?.user?.id,
      action: "create",
      resource: "exam",
      resourceId: exam.id,
      metadata: { name: exam.name },
    });

    res.status(201).json(exam);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

examsRouter.post("/:id/results", ...middleware, requirePermission("exams:update"), async (req: Request, res: Response) => {
  try {
    const isolation = createTenantIsolation(req);
    const tenantId = isolation.getTenantId();
    const { id } = req.params;

    const parsed = insertExamResultSchema.safeParse({
      ...req.body,
      examId: id,
      tenantId,
      gradedBy: req.context?.user?.id,
    });

    if (!parsed.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const [result] = await db.insert(examResults).values(parsed.data).returning();

    await auditService.logAsync({
      tenantId,
      userId: req.context?.user?.id,
      action: "create",
      resource: "exam_result",
      resourceId: result.id,
      metadata: { examId: id, studentId: req.body.studentId },
    });

    res.status(201).json(result);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

examsRouter.patch("/:id", ...middleware, requirePermission("exams:update"), async (req: Request, res: Response) => {
  try {
    const isolation = createTenantIsolation(req);
    const { id } = req.params;

    const [existing] = await db.select()
      .from(exams)
      .where(and(eq(exams.id, id), eq(exams.tenantId, isolation.getTenantId()), isNull(exams.deletedAt)));

    if (!existing) {
      return res.status(404).json({ message: "Exam not found" });
    }

    const updateSchema = insertExamSchema.partial().omit({ tenantId: true });
    const parsed = updateSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const [updated] = await db.update(exams)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(exams.id, id))
      .returning();

    await auditService.logAsync({
      tenantId: isolation.getTenantId(),
      userId: req.context?.user?.id,
      action: "update",
      resource: "exam",
      resourceId: id,
      metadata: { changes: Object.keys(parsed.data) },
    });

    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

examsRouter.delete("/:id", ...middleware, requirePermission("exams:delete"), async (req: Request, res: Response) => {
  try {
    const isolation = createTenantIsolation(req);
    const { id } = req.params;

    const [existing] = await db.select()
      .from(exams)
      .where(and(eq(exams.id, id), eq(exams.tenantId, isolation.getTenantId()), isNull(exams.deletedAt)));

    if (!existing) {
      return res.status(404).json({ message: "Exam not found" });
    }

    await db.update(exams).set({ deletedAt: new Date() }).where(eq(exams.id, id));

    await auditService.logAsync({
      tenantId: isolation.getTenantId(),
      userId: req.context?.user?.id,
      action: "delete",
      resource: "exam",
      resourceId: id,
      metadata: { name: existing.name },
    });

    res.status(204).send();
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});
