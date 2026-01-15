import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { db } from "../db";
import { 
  globalPricingPlans, tenantSubscriptions, billingPayments, tenants,
  tenantPayrollAddon, payrollAddonTiers,
  type TenantSubscription, type BillingPayment,
} from "@shared/schema";
import { eq, and, desc, lte } from "drizzle-orm";
import { subscriptionService } from "../services/subscription";
import { offerService } from "../services/offers";
import { featureService } from "../core/features";
import { authenticateJWT } from "../core/auth-middleware";
import { getPaymentProvider } from "../core/payments/provider-factory";
import { resolveTenantId, logTenantResolution } from "../lib/resolveTenantId";
import { requirePermission, Permissions } from "../rbac/guards";
import { auditService } from "../core/audit";
import { razorpayService } from "../services/razorpay";
import type { BillingCycleKey, BillingCyclesMap } from "@shared/billing/types";
import { CYCLE_MONTHS, calculateSavings } from "@shared/billing/types";
import payrollAddonRoutes from "./billing/payroll-addon";
import razorpayWebhookRoutes from "./billing/razorpay-webhooks";
import { countryRolloutService } from "../services/country-rollout";
import { getAddonAccess } from "../core/addon-gating";

const router = Router();

router.use("/payroll-addon", payrollAddonRoutes);
router.use("/webhooks/razorpay", razorpayWebhookRoutes);

const optionalAuth = authenticateJWT({ required: false });
const requiredAuth = authenticateJWT({ required: true });

router.get("/addons/access", requiredAuth, async (req: Request, res: Response) => {
  try {
    const resolution = await resolveTenantId(req);
    if (resolution.error) {
      return res.status(resolution.error.status).json({
        code: resolution.error.code,
        message: resolution.error.message,
      });
    }

    const tenantId = resolution.tenantId!;
    const access = await getAddonAccess(tenantId);

    return res.json({
      success: true,
      addons: {
        payroll: {
          hasAccess: access.payroll,
          tierId: access.payrollTierId,
          status: access.payrollStatus || "not_subscribed",
        },
      },
    });
  } catch (error) {
    console.error("[billing] Error checking addon access:", error);
    res.status(500).json({ code: "SERVER_ERROR", error: "Failed to check addon access" });
  }
});

const selectPlanSchema = z.object({
  planCode: z.string().min(1),
});

const verifyPaymentSchema = z.object({
  paymentId: z.string().min(1),
  providerPaymentId: z.string().min(1),
  providerSignature: z.string().optional(), // Optional for mock mode, required for real providers
});

async function getPlanByCode(code: string) {
  const [plan] = await db
    .select()
    .from(globalPricingPlans)
    .where(and(eq(globalPricingPlans.code, code), eq(globalPricingPlans.isActive, true)))
    .limit(1);
  return plan || null;
}

async function getTenant(tenantId: string) {
  const [tenant] = await db
    .select()
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);
  return tenant || null;
}

// Map tenant country enum to plan code prefix (must match all values from tenantCountryEnum)
// Valid country values: india, uae, uk, malaysia, singapore, other
const TENANT_COUNTRY_TO_PLAN_PREFIX: Record<string, string> = {
  india: "india_",
  uae: "ae_",
  uk: "uk_",
  singapore: "sg_",
  malaysia: "my_",
  other: "global_", // 'other' country uses global plans
};

// Validate plan code matches tenant country - returns error message if mismatch, null if valid
function validatePlanCountryMatch(tenantCountry: string | null, planCode: string): string | null {
  const country = tenantCountry || "india";
  const expectedPrefix = TENANT_COUNTRY_TO_PLAN_PREFIX[country];
  
  if (!expectedPrefix) {
    return `Unknown tenant country: ${country}. Valid countries: ${Object.keys(TENANT_COUNTRY_TO_PLAN_PREFIX).join(", ")}`;
  }
  
  if (!planCode.startsWith(expectedPrefix)) {
    return `Plan is not available for your region (${country}). Expected plans starting with '${expectedPrefix}'.`;
  }
  
  return null;
}

async function getSubscription(tenantId: string): Promise<TenantSubscription | null> {
  const [sub] = await db
    .select()
    .from(tenantSubscriptions)
    .where(eq(tenantSubscriptions.tenantId, tenantId))
    .orderBy(desc(tenantSubscriptions.createdAt))
    .limit(1);
  return sub || null;
}

async function getPendingPayment(tenantId: string): Promise<BillingPayment | null> {
  const [payment] = await db
    .select()
    .from(billingPayments)
    .where(and(
      eq(billingPayments.tenantId, tenantId),
      eq(billingPayments.status, "created")
    ))
    .orderBy(desc(billingPayments.createdAt))
    .limit(1);
  return payment || null;
}

router.get("/subscription", requiredAuth, async (req: Request, res: Response) => {
  try {
    const resolution = await resolveTenantId(req);
    logTenantResolution(req, resolution, "GET /subscription");

    // Handle no-tenant case gracefully for onboarding flow
    // Users may be authenticated but not yet have a tenant
    if (resolution.error) {
      if (resolution.error.code === "TENANT_REQUIRED" || resolution.error.code === "TENANT_NOT_FOUND") {
        // User is authenticated but has no tenant yet - allow plan selection
        return res.json({
          subscription: null,
          plan: null,
          status: "NO_TENANT",
          planCode: null,
          isActive: false,
          canSelectPlan: true,
        });
      }
      // Only return 401 for actual auth issues
      return res.status(resolution.error.status).json({
        code: resolution.error.code,
        message: resolution.error.message,
      });
    }

    const tenantId = resolution.tenantId!;
    const subscription = await getSubscription(tenantId);
    
    if (!subscription) {
      return res.json({ 
        subscription: null, 
        plan: null, 
        status: "NO_SUBSCRIPTION", 
        planCode: null,
        isActive: false,
        tenantId,
        canSelectPlan: true,
      });
    }

    const plan = await subscriptionService.getPlan(subscription.planId);
    const pendingPlan = subscription.pendingPlanId 
      ? await subscriptionService.getPlan(subscription.pendingPlanId) 
      : null;
    
    const subStatus = subscription.status || "unknown";
    const isDowngrading = subStatus === "downgrading";
    const isPendingPayment = subStatus === "pending_payment";
    const isActive = subStatus === "active" || subStatus === "trialing" || isDowngrading;
    
    // Fetch downgrade plan if scheduled
    const downgradePlan = subscription.downgradePlanId 
      ? await subscriptionService.getPlan(subscription.downgradePlanId) 
      : null;
    
    return res.json({
      subscription: {
        ...subscription,
        pendingPlanId: subscription.pendingPlanId,
        pendingPaymentId: subscription.pendingPaymentId,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        downgradePlanId: subscription.downgradePlanId,
        downgradeEffectiveAt: subscription.downgradeEffectiveAt,
      },
      plan,
      pendingPlan,
      downgradePlan,
      status: isActive ? (isDowngrading ? "DOWNGRADING" : "ACTIVE") : subStatus.toUpperCase(),
      planCode: plan?.code || null,
      isActive,
      isDowngrading,
      isPendingPayment,
      currentPeriodEnd: subscription.currentPeriodEnd,
      pendingPlanId: subscription.pendingPlanId,
      pendingPaymentId: subscription.pendingPaymentId,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      downgradePlanId: subscription.downgradePlanId,
      downgradeEffectiveAt: subscription.downgradeEffectiveAt,
      tenantId,
    });
  } catch (error) {
    console.error("[billing] Error fetching subscription:", error);
    res.status(500).json({ code: "SERVER_ERROR", message: "Failed to fetch subscription" });
  }
});

// Country-specific plan code prefixes and mappings
const COUNTRY_PLAN_PREFIXES: Record<string, string> = {
  "IN": "india_",
  "india": "india_",
  "UK": "uk_",
  "AE": "ae_",
  "SG": "sg_",
  "MY": "my_",
  "US": "us_",
};

const COUNTRY_CURRENCIES: Record<string, string> = {
  "IN": "INR",
  "india": "INR",
  "UK": "GBP",
  "AE": "AED",
  "SG": "SGD",
  "MY": "MYR",
  "US": "USD",
};

