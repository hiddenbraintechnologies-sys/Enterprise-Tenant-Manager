import { Router, Request, Response } from "express";
import { z } from "zod";
import { db } from "../../db";
import { 
  payrollAddonTiers, bundleDiscounts, tenantPayrollAddon, countryRolloutPolicy,
  addons, addonVersions, addonPricing, tenantAddons
} from "@shared/schema";
import { eq, and, inArray, count, desc, sql, ilike, or } from "drizzle-orm";
import { authenticateJWT, requirePlatformAdmin } from "../../core/auth-middleware";
import { getScopeContext } from "../../rbac/guards";
import { auditService } from "../../core";

const router = Router();

const requiredAuth = authenticateJWT({ required: true });

function canAdminManageCountry(req: Request, countryCode: string): boolean {
  const scopeContext = getScopeContext(req);
  
  if (!scopeContext) {
    return false;
  }
  
  if (scopeContext.isSuperAdmin || scopeContext.scopeType === "GLOBAL") {
    return true;
  }
  
  return scopeContext.allowedCountryIds?.includes(countryCode) || false;
}

const createTierSchema = z.object({
  tierName: z.string().min(1).max(100),
  minEmployees: z.number().int().min(1),
  maxEmployees: z.number().int().min(1),
  monthlyPrice: z.string().regex(/^\d+(\.\d{1,2})?$/),
  yearlyPrice: z.string().regex(/^\d+(\.\d{1,2})?$/),
  currencyCode: z.string().length(3),
  countryCode: z.string().min(2).max(5),
  razorpayMonthlyPlanId: z.string().optional().nullable(),
  razorpayYearlyPlanId: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

const updateTierSchema = createTierSchema.partial();

const createBundleDiscountSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  planCode: z.string().min(1),
  addonCode: z.string().default("payroll"),
  addonTierId: z.string().uuid().optional().nullable(),
  discountType: z.enum(["fixed", "percentage"]),
  discountAmount: z.string().regex(/^\d+(\.\d{1,2})?$/),
  currencyCode: z.string().length(3),
  countryCode: z.string().min(2).max(5),
  appliesTo: z.enum(["addon", "plan", "total"]).default("addon"),
  isActive: z.boolean().optional(),
});

router.get("/payroll/tiers", requiredAuth, requirePlatformAdmin(), async (req, res) => {
  try {
    const countryCode = req.query.country as string | undefined;
    
    const conditions = [];
    if (countryCode) {
      conditions.push(eq(payrollAddonTiers.countryCode, countryCode.toUpperCase()));
    }

    const scopeContext = getScopeContext(req);
    if (scopeContext && !scopeContext.isSuperAdmin && scopeContext.scopeType !== "GLOBAL") {
      const allowedCountries = scopeContext.allowedCountryIds || [];
      if (allowedCountries.length > 0) {
        conditions.push(inArray(payrollAddonTiers.countryCode, allowedCountries));
      }
    }

    const tiers = await db
      .select()
      .from(payrollAddonTiers)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(payrollAddonTiers.countryCode, payrollAddonTiers.minEmployees);

    res.json(tiers);
  } catch (error) {
    console.error("[admin/addons] Error fetching payroll tiers:", error);
    res.status(500).json({ error: "Failed to fetch payroll tiers" });
  }
});

