import { Router, Request, Response } from "express";
import { db } from "../db";
import { 
  addons, 
  addonVersions, 
  addonPricing, 
  tenantAddons, 
  addonInstallHistory,
  addonReviews,
  insertAddonSchema,
  insertAddonVersionSchema,
  insertTenantAddonSchema,
  insertAddonReviewSchema,
} from "@shared/schema";
import { eq, and, desc, sql, ilike, or } from "drizzle-orm";
import { requireAuth, requireTenant } from "../core/context";
import { requireRole } from "../core/auth-middleware";
import { addonLifecycle } from "../services/addon-lifecycle";

// Helper to enforce tenantId matches context
function enforceTenantContext(req: Request, res: Response, next: Function) {
  const { tenantId } = req.params;
  const contextTenantId = (req as any).context?.tenant?.id;
  if (!contextTenantId || contextTenantId !== tenantId) {
    return res.status(403).json({ error: "Cross-tenant access denied", code: "TENANT_MISMATCH" });
  }
  next();
}

const router = Router();

// ============================================
// PUBLIC: MARKETPLACE BROWSING
// ============================================

// List published add-ons with filtering (including country-based filtering at SQL level)
router.get("/marketplace", async (req: Request, res: Response) => {
  try {
    const { 
      category, 
      search, 
      featured,
      businessType,
      country, // Filter by tenant's country - shows add-ons available in this country
      currency, // Filter pricing by currency for display
      sortBy = "installCount",
      limit = 20,
      offset = 0,
    } = req.query;

    const conditions = [eq(addons.status, "published")];
    
    if (category && category !== "all") {
      conditions.push(eq(addons.category, category as any));
    }
    
    if (search) {
      conditions.push(
        or(
          ilike(addons.name, `%${search}%`),
          ilike(addons.shortDescription, `%${search}%`)
        )!
      );
    }
    
    if (featured === "true") {
      conditions.push(eq(addons.featured, true));
    }

    // Country filtering at SQL level: show add-ons where:
    // 1. supportedCountries is null/empty (global add-ons) OR
    // 2. supportedCountries contains the requested country
    if (country) {
      conditions.push(
        or(
          sql`${addons.supportedCountries} IS NULL`,
          sql`${addons.supportedCountries} = '[]'::jsonb`,
          sql`${addons.supportedCountries} @> ${JSON.stringify([country])}::jsonb`
        )!
      );
    }

    // Business type filtering at SQL level: show add-ons where:
    // 1. supportedBusinessTypes is null/empty (all business types) OR
    // 2. supportedBusinessTypes contains the requested business type
    if (businessType) {
      conditions.push(
        or(
          sql`${addons.supportedBusinessTypes} IS NULL`,
          sql`${addons.supportedBusinessTypes} = '[]'::jsonb`,
          sql`${addons.supportedBusinessTypes} @> ${JSON.stringify([businessType])}::jsonb`
        )!
      );
    }

    // Get total count for pagination (before limit/offset)
    const [{ count: totalCount }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(addons)
      .where(and(...conditions));

    // Get paginated results
    const results = await db
      .select()
      .from(addons)
      .where(and(...conditions))
      .orderBy(
        sortBy === "rating" ? desc(addons.averageRating) :
        sortBy === "newest" ? desc(addons.publishedAt) :
        sortBy === "featured" ? desc(addons.featuredOrder) :
        desc(addons.installCount)
      )
      .limit(Number(limit))
      .offset(Number(offset));

    // Get pricing for each addon, filtered by currency if specified
    const addonsWithPricing = await Promise.all(
      results.map(async (addon) => {
        const allPricing = await db
          .select()
          .from(addonPricing)
          .where(and(eq(addonPricing.addonId, addon.id), eq(addonPricing.isActive, true)));
        
        // If currency specified, prioritize that currency's pricing
        let displayPricing = allPricing;
        if (currency) {
          const currencyPricing = allPricing.filter(p => p.currency === currency);
          if (currencyPricing.length > 0) {
            displayPricing = currencyPricing;
          }
        }
        
        const latestVersion = await db
          .select()
          .from(addonVersions)
          .where(and(eq(addonVersions.addonId, addon.id), eq(addonVersions.isLatest, true)))
          .limit(1);

        // Determine if addon is global (available in all countries)
        const supportedCountries = addon.supportedCountries as string[] | null;
        const isGlobal = !supportedCountries || supportedCountries.length === 0;

        return {
          ...addon,
          pricing: displayPricing,
          allPricing, // Include all pricing for reference
          latestVersion: latestVersion[0] || null,
          isGlobal,
        };
      })
    );

    res.json({ 
      addons: addonsWithPricing, 
      total: totalCount,
      page: Math.floor(Number(offset) / Number(limit)) + 1,
      pageSize: Number(limit),
      hasMore: Number(offset) + results.length < totalCount,
    });
  } catch (error) {
    console.error("Error fetching marketplace:", error);
    res.status(500).json({ error: "Failed to fetch marketplace" });
  }
});

// Get single add-on details
router.get("/marketplace/:slug", async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;

    const [addon] = await db
      .select()
      .from(addons)
      .where(and(eq(addons.slug, slug), eq(addons.status, "published")))
      .limit(1);

    if (!addon) {
      return res.status(404).json({ error: "Add-on not found" });
    }

    // Get all versions
    const versions = await db
      .select()
      .from(addonVersions)
      .where(eq(addonVersions.addonId, addon.id))
      .orderBy(desc(addonVersions.semverMajor), desc(addonVersions.semverMinor), desc(addonVersions.semverPatch));

    // Get pricing
    const pricing = await db
      .select()
      .from(addonPricing)
      .where(and(eq(addonPricing.addonId, addon.id), eq(addonPricing.isActive, true)));

    // Get reviews
    const reviews = await db
      .select()
      .from(addonReviews)
      .where(and(eq(addonReviews.addonId, addon.id), eq(addonReviews.isApproved, true)))
      .orderBy(desc(addonReviews.createdAt))
      .limit(10);

    res.json({
      addon,
      versions,
      pricing,
      reviews,
    });
  } catch (error) {
    console.error("Error fetching add-on:", error);
    res.status(500).json({ error: "Failed to fetch add-on" });
  }
});

