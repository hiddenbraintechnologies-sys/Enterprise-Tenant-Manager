import { Request, Response, NextFunction } from "express";
import { subscriptionService } from "../services/subscription";

export interface SubscriptionGateOptions {
  requiredTiers?: string[];
  requiredModules?: string[];
  requiredFeatures?: ("multiCurrency" | "aiInsights" | "whiteLabel")[];
  allowTrial?: boolean;
}

function getTenantId(req: Request): string | undefined {
  return req.headers["x-tenant-id"] as string || req.context?.tenant?.id;
}

export function requireSubscription(options: SubscriptionGateOptions = {}) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const tenantId = getTenantId(req);
    
    if (!tenantId) {
      return res.status(400).json({ 
        error: "Tenant ID required",
        code: "TENANT_REQUIRED"
      });
    }

    const subscription = await subscriptionService.getActiveSubscription(tenantId);
    
    if (!subscription) {
      return res.status(402).json({ 
        error: "No active subscription",
        code: "NO_SUBSCRIPTION",
        upgradeUrl: "/subscription/plans"
      });
    }

    if (subscription.status === "trialing" && !options.allowTrial) {
      const trialEnd = subscription.trialEndsAt;
      if (trialEnd && new Date() > trialEnd) {
        return res.status(402).json({
          error: "Trial period expired",
          code: "TRIAL_EXPIRED",
          upgradeUrl: "/subscription/plans"
        });
      }
    }

    if (subscription.status === "past_due") {
      return res.status(402).json({
        error: "Payment past due",
        code: "PAYMENT_PAST_DUE",
        message: "Please update your payment method",
        billingUrl: "/subscription/billing"
      });
    }

    if (subscription.status === "suspended" || subscription.status === "cancelled") {
      return res.status(402).json({
        error: "Subscription inactive",
        code: "SUBSCRIPTION_INACTIVE",
        status: subscription.status,
        upgradeUrl: "/subscription/plans"
      });
    }

    const plan = await subscriptionService.getPlan(subscription.planId);
    if (!plan) {
      return res.status(500).json({ 
        error: "Invalid subscription plan",
        code: "INVALID_PLAN"
      });
    }

    if (options.requiredTiers && options.requiredTiers.length > 0) {
      if (!options.requiredTiers.includes(plan.tier)) {
        return res.status(403).json({
          error: "Upgrade required",
          code: "TIER_UPGRADE_REQUIRED",
          currentTier: plan.tier,
          requiredTiers: options.requiredTiers,
          upgradeUrl: "/subscription/upgrade"
        });
      }
    }

    if (options.requiredModules && options.requiredModules.length > 0) {
      for (const moduleId of options.requiredModules) {
        const access = await subscriptionService.canAccessModule(tenantId, moduleId);
        if (!access.allowed) {
          return res.status(403).json({
            error: access.reason,
            code: "MODULE_NOT_AVAILABLE",
            module: moduleId,
            currentTier: plan.tier,
            upgradeUrl: "/subscription/upgrade"
          });
        }
      }
    }

    if (options.requiredFeatures && options.requiredFeatures.length > 0) {
      for (const feature of options.requiredFeatures) {
        const hasFeature = await subscriptionService.canAccessFeature(tenantId, feature);
        if (!hasFeature) {
          return res.status(403).json({
            error: `Feature '${feature}' requires upgrade`,
            code: "FEATURE_NOT_AVAILABLE",
            feature,
            currentTier: plan.tier,
            upgradeUrl: "/subscription/upgrade"
          });
        }
      }
    }

    (req as any).subscription = subscription;
    (req as any).subscriptionPlan = plan;

    next();
  };
}

export function requireModule(moduleId: string) {
  return requireSubscription({ requiredModules: [moduleId], allowTrial: true });
}

export function requireTier(...tiers: string[]) {
  return requireSubscription({ requiredTiers: tiers, allowTrial: false });
}

export function requireFeature(feature: "multiCurrency" | "aiInsights" | "whiteLabel") {
  return requireSubscription({ requiredFeatures: [feature], allowTrial: false });
}

export function requireEnterprise() {
  return requireTier("enterprise");
}

export function requireProOrHigher() {
  return requireTier("pro", "enterprise");
}

export function softSubscriptionCheck() {
  return async (req: Request, res: Response, next: NextFunction) => {
    const tenantId = getTenantId(req);
    
    if (tenantId) {
      const subscription = await subscriptionService.getActiveSubscription(tenantId);
      const plan = subscription ? await subscriptionService.getPlan(subscription.planId) : null;
      
      (req as any).subscription = subscription;
      (req as any).subscriptionPlan = plan;
      (req as any).subscriptionTier = plan?.tier || "free";
    }

    next();
  };
}