router.post("/payroll/tiers", requiredAuth, requirePlatformAdmin("SUPER_ADMIN"), async (req, res) => {
  try {
    const parsed = createTierSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid request body", details: parsed.error.errors });
    }

    const { countryCode, tierName, minEmployees, maxEmployees, ...tierData } = parsed.data;

    if (!canAdminManageCountry(req, countryCode)) {
      return res.status(403).json({ error: "You do not have permission to manage add-ons for this country" });
    }

    const existing = await db
      .select()
      .from(payrollAddonTiers)
      .where(
        and(
          eq(payrollAddonTiers.tierName, tierName),
          eq(payrollAddonTiers.countryCode, countryCode)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      return res.status(409).json({ error: "A tier with this name already exists for this country" });
    }

    const overlapping = await db
      .select()
      .from(payrollAddonTiers)
      .where(
        and(
          eq(payrollAddonTiers.countryCode, countryCode),
          sql`${payrollAddonTiers.minEmployees} <= ${maxEmployees}`,
          sql`${payrollAddonTiers.maxEmployees} >= ${minEmployees}`
        )
      )
      .limit(1);

    if (overlapping.length > 0) {
      return res.status(409).json({ 
        error: "Employee range overlaps with existing tier",
        existingTier: overlapping[0].tierName 
      });
    }

    const [tier] = await db.insert(payrollAddonTiers).values({
      addonCode: "payroll",
      tierName,
      minEmployees,
      maxEmployees,
      countryCode: countryCode.toUpperCase(),
      isActive: tierData.isActive ?? true,
      ...tierData,
    }).returning();

    auditService.logFromRequest("create_payroll_tier", req, "payroll_addon_tier");

    res.status(201).json(tier);
  } catch (error) {
    console.error("[admin/addons] Error creating payroll tier:", error);
    res.status(500).json({ error: "Failed to create payroll tier" });
  }
});

router.patch("/payroll/tiers/:tierId", requiredAuth, requirePlatformAdmin("SUPER_ADMIN"), async (req, res) => {
  try {
    const { tierId } = req.params;
    
    const [existing] = await db
      .select()
      .from(payrollAddonTiers)
      .where(eq(payrollAddonTiers.id, tierId))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ error: "Tier not found" });
    }

    if (!canAdminManageCountry(req, existing.countryCode)) {
      return res.status(403).json({ error: "You do not have permission to manage add-ons for this country" });
    }

    const parsed = updateTierSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid request body", details: parsed.error.errors });
    }

    const [updated] = await db
      .update(payrollAddonTiers)
      .set({
        ...parsed.data,
        updatedAt: new Date(),
      })
      .where(eq(payrollAddonTiers.id, tierId))
      .returning();

    auditService.logFromRequest("update_payroll_tier", req, "payroll_addon_tier");

    res.json(updated);
  } catch (error) {
    console.error("[admin/addons] Error updating payroll tier:", error);
    res.status(500).json({ error: "Failed to update payroll tier" });
  }
});

router.delete("/payroll/tiers/:tierId", requiredAuth, requirePlatformAdmin("SUPER_ADMIN"), async (req, res) => {
  try {
    const { tierId } = req.params;
    
    const [existing] = await db
      .select()
      .from(payrollAddonTiers)
      .where(eq(payrollAddonTiers.id, tierId))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ error: "Tier not found" });
    }

    if (!canAdminManageCountry(req, existing.countryCode)) {
      return res.status(403).json({ error: "You do not have permission to manage add-ons for this country" });
    }

    const [activeSubscriptions] = await db
      .select({ count: count() })
      .from(tenantPayrollAddon)
      .where(
        and(
          eq(tenantPayrollAddon.tierId, tierId),
          eq(tenantPayrollAddon.enabled, true)
        )
      );

    if (activeSubscriptions.count > 0) {
      return res.status(409).json({ 
        error: "Cannot delete tier with active subscriptions",
        activeCount: activeSubscriptions.count
      });
    }

    await db.delete(payrollAddonTiers).where(eq(payrollAddonTiers.id, tierId));

    auditService.logFromRequest("delete_payroll_tier", req, "payroll_addon_tier");

    res.json({ success: true, message: "Tier deleted successfully" });
  } catch (error) {
    console.error("[admin/addons] Error deleting payroll tier:", error);
    res.status(500).json({ error: "Failed to delete payroll tier" });
  }
});

