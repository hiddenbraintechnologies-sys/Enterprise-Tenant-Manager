import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { db } from "../db";
import { 
  globalPricingPlans, tenantSubscriptions, billingPayments, tenants,
  type TenantSubscription, type BillingPayment,
} from "@shared/schema";
import { eq, and, desc, lte } from "drizzle-orm";
import { subscriptionService } from "../services/subscription";
import { authenticateJWT } from "../core/auth-middleware";
import { getPaymentProvider } from "../core/payments/provider-factory";
import { resolveTenantId, logTenantResolution } from "../lib/resolveTenantId";
import { requirePermission, Permissions } from "../rbac/guards";
import { auditService } from "../core/audit";

const router = Router();

const optionalAuth = authenticateJWT({ required: false });
const requiredAuth = authenticateJWT({ required: true });

const selectPlanSchema = z.object({
  planCode: z.string().min(1),
});

const verifyPaymentSchema = z.object({
  paymentId: z.string().min(1),
  providerPaymentId: z.string().min(1),
  providerSignature: z.string().optional(),
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

// Map tenant country enum to plan code prefix
const TENANT_COUNTRY_TO_PLAN_PREFIX: Record<string, string> = {
  india: "india_",
  uae: "ae_",
  uk: "uk_",
  singapore: "sg_",
  malaysia: "my_",
  other: "us_",
};

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
    
    return res.json({
      subscription: {
        ...subscription,
        pendingPlanId: subscription.pendingPlanId,
        pendingPaymentId: subscription.pendingPaymentId,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      },
      plan,
      pendingPlan,
      status: isActive ? (isDowngrading ? "DOWNGRADING" : "ACTIVE") : subStatus.toUpperCase(),
      planCode: plan?.code || null,
      isActive,
      isDowngrading,
      isPendingPayment,
      currentPeriodEnd: subscription.currentPeriodEnd,
      pendingPlanId: subscription.pendingPlanId,
      pendingPaymentId: subscription.pendingPaymentId,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
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
    console.error("[billing] Error selecting plan:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid request", details: error.errors });
    }
    res.status(500).json({ error: "Failed to select plan" });
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
      return res.status(404).json({ error: "Payment not found" });
    }

    if (payment.status === "paid") {
      return res.json({
        success: true,
        message: "Payment already verified",
        redirectUrl: "/dashboard",
      });
    }

    if (!payment.providerOrderId) {
      return res.status(400).json({ error: "No order created for this payment" });
    }

    const provider = getPaymentProvider();
    const verifyResult = await provider.verifyPayment({
      providerOrderId: payment.providerOrderId,
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
        providerSignature: providerSignature || null,
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

        // Activate the upgrade: set planId to pendingPlanId, clear pending fields
        await db
          .update(tenantSubscriptions)
          .set({ 
            planId: newPlanId,
            pendingPlanId: null,
            pendingPaymentId: null,
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
      const { planId, action } = changeSubscriptionSchema.parse(req.body);

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
        const expectedPrefix = TENANT_COUNTRY_TO_PLAN_PREFIX[tenant.country || "india"] || "india_";
        if (!newPlan.code.startsWith(expectedPrefix)) {
          return res.status(400).json({
            code: "PLAN_COUNTRY_MISMATCH",
            message: `Plan is not available for your region. Expected plans starting with '${expectedPrefix}'.`,
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

          console.log(`[billing] Subscription upgraded to free for tenant ${tenantId}`);
          return res.json({
            success: true,
            requiresPayment: false,
            message: "Subscription upgraded successfully",
          });
        }

        // Create a payment record for the upgrade
        const [payment] = await db
          .insert(billingPayments)
          .values({
            tenantId,
            subscriptionId: subscription.id,
            planId: newPlan.id,
            provider: "mock",
            status: "created",
            amount: newPlan.basePrice,
            currency: "INR",
            metadata: { upgradeFrom: subscription.planId, upgradeTo: newPlan.id },
          })
          .returning();

        // Update subscription to pending_payment status
        const [updatedSubscription] = await db
          .update(tenantSubscriptions)
          .set({
            status: "pending_payment",
            pendingPlanId: newPlan.id,
            pendingPaymentId: payment.id,
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

        const [updatedSubscription] = await db
          .update(tenantSubscriptions)
          .set({
            status: "downgrading",
            pendingPlanId: newPlan.id,
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
          newValue: { pendingPlanId: newPlan.id, status: "downgrading", cancelAtPeriodEnd: true },
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
          operation: "downgrade_applied",
          tenantId: subscription.tenantId,
          previousPlanId: subscription.planId,
          newPlanId: subscription.pendingPlanId,
        },
      });

      console.log(`[billing] Downgrade applied for subscription ${subscription.id}: ${subscription.planId} -> ${subscription.pendingPlanId}`);
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

export default router;