router.get("/plans", async (req: Request, res: Response) => {
  try {
    const allPlans = await subscriptionService.getAllPlans();
    // Support both countryCode (ISO) and country (legacy) parameters
    const countryCode = (req.query.countryCode as string) || (req.query.country as string) || "IN";
    const normalizedCountry = countryCode.toUpperCase() === "INDIA" ? "IN" : countryCode.toUpperCase();
    
    // Get the plan prefix for this country
    const planPrefix = COUNTRY_PLAN_PREFIXES[normalizedCountry] || COUNTRY_PLAN_PREFIXES[countryCode] || "india_";
    
    // Filter to plans matching this country's prefix
    // Only show: active, public, and non-archived plans to tenants
    const countryPlans = allPlans
      .filter(plan => 
        plan.code.startsWith(planPrefix) &&
        plan.isActive !== false &&
        (plan.isPublic === true || plan.isPublic === undefined || plan.isPublic === null) &&
        !plan.archivedAt
      )
      .sort((a, b) => (a.sortOrder ?? 99) - (b.sortOrder ?? 99));
    
    const currency = COUNTRY_CURRENCIES[normalizedCountry] || COUNTRY_CURRENCIES[countryCode] || "INR";
    
    const plansWithPricing = await Promise.all(countryPlans.map(async (plan) => {
      const localPrices = await subscriptionService.getLocalPrices(plan.id);
      const countryPrice = localPrices.find(p => p.country?.toUpperCase() === normalizedCountry);
      
      return {
        ...plan,
        localPrice: countryPrice?.localPrice || plan.basePrice,
        currency,
        currencyCode: plan.currencyCode || currency,
        moduleAccess: subscriptionService.getAllModuleAccess(plan.tier),
        features: subscriptionService.getSubscriptionFeatures(plan.tier),
      };
    }));

    res.json({ plans: plansWithPricing });
  } catch (error) {
    console.error("[billing] Error fetching plans:", error);
    res.status(500).json({ error: "Failed to fetch plans" });
  }
});

router.post("/select-plan", requiredAuth, async (req: Request, res: Response) => {
  try {
    const context = (req as any).context;
    const userId = context?.user?.id;
    
    if (!userId) {
      return res.status(401).json({ code: "AUTH_REQUIRED", message: "Authentication required" });
    }

    const { planCode } = selectPlanSchema.parse(req.body);
    const plan = await getPlanByCode(planCode);
    
    if (!plan) {
      return res.status(404).json({ error: "Plan not found" });
    }

    // Try to resolve existing tenant, but don't fail if none exists
    const resolution = await resolveTenantId(req);
    logTenantResolution(req, resolution, "POST /select-plan");

    let tenantId: string;

    // If no tenant exists, return response guiding user to complete tenant setup first
    if (resolution.error?.code === "TENANT_REQUIRED" || resolution.error?.code === "TENANT_NOT_FOUND") {
      console.log(`[billing] User ${userId} has no tenant - redirecting to tenant signup`);
      
      // Return a response that tells frontend to redirect to tenant signup
      // The plan code is included so it can be restored after tenant creation
      return res.json({
        success: false,
        requiresTenantSetup: true,
        message: "Please complete your business setup first",
        redirectUrl: "/tenant-signup",
        pendingPlanCode: planCode,
      });
    } else if (resolution.error) {
      // Only return error for actual auth issues
      return res.status(resolution.error.status).json({
        code: resolution.error.code,
        message: resolution.error.message,
      });
    } else {
      tenantId = resolution.tenantId!;
    }

    const existingSub = await getSubscription(tenantId);
    if (existingSub?.status === "active" || existingSub?.status === "trialing") {
      return res.status(400).json({ 
        error: "Active subscription exists", 
        subscription: existingSub 
      });
    }

    const isFree = plan.tier === "free" || parseFloat(plan.basePrice) === 0;

    if (isFree) {
      if (existingSub) {
        await db
          .update(tenantSubscriptions)
          .set({ status: "cancelled", cancelledAt: new Date(), updatedAt: new Date() })
          .where(eq(tenantSubscriptions.id, existingSub.id));
      }

      const now = new Date();
      const periodEnd = new Date(now);
      periodEnd.setFullYear(periodEnd.getFullYear() + 100);

      const [subscription] = await db
        .insert(tenantSubscriptions)
        .values({
          tenantId,
          planId: plan.id,
          status: "active",
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
        })
        .returning();

      console.log(`[billing] Free plan activated for tenant ${tenantId}`);

      return res.json({
        success: true,
        subscription,
        plan,
        redirectUrl: "/dashboard",
      });
    }

    if (existingSub?.status === "pending_payment") {
      const pendingPayment = await getPendingPayment(tenantId);
      if (pendingPayment && pendingPayment.planId === plan.id) {
        return res.json({
          success: true,
          subscription: existingSub,
          plan,
          payment: pendingPayment,
          redirectUrl: "/checkout",
          requiresPayment: true,
        });
      }
    }

    if (existingSub) {
      await db
        .update(tenantSubscriptions)
        .set({ status: "cancelled", cancelledAt: new Date(), updatedAt: new Date() })
        .where(eq(tenantSubscriptions.id, existingSub.id));
    }

    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    const [subscription] = await db
      .insert(tenantSubscriptions)
      .values({
        tenantId,
        planId: plan.id,
        status: "pending_payment",
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
      })
      .returning();

    const [payment] = await db
      .insert(billingPayments)
      .values({
        tenantId,
        subscriptionId: subscription.id,
        planId: plan.id,
        provider: process.env.NODE_ENV === "production" ? "razorpay" : "mock",
        status: "created",
        amount: plan.basePrice,
        currency: "INR",
      })
      .returning();

    console.log(`[billing] Pending subscription created for tenant ${tenantId}, payment ${payment.id}`);

    return res.json({
      success: true,
      subscription,
      plan,
      payment,
      redirectUrl: "/checkout",
      requiresPayment: true,
    });
  } catch (error) {
    const context = (req as any).context;
    const userId = context?.user?.id || "unknown";
    const planCode = req.body?.planCode || "unknown";
    console.error(`[billing] Error selecting plan - userId: ${userId}, planCode: ${planCode}:`, error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ code: "VALIDATION_ERROR", error: "Invalid request", details: error.errors });
    }
    // Return more specific error messages
    if (error instanceof Error) {
      if (error.message.includes("tenant")) {
        return res.status(400).json({ code: "TENANT_ERROR", error: error.message });
      }
      if (error.message.includes("subscription")) {
        return res.status(400).json({ code: "SUBSCRIPTION_ERROR", error: error.message });
      }
    }
    res.status(500).json({ code: "INTERNAL_ERROR", error: "Failed to select plan" });
  }
});

router.post("/checkout/create", requiredAuth, async (req: Request, res: Response) => {
  try {
    const resolution = await resolveTenantId(req);
    logTenantResolution(req, resolution, "POST /checkout/create");

    if (resolution.error) {
      return res.status(resolution.error.status).json({
        code: resolution.error.code,
        message: resolution.error.message,
      });
    }

    const tenantId = resolution.tenantId!;
    const pendingPayment = await getPendingPayment(tenantId);
    if (!pendingPayment) {
      return res.status(404).json({ error: "No pending payment found" });
    }

    if (!pendingPayment.subscriptionId) {
      return res.status(400).json({ error: "Payment not linked to subscription" });
    }

    const plan = await subscriptionService.getPlan(pendingPayment.planId);
    if (!plan) {
      return res.status(404).json({ error: "Plan not found" });
    }

    const provider = getPaymentProvider();
    const amountPaise = Math.round(parseFloat(pendingPayment.amount) * 100);

    if (pendingPayment.providerOrderId && pendingPayment.metadata) {
      const storedPayload = (pendingPayment.metadata as any).checkoutPayload;
      if (storedPayload) {
        console.log(`[billing] Reusing existing order ${pendingPayment.providerOrderId} for payment ${pendingPayment.id}`);
        return res.json({
          success: true,
          provider: provider.name.toLowerCase(),
          paymentId: pendingPayment.id,
          checkoutPayload: storedPayload,
          plan: {
            name: plan.name,
            code: plan.code,
            tier: plan.tier,
          },
        });
      }
    }
    
    const orderResult = await provider.createOrder({
      tenantId,
      subscriptionId: pendingPayment.subscriptionId,
      paymentId: pendingPayment.id,
      amountPaise,
      currency: "INR",
      receipt: `rcpt_${pendingPayment.id}`,
      notes: {
        planCode: plan.code,
        planName: plan.name,
      },
    });

    await db
      .update(billingPayments)
      .set({ 
        providerOrderId: orderResult.providerOrderId,
        metadata: {
          ...(pendingPayment.metadata as object || {}),
          checkoutPayload: orderResult.checkoutPayload,
        },
        updatedAt: new Date(),
      })
      .where(eq(billingPayments.id, pendingPayment.id));

    return res.json({
      success: true,
      provider: orderResult.provider.toLowerCase(),
      paymentId: pendingPayment.id,
      checkoutPayload: orderResult.checkoutPayload,
      plan: {
        name: plan.name,
        code: plan.code,
        tier: plan.tier,
      },
    });
  } catch (error) {
    console.error("[billing] Error creating checkout:", error);
    res.status(500).json({ error: "Failed to create checkout session" });
  }
});