router.get("/payroll/subscriptions", requiredAuth, requirePlatformAdmin(), async (req, res) => {
  try {
    const countryCode = req.query.country as string | undefined;
    const status = req.query.status as string | undefined;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const conditions = [];
    
    if (status) {
      conditions.push(eq(tenantPayrollAddon.subscriptionStatus, status));
    }

    const subscriptions = await db
      .select({
        addon: tenantPayrollAddon,
        tier: payrollAddonTiers,
      })
      .from(tenantPayrollAddon)
      .leftJoin(payrollAddonTiers, eq(tenantPayrollAddon.tierId, payrollAddonTiers.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(tenantPayrollAddon.createdAt))
      .limit(limit)
      .offset((page - 1) * limit);

    const [totalResult] = await db
      .select({ count: count() })
      .from(tenantPayrollAddon)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    res.json({
      subscriptions,
      pagination: {
        page,
        limit,
        total: totalResult.count,
        totalPages: Math.ceil(totalResult.count / limit),
      },
    });
  } catch (error) {
    console.error("[admin/addons] Error fetching payroll subscriptions:", error);
    res.status(500).json({ error: "Failed to fetch payroll subscriptions" });
  }
});

router.get("/bundle-discounts", requiredAuth, requirePlatformAdmin(), async (req, res) => {
  try {
    const countryCode = req.query.country as string | undefined;
    
    const conditions = [];
    if (countryCode) {
      conditions.push(eq(bundleDiscounts.countryCode, countryCode.toUpperCase()));
    }

    const discounts = await db
      .select({
        discount: bundleDiscounts,
        tier: payrollAddonTiers,
      })
      .from(bundleDiscounts)
      .leftJoin(payrollAddonTiers, eq(bundleDiscounts.addonTierId, payrollAddonTiers.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(bundleDiscounts.countryCode, bundleDiscounts.planCode);

    res.json(discounts);
  } catch (error) {
    console.error("[admin/addons] Error fetching bundle discounts:", error);
    res.status(500).json({ error: "Failed to fetch bundle discounts" });
  }
});

router.post("/bundle-discounts", requiredAuth, requirePlatformAdmin("SUPER_ADMIN"), async (req, res) => {
  try {
    const parsed = createBundleDiscountSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid request body", details: parsed.error.errors });
    }

    const { countryCode, ...discountData } = parsed.data;

    if (!canAdminManageCountry(req, countryCode)) {
      return res.status(403).json({ error: "You do not have permission to manage discounts for this country" });
    }

    const [discount] = await db.insert(bundleDiscounts).values({
      ...discountData,
      countryCode: countryCode.toUpperCase(),
      isActive: discountData.isActive ?? true,
    }).returning();

    auditService.logFromRequest("create_bundle_discount", req, "bundle_discount");

    res.status(201).json(discount);
  } catch (error) {
    console.error("[admin/addons] Error creating bundle discount:", error);
    res.status(500).json({ error: "Failed to create bundle discount" });
  }
});

router.get("/payroll/stats", requiredAuth, requirePlatformAdmin(), async (req, res) => {
  try {
    const countryCode = req.query.country as string | undefined;

    const tierStats = await db
      .select({
        countryCode: payrollAddonTiers.countryCode,
        tierCount: count(),
      })
      .from(payrollAddonTiers)
      .where(countryCode ? eq(payrollAddonTiers.countryCode, countryCode.toUpperCase()) : undefined)
      .groupBy(payrollAddonTiers.countryCode);

    const subscriptionStats = await db
      .select({
        status: tenantPayrollAddon.subscriptionStatus,
        count: count(),
      })
      .from(tenantPayrollAddon)
      .groupBy(tenantPayrollAddon.subscriptionStatus);

    const revenueByCountry = await db
      .select({
        countryCode: payrollAddonTiers.countryCode,
        activeCount: count(),
      })
      .from(tenantPayrollAddon)
      .leftJoin(payrollAddonTiers, eq(tenantPayrollAddon.tierId, payrollAddonTiers.id))
      .where(eq(tenantPayrollAddon.enabled, true))
      .groupBy(payrollAddonTiers.countryCode);

    res.json({
      tiersByCountry: tierStats,
      subscriptionsByStatus: subscriptionStats,
      activeByCountry: revenueByCountry,
    });
  } catch (error) {
    console.error("[admin/addons] Error fetching payroll stats:", error);
    res.status(500).json({ error: "Failed to fetch payroll stats" });
  }
});

// ============================================
// SUPER ADMIN: MARKETPLACE ADD-ON MANAGEMENT
// ============================================

const createAddonSchema = z.object({
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  name: z.string().min(1).max(255),
  shortDescription: z.string().max(500).optional(),
  fullDescription: z.string().optional(),
  category: z.enum([
    "analytics", "automation", "billing", "booking", "communication",
    "compliance", "crm", "healthcare", "integration", "inventory",
    "marketing", "payments", "reporting", "scheduling", "security", "utilities"
  ]),
  supportedCountries: z.array(z.string()).default([]),
  supportedBusinessTypes: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  featured: z.boolean().default(false),
  featuredOrder: z.number().int().optional(),
  developerName: z.string().max(255).optional(),
  iconUrl: z.string().url().optional().nullable(),
  status: z.enum(["draft", "published", "archived"]).default("draft"),
});

const updateAddonSchema = createAddonSchema.partial();

const createPricingSchema = z.object({
  addonId: z.string().uuid(),
  name: z.string().min(1).max(100),
  pricingType: z.enum(["free", "one_time", "monthly", "yearly", "usage_based"]),
  price: z.string().regex(/^\d+(\.\d{1,2})?$/),
  currency: z.string().length(3),
  billingPeriod: z.string().max(20).optional().nullable(),
  trialDays: z.number().int().min(0).optional().nullable(),
  features: z.array(z.string()).default([]),
  isDefault: z.boolean().default(false),
  isActive: z.boolean().default(true),
  razorpayPlanId: z.string().optional().nullable(),
});

const updatePricingSchema = createPricingSchema.partial().omit({ addonId: true });

// List all add-ons with stats
router.get("/marketplace/addons", requiredAuth, requirePlatformAdmin(), async (req, res) => {
  try {
    const { 
      status, 
      category, 
      search,
      page = "1",
      limit = "20",
    } = req.query;

    const conditions = [];
    
    if (status) {
      conditions.push(eq(addons.status, status as any));
    }
    
    if (category && category !== "all") {
      conditions.push(eq(addons.category, category as any));
    }
    
    if (search) {
      conditions.push(
        or(
          ilike(addons.name, `%${search}%`),
          ilike(addons.slug, `%${search}%`),
          ilike(addons.shortDescription, `%${search}%`)
        )!
      );
    }

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);

    const [{ count: totalCount }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(addons)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    const results = await db
      .select()
      .from(addons)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(addons.featured), addons.featuredOrder, desc(addons.createdAt))
      .limit(limitNum)
      .offset((pageNum - 1) * limitNum);

    // Get pricing and install counts for each addon
    const addonsWithDetails = await Promise.all(
      results.map(async (addon) => {
        const pricing = await db
          .select()
          .from(addonPricing)
          .where(eq(addonPricing.addonId, addon.id));
        
        const [installStats] = await db
          .select({ 
            activeCount: sql<number>`count(*) filter (where status = 'active')::int`,
            totalCount: sql<number>`count(*)::int`
          })
          .from(tenantAddons)
          .where(eq(tenantAddons.addonId, addon.id));

        return {
          ...addon,
          pricing,
          activeInstalls: installStats?.activeCount || 0,
          totalInstalls: installStats?.totalCount || 0,
        };
      })
    );

    res.json({
      addons: addonsWithDetails,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limitNum),
      },
    });
  } catch (error) {
    console.error("[admin/addons] Error fetching addons:", error);
    res.status(500).json({ error: "Failed to fetch add-ons" });
  }
});