// ============================================
// TENANT: INSTALL/MANAGE ADD-ONS
// ============================================

// Get tenant's installed add-ons
router.get("/tenant/:tenantId/addons", requireAuth, requireTenant, enforceTenantContext, async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;

    const installed = await db
      .select({
        installation: tenantAddons,
        addon: addons,
        version: addonVersions,
        pricing: addonPricing,
      })
      .from(tenantAddons)
      .innerJoin(addons, eq(tenantAddons.addonId, addons.id))
      .innerJoin(addonVersions, eq(tenantAddons.versionId, addonVersions.id))
      .leftJoin(addonPricing, eq(tenantAddons.pricingId, addonPricing.id))
      .where(eq(tenantAddons.tenantId, tenantId));

    res.json({ installedAddons: installed });
  } catch (error) {
    console.error("Error fetching tenant add-ons:", error);
    res.status(500).json({ error: "Failed to fetch installed add-ons" });
  }
});

// Install an add-on with dependency checks and rollback
router.post("/tenant/:tenantId/addons", requireAuth, requireTenant, enforceTenantContext, requireRole("admin", "super_admin"), async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const { addonId, pricingId, config = {} } = req.body;
    const userId = (req as any).user?.id || "system";

    const result = await addonLifecycle.install(tenantId, addonId, pricingId, config, userId);

    if (!result.success) {
      const statusCode = result.code === "ADDON_NOT_FOUND" ? 404 : 
                         result.code === "MISSING_DEPENDENCIES" ? 422 : 400;
      return res.status(statusCode).json({ 
        error: result.error, 
        code: result.code,
        details: result.data,
        rollbackPerformed: result.rollbackPerformed
      });
    }

    res.status(201).json({ installation: result.data });
  } catch (error) {
    console.error("Error installing add-on:", error);
    res.status(500).json({ error: "Failed to install add-on" });
  }
});

// Check dependencies before install
router.post("/tenant/:tenantId/addons/check-dependencies", requireAuth, requireTenant, enforceTenantContext, async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const { addonId, versionId } = req.body;

    const result = await addonLifecycle.checkDependencies(tenantId, addonId, versionId);
    res.json(result);
  } catch (error) {
    console.error("Error checking dependencies:", error);
    res.status(500).json({ error: "Failed to check dependencies" });
  }
});

