import { Router, type Request, type Response } from "express";
import { db } from "../../db";
import { agents, insertAgentSchema } from "@shared/schema";
import { eq, and, desc, asc, sql, ilike, or } from "drizzle-orm";
import { z } from "zod";
import { authenticateHybrid, requireMinimumRole } from "../auth-middleware";
import { requirePermission } from "../context";
import { tenantIsolationMiddleware, createTenantIsolation } from "../tenant-isolation";
import { auditService } from "../audit";

export const agentsRouter = Router();

const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  sortBy: z.enum(["createdAt", "name", "status", "totalDeals", "rating"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  search: z.string().optional(),
  status: z.string().optional(),
});

const middleware = [
  authenticateHybrid(),
  tenantIsolationMiddleware(),
  requireMinimumRole("staff"),
];

agentsRouter.get("/", ...middleware, async (req: Request, res: Response) => {
  try {
    const tenantId = req.context?.tenant?.id;
    if (!tenantId) {
      return res.status(403).json({ message: "Tenant context required" });
    }

    const query = paginationSchema.parse(req.query);
    const { page, limit, sortBy, sortOrder, search, status } = query;
    const offset = (page - 1) * limit;

    const conditions = [eq(agents.tenantId, tenantId)];

    if (search) {
      conditions.push(
        or(
          ilike(agents.name, `%${search}%`),
          ilike(agents.email, `%${search}%`),
          ilike(agents.phone, `%${search}%`)
        )!
      );
    }

    if (status) conditions.push(eq(agents.status, status as any));

    const orderColumn = {
      createdAt: agents.createdAt,
      name: agents.name,
      status: agents.status,
      totalDeals: agents.totalDeals,
      rating: agents.rating,
    }[sortBy];

    const orderFn = sortOrder === "asc" ? asc : desc;

    const [data, countResult] = await Promise.all([
      db.select()
        .from(agents)
        .where(and(...conditions))
        .orderBy(orderFn(orderColumn))
        .limit(limit)
        .offset(offset),
      db.select({ count: sql<number>`count(*)::int` })
        .from(agents)
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

agentsRouter.get("/:id", ...middleware, async (req: Request, res: Response) => {
  try {
    const isolation = createTenantIsolation(req);
    const { id } = req.params;

    const [agent] = await db.select()
      .from(agents)
      .where(and(eq(agents.id, id), eq(agents.tenantId, isolation.getTenantId())));

    if (!agent) {
      return res.status(404).json({ message: "Agent not found" });
    }

    res.json(agent);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

agentsRouter.post("/", ...middleware, requirePermission("agents:create"), async (req: Request, res: Response) => {
  try {
    const isolation = createTenantIsolation(req);
    const tenantId = isolation.getTenantId();

    const parsed = insertAgentSchema.safeParse({
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

    const [agent] = await db.insert(agents).values(parsed.data).returning();

    await auditService.logAsync({
      tenantId,
      userId: req.context?.user?.id,
      action: "create",
      resource: "agent",
      resourceId: agent.id,
      metadata: { name: agent.name },
    });

    res.status(201).json(agent);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

agentsRouter.patch("/:id", ...middleware, requirePermission("agents:update"), async (req: Request, res: Response) => {
  try {
    const isolation = createTenantIsolation(req);
    const { id } = req.params;

    const [existing] = await db.select()
      .from(agents)
      .where(and(eq(agents.id, id), eq(agents.tenantId, isolation.getTenantId())));

    if (!existing) {
      return res.status(404).json({ message: "Agent not found" });
    }

    const updateSchema = insertAgentSchema.partial().omit({ tenantId: true });
    const parsed = updateSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const [updated] = await db.update(agents)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(agents.id, id))
      .returning();

    await auditService.logAsync({
      tenantId: isolation.getTenantId(),
      userId: req.context?.user?.id,
      action: "update",
      resource: "agent",
      resourceId: id,
      metadata: { changes: Object.keys(parsed.data) },
    });

    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

agentsRouter.delete("/:id", ...middleware, requirePermission("agents:delete"), async (req: Request, res: Response) => {
  try {
    const isolation = createTenantIsolation(req);
    const { id } = req.params;

    const [existing] = await db.select()
      .from(agents)
      .where(and(eq(agents.id, id), eq(agents.tenantId, isolation.getTenantId())));

    if (!existing) {
      return res.status(404).json({ message: "Agent not found" });
    }

    await db.delete(agents).where(eq(agents.id, id));

    await auditService.logAsync({
      tenantId: isolation.getTenantId(),
      userId: req.context?.user?.id,
      action: "delete",
      resource: "agent",
      resourceId: id,
    });

    res.status(204).send();
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});
