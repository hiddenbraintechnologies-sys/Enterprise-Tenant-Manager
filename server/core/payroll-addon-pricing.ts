import { db } from "../db";
import { payrollAddonTiers, bundleDiscounts, tenantPayrollAddon, countryRolloutPolicy } from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";

export const PAYROLL_TIER_CODES = {
  TIER_1_5: "tier_1_5",
  TIER_6_20: "tier_6_20",
  TIER_21_50: "tier_21_50",
  TIER_51_100: "tier_51_100",
  TIER_CUSTOM: "tier_custom",
} as const;

export const INDIA_PAYROLL_TIERS = {
  [PAYROLL_TIER_CODES.TIER_1_5]: {
    tierName: "Payroll 1-5 Employees",
    minEmployees: 1,
    maxEmployees: 5,
    perEmployeeMonthlyPrice: "99",
    minimumMonthlyCharge: "199",
    monthlyPrice: "199",
    yearlyPrice: "1990",
    currencyCode: "INR",
    countryCode: "IN",
  },
  [PAYROLL_TIER_CODES.TIER_6_20]: {
    tierName: "Payroll 6-20 Employees",
    minEmployees: 6,
    maxEmployees: 20,
    perEmployeeMonthlyPrice: "79",
    minimumMonthlyCharge: "399",
    monthlyPrice: "399",
    yearlyPrice: "3990",
    currencyCode: "INR",
    countryCode: "IN",
  },
  [PAYROLL_TIER_CODES.TIER_21_50]: {
    tierName: "Payroll 21-50 Employees",
    minEmployees: 21,
    maxEmployees: 50,
    perEmployeeMonthlyPrice: "59",
    minimumMonthlyCharge: "999",
    monthlyPrice: "999",
    yearlyPrice: "9990",
    currencyCode: "INR",
    countryCode: "IN",
  },
  [PAYROLL_TIER_CODES.TIER_51_100]: {
    tierName: "Payroll 51-100 Employees",
    minEmployees: 51,
    maxEmployees: 100,
    perEmployeeMonthlyPrice: "49",
    minimumMonthlyCharge: "1999",
    monthlyPrice: "1999",
    yearlyPrice: "19990",
    currencyCode: "INR",
    countryCode: "IN",
  },
} as const;

export const MALAYSIA_PAYROLL_TIER_CODES = {
  STARTER: "starter",      // Up to 5 employees - MYR 20/mo
  GROWTH: "growth",        // Up to 15 employees - MYR 39/mo
  SCALE: "scale",          // Up to 50 employees - MYR 69/mo
  UNLIMITED: "unlimited",  // Unlimited employees - MYR 99/mo
} as const;