router.post("/checkout/verify", requiredAuth, requirePermission(Permissions.SUBSCRIPTION_CHANGE), async (req: Request, res: Response) => {
  try {
    const resolution = await resolveTenantId(req);
    logTenantResolution(req, resolution, "POST /checkout/verify");

    if (resolution.error) {
      return res.status(resolution.error.status).json({
        code: resolution.error.code,
        message: resolution.error.message,
      });
    }

    const tenantId = resolution.tenantId!;
    const { paymentId, providerPaymentId, providerSignature } = verifyPaymentSchema.parse(req.body);

    const [payment] = await db
      .select()
      .from(billingPayments)
      .where(and(
        eq(billingPayments.id, paymentId),
        eq(billingPayments.tenantId, tenantId)
      ))
      .limit(1);

    if (!payment) {
      return res.status(404).json({ code: "PAYMENT_NOT_FOUND", error: "Payment not found" });
    }

    if (payment.status === "paid") {
      return res.json({
        success: true,
        message: "Payment already verified",
        redirectUrl: "/dashboard",
      });
    }

    // State guard: check payment is in valid state for verification
    if (payment.status !== "created") {
      return res.status(409).json({ 
        code: "INVALID_PAYMENT_STATE", 
        error: `Payment cannot be verified in '${payment.status}' state` 
      });
    }

    // State guard: check subscription is in pending_payment status
    if (payment.subscriptionId) {
      const [subscription] = await db
        .select()
        .from(tenantSubscriptions)
        .where(eq(tenantSubscriptions.id, payment.subscriptionId))
        .limit(1);

      if (!subscription) {
        return res.status(404).json({ code: "SUBSCRIPTION_NOT_FOUND", error: "Associated subscription not found" });
      }

      if (subscription.status !== "pending_payment") {
        return res.status(409).json({ 
          code: "NO_PENDING_PAYMENT", 
          error: "Subscription is not awaiting payment" 
        });
      }

      // Verify pendingPaymentId matches
      if (subscription.pendingPaymentId && subscription.pendingPaymentId !== paymentId) {
        return res.status(409).json({ 
          code: "PAYMENT_MISMATCH", 
          error: "This payment does not match the pending payment for this subscription" 
        });
      }
    }

    // For mock mode, no signature required; for real providers, require signature
    const provider = getPaymentProvider();
    const isMockMode = provider.name === "MOCK";
    if (!isMockMode && !providerSignature) {
      return res.status(400).json({ 
        code: "SIGNATURE_REQUIRED", 
        error: "Payment signature is required for verification" 
      });
    }

    if (!payment.providerOrderId && !isMockMode) {
      return res.status(400).json({ code: "NO_ORDER", error: "No order created for this payment" });
    }

    // For mock mode, providerOrderId may be generated during checkout create
    // For real providers, it's guaranteed to exist due to the guard above
    const verifyResult = await provider.verifyPayment({
      providerOrderId: payment.providerOrderId!,
      providerPaymentId,
      providerSignature,
      paymentId,
      tenantId,
    });

    if (!verifyResult.verified) {
      await db
        .update(billingPayments)
        .set({ 
          status: "failed",
          errorMessage: verifyResult.reason || "Payment verification failed",
          updatedAt: new Date(),
        })
        .where(eq(billingPayments.id, paymentId));

      return res.status(400).json({ 
        success: false, 
        error: verifyResult.reason || "Payment verification failed" 
      });
    }

    await db
      .update(billingPayments)
      .set({ 
        status: "paid",
        providerPaymentId,
        providerSignature,
        paidAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(billingPayments.id, paymentId));

    if (payment.subscriptionId) {
      // Fetch the subscription to get pendingPlanId
      const [subscription] = await db
        .select()
        .from(tenantSubscriptions)
        .where(eq(tenantSubscriptions.id, payment.subscriptionId))
        .limit(1);

      if (subscription) {
        const oldPlanId = subscription.planId;
        const newPlanId = subscription.pendingPlanId || payment.planId;
        const newBillingCycle = subscription.pendingBillingCycle || subscription.currentBillingCycle || "monthly";

        // Activate the upgrade: set planId to pendingPlanId, update billing cycle, clear pending fields
        await db
          .update(tenantSubscriptions)
          .set({ 
            planId: newPlanId,
            currentBillingCycle: newBillingCycle,
            pendingPlanId: null,
            pendingBillingCycle: null,
            pendingPaymentId: null,
            pendingQuoteAmount: null,
            status: "active",
            cancelAtPeriodEnd: false,
            lastPaymentAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(tenantSubscriptions.id, payment.subscriptionId));

        const userId = req.context?.user?.id || req.tokenPayload?.userId;
        await auditService.log({
          userId: userId || "unknown",
          action: "update",
          resource: "subscription",
          resourceId: subscription.id,
          oldValue: { planId: oldPlanId, status: subscription.status },
          newValue: { planId: newPlanId, status: "active" },
          metadata: { operation: "upgrade_activated", tenantId, paymentId },
          ipAddress: req.ip,
          userAgent: req.headers["user-agent"],
        });

        console.log(`[billing] Payment verified, subscription upgraded from ${oldPlanId} to ${newPlanId} for tenant ${tenantId}`);
      }
    }

    console.log(`[billing] Payment verified for tenant ${tenantId}`);

    return res.json({
      success: true,
      message: "Payment verified successfully",
      redirectUrl: "/dashboard",
    });
  } catch (error) {
    console.error("[billing] Error verifying payment:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid request", details: error.errors });
    }
    res.status(500).json({ error: "Failed to verify payment" });
  }
});

// Checkout start - creates payment intent for plan upgrade/change
const checkoutStartSchema = z.object({
  planId: z.string().min(1),
  cycle: z.enum(["monthly", "quarterly", "half_yearly", "yearly"]).optional().default("monthly"),
});

router.post("/checkout/start", requiredAuth, requirePermission(Permissions.SUBSCRIPTION_CHANGE), async (req: Request, res: Response) => {
  try {
    const resolution = await resolveTenantId(req);
    logTenantResolution(req, resolution, "POST /checkout/start");

    if (resolution.error) {
      return res.status(resolution.error.status).json({
        code: resolution.error.code,
        message: resolution.error.message,
      });
    }

    const tenantId = resolution.tenantId!;
    const { planId, cycle } = checkoutStartSchema.parse(req.body);

    // Validate plan exists and is active
    const plan = await subscriptionService.getPlan(planId);
    if (!plan || !plan.isActive) {
      return res.status(404).json({ code: "PLAN_NOT_FOUND", message: "Plan not found or not active" });
    }

    // Check plan is not archived
    if (plan.archivedAt) {
      return res.status(400).json({ code: "PLAN_ARCHIVED", message: "This plan is no longer available" });
    }

    // Validate plan is public
    if (plan.isPublic === false) {
      return res.status(400).json({ code: "PLAN_NOT_PUBLIC", message: "This plan is not available for self-service" });
    }

    // Validate plan matches tenant country
    const tenant = await getTenant(tenantId);
    if (tenant) {
      const countryError = validatePlanCountryMatch(tenant.country, plan.code);
      if (countryError) {
        return res.status(400).json({ code: "PLAN_COUNTRY_MISMATCH", message: countryError });
      }
    }

    // Compute amount from billingCycles
    const planCycles = (plan.billingCycles || {}) as BillingCyclesMap;
    const cycleConfig = planCycles[cycle as BillingCycleKey];
    const amount = cycleConfig?.enabled && cycleConfig.price !== undefined 
      ? cycleConfig.price.toString() 
      : plan.basePrice;
    const currency = plan.currencyCode || "INR";

    // Get or create subscription
    let subscription = await getSubscription(tenantId);
    
    if (!subscription) {
      // Create new subscription in pending_payment state
      const now = new Date();
      const periodEnd = new Date(now);
      periodEnd.setMonth(periodEnd.getMonth() + (CYCLE_MONTHS[cycle as BillingCycleKey] || 1));
      
      const [newSub] = await db
        .insert(tenantSubscriptions)
        .values({
          tenantId,
          planId: plan.id,
          currentBillingCycle: cycle as "monthly" | "quarterly" | "half_yearly" | "yearly",
          status: "pending_payment",
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
        })
        .returning();
      subscription = newSub;
    }

    // Create billing payment
    const [payment] = await db
      .insert(billingPayments)
      .values({
        tenantId,
        subscriptionId: subscription.id,
        planId: plan.id,
        provider: process.env.NODE_ENV === "production" ? "razorpay" : "mock",
        status: "created",
        amount,
        currency,
        metadata: { 
          cycle,
          startedAt: new Date().toISOString(),
        },
      })
      .returning();

    // Update subscription with pending fields
    await db
      .update(tenantSubscriptions)
      .set({
        status: "pending_payment",
        pendingPlanId: plan.id,
        pendingBillingCycle: cycle as "monthly" | "quarterly" | "half_yearly" | "yearly",
        pendingPaymentId: payment.id,
        pendingQuoteAmount: amount,
        updatedAt: new Date(),
      })
      .where(eq(tenantSubscriptions.id, subscription.id));

    console.log(`[billing] Checkout started for tenant ${tenantId}, payment ${payment.id}, plan ${plan.code}, cycle ${cycle}`);

    return res.json({
      success: true,
      paymentId: payment.id,
      amount: parseFloat(amount),
      currency,
      plan: {
        id: plan.id,
        name: plan.name,
        code: plan.code,
        tier: plan.tier,
      },
      cycle,
      providerPayloadStub: {
        provider: process.env.NODE_ENV === "production" ? "razorpay" : "mock",
        ready: false,
        note: "Call /checkout/create to get full provider payload",
      },
    });
  } catch (error) {
    console.error("[billing] Error starting checkout:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ code: "VALIDATION_ERROR", error: "Invalid request", details: error.errors });
    }
    res.status(500).json({ code: "SERVER_ERROR", error: "Failed to start checkout" });
  }
});