// Update add-on configuration
router.patch("/tenant/:tenantId/addons/:addonId", requireAuth, requireTenant, enforceTenantContext, requireRole("admin", "super_admin"), async (req: Request, res: Response) => {
  try {
    const { tenantId, addonId } = req.params;
    const { config, autoUpdate, status } = req.body;

    const updates: any = { updatedAt: new Date() };
    if (config !== undefined) updates.config = config;
    if (autoUpdate !== undefined) updates.autoUpdate = autoUpdate;
    if (status !== undefined) updates.status = status;

    const [updated] = await db
      .update(tenantAddons)
      .set(updates)
      .where(and(eq(tenantAddons.tenantId, tenantId), eq(tenantAddons.addonId, addonId)))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: "Installation not found" });
    }

    res.json({ installation: updated });
  } catch (error) {
    console.error("Error updating add-on:", error);
    res.status(500).json({ error: "Failed to update add-on" });
  }
});

// Upgrade add-on to new version with dependency checks and rollback
router.post("/tenant/:tenantId/addons/:addonId/upgrade", requireAuth, requireTenant, enforceTenantContext, requireRole("admin", "super_admin"), async (req: Request, res: Response) => {
  try {
    const { tenantId, addonId } = req.params;
    const { targetVersionId } = req.body;
    const userId = (req as any).user?.id || "system";

    const result = await addonLifecycle.upgrade(tenantId, addonId, targetVersionId, userId);

    if (!result.success) {
      const statusCode = result.code === "NOT_INSTALLED" || result.code === "VERSION_NOT_FOUND" ? 404 : 
                         result.code === "MISSING_DEPENDENCIES" ? 422 : 400;
      return res.status(statusCode).json({ 
        error: result.error, 
        code: result.code,
        details: result.data,
        rollbackPerformed: result.rollbackPerformed
      });
    }

    res.json({ success: true, ...result.data });
  } catch (error) {
    console.error("Error upgrading add-on:", error);
    res.status(500).json({ error: "Failed to upgrade add-on" });
  }
});

// Disable add-on (keeps installation but deactivates)
router.post("/tenant/:tenantId/addons/:addonId/disable", requireAuth, requireTenant, enforceTenantContext, requireRole("admin", "super_admin"), async (req: Request, res: Response) => {
  try {
    const { tenantId, addonId } = req.params;
    const userId = (req as any).user?.id || "system";

    const result = await addonLifecycle.disable(tenantId, addonId, userId);

    if (!result.success) {
      const statusCode = result.code === "NOT_INSTALLED" ? 404 : 
                         result.code === "HAS_DEPENDENTS" ? 422 : 400;
      return res.status(statusCode).json({ 
        error: result.error, 
        code: result.code,
        details: result.data
      });
    }

    res.json({ success: true, ...result.data });
  } catch (error) {
    console.error("Error disabling add-on:", error);
    res.status(500).json({ error: "Failed to disable add-on" });
  }
});

// Enable a disabled add-on
router.post("/tenant/:tenantId/addons/:addonId/enable", requireAuth, requireTenant, enforceTenantContext, requireRole("admin", "super_admin"), async (req: Request, res: Response) => {
  try {
    const { tenantId, addonId } = req.params;
    const userId = (req as any).user?.id || "system";

    const result = await addonLifecycle.enable(tenantId, addonId, userId);

    if (!result.success) {
      const statusCode = result.code === "NOT_INSTALLED" ? 404 : 
                         result.code === "MISSING_DEPENDENCIES" ? 422 : 400;
      return res.status(statusCode).json({ 
        error: result.error, 
        code: result.code,
        details: result.data
      });
    }

    res.json({ success: true, ...result.data });
  } catch (error) {
    console.error("Error enabling add-on:", error);
    res.status(500).json({ error: "Failed to enable add-on" });
  }
});