// Malaysia Payroll Tiers - Simple SMB-friendly pricing
// Trial: 7 days, up to 5 employees (handled in hr-addon-gating.ts)
export const MALAYSIA_PAYROLL_TIERS = {
  [MALAYSIA_PAYROLL_TIER_CODES.STARTER]: {
    tierName: "Payroll Starter",
    minEmployees: 1,
    maxEmployees: 5,
    monthlyPrice: "20",
    yearlyPrice: "200",  // ~17% discount for yearly
    currencyCode: "MYR",
    countryCode: "MY",
  },
  [MALAYSIA_PAYROLL_TIER_CODES.GROWTH]: {
    tierName: "Payroll Growth",
    minEmployees: 1,
    maxEmployees: 15,
    monthlyPrice: "39",
    yearlyPrice: "390",  // ~17% discount for yearly
    currencyCode: "MYR",
    countryCode: "MY",
  },
  [MALAYSIA_PAYROLL_TIER_CODES.SCALE]: {
    tierName: "Payroll Scale",
    minEmployees: 1,
    maxEmployees: 50,
    monthlyPrice: "69",
    yearlyPrice: "690",  // ~17% discount for yearly
    currencyCode: "MYR",
    countryCode: "MY",
  },
  [MALAYSIA_PAYROLL_TIER_CODES.UNLIMITED]: {
    tierName: "Payroll Unlimited",
    minEmployees: 1,
    maxEmployees: -1,  // -1 means unlimited
    monthlyPrice: "99",
    yearlyPrice: "990",  // ~17% discount for yearly
    currencyCode: "MYR",
    countryCode: "MY",
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

export const MALAYSIA_BUNDLE_DISCOUNTS = [
  {
    name: "Pro + Payroll Bundle (Malaysia)",
    description: "RM5/employee off Payroll with Pro plan",
    planCode: "malaysia_pro",
    addonCode: "payroll",
    tierName: null,
    discountType: "fixed",
    discountAmount: "5",
    currencyCode: "MYR",
    countryCode: "MY",
    appliesTo: "addon",
  },
  {
    name: "Basic + HRMS Bundle (Malaysia)",
    description: "RM2/employee off HRMS with Basic plan",
    planCode: "malaysia_basic",
    addonCode: "hrms-malaysia",
    tierName: null,
    discountType: "fixed",
    discountAmount: "2",
    currencyCode: "MYR",
    countryCode: "MY",
    appliesTo: "addon",
  },
];

async function seedCountryPayrollTiers(
  tiers: Record<string, { tierName: string; minEmployees: number; maxEmployees: number; perEmployeeMonthlyPrice?: string; minimumMonthlyCharge?: string; monthlyPrice: string; yearlyPrice: string; currencyCode: string; countryCode: string }>,
  countryName: string
): Promise<void> {
  console.log(`[payroll-addon] Seeding ${countryName} payroll addon tiers...`);

  for (const [tierCode, config] of Object.entries(tiers)) {
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
            perEmployeeMonthlyPrice: config.perEmployeeMonthlyPrice,
            minimumMonthlyCharge: config.minimumMonthlyCharge,
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
          perEmployeeMonthlyPrice: config.perEmployeeMonthlyPrice,
          minimumMonthlyCharge: config.minimumMonthlyCharge,
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

  console.log(`[payroll-addon] ${countryName} payroll addon tiers seeded successfully`);
}

export async function seedPayrollAddonTiers(): Promise<void> {
  await seedCountryPayrollTiers(INDIA_PAYROLL_TIERS, "India");
  await seedCountryPayrollTiers(MALAYSIA_PAYROLL_TIERS, "Malaysia");
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

  console.log("[payroll-addon] India bundle discounts seeded successfully");

  console.log("[payroll-addon] Seeding Malaysia bundle discounts...");

  for (const discountConfig of MALAYSIA_BUNDLE_DISCOUNTS) {
    try {
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

async function seedCountryPayrollRollout(): Promise<void> {
  console.log("[payroll-addon] Seeding country payroll rollout policies...");

  const payrollEnabledCountries = [
    { countryCode: "IN", status: "live" as const, disclaimer: null },
    { countryCode: "MY", status: "live" as const, disclaimer: "Payroll features are now available for Malaysia with SST compliance." },
  ];

  for (const country of payrollEnabledCountries) {
    try {
      const existing = await db
        .select()
        .from(countryRolloutPolicy)
        .where(eq(countryRolloutPolicy.countryCode, country.countryCode))
        .limit(1);

      if (existing.length > 0) {
        const currentAddons = (existing[0].enabledAddons as string[]) || [];
        const updatedAddons = currentAddons.includes("payroll") ? currentAddons : [...currentAddons, "payroll"];
        
        await db
          .update(countryRolloutPolicy)
          .set({
            payrollStatus: country.status,
            payrollDisclaimerText: country.disclaimer,
            enabledAddons: updatedAddons,
            updatedBy: "system",
            updatedAt: new Date(),
          })
          .where(eq(countryRolloutPolicy.countryCode, country.countryCode));
        console.log(`[payroll-addon] Updated payroll rollout for ${country.countryCode}`);
      } else {
        await db.insert(countryRolloutPolicy).values({
          countryCode: country.countryCode,
          payrollStatus: country.status,
          payrollDisclaimerText: country.disclaimer,
          enabledAddons: ["payroll"],
          enabledBusinessTypes: [],
          disabledFeatures: [],
          enabledPlans: [],
          payrollCohortTenantIds: [],
          updatedBy: "system",
        });
        console.log(`[payroll-addon] Created payroll rollout for ${country.countryCode}`);
      }
    } catch (error) {
      console.error(`[payroll-addon] Error seeding rollout for ${country.countryCode}:`, error);
    }
  }

  console.log("[payroll-addon] Country payroll rollout policies seeded successfully");
}

export async function seedPayrollAddon(): Promise<void> {
  await seedPayrollAddonTiers();
  await seedBundleDiscounts();
  await seedCountryPayrollRollout();
}

export function getRecommendedTier(employeeCount: number): typeof PAYROLL_TIER_CODES[keyof typeof PAYROLL_TIER_CODES] | null {
  if (employeeCount <= 5) return PAYROLL_TIER_CODES.TIER_1_5;
  if (employeeCount <= 20) return PAYROLL_TIER_CODES.TIER_6_20;
  if (employeeCount <= 50) return PAYROLL_TIER_CODES.TIER_21_50;
  if (employeeCount <= 100) return PAYROLL_TIER_CODES.TIER_51_100;
  return PAYROLL_TIER_CODES.TIER_CUSTOM;
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
