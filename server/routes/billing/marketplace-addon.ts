import { Router, Request, Response } from "express";
import { z } from "zod";
import { db } from "../../db";
import { 
  addons, addonPricing, tenantAddons, addonVersions,
} from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import { requireMinimumRole, auditService } from "../../core";
import { razorpayService, isRazorpayConfigured, getRazorpayKeyId } from "../../services/razorpay";

const router = Router();

const subscribeSchema = z.object({
  addonId: z.string().uuid(),
  pricingId: z.string().uuid(),
  quantity: z.number().int().min(1).default(1),
  useTrial: z.boolean().default(false),
});

const cancelSchema = z.object({
  addonId: z.string().uuid(),
  cancelImmediately: z.boolean().default(false),
});

router.get("/installed", async (req, res) => {
  try {
    const tenantId = req.context?.tenant?.id;
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant ID required" });
    }

    const installed = await db
      .select({
        installation: tenantAddons,
        addon: addons,
        pricing: addonPricing,
      })
      .from(tenantAddons)
      .leftJoin(addons, eq(tenantAddons.addonId, addons.id))
      .leftJoin(addonPricing, eq(tenantAddons.pricingId, addonPricing.id))
      .where(eq(tenantAddons.tenantId, tenantId));

    res.json({ addons: installed });
  } catch (error) {
    console.error("[marketplace-addon] Error fetching installed addons:", error);
    res.status(500).json({ error: "Failed to fetch installed add-ons" });
  }
});

router.get("/status/:addonId", async (req, res) => {
  try {
    const tenantId = req.context?.tenant?.id;
    const { addonId } = req.params;

    if (!tenantId) {
      return res.status(400).json({ error: "Tenant ID required" });
    }

    const [installation] = await db
      .select()
      .from(tenantAddons)
      .where(and(
        eq(tenantAddons.tenantId, tenantId),
        eq(tenantAddons.addonId, addonId)
      ))
      .limit(1);

    if (!installation) {
      return res.json({
        installed: false,
        status: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
      });
    }

    res.json({
      installed: true,
      status: installation.status,
      pricingId: installation.pricingId,
      currentPeriodStart: installation.currentPeriodStart,
      currentPeriodEnd: installation.currentPeriodEnd,
      trialEndsAt: installation.trialEndsAt,
      cancelAtPeriodEnd: installation.cancelAtPeriodEnd,
      subscriptionId: installation.subscriptionId,
      subscriptionStatus: installation.subscriptionStatus,
    });
  } catch (error) {
    console.error("[marketplace-addon] Error fetching addon status:", error);
    res.status(500).json({ error: "Failed to fetch add-on status" });
  }
});

