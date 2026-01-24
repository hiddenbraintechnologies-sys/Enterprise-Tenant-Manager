import { Router, Request, Response } from "express";
import { z } from "zod";
import { db } from "../../db";
import {
  addons,
  addonCountryConfig,
  addonPlanEligibility,
  addonAuditLog,
  addonPricing,
  tenantAddons,
  type InsertAddonCountryConfig,
  type InsertAddonPlanEligibility,
} from "@shared/schema";
import { eq, and, desc, sql, ilike, or, count, inArray } from "drizzle-orm";
import { authenticateJWT } from "../../core/auth-middleware";
import { requireSuperAdminOnly } from "../../rbac/guards";
import { Permissions } from "@shared/rbac/permissions";

const router = Router();

const requiredAuth = authenticateJWT({ required: true });
// All marketplace management routes require super admin (initial phase)
// Permission constants are kept for future Platform Admin support
const requireSuperAdmin = requireSuperAdminOnly();

async function logAuditAction(
  req: Request,
  action: string,
  addonId: string | null,
  addonSlug: string | null,
  countryCode: string | null,
  previousValue: unknown,
  newValue: unknown,
  metadata: Record<string, unknown> = {}
) {
  const user = (req as any).user;
  try {
    await db.insert(addonAuditLog).values({
      actorUserId: user?.id || "unknown",
      actorEmail: user?.email || null,
      actorRole: user?.role || null,
      action: action as any,
      addonId,
      addonSlug,
      countryCode,
      previousValue,
      newValue,
      metadata,
      ipAddress: req.ip || req.headers["x-forwarded-for"]?.toString() || null,
      userAgent: req.headers["user-agent"] || null,
    });
  } catch (error) {
    console.error("[marketplace-management] Failed to log audit action:", error);
  }
}

// ==================== CATALOG APIS ====================

const createAddonSchema = z.object({
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  name: z.string().min(1).max(255),
  shortDescription: z.string().optional(),
  fullDescription: z.string().optional(),
  category: z.enum(["analytics", "automation", "billing", "booking", "communication", "compliance", "crm", "healthcare", "integration", "inventory", "marketing", "payments", "reporting", "scheduling", "security", "utilities"]),
  iconUrl: z.string().optional(),
  bannerUrl: z.string().optional(),
  trialDays: z.number().int().min(0).max(90).optional(),
  features: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
});

const updateAddonSchema = createAddonSchema.partial();

router.get("/addons", requiredAuth, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const { status, category, search, page = "1", limit = "20" } = req.query;
    
    const conditions = [];
    
    if (status && typeof status === "string") {
      conditions.push(eq(addons.status, status as any));
    }
    
    if (category && typeof category === "string") {
      conditions.push(eq(addons.category, category as any));
    }
    
    if (search && typeof search === "string") {
      conditions.push(
        or(
          ilike(addons.name, `%${search}%`),
          ilike(addons.slug, `%${search}%`),
          ilike(addons.shortDescription, `%${search}%`)
        )
      );
    }
    
    const pageNum = Math.max(1, parseInt(page as string, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10)));
    const offset = (pageNum - 1) * limitNum;
    
    const [totalResult] = await db
      .select({ count: count() })
      .from(addons)
      .where(conditions.length > 0 ? and(...conditions) : undefined);
    
    const results = await db
      .select()
      .from(addons)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(addons.createdAt))
      .limit(limitNum)
      .offset(offset);
    
    res.json({
      addons: results,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalResult?.count || 0,
        totalPages: Math.ceil((totalResult?.count || 0) / limitNum),
      },
    });
  } catch (error) {
    console.error("[marketplace-management] Error fetching addons:", error);
    res.status(500).json({ error: "Failed to fetch addons" });
  }
});

