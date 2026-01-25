import { Router, type Request, type Response } from "express";
import { db } from "../../db";
import { realEstateLeads, insertRealEstateLeadSchema } from "@shared/schema";
import { eq, and, desc, asc, sql, ilike, or, gte, lte } from "drizzle-orm";
import { z } from "zod";
import { authenticateHybrid, requireMinimumRole } from "../auth-middleware";
import { requirePermission } from "../context";
import { tenantIsolationMiddleware, createTenantIsolation } from "../tenant-isolation";
import { auditService } from "../audit";

export const leadsRouter = Router();

const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  sortBy: z.enum(["createdAt", "name", "status", "source", "nextFollowUpAt"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  search: z.string().optional(),
  status: z.string().optional(),
  source: z.string().optional(),
  assignedAgentId: z.string().optional(),
});

const middleware = [
  authenticateHybrid(),
  tenantIsolationMiddleware(),
  requireMinimumRole("staff"),
];

leadsRouter.get("/", ...middleware, async (req: Request, res: Response) => {
  try {
    const tenantId = req.context?.tenant?.id;
    if (!tenantId) {
      return res.status(403).json({ message: "Tenant context required" });
    }

    const query = paginationSchema.parse(req.query);
    const { page, limit, sortBy, sortOrder, search, status, source, assignedAgentId } = query;
    const offset = (page - 1) * limit;

    const conditions = [eq(realEstateLeads.tenantId, tenantId)];

    if (search) {
      conditions.push(
        or(
          ilike(realEstateLeads.name, `%${search}%`),
          ilike(realEstateLeads.email, `%${search}%`),
          ilike(realEstateLeads.phone, `%${search}%`)
        )!
      );
    }

    if (status) conditions.push(eq(realEstateLeads.status, status as any));
    if (source) conditions.push(eq(realEstateLeads.source, source as any));
    if (assignedAgentId) conditions.push(eq(realEstateLeads.assignedAgentId, assignedAgentId));

    const orderColumn = {
      createdAt: realEstateLeads.createdAt,
      name: realEstateLeads.name,
      status: realEstateLeads.status,
      source: realEstateLeads.source,
      nextFollowUpAt: realEstateLeads.nextFollowUpAt,
    }[sortBy];

    const orderFn = sortOrder === "asc" ? asc : desc;

    const [data, countResult] = await Promise.all([
      db.select()
        .from(realEstateLeads)
        .where(and(...conditions))
        .orderBy(orderFn(orderColumn))
        .limit(limit)
        .offset(offset),
      db.select({ count: sql<number>`count(*)::int` })
        .from(realEstateLeads)
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

leadsRouter.get("/:id", ...middleware, async (req: Request, res: Response) => {
  try {
    const isolation = createTenantIsolation(req);
    const { id } = req.params;

    const [lead] = await db.select()
      .from(realEstateLeads)
      .where(and(eq(realEstateLeads.id, id), eq(realEstateLeads.tenantId, isolation.getTenantId())));

    if (!lead) {
      return res.status(404).json({ message: "Lead not found" });
    }

    res.json(lead);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

leadsRouter.post("/", ...middleware, requirePermission("leads:create"), async (req: Request, res: Response) => {
  try {
    const isolation = createTenantIsolation(req);
    const tenantId = isolation.getTenantId();

    const parsed = insertRealEstateLeadSchema.safeParse({
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

    const [lead] = await db.insert(realEstateLeads).values(parsed.data).returning();

    await auditService.logAsync({
      tenantId,
      userId: req.context?.user?.id,
      action: "create",
      resource: "real_estate_lead",
      resourceId: lead.id,
      metadata: { name: lead.name, source: lead.source },
    });

    res.status(201).json(lead);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

leadsRouter.patch("/:id", ...middleware, requirePermission("leads:update"), async (req: Request, res: Response) => {
  try {
    const isolation = createTenantIsolation(req);
    const { id } = req.params;

    const [existing] = await db.select()
      .from(realEstateLeads)
      .where(and(eq(realEstateLeads.id, id), eq(realEstateLeads.tenantId, isolation.getTenantId())));

    if (!existing) {
      return res.status(404).json({ message: "Lead not found" });
    }

    const updateSchema = insertRealEstateLeadSchema.partial().omit({ tenantId: true });
    const parsed = updateSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const [updated] = await db.update(realEstateLeads)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(realEstateLeads.id, id))
      .returning();

    await auditService.logAsync({
      tenantId: isolation.getTenantId(),
      userId: req.context?.user?.id,
      action: "update",
      resource: "real_estate_lead",
      resourceId: id,
      metadata: { changes: Object.keys(parsed.data) },
    });

    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

leadsRouter.delete("/:id", ...middleware, requirePermission("leads:delete"), async (req: Request, res: Response) => {
  try {
    const isolation = createTenantIsolation(req);
    const { id } = req.params;

    const [existing] = await db.select()
      .from(realEstateLeads)
      .where(and(eq(realEstateLeads.id, id), eq(realEstateLeads.tenantId, isolation.getTenantId())));

    if (!existing) {
      return res.status(404).json({ message: "Lead not found" });
    }

    await db.delete(realEstateLeads).where(eq(realEstateLeads.id, id));

    await auditService.logAsync({
      tenantId: isolation.getTenantId(),
      userId: req.context?.user?.id,
      action: "delete",
      resource: "real_estate_lead",
      resourceId: id,
    });

    res.status(204).send();
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});
