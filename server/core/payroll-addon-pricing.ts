import { db } from "../db";
import { payrollAddonTiers, bundleDiscounts, tenantPayrollAddon } from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";

export const PAYROLL_TIER_CODES = {
  STARTER: "starter",
  GROWTH: "growth",
  ENTERPRISE: "enterprise",
} as const;

export const INDIA_PAYROLL_TIERS = {
  [PAYROLL_TIER_CODES.STARTER]: {
    tierName: "Payroll Starter",
    minEmployees: 1,
    maxEmployees: 5,
    monthlyPrice: "99",
    yearlyPrice: "999",
    currencyCode: "INR",
    countryCode: "IN",
  },
  [PAYROLL_TIER_CODES.GROWTH]: {
    tierName: "Payroll Growth",
    minEmployees: 6,
    maxEmployees: 20,
    monthlyPrice: "199",
    yearlyPrice: "1999",
    currencyCode: "INR",
    countryCode: "IN",
  },
  [PAYROLL_TIER_CODES.ENTERPRISE]: {
    tierName: "Payroll Enterprise",
    minEmployees: 21,
    maxEmployees: 50,
    monthlyPrice: "399",
    yearlyPrice: "3999",
    currencyCode: "INR",
    countryCode: "IN",
  },
} as const;

export const INDIA_BUNDLE_DISCOUNTS = [
  {
    name: "Basic + Payroll Starter Bundle",
    description: "Save ₹29 when combining Basic plan with Payroll Starter",
    planCode: "india_basic",
    addonCode: "payroll",
    tierName: "Payroll Starter",
    discountType: "fixed",
    discountAmount: "29",
    currencyCode: "INR",
    countryCode: "IN",
    appliesTo: "addon",
  },
  {
    name: "Basic + Payroll Growth Bundle",
    description: "Save ₹49 when combining Basic plan with Payroll Growth",
    planCode: "india_basic",
    addonCode: "payroll",
    tierName: "Payroll Growth",
    discountType: "fixed",
    discountAmount: "49",
    currencyCode: "INR",
    countryCode: "IN",
    appliesTo: "addon",
  },
  {
    name: "Pro + Payroll Bundle",
    description: "10% off any Payroll tier with Pro plan",
    planCode: "india_pro",
    addonCode: "payroll",
    tierName: null,
    discountType: "percentage",
    discountAmount: "10",
    currencyCode: "INR",
    countryCode: "IN",
    appliesTo: "addon",
  },
];