router.get("/addons/:addonId", requiredAuth, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const { addonId } = req.params;
    
    const [addon] = await db
      .select()
      .from(addons)
      .where(eq(addons.id, addonId))
      .limit(1);
    
    if (!addon) {
      return res.status(404).json({ error: "Addon not found" });
    }
    
    const countryConfigs = await db
      .select()
      .from(addonCountryConfig)
      .where(eq(addonCountryConfig.addonId, addonId));
    
    const eligibilityRules = await db
      .select()
      .from(addonPlanEligibility)
      .where(eq(addonPlanEligibility.addonId, addonId));
    
    const pricing = await db
      .select()
      .from(addonPricing)
      .where(eq(addonPricing.addonId, addonId));
    
    res.json({
      addon,
      countryConfigs,
      eligibilityRules,
      pricing,
    });
  } catch (error) {
    console.error("[marketplace-management] Error fetching addon:", error);
    res.status(500).json({ error: "Failed to fetch addon" });
  }
});

router.post("/addons", requiredAuth, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const parsed = createAddonSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid request body", details: parsed.error.errors });
    }
    
    const { slug } = parsed.data;
    
    const existing = await db
      .select()
      .from(addons)
      .where(eq(addons.slug, slug))
      .limit(1);
    
    if (existing.length > 0) {
      return res.status(409).json({ error: "An addon with this slug already exists" });
    }
    
    const addonData = {
      slug: parsed.data.slug,
      name: parsed.data.name,
      shortDescription: parsed.data.shortDescription || null,
      fullDescription: parsed.data.fullDescription || null,
      category: parsed.data.category,
      iconUrl: parsed.data.iconUrl || null,
      bannerUrl: parsed.data.bannerUrl || null,
      trialDays: parsed.data.trialDays || 0,
      features: parsed.data.features || [],
      tags: parsed.data.tags || [],
      status: "draft" as const,
    };
    
    const [addon] = await db.insert(addons).values(addonData as any).returning();
    
    await logAuditAction(req, "addon_created", addon.id, addon.slug, null, null, addon);
    
    res.status(201).json(addon);
  } catch (error) {
    console.error("[marketplace-management] Error creating addon:", error);
    res.status(500).json({ error: "Failed to create addon" });
  }
});

router.patch("/addons/:addonId", requiredAuth, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const { addonId } = req.params;
    
    const [existing] = await db
      .select()
      .from(addons)
      .where(eq(addons.id, addonId))
      .limit(1);
    
    if (!existing) {
      return res.status(404).json({ error: "Addon not found" });
    }
    
    const parsed = updateAddonSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid request body", details: parsed.error.errors });
    }
    
    if (parsed.data.slug && parsed.data.slug !== existing.slug) {
      const slugExists = await db
        .select()
        .from(addons)
        .where(eq(addons.slug, parsed.data.slug))
        .limit(1);
      
      if (slugExists.length > 0) {
        return res.status(409).json({ error: "An addon with this slug already exists" });
      }
    }
    
    const updateData: Record<string, unknown> = {};
    if (parsed.data.slug !== undefined) updateData.slug = parsed.data.slug;
    if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
    if (parsed.data.shortDescription !== undefined) updateData.shortDescription = parsed.data.shortDescription;
    if (parsed.data.fullDescription !== undefined) updateData.fullDescription = parsed.data.fullDescription;
    if (parsed.data.category !== undefined) updateData.category = parsed.data.category;
    if (parsed.data.iconUrl !== undefined) updateData.iconUrl = parsed.data.iconUrl;
    if (parsed.data.bannerUrl !== undefined) updateData.bannerUrl = parsed.data.bannerUrl;
    if (parsed.data.trialDays !== undefined) updateData.trialDays = parsed.data.trialDays;
    if (parsed.data.features !== undefined) updateData.features = parsed.data.features;
    if (parsed.data.tags !== undefined) updateData.tags = parsed.data.tags;
    updateData.updatedAt = new Date();
    
    const [updated] = await db
      .update(addons)
      .set(updateData)
      .where(eq(addons.id, addonId))
      .returning();
    
    await logAuditAction(req, "addon_updated", addonId, updated.slug, null, existing, updated);
    
    res.json(updated);
  } catch (error) {
    console.error("[marketplace-management] Error updating addon:", error);
    res.status(500).json({ error: "Failed to update addon" });
  }
});