router.post("/subscribe", requireMinimumRole("admin"), async (req, res) => {
  try {
    const tenantId = req.context?.tenant?.id;
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant ID required" });
    }

    const parseResult = subscribeSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ 
        error: "Validation failed", 
        details: parseResult.error.flatten() 
      });
    }

    const { addonId, pricingId, quantity, useTrial } = parseResult.data;

    const [addon] = await db
      .select()
      .from(addons)
      .where(and(
        eq(addons.id, addonId),
        eq(addons.status, "published")
      ))
      .limit(1);

    if (!addon) {
      return res.status(404).json({ error: "Add-on not found or not available" });
    }

    const [pricing] = await db
      .select()
      .from(addonPricing)
      .where(and(
        eq(addonPricing.id, pricingId),
        eq(addonPricing.addonId, addonId),
        eq(addonPricing.isActive, true)
      ))
      .limit(1);

    if (!pricing) {
      return res.status(404).json({ error: "Pricing tier not found" });
    }

    // Get the latest stable version for the addon
    const [latestVersion] = await db
      .select()
      .from(addonVersions)
      .where(and(
        eq(addonVersions.addonId, addonId),
        eq(addonVersions.status, "stable")
      ))
      .orderBy(desc(addonVersions.releasedAt))
      .limit(1);

    if (!latestVersion) {
      return res.status(404).json({ error: "No stable version available for this add-on" });
    }

    const [existingInstall] = await db
      .select()
      .from(tenantAddons)
      .where(and(
        eq(tenantAddons.tenantId, tenantId),
        eq(tenantAddons.addonId, addonId)
      ))
      .limit(1);

    if (existingInstall && existingInstall.status === "active") {
      return res.status(409).json({ error: "Add-on already active" });
    }

    const now = new Date();
    const totalPrice = parseFloat(pricing.price || "0") * quantity;
    const versionId = latestVersion.id;

    if (pricing.pricingType === "free") {
      const installData = {
        tenantId,
        addonId,
        versionId,
        pricingId,
        status: "active" as const,
        subscriptionStatus: "free",
        currentPeriodStart: now,
        currentPeriodEnd: null,
        trialEndsAt: null,
        config: { quantity },
      };

      let result;
      if (existingInstall) {
        [result] = await db
          .update(tenantAddons)
          .set({ ...installData, updatedAt: now })
          .where(eq(tenantAddons.id, existingInstall.id))
          .returning();
      } else {
        [result] = await db
          .insert(tenantAddons)
          .values(installData)
          .returning();
      }

      auditService.logFromRequest("install_addon", req, "addon");

      return res.json({
        success: true,
        installation: result,
        requiresPayment: false,
      });
    }

    if (useTrial && pricing.trialDays && pricing.trialDays > 0) {
      // For trials, create a Razorpay subscription with trial period
      // This ensures automatic conversion to paid when trial ends
      const trialEnd = new Date(now);
      trialEnd.setDate(trialEnd.getDate() + pricing.trialDays);

      const billingPeriod = pricing.billingPeriod || "month";
      const razorpayPeriod = billingPeriod === "year" ? "yearly" : "monthly";

      // Create pending installation FIRST
      const installData = {
        tenantId,
        addonId,
        versionId,
        pricingId,
        status: "active" as const,
        subscriptionStatus: "trialing",
        currentPeriodStart: now,
        currentPeriodEnd: trialEnd,
        trialEndsAt: trialEnd,
        config: { quantity },
      };

      let installation;
      if (existingInstall) {
        [installation] = await db
          .update(tenantAddons)
          .set({ ...installData, updatedAt: now })
          .where(eq(tenantAddons.id, existingInstall.id))
          .returning();
      } else {
        [installation] = await db
          .insert(tenantAddons)
          .values(installData)
          .returning();
      }

      // If Razorpay is configured, create subscription with trial period
      if (isRazorpayConfigured()) {
        try {
          const plan = await razorpayService.createPlan({
            period: razorpayPeriod,
            interval: 1,
            item: {
              name: `${addon.name} - ${pricing.name}`,
              amount: Math.round(totalPrice * 100),
              currency: pricing.currency || "INR",
              description: addon.shortDescription || addon.name,
            },
            notes: {
              addon_id: addonId,
              pricing_id: pricingId,
            },
          });

          const trialStartTimestamp = Math.floor(trialEnd.getTime() / 1000);
          const subscription = await razorpayService.createSubscription({
            plan_id: plan.id,
            total_count: billingPeriod === "year" ? 5 : 60,
            quantity: quantity,
            customer_notify: 1,
            start_at: trialStartTimestamp,
            notes: {
              tenant_id: tenantId,
              addon: "marketplace",
              addon_id: addonId,
              pricing_id: pricingId,
              version_id: versionId,
              billing_period: billingPeriod,
            },
          });

          await db.update(tenantAddons)
            .set({
              subscriptionId: subscription.id,
              updatedAt: now,
            })
            .where(eq(tenantAddons.id, installation.id));
        } catch (rpError) {
          console.error("[marketplace-addon] Trial subscription creation error:", rpError);
          // Continue without subscription - trial still valid
        }
      }

      auditService.logFromRequest("start_addon_trial", req, "addon");

      return res.json({
        success: true,
        installation,
        requiresPayment: false,
        trial: {
          active: true,
          endsAt: trialEnd,
          daysRemaining: pricing.trialDays,
        },
      });
    }

    if (!isRazorpayConfigured()) {
      const installData = {
        tenantId,
        addonId,
        versionId,
        pricingId,
        status: "pending" as const,
        subscriptionStatus: "pending_payment",
        currentPeriodStart: now,
        config: { quantity },
      };

      let result;
      if (existingInstall) {
        [result] = await db
          .update(tenantAddons)
          .set({ ...installData, updatedAt: now })
          .where(eq(tenantAddons.id, existingInstall.id))
          .returning();
      } else {
        [result] = await db
          .insert(tenantAddons)
          .values(installData)
          .returning();
      }

      return res.json({
        success: true,
        installation: result,
        requiresPayment: true,
        paymentPending: true,
        message: "Payment gateway not configured. Manual activation required.",
        paymentDetails: {
          amount: totalPrice,
          currency: pricing.currency,
          addonName: addon.name,
          pricingName: pricing.name,
        },
      });
    }

    // For recurring billing, create a Razorpay plan and subscription
    const billingPeriod = pricing.billingPeriod || "month";
    const razorpayPeriod = billingPeriod === "year" ? "yearly" : "monthly";
    
    // Create pending installation FIRST (before Razorpay call)
    const installData = {
      tenantId,
      addonId,
      versionId,
      pricingId,
      status: "pending" as const,
      subscriptionStatus: "pending",
      currentPeriodStart: now,
      config: { quantity },
    };

    let installation;
    if (existingInstall) {
      [installation] = await db
        .update(tenantAddons)
        .set({ ...installData, updatedAt: now })
        .where(eq(tenantAddons.id, existingInstall.id))
        .returning();
    } else {
      [installation] = await db
        .insert(tenantAddons)
        .values(installData)
        .returning();
    }

    // Create or use existing plan for this pricing tier
    const plan = await razorpayService.createPlan({
      period: razorpayPeriod,
      interval: 1,
      item: {
        name: `${addon.name} - ${pricing.name}`,
        amount: Math.round(totalPrice * 100),
        currency: pricing.currency || "INR",
        description: addon.shortDescription || addon.name,
      },
      notes: {
        addon_id: addonId,
        pricing_id: pricingId,
      },
    });

    // Create subscription with billing cycles
    const totalCount = billingPeriod === "year" ? 5 : 60; // 5 years yearly or 5 years monthly
    const subscription = await razorpayService.createSubscription({
      plan_id: plan.id,
      total_count: totalCount,
      quantity: quantity,
      customer_notify: 1,
      notes: {
        tenant_id: tenantId,
        addon: "marketplace",
        addon_id: addonId,
        pricing_id: pricingId,
        version_id: versionId,
        billing_period: billingPeriod,
      },
    });

    // Update installation with subscription details
    const [result] = await db
      .update(tenantAddons)
      .set({
        subscriptionId: subscription.id,
        subscriptionStatus: subscription.status,
        updatedAt: now,
      })
      .where(eq(tenantAddons.id, installation.id))
      .returning();

    auditService.logFromRequest("initiate_addon_subscription", req, "addon");

    res.json({
      success: true,
      installation: result,
      requiresPayment: true,
      razorpay: {
        keyId: getRazorpayKeyId(),
        subscriptionId: subscription.id,
        shortUrl: subscription.short_url,
        amount: plan.item.amount,
        currency: plan.item.currency,
        name: `${addon.name} - ${pricing.name}`,
        description: addon.shortDescription || addon.name,
      },
    });
  } catch (error) {
    console.error("[marketplace-addon] Error subscribing to addon:", error);
    res.status(500).json({ error: "Failed to subscribe to add-on" });
  }
});