// Get single add-on with full details
router.get("/marketplace/addons/:addonId", requiredAuth, requirePlatformAdmin(), async (req, res) => {
  try {
    const { addonId } = req.params;

    const [addon] = await db
      .select()
      .from(addons)
      .where(eq(addons.id, addonId))
      .limit(1);

    if (!addon) {
      return res.status(404).json({ error: "Add-on not found" });
    }

    const pricing = await db
      .select()
      .from(addonPricing)
      .where(eq(addonPricing.addonId, addonId));

    const versions = await db
      .select()
      .from(addonVersions)
      .where(eq(addonVersions.addonId, addonId))
      .orderBy(desc(addonVersions.createdAt));

    const [installStats] = await db
      .select({ 
        activeCount: sql<number>`count(*) filter (where status = 'active')::int`,
        trialCount: sql<number>`count(*) filter (where status = 'trial')::int`,
        totalCount: sql<number>`count(*)::int`
      })
      .from(tenantAddons)
      .where(eq(tenantAddons.addonId, addonId));

    res.json({
      addon,
      pricing,
      versions,
      stats: {
        activeInstalls: installStats?.activeCount || 0,
        trialInstalls: installStats?.trialCount || 0,
        totalInstalls: installStats?.totalCount || 0,
      },
    });
  } catch (error) {
    console.error("[admin/addons] Error fetching addon details:", error);
    res.status(500).json({ error: "Failed to fetch add-on details" });
  }
});

