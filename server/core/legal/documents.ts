import { Router, type Request, type Response } from "express";
import { db } from "../../db";
import { legalDocuments, insertLegalDocumentSchema } from "@shared/schema";
import { eq, and, desc, asc, sql, ilike, or, isNull } from "drizzle-orm";
import { z } from "zod";
import { authenticateJWT, requireMinimumRole } from "../auth-middleware";
import { requirePermission } from "../context";
import { tenantIsolationMiddleware, createTenantIsolation } from "../tenant-isolation";
import { auditService } from "../audit";

export const legalDocumentsRouter = Router();

const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  sortBy: z.enum(["createdAt", "title", "documentType", "confidentialityLevel"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  search: z.string().optional(),
  caseId: z.string().optional(),
  documentType: z.string().optional(),
  confidentialityLevel: z.string().optional(),
  isPrivileged: z.coerce.boolean().optional(),
});

const middleware = [
  authenticateJWT({ required: true }),
  tenantIsolationMiddleware(),
  requireMinimumRole("staff"),
];

legalDocumentsRouter.get("/", ...middleware, async (req: Request, res: Response) => {
  try {
    const tenantId = req.context?.tenant?.id;
    if (!tenantId) {
      return res.status(403).json({ message: "Tenant context required" });
    }

    const query = paginationSchema.parse(req.query);
    const { page, limit, sortBy, sortOrder, search, caseId, documentType, confidentialityLevel, isPrivileged } = query;
    const offset = (page - 1) * limit;

    const conditions = [eq(legalDocuments.tenantId, tenantId), isNull(legalDocuments.deletedAt)];

    if (search) {
      conditions.push(
        or(
          ilike(legalDocuments.title, `%${search}%`),
          ilike(legalDocuments.description, `%${search}%`)
        )!
      );
    }

    if (caseId) {
      conditions.push(eq(legalDocuments.caseId, caseId));
    }

    if (documentType) {
      conditions.push(eq(legalDocuments.documentType, documentType));
    }

    if (confidentialityLevel) {
      conditions.push(eq(legalDocuments.confidentialityLevel, confidentialityLevel as any));
    }

    if (isPrivileged !== undefined) {
      conditions.push(eq(legalDocuments.isPrivileged, isPrivileged));
    }

    const orderColumn = {
      createdAt: legalDocuments.createdAt,
      title: legalDocuments.title,
      documentType: legalDocuments.documentType,
      confidentialityLevel: legalDocuments.confidentialityLevel,
    }[sortBy];

    const orderFn = sortOrder === "asc" ? asc : desc;

    const [data, countResult] = await Promise.all([
      db.select()
        .from(legalDocuments)
        .where(and(...conditions))
        .orderBy(orderFn(orderColumn))
        .limit(limit)
        .offset(offset),
      db.select({ count: sql<number>`count(*)::int` })
        .from(legalDocuments)
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

legalDocumentsRouter.get("/:id", ...middleware, async (req: Request, res: Response) => {
  try {
    const isolation = createTenantIsolation(req);
    const { id } = req.params;
    const { accessReason } = req.query;

    const [document] = await db.select()
      .from(legalDocuments)
      .where(and(eq(legalDocuments.id, id), eq(legalDocuments.tenantId, isolation.getTenantId()), isNull(legalDocuments.deletedAt)));

    if (!document) {
      return res.status(404).json({ message: "Document not found" });
    }

    if (document.isPrivileged || document.confidentialityLevel === "privileged" || document.confidentialityLevel === "highly_restricted") {
      await auditService.logAsync({
        tenantId: isolation.getTenantId(),
        userId: req.context?.user?.id,
        action: "access",
        resource: "legal_document_privileged",
        resourceId: id,
        metadata: { 
          documentTitle: document.title, 
          confidentialityLevel: document.confidentialityLevel,
          isPrivileged: document.isPrivileged,
          accessReason: accessReason || "not_provided",
        },
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });
    }

    res.json(document);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

legalDocumentsRouter.post("/", ...middleware, requirePermission("legal_documents:create"), async (req: Request, res: Response) => {
  try {
    const isolation = createTenantIsolation(req);
    const tenantId = isolation.getTenantId();

    const parsed = insertLegalDocumentSchema.safeParse({
      ...req.body,
      tenantId,
      uploadedBy: req.context?.user?.id,
    });

    if (!parsed.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const [document] = await db.insert(legalDocuments).values(parsed.data).returning();

    await auditService.logAsync({
      tenantId,
      userId: req.context?.user?.id,
      action: "create",
      resource: "legal_document",
      resourceId: document.id,
      metadata: { title: document.title, confidentialityLevel: document.confidentialityLevel },
    });

    res.status(201).json(document);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

legalDocumentsRouter.patch("/:id", ...middleware, requirePermission("legal_documents:update"), async (req: Request, res: Response) => {
  try {
    const isolation = createTenantIsolation(req);
    const { id } = req.params;

    const [existing] = await db.select()
      .from(legalDocuments)
      .where(and(eq(legalDocuments.id, id), eq(legalDocuments.tenantId, isolation.getTenantId()), isNull(legalDocuments.deletedAt)));

    if (!existing) {
      return res.status(404).json({ message: "Document not found" });
    }

    const updateSchema = insertLegalDocumentSchema.partial().omit({ tenantId: true });
    const parsed = updateSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const newVersion = (existing.version || 1) + 1;

    const [updated] = await db.update(legalDocuments)
      .set({ ...parsed.data, version: newVersion, updatedAt: new Date() })
      .where(eq(legalDocuments.id, id))
      .returning();

    await auditService.logAsync({
      tenantId: isolation.getTenantId(),
      userId: req.context?.user?.id,
      action: "update",
      resource: "legal_document",
      resourceId: id,
      metadata: { changes: Object.keys(parsed.data), previousVersion: existing.version, newVersion },
    });

    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

legalDocumentsRouter.patch("/:id/confidentiality", ...middleware, requirePermission("legal_documents:update"), async (req: Request, res: Response) => {
  try {
    const isolation = createTenantIsolation(req);
    const { id } = req.params;
    const { confidentialityLevel, isPrivileged, isAttorneyClientPrivilege, isWorkProduct, accessRestrictions } = req.body;

    const [existing] = await db.select()
      .from(legalDocuments)
      .where(and(eq(legalDocuments.id, id), eq(legalDocuments.tenantId, isolation.getTenantId()), isNull(legalDocuments.deletedAt)));

    if (!existing) {
      return res.status(404).json({ message: "Document not found" });
    }

    const [updated] = await db.update(legalDocuments)
      .set({
        confidentialityLevel,
        isPrivileged,
        isAttorneyClientPrivilege,
        isWorkProduct,
        accessRestrictions,
        updatedAt: new Date(),
      })
      .where(eq(legalDocuments.id, id))
      .returning();

    await auditService.logAsync({
      tenantId: isolation.getTenantId(),
      userId: req.context?.user?.id,
      action: "update",
      resource: "legal_document_confidentiality",
      resourceId: id,
      metadata: { 
        previousConfidentiality: existing.confidentialityLevel, 
        newConfidentiality: confidentialityLevel,
        privilegeChange: { from: existing.isPrivileged, to: isPrivileged },
      },
    });

    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

legalDocumentsRouter.delete("/:id", ...middleware, requirePermission("legal_documents:delete"), async (req: Request, res: Response) => {
  try {
    const isolation = createTenantIsolation(req);
    const { id } = req.params;

    const [existing] = await db.select()
      .from(legalDocuments)
      .where(and(eq(legalDocuments.id, id), eq(legalDocuments.tenantId, isolation.getTenantId()), isNull(legalDocuments.deletedAt)));

    if (!existing) {
      return res.status(404).json({ message: "Document not found" });
    }

    await db.update(legalDocuments).set({ deletedAt: new Date() }).where(eq(legalDocuments.id, id));

    await auditService.logAsync({
      tenantId: isolation.getTenantId(),
      userId: req.context?.user?.id,
      action: "delete",
      resource: "legal_document",
      resourceId: id,
      metadata: { title: existing.title, confidentialityLevel: existing.confidentialityLevel },
    });

    res.status(204).send();
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});
