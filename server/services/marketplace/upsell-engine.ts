/**
 * Smart Upsell Engine for Marketplace Add-ons
 * 
 * Generates context-aware upsell recommendations based on:
 * 1. Employee count approaching tier limits (payroll nudges)
 * 2. Bundle discount opportunities
 * 3. Trial expiry reminders
 * 4. Feature usage patterns
 */

import { db } from "../../db";
import {
  tenantAddons,
  addonPlanEligibility,
  addons,
} from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { getRecommendedTier, INDIA_PAYROLL_TIERS, MALAYSIA_PAYROLL_TIERS } from "../../core/payroll-addon-pricing";

export type UpsellType =
  | "TIER_UPGRADE_NUDGE"
  | "BUNDLE_DISCOUNT"
  | "TRIAL_EXPIRING"
  | "FEATURE_UNLOCK"
  | "VOLUME_DISCOUNT";

export interface UpsellRecommendation {
  type: UpsellType;
  addonId: string;
  addonName: string;
  title: string;
  description: string;
  priority: "low" | "medium" | "high" | "critical";
  savings?: string;
  ctaText: string;
  ctaAction: string;
  expiresAt?: Date;
  metadata?: Record<string, unknown>;
}

export interface TenantUpsellContext {
  tenantId: string;
  countryCode: string;
  planTier: string;
  employeeCount: number;
  activeAddons: string[];
  trialAddons: { addonId: string; expiresAt: Date }[];
}

/**
 * Generate smart upsell recommendations for a tenant
 */
export async function generateUpsellRecommendations(
  context: TenantUpsellContext
): Promise<UpsellRecommendation[]> {
  const recommendations: UpsellRecommendation[] = [];

  // 1. Check for payroll tier upgrade nudges
  const payrollRecommendations = await checkPayrollTierUpgrades(context);
  recommendations.push(...payrollRecommendations);

  // 2. Check for trial expiry reminders
  const trialRecommendations = await checkTrialExpiry(context);
  recommendations.push(...trialRecommendations);

  // 3. Check for bundle discount opportunities
  const bundleRecommendations = await checkBundleOpportunities(context);
  recommendations.push(...bundleRecommendations);

  // 4. Check for feature unlock suggestions
  const featureRecommendations = await checkFeatureUnlocks(context);
  recommendations.push(...featureRecommendations);

  // Sort by priority
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return recommendations;
}

interface PayrollTierData {
  tierCode: string;
  tierName: string;
  minEmployees: number;
  maxEmployees: number;
  perEmployeeMonthlyPrice: string;
  minimumMonthlyCharge: string;
  monthlyPrice: string;
  yearlyPrice: string;
  currencyCode: string;
  countryCode: string;
}

// Deterministic tier ordering (smallest to largest employee count)
const TIER_ORDER = ["tier_1_5", "tier_6_20", "tier_21_50", "tier_51_100"] as const;

/**
 * Get payroll pricing tiers for a country as an array (in deterministic order)
 */
function getPayrollTiersForCountry(countryCode: string): PayrollTierData[] {
  const tiersObj = countryCode === "IN" ? INDIA_PAYROLL_TIERS : countryCode === "MY" ? MALAYSIA_PAYROLL_TIERS : null;
  if (!tiersObj) return [];
  
  // Return tiers in deterministic order
  return TIER_ORDER
    .filter((tierCode) => tierCode in tiersObj)
    .map((tierCode) => ({
      tierCode,
      ...(tiersObj as Record<string, typeof INDIA_PAYROLL_TIERS[keyof typeof INDIA_PAYROLL_TIERS]>)[tierCode],
    }));
}

/**
 * Check if tenant is approaching payroll tier limits
 */