// Create new add-on (Super Admin only)
router.post("/marketplace/addons", requiredAuth, requirePlatformAdmin("SUPER_ADMIN"), async (req, res) => {
  try {
    const parsed = createAddonSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid request body", details: parsed.error.errors });
    }

    // Check for duplicate slug
    const [existing] = await db
      .select()
      .from(addons)
      .where(eq(addons.slug, parsed.data.slug))
      .limit(1);

    if (existing) {
      return res.status(409).json({ error: "An add-on with this slug already exists" });
    }

    const [newAddon] = await db.insert(addons)
      .values({
        ...parsed.data,
        developerName: parsed.data.developerName || "MyBizStream",
        publishedAt: parsed.data.status === "published" ? new Date() : null,
      })
      .returning();

    // Create initial version
    await db.insert(addonVersions).values({
      addonId: newAddon.id,
      version: "1.0.0",
      semverMajor: 1,
      semverMinor: 0,
      semverPatch: 0,
      isStable: true,
      isLatest: true,
      releaseNotes: "Initial release",
      publishedAt: new Date(),
    });

    auditService.logFromRequest("create_addon", req, "addon");

    res.status(201).json(newAddon);
  } catch (error) {
    console.error("[admin/addons] Error creating addon:", error);
    res.status(500).json({ error: "Failed to create add-on" });
  }
});

// Update add-on (Super Admin only)
router.patch("/marketplace/addons/:addonId", requiredAuth, requirePlatformAdmin("SUPER_ADMIN"), async (req, res) => {
  try {
    const { addonId } = req.params;

    const [existing] = await db
      .select()
      .from(addons)
      .where(eq(addons.id, addonId))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ error: "Add-on not found" });
    }

    const parsed = updateAddonSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid request body", details: parsed.error.errors });
    }

    // Check slug uniqueness if changing
    if (parsed.data.slug && parsed.data.slug !== existing.slug) {
      const [slugExists] = await db
        .select()
        .from(addons)
        .where(eq(addons.slug, parsed.data.slug))
        .limit(1);

      if (slugExists) {
        return res.status(409).json({ error: "An add-on with this slug already exists" });
      }
    }

    const updateData: any = {
      ...parsed.data,
      updatedAt: new Date(),
    };

    // Set publishedAt when publishing for the first time
    if (parsed.data.status === "published" && existing.status !== "published") {
      updateData.publishedAt = new Date();
    }

    const [updated] = await db
      .update(addons)
      .set(updateData)
      .where(eq(addons.id, addonId))
      .returning();

    auditService.logFromRequest("update_addon", req, "addon");

    res.json(updated);
  } catch (error) {
    console.error("[admin/addons] Error updating addon:", error);
    res.status(500).json({ error: "Failed to update add-on" });
  }
});

