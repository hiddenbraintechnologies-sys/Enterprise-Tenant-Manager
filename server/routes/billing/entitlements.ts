/**
 * Entitlements API Routes
 * 
 * Provides endpoints for checking add-on entitlements for the current tenant.
 */

import { Router } from "express";
import { z } from "zod";
import { db } from "../../db";
import { tenantAddons, addons, addonCountryConfig, tenants } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { getAllTenantEntitlements, getTenantAddonEntitlement, checkDependencyEntitlement } from "../../services/entitlement";
import { isRazorpayConfigured, razorpayService, getRazorpayKeyId } from "../../services/razorpay";
import { authenticateHybrid } from "../../core/auth-middleware";
import { tenantIsolationMiddleware, tenantResolutionMiddleware } from "../../core";

const router = Router();

// Apply authentication and tenant context middleware to all entitlements routes
// Order: authenticate -> resolve tenant -> isolate tenant access
router.use(authenticateHybrid({ required: true }));
router.use(tenantResolutionMiddleware());
router.use(tenantIsolationMiddleware());

router.get("/", async (req, res) => {
  try {
    const tenantId = req.context?.tenant?.id || (req as any).tokenPayload?.tenantId;
    
    if (!tenantId) {
      return res.status(401).json({
        error: "UNAUTHORIZED",
        message: "Tenant context not found",
      });
    }
    
    const entitlements = await getAllTenantEntitlements(tenantId);
    
    res.json(entitlements);
  } catch (error) {
    console.error("[entitlements-api] Error fetching entitlements:", error);
    res.status(500).json({
      error: "INTERNAL_ERROR",
      message: "Failed to fetch entitlements",
    });
  }
});

router.get("/:addonCode", async (req, res) => {
  try {
    const tenantId = req.context?.tenant?.id || (req as any).tokenPayload?.tenantId;
    const { addonCode } = req.params;
    
    if (!tenantId) {
      return res.status(401).json({
        error: "UNAUTHORIZED",
        message: "Tenant context not found",
      });
    }
    
    if (!addonCode) {
      return res.status(400).json({
        error: "BAD_REQUEST",
        message: "Add-on code is required",
      });
    }
    
    const entitlement = await getTenantAddonEntitlement(tenantId, addonCode);
    const dependencies = await checkDependencyEntitlement(tenantId, addonCode, []);
    
    res.json({
      addonCode,
      ...entitlement,
      dependencies: {
        satisfied: dependencies.satisfied,
        missingDependency: dependencies.missingDependency,
        dependencyState: dependencies.dependencyState,
      },
    });
  } catch (error) {
    console.error("[entitlements-api] Error fetching addon entitlement:", error);
    res.status(500).json({
      error: "INTERNAL_ERROR",
      message: "Failed to fetch add-on entitlement",
    });
  }
});

const checkoutSchema = z.object({
  action: z.enum(["renew", "upgrade"]).default("renew"),
  billingPeriod: z.enum(["monthly", "yearly"]).default("monthly"),
  returnUrl: z.string().url().optional(),
});

