import { Router, type Request, type Response } from "express";
import { db } from "../../db";
import { siteVisits, realEstateLeads, properties, insertSiteVisitSchema } from "@shared/schema";
import { eq, and, desc, asc, sql, gte, lte } from "drizzle-orm";
import { z } from "zod";
import { authenticateJWT, requireMinimumRole } from "../auth-middleware";
import { requirePermission } from "../context";
import { tenantIsolationMiddleware, createTenantIsolation } from "../tenant-isolation";
import { auditService } from "../audit";

export const siteVisitsRouter = Router();

const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  sortBy: z.enum(["createdAt", "scheduledAt", "status"]).default("scheduledAt"),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
  status: z.string().optional(),
  leadId: z.string().optional(),
  propertyId: z.string().optional(),
  agentId: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

const middleware = [
  authenticateJWT({ required: true }),
  tenantIsolationMiddleware(),
  requireMinimumRole("staff"),
];

siteVisitsRouter.get("/", ...middleware, async (req: Request, res: Response) => {
  try {
    const tenantId = req.context?.tenant?.id;
    if (!tenantId) {
      return res.status(403).json({ message: "Tenant context required" });
    }

    const query = paginationSchema.parse(req.query);
    const { page, limit, sortBy, sortOrder, status, leadId, propertyId, agentId, dateFrom, dateTo } = query;
    const offset = (page - 1) * limit;

    const conditions = [eq(siteVisits.tenantId, tenantId)];

    if (status) conditions.push(eq(siteVisits.status, status as any));
    if (leadId) conditions.push(eq(siteVisits.leadId, leadId));
    if (propertyId) conditions.push(eq(siteVisits.propertyId, propertyId));
    if (agentId) conditions.push(eq(siteVisits.agentId, agentId));
    if (dateFrom) conditions.push(gte(siteVisits.scheduledAt, new Date(dateFrom)));
    if (dateTo) conditions.push(lte(siteVisits.scheduledAt, new Date(dateTo)));

    const orderColumn = {
      createdAt: siteVisits.createdAt,
      scheduledAt: siteVisits.scheduledAt,
      status: siteVisits.status,
    }[sortBy];

    const orderFn = sortOrder === "asc" ? asc : desc;

    const [data, countResult] = await Promise.all([
      db.select({
        siteVisit: siteVisits,
        lead: realEstateLeads,
        property: properties,
      })
        .from(siteVisits)
        .leftJoin(realEstateLeads, eq(siteVisits.leadId, realEstateLeads.id))
        .leftJoin(properties, eq(siteVisits.propertyId, properties.id))
        .where(and(...conditions))
        .orderBy(orderFn(orderColumn))
        .limit(limit)
        .offset(offset),
      db.select({ count: sql<number>`count(*)::int` })
        .from(siteVisits)
        .where(and(...conditions)),
    ]);

    const total = countResult[0]?.count || 0;

    res.json({
      data: data.map(d => ({ ...d.siteVisit, lead: d.lead, property: d.property })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

siteVisitsRouter.get("/:id", ...middleware, async (req: Request, res: Response) => {
  try {
    const isolation = createTenantIsolation(req);
    const { id } = req.params;

    const [result] = await db.select({
      siteVisit: siteVisits,
      lead: realEstateLeads,
      property: properties,
    })
      .from(siteVisits)
      .leftJoin(realEstateLeads, eq(siteVisits.leadId, realEstateLeads.id))
      .leftJoin(properties, eq(siteVisits.propertyId, properties.id))
      .where(and(eq(siteVisits.id, id), eq(siteVisits.tenantId, isolation.getTenantId())));

    if (!result) {
      return res.status(404).json({ message: "Site visit not found" });
    }

    res.json({ ...result.siteVisit, lead: result.lead, property: result.property });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

siteVisitsRouter.post("/", ...middleware, requirePermission("site_visits:create"), async (req: Request, res: Response) => {
  try {
    const isolation = createTenantIsolation(req);
    const tenantId = isolation.getTenantId();

    const [lead] = await db.select()
      .from(realEstateLeads)
      .where(and(eq(realEstateLeads.id, req.body.leadId), eq(realEstateLeads.tenantId, tenantId)));

    if (!lead) {
      return res.status(400).json({ message: "Lead not found" });
    }

    const [property] = await db.select()
      .from(properties)
      .where(and(eq(properties.id, req.body.propertyId), eq(properties.tenantId, tenantId)));

    if (!property) {
      return res.status(400).json({ message: "Property not found" });
    }

    const parsed = insertSiteVisitSchema.safeParse({
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

    const [visit] = await db.insert(siteVisits).values(parsed.data).returning();

    await auditService.logAsync({
      tenantId,
      userId: req.context?.user?.id,
      action: "create",
      resource: "site_visit",
      resourceId: visit.id,
      metadata: { leadId: visit.leadId, propertyId: visit.propertyId },
    });

    res.status(201).json(visit);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

siteVisitsRouter.patch("/:id", ...middleware, requirePermission("site_visits:update"), async (req: Request, res: Response) => {
  try {
    const isolation = createTenantIsolation(req);
    const { id } = req.params;

    const [existing] = await db.select()
      .from(siteVisits)
      .where(and(eq(siteVisits.id, id), eq(siteVisits.tenantId, isolation.getTenantId())));

    if (!existing) {
      return res.status(404).json({ message: "Site visit not found" });
    }

    const updateSchema = insertSiteVisitSchema.partial().omit({ tenantId: true });
    const parsed = updateSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const [updated] = await db.update(siteVisits)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(siteVisits.id, id))
      .returning();

    await auditService.logAsync({
      tenantId: isolation.getTenantId(),
      userId: req.context?.user?.id,
      action: "update",
      resource: "site_visit",
      resourceId: id,
      metadata: { changes: Object.keys(parsed.data) },
    });

    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

siteVisitsRouter.delete("/:id", ...middleware, requirePermission("site_visits:delete"), async (req: Request, res: Response) => {
  try {
    const isolation = createTenantIsolation(req);
    const { id } = req.params;

    const [existing] = await db.select()
      .from(siteVisits)
      .where(and(eq(siteVisits.id, id), eq(siteVisits.tenantId, isolation.getTenantId())));

    if (!existing) {
      return res.status(404).json({ message: "Site visit not found" });
    }

    await db.delete(siteVisits).where(eq(siteVisits.id, id));

    await auditService.logAsync({
      tenantId: isolation.getTenantId(),
      userId: req.context?.user?.id,
      action: "delete",
      resource: "site_visit",
      resourceId: id,
    });

    res.status(204).send();
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});