async function checkPayrollTierUpgrades(
  context: TenantUpsellContext
): Promise<UpsellRecommendation[]> {
  const recommendations: UpsellRecommendation[] = [];
  const { countryCode, employeeCount } = context;

  // Get pricing tiers for the country
  const tiers = getPayrollTiersForCountry(countryCode);
  if (tiers.length === 0) return recommendations;

  // Find current tier
  const currentTierCode = getRecommendedTier(employeeCount);
  if (!currentTierCode) return recommendations;

  // Find current tier data
  const currentTierData = tiers.find((t) => t.tierCode === currentTierCode);
  if (!currentTierData) return recommendations;

  const maxEmployees = currentTierData.maxEmployees;
  const threshold80 = Math.floor(maxEmployees * 0.8);
  const threshold95 = Math.floor(maxEmployees * 0.95);

  // Check if approaching limit
  if (employeeCount >= threshold95 && employeeCount < maxEmployees) {
    // Critical: About to exceed tier limit
    const currentTierIndex = tiers.findIndex((t) => t.tierCode === currentTierCode);
    const nextTier = currentTierIndex < tiers.length - 1 ? tiers[currentTierIndex + 1] : null;

    if (nextTier) {
      recommendations.push({
        type: "TIER_UPGRADE_NUDGE",
        addonId: "payroll",
        addonName: "Payroll Add-on",
        title: "Upgrade Your Payroll Plan",
        description: `You have ${employeeCount} employees. Your current tier supports up to ${maxEmployees}. Upgrade now to avoid service interruption.`,
        priority: "critical",
        savings: calculateTierSavings(nextTier, currentTierData, countryCode),
        ctaText: "Upgrade Now",
        ctaAction: "/billing/upgrade/payroll",
        metadata: {
          currentTier: currentTierCode,
          nextTier: nextTier.tierCode,
          employeeCount,
          maxEmployees,
        },
      });
    }
  } else if (employeeCount >= threshold80 && employeeCount < threshold95) {
    // High: Approaching tier limit
    recommendations.push({
      type: "TIER_UPGRADE_NUDGE",
      addonId: "payroll",
      addonName: "Payroll Add-on",
      title: "Plan for Growth",
      description: `You're at ${employeeCount}/${maxEmployees} employees. Consider upgrading your payroll tier soon.`,
      priority: "high",
      ctaText: "View Upgrade Options",
      ctaAction: "/billing/payroll/tiers",
      metadata: {
        currentTier: currentTierCode,
        employeeCount,
        maxEmployees,
        percentageUsed: Math.round((employeeCount / maxEmployees) * 100),
      },
    });
  }

  return recommendations;
}

/**
 * Check for trials about to expire
 */