router.post("/:addonCode/checkout", async (req, res) => {
  try {
    const tenantId = req.context?.tenant?.id || (req as any).tokenPayload?.tenantId;
    const { addonCode } = req.params;
    
    if (!tenantId) {
      return res.status(401).json({
        error: "UNAUTHORIZED",
        message: "Tenant context not found",
      });
    }
    
    const parsed = checkoutSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: "BAD_REQUEST",
        message: "Invalid request body",
        details: parsed.error.errors,
      });
    }
    
    const { action, billingPeriod, returnUrl } = parsed.data;
    
    const [addon] = await db
      .select()
      .from(addons)
      .where(eq(addons.slug, addonCode))
      .limit(1);
    
    if (!addon) {
      return res.status(404).json({
        error: "NOT_FOUND",
        message: "Add-on not found",
      });
    }
    
    const [tenantAddon] = await db
      .select()
      .from(tenantAddons)
      .where(
        and(
          eq(tenantAddons.tenantId, tenantId),
          eq(tenantAddons.addonId, addon.id)
        )
      )
      .limit(1);
    
    if (!tenantAddon) {
      return res.status(400).json({
        error: "ADDON_NOT_INSTALLED",
        message: "This add-on is not installed. Please install it first.",
      });
    }
    
    const [tenant] = await db
      .select()
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1);
    
    if (!tenant) {
      return res.status(404).json({
        error: "NOT_FOUND",
        message: "Tenant not found",
      });
    }
    
    const countryCode = tenantAddon.countryCode || tenant.country || "IN";
    
    const [countryConfig] = await db
      .select()
      .from(addonCountryConfig)
      .where(
        and(
          eq(addonCountryConfig.addonId, addon.id),
          eq(addonCountryConfig.countryCode, countryCode),
          eq(addonCountryConfig.isActive, true)
        )
      )
      .limit(1);
    
    if (!countryConfig) {
      return res.status(400).json({
        error: "COUNTRY_NOT_SUPPORTED",
        message: "This add-on is not available in your country.",
      });
    }
    
    if (!isRazorpayConfigured()) {
      return res.status(503).json({
        error: "PAYMENT_GATEWAY_UNAVAILABLE",
        message: "Payment gateway is not configured. Please contact support.",
      });
    }
    
    const monthlyPrice = parseFloat(String(countryConfig.monthlyPrice || 0));
    const yearlyPrice = parseFloat(String(countryConfig.yearlyPrice || 0));
    const currency = countryConfig.currencyCode || "INR";
    
    const price = billingPeriod === "yearly" && yearlyPrice > 0 
      ? yearlyPrice 
      : monthlyPrice;
    
    if (price <= 0) {
      await db
        .update(tenantAddons)
        .set({
          status: "active",
          subscriptionStatus: "active",
          graceUntil: null,
          updatedAt: new Date(),
        })
        .where(eq(tenantAddons.id, tenantAddon.id));
      
      return res.json({
        status: "ACTIVATED",
        message: "Free add-on activated successfully.",
      });
    }
    
    try {
      const razorpayPeriod = billingPeriod === "yearly" ? "yearly" : "monthly";
      const plan = await razorpayService.createPlan({
        period: razorpayPeriod,
        interval: 1,
        item: {
          name: `${addon.name} - ${action === "renew" ? "Renewal" : "Subscription"}`,
          amount: Math.round(price * 100),
          currency: currency,
          description: addon.shortDescription || addon.name,
        },
        notes: {
          addon_id: addon.id,
          addon_slug: addonCode,
          tenant_id: tenantId,
          action: action,
        },
      });
      
      const totalCount = billingPeriod === "yearly" ? 5 : 60;
      const subscription = await razorpayService.createSubscription({
        plan_id: plan.id,
        total_count: totalCount,
        quantity: 1,
        customer_notify: 1,
        notes: {
          tenant_id: tenantId,
          addon: "marketplace",
          addon_id: addon.id,
          addon_slug: addonCode,
          version_id: tenantAddon.versionId || "",
          billing_period: billingPeriod,
          action: action,
        },
      });
      
      await db
        .update(tenantAddons)
        .set({
          subscriptionId: subscription.id,
          providerSubscriptionId: subscription.id,
          subscriptionStatus: "pending",
          updatedAt: new Date(),
        })
        .where(eq(tenantAddons.id, tenantAddon.id));
      
      console.log(`[entitlements-checkout] Created checkout for addon ${addonCode}, tenant ${tenantId}`);
      
      return res.json({
        status: "CHECKOUT_REQUIRED",
        url: subscription.short_url,
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
      console.error(`[entitlements-checkout] Razorpay error:`, rpError);
      
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
    console.error("[entitlements-checkout] Error:", error);
    res.status(500).json({
      error: "INTERNAL_ERROR",
      message: "Failed to create checkout session",
    });
  }
});

export default router;