router.post("/addons/:addonId/publish", requiredAuth, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const { addonId } = req.params;
    
    const [existing] = await db
      .select()
      .from(addons)
      .where(eq(addons.id, addonId))
      .limit(1);
    
    if (!existing) {
      return res.status(404).json({ error: "Addon not found" });
    }
    
    if (existing.status === "published") {
      return res.status(400).json({ error: "Addon is already published" });
    }
    
    const [updated] = await db
      .update(addons)
      .set({
        status: "published",
        publishedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(addons.id, addonId))
      .returning();
    
    await logAuditAction(req, "addon_published", addonId, updated.slug, null, existing, updated);
    
    res.json(updated);
  } catch (error) {
    console.error("[marketplace-management] Error publishing addon:", error);
    res.status(500).json({ error: "Failed to publish addon" });
  }
});

router.post("/addons/:addonId/archive", requiredAuth, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const { addonId } = req.params;
    
    const [existing] = await db
      .select()
      .from(addons)
      .where(eq(addons.id, addonId))
      .limit(1);
    
    if (!existing) {
      return res.status(404).json({ error: "Addon not found" });
    }
    
    if (existing.status === "archived") {
      return res.status(400).json({ error: "Addon is already archived" });
    }
    
    const activeInstalls = await db
      .select({ count: count() })
      .from(tenantAddons)
      .where(and(eq(tenantAddons.addonId, addonId), eq(tenantAddons.status, "active")));
    
    if (activeInstalls[0]?.count > 0) {
      return res.status(400).json({ 
        error: "Cannot archive addon with active installations",
        activeCount: activeInstalls[0].count,
      });
    }
    
    const [updated] = await db
      .update(addons)
      .set({
        status: "archived",
        updatedAt: new Date(),
      })
      .where(eq(addons.id, addonId))
      .returning();
    
    await logAuditAction(req, "addon_archived", addonId, updated.slug, null, existing, updated);
    
    res.json(updated);
  } catch (error) {
    console.error("[marketplace-management] Error archiving addon:", error);
    res.status(500).json({ error: "Failed to archive addon" });
  }
});

router.post("/addons/:addonId/restore", requiredAuth, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const { addonId } = req.params;
    
    const [existing] = await db
      .select()
      .from(addons)
      .where(eq(addons.id, addonId))
      .limit(1);
    
    if (!existing) {
      return res.status(404).json({ error: "Addon not found" });
    }
    
    if (existing.status !== "archived") {
      return res.status(400).json({ error: "Only archived addons can be restored" });
    }
    
    const [updated] = await db
      .update(addons)
      .set({
        status: "draft",
        updatedAt: new Date(),
      })
      .where(eq(addons.id, addonId))
      .returning();
    
    await logAuditAction(req, "addon_restored", addonId, updated.slug, null, existing, updated);
    
    res.json(updated);
  } catch (error) {
    console.error("[marketplace-management] Error restoring addon:", error);
    res.status(500).json({ error: "Failed to restore addon" });
  }
});

// ==================== COUNTRY CONFIG APIS ====================

const countryConfigSchema = z.object({
  isActive: z.boolean().optional(),
  status: z.enum(["active", "coming_soon", "disabled"]).optional(),
  launchDate: z.string().datetime().optional().nullable(),
  currencyCode: z.string().length(3),
  monthlyPrice: z.string().regex(/^\d+(\.\d{1,2})?$/).optional().nullable(),
  yearlyPrice: z.string().regex(/^\d+(\.\d{1,2})?$/).optional().nullable(),
  perEmployeePrice: z.string().regex(/^\d+(\.\d{1,2})?$/).optional().nullable(),
  perUnitPrice: z.string().regex(/^\d+(\.\d{1,2})?$/).optional().nullable(),
  trialDays: z.number().int().min(0).max(90).optional(),
  trialEnabled: z.boolean().optional(),
  complianceNotes: z.string().optional().nullable(),
  disclaimerText: z.string().optional().nullable(),
  termsUrl: z.string().url().optional().nullable(),
  comingSoonMessage: z.string().optional().nullable(),
  featuredOrder: z.number().int().min(0).optional(),
});

// ==================== COUNTRY APIS ====================