export async function seedPayrollAddonTiers(): Promise<void> {
  console.log("[payroll-addon] Seeding India payroll addon tiers...");

  for (const [tierCode, config] of Object.entries(INDIA_PAYROLL_TIERS)) {
    try {
      const existing = await db
        .select()
        .from(payrollAddonTiers)
        .where(
          and(
            eq(payrollAddonTiers.tierName, config.tierName),
            eq(payrollAddonTiers.countryCode, config.countryCode)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        await db
          .update(payrollAddonTiers)
          .set({
            minEmployees: config.minEmployees,
            maxEmployees: config.maxEmployees,
            monthlyPrice: config.monthlyPrice,
            yearlyPrice: config.yearlyPrice,
            currencyCode: config.currencyCode,
            updatedAt: new Date(),
          })
          .where(eq(payrollAddonTiers.id, existing[0].id));
        console.log(`[payroll-addon] Updated tier: ${config.tierName}`);
      } else {
        await db.insert(payrollAddonTiers).values({
          addonCode: "payroll",
          tierName: config.tierName,
          minEmployees: config.minEmployees,
          maxEmployees: config.maxEmployees,
          monthlyPrice: config.monthlyPrice,
          yearlyPrice: config.yearlyPrice,
          currencyCode: config.currencyCode,
          countryCode: config.countryCode,
          isActive: true,
        });
        console.log(`[payroll-addon] Created tier: ${config.tierName}`);
      }
    } catch (error) {
      console.error(`[payroll-addon] Error seeding tier ${config.tierName}:`, error);
    }
  }

  console.log("[payroll-addon] Payroll addon tiers seeded successfully");
}

export async function seedBundleDiscounts(): Promise<void> {
  console.log("[payroll-addon] Seeding India bundle discounts...");

  for (const discountConfig of INDIA_BUNDLE_DISCOUNTS) {
    try {
      let addonTierId: string | null = null;

      if (discountConfig.tierName) {
        const tier = await db
          .select()
          .from(payrollAddonTiers)
          .where(
            and(
              eq(payrollAddonTiers.tierName, discountConfig.tierName),
              eq(payrollAddonTiers.countryCode, discountConfig.countryCode)
            )
          )
          .limit(1);
        if (tier.length > 0) {
          addonTierId = tier[0].id;
        }
      }

      const existing = await db
        .select()
        .from(bundleDiscounts)
        .where(
          and(
            eq(bundleDiscounts.name, discountConfig.name),
            eq(bundleDiscounts.countryCode, discountConfig.countryCode)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        await db
          .update(bundleDiscounts)
          .set({
            discountType: discountConfig.discountType,
            discountAmount: discountConfig.discountAmount,
            addonTierId,
            updatedAt: new Date(),
          })
          .where(eq(bundleDiscounts.id, existing[0].id));
        console.log(`[payroll-addon] Updated discount: ${discountConfig.name}`);
      } else {
        await db.insert(bundleDiscounts).values({
          name: discountConfig.name,
          description: discountConfig.description,
          planCode: discountConfig.planCode,
          addonCode: discountConfig.addonCode,
          addonTierId,
          discountType: discountConfig.discountType,
          discountAmount: discountConfig.discountAmount,
          currencyCode: discountConfig.currencyCode,
          countryCode: discountConfig.countryCode,
          appliesTo: discountConfig.appliesTo,
          isActive: true,
        });
        console.log(`[payroll-addon] Created discount: ${discountConfig.name}`);
      }
    } catch (error) {
      console.error(`[payroll-addon] Error seeding discount ${discountConfig.name}:`, error);
    }
  }

  console.log("[payroll-addon] Bundle discounts seeded successfully");
}

export async function seedPayrollAddon(): Promise<void> {
  await seedPayrollAddonTiers();
  await seedBundleDiscounts();
}

export function getRecommendedTier(employeeCount: number): typeof PAYROLL_TIER_CODES[keyof typeof PAYROLL_TIER_CODES] | null {
  if (employeeCount <= 5) return PAYROLL_TIER_CODES.STARTER;
  if (employeeCount <= 20) return PAYROLL_TIER_CODES.GROWTH;
  if (employeeCount <= 50) return PAYROLL_TIER_CODES.ENTERPRISE;
  return null;
}

export async function getTierForEmployeeCount(employeeCount: number, countryCode: string = "IN"): Promise<any | null> {
  const tier = await db
    .select()
    .from(payrollAddonTiers)
    .where(
      and(
        eq(payrollAddonTiers.countryCode, countryCode),
        eq(payrollAddonTiers.isActive, true),
        sql`${payrollAddonTiers.minEmployees} <= ${employeeCount}`,
        sql`${payrollAddonTiers.maxEmployees} >= ${employeeCount}`
      )
    )
    .limit(1);

  return tier.length > 0 ? tier[0] : null;
}

export async function getBundleDiscount(
  planCode: string,
  tierId: string | null,
  countryCode: string = "IN"
): Promise<any | null> {
  const conditions = [
    eq(bundleDiscounts.planCode, planCode),
    eq(bundleDiscounts.addonCode, "payroll"),
    eq(bundleDiscounts.countryCode, countryCode),
    eq(bundleDiscounts.isActive, true),
  ];

  if (tierId) {
    const tierDiscount = await db
      .select()
      .from(bundleDiscounts)
      .where(and(...conditions, eq(bundleDiscounts.addonTierId, tierId)))
      .limit(1);

    if (tierDiscount.length > 0) {
      return tierDiscount[0];
    }
  }

  const genericDiscount = await db
    .select()
    .from(bundleDiscounts)
    .where(and(...conditions, sql`${bundleDiscounts.addonTierId} IS NULL`))
    .limit(1);

  return genericDiscount.length > 0 ? genericDiscount[0] : null;
}

export function calculateDiscountedPrice(
  basePrice: number,
  discount: { discountType: string; discountAmount: string }
): { finalPrice: number; savings: number } {
  const discountAmount = parseFloat(discount.discountAmount);

  if (discount.discountType === "percentage") {
    const savings = basePrice * (discountAmount / 100);
    return {
      finalPrice: Math.round((basePrice - savings) * 100) / 100,
      savings: Math.round(savings * 100) / 100,
    };
  }

  return {
    finalPrice: Math.max(0, basePrice - discountAmount),
    savings: Math.min(basePrice, discountAmount),
  };
}

export const PAYROLL_TRIAL_DAYS = 7;

export function isTrialEligible(tenantPlanTier: string, trialUsed: boolean): boolean {
  if (trialUsed) return false;
  return tenantPlanTier !== "free";
}

export function getTrialEndDate(): Date {
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + PAYROLL_TRIAL_DAYS);
  return endDate;
}

export function getGraceEndDate(): Date {
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + PAYROLL_TRIAL_DAYS);
  return endDate;
}

export function isInGracePeriod(graceUntil: Date | null): boolean {
  if (!graceUntil) return false;
  return new Date() < graceUntil;
}

export function isTrialActive(trialEndsAt: Date | null): boolean {
  if (!trialEndsAt) return false;
  return new Date() < trialEndsAt;
}