router.post("/cancel", requireMinimumRole("admin"), async (req, res) => {
  try {
    const tenantId = req.context?.tenant?.id;
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant ID required" });
    }

    const parseResult = cancelSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ 
        error: "Validation failed", 
        details: parseResult.error.flatten() 
      });
    }

    const { addonId, cancelImmediately } = parseResult.data;

    const [installation] = await db
      .select()
      .from(tenantAddons)
      .where(and(
        eq(tenantAddons.tenantId, tenantId),
        eq(tenantAddons.addonId, addonId)
      ))
      .limit(1);

    if (!installation) {
      return res.status(404).json({ error: "Add-on installation not found" });
    }

    if (installation.subscriptionId && isRazorpayConfigured()) {
      try {
        await razorpayService.cancelSubscription(
          installation.subscriptionId,
          !cancelImmediately
        );
      } catch (rpError) {
        console.error("[marketplace-addon] Razorpay cancel error:", rpError);
      }
    }

    if (cancelImmediately) {
      const [result] = await db
        .update(tenantAddons)
        .set({
          status: "disabled",
          subscriptionStatus: "cancelled",
          cancelAtPeriodEnd: false,
          updatedAt: new Date(),
        })
        .where(eq(tenantAddons.id, installation.id))
        .returning();

      auditService.logFromRequest("cancel_addon_immediately", req, "addon");

      return res.json({
        success: true,
        installation: result,
        message: "Add-on cancelled immediately",
      });
    }

    const [result] = await db
      .update(tenantAddons)
      .set({
        cancelAtPeriodEnd: true,
        subscriptionStatus: "pending_cancel",
        updatedAt: new Date(),
      })
      .where(eq(tenantAddons.id, installation.id))
      .returning();

    auditService.logFromRequest("cancel_addon_at_period_end", req, "addon");

    res.json({
      success: true,
      installation: result,
      message: "Add-on will be cancelled at the end of the current billing period",
      effectiveDate: result.currentPeriodEnd,
    });
  } catch (error) {
    console.error("[marketplace-addon] Error cancelling addon:", error);
    res.status(500).json({ error: "Failed to cancel add-on" });
  }
});

