import { db } from "../db";
import { globalPricingPlans, countryPricingConfigs, featureFlags } from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";

export const INDIA_PRICING_TIERS = {
  FREE: "free",
  BASIC: "basic", 
  PRO: "pro",
} as const;

export const INDIA_PRICING_CONFIG = {
  [INDIA_PRICING_TIERS.FREE]: {
    code: "india_free",
    name: "Free",
    description: "Get started with essential features",
    tier: "free",
    basePrice: "0",
    localPrice: "0",
    currency: "INR",
    maxUsers: 1,
    maxCustomers: 25,
    maxRecords: 50,
    features: {
      recordLimit: true,
      whatsappAutomation: false,
      gstFeatures: false,
      unlimitedRecords: false,
      basicAnalytics: true,
      emailNotifications: true,
    },
  },
  [INDIA_PRICING_TIERS.BASIC]: {
    code: "india_basic",
    name: "Basic",
    description: "Perfect for growing businesses",
    tier: "basic",
    basePrice: "99",
    localPrice: "99",
    currency: "INR",
    maxUsers: 3,
    maxCustomers: 200,
    maxRecords: 500,
    features: {
      recordLimit: true,
      whatsappAutomation: false,
      gstFeatures: true,
      unlimitedRecords: false,
      basicAnalytics: true,
      advancedAnalytics: true,
      emailNotifications: true,
      smsNotifications: true,
    },
  },
  [INDIA_PRICING_TIERS.PRO]: {
    code: "india_pro",
    name: "Pro",
    description: "For established businesses that need more",
    tier: "pro",
    basePrice: "199",
    localPrice: "199",
    currency: "INR",
    maxUsers: 10,
    maxCustomers: -1,
    maxRecords: -1,
    features: {
      recordLimit: false,
      whatsappAutomation: true,
      gstFeatures: true,
      unlimitedRecords: true,
      basicAnalytics: true,
      advancedAnalytics: true,
      emailNotifications: true,
      smsNotifications: true,
      whatsappNotifications: true,
      prioritySupport: true,
    },
  },
} as const;

export const INDIA_FEATURE_FLAGS = [
  {
    code: "record_limit",
    name: "Record Limit",
    description: "Limits the number of records a tenant can create",
    category: "limits",
    isGlobal: false,
    defaultEnabled: true,
    requiredTier: "free",
  },
  {
    code: "unlimited_records",
    name: "Unlimited Records",
    description: "Allows unlimited record creation",
    category: "limits",
    isGlobal: false,
    defaultEnabled: false,
    requiredTier: "pro",
  },
  {
    code: "whatsapp_automation",
    name: "WhatsApp Automation",
    description: "Automated WhatsApp notifications and messaging",
    category: "notifications",
    isGlobal: false,
    defaultEnabled: false,
    requiredTier: "pro",
  },
  {
    code: "gst_features",
    name: "GST Features",
    description: "GST invoicing and compliance features for India",
    category: "compliance",
    isGlobal: false,
    defaultEnabled: false,
    requiredTier: "basic",
  },
  {
    code: "priority_support",
    name: "Priority Support",
    description: "Priority customer support access",
    category: "support",
    isGlobal: false,
    defaultEnabled: false,
    requiredTier: "pro",
  },
];

export const INDIA_TIER_LIMITS: Record<string, { 
  maxUsers: number; 
  maxCustomers: number; 
  maxRecords: number;
  apiRateLimit: number;
}> = {
  free: { maxUsers: 1, maxCustomers: 25, maxRecords: 50, apiRateLimit: 100 },
  basic: { maxUsers: 3, maxCustomers: 200, maxRecords: 500, apiRateLimit: 1000 },
  pro: { maxUsers: 10, maxCustomers: -1, maxRecords: -1, apiRateLimit: 10000 },
};

// Valid India plan codes
export const INDIA_PLAN_CODES = ["india_free", "india_basic", "india_pro"] as const;

// Legacy plan codes that should be deactivated (no country prefix, from old seeding)
// These are safe to deactivate as they don't belong to any specific country rollout
export const LEGACY_PLAN_CODES = [
  "free", "FREE", "plan-free", "plan_free",
  "starter", "STARTER", "plan-starter", "plan_starter", 
  "pro", "PRO", "plan-pro", "plan_pro",
  "enterprise", "ENTERPRISE", "plan-enterprise", "plan_enterprise",
];

// Country prefixes that should NEVER be touched by India seed
export const PROTECTED_COUNTRY_PREFIXES = ["uk_", "ae_", "sg_", "my_", "us_"];