// Archive add-on (Super Admin only)
router.post("/marketplace/addons/:addonId/archive", requiredAuth, requirePlatformAdmin("SUPER_ADMIN"), async (req, res) => {
  try {
    const { addonId } = req.params;

    const [existing] = await db
      .select()
      .from(addons)
      .where(eq(addons.id, addonId))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ error: "Add-on not found" });
    }

    // Check for active installations
    const [activeInstalls] = await db
      .select({ count: count() })
      .from(tenantAddons)
      .where(
        and(
          eq(tenantAddons.addonId, addonId),
          inArray(tenantAddons.status, ["active", "trial"])
        )
      );

    if (activeInstalls.count > 0) {
      return res.status(409).json({ 
        error: "Cannot archive add-on with active installations",
        activeCount: activeInstalls.count
      });
    }

    const [updated] = await db
      .update(addons)
      .set({ status: "archived", updatedAt: new Date() })
      .where(eq(addons.id, addonId))
      .returning();

    auditService.logFromRequest("archive_addon", req, "addon");

    res.json(updated);
  } catch (error) {
    console.error("[admin/addons] Error archiving addon:", error);
    res.status(500).json({ error: "Failed to archive add-on" });
  }
});

// Delete add-on (Super Admin only, only for drafts with no installs)
router.delete("/marketplace/addons/:addonId", requiredAuth, requirePlatformAdmin("SUPER_ADMIN"), async (req, res) => {
  try {
    const { addonId } = req.params;

    const [existing] = await db
      .select()
      .from(addons)
      .where(eq(addons.id, addonId))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ error: "Add-on not found" });
    }

    if (existing.status !== "draft") {
      return res.status(409).json({ error: "Only draft add-ons can be deleted. Use archive for published add-ons." });
    }

    const [installs] = await db
      .select({ count: count() })
      .from(tenantAddons)
      .where(eq(tenantAddons.addonId, addonId));

    if (installs.count > 0) {
      return res.status(409).json({ 
        error: "Cannot delete add-on with installations",
        installCount: installs.count
      });
    }

    // Delete pricing, versions, then addon
    await db.delete(addonPricing).where(eq(addonPricing.addonId, addonId));
    await db.delete(addonVersions).where(eq(addonVersions.addonId, addonId));
    await db.delete(addons).where(eq(addons.id, addonId));

    auditService.logFromRequest("delete_addon", req, "addon");

    res.json({ success: true, message: "Add-on deleted successfully" });
  } catch (error) {
    console.error("[admin/addons] Error deleting addon:", error);
    res.status(500).json({ error: "Failed to delete add-on" });
  }
});

// ============================================
// PRICING MANAGEMENT
// ============================================

// Add pricing tier to add-on
router.post("/marketplace/addons/:addonId/pricing", requiredAuth, requirePlatformAdmin("SUPER_ADMIN"), async (req, res) => {
  try {
    const { addonId } = req.params;

    const [addon] = await db
      .select()
      .from(addons)
      .where(eq(addons.id, addonId))
      .limit(1);

    if (!addon) {
      return res.status(404).json({ error: "Add-on not found" });
    }

    const parsed = createPricingSchema.omit({ addonId: true }).safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid request body", details: parsed.error.errors });
    }

    const [newPricing] = await db.insert(addonPricing)
      .values({
        addonId,
        ...parsed.data,
      })
      .returning();

    auditService.logFromRequest("create_addon_pricing", req, "addon_pricing");

    res.status(201).json(newPricing);
  } catch (error) {
    console.error("[admin/addons] Error creating addon pricing:", error);
    res.status(500).json({ error: "Failed to create pricing tier" });
  }
});

