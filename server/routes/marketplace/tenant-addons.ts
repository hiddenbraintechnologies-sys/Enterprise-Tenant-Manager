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
  addonPricing,
} from "@shared/schema";
import { eq, and, sql, desc } from "drizzle-orm";
import { authenticateHybrid } from "../../core/auth-middleware";
import { requireTenantAdmin } from "../../rbac/guards";
import { isRazorpayConfigured, razorpayService, getRazorpayKeyId } from "../../services/razorpay";

const router = Router();

// All tenant marketplace actions (trial, purchase, cancel) require tenant admin
// Browse is available to all authenticated tenant users
const requireTenantAdminRole = requireTenantAdmin();

const startTrialSchema = z.object({
  addonId: z.string().min(1),
  countryCode: z.string().length(2),
});

router.post("/trial", authenticateHybrid({ required: true }), requireTenantAdminRole, async (req: Request, res: Response) => {
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

router.get("/installed", authenticateHybrid({ required: true }), async (req: Request, res: Response) => {
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

router.post("/cancel", authenticateHybrid({ required: true }), requireTenantAdminRole, async (req: Request, res: Response) => {
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

// Purchase endpoint with clear response statuses
const purchaseSchema = z.object({
  pricingId: z.string().optional(),
  countryCode: z.string().length(2).optional(),
  returnUrl: z.string().url().optional(),
  useTrial: z.boolean().default(false),
});

router.post("/:addonId/purchase", authenticateHybrid({ required: true }), requireTenantAdminRole, async (req: Request, res: Response) => {
  try {
    const tenantId = req.context?.tenant?.id;
    if (!tenantId) {
      return res.status(401).json({ error: "Tenant not found" });
    }

    const { addonId } = req.params;
    const parsed = purchaseSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid request", details: parsed.error.errors });
    }

    const { countryCode, returnUrl, useTrial } = parsed.data;

    // Get addon
    const [addon] = await db
      .select()
      .from(addons)
      .where(eq(addons.id, addonId))
      .limit(1);

    if (!addon || addon.status !== "published") {
      return res.status(404).json({ error: "Add-on not found or not available" });
    }

    // Get tenant
    const [tenant] = await db
      .select()
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1);

    if (!tenant) {
      return res.status(404).json({ error: "Tenant not found" });
    }

    const tenantCountry = countryCode || tenant.country || "IN";

    // Check if already active
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

    if (existingAddon && existingAddon.status === "active") {
      return res.json({
        status: "ALREADY_ACTIVE",
        tenantAddonId: existingAddon.id,
        message: "Add-on is already active",
      });
    }

    // Check country config
    const [countryConfig] = await db
      .select()
      .from(addonCountryConfig)
      .where(
        and(
          eq(addonCountryConfig.addonId, addonId),
          eq(addonCountryConfig.countryCode, tenantCountry),
          eq(addonCountryConfig.isActive, true)
        )
      )
      .limit(1);

    if (!countryConfig) {
      return res.status(400).json({ error: "Add-on not available in your country" });
    }

    // Check plan eligibility
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
        requiredAction: "UPGRADE_PLAN",
      });
    }

    // Get latest version
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
    const trialDays = countryConfig.trialDays || 7;

    // If trial is enabled and user wants trial, activate trial immediately
    if ((useTrial || eligibility.trialEnabled) && !existingAddon?.trialEndsAt) {
      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + trialDays);

      if (existingAddon) {
        await db
          .update(tenantAddons)
          .set({
            status: "active",
            subscriptionStatus: "trialing",
            trialEndsAt,
            countryCode: tenantCountry,
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
          countryCode: tenantCountry,
          currencyCode: countryConfig.currencyCode,
          installedBy: userId,
          provider: "razorpay",
        });
      }

      console.log(`[tenant-addons] Started trial for addon ${addon.slug} by tenant ${tenantId}`);

      return res.json({
        status: "TRIAL_ACTIVE",
        tenantAddonId: existingAddon?.id,
        trialEndsAt: trialEndsAt.toISOString(),
        trialDays,
        message: `Trial started for ${addon.name}`,
      });
    }

    // For paid add-ons, check if Razorpay is configured
    if (!isRazorpayConfigured()) {
      // Activate as pending if no payment gateway
      let installation;
      if (existingAddon) {
        [installation] = await db
          .update(tenantAddons)
          .set({
            status: "pending",
            subscriptionStatus: "pending_payment",
            countryCode: tenantCountry,
            currencyCode: countryConfig.currencyCode,
            versionId: latestVersion.id,
            updatedAt: new Date(),
          })
          .where(eq(tenantAddons.id, existingAddon.id))
          .returning();
      } else {
        [installation] = await db.insert(tenantAddons).values({
          tenantId,
          addonId,
          versionId: latestVersion.id,
          status: "pending",
          subscriptionStatus: "pending_payment",
          countryCode: tenantCountry,
          currencyCode: countryConfig.currencyCode,
          installedBy: userId,
          provider: "razorpay",
        }).returning();
      }

      return res.json({
        status: "PENDING_PAYMENT",
        tenantAddonId: installation?.id,
        message: "Payment gateway not configured. Please contact support.",
      });
    }

    // Get pricing for the addon (parse from string/decimal to number)
    const monthlyPrice = parseFloat(String(countryConfig.monthlyPrice || 0));
    const yearlyPrice = parseFloat(String(countryConfig.yearlyPrice || 0));
    const currency = countryConfig.currencyCode || "INR";
    
    // Use monthly pricing by default
    const price = monthlyPrice > 0 ? monthlyPrice : (yearlyPrice / 12);
    const billingPeriod = monthlyPrice > 0 ? "monthly" : "yearly";
    
    if (price <= 0) {
      // Free addon - activate immediately
      let installation;
      if (existingAddon) {
        [installation] = await db
          .update(tenantAddons)
          .set({
            status: "active",
            subscriptionStatus: "active",
            countryCode: tenantCountry,
            currencyCode: currency,
            versionId: latestVersion.id,
            updatedAt: new Date(),
          })
          .where(eq(tenantAddons.id, existingAddon.id))
          .returning();
      } else {
        [installation] = await db.insert(tenantAddons).values({
          tenantId,
          addonId,
          versionId: latestVersion.id,
          status: "active",
          subscriptionStatus: "active",
          countryCode: tenantCountry,
          currencyCode: currency,
          installedBy: userId,
          provider: "razorpay",
        }).returning();
      }

      console.log(`[tenant-addons] Free addon ${addon.slug} activated for tenant ${tenantId}`);

      return res.json({
        status: "ALREADY_ACTIVE",
        tenantAddonId: installation?.id,
        message: `${addon.name} activated (free)`,
      });
    }

    // Create pending installation FIRST (before Razorpay call)
    let installation;
    if (existingAddon) {
      [installation] = await db
        .update(tenantAddons)
        .set({
          status: "pending",
          subscriptionStatus: "pending",
          countryCode: tenantCountry,
          currencyCode: currency,
          versionId: latestVersion.id,
          updatedAt: new Date(),
        })
        .where(eq(tenantAddons.id, existingAddon.id))
        .returning();
    } else {
      [installation] = await db.insert(tenantAddons).values({
        tenantId,
        addonId,
        versionId: latestVersion.id,
        status: "pending",
        subscriptionStatus: "pending",
        countryCode: tenantCountry,
        currencyCode: currency,
        installedBy: userId,
        provider: "razorpay",
      }).returning();
    }

    try {
      // Create Razorpay plan for this addon
      const razorpayPeriod = billingPeriod === "yearly" ? "yearly" : "monthly";
      const plan = await razorpayService.createPlan({
        period: razorpayPeriod,
        interval: 1,
        item: {
          name: `${addon.name}`,
          amount: Math.round(price * 100), // Convert to paise
          currency: currency,
          description: addon.shortDescription || addon.name,
        },
        notes: {
          addon_id: addonId,
          tenant_id: tenantId,
        },
      });

      // Create subscription
      const totalCount = billingPeriod === "yearly" ? 5 : 60; // 5 years yearly or 5 years monthly
      const subscription = await razorpayService.createSubscription({
        plan_id: plan.id,
        total_count: totalCount,
        quantity: 1,
        customer_notify: 1,
        notes: {
          tenant_id: tenantId,
          addon: "marketplace",
          addon_id: addonId,
          version_id: latestVersion.id,
          billing_period: billingPeriod,
        },
      });

      // Update installation with subscription details
      await db
        .update(tenantAddons)
        .set({
          subscriptionId: subscription.id,
          providerSubscriptionId: subscription.id,
          subscriptionStatus: subscription.status,
          updatedAt: new Date(),
        })
        .where(eq(tenantAddons.id, installation.id));

      console.log(`[tenant-addons] Created Razorpay subscription ${subscription.id} for addon ${addon.slug}`);

      // Return checkout URL (Razorpay subscription short_url)
      return res.json({
        status: "CHECKOUT_REQUIRED",
        tenantAddonId: installation.id,
        checkoutUrl: subscription.short_url,
        subscriptionId: subscription.id,
        razorpay: {
          keyId: getRazorpayKeyId(),
          subscriptionId: subscription.id,
          shortUrl: subscription.short_url,
          amount: plan.item.amount,
          currency: plan.item.currency,
          name: addon.name,
          description: addon.shortDescription || addon.name,
        },
      });
    } catch (rpError: any) {
      console.error(`[tenant-addons] Razorpay error for addon ${addon.slug}:`, rpError);
      
      // Update installation status to failed
      await db
        .update(tenantAddons)
        .set({
          status: "pending",
          subscriptionStatus: "payment_failed",
          updatedAt: new Date(),
        })
        .where(eq(tenantAddons.id, installation.id));

      // Check if it's a timeout
      if (rpError.code === "ECONNABORTED" || rpError.message?.includes("timeout")) {
        return res.status(504).json({
          error: "PAYMENT_PROVIDER_TIMEOUT",
          message: "Payment provider is not responding. Please try again.",
        });
      }

      return res.status(500).json({
        error: "PAYMENT_SETUP_FAILED",
        message: rpError.message || "Failed to create payment session. Please try again.",
      });
    }

  } catch (error) {
    console.error("[tenant-addons] Error purchasing addon:", error);
    res.status(500).json({ error: "Failed to purchase add-on" });
  }
});

export default router;