// Uninstall add-on with dependency checks and rollback
router.delete("/tenant/:tenantId/addons/:addonId", requireAuth, requireTenant, enforceTenantContext, requireRole("admin", "super_admin"), async (req: Request, res: Response) => {
  try {
    const { tenantId, addonId } = req.params;
    const userId = (req as any).user?.id || "system";

    const result = await addonLifecycle.uninstall(tenantId, addonId, userId);

    if (!result.success) {
      const statusCode = result.code === "NOT_INSTALLED" ? 404 : 
                         result.code === "HAS_DEPENDENTS" ? 422 : 400;
      return res.status(statusCode).json({ 
        error: result.error, 
        code: result.code,
        details: result.data,
        rollbackPerformed: result.rollbackPerformed
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Error uninstalling add-on:", error);
    res.status(500).json({ error: "Failed to uninstall add-on" });
  }
});

// Get installation history
router.get("/tenant/:tenantId/addons/history", requireAuth, requireTenant, enforceTenantContext, async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const { addonId } = req.query;

    const history = await addonLifecycle.getHistory(tenantId, addonId as string | undefined);
    res.json({ history });
  } catch (error) {
    console.error("Error fetching history:", error);
    res.status(500).json({ error: "Failed to fetch history" });
  }
});

// ============================================
// REVIEWS
// ============================================

// Submit review
router.post("/tenant/:tenantId/addons/:addonId/reviews", requireAuth, requireTenant, enforceTenantContext, async (req: Request, res: Response) => {
  try {
    const { tenantId, addonId } = req.params;
    const { rating, title, body } = req.body;
    const userId = (req as any).user?.id;

    // Check if tenant has installed this addon
    const [installation] = await db
      .select()
      .from(tenantAddons)
      .where(and(eq(tenantAddons.tenantId, tenantId), eq(tenantAddons.addonId, addonId)))
      .limit(1);

    const [review] = await db
      .insert(addonReviews)
      .values({
        addonId,
        tenantId,
        userId,
        rating: Math.min(5, Math.max(1, rating)),
        title,
        body,
        isVerifiedPurchase: !!installation,
      })
      .returning();

    // Update addon stats
    const [stats] = await db
      .select({
        avgRating: sql<string>`AVG(${addonReviews.rating})`,
        count: sql<number>`COUNT(*)`,
      })
      .from(addonReviews)
      .where(and(eq(addonReviews.addonId, addonId), eq(addonReviews.isApproved, true)));

    await db
      .update(addons)
      .set({
        averageRating: stats.avgRating,
        reviewCount: stats.count,
      })
      .where(eq(addons.id, addonId));

    res.status(201).json({ review });
  } catch (error) {
    console.error("Error submitting review:", error);
    res.status(500).json({ error: "Failed to submit review" });
  }
});

// ============================================
// ADMIN: MANAGE ADD-ONS
// ============================================

// Create add-on (admin/developer)
router.post("/admin/addons", requireAuth, requireRole("super_admin"), async (req: Request, res: Response) => {
  try {
    const parsed = insertAddonSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    const [addon] = await db
      .insert(addons)
      .values(parsed.data)
      .returning();

    res.status(201).json({ addon });
  } catch (error) {
    console.error("Error creating add-on:", error);
    res.status(500).json({ error: "Failed to create add-on" });
  }
});

// Create version
router.post("/admin/addons/:addonId/versions", requireAuth, requireRole("super_admin"), async (req: Request, res: Response) => {
  try {
    const { addonId } = req.params;
    const parsed = insertAddonVersionSchema.safeParse({ ...req.body, addonId });
    
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    // If this is marked as latest, unmark others
    if (parsed.data.isLatest) {
      await db
        .update(addonVersions)
        .set({ isLatest: false })
        .where(eq(addonVersions.addonId, addonId));
    }

    const [version] = await db
      .insert(addonVersions)
      .values(parsed.data)
      .returning();

    res.status(201).json({ version });
  } catch (error) {
    console.error("Error creating version:", error);
    res.status(500).json({ error: "Failed to create version" });
  }
});

// Publish add-on
router.post("/admin/addons/:addonId/publish", requireAuth, requireRole("super_admin"), async (req: Request, res: Response) => {
  try {
    const { addonId } = req.params;

    const [updated] = await db
      .update(addons)
      .set({ 
        status: "published",
        publishedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(addons.id, addonId))
      .returning();

    res.json({ addon: updated });
  } catch (error) {
    console.error("Error publishing add-on:", error);
    res.status(500).json({ error: "Failed to publish add-on" });
  }
});

export default router;