const SUPPORTED_COUNTRIES = [
  { countryCode: "IN", countryName: "India", currencyCode: "INR" },
  { countryCode: "MY", countryName: "Malaysia", currencyCode: "MYR" },
  { countryCode: "UK", countryName: "United Kingdom", currencyCode: "GBP" },
  { countryCode: "AE", countryName: "United Arab Emirates", currencyCode: "AED" },
  { countryCode: "SG", countryName: "Singapore", currencyCode: "SGD" },
  { countryCode: "US", countryName: "United States", currencyCode: "USD" },
];

router.get("/countries", requiredAuth, requireSuperAdmin, async (req: Request, res: Response) => {
  res.json({ countries: SUPPORTED_COUNTRIES });
});

router.get("/country-configs", requiredAuth, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const configs = await db
      .select()
      .from(addonCountryConfig)
      .orderBy(addonCountryConfig.addonId, addonCountryConfig.countryCode);
    
    res.json({ configs });
  } catch (error) {
    console.error("[marketplace-management] Error fetching country configs:", error);
    res.status(500).json({ error: "Failed to fetch country configs" });
  }
});

router.get("/addons/:addonId/countries", requiredAuth, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const { addonId } = req.params;
    
    const [addon] = await db
      .select()
      .from(addons)
      .where(eq(addons.id, addonId))
      .limit(1);
    
    if (!addon) {
      return res.status(404).json({ error: "Addon not found" });
    }
    
    const configs = await db
      .select()
      .from(addonCountryConfig)
      .where(eq(addonCountryConfig.addonId, addonId))
      .orderBy(addonCountryConfig.countryCode);
    
    res.json(configs);
  } catch (error) {
    console.error("[marketplace-management] Error fetching country configs:", error);
    res.status(500).json({ error: "Failed to fetch country configs" });
  }
});

router.put("/addons/:addonId/countries/:countryCode", requiredAuth, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const { addonId, countryCode } = req.params;
    
    const [addon] = await db
      .select()
      .from(addons)
      .where(eq(addons.id, addonId))
      .limit(1);
    
    if (!addon) {
      return res.status(404).json({ error: "Addon not found" });
    }
    
    const parsed = countryConfigSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid request body", details: parsed.error.errors });
    }
    
    const user = (req as any).user;
    
    const [existing] = await db
      .select()
      .from(addonCountryConfig)
      .where(and(
        eq(addonCountryConfig.addonId, addonId),
        eq(addonCountryConfig.countryCode, countryCode.toUpperCase())
      ))
      .limit(1);
    
    const configData: Partial<InsertAddonCountryConfig> = {
      isActive: parsed.data.isActive,
      status: parsed.data.status,
      launchDate: parsed.data.launchDate ? new Date(parsed.data.launchDate) : null,
      currencyCode: parsed.data.currencyCode,
      monthlyPrice: parsed.data.monthlyPrice || null,
      yearlyPrice: parsed.data.yearlyPrice || null,
      perEmployeePrice: parsed.data.perEmployeePrice || null,
      perUnitPrice: parsed.data.perUnitPrice || null,
      trialDays: parsed.data.trialDays,
      trialEnabled: parsed.data.trialEnabled,
      complianceNotes: parsed.data.complianceNotes || null,
      disclaimerText: parsed.data.disclaimerText || null,
      termsUrl: parsed.data.termsUrl || null,
      comingSoonMessage: parsed.data.comingSoonMessage || null,
      featuredOrder: parsed.data.featuredOrder,
      updatedBy: user?.id,
    };
    
    let result;
    if (existing) {
      [result] = await db
        .update(addonCountryConfig)
        .set(configData)
        .where(eq(addonCountryConfig.id, existing.id))
        .returning();
      
      const action = parsed.data.isActive !== undefined 
        ? (parsed.data.isActive ? "country_activated" : "country_deactivated")
        : "country_price_updated";
      
      await logAuditAction(req, action, addonId, addon.slug, countryCode.toUpperCase(), existing, result);
    } else {
      [result] = await db
        .insert(addonCountryConfig)
        .values({
          addonId,
          countryCode: countryCode.toUpperCase(),
          ...configData,
        } as InsertAddonCountryConfig)
        .returning();
      
      await logAuditAction(req, "country_activated", addonId, addon.slug, countryCode.toUpperCase(), null, result);
    }
    
    res.json(result);
  } catch (error) {
    console.error("[marketplace-management] Error updating country config:", error);
    res.status(500).json({ error: "Failed to update country config" });
  }
});

