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
    
    // Validate payment gateway configuration
    if (!isRazorpayConfigured()) {
      console.error("[entitlements-checkout] Razorpay not configured - missing RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET");
      return res.status(503).json({
        error: "PAYMENT_GATEWAY_UNAVAILABLE",
        message: "Payment gateway is not configured. Please contact support.",
        debugCode: "MISSING_RAZORPAY_CREDENTIALS",
      });
    }
    
    // Validate key format
    const keyId = getRazorpayKeyId();
    if (!keyId.startsWith("rzp_test_") && !keyId.startsWith("rzp_live_")) {
      console.error(`[entitlements-checkout] Invalid Razorpay key format: ${keyId.substring(0, 10)}...`);
      return res.status(503).json({
        error: "PAYMENT_GATEWAY_UNAVAILABLE",
        message: "Payment gateway configuration is invalid. Please contact support.",
        debugCode: "INVALID_RAZORPAY_KEY_FORMAT",
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
      // Generate unique reference ID for this payment (max 40 chars for Razorpay)
      const shortTenantId = tenantId.slice(0, 8);
      const timestamp = Date.now().toString(36); // Base36 for shorter timestamp
      const referenceId = `add_${addonCode.slice(0, 15)}_${shortTenantId}_${timestamp}`;
      
      // Use Payment Links API - works on all Razorpay accounts
      const paymentLink = await razorpayService.createPaymentLink({
        amount: Math.round(price * 100), // Amount in smallest currency unit (paise for INR)
        currency: currency,
        description: `${addon.name} - ${action === "renew" ? "Renewal" : "Subscription"} (${billingPeriod})`,
        reference_id: referenceId,
        notify: {
          sms: false,
          email: false,
        },
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
          subscriptionId: paymentLink.id,
          providerSubscriptionId: paymentLink.id,
          subscriptionStatus: "pending",
          updatedAt: new Date(),
        })
        .where(eq(tenantAddons.id, tenantAddon.id));
      
      console.log(`[entitlements-checkout] Created payment link for addon ${addonCode}, tenant ${tenantId}, link: ${paymentLink.id}`);
      
      return res.json({
        status: "CHECKOUT_REQUIRED",
        url: paymentLink.short_url,
        checkoutUrl: paymentLink.short_url,
        paymentLinkId: paymentLink.id,
        razorpay: {
          keyId: getRazorpayKeyId(),
          paymentLinkId: paymentLink.id,
          shortUrl: paymentLink.short_url,
          amount: paymentLink.amount,
          currency: paymentLink.currency,
          name: addon.name,
          description: addon.shortDescription || addon.name,
        },
      });
    } catch (rpError: any) {
      // Structured error logging for debugging
      const errorDetails = {
        message: rpError.message,
        code: rpError.code,
        statusCode: rpError.statusCode,
        error: rpError.error,
        description: rpError.error?.description,
        source: rpError.error?.source,
        requestParams: {
          addonCode,
          tenantId,
          billingPeriod,
          price,
          currency,
        },
      };
      console.error(`[entitlements-checkout] Razorpay error:`, JSON.stringify(errorDetails, null, 2));
      
      // Determine specific debug code based on error - ordered by priority
      let debugCode = "RAZORPAY_UNKNOWN_ERROR";
      let userMessage = "Failed to create payment session. Please try again.";
      let statusCode = 500;
      const razorpayErrorCode = rpError.error?.code;
      
      // Check for network/timeout issues first
      if (rpError.code === "ECONNABORTED" || rpError.message?.includes("timeout")) {
        debugCode = "RAZORPAY_TIMEOUT";
        userMessage = "Payment provider is not responding. Please try again.";
        statusCode = 504;
      } 
      // Check for authentication failures (401, 403, or explicit auth error)
      else if (rpError.statusCode === 401 || rpError.statusCode === 403 || razorpayErrorCode === "AUTHENTICATION_ERROR") {
        debugCode = "RAZORPAY_AUTH_FAILED";
        userMessage = "Payment gateway authentication failed. Please contact support.";
        statusCode = 503;
      }
      // Check for 404 endpoint not found
      else if (rpError.statusCode === 404) {
        debugCode = "RAZORPAY_ENDPOINT_NOT_FOUND";
        userMessage = "Payment service configuration error. Please contact support.";
        statusCode = 503;
      }
      // Handle BAD_REQUEST errors (client-side issues)
      else if (razorpayErrorCode === "BAD_REQUEST_ERROR") {
        debugCode = "RAZORPAY_BAD_REQUEST";
        userMessage = rpError.error?.description || "Invalid payment request. Please contact support.";
        statusCode = 400;
      }
      
      return res.status(statusCode).json({
        error: "PAYMENT_SETUP_FAILED",
        message: userMessage,
        debugCode,
        razorpayErrorCode: razorpayErrorCode || null,
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

// Verify payment and activate add-on (called after payment redirect)
router.post("/:addonCode/verify-payment", async (req, res) => {
  try {
    const { addonCode } = req.params;
    const { paymentLinkId } = req.body;
    const tenantId = req.context?.tenant?.id || (req as any).tokenPayload?.tenantId;
    
    if (!tenantId) {
      return res.status(401).json({
        error: "UNAUTHORIZED",
        message: "Tenant context required",
      });
    }
    
    // Find the tenant addon
    const [tenantAddon] = await db
      .select()
      .from(tenantAddons)
      .innerJoin(addons, eq(tenantAddons.addonId, addons.id))
      .where(
        and(
          eq(tenantAddons.tenantId, tenantId),
          eq(addons.slug, addonCode)
        )
      )
      .limit(1);
    
    if (!tenantAddon) {
      return res.status(404).json({
        error: "NOT_FOUND",
        message: "Add-on not found for this tenant",
      });
    }
    
    // Check if already active
    if (tenantAddon.tenant_addons.status === "active") {
      return res.json({
        status: "ALREADY_ACTIVE",
        message: "Add-on is already active",
      });
    }
    
    // Verify payment link status with Razorpay
    const storedPaymentLinkId = tenantAddon.tenant_addons.providerSubscriptionId;
    const linkIdToCheck = paymentLinkId || storedPaymentLinkId;
    
    if (!linkIdToCheck || !linkIdToCheck.startsWith("plink_")) {
      return res.status(400).json({
        error: "INVALID_PAYMENT_LINK",
        message: "No valid payment link found for verification",
      });
    }
    
    try {
      const paymentLink = await razorpayService.fetchPaymentLink(linkIdToCheck);
      
      if (paymentLink.status === "paid") {
        // Calculate new period
        const billingPeriod = (tenantAddon.tenant_addons as any).billingPeriod || "monthly";
        const now = new Date();
        const periodEnd = new Date(now);
        if (billingPeriod === "yearly") {
          periodEnd.setFullYear(periodEnd.getFullYear() + 1);
        } else {
          periodEnd.setMonth(periodEnd.getMonth() + 1);
        }
        
        // Update add-on to active
        await db
          .update(tenantAddons)
          .set({
            status: "active",
            subscriptionStatus: "active",
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
            graceUntil: null,
            updatedAt: new Date(),
          })
          .where(eq(tenantAddons.id, tenantAddon.tenant_addons.id));
        
        console.log(`[entitlements-verify] Verified payment for ${addonCode}, activated until ${periodEnd.toISOString()}`);
        
        return res.json({
          status: "ACTIVATED",
          message: "Payment verified, add-on activated",
          periodEnd: periodEnd.toISOString(),
        });
      } else {
        return res.json({
          status: "PAYMENT_PENDING",
          message: `Payment status: ${paymentLink.status}`,
          paymentStatus: paymentLink.status,
        });
      }
    } catch (rpError: any) {
      console.error(`[entitlements-verify] Razorpay error:`, rpError.message);
      return res.status(400).json({
        error: "VERIFICATION_FAILED",
        message: "Could not verify payment status",
      });
    }
  } catch (error) {
    console.error("[entitlements-verify] Error:", error);
    res.status(500).json({
      error: "INTERNAL_ERROR",
      message: "Failed to verify payment",
    });
  }
});

export default router;