// Update pricing tier
router.patch("/marketplace/pricing/:pricingId", requiredAuth, requirePlatformAdmin("SUPER_ADMIN"), async (req, res) => {
  try {
    const { pricingId } = req.params;

    const [existing] = await db
      .select()
      .from(addonPricing)
      .where(eq(addonPricing.id, pricingId))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ error: "Pricing tier not found" });
    }

    const parsed = updatePricingSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid request body", details: parsed.error.errors });
    }

    const [updated] = await db
      .update(addonPricing)
      .set({
        ...parsed.data,
        updatedAt: new Date(),
      })
      .where(eq(addonPricing.id, pricingId))
      .returning();

    auditService.logFromRequest("update_addon_pricing", req, "addon_pricing");

    res.json(updated);
  } catch (error) {
    console.error("[admin/addons] Error updating addon pricing:", error);
    res.status(500).json({ error: "Failed to update pricing tier" });
  }
});

// Delete pricing tier
router.delete("/marketplace/pricing/:pricingId", requiredAuth, requirePlatformAdmin("SUPER_ADMIN"), async (req, res) => {
  try {
    const { pricingId } = req.params;

    const [existing] = await db
      .select()
      .from(addonPricing)
      .where(eq(addonPricing.id, pricingId))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ error: "Pricing tier not found" });
    }

    // Check for active subscriptions using this pricing
    const [activeSubs] = await db
      .select({ count: count() })
      .from(tenantAddons)
      .where(
        and(
          eq(tenantAddons.pricingId, pricingId),
          inArray(tenantAddons.status, ["active", "trial"])
        )
      );

    if (activeSubs.count > 0) {
      return res.status(409).json({ 
        error: "Cannot delete pricing tier with active subscriptions",
        activeCount: activeSubs.count
      });
    }

    await db.delete(addonPricing).where(eq(addonPricing.id, pricingId));

    auditService.logFromRequest("delete_addon_pricing", req, "addon_pricing");

    res.json({ success: true, message: "Pricing tier deleted successfully" });
  } catch (error) {
    console.error("[admin/addons] Error deleting addon pricing:", error);
    res.status(500).json({ error: "Failed to delete pricing tier" });
  }
});

// ============================================
// MARKETPLACE ANALYTICS
// ============================================

router.get("/marketplace/stats", requiredAuth, requirePlatformAdmin(), async (req, res) => {
  try {
    // Total add-ons by status
    const addonsByStatus = await db
      .select({
        status: addons.status,
        count: sql<number>`count(*)::int`,
      })
      .from(addons)
      .groupBy(addons.status);

    // Add-ons by category
    const addonsByCategory = await db
      .select({
        category: addons.category,
        count: sql<number>`count(*)::int`,
      })
      .from(addons)
      .where(eq(addons.status, "published"))
      .groupBy(addons.category);

    // Installation stats
    const installStats = await db
      .select({
        status: tenantAddons.status,
        count: sql<number>`count(*)::int`,
      })
      .from(tenantAddons)
      .groupBy(tenantAddons.status);

    // Top add-ons by installs
    const topAddons = await db
      .select({
        addonId: tenantAddons.addonId,
        name: addons.name,
        slug: addons.slug,
        installCount: sql<number>`count(*)::int`,
      })
      .from(tenantAddons)
      .leftJoin(addons, eq(tenantAddons.addonId, addons.id))
      .groupBy(tenantAddons.addonId, addons.name, addons.slug)
      .orderBy(desc(sql`count(*)`))
      .limit(10);

    res.json({
      addonsByStatus,
      addonsByCategory,
      installStats,
      topAddons,
    });
  } catch (error) {
    console.error("[admin/addons] Error fetching marketplace stats:", error);
    res.status(500).json({ error: "Failed to fetch marketplace stats" });
  }
});

export default router;
