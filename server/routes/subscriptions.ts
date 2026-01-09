import { Router, Request, Response } from "express";
import { z } from "zod";
import { subscriptionService } from "../services/subscription";
import { requirePlatformAdmin, requirePlatformPermission } from "../core";
import { 
  insertGlobalPricingPlanSchema, 
  insertCountryPricingConfigSchema,
  insertTenantSubscriptionSchema 
} from "@shared/schema";

const router = Router();

const priceStringSchema = z.string()
  .refine(val => /^[1-9]\d*(\.\d{1,2})?$|^0(\.\d{1,2})?$/.test(val), {
    message: "Must be a valid decimal price (e.g., 0.00, 9.99, 100.00)"
  })
  .transform(val => parseFloat(val).toFixed(2));

const rateStringSchema = z.string()
  .refine(val => /^[1-9]\d*(\.\d{1,2})?$|^0(\.\d{1,2})?$/.test(val), {
    message: "Must be a valid decimal rate (e.g., 0.00, 5.00, 18.50)"
  })
  .transform(val => parseFloat(val).toFixed(2));

const exchangeRateSchema = z.string()
  .refine(val => /^[1-9]\d*(\.\d{1,4})?$|^0\.\d{1,4}$/.test(val), {
    message: "Must be a valid exchange rate (e.g., 1.0000, 83.5000)"
  })
  .transform(val => parseFloat(val).toFixed(4));

const createPlanSchema = z.object({
  code: z.string().min(2).max(50).regex(/^[a-z][a-z0-9_]*$/, "Code must be lowercase alphanumeric with underscores"),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional().nullable(),
  tier: z.enum(["free", "starter", "pro", "enterprise"]),
  billingCycle: z.enum(["monthly", "quarterly", "yearly"]).optional().default("monthly"),
  basePrice: priceStringSchema,
  maxUsers: z.number().int().min(-1).optional().default(5),
  maxCustomers: z.number().int().min(-1).optional().default(100),
  features: z.object({
    modules: z.array(z.string()).optional().default([]),
    addons: z.array(z.string()).optional().default([]),
    multiCurrency: z.boolean().optional().default(false),
    aiInsights: z.boolean().optional().default(false),
    whiteLabel: z.boolean().optional().default(false),
  }).optional().default({}),
  sortOrder: z.number().int().min(0).optional().default(0),
});

const updatePlanSchema = createPlanSchema.partial();

const countryPricingSchema = z.object({
  country: z.enum(["india", "uae", "uk", "malaysia", "us", "singapore", "australia", "canada", "europe", "china", "japan", "saudi_arabia", "south_africa", "nigeria", "brazil"]),
  currency: z.enum(["INR", "AED", "GBP", "MYR", "SGD", "USD", "EUR", "AUD", "CAD", "JPY", "CNY", "SAR", "ZAR", "NGN", "BRL"]),
  taxName: z.string().min(1).max(20),
  taxRate: rateStringSchema,
  primaryGateway: z.enum(["stripe", "razorpay", "paytabs", "billplz"]),
  fallbackGateway: z.enum(["stripe", "razorpay", "paytabs", "billplz"]).optional().nullable(),
  exchangeRate: exchangeRateSchema.optional().default("1.0000"),
  gatewayConfig: z.object({
    publicKey: z.string().min(1).optional(),
    secretKey: z.string().min(1).optional(),
    webhookSecret: z.string().min(1).optional(),
    testMode: z.boolean().default(true),
    merchantId: z.string().optional(),
  }).optional().default({ testMode: true }),
});

const assignSubscriptionSchema = z.object({
  tenantId: z.string().uuid(),
  planId: z.string().uuid(),
  billingCycle: z.enum(["monthly", "quarterly", "yearly"]).optional(),
  trialDays: z.number().int().min(0).max(90).optional(),
});

const setLocalPriceSchema = z.object({
  planId: z.string().uuid(),
  country: z.string(),
  localPrice: z.string(),
});

