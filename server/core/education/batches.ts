import { Router, type Request, type Response } from "express";
import { db } from "../../db";
import { batches, batchStudents, insertBatchSchema, insertBatchStudentSchema } from "@shared/schema";
import { eq, and, desc, asc, sql, ilike, or, isNull } from "drizzle-orm";
import { z } from "zod";
import { authenticateJWT, requireMinimumRole } from "../auth-middleware";
import { requirePermission } from "../context";
import { tenantIsolationMiddleware, createTenantIsolation } from "../tenant-isolation";
import { auditService } from "../audit";

export const batchesRouter = Router();

const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  sortBy: z.enum(["createdAt", "name", "status", "startDate"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  search: z.string().optional(),
  status: z.string().optional(),
  courseId: z.string().optional(),
});

const middleware = [
  authenticateJWT({ required: true }),
  tenantIsolationMiddleware(),
  requireMinimumRole("staff"),
];

batchesRouter.get("/", ...middleware, async (req: Request, res: Response) => {
  try {
    const tenantId = req.context?.tenant?.id;
    if (!tenantId) {
      return res.status(403).json({ message: "Tenant context required" });
    }

    const query = paginationSchema.parse(req.query);
    const { page, limit, sortBy, sortOrder, search, status, courseId } = query;
    const offset = (page - 1) * limit;

    const conditions = [eq(batches.tenantId, tenantId), isNull(batches.deletedAt)];

    if (search) {
      conditions.push(ilike(batches.name, `%${search}%`));
    }

    if (status) {
      conditions.push(eq(batches.status, status as any));
    }

    if (courseId) {
      conditions.push(eq(batches.courseId, courseId));
    }

    const orderColumn = {
      createdAt: batches.createdAt,
      name: batches.name,
      status: batches.status,
      startDate: batches.startDate,
    }[sortBy];

    const orderFn = sortOrder === "asc" ? asc : desc;

    const [data, countResult] = await Promise.all([
      db.select()
        .from(batches)
        .where(and(...conditions))
        .orderBy(orderFn(orderColumn))
        .limit(limit)
        .offset(offset),
      db.select({ count: sql<number>`count(*)::int` })
        .from(batches)
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

batchesRouter.get("/:id", ...middleware, async (req: Request, res: Response) => {
  try {
    const isolation = createTenantIsolation(req);
    const { id } = req.params;

    const [batch] = await db.select()
      .from(batches)
      .where(and(eq(batches.id, id), eq(batches.tenantId, isolation.getTenantId()), isNull(batches.deletedAt)));

    if (!batch) {
      return res.status(404).json({ message: "Batch not found" });
    }

    res.json(batch);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

batchesRouter.get("/:id/students", ...middleware, async (req: Request, res: Response) => {
  try {
    const isolation = createTenantIsolation(req);
    const { id } = req.params;

    const students = await db.select()
      .from(batchStudents)
      .where(and(eq(batchStudents.batchId, id), eq(batchStudents.tenantId, isolation.getTenantId())));

    res.json(students);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

batchesRouter.post("/", ...middleware, requirePermission("batches:create"), async (req: Request, res: Response) => {
  try {
    const isolation = createTenantIsolation(req);
    const tenantId = isolation.getTenantId();

    const parsed = insertBatchSchema.safeParse({
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

    const [batch] = await db.insert(batches).values(parsed.data).returning();

    await auditService.logAsync({
      tenantId,
      userId: req.context?.user?.id,
      action: "create",
      resource: "batch",
      resourceId: batch.id,
      metadata: { name: batch.name },
    });

    res.status(201).json(batch);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

batchesRouter.post("/:id/students", ...middleware, requirePermission("batches:update"), async (req: Request, res: Response) => {
  try {
    const isolation = createTenantIsolation(req);
    const tenantId = isolation.getTenantId();
    const { id } = req.params;

    const parsed = insertBatchStudentSchema.safeParse({
      ...req.body,
      batchId: id,
      tenantId,
    });

    if (!parsed.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const [enrollment] = await db.insert(batchStudents).values(parsed.data).returning();

    await auditService.logAsync({
      tenantId,
      userId: req.context?.user?.id,
      action: "create",
      resource: "batch_student",
      resourceId: enrollment.id,
      metadata: { batchId: id, studentId: req.body.studentId },
    });

    res.status(201).json(enrollment);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

batchesRouter.patch("/:id", ...middleware, requirePermission("batches:update"), async (req: Request, res: Response) => {
  try {
    const isolation = createTenantIsolation(req);
    const { id } = req.params;

    const [existing] = await db.select()
      .from(batches)
      .where(and(eq(batches.id, id), eq(batches.tenantId, isolation.getTenantId()), isNull(batches.deletedAt)));

    if (!existing) {
      return res.status(404).json({ message: "Batch not found" });
    }

    const updateSchema = insertBatchSchema.partial().omit({ tenantId: true });
    const parsed = updateSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const [updated] = await db.update(batches)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(batches.id, id))
      .returning();

    await auditService.logAsync({
      tenantId: isolation.getTenantId(),
      userId: req.context?.user?.id,
      action: "update",
      resource: "batch",
      resourceId: id,
      metadata: { changes: Object.keys(parsed.data) },
    });

    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

batchesRouter.delete("/:id", ...middleware, requirePermission("batches:delete"), async (req: Request, res: Response) => {
  try {
    const isolation = createTenantIsolation(req);
    const { id } = req.params;

    const [existing] = await db.select()
      .from(batches)
      .where(and(eq(batches.id, id), eq(batches.tenantId, isolation.getTenantId()), isNull(batches.deletedAt)));

    if (!existing) {
      return res.status(404).json({ message: "Batch not found" });
    }

    await db.update(batches).set({ deletedAt: new Date() }).where(eq(batches.id, id));

    await auditService.logAsync({
      tenantId: isolation.getTenantId(),
      userId: req.context?.user?.id,
      action: "delete",
      resource: "batch",
      resourceId: id,
      metadata: { name: existing.name },
    });

    res.status(204).send();
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});