router.post("/reactivate", requireMinimumRole("admin"), async (req, res) => {
  try {
    const tenantId = req.context?.tenant?.id;
    const { addonId } = req.body;

    if (!tenantId) {
      return res.status(400).json({ error: "Tenant ID required" });
    }

    if (!addonId) {
      return res.status(400).json({ error: "Add-on ID required" });
    }

    const [installation] = await db
      .select()
      .from(tenantAddons)
      .where(and(
        eq(tenantAddons.tenantId, tenantId),
        eq(tenantAddons.addonId, addonId)
      ))
      .limit(1);

    if (!installation) {
      return res.status(404).json({ error: "Add-on installation not found" });
    }

    if (!installation.cancelAtPeriodEnd) {
      return res.status(400).json({ error: "Add-on is not scheduled for cancellation" });
    }

    if (installation.subscriptionId && isRazorpayConfigured()) {
      try {
        await razorpayService.resumeSubscription(installation.subscriptionId);
      } catch (rpError) {
        console.error("[marketplace-addon] Razorpay resume error:", rpError);
      }
    }

    const [result] = await db
      .update(tenantAddons)
      .set({
        cancelAtPeriodEnd: false,
        status: "active",
        subscriptionStatus: "active",
        updatedAt: new Date(),
      })
      .where(eq(tenantAddons.id, installation.id))
      .returning();

    auditService.logFromRequest("reactivate_addon", req, "addon");

    res.json({
      success: true,
      installation: result,
      message: "Add-on subscription reactivated",
    });
  } catch (error) {
    console.error("[marketplace-addon] Error reactivating addon:", error);
    res.status(500).json({ error: "Failed to reactivate add-on" });
  }
});

export default router;