router.get("/plans", async (req: Request, res: Response) => {
  try {
    const plans = await subscriptionService.getAllPlans();
    
    const plansWithFeatures = plans.map(plan => ({
      ...plan,
      moduleAccess: subscriptionService.getAllModuleAccess(plan.tier),
      subscriptionFeatures: subscriptionService.getSubscriptionFeatures(plan.tier),
    }));

    res.json({ plans: plansWithFeatures });
  } catch (error) {
    console.error("[subscriptions] Error fetching plans:", error);
    res.status(500).json({ error: "Failed to fetch plans" });
  }
});

router.get("/plans/:id", async (req: Request, res: Response) => {
  try {
    const plan = await subscriptionService.getPlan(req.params.id);
    if (!plan) {
      return res.status(404).json({ error: "Plan not found" });
    }

    const localPrices = await subscriptionService.getLocalPrices(plan.id);

    res.json({
      plan,
      moduleAccess: subscriptionService.getAllModuleAccess(plan.tier),
      subscriptionFeatures: subscriptionService.getSubscriptionFeatures(plan.tier),
      localPrices,
    });
  } catch (error) {
    console.error("[subscriptions] Error fetching plan:", error);
    res.status(500).json({ error: "Failed to fetch plan" });
  }
});

router.post("/admin/plans", requirePlatformAdmin, async (req: Request, res: Response) => {
  try {
    const data = createPlanSchema.parse(req.body);
    const plan = await subscriptionService.createPlan(data as any);
    res.status(201).json({ plan });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation failed", details: error.errors });
    }
    console.error("[subscriptions] Error creating plan:", error);
    res.status(500).json({ error: "Failed to create plan" });
  }
});

router.put("/admin/plans/:id", requirePlatformAdmin, async (req: Request, res: Response) => {
  try {
    const data = updatePlanSchema.parse(req.body);
    const plan = await subscriptionService.updatePlan(req.params.id, data as any);
    if (!plan) {
      return res.status(404).json({ error: "Plan not found" });
    }
    res.json({ plan });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation failed", details: error.errors });
    }
    console.error("[subscriptions] Error updating plan:", error);
    res.status(500).json({ error: "Failed to update plan" });
  }
});

router.delete("/admin/plans/:id", requirePlatformAdmin, async (req: Request, res: Response) => {
  try {
    await subscriptionService.deletePlan(req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error("[subscriptions] Error deleting plan:", error);
    res.status(500).json({ error: "Failed to delete plan" });
  }
});

router.get("/admin/country-pricing", requirePlatformAdmin, async (req: Request, res: Response) => {
  try {
    const configs = await subscriptionService.getCountryPricing();
    res.json({ configs });
  } catch (error) {
    console.error("[subscriptions] Error fetching country pricing:", error);
    res.status(500).json({ error: "Failed to fetch country pricing" });
  }
});

router.put("/admin/country-pricing/:country", requirePlatformAdmin, async (req: Request, res: Response) => {
  try {
    const data = countryPricingSchema.parse({ ...req.body, country: req.params.country });
    const config = await subscriptionService.upsertCountryPricing(data as any);
    res.json({ config });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation failed", details: error.errors });
    }
    console.error("[subscriptions] Error updating country pricing:", error);
    res.status(500).json({ error: "Failed to update country pricing" });
  }
});

router.post("/admin/local-prices", requirePlatformAdmin, async (req: Request, res: Response) => {
  try {
    const data = setLocalPriceSchema.parse(req.body);
    await subscriptionService.setLocalPrice(data.planId, data.country, data.localPrice);
    res.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation failed", details: error.errors });
    }
    console.error("[subscriptions] Error setting local price:", error);
    res.status(500).json({ error: "Failed to set local price" });
  }
});

