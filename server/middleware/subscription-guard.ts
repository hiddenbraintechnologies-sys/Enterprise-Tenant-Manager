import type { Request, Response, NextFunction } from "express";
import { db } from "../db";
import { tenantSubscriptions, tenants, globalPricingPlans } from "@shared/schema";
import { eq, and, inArray } from "drizzle-orm";

export interface SubscriptionStatus {
  status: "active" | "expired" | "past_due" | "suspended" | "cancelled" | "trialing" | "no_subscription" | "free_tier";
  daysUntilExpiry?: number;
  expiresAt?: Date;
  planTier?: string;
  canAccess: boolean;
  message?: string;
}

const FREE_TIER_IDS = ["free", "plan_free"];

export async function getSubscriptionStatus(tenantId: string): Promise<SubscriptionStatus> {
  try {
    const [subscription] = await db
      .select()
      .from(tenantSubscriptions)
      .where(eq(tenantSubscriptions.tenantId, tenantId))
      .limit(1);

    if (!subscription) {
      const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1);
      const tier = tenant?.subscriptionTier?.toLowerCase() || "free";
      
      if (tier === "free" || FREE_TIER_IDS.includes(tier)) {
        return {
          status: "free_tier",
          canAccess: true,
          planTier: "free",
        };
      }
      
      return {
        status: "no_subscription",
        canAccess: false,
        message: "No active subscription found. Please subscribe to continue.",
      };
    }

    const [plan] = await db
      .select()
      .from(globalPricingPlans)
      .where(eq(globalPricingPlans.id, subscription.planId))
      .limit(1);

    const planTier = plan?.tier?.toLowerCase() || "free";
    const now = new Date();
    const expiresAt = subscription.currentPeriodEnd;
    const daysUntilExpiry = expiresAt ? Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 0;

    if (planTier === "free" || FREE_TIER_IDS.includes(subscription.planId)) {
      return {
        status: "free_tier",
        canAccess: true,
        planTier: "free",
      };
    }

    if (subscription.status === "cancelled") {
      return {
        status: "cancelled",
        canAccess: false,
        expiresAt,
        planTier,
        message: "Your subscription has been cancelled. Please renew to continue.",
      };
    }

    if (subscription.status === "suspended") {
      return {
        status: "suspended",
        canAccess: false,
        expiresAt,
        planTier,
        message: "Your subscription has been suspended. Please contact support.",
      };
    }

    if (subscription.status === "past_due") {
      return {
        status: "past_due",
        canAccess: true,
        daysUntilExpiry,
        expiresAt,
        planTier,
        message: "Your payment is past due. Please update your payment method.",
      };
    }

    if (subscription.status === "trialing") {
      const trialEnd = subscription.trialEndsAt;
      if (trialEnd && trialEnd < now) {
        return {
          status: "expired",
          canAccess: false,
          expiresAt: trialEnd,
          planTier,
          message: "Your trial has expired. Please subscribe to continue.",
        };
      }
      const trialDaysLeft = trialEnd ? Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 0;
      return {
        status: "trialing",
        canAccess: true,
        daysUntilExpiry: trialDaysLeft,
        expiresAt: trialEnd || undefined,
        planTier,
      };
    }

    if (expiresAt && expiresAt < now) {
      return {
        status: "expired",
        canAccess: false,
        expiresAt,
        planTier,
        daysUntilExpiry: 0,
        message: "Your subscription has expired. Please renew to continue.",
      };
    }

    return {
      status: "active",
      canAccess: true,
      daysUntilExpiry,
      expiresAt,
      planTier,
    };
  } catch (error) {
    console.error("[subscription-guard] Error checking subscription:", error);
    return {
      status: "active",
      canAccess: true,
      message: "Unable to verify subscription status",
    };
  }
}

export function requireActiveSubscription(options: { 
  allowFree?: boolean;
  gracePeriodDays?: number;
  allowedRoutes?: string[];
} = {}) {
  const { allowFree = true, gracePeriodDays = 0, allowedRoutes = [] } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    const tenantId = req.context?.tenant?.id || (req as any).tokenPayload?.tenantId;
    
    if (!tenantId) {
      return next();
    }

    const skipPaths = [
      "/api/billing",
      "/api/subscription",
      "/api/auth",
      "/api/public",
      "/api/packages",
      "/api/pricing",
      ...allowedRoutes
    ];

    if (skipPaths.some(path => req.path.startsWith(path))) {
      return next();
    }

    try {
      const subStatus = await getSubscriptionStatus(tenantId);

      (req as any).subscriptionStatus = subStatus;

      if (subStatus.status === "free_tier" && allowFree) {
        return next();
      }

      if (subStatus.canAccess) {
        return next();
      }

      if (gracePeriodDays > 0 && subStatus.expiresAt) {
        const gracePeriodEnd = new Date(subStatus.expiresAt);
        gracePeriodEnd.setDate(gracePeriodEnd.getDate() + gracePeriodDays);
        
        if (new Date() < gracePeriodEnd) {
          (req as any).subscriptionStatus.inGracePeriod = true;
          return next();
        }
      }

      return res.status(403).json({
        error: "Subscription expired",
        code: "SUBSCRIPTION_EXPIRED",
        status: subStatus.status,
        message: subStatus.message || "Your subscription has expired. Please renew to continue.",
        redirectTo: "/billing/renew",
      });
    } catch (error) {
      console.error("[subscription-guard] Middleware error:", error);
      return next();
    }
  };
}

export async function processExpiredSubscriptions(): Promise<{ processed: number; errors: number }> {
  const now = new Date();
  let processed = 0;
  let errors = 0;

  try {
    const expiredSubs = await db
      .select()
      .from(tenantSubscriptions)
      .where(
        and(
          inArray(tenantSubscriptions.status, ["active", "trialing"]),
        )
      );

    for (const sub of expiredSubs) {
      try {
        const isExpired = sub.currentPeriodEnd && sub.currentPeriodEnd < now;
        const isTrialExpired = sub.status === "trialing" && sub.trialEndsAt && sub.trialEndsAt < now;

        if (isExpired || isTrialExpired) {
          await db
            .update(tenantSubscriptions)
            .set({ 
              status: "cancelled",
              updatedAt: now,
            })
            .where(eq(tenantSubscriptions.id, sub.id));

          await db
            .update(tenants)
            .set({
              subscriptionTier: "free",
              subscriptionExpiresAt: null,
              updatedAt: now,
            })
            .where(eq(tenants.id, sub.tenantId));

          console.log(`[subscription-expiry] Marked subscription ${sub.id} as expired for tenant ${sub.tenantId}`);
          processed++;
        }
      } catch (subError) {
        console.error(`[subscription-expiry] Error processing subscription ${sub.id}:`, subError);
        errors++;
      }
    }

    console.log(`[subscription-expiry] Processed ${processed} expired subscriptions, ${errors} errors`);
    return { processed, errors };
  } catch (error) {
    console.error("[subscription-expiry] Error in batch processing:", error);
    return { processed: 0, errors: 1 };
  }
}

export function startSubscriptionExpiryJob(intervalMinutes: number = 60): NodeJS.Timeout {
  console.log(`[subscription-expiry-job] Starting job, runs every ${intervalMinutes} minutes`);
  
  setTimeout(() => processExpiredSubscriptions(), 5000);
  
  return setInterval(() => {
    processExpiredSubscriptions().catch(err => {
      console.error("[subscription-expiry-job] Job error:", err);
    });
  }, intervalMinutes * 60 * 1000);
}