// Mock verify endpoint - for dev testing only, blocked in production
router.post("/checkout/mock-verify", requiredAuth, async (req: Request, res: Response) => {
  // Block in production
  if (process.env.NODE_ENV === "production") {
    return res.status(403).json({ 
      code: "FORBIDDEN", 
      message: "Mock verification is not available in production" 
    });
  }

  try {
    const resolution = await resolveTenantId(req);
    if (resolution.error) {
      return res.status(resolution.error.status).json({
        code: resolution.error.code,
        message: resolution.error.message,
      });
    }

    const tenantId = resolution.tenantId!;
    const { paymentId, success = true } = req.body;

    if (!paymentId) {
      return res.status(400).json({ code: "MISSING_PAYMENT_ID", message: "paymentId is required" });
    }

    const [payment] = await db
      .select()
      .from(billingPayments)
      .where(and(
        eq(billingPayments.id, paymentId),
        eq(billingPayments.tenantId, tenantId)
      ))
      .limit(1);

    if (!payment) {
      return res.status(404).json({ code: "PAYMENT_NOT_FOUND", message: "Payment not found" });
    }

    if (payment.status !== "created") {
      return res.status(409).json({ 
        code: "INVALID_PAYMENT_STATE", 
        message: `Payment cannot be verified in '${payment.status}' state` 
      });
    }

    if (success) {
      // Mark payment as paid
      await db
        .update(billingPayments)
        .set({
          status: "paid",
          providerPaymentId: `mock_${Date.now()}`,
          paidAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(billingPayments.id, paymentId));

      // Activate the pending plan
      if (payment.subscriptionId) {
        const [subscription] = await db
          .select()
          .from(tenantSubscriptions)
          .where(eq(tenantSubscriptions.id, payment.subscriptionId))
          .limit(1);

        if (subscription) {
          const newPlanId = subscription.pendingPlanId || payment.planId;
          const newCycle = subscription.pendingBillingCycle || subscription.currentBillingCycle || "monthly";
          
          await db
            .update(tenantSubscriptions)
            .set({
              planId: newPlanId,
              currentBillingCycle: newCycle,
              pendingPlanId: null,
              pendingBillingCycle: null,
              pendingPaymentId: null,
              pendingQuoteAmount: null,
              status: "active",
              lastPaymentAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(tenantSubscriptions.id, subscription.id));

          // Clear feature cache
          featureService.clearCache(tenantId);
          
          console.log(`[billing] Mock verify success - activated plan ${newPlanId} for tenant ${tenantId}`);
        }
      }

      // Activate any pending add-ons from payment metadata
      const paymentMetadata = payment.metadata as any;
      if (paymentMetadata?.addons && Array.isArray(paymentMetadata.addons)) {
        for (const addon of paymentMetadata.addons) {
          if (addon.addonCode === "payroll") {
            const now = new Date();
            const periodEnd = new Date(now);
            if (addon.billingCycle === "yearly") {
              periodEnd.setFullYear(periodEnd.getFullYear() + 1);
            } else {
              periodEnd.setMonth(periodEnd.getMonth() + 1);
            }

            await db
              .update(tenantPayrollAddon)
              .set({
                enabled: true,
                subscriptionStatus: "active",
                currentPeriodStart: now,
                currentPeriodEnd: periodEnd,
                razorpayPaymentId: `mock_${Date.now()}`,
                updatedAt: now,
              })
              .where(eq(tenantPayrollAddon.tenantId, tenantId));

            console.log(`[billing] Mock verify - activated payroll addon for tenant ${tenantId}`);
          }
        }
      }

      return res.json({
        success: true,
        message: "Mock payment verified successfully",
        redirectUrl: "/dashboard",
      });
    } else {
      // Mark payment as failed
      await db
        .update(billingPayments)
        .set({
          status: "failed",
          errorMessage: "Mock payment failed",
          updatedAt: new Date(),
        })
        .where(eq(billingPayments.id, paymentId));

      // Clear pending fields
      if (payment.subscriptionId) {
        await db
          .update(tenantSubscriptions)
          .set({
            pendingPlanId: null,
            pendingBillingCycle: null,
            pendingPaymentId: null,
            pendingQuoteAmount: null,
            status: "active",
            updatedAt: new Date(),
          })
          .where(eq(tenantSubscriptions.id, payment.subscriptionId));
      }

      console.log(`[billing] Mock verify failed - cleared pending for tenant ${tenantId}`);

      return res.json({
        success: false,
        message: "Mock payment failed",
      });
    }
  } catch (error) {
    console.error("[billing] Error in mock verify:", error);
    res.status(500).json({ code: "SERVER_ERROR", error: "Failed to mock verify payment" });
  }
});

// Enhanced checkout with add-ons support
const checkoutWithAddonsSchema = z.object({
  planId: z.string().min(1),
  cycle: z.enum(["monthly", "quarterly", "half_yearly", "yearly"]).optional().default("monthly"),
  addons: z.array(z.object({
    addonCode: z.string().min(1),
    tierId: z.string().uuid(),
  })).optional().default([]),
});

router.post("/checkout/with-addons", requiredAuth, requirePermission(Permissions.SUBSCRIPTION_CHANGE), async (req: Request, res: Response) => {
  try {
    const resolution = await resolveTenantId(req);
    logTenantResolution(req, resolution, "POST /checkout/with-addons");

    if (resolution.error) {
      return res.status(resolution.error.status).json({
        code: resolution.error.code,
        message: resolution.error.message,
      });
    }

    const tenantId = resolution.tenantId!;
    const { planId, cycle, addons } = checkoutWithAddonsSchema.parse(req.body);

    // Validate plan exists and is active
    const plan = await subscriptionService.getPlan(planId);
    if (!plan || !plan.isActive) {
      return res.status(404).json({ code: "PLAN_NOT_FOUND", message: "Plan not found or not active" });
    }

    // Get tenant for country validation
    const tenant = await getTenant(tenantId);
    if (!tenant) {
      return res.status(404).json({ code: "TENANT_NOT_FOUND", message: "Tenant not found" });
    }

    // Validate plan matches tenant country
    const countryError = validatePlanCountryMatch(tenant.country, plan.code);
    if (countryError) {
      return res.status(400).json({ code: "PLAN_COUNTRY_MISMATCH", message: countryError });
    }

    // Calculate plan amount
    const planCycles = (plan.billingCycles || {}) as BillingCyclesMap;
    const cycleConfig = planCycles[cycle as BillingCycleKey];
    const planAmount = cycleConfig?.enabled && cycleConfig.price !== undefined 
      ? parseFloat(cycleConfig.price.toString()) 
      : parseFloat(plan.basePrice);
    const currency = plan.currencyCode || "INR";

    // Validate and calculate addon amounts
    let addonTotal = 0;
    const validatedAddons: Array<{
      addonCode: string;
      tierId: string;
      tierName: string;
      amount: number;
      billingCycle: string;
    }> = [];

    for (const addon of addons) {
      if (addon.addonCode === "payroll") {
        // Check payroll access for country
        const payrollAccess = await countryRolloutService.checkPayrollAccess(tenant.country || "IN", tenantId);
        if (!payrollAccess.allowed) {
          return res.status(403).json({ 
            code: "ADDON_NOT_AVAILABLE", 
            message: payrollAccess.message || "Payroll add-on is not available for your country" 
          });
        }

        // Get tier
        const [tier] = await db
          .select()
          .from(payrollAddonTiers)
          .where(and(
            eq(payrollAddonTiers.id, addon.tierId),
            eq(payrollAddonTiers.isActive, true)
          ))
          .limit(1);

        if (!tier) {
          return res.status(404).json({ code: "TIER_NOT_FOUND", message: "Addon tier not found" });
        }

        const addonBillingCycle = cycle === "yearly" || cycle === "half_yearly" ? "yearly" : "monthly";
        const tierAmount = addonBillingCycle === "yearly" 
          ? parseFloat(tier.yearlyPrice) 
          : parseFloat(tier.monthlyPrice);

        addonTotal += tierAmount;
        validatedAddons.push({
          addonCode: addon.addonCode,
          tierId: tier.id,
          tierName: tier.tierName,
          amount: tierAmount,
          billingCycle: addonBillingCycle,
        });
      }
    }

    const totalAmount = planAmount + addonTotal;

    // Get or create subscription
    let subscription = await getSubscription(tenantId);
    
    if (!subscription) {
      const now = new Date();
      const periodEnd = new Date(now);
      periodEnd.setMonth(periodEnd.getMonth() + (CYCLE_MONTHS[cycle as BillingCycleKey] || 1));
      
      const [newSub] = await db
        .insert(tenantSubscriptions)
        .values({
          tenantId,
          planId: plan.id,
          currentBillingCycle: cycle as "monthly" | "quarterly" | "half_yearly" | "yearly",
          status: "pending_payment",
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
        })
        .returning();
      subscription = newSub;
    }

    // Create billing payment with addon info in metadata
    const [payment] = await db
      .insert(billingPayments)
      .values({
        tenantId,
        subscriptionId: subscription.id,
        planId: plan.id,
        provider: process.env.NODE_ENV === "production" ? "razorpay" : "mock",
        status: "created",
        amount: totalAmount.toFixed(2),
        currency,
        metadata: { 
          cycle,
          addons: validatedAddons,
          planAmount,
          addonTotal,
          startedAt: new Date().toISOString(),
        },
      })
      .returning();

    // Create pending payroll addon records
    for (const addon of validatedAddons) {
      if (addon.addonCode === "payroll") {
        const existing = await db
          .select()
          .from(tenantPayrollAddon)
          .where(eq(tenantPayrollAddon.tenantId, tenantId))
          .limit(1);

        if (existing.length > 0) {
          await db
            .update(tenantPayrollAddon)
            .set({
              tierId: addon.tierId,
              billingCycle: addon.billingCycle as "monthly" | "yearly",
              price: addon.amount.toFixed(2),
              subscriptionStatus: "pending_payment",
              updatedAt: new Date(),
            })
            .where(eq(tenantPayrollAddon.id, existing[0].id));
        } else {
          await db.insert(tenantPayrollAddon).values({
            tenantId,
            tierId: addon.tierId,
            enabled: false,
            billingCycle: addon.billingCycle as "monthly" | "yearly",
            price: addon.amount.toFixed(2),
            subscriptionStatus: "pending_payment",
          });
        }
      }
    }

    // Update subscription with pending fields
    await db
      .update(tenantSubscriptions)
      .set({
        status: "pending_payment",
        pendingPlanId: plan.id,
        pendingBillingCycle: cycle as "monthly" | "quarterly" | "half_yearly" | "yearly",
        pendingPaymentId: payment.id,
        pendingQuoteAmount: totalAmount.toFixed(2),
        updatedAt: new Date(),
      })
      .where(eq(tenantSubscriptions.id, subscription.id));

    console.log(`[billing] Checkout with addons started for tenant ${tenantId}, payment ${payment.id}, plan ${plan.code}, addons: ${validatedAddons.length}`);

    return res.json({
      success: true,
      paymentId: payment.id,
      amount: totalAmount,
      currency,
      plan: {
        id: plan.id,
        name: plan.name,
        code: plan.code,
        tier: plan.tier,
        amount: planAmount,
      },
      addons: validatedAddons,
      cycle,
      requiresPayment: totalAmount > 0,
    });
  } catch (error) {
    console.error("[billing] Error starting checkout with addons:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ code: "VALIDATION_ERROR", error: "Invalid request", details: error.errors });
    }
    res.status(500).json({ code: "SERVER_ERROR", error: "Failed to start checkout" });
  }
});

router.get("/pending-payment", requiredAuth, async (req: Request, res: Response) => {
  try {
    const resolution = await resolveTenantId(req);
    logTenantResolution(req, resolution, "GET /pending-payment");

    if (resolution.error) {
      return res.status(resolution.error.status).json({
        code: resolution.error.code,
        message: resolution.error.message,
      });
    }

    const tenantId = resolution.tenantId!;
    const payment = await getPendingPayment(tenantId);
    if (!payment) {
      return res.json({ payment: null });
    }

    const plan = await subscriptionService.getPlan(payment.planId);

    return res.json({
      payment,
      plan,
    });
  } catch (error) {
    console.error("[billing] Error fetching pending payment:", error);
    res.status(500).json({ error: "Failed to fetch pending payment" });
  }
});

const changeSubscriptionSchema = z.object({
  planId: z.string().min(1),
  action: z.enum(["upgrade", "downgrade"]),
  billingCycle: z.enum(["monthly", "quarterly", "half_yearly", "yearly"]).optional().default("monthly"),
});

router.post(
  "/subscription/change",
  requiredAuth,
  requirePermission(Permissions.SUBSCRIPTION_CHANGE),
  async (req: Request, res: Response) => {
    try {
      const resolution = await resolveTenantId(req);
      logTenantResolution(req, resolution, "POST /subscription/change");

      if (resolution.error) {
        return res.status(resolution.error.status).json({
          code: resolution.error.code,
          message: resolution.error.message,
        });
      }

      const tenantId = resolution.tenantId!;
      const { planId, action, billingCycle } = changeSubscriptionSchema.parse(req.body);

      const subscription = await getSubscription(tenantId);
      if (!subscription) {
        return res.status(404).json({
          code: "NO_SUBSCRIPTION",
          message: "No active subscription found",
        });
      }

      if (subscription.status !== "active" && subscription.status !== "trialing" && subscription.status !== "downgrading") {
        return res.status(400).json({
          code: "INVALID_SUBSCRIPTION_STATUS",
          message: "Cannot change subscription in current status",
        });
      }

      const newPlan = await subscriptionService.getPlan(planId);
      if (!newPlan || !newPlan.isActive) {
        return res.status(404).json({
          code: "PLAN_NOT_FOUND",
          message: "Target plan not found or not active",
        });
      }

      // Validate plan matches tenant country
      const tenant = await getTenant(tenantId);
      if (tenant) {
        const countryError = validatePlanCountryMatch(tenant.country, newPlan.code);
        if (countryError) {
          return res.status(400).json({
            code: "PLAN_COUNTRY_MISMATCH",
            message: countryError,
          });
        }
      }

      // Validate plan is public (not a private/reseller-only plan)
      if (newPlan.isPublic === false) {
        return res.status(400).json({
          code: "PLAN_NOT_PUBLIC",
          message: "This plan is not available for self-service subscription changes.",
        });
      }

      const currentPlan = await subscriptionService.getPlan(subscription.planId);
      if (!currentPlan) {
        return res.status(500).json({
          code: "CURRENT_PLAN_NOT_FOUND",
          message: "Current plan not found",
        });
      }

      const currentPrice = parseFloat(currentPlan.basePrice);
      const newPrice = parseFloat(newPlan.basePrice);
      const userId = req.context?.user?.id || req.tokenPayload?.userId;

      if (action === "upgrade") {
        if (newPrice <= currentPrice) {
          return res.status(400).json({
            code: "INVALID_UPGRADE",
            message: "Target plan is not a higher tier than current plan",
          });
        }

        if (newPlan.tier === "free" || newPrice === 0) {
          await db
            .update(tenantSubscriptions)
            .set({
              planId: newPlan.id,
              pendingPlanId: null,
              cancelAtPeriodEnd: false,
              status: "active",
              updatedAt: new Date(),
            })
            .where(eq(tenantSubscriptions.id, subscription.id));

          await auditService.log({
            userId: userId || "unknown",
            action: "update",
            resource: "subscription",
            resourceId: subscription.id,
            oldValue: { planId: subscription.planId },
            newValue: { planId: newPlan.id },
            metadata: { operation: "upgrade_to_free", tenantId },
            ipAddress: req.ip,
            userAgent: req.headers["user-agent"],
          });

          // Clear feature cache after plan change
          featureService.clearCache(tenantId);
          console.log(`[billing] Subscription upgraded to free for tenant ${tenantId}, feature cache cleared`);
          
          return res.json({
            success: true,
            requiresPayment: false,
            message: "Subscription upgraded successfully",
          });
        }

        // Calculate cycle-based price
        const planCycles = (newPlan.billingCycles || {}) as BillingCyclesMap;
        const cycleConfig = planCycles[billingCycle as BillingCycleKey];
        const cyclePrice = cycleConfig?.enabled && cycleConfig.price !== undefined 
          ? cycleConfig.price.toString() 
          : newPlan.basePrice;

        // Create a payment record for the upgrade
        const [payment] = await db
          .insert(billingPayments)
          .values({
            tenantId,
            subscriptionId: subscription.id,
            planId: newPlan.id,
            provider: "mock",
            status: "created",
            amount: cyclePrice,
            currency: newPlan.currencyCode || "INR",
            metadata: { 
              upgradeFrom: subscription.planId, 
              upgradeTo: newPlan.id,
              billingCycle,
            },
          })
          .returning();

        // Update subscription to pending_payment status with pending billing cycle
        const [updatedSubscription] = await db
          .update(tenantSubscriptions)
          .set({
            status: "pending_payment",
            pendingPlanId: newPlan.id,
            pendingBillingCycle: billingCycle as "monthly" | "quarterly" | "half_yearly" | "yearly",
            pendingPaymentId: payment.id,
            pendingQuoteAmount: cyclePrice,
            updatedAt: new Date(),
          })
          .where(eq(tenantSubscriptions.id, subscription.id))
          .returning();

        await auditService.log({
          userId: userId || "unknown",
          action: "update",
          resource: "subscription",
          resourceId: subscription.id,
          oldValue: { planId: subscription.planId, status: subscription.status },
          newValue: { pendingPlanId: newPlan.id, status: "pending_payment", pendingPaymentId: payment.id },
          metadata: { operation: "upgrade_initiated", tenantId, targetPlanId: planId, paymentId: payment.id },
          ipAddress: req.ip,
          userAgent: req.headers["user-agent"],
        });

        console.log(`[billing] Upgrade initiated for tenant ${tenantId} to plan ${planId}, payment ${payment.id}`);
        return res.json({
          success: true,
          requiresPayment: true,
          paymentId: payment.id,
          pendingPlanId: newPlan.id,
          plan: newPlan,
          subscription: updatedSubscription,
          redirectUrl: `/checkout?paymentId=${payment.id}`,
        });
      }

      if (action === "downgrade") {
        if (newPrice >= currentPrice && currentPlan.tier !== "free") {
          return res.status(400).json({
            code: "INVALID_DOWNGRADE",
            message: "Target plan is not a lower tier than current plan",
          });
        }

        // Downgrade is scheduled for period end (not immediate)
        const [updatedSubscription] = await db
          .update(tenantSubscriptions)
          .set({
            status: "downgrading",
            downgradePlanId: newPlan.id,
            downgradeBillingCycle: billingCycle as "monthly" | "quarterly" | "half_yearly" | "yearly",
            downgradeEffectiveAt: subscription.currentPeriodEnd,
            cancelAtPeriodEnd: true,
            updatedAt: new Date(),
          })
          .where(eq(tenantSubscriptions.id, subscription.id))
          .returning();

        await auditService.log({
          userId: userId || "unknown",
          action: "update",
          resource: "subscription",
          resourceId: subscription.id,
          oldValue: { planId: subscription.planId, status: subscription.status },
          newValue: { downgradePlanId: newPlan.id, status: "downgrading", downgradeEffectiveAt: subscription.currentPeriodEnd },
          metadata: {
            operation: "downgrade_scheduled",
            tenantId,
            effectiveAt: subscription.currentPeriodEnd,
          },
          ipAddress: req.ip,
          userAgent: req.headers["user-agent"],
        });

        console.log(`[billing] Downgrade scheduled for tenant ${tenantId} to plan ${planId} effective ${subscription.currentPeriodEnd}`);

        return res.json({
          success: true,
          subscription: updatedSubscription,
          pendingPlan: newPlan,
          effectiveAt: subscription.currentPeriodEnd,
          message: "Downgrade scheduled for end of billing period",
        });
      }

      return res.status(400).json({ code: "INVALID_ACTION", message: "Invalid action" });
    } catch (error) {
      console.error("[billing] Error changing subscription:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid request", details: error.errors });
      }
      res.status(500).json({ error: "Failed to change subscription" });
    }
  }
);

