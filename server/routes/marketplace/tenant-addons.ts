import { Router, Request, Response } from "express";
import { z } from "zod";
import { db } from "../../db";
import {
  tenantAddons,
  addons,
  addonVersions,
  addonCountryConfig,
  addonPlanEligibility,
  tenants,
} from "@shared/schema";
import { eq, and, sql, desc } from "drizzle-orm";
import { authenticateJWT } from "../../core/auth-middleware";

const router = Router();

const startTrialSchema = z.object({
  addonId: z.string().min(1),
  countryCode: z.string().length(2),
});

router.post("/trial", authenticateJWT({ required: true }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.context?.tenant?.id;
    if (!tenantId) {
      return res.status(401).json({ error: "Tenant not found" });
    }

    const parsed = startTrialSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid request", details: parsed.error.errors });
    }

    const { addonId, countryCode } = parsed.data;

    const [addon] = await db
      .select()
      .from(addons)
      .where(eq(addons.id, addonId))
      .limit(1);

    if (!addon || addon.status !== "published") {
      return res.status(404).json({ error: "Add-on not found or not available" });
    }

    const [countryConfig] = await db
      .select()
      .from(addonCountryConfig)
      .where(
        and(
          eq(addonCountryConfig.addonId, addonId),
          eq(addonCountryConfig.countryCode, countryCode),
          eq(addonCountryConfig.isActive, true)
        )
      )
      .limit(1);

    if (!countryConfig) {
      return res.status(400).json({ error: "Add-on not available in your country" });
    }

    const [tenant] = await db
      .select()
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1);

    if (!tenant) {
      return res.status(404).json({ error: "Tenant not found" });
    }

    const planTier = tenant.subscriptionTier || "free";

    const [eligibility] = await db
      .select()
      .from(addonPlanEligibility)
      .where(
        and(
          eq(addonPlanEligibility.addonId, addonId),
          eq(addonPlanEligibility.planTier, planTier)
        )
      )
      .limit(1);

    if (!eligibility || (!eligibility.trialEnabled && !eligibility.canPurchase)) {
      return res.status(403).json({
        error: "Not eligible",
        message: "Your current plan is not eligible for this add-on. Please upgrade.",
      });
    }

    const [existingAddon] = await db
      .select()
      .from(tenantAddons)
      .where(
        and(
          eq(tenantAddons.tenantId, tenantId),
          eq(tenantAddons.addonId, addonId)
        )
      )
      .limit(1);

    if (existingAddon) {
      if (existingAddon.status === "active") {
        return res.status(400).json({ error: "Add-on already active" });
      }
      if (existingAddon.trialEndsAt && new Date(existingAddon.trialEndsAt) > new Date()) {
        return res.status(400).json({ error: "Trial already in progress" });
      }
    }

    const trialDays = countryConfig.trialDays || 7;
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + trialDays);

    const [latestVersion] = await db
      .select()
      .from(addonVersions)
      .where(
        and(
          eq(addonVersions.addonId, addonId),
          eq(addonVersions.isStable, true)
        )
      )
      .orderBy(desc(addonVersions.createdAt))
      .limit(1);

    if (!latestVersion) {
      return res.status(400).json({ error: "No published version available" });
    }

    const userId = req.context?.user?.id || "system";

    if (existingAddon) {
      await db
        .update(tenantAddons)
        .set({
          status: "active",
          subscriptionStatus: "trialing",
          trialEndsAt,
          countryCode,
          currencyCode: countryConfig.currencyCode,
          versionId: latestVersion.id,
          updatedAt: new Date(),
        })
        .where(eq(tenantAddons.id, existingAddon.id));
    } else {
      await db.insert(tenantAddons).values({
        tenantId,
        addonId,
        versionId: latestVersion.id,
        status: "active",
        subscriptionStatus: "trialing",
        trialEndsAt,
        countryCode,
        currencyCode: countryConfig.currencyCode,
        installedBy: userId,
        provider: "razorpay",
      });
    }

    console.log(`[tenant-addons] Started trial for addon ${addon.slug} by tenant ${tenantId}`);

    res.json({
      success: true,
      message: `Trial started for ${addon.name}`,
      trialEndsAt: trialEndsAt.toISOString(),
      trialDays,
    });
  } catch (error) {
    console.error("[tenant-addons] Error starting trial:", error);
    res.status(500).json({ error: "Failed to start trial" });
  }
});

router.get("/installed", authenticateJWT({ required: true }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.context?.tenant?.id;
    if (!tenantId) {
      return res.status(401).json({ error: "Tenant not found" });
    }

    const installed = await db
      .select({
        id: tenantAddons.id,
        addonId: tenantAddons.addonId,
        status: tenantAddons.status,
        subscriptionStatus: tenantAddons.subscriptionStatus,
        trialEndsAt: tenantAddons.trialEndsAt,
        currentPeriodEnd: tenantAddons.currentPeriodEnd,
        units: tenantAddons.units,
        monthlyAmount: tenantAddons.monthlyAmount,
        installedAt: tenantAddons.installedAt,
        addonName: addons.name,
        addonSlug: addons.slug,
        addonCategory: addons.category,
      })
      .from(tenantAddons)
      .innerJoin(addons, eq(tenantAddons.addonId, addons.id))
      .where(
        and(
          eq(tenantAddons.tenantId, tenantId),
          sql`${tenantAddons.status} IN ('active', 'pending')`
        )
      );

    res.json(installed);
  } catch (error) {
    console.error("[tenant-addons] Error fetching installed addons:", error);
    res.status(500).json({ error: "Failed to fetch installed add-ons" });
  }
});

router.post("/cancel", authenticateJWT({ required: true }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.context?.tenant?.id;
    if (!tenantId) {
      return res.status(401).json({ error: "Tenant not found" });
    }

    const { addonId } = req.body;
    if (!addonId) {
      return res.status(400).json({ error: "addonId is required" });
    }

    const [tenantAddon] = await db
      .select()
      .from(tenantAddons)
      .where(
        and(
          eq(tenantAddons.tenantId, tenantId),
          eq(tenantAddons.addonId, addonId)
        )
      )
      .limit(1);

    if (!tenantAddon) {
      return res.status(404).json({ error: "Add-on not found" });
    }

    await db
      .update(tenantAddons)
      .set({
        cancelAtPeriodEnd: true,
        updatedAt: new Date(),
      })
      .where(eq(tenantAddons.id, tenantAddon.id));

    res.json({ success: true, message: "Add-on will be canceled at the end of the billing period" });
  } catch (error) {
    console.error("[tenant-addons] Error canceling addon:", error);
    res.status(500).json({ error: "Failed to cancel add-on" });
  }
});

export default router;