// Display order for India plans (1-indexed for clarity)
export const INDIA_PLAN_ORDER: Record<string, number> = {
  "india_free": 1,
  "india_basic": 2,
  "india_pro": 3,
};

/**
 * One-time cleanup: Deactivate legacy plans that don't have country prefixes.
 * This is safe to run multiple times but should ideally be a one-time migration.
 * It ONLY affects plans in LEGACY_PLAN_CODES - never touches uk_, ae_, sg_, my_, us_ plans.
 */
export async function cleanupLegacyPlans(): Promise<number> {
  const result = await db
    .update(globalPricingPlans)
    .set({ isActive: false, updatedAt: new Date() })
    .where(
      and(
        eq(globalPricingPlans.isActive, true),
        sql`${globalPricingPlans.code} IN (${sql.raw(LEGACY_PLAN_CODES.map(c => `'${c}'`).join(','))})`
      )
    )
    .returning({ id: globalPricingPlans.id });
  
  return result.length;
}

export async function seedIndiaPricingPlans(): Promise<void> {
  console.log("[india-pricing] Seeding India pricing plans...");

  // Run legacy cleanup as part of India seeding (safe, idempotent)
  const deactivatedCount = await cleanupLegacyPlans();
  if (deactivatedCount > 0) {
    console.log(`[india-pricing] Deactivated ${deactivatedCount} legacy plans`);
  }

  // UPSERT India plans with correct displayOrder
  for (const config of Object.values(INDIA_PRICING_CONFIG)) {
    const displayOrder = INDIA_PLAN_ORDER[config.code] || 1;
    
    const existing = await db
      .select()
      .from(globalPricingPlans)
      .where(eq(globalPricingPlans.code, config.code))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(globalPricingPlans).values({
        code: config.code,
        name: config.name,
        description: config.description,
        tier: config.tier,
        basePrice: config.basePrice,
        maxUsers: config.maxUsers,
        maxCustomers: config.maxCustomers,
        features: config.features,
        isActive: true,
        sortOrder: displayOrder,
      });
      console.log(`[india-pricing] Created plan: ${config.name}`);
    } else {
      await db
        .update(globalPricingPlans)
        .set({
          name: config.name,
          description: config.description,
          basePrice: config.basePrice,
          maxUsers: config.maxUsers,
          maxCustomers: config.maxCustomers,
          features: config.features,
          isActive: true,
          sortOrder: displayOrder,
          updatedAt: new Date(),
        })
        .where(eq(globalPricingPlans.code, config.code));
      console.log(`[india-pricing] Updated plan: ${config.name}`);
    }
  }

  console.log("[india-pricing] Pricing plans seeded successfully");
}

export async function seedIndiaFeatureFlags(): Promise<void> {
  console.log("[india-pricing] Seeding India feature flags...");

  for (const flag of INDIA_FEATURE_FLAGS) {
    const existing = await db
      .select()
      .from(featureFlags)
      .where(eq(featureFlags.code, flag.code))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(featureFlags).values(flag);
      console.log(`[india-pricing] Created feature flag: ${flag.name}`);
    }
  }

  console.log("[india-pricing] Feature flags seeded successfully");
}

export function getTierLimits(tier: string): typeof INDIA_TIER_LIMITS.free {
  return INDIA_TIER_LIMITS[tier.toLowerCase()] || INDIA_TIER_LIMITS.free;
}

export function checkRecordLimit(tier: string, currentCount: number): { 
  allowed: boolean; 
  limit: number; 
  remaining: number;
} {
  const limits = getTierLimits(tier);
  if (limits.maxRecords === -1) {
    return { allowed: true, limit: -1, remaining: -1 };
  }
  const remaining = Math.max(0, limits.maxRecords - currentCount);
  return {
    allowed: currentCount < limits.maxRecords,
    limit: limits.maxRecords,
    remaining,
  };
}

export function checkUserLimit(tier: string, currentCount: number): {
  allowed: boolean;
  limit: number;
  remaining: number;
} {
  const limits = getTierLimits(tier);
  if (limits.maxUsers === -1) {
    return { allowed: true, limit: -1, remaining: -1 };
  }
  const remaining = Math.max(0, limits.maxUsers - currentCount);
  return {
    allowed: currentCount < limits.maxUsers,
    limit: limits.maxUsers,
    remaining,
  };
}

export function getPlanFeatures(tier: string): Record<string, boolean> {
  const config = Object.values(INDIA_PRICING_CONFIG).find(c => c.tier === tier);
  return config?.features || INDIA_PRICING_CONFIG.free.features;
}

export function hasFeature(tier: string, featureKey: string): boolean {
  const features = getPlanFeatures(tier);
  return features[featureKey as keyof typeof features] || false;
}