router.post("/admin/assign", requirePlatformAdmin, async (req: Request, res: Response) => {
  try {
    const data = assignSubscriptionSchema.parse(req.body);
    const subscription = await subscriptionService.assignSubscription(
      data.tenantId,
      data.planId,
      { billingCycle: data.billingCycle, trialDays: data.trialDays }
    );
    res.status(201).json({ subscription });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation failed", details: error.errors });
    }
    console.error("[subscriptions] Error assigning subscription:", error);
    res.status(500).json({ error: "Failed to assign subscription" });
  }
});

function getTenantId(req: Request): string | undefined {
  return req.headers["x-tenant-id"] as string || (req as any).context?.tenant?.id;
}

router.get("/current", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant ID required" });
    }

    const subscription = await subscriptionService.getActiveSubscription(tenantId);
    if (!subscription) {
      return res.json({ subscription: null, plan: null });
    }

    const plan = await subscriptionService.getPlan(subscription.planId);

    res.json({
      subscription,
      plan,
      moduleAccess: plan ? subscriptionService.getAllModuleAccess(plan.tier) : [],
      features: plan ? subscriptionService.getSubscriptionFeatures(plan.tier) : null,
    });
  } catch (error) {
    console.error("[subscriptions] Error fetching current subscription:", error);
    res.status(500).json({ error: "Failed to fetch subscription" });
  }
});

router.get("/invoices", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant ID required" });
    }

    const invoices = await subscriptionService.getSubscriptionInvoices(tenantId);
    res.json({ invoices });
  } catch (error) {
    console.error("[subscriptions] Error fetching invoices:", error);
    res.status(500).json({ error: "Failed to fetch invoices" });
  }
});

router.post("/cancel", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant ID required" });
    }

    const { atPeriodEnd = true } = req.body;
    const subscription = await subscriptionService.cancelSubscription(tenantId, atPeriodEnd);
    
    if (!subscription) {
      return res.status(404).json({ error: "No active subscription found" });
    }

    res.json({ subscription });
  } catch (error) {
    console.error("[subscriptions] Error cancelling subscription:", error);
    res.status(500).json({ error: "Failed to cancel subscription" });
  }
});

router.get("/module-access/:moduleId", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant ID required" });
    }

    const access = await subscriptionService.canAccessModule(tenantId, req.params.moduleId);
    res.json(access);
  } catch (error) {
    console.error("[subscriptions] Error checking module access:", error);
    res.status(500).json({ error: "Failed to check module access" });
  }
});

router.get("/pricing/:country", async (req: Request, res: Response) => {
  try {
    const countryConfig = await subscriptionService.getCountryPricingByCountry(req.params.country);
    if (!countryConfig) {
      return res.status(404).json({ error: "Country pricing not configured" });
    }

    const plans = await subscriptionService.getAllPlans();
    const plansWithLocalPricing = await Promise.all(
      plans.map(async (plan) => {
        const localPrices = await subscriptionService.getLocalPrices(plan.id);
        const countryPrice = localPrices.find(p => p.country === req.params.country);
        
        const basePrice = parseFloat(plan.basePrice);
        const exchangeRate = parseFloat(countryConfig.exchangeRate || "1");
        const taxRate = parseFloat(countryConfig.taxRate);
        
        const localPrice = countryPrice 
          ? parseFloat(countryPrice.localPrice)
          : subscriptionService.calculateLocalPrice(basePrice, req.params.country, exchangeRate, 1);
        
        const totalWithTax = subscriptionService.calculateTotalWithTax(localPrice, taxRate);

        return {
          ...plan,
          localPrice,
          totalWithTax,
          currency: countryConfig.currency,
          taxName: countryConfig.taxName,
          taxRate,
          moduleAccess: subscriptionService.getAllModuleAccess(plan.tier),
          features: subscriptionService.getSubscriptionFeatures(plan.tier),
        };
      })
    );

    res.json({
      country: req.params.country,
      countryConfig,
      plans: plansWithLocalPricing,
    });
  } catch (error) {
    console.error("[subscriptions] Error fetching country pricing:", error);
    res.status(500).json({ error: "Failed to fetch country pricing" });
  }
});

export default router;