router.delete("/addons/:addonId/countries/:countryCode", requiredAuth, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const { addonId, countryCode } = req.params;
    
    const [existing] = await db
      .select()
      .from(addonCountryConfig)
      .where(and(
        eq(addonCountryConfig.addonId, addonId),
        eq(addonCountryConfig.countryCode, countryCode.toUpperCase())
      ))
      .limit(1);
    
    if (!existing) {
      return res.status(404).json({ error: "Country config not found" });
    }
    
    await db
      .delete(addonCountryConfig)
      .where(eq(addonCountryConfig.id, existing.id));
    
    const [addon] = await db
      .select()
      .from(addons)
      .where(eq(addons.id, addonId))
      .limit(1);
    
    await logAuditAction(req, "country_deactivated", addonId, addon?.slug || null, countryCode.toUpperCase(), existing, null);
    
    res.json({ success: true });
  } catch (error) {
    console.error("[marketplace-management] Error deleting country config:", error);
    res.status(500).json({ error: "Failed to delete country config" });
  }
});

// ==================== ELIGIBILITY APIS ====================

const eligibilitySchema = z.object({
  planTier: z.string().min(1).max(50),
  canPurchase: z.boolean(),
  trialEnabled: z.boolean().optional(),
  trialDays: z.number().int().min(0).max(90).optional(),
  requiresBundle: z.boolean().optional(),
  bundleDiscount: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  maxQuantity: z.number().int().min(1).optional().nullable(),
  requiresApproval: z.boolean().optional(),
  internalNotes: z.string().optional().nullable(),
});

const bulkEligibilitySchema = z.object({
  rules: z.array(eligibilitySchema),
});

router.get("/addons/:addonId/eligibility", requiredAuth, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const { addonId } = req.params;
    const { countryCode } = req.query;
    
    const [addon] = await db
      .select()
      .from(addons)
      .where(eq(addons.id, addonId))
      .limit(1);
    
    if (!addon) {
      return res.status(404).json({ error: "Addon not found" });
    }
    
    const conditions = [eq(addonPlanEligibility.addonId, addonId)];
    if (countryCode && typeof countryCode === "string") {
      conditions.push(eq(addonPlanEligibility.countryCode, countryCode.toUpperCase()));
    }
    
    const rules = await db
      .select()
      .from(addonPlanEligibility)
      .where(and(...conditions))
      .orderBy(addonPlanEligibility.countryCode, addonPlanEligibility.planTier);
    
    res.json(rules);
  } catch (error) {
    console.error("[marketplace-management] Error fetching eligibility rules:", error);
    res.status(500).json({ error: "Failed to fetch eligibility rules" });
  }
});

router.put("/addons/:addonId/eligibility/:countryCode", requiredAuth, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const { addonId, countryCode } = req.params;
    
    const [addon] = await db
      .select()
      .from(addons)
      .where(eq(addons.id, addonId))
      .limit(1);
    
    if (!addon) {
      return res.status(404).json({ error: "Addon not found" });
    }
    
    const parsed = bulkEligibilitySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid request body", details: parsed.error.errors });
    }
    
    const existingRules = await db
      .select()
      .from(addonPlanEligibility)
      .where(and(
        eq(addonPlanEligibility.addonId, addonId),
        eq(addonPlanEligibility.countryCode, countryCode.toUpperCase())
      ));
    
    await db
      .delete(addonPlanEligibility)
      .where(and(
        eq(addonPlanEligibility.addonId, addonId),
        eq(addonPlanEligibility.countryCode, countryCode.toUpperCase())
      ));
    
    const newRules: InsertAddonPlanEligibility[] = parsed.data.rules.map((rule) => ({
      addonId,
      countryCode: countryCode.toUpperCase(),
      planTier: rule.planTier,
      canPurchase: rule.canPurchase,
      trialEnabled: rule.trialEnabled ?? true,
      trialDays: rule.trialDays ?? 7,
      requiresBundle: rule.requiresBundle ?? false,
      bundleDiscount: rule.bundleDiscount ?? "0",
      maxQuantity: rule.maxQuantity ?? null,
      requiresApproval: rule.requiresApproval ?? false,
      internalNotes: rule.internalNotes ?? null,
    }));
    
    let insertedRules: any[] = [];
    if (newRules.length > 0) {
      insertedRules = await db
        .insert(addonPlanEligibility)
        .values(newRules)
        .returning();
    }
    
    await logAuditAction(req, "eligibility_updated", addonId, addon.slug, countryCode.toUpperCase(), existingRules, insertedRules);
    
    res.json(insertedRules);
  } catch (error) {
    console.error("[marketplace-management] Error updating eligibility rules:", error);
    res.status(500).json({ error: "Failed to update eligibility rules" });
  }
});