router.post(
  "/subscription/cancel-downgrade",
  requiredAuth,
  requirePermission(Permissions.SUBSCRIPTION_CHANGE),
  async (req: Request, res: Response) => {
    try {
      const resolution = await resolveTenantId(req);
      logTenantResolution(req, resolution, "POST /subscription/cancel-downgrade");

      if (resolution.error) {
        return res.status(resolution.error.status).json({
          code: resolution.error.code,
          message: resolution.error.message,
        });
      }

      const tenantId = resolution.tenantId!;
      const subscription = await getSubscription(tenantId);

      if (!subscription) {
        return res.status(404).json({
          code: "NO_SUBSCRIPTION",
          message: "No subscription found",
        });
      }

      if (subscription.status !== "downgrading" || !subscription.pendingPlanId) {
        return res.status(400).json({
          code: "NO_PENDING_DOWNGRADE",
          message: "No pending downgrade to cancel",
        });
      }

      const userId = req.context?.user?.id || req.tokenPayload?.userId;

      const [updatedSubscription] = await db
        .update(tenantSubscriptions)
        .set({
          status: "active",
          pendingPlanId: null,
          cancelAtPeriodEnd: false,
          updatedAt: new Date(),
        })
        .where(eq(tenantSubscriptions.id, subscription.id))
        .returning();

      await auditService.log({
        userId: userId || "unknown",
        action: "update",
        resource: "subscription",
        resourceId: subscription.id,
        oldValue: { status: "downgrading", pendingPlanId: subscription.pendingPlanId },
        newValue: { status: "active", pendingPlanId: null },
        metadata: { operation: "downgrade_cancelled", tenantId },
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });

      console.log(`[billing] Downgrade cancelled for tenant ${tenantId}`);

      return res.json({
        success: true,
        subscription: updatedSubscription,
        message: "Downgrade cancelled successfully",
      });
    } catch (error) {
      console.error("[billing] Error cancelling downgrade:", error);
      res.status(500).json({ error: "Failed to cancel downgrade" });
    }
  }
);

