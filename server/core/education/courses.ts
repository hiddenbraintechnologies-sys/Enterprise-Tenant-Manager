import { Router, type Request, type Response } from "express";
import { db } from "../../db";
import { courses, insertCourseSchema } from "@shared/schema";
import { eq, and, desc, asc, sql, ilike, or, isNull } from "drizzle-orm";
import { z } from "zod";
import { authenticateJWT, requireMinimumRole } from "../auth-middleware";
import { requirePermission } from "../context";
import { tenantIsolationMiddleware, createTenantIsolation } from "../tenant-isolation";
import { auditService } from "../audit";

export const coursesRouter = Router();

const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  sortBy: z.enum(["createdAt", "name", "status", "startDate"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  search: z.string().optional(),
  status: z.string().optional(),
  category: z.string().optional(),
});

const middleware = [
  authenticateJWT({ required: true }),
  tenantIsolationMiddleware(),
  requireMinimumRole("staff"),
];

coursesRouter.get("/", ...middleware, async (req: Request, res: Response) => {
  try {
    const tenantId = req.context?.tenant?.id;
    if (!tenantId) {
      return res.status(403).json({ message: "Tenant context required" });
    }

    const query = paginationSchema.parse(req.query);
    const { page, limit, sortBy, sortOrder, search, status, category } = query;
    const offset = (page - 1) * limit;

    const conditions = [eq(courses.tenantId, tenantId), isNull(courses.deletedAt)];

    if (search) {
      conditions.push(
        or(
          ilike(courses.name, `%${search}%`),
          ilike(courses.code, `%${search}%`),
          ilike(courses.description, `%${search}%`)
        )!
      );
    }

    if (status) {
      conditions.push(eq(courses.status, status as any));
    }

    if (category) {
      conditions.push(eq(courses.category, category));
    }

    const orderColumn = {
      createdAt: courses.createdAt,
      name: courses.name,
      status: courses.status,
      startDate: courses.createdAt, // Courses don't have startDate; use createdAt as fallback
    }[sortBy];

    const orderFn = sortOrder === "asc" ? asc : desc;

    const [data, countResult] = await Promise.all([
      db.select()
        .from(courses)
        .where(and(...conditions))
        .orderBy(orderFn(orderColumn))
        .limit(limit)
        .offset(offset),
      db.select({ count: sql<number>`count(*)::int` })
        .from(courses)
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

coursesRouter.get("/:id", ...middleware, async (req: Request, res: Response) => {
  try {
    const isolation = createTenantIsolation(req);
    const { id } = req.params;

    const [course] = await db.select()
      .from(courses)
      .where(and(eq(courses.id, id), eq(courses.tenantId, isolation.getTenantId()), isNull(courses.deletedAt)));

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    res.json(course);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

coursesRouter.post("/", ...middleware, requirePermission("courses:create"), async (req: Request, res: Response) => {
  try {
    const isolation = createTenantIsolation(req);
    const tenantId = isolation.getTenantId();

    const parsed = insertCourseSchema.safeParse({
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

    const [course] = await db.insert(courses).values(parsed.data).returning();

    await auditService.logAsync({
      tenantId,
      userId: req.context?.user?.id,
      action: "create",
      resource: "course",
      resourceId: course.id,
      metadata: { name: course.name },
    });

    res.status(201).json(course);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

coursesRouter.patch("/:id", ...middleware, requirePermission("courses:update"), async (req: Request, res: Response) => {
  try {
    const isolation = createTenantIsolation(req);
    const { id } = req.params;

    const [existing] = await db.select()
      .from(courses)
      .where(and(eq(courses.id, id), eq(courses.tenantId, isolation.getTenantId()), isNull(courses.deletedAt)));

    if (!existing) {
      return res.status(404).json({ message: "Course not found" });
    }

    const updateSchema = insertCourseSchema.partial().omit({ tenantId: true });
    const parsed = updateSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const [updated] = await db.update(courses)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(courses.id, id))
      .returning();

    await auditService.logAsync({
      tenantId: isolation.getTenantId(),
      userId: req.context?.user?.id,
      action: "update",
      resource: "course",
      resourceId: id,
      metadata: { changes: Object.keys(parsed.data) },
    });

    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

coursesRouter.delete("/:id", ...middleware, requirePermission("courses:delete"), async (req: Request, res: Response) => {
  try {
    const isolation = createTenantIsolation(req);
    const { id } = req.params;

    const [existing] = await db.select()
      .from(courses)
      .where(and(eq(courses.id, id), eq(courses.tenantId, isolation.getTenantId()), isNull(courses.deletedAt)));

    if (!existing) {
      return res.status(404).json({ message: "Course not found" });
    }

    await db.update(courses).set({ deletedAt: new Date() }).where(eq(courses.id, id));

    await auditService.logAsync({
      tenantId: isolation.getTenantId(),
      userId: req.context?.user?.id,
      action: "delete",
      resource: "course",
      resourceId: id,
      metadata: { name: existing.name },
    });

    res.status(204).send();
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});
