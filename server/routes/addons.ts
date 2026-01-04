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

// List published add-ons with filtering
router.get("/marketplace", async (req: Request, res: Response) => {
  try {
    const { 
      category, 
      search, 
      featured,
      businessType,
      pricingType,
      sortBy = "installCount",
      limit = 20,
      offset = 0,
    } = req.query;

    let query = db.select().from(addons).where(eq(addons.status, "published"));

    const conditions = [eq(addons.status, "published")];
    
    if (category) {
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

    const results = await db
      .select()
      .from(addons)
      .where(and(...conditions))
      .orderBy(
        sortBy === "rating" ? desc(addons.averageRating) :
        sortBy === "newest" ? desc(addons.publishedAt) :
        desc(addons.installCount)
      )
      .limit(Number(limit))
      .offset(Number(offset));

    // Get pricing for each addon
    const addonsWithPricing = await Promise.all(
      results.map(async (addon) => {
        const pricing = await db
          .select()
          .from(addonPricing)
          .where(and(eq(addonPricing.addonId, addon.id), eq(addonPricing.isActive, true)));
        
        const latestVersion = await db
          .select()
          .from(addonVersions)
          .where(and(eq(addonVersions.addonId, addon.id), eq(addonVersions.isLatest, true)))
          .limit(1);

        return {
          ...addon,
          pricing,
          latestVersion: latestVersion[0] || null,
        };
      })
    );

    res.json({ addons: addonsWithPricing });
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

// Install an add-on
router.post("/tenant/:tenantId/addons", requireAuth, requireTenant, enforceTenantContext, requireRole("admin", "super_admin"), async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const { addonId, pricingId, config = {} } = req.body;
    const userId = (req as any).user?.id;

    // Verify addon exists and is published
    const [addon] = await db
      .select()
      .from(addons)
      .where(and(eq(addons.id, addonId), eq(addons.status, "published")))
      .limit(1);

    if (!addon) {
      return res.status(404).json({ error: "Add-on not found or not available" });
    }

    // Check if already installed
    const existing = await db
      .select()
      .from(tenantAddons)
      .where(and(eq(tenantAddons.tenantId, tenantId), eq(tenantAddons.addonId, addonId)))
      .limit(1);

    if (existing.length > 0) {
      return res.status(400).json({ error: "Add-on already installed" });
    }

    // Get latest version
    const [latestVersion] = await db
      .select()
      .from(addonVersions)
      .where(and(eq(addonVersions.addonId, addonId), eq(addonVersions.isLatest, true)))
      .limit(1);

    if (!latestVersion) {
      return res.status(400).json({ error: "No available version" });
    }

    // Get pricing if specified - verify it belongs to this addon
    let selectedPricing = null;
    if (pricingId) {
      [selectedPricing] = await db
        .select()
        .from(addonPricing)
        .where(and(eq(addonPricing.id, pricingId), eq(addonPricing.addonId, addonId)))
        .limit(1);
      
      if (!selectedPricing) {
        return res.status(400).json({ error: "Invalid pricing option for this add-on" });
      }
    }

    // Create installation
    const [installation] = await db
      .insert(tenantAddons)
      .values({
        tenantId,
        addonId,
        versionId: latestVersion.id,
        pricingId: selectedPricing?.id,
        status: "installing",
        config,
        installedBy: userId,
        trialEndsAt: selectedPricing?.trialDays 
          ? new Date(Date.now() + selectedPricing.trialDays * 24 * 60 * 60 * 1000)
          : null,
      })
      .returning();

    // Record history
    await db.insert(addonInstallHistory).values({
      tenantAddonId: installation.id,
      tenantId,
      addonId,
      action: "install",
      toVersionId: latestVersion.id,
      status: "completed",
      performedBy: userId,
      completedAt: new Date(),
    });

    // Update install count
    await db
      .update(addons)
      .set({ installCount: sql`${addons.installCount} + 1` })
      .where(eq(addons.id, addonId));

    // Mark as active
    await db
      .update(tenantAddons)
      .set({ status: "active" })
      .where(eq(tenantAddons.id, installation.id));

    res.status(201).json({ installation });
  } catch (error) {
    console.error("Error installing add-on:", error);
    res.status(500).json({ error: "Failed to install add-on" });
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

// Update add-on to new version
router.post("/tenant/:tenantId/addons/:addonId/update", requireAuth, requireTenant, enforceTenantContext, requireRole("admin", "super_admin"), async (req: Request, res: Response) => {
  try {
    const { tenantId, addonId } = req.params;
    const { targetVersionId } = req.body;
    const userId = (req as any).user?.id;

    const [installation] = await db
      .select()
      .from(tenantAddons)
      .where(and(eq(tenantAddons.tenantId, tenantId), eq(tenantAddons.addonId, addonId)))
      .limit(1);

    if (!installation) {
      return res.status(404).json({ error: "Installation not found" });
    }

    const fromVersionId = installation.versionId;

    // Verify target version exists AND belongs to this addon
    const [targetVersion] = await db
      .select()
      .from(addonVersions)
      .where(and(eq(addonVersions.id, targetVersionId), eq(addonVersions.addonId, addonId)))
      .limit(1);

    if (!targetVersion) {
      return res.status(400).json({ error: "Target version not found or invalid for this add-on" });
    }

    // Update installation
    await db
      .update(tenantAddons)
      .set({ 
        versionId: targetVersionId,
        updatedAt: new Date(),
      })
      .where(eq(tenantAddons.id, installation.id));

    // Record history
    await db.insert(addonInstallHistory).values({
      tenantAddonId: installation.id,
      tenantId,
      addonId,
      action: "update",
      fromVersionId,
      toVersionId: targetVersionId,
      status: "completed",
      performedBy: userId,
      completedAt: new Date(),
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Error updating add-on version:", error);
    res.status(500).json({ error: "Failed to update add-on version" });
  }
});

// Uninstall add-on
router.delete("/tenant/:tenantId/addons/:addonId", requireAuth, requireTenant, enforceTenantContext, requireRole("admin", "super_admin"), async (req: Request, res: Response) => {
  try {
    const { tenantId, addonId } = req.params;
    const userId = (req as any).user?.id;

    const [installation] = await db
      .select()
      .from(tenantAddons)
      .where(and(eq(tenantAddons.tenantId, tenantId), eq(tenantAddons.addonId, addonId)))
      .limit(1);

    if (!installation) {
      return res.status(404).json({ error: "Installation not found" });
    }

    // Record history before deletion
    await db.insert(addonInstallHistory).values({
      tenantAddonId: installation.id,
      tenantId,
      addonId,
      action: "uninstall",
      fromVersionId: installation.versionId,
      status: "completed",
      performedBy: userId,
      completedAt: new Date(),
    });

    // Delete installation
    await db
      .delete(tenantAddons)
      .where(eq(tenantAddons.id, installation.id));

    // Update install count
    await db
      .update(addons)
      .set({ installCount: sql`GREATEST(${addons.installCount} - 1, 0)` })
      .where(eq(addons.id, addonId));

    res.json({ success: true });
  } catch (error) {
    console.error("Error uninstalling add-on:", error);
    res.status(500).json({ error: "Failed to uninstall add-on" });
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