router.post(
  "/subscription/cancel-pending-upgrade",
  requiredAuth,
  requirePermission(Permissions.SUBSCRIPTION_CHANGE),
  async (req: Request, res: Response) => {
    try {
      const resolution = await resolveTenantId(req);
      logTenantResolution(req, resolution, "POST /subscription/cancel-pending-upgrade");

      if (resolution.error) {
        return res.status(resolution.error.status).json({
          code: resolution.error.code,
          message: resolution.error.message,
        });
      }

      const tenantId = resolution.tenantId!;
      const subscription = await getSubscription(tenantId);

      if (!subscription) {
        return res.status(404).json({
          code: "NO_SUBSCRIPTION",
          message: "No subscription found",
        });
      }

      if (subscription.status !== "pending_payment") {
        return res.json({
          success: true,
          message: "No pending upgrade",
          planId: subscription.planId,
          status: subscription.status,
        });
      }

      const userId = req.context?.user?.id || req.tokenPayload?.userId;

      if (subscription.pendingPaymentId) {
        const [payment] = await db
          .select()
          .from(billingPayments)
          .where(eq(billingPayments.id, subscription.pendingPaymentId))
          .limit(1);

        if (payment) {
          if (payment.status === "paid") {
            return res.status(409).json({
              code: "PAYMENT_ALREADY_CAPTURED",
              message: "Payment already completed; cannot cancel pending upgrade.",
            });
          }

          await db
            .update(billingPayments)
            .set({
              status: "cancelled",
              updatedAt: new Date(),
              metadata: {
                ...(payment.metadata as object || {}),
                cancelledAt: new Date().toISOString(),
                cancelledBy: userId,
                cancelReason: "USER_CANCELLED_UPGRADE",
              },
            })
            .where(eq(billingPayments.id, payment.id));

          await auditService.log({
            userId: userId || "unknown",
            action: "update",
            resource: "payment",
            resourceId: payment.id,
            oldValue: { status: payment.status },
            newValue: { status: "cancelled" },
            metadata: {
              operation: "payment_cancelled",
              tenantId,
              reason: "USER_CANCELLED_UPGRADE",
            },
            ipAddress: req.ip,
            userAgent: req.headers["user-agent"],
          });
        }
      }

      const oldSubscriptionState = {
        status: subscription.status,
        pendingPlanId: subscription.pendingPlanId,
        pendingPaymentId: subscription.pendingPaymentId,
      };

      const [updatedSubscription] = await db
        .update(tenantSubscriptions)
        .set({
          status: "active",
          pendingPlanId: null,
          pendingPaymentId: null,
          cancelAtPeriodEnd: false,
          updatedAt: new Date(),
        })
        .where(eq(tenantSubscriptions.id, subscription.id))
        .returning();

      await auditService.log({
        userId: userId || "unknown",
        action: "update",
        resource: "subscription",
        resourceId: subscription.id,
        oldValue: oldSubscriptionState,
        newValue: {
          status: "active",
          pendingPlanId: null,
          pendingPaymentId: null,
        },
        metadata: {
          operation: "pending_upgrade_cancelled",
          tenantId,
        },
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });

      console.log(`[billing] Pending upgrade cancelled for tenant ${tenantId}`);

      return res.json({
        success: true,
        planId: updatedSubscription.planId,
        status: "active",
        message: "Pending upgrade cancelled successfully",
      });
    } catch (error) {
      console.error("[billing] Error cancelling pending upgrade:", error);
      res.status(500).json({ error: "Failed to cancel pending upgrade" });
    }
  }
);

const razorpayOrderSchema = z.object({});

const razorpayVerifySchema = z.object({
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
});