// ==================== AUDIT LOG APIS ====================

router.get("/audit-logs", requiredAuth, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const { 
      addonId, 
      action, 
      countryCode, 
      actorUserId,
      startDate,
      endDate,
      page = "1", 
      limit = "50" 
    } = req.query;
    
    const conditions = [];
    
    if (addonId && typeof addonId === "string") {
      conditions.push(eq(addonAuditLog.addonId, addonId));
    }
    
    if (action && typeof action === "string") {
      conditions.push(eq(addonAuditLog.action, action as any));
    }
    
    if (countryCode && typeof countryCode === "string") {
      conditions.push(eq(addonAuditLog.countryCode, countryCode.toUpperCase()));
    }
    
    if (actorUserId && typeof actorUserId === "string") {
      conditions.push(eq(addonAuditLog.actorUserId, actorUserId));
    }
    
    if (startDate && typeof startDate === "string") {
      conditions.push(sql`${addonAuditLog.createdAt} >= ${new Date(startDate)}`);
    }
    
    if (endDate && typeof endDate === "string") {
      conditions.push(sql`${addonAuditLog.createdAt} <= ${new Date(endDate)}`);
    }
    
    const pageNum = Math.max(1, parseInt(page as string, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10)));
    const offset = (pageNum - 1) * limitNum;
    
    const [totalResult] = await db
      .select({ count: count() })
      .from(addonAuditLog)
      .where(conditions.length > 0 ? and(...conditions) : undefined);
    
    const logs = await db
      .select()
      .from(addonAuditLog)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(addonAuditLog.createdAt))
      .limit(limitNum)
      .offset(offset);
    
    res.json({
      logs,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalResult?.count || 0,
        totalPages: Math.ceil((totalResult?.count || 0) / limitNum),
      },
    });
  } catch (error) {
    console.error("[marketplace-management] Error fetching audit logs:", error);
    res.status(500).json({ error: "Failed to fetch audit logs" });
  }
});

// ==================== SUMMARY APIS ====================

router.get("/summary", requiredAuth, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const [draftCount] = await db
      .select({ count: count() })
      .from(addons)
      .where(eq(addons.status, "draft"));
    
    const [publishedCount] = await db
      .select({ count: count() })
      .from(addons)
      .where(eq(addons.status, "published"));
    
    const [archivedCount] = await db
      .select({ count: count() })
      .from(addons)
      .where(eq(addons.status, "archived"));
    
    const activeCountries = await db
      .selectDistinct({ countryCode: addonCountryConfig.countryCode })
      .from(addonCountryConfig)
      .where(eq(addonCountryConfig.isActive, true));
    
    const [activeInstallsCount] = await db
      .select({ count: count() })
      .from(tenantAddons)
      .where(eq(tenantAddons.status, "active"));
    
    res.json({
      addons: {
        draft: draftCount?.count || 0,
        published: publishedCount?.count || 0,
        archived: archivedCount?.count || 0,
        total: (draftCount?.count || 0) + (publishedCount?.count || 0) + (archivedCount?.count || 0),
      },
      activeCountries: activeCountries.map((c) => c.countryCode),
      activeInstalls: activeInstallsCount?.count || 0,
    });
  } catch (error) {
    console.error("[marketplace-management] Error fetching summary:", error);
    res.status(500).json({ error: "Failed to fetch summary" });
  }
});

export default router;
