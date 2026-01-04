import { Router, type Request, type Response } from "express";
import { db } from "../../db";
import { legalClients, insertLegalClientSchema } from "@shared/schema";
import { eq, and, desc, asc, sql, ilike, or, isNull } from "drizzle-orm";
import { z } from "zod";
import { authenticateJWT, requireMinimumRole } from "../auth-middleware";
import { requirePermission } from "../context";
import { tenantIsolationMiddleware, createTenantIsolation } from "../tenant-isolation";
import { auditService } from "../audit";

export const legalClientsRouter = Router();

const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  sortBy: z.enum(["createdAt", "firstName", "lastName", "status", "clientType"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  search: z.string().optional(),
  status: z.string().optional(),
  clientType: z.string().optional(),
});

const middleware = [
  authenticateJWT({ required: true }),
  tenantIsolationMiddleware(),
  requireMinimumRole("staff"),
];

legalClientsRouter.get("/", ...middleware, async (req: Request, res: Response) => {
  try {
    const tenantId = req.context?.tenant?.id;
    if (!tenantId) {
      return res.status(403).json({ message: "Tenant context required" });
    }

    const query = paginationSchema.parse(req.query);
    const { page, limit, sortBy, sortOrder, search, status, clientType } = query;
    const offset = (page - 1) * limit;

    const conditions = [eq(legalClients.tenantId, tenantId), isNull(legalClients.deletedAt)];

    if (search) {
      conditions.push(
        or(
          ilike(legalClients.firstName, `%${search}%`),
          ilike(legalClients.lastName, `%${search}%`),
          ilike(legalClients.email, `%${search}%`),
          ilike(legalClients.phone, `%${search}%`),
          ilike(legalClients.companyName, `%${search}%`)
        )!
      );
    }

    if (status) {
      conditions.push(eq(legalClients.status, status as any));
    }

    if (clientType) {
      conditions.push(eq(legalClients.clientType, clientType as any));
    }

    const orderColumn = {
      createdAt: legalClients.createdAt,
      firstName: legalClients.firstName,
      lastName: legalClients.lastName,
      status: legalClients.status,
      clientType: legalClients.clientType,
    }[sortBy];

    const orderFn = sortOrder === "asc" ? asc : desc;

    const [data, countResult] = await Promise.all([
      db.select()
        .from(legalClients)
        .where(and(...conditions))
        .orderBy(orderFn(orderColumn))
        .limit(limit)
        .offset(offset),
      db.select({ count: sql<number>`count(*)::int` })
        .from(legalClients)
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

legalClientsRouter.get("/:id", ...middleware, async (req: Request, res: Response) => {
  try {
    const isolation = createTenantIsolation(req);
    const { id } = req.params;

    const [client] = await db.select()
      .from(legalClients)
      .where(and(eq(legalClients.id, id), eq(legalClients.tenantId, isolation.getTenantId()), isNull(legalClients.deletedAt)));

    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }

    res.json(client);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

legalClientsRouter.post("/", ...middleware, requirePermission("legal_clients:create"), async (req: Request, res: Response) => {
  try {
    const isolation = createTenantIsolation(req);
    const tenantId = isolation.getTenantId();

    const parsed = insertLegalClientSchema.safeParse({
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

    const [client] = await db.insert(legalClients).values(parsed.data).returning();

    const displayName = client.clientType === "corporate" 
      ? client.companyName 
      : `${client.firstName} ${client.lastName}`;

    await auditService.logAsync({
      tenantId,
      userId: req.context?.user?.id,
      action: "create",
      resource: "legal_client",
      resourceId: client.id,
      metadata: { displayName },
    });

    res.status(201).json(client);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

legalClientsRouter.patch("/:id", ...middleware, requirePermission("legal_clients:update"), async (req: Request, res: Response) => {
  try {
    const isolation = createTenantIsolation(req);
    const { id } = req.params;

    const [existing] = await db.select()
      .from(legalClients)
      .where(and(eq(legalClients.id, id), eq(legalClients.tenantId, isolation.getTenantId()), isNull(legalClients.deletedAt)));

    if (!existing) {
      return res.status(404).json({ message: "Client not found" });
    }

    const updateSchema = insertLegalClientSchema.partial().omit({ tenantId: true });
    const parsed = updateSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const [updated] = await db.update(legalClients)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(legalClients.id, id))
      .returning();

    await auditService.logAsync({
      tenantId: isolation.getTenantId(),
      userId: req.context?.user?.id,
      action: "update",
      resource: "legal_client",
      resourceId: id,
      metadata: { changes: Object.keys(parsed.data) },
    });

    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

legalClientsRouter.patch("/:id/kyc", ...middleware, requirePermission("legal_clients:update"), async (req: Request, res: Response) => {
  try {
    const isolation = createTenantIsolation(req);
    const { id } = req.params;
    const { isKycVerified } = req.body;

    const [existing] = await db.select()
      .from(legalClients)
      .where(and(eq(legalClients.id, id), eq(legalClients.tenantId, isolation.getTenantId()), isNull(legalClients.deletedAt)));

    if (!existing) {
      return res.status(404).json({ message: "Client not found" });
    }

    const [updated] = await db.update(legalClients)
      .set({
        isKycVerified,
        kycVerifiedAt: isKycVerified ? new Date() : null,
        kycVerifiedBy: isKycVerified ? req.context?.user?.id : null,
        updatedAt: new Date(),
      })
      .where(eq(legalClients.id, id))
      .returning();

    await auditService.logAsync({
      tenantId: isolation.getTenantId(),
      userId: req.context?.user?.id,
      action: "update",
      resource: "legal_client",
      resourceId: id,
      metadata: { kycUpdate: { verified: isKycVerified } },
    });

    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

legalClientsRouter.delete("/:id", ...middleware, requirePermission("legal_clients:delete"), async (req: Request, res: Response) => {
  try {
    const isolation = createTenantIsolation(req);
    const { id } = req.params;

    const [existing] = await db.select()
      .from(legalClients)
      .where(and(eq(legalClients.id, id), eq(legalClients.tenantId, isolation.getTenantId()), isNull(legalClients.deletedAt)));

    if (!existing) {
      return res.status(404).json({ message: "Client not found" });
    }

    await db.update(legalClients).set({ deletedAt: new Date() }).where(eq(legalClients.id, id));

    const displayName = existing.clientType === "corporate" 
      ? existing.companyName 
      : `${existing.firstName} ${existing.lastName}`;

    await auditService.logAsync({
      tenantId: isolation.getTenantId(),
      userId: req.context?.user?.id,
      action: "delete",
      resource: "legal_client",
      resourceId: id,
      metadata: { displayName },
    });

    res.status(204).send();
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});