router.post(
  "/razorpay/order",
  requiredAuth,
  requirePermission(Permissions.SUBSCRIPTION_CHANGE),
  async (req: Request, res: Response) => {
    try {
      const resolution = await resolveTenantId(req);
      if (resolution.error) {
        return res.status(resolution.error.status).json({
          code: resolution.error.code,
          message: resolution.error.message,
        });
      }
      const tenantId = resolution.tenantId!;

      if (!razorpayService.isConfigured()) {
        return res.status(503).json({
          code: "PAYMENT_PROVIDER_NOT_CONFIGURED",
          message: "Razorpay is not configured",
        });
      }

      const subscription = await getSubscription(tenantId);
      if (!subscription) {
        return res.status(404).json({
          code: "SUBSCRIPTION_NOT_FOUND",
          message: "No subscription found",
        });
      }

      if (subscription.status !== "pending_payment") {
        return res.status(400).json({
          code: "INVALID_SUBSCRIPTION_STATUS",
          message: "No pending payment for this subscription",
        });
      }

      const pendingPayment = await getPendingPayment(tenantId);
      if (!pendingPayment) {
        return res.status(404).json({
          code: "NO_PENDING_PAYMENT",
          message: "No pending payment found",
        });
      }

      const plan = subscription.pendingPlanId
        ? await subscriptionService.getPlan(subscription.pendingPlanId)
        : null;

      const amountPaise = Math.round(parseFloat(pendingPayment.amount) * 100);
      const currency = pendingPayment.currency || "INR";

      const order = await razorpayService.createOrder({
        amount: amountPaise,
        currency: currency.toUpperCase(),
        receipt: pendingPayment.id,
        notes: {
          tenantId,
          paymentId: pendingPayment.id,
          planId: subscription.pendingPlanId || "",
        },
      });

      await db
        .update(billingPayments)
        .set({
          providerOrderId: order.id,
          updatedAt: new Date(),
        })
        .where(eq(billingPayments.id, pendingPayment.id));

      console.log(`[razorpay] Order created: ${order.id} for payment ${pendingPayment.id}`);

      res.json({
        success: true,
        orderId: order.id,
        amount: amountPaise,
        currency: currency.toUpperCase(),
        keyId: razorpayService.getKeyId(),
        paymentId: pendingPayment.id,
        plan: plan ? { name: plan.name, tier: plan.tier } : null,
      });
    } catch (error) {
      console.error("[razorpay] Error creating order:", error);
      res.status(500).json({ error: "Failed to create Razorpay order" });
    }
  }
);

router.post(
  "/razorpay/verify",
  requiredAuth,
  async (req: Request, res: Response) => {
    try {
      const resolution = await resolveTenantId(req);
      if (resolution.error) {
        return res.status(resolution.error.status).json({
          code: resolution.error.code,
          message: resolution.error.message,
        });
      }
      const tenantId = resolution.tenantId!;

      const parsed = razorpayVerifySchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          code: "VALIDATION_ERROR",
          message: "Invalid request body",
          errors: parsed.error.flatten().fieldErrors,
        });
      }

      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = parsed.data;

      const isValidSignature = razorpayService.verifyPaymentSignature({
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
      });

      if (!isValidSignature) {
        console.warn(`[razorpay] Invalid signature for order ${razorpay_order_id}`);
        return res.status(400).json({
          code: "INVALID_SIGNATURE",
          message: "Payment signature verification failed",
        });
      }

      const [payment] = await db
        .select()
        .from(billingPayments)
        .where(
          and(
            eq(billingPayments.tenantId, tenantId),
            eq(billingPayments.providerOrderId, razorpay_order_id)
          )
        )
        .limit(1);

      if (!payment) {
        return res.status(404).json({
          code: "PAYMENT_NOT_FOUND",
          message: "Payment not found for this order",
        });
      }

      if (payment.status === "paid") {
        return res.json({
          success: true,
          message: "Payment already verified",
          redirectUrl: "/dashboard",
        });
      }

      await db
        .update(billingPayments)
        .set({
          status: "paid",
          providerPaymentId: razorpay_payment_id,
          paidAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(billingPayments.id, payment.id));

      const subscription = await getSubscription(tenantId);
      if (!subscription || !subscription.pendingPlanId) {
        return res.status(400).json({
          code: "SUBSCRIPTION_ERROR",
          message: "No pending plan to activate",
        });
      }

      const newPlan = await subscriptionService.getPlan(subscription.pendingPlanId);
      if (!newPlan) {
        return res.status(500).json({
          code: "PLAN_NOT_FOUND",
          message: "Pending plan not found",
        });
      }

      const newPeriodStart = new Date();
      const newPeriodEnd = new Date();
      newPeriodEnd.setMonth(newPeriodEnd.getMonth() + 1);

      await db
        .update(tenantSubscriptions)
        .set({
          planId: subscription.pendingPlanId,
          pendingPlanId: null,
          pendingPaymentId: null,
          status: "active",
          currentPeriodStart: newPeriodStart,
          currentPeriodEnd: newPeriodEnd,
          updatedAt: new Date(),
        })
        .where(eq(tenantSubscriptions.id, subscription.id));

      await auditService.log({
        userId: (req as any).user?.userId || "system",
        tenantId,
        action: "update",
        resource: "subscription",
        resourceId: subscription.id,
        oldValue: { planId: subscription.planId, status: "pending_payment" },
        newValue: { planId: subscription.pendingPlanId, status: "active" },
        metadata: {
          operation: "upgrade_activated",
          razorpayOrderId: razorpay_order_id,
          razorpayPaymentId: razorpay_payment_id,
        },
      });

      // Clear feature cache after plan activation
      featureService.clearCache(tenantId);
      console.log(`[razorpay] Payment verified and subscription activated: ${subscription.id}, feature cache cleared`);

      res.json({
        success: true,
        message: "Payment verified and subscription activated",
        redirectUrl: "/dashboard",
        planId: subscription.pendingPlanId,
        planName: newPlan.name,
      });
    } catch (error) {
      console.error("[razorpay] Error verifying payment:", error);
      res.status(500).json({ error: "Failed to verify payment" });
    }
  }
);

