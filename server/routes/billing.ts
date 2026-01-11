import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { db } from "../db";
import { 
  globalPricingPlans, tenantSubscriptions, billingPayments, tenants,
  type TenantSubscription, type BillingPayment,
} from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import { subscriptionService } from "../services/subscription";
import { authenticateJWT } from "../core/auth-middleware";
import { getPaymentProvider } from "../core/payments/provider-factory";
import { resolveTenantId, logTenantResolution } from "../lib/resolveTenantId";

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
    
    const subStatus = subscription.status || "unknown";
    return res.json({
      subscription,
      plan,
      status: subStatus === "active" || subStatus === "trialing" ? "ACTIVE" : subStatus.toUpperCase(),
      planCode: plan?.code || null,
      isActive: subStatus === "active" || subStatus === "trialing",
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
    
    // Filter to plans matching this country's prefix and sort by sortOrder
    const countryPlans = allPlans
      .filter(plan => plan.code.startsWith(planPrefix))
      .sort((a, b) => (a.sortOrder ?? 99) - (b.sortOrder ?? 99));
    
    const currency = COUNTRY_CURRENCIES[normalizedCountry] || COUNTRY_CURRENCIES[countryCode] || "INR";
    
    const plansWithPricing = await Promise.all(countryPlans.map(async (plan) => {
      const localPrices = await subscriptionService.getLocalPrices(plan.id);
      const countryPrice = localPrices.find(p => p.country?.toUpperCase() === normalizedCountry);
      
      return {
        ...plan,
        localPrice: countryPrice?.localPrice || plan.basePrice,
        currency,
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
    const resolution = await resolveTenantId(req);
    logTenantResolution(req, resolution, "POST /select-plan");

    if (resolution.error) {
      return res.status(resolution.error.status).json({
        code: resolution.error.code,
        message: resolution.error.message,
      });
    }

    const tenantId = resolution.tenantId!;
    const { planCode } = selectPlanSchema.parse(req.body);
    const plan = await getPlanByCode(planCode);
    
    if (!plan) {
      return res.status(404).json({ error: "Plan not found" });
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

router.post("/checkout/verify", requiredAuth, async (req: Request, res: Response) => {
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
      await db
        .update(tenantSubscriptions)
        .set({ 
          status: "active",
          lastPaymentAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(tenantSubscriptions.id, payment.subscriptionId));
    }

    console.log(`[billing] Payment verified for tenant ${tenantId}, subscription activated`);

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

export default router;