async function checkTrialExpiry(
  context: TenantUpsellContext
): Promise<UpsellRecommendation[]> {
  const recommendations: UpsellRecommendation[] = [];
  const now = new Date();

  for (const trial of context.trialAddons) {
    const daysRemaining = Math.ceil(
      (trial.expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysRemaining <= 0) continue;

    // Get addon details
    const [addon] = await db
      .select()
      .from(addons)
      .where(eq(addons.id, trial.addonId))
      .limit(1);

    if (!addon) continue;

    let priority: UpsellRecommendation["priority"] = "low";
    if (daysRemaining <= 1) priority = "critical";
    else if (daysRemaining <= 3) priority = "high";
    else if (daysRemaining <= 7) priority = "medium";

    recommendations.push({
      type: "TRIAL_EXPIRING",
      addonId: trial.addonId,
      addonName: addon.name,
      title: `${addon.name} Trial Ending Soon`,
      description:
        daysRemaining === 1
          ? `Your trial expires tomorrow! Subscribe now to continue using ${addon.name}.`
          : `Only ${daysRemaining} days left on your ${addon.name} trial. Subscribe to keep your data.`,
      priority,
      ctaText: daysRemaining <= 3 ? "Subscribe Now" : "View Plans",
      ctaAction: `/marketplace/${addon.slug}/subscribe`,
      expiresAt: trial.expiresAt,
      metadata: {
        daysRemaining,
        trialEndDate: trial.expiresAt.toISOString(),
      },
    });
  }

  return recommendations;
}

/**
 * Check for bundle discount opportunities
 */
async function checkBundleOpportunities(
  context: TenantUpsellContext
): Promise<UpsellRecommendation[]> {
  const recommendations: UpsellRecommendation[] = [];

  // Define bundle combinations
  const bundles = [
    {
      name: "HR Complete Bundle",
      addons: ["hrms", "payroll", "whatsapp-automation"],
      discount: 20,
      description: "Get HRMS, Payroll, and WhatsApp Automation together",
    },
    {
      name: "Analytics Bundle",
      addons: ["advanced-analytics", "hrms"],
      discount: 15,
      description: "Combine Advanced Analytics with HRMS for deeper insights",
    },
  ];

  for (const bundle of bundles) {
    // Check how many addons from this bundle the tenant has
    const activeFromBundle = bundle.addons.filter((a) =>
      context.activeAddons.includes(a)
    );
    const missingFromBundle = bundle.addons.filter(
      (a) => !context.activeAddons.includes(a)
    );

    // If they have some but not all, suggest the bundle
    if (activeFromBundle.length > 0 && missingFromBundle.length > 0) {
      recommendations.push({
        type: "BUNDLE_DISCOUNT",
        addonId: "bundle:" + bundle.name.toLowerCase().replace(/\s+/g, "-"),
        addonName: bundle.name,
        title: `Complete Your ${bundle.name}`,
        description: `You already have ${activeFromBundle.length} of ${bundle.addons.length} add-ons. Add ${missingFromBundle.join(", ")} and save ${bundle.discount}%!`,
        priority: "medium",
        savings: `${bundle.discount}% off`,
        ctaText: "Get Bundle Discount",
        ctaAction: `/marketplace/bundles/${bundle.name.toLowerCase().replace(/\s+/g, "-")}`,
        metadata: {
          bundleName: bundle.name,
          activeAddons: activeFromBundle,
          missingAddons: missingFromBundle,
          discountPercent: bundle.discount,
        },
      });
    }
  }

  return recommendations;
}

/**
 * Check for feature unlock suggestions based on plan tier
 */
async function checkFeatureUnlocks(
  context: TenantUpsellContext
): Promise<UpsellRecommendation[]> {
  const recommendations: UpsellRecommendation[] = [];

  // Get addons available at higher tiers
  const allAddons = await db
    .select()
    .from(addons)
    .where(eq(addons.status, "published"));

  const planTierOrder = ["starter", "growth", "professional", "enterprise"];
  const currentTierIndex = planTierOrder.indexOf(context.planTier.toLowerCase());

  if (currentTierIndex >= 0 && currentTierIndex < planTierOrder.length - 1) {
    // Get addons that require higher tier
    const eligibilityRules = await db
      .select()
      .from(addonPlanEligibility)
      .where(
        and(
          eq(addonPlanEligibility.countryCode, context.countryCode),
          eq(addonPlanEligibility.canPurchase, false)
        )
      );

    // Find addons blocked at current tier but available at next tier
    for (const rule of eligibilityRules) {
      if (rule.planTier.toLowerCase() === context.planTier.toLowerCase()) {
        const addon = allAddons.find((a) => a.id === rule.addonId);
        if (addon && !context.activeAddons.includes(addon.slug)) {
          recommendations.push({
            type: "FEATURE_UNLOCK",
            addonId: addon.id,
            addonName: addon.name,
            title: `Unlock ${addon.name}`,
            description: `${addon.name} is available with a higher plan tier. Upgrade to access this feature.`,
            priority: "low",
            ctaText: "Upgrade Plan",
            ctaAction: "/billing/upgrade",
            metadata: {
              requiredTier: planTierOrder[currentTierIndex + 1],
              currentTier: context.planTier,
            },
          });
        }
      }
    }
  }

  return recommendations;
}

/**
 * Calculate potential savings when upgrading tiers
 */
function calculateTierSavings(
  nextTier: { perEmployeeMonthlyPrice?: string; monthlyPrice?: string },
  currentTier: { perEmployeeMonthlyPrice?: string; monthlyPrice?: string },
  countryCode: string
): string {
  // Volume discounts typically provide 15-30% savings at higher tiers
  const currencySymbol = countryCode === "IN" ? "₹" : countryCode === "MY" ? "MYR " : "$";
  
  if (nextTier.perEmployeeMonthlyPrice && currentTier.perEmployeeMonthlyPrice) {
    const nextPrice = parseFloat(nextTier.perEmployeeMonthlyPrice);
    const currentPrice = parseFloat(currentTier.perEmployeeMonthlyPrice);
    const savingsPerEmployee = currentPrice - nextPrice;
    
    if (savingsPerEmployee > 0) {
      return `${currencySymbol}${savingsPerEmployee.toFixed(0)}/employee savings`;
    }
  }
  
  return "Volume discount available";
}

/**
 * Get upsell recommendations for a specific tenant
 */
export async function getUpsellsForTenant(tenantId: string, countryCode: string = "IN", planTier: string = "starter"): Promise<UpsellRecommendation[]> {
  // Get active addons
  const activeAddonSubs = await db
    .select({
      addonId: tenantAddons.addonId,
      status: tenantAddons.status,
      installedAt: tenantAddons.installedAt,
    })
    .from(tenantAddons)
    .where(eq(tenantAddons.tenantId, tenantId));

  const activeAddons = activeAddonSubs
    .filter((s) => s.status === "active")
    .map((s) => s.addonId);

  // For trial addons, fetch from addon install history with trial status
  // TODO: When trial tracking is added to tenantAddons schema, populate this from database
  // Currently placeholder - to enable trial expiry notifications, add trialEndsAt column to tenantAddons
  const trialAddons: { addonId: string; expiresAt: Date }[] = [];

  // Build context - employee count would come from HRMS module
  const context: TenantUpsellContext = {
    tenantId,
    countryCode,
    planTier,
    employeeCount: 0, // Would be fetched from HRMS if available
    activeAddons,
    trialAddons,
  };

  return generateUpsellRecommendations(context);
}