router.post("/razorpay/webhook", async (req: Request, res: Response) => {
  try {
    const signature = req.headers["x-razorpay-signature"] as string;
    const body = JSON.stringify(req.body);

    if (!signature) {
      console.warn("[razorpay-webhook] Missing signature header");
      return res.status(400).json({ error: "Missing signature" });
    }

    if (!process.env.RAZORPAY_WEBHOOK_SECRET) {
      console.warn("[razorpay-webhook] RAZORPAY_WEBHOOK_SECRET not configured - webhook processing disabled. Events will be logged but not processed.");
      console.log(`[razorpay-webhook] Unprocessed event: ${req.body?.event}`);
      return res.json({ received: true, warning: "Webhook secret not configured" });
    }

    const isValid = razorpayService.verifyWebhookSignature(body, signature);
    if (!isValid) {
      console.warn("[razorpay-webhook] Invalid webhook signature - possible tampering or misconfigured secret");
      return res.status(400).json({ error: "Invalid signature" });
    }

    const event = req.body;
    const eventType = event.event;

    console.log(`[razorpay-webhook] Received event: ${eventType}`);

    if (eventType === "payment.captured") {
      const paymentEntity = event.payload?.payment?.entity;
      const orderId = paymentEntity?.order_id;
      const paymentId = paymentEntity?.id;

      if (orderId) {
        const [payment] = await db
          .select()
          .from(billingPayments)
          .where(eq(billingPayments.providerOrderId, orderId))
          .limit(1);

        if (payment && payment.status !== "paid") {
          await db
            .update(billingPayments)
            .set({
              status: "paid",
              providerPaymentId: paymentId,
              paidAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(billingPayments.id, payment.id));

          const subscription = await getSubscription(payment.tenantId);
          if (subscription?.pendingPlanId) {
            const newPlan = await subscriptionService.getPlan(subscription.pendingPlanId);
            if (newPlan) {
              const newPeriodEnd = new Date();
              newPeriodEnd.setMonth(newPeriodEnd.getMonth() + 1);

              await db
                .update(tenantSubscriptions)
                .set({
                  planId: subscription.pendingPlanId,
                  pendingPlanId: null,
                  pendingPaymentId: null,
                  status: "active",
                  currentPeriodStart: new Date(),
                  currentPeriodEnd: newPeriodEnd,
                  updatedAt: new Date(),
                })
                .where(eq(tenantSubscriptions.id, subscription.id));

              // Clear feature cache after plan activation via webhook
              featureService.clearCache(payment.tenantId);
              console.log(`[razorpay-webhook] Subscription activated via webhook: ${subscription.id}, feature cache cleared`);
            }
          }
        }
      }
    }

    res.json({ received: true });
  } catch (error) {
    console.error("[razorpay-webhook] Error processing webhook:", error);
    res.status(500).json({ error: "Webhook processing failed" });
  }
});

export async function processScheduledDowngrades(): Promise<number> {
  const now = new Date();
  let processedCount = 0;

  try {
    const pendingDowngrades = await db
      .select()
      .from(tenantSubscriptions)
      .where(
        and(
          eq(tenantSubscriptions.cancelAtPeriodEnd, true),
          lte(tenantSubscriptions.currentPeriodEnd, now)
        )
      );

    for (const subscription of pendingDowngrades) {
      if (!subscription.pendingPlanId) {
        continue;
      }

      const newPlan = await subscriptionService.getPlan(subscription.pendingPlanId);
      if (!newPlan) {
        console.error(`[billing] Pending plan ${subscription.pendingPlanId} not found for subscription ${subscription.id}`);
        continue;
      }

      const newPeriodStart = new Date();
      const newPeriodEnd = new Date();
      if (newPlan.tier === "free" || parseFloat(newPlan.basePrice) === 0) {
        newPeriodEnd.setFullYear(newPeriodEnd.getFullYear() + 100);
      } else {
        newPeriodEnd.setMonth(newPeriodEnd.getMonth() + 1);
      }

      await db
        .update(tenantSubscriptions)
        .set({
          planId: subscription.pendingPlanId,
          pendingPlanId: null,
          cancelAtPeriodEnd: false,
          status: "active",
          currentPeriodStart: newPeriodStart,
          currentPeriodEnd: newPeriodEnd,
          updatedAt: new Date(),
        })
        .where(eq(tenantSubscriptions.id, subscription.id));

      await auditService.log({
        userId: "system",
        action: "update",
        resource: "subscription",
        resourceId: subscription.id,
        oldValue: { planId: subscription.planId, status: "downgrading" },
        newValue: { planId: subscription.pendingPlanId, status: "active" },
        metadata: {
          operation: "SUBSCRIPTION_DOWNGRADED_AT_PERIOD_END",
          tenantId: subscription.tenantId,
          previousPlanId: subscription.planId,
          newPlanId: subscription.pendingPlanId,
          effectiveAt: subscription.currentPeriodEnd,
        },
      });

      // Clear feature cache after downgrade
      featureService.clearCache(subscription.tenantId);
      console.log(`[billing] Downgrade applied for subscription ${subscription.id}: ${subscription.planId} -> ${subscription.pendingPlanId}, feature cache cleared`);
      processedCount++;
    }

    if (processedCount > 0) {
      console.log(`[billing] Processed ${processedCount} scheduled downgrades`);
    }
  } catch (error) {
    console.error("[billing] Error processing scheduled downgrades:", error);
  }

  return processedCount;
}

const quoteSchema = z.object({
  planCode: z.string().min(1),
  billingCycle: z.enum(["monthly", "quarterly", "half_yearly", "yearly"]),
  couponCode: z.string().optional(),
  countryCode: z.string().optional(),
});

router.post("/quote", optionalAuth, async (req: Request, res: Response) => {
  try {
    const parsed = quoteSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ 
        error: "Invalid request", 
        details: parsed.error.flatten().fieldErrors 
      });
    }

    const { planCode, billingCycle, couponCode, countryCode: reqCountryCode } = parsed.data;

    let tenantId: string | undefined;
    let countryCode = reqCountryCode || "IN";

    const resolution = await resolveTenantId(req);
    if (!resolution.error && resolution.tenantId) {
      tenantId = resolution.tenantId;
      const tenant = await getTenant(tenantId);
      if (tenant?.country) {
        const countryMap: Record<string, string> = {
          india: "IN",
          uae: "AE",
          uk: "GB",
          malaysia: "MY",
          singapore: "SG",
          other: "IN",
        };
        countryCode = countryMap[tenant.country] || "IN";
      }
    }

    const result = await offerService.calculateQuote(
      planCode,
      billingCycle as BillingCycleKey,
      countryCode,
      tenantId,
      couponCode
    );

    if ("error" in result) {
      return res.status(400).json({ error: result.error });
    }

    return res.json(result);
  } catch (error) {
    console.error("[billing/quote] Error:", error);
    return res.status(500).json({ error: "Failed to calculate quote" });
  }
});

router.get("/plans-with-cycles", optionalAuth, async (req: Request, res: Response) => {
  try {
    const countryParam = req.query.country as string | undefined;
    let countryCode = (countryParam || "IN").toUpperCase();
    let tenantCountry = "india";
    
    // Map ISO country codes to tenant country values for plan prefix lookup
    const isoToTenantCountry: Record<string, string> = {
      "IN": "india",
      "AE": "uae",
      "UK": "uk",
      "GB": "uk",
      "MY": "malaysia",
      "SG": "singapore",
    };
    
    // If country param was provided, derive tenantCountry from it
    if (countryParam) {
      const normalizedParam = countryParam.toUpperCase();
      tenantCountry = isoToTenantCountry[normalizedParam] || countryParam.toLowerCase();
    }

    const resolution = await resolveTenantId(req);
    if (!resolution.error && resolution.tenantId) {
      const tenant = await getTenant(resolution.tenantId);
      if (tenant?.country) {
        tenantCountry = tenant.country;
        const countryMap: Record<string, string> = {
          india: "IN",
          uae: "AE",
          uk: "GB",
          malaysia: "MY",
          singapore: "SG",
          other: "IN",
        };
        countryCode = countryMap[tenant.country] || "IN";
      }
    }

    const prefix = TENANT_COUNTRY_TO_PLAN_PREFIX[tenantCountry] || "india_";
    
    const plans = await db
      .select()
      .from(globalPricingPlans)
      .where(and(
        eq(globalPricingPlans.isActive, true),
        eq(globalPricingPlans.isPublic, true)
      ))
      .orderBy(globalPricingPlans.sortOrder);

    let filteredPlans = plans.filter(p => p.code.startsWith(prefix));

    // Filter by country rollout policy if enabled plans are specified
    // enabledPlans may contain tier names (free, basic, pro) or full plan codes (uk_free, my_basic)
    const enabledPlans = await countryRolloutService.getAvailablePlans(countryCode);
    if (enabledPlans && enabledPlans.length > 0) {
      filteredPlans = filteredPlans.filter(p => 
        enabledPlans.includes(p.code) || // Match full plan code (e.g., "uk_free")
        enabledPlans.includes(p.id) ||   // Match plan ID
        enabledPlans.includes(p.tier)    // Match tier name (e.g., "free", "basic", "pro")
      );
    }

    const plansWithCycles = filteredPlans.map(plan => {
      const basePrice = parseFloat(plan.basePrice);
      const billingCycles = (plan.billingCycles || {}) as BillingCyclesMap;
      
      if (!billingCycles.monthly && basePrice > 0) {
        billingCycles.monthly = { price: basePrice, enabled: true };
      }
      
      if (billingCycles.monthly && basePrice === 0) {
        billingCycles.monthly = { price: 0, enabled: true };
      }

      const cycles = Object.entries(billingCycles)
        .filter(([_, config]) => config?.enabled)
        .map(([key, config]) => {
          const cycleKey = key as BillingCycleKey;
          const monthlyConfig = billingCycles.monthly;
          const monthlyPrice = monthlyConfig?.price || basePrice;
          const cycleMonths = CYCLE_MONTHS[cycleKey];
          const savings = monthlyPrice > 0 
            ? calculateSavings(monthlyPrice, config!.price, cycleMonths)
            : { amount: 0, percent: 0 };

          return {
            key: cycleKey,
            price: config!.price,
            months: cycleMonths,
            badge: config!.badge,
            savings,
            effectiveMonthlyPrice: cycleMonths > 0 ? Math.round((config!.price / cycleMonths) * 100) / 100 : config!.price,
          };
        });

      const yearlyCycle = cycles.find(c => c.key === "yearly");
      const monthlyCycle = cycles.find(c => c.key === "monthly");
      const yearlySavingsAmount = yearlyCycle && monthlyCycle 
        ? Math.max(0, (monthlyCycle.price * 12) - yearlyCycle.price)
        : 0;

      return {
        id: plan.id,
        code: plan.code,
        name: plan.name,
        description: plan.description,
        tier: plan.tier,
        basePrice,
        currencyCode: plan.currencyCode || "INR",
        maxUsers: plan.maxUsers,
        maxCustomers: plan.maxCustomers,
        features: plan.features,
        featureFlags: plan.featureFlags,
        limits: plan.limits,
        isRecommended: plan.isRecommended,
        sortOrder: plan.sortOrder,
        cycles,
        yearlySavingsAmount,
      };
    });

    // Determine currency code from country code (handle both UK and GB for United Kingdom)
    const getCurrencyCode = (cc: string): string => {
      const upperCC = cc.toUpperCase();
      if (upperCC === "IN") return "INR";
      if (upperCC === "AE") return "AED";
      if (upperCC === "GB" || upperCC === "UK") return "GBP";
      if (upperCC === "MY") return "MYR";
      if (upperCC === "SG") return "SGD";
      return "USD";
    };

    return res.json({ 
      plans: plansWithCycles,
      countryCode,
      currencyCode: getCurrencyCode(countryCode),
    });
  } catch (error) {
    console.error("[billing/plans-with-cycles] Error:", error);
    return res.status(500).json({ error: "Failed to fetch plans" });
  }
});

export default router;
