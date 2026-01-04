import { Router, type Request, type Response } from "express";
import { db } from "../../db";
import { cases, caseActivityLog, insertCaseSchema, insertCaseActivityLogSchema } from "@shared/schema";
import { eq, and, desc, asc, sql, ilike, or, isNull } from "drizzle-orm";
import { z } from "zod";
import { authenticateJWT, requireMinimumRole } from "../auth-middleware";
import { requirePermission } from "../context";
import { tenantIsolationMiddleware, createTenantIsolation } from "../tenant-isolation";
import { auditService } from "../audit";

export const casesRouter = Router();

const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  sortBy: z.enum(["createdAt", "caseNumber", "status", "openDate", "priority"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  search: z.string().optional(),
  status: z.string().optional(),
  caseType: z.string().optional(),
  clientId: z.string().optional(),
  priority: z.string().optional(),
});

const middleware = [
  authenticateJWT({ required: true }),
  tenantIsolationMiddleware(),
  requireMinimumRole("staff"),
];

casesRouter.get("/", ...middleware, async (req: Request, res: Response) => {
  try {
    const tenantId = req.context?.tenant?.id;
    if (!tenantId) {
      return res.status(403).json({ message: "Tenant context required" });
    }

    const query = paginationSchema.parse(req.query);
    const { page, limit, sortBy, sortOrder, search, status, caseType, clientId, priority } = query;
    const offset = (page - 1) * limit;

    const conditions = [eq(cases.tenantId, tenantId), isNull(cases.deletedAt)];

    if (search) {
      conditions.push(
        or(
          ilike(cases.caseNumber, `%${search}%`),
          ilike(cases.title, `%${search}%`),
          ilike(cases.description, `%${search}%`)
        )!
      );
    }

    if (status) {
      conditions.push(eq(cases.status, status as any));
    }

    if (caseType) {
      conditions.push(eq(cases.caseType, caseType));
    }

    if (clientId) {
      conditions.push(eq(cases.clientId, clientId));
    }

    if (priority) {
      conditions.push(eq(cases.priority, priority as any));
    }

    const orderColumn = {
      createdAt: cases.createdAt,
      caseNumber: cases.caseNumber,
      status: cases.status,
      openDate: cases.openDate,
      priority: cases.priority,
    }[sortBy];

    const orderFn = sortOrder === "asc" ? asc : desc;

    const [data, countResult] = await Promise.all([
      db.select()
        .from(cases)
        .where(and(...conditions))
        .orderBy(orderFn(orderColumn))
        .limit(limit)
        .offset(offset),
      db.select({ count: sql<number>`count(*)::int` })
        .from(cases)
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

casesRouter.get("/:id", ...middleware, async (req: Request, res: Response) => {
  try {
    const isolation = createTenantIsolation(req);
    const { id } = req.params;

    const [caseRecord] = await db.select()
      .from(cases)
      .where(and(eq(cases.id, id), eq(cases.tenantId, isolation.getTenantId()), isNull(cases.deletedAt)));

    if (!caseRecord) {
      return res.status(404).json({ message: "Case not found" });
    }

    await logCaseActivity(isolation.getTenantId(), id, req.context?.user?.id, "access", "Case viewed", req);

    res.json(caseRecord);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

casesRouter.get("/:id/activity", ...middleware, async (req: Request, res: Response) => {
  try {
    const isolation = createTenantIsolation(req);
    const { id } = req.params;

    const activities = await db.select()
      .from(caseActivityLog)
      .where(and(eq(caseActivityLog.caseId, id), eq(caseActivityLog.tenantId, isolation.getTenantId())))
      .orderBy(desc(caseActivityLog.createdAt))
      .limit(100);

    res.json(activities);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

casesRouter.post("/", ...middleware, requirePermission("cases:create"), async (req: Request, res: Response) => {
  try {
    const isolation = createTenantIsolation(req);
    const tenantId = isolation.getTenantId();

    const parsed = insertCaseSchema.safeParse({
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

    const [caseRecord] = await db.insert(cases).values(parsed.data).returning();

    await logCaseActivity(tenantId, caseRecord.id, req.context?.user?.id, "create", "Case created", req, null, parsed.data);

    await auditService.logAsync({
      tenantId,
      userId: req.context?.user?.id,
      action: "create",
      resource: "case",
      resourceId: caseRecord.id,
      metadata: { caseNumber: caseRecord.caseNumber },
    });

    res.status(201).json(caseRecord);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

casesRouter.patch("/:id", ...middleware, requirePermission("cases:update"), async (req: Request, res: Response) => {
  try {
    const isolation = createTenantIsolation(req);
    const { id } = req.params;

    const [existing] = await db.select()
      .from(cases)
      .where(and(eq(cases.id, id), eq(cases.tenantId, isolation.getTenantId()), isNull(cases.deletedAt)));

    if (!existing) {
      return res.status(404).json({ message: "Case not found" });
    }

    const updateSchema = insertCaseSchema.partial().omit({ tenantId: true });
    const parsed = updateSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const [updated] = await db.update(cases)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(cases.id, id))
      .returning();

    await logCaseActivity(isolation.getTenantId(), id, req.context?.user?.id, "update", `Case updated: ${Object.keys(parsed.data).join(", ")}`, req, existing, updated);

    await auditService.logAsync({
      tenantId: isolation.getTenantId(),
      userId: req.context?.user?.id,
      action: "update",
      resource: "case",
      resourceId: id,
      metadata: { changes: Object.keys(parsed.data) },
    });

    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

casesRouter.delete("/:id", ...middleware, requirePermission("cases:delete"), async (req: Request, res: Response) => {
  try {
    const isolation = createTenantIsolation(req);
    const { id } = req.params;

    const [existing] = await db.select()
      .from(cases)
      .where(and(eq(cases.id, id), eq(cases.tenantId, isolation.getTenantId()), isNull(cases.deletedAt)));

    if (!existing) {
      return res.status(404).json({ message: "Case not found" });
    }

    await db.update(cases).set({ deletedAt: new Date() }).where(eq(cases.id, id));

    await logCaseActivity(isolation.getTenantId(), id, req.context?.user?.id, "delete", "Case archived", req, existing, null);

    await auditService.logAsync({
      tenantId: isolation.getTenantId(),
      userId: req.context?.user?.id,
      action: "delete",
      resource: "case",
      resourceId: id,
      metadata: { caseNumber: existing.caseNumber },
    });

    res.status(204).send();
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

async function logCaseActivity(
  tenantId: string,
  caseId: string,
  userId: string | undefined,
  action: string,
  description: string,
  req: Request,
  previousValue?: any,
  newValue?: any
) {
  try {
    await db.insert(caseActivityLog).values({
      tenantId,
      caseId,
      userId,
      action,
      description,
      previousValue: previousValue ? JSON.stringify(previousValue) : null,
      newValue: newValue ? JSON.stringify(newValue) : null,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });
  } catch (error) {
    console.error("Failed to log case activity:", error);
  }
}
