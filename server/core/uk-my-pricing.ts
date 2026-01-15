import { db } from "../db";
import { globalPricingPlans } from "@shared/schema";
import { eq } from "drizzle-orm";

export const UK_PRICING_TIERS = {
  FREE: "free",
  BASIC: "basic",
  PRO: "pro",
} as const;

export const UK_PRICING_CONFIG = {
  [UK_PRICING_TIERS.FREE]: {
    code: "uk_free",
    name: "Free",
    description: "Get started with essential features",
    tier: "free",
    basePrice: "0",
    currency: "GBP",
    maxUsers: 1,
    maxCustomers: 25,
    maxRecords: 50,
    billingCycles: {
      monthly: { price: 0, enabled: true },
      yearly: { price: 0, enabled: true },
    },
    features: {
      recordLimit: true,
      whatsappAutomation: false,
      vatFeatures: false,
      unlimitedRecords: false,
      basicAnalytics: true,
      emailNotifications: true,
      softwareServices: false,
      consulting: true,
      timesheets: false,
      invoicing: true,
    },
  },
  [UK_PRICING_TIERS.BASIC]: {
    code: "uk_basic",
    name: "Basic",
    description: "Perfect for growing businesses",
    tier: "basic",
    basePrice: "9.99",
    currency: "GBP",
    maxUsers: 3,
    maxCustomers: 200,
    maxRecords: 500,
    billingCycles: {
      monthly: { price: 9.99, enabled: true },
      yearly: { price: 99.99, enabled: true, badge: "Save 16%" },
    },
    features: {
      recordLimit: true,
      whatsappAutomation: false,
      vatFeatures: true,
      unlimitedRecords: false,
      basicAnalytics: true,
      advancedAnalytics: true,
      emailNotifications: true,
      smsNotifications: true,
      softwareServices: true,
      consulting: true,
      timesheets: true,
      invoicing: true,
    },
  },
  [UK_PRICING_TIERS.PRO]: {
    code: "uk_pro",
    name: "Pro",
    description: "For established businesses that need more",
    tier: "pro",
    basePrice: "19.99",
    currency: "GBP",
    maxUsers: 10,
    maxCustomers: -1,
    maxRecords: -1,
    billingCycles: {
      monthly: { price: 19.99, enabled: true },
      yearly: { price: 199.99, enabled: true, badge: "Save 16%" },
    },
    features: {
      recordLimit: false,
      whatsappAutomation: true,
      vatFeatures: true,
      unlimitedRecords: true,
      basicAnalytics: true,
      advancedAnalytics: true,
      emailNotifications: true,
      smsNotifications: true,
      whatsappNotifications: true,
      prioritySupport: true,
      softwareServices: true,
      consulting: true,
      timesheets: true,
      invoicing: true,
    },
  },
} as const;

export const MY_PRICING_TIERS = {
  FREE: "free",
  BASIC: "basic",
  PRO: "pro",
} as const;

export const MY_PRICING_CONFIG = {
  [MY_PRICING_TIERS.FREE]: {
    code: "my_free",
    name: "Free",
    description: "Get started with essential features",
    tier: "free",
    basePrice: "0",
    currency: "MYR",
    maxUsers: 1,
    maxCustomers: 25,
    maxRecords: 50,
    billingCycles: {
      monthly: { price: 0, enabled: true },
      yearly: { price: 0, enabled: true },
    },
    features: {
      recordLimit: true,
      whatsappAutomation: false,
      sstFeatures: false,
      unlimitedRecords: false,
      basicAnalytics: true,
      emailNotifications: true,
      softwareServices: false,
      consulting: true,
      timesheets: false,
      invoicing: true,
    },
  },
  [MY_PRICING_TIERS.BASIC]: {
    code: "my_basic",
    name: "Basic",
    description: "Perfect for growing businesses",
    tier: "basic",
    basePrice: "49",
    currency: "MYR",
    maxUsers: 3,
    maxCustomers: 200,
    maxRecords: 500,
    billingCycles: {
      monthly: { price: 49, enabled: true },
      yearly: { price: 490, enabled: true, badge: "Save 17%" },
    },
    features: {
      recordLimit: true,
      whatsappAutomation: false,
      sstFeatures: true,
      unlimitedRecords: false,
      basicAnalytics: true,
      advancedAnalytics: true,
      emailNotifications: true,
      smsNotifications: true,
      softwareServices: true,
      consulting: true,
      timesheets: true,
      invoicing: true,
    },
  },
  [MY_PRICING_TIERS.PRO]: {
    code: "my_pro",
    name: "Pro",
    description: "For established businesses that need more",
    tier: "pro",
    basePrice: "99",
    currency: "MYR",
    maxUsers: 10,
    maxCustomers: -1,
    maxRecords: -1,
    billingCycles: {
      monthly: { price: 99, enabled: true },
      yearly: { price: 990, enabled: true, badge: "Save 17%" },
    },
    features: {
      recordLimit: false,
      whatsappAutomation: true,
      sstFeatures: true,
      unlimitedRecords: true,
      basicAnalytics: true,
      advancedAnalytics: true,
      emailNotifications: true,
      smsNotifications: true,
      whatsappNotifications: true,
      prioritySupport: true,
      softwareServices: true,
      consulting: true,
      timesheets: true,
      invoicing: true,
    },
  },
} as const;

export const UK_PLAN_ORDER: Record<string, number> = {
  "uk_free": 1,
  "uk_basic": 2,
  "uk_pro": 3,
};

export const MY_PLAN_ORDER: Record<string, number> = {
  "my_free": 1,
  "my_basic": 2,
  "my_pro": 3,
};

export async function seedUKPricingPlans(): Promise<void> {
  console.log("[uk-pricing] Seeding UK pricing plans...");

  for (const config of Object.values(UK_PRICING_CONFIG)) {
    const displayOrder = UK_PLAN_ORDER[config.code] || 1;

    const existing = await db
      .select()
      .from(globalPricingPlans)
      .where(eq(globalPricingPlans.code, config.code))
      .limit(1);

    const featureFlagsData: Record<string, boolean> = {
      vat_features: Boolean((config.features as any).vatFeatures),
      whatsapp_automation: Boolean(config.features.whatsappAutomation),
      priority_support: "prioritySupport" in config.features ? Boolean((config.features as any).prioritySupport) : false,
      email_notifications: Boolean(config.features.emailNotifications),
      sms_notifications: "smsNotifications" in config.features ? Boolean((config.features as any).smsNotifications) : false,
      advanced_analytics: "advancedAnalytics" in config.features ? Boolean((config.features as any).advancedAnalytics) : false,
      unlimited_records: Boolean(config.features.unlimitedRecords),
      software_services: "softwareServices" in config.features ? Boolean((config.features as any).softwareServices) : false,
      consulting: "consulting" in config.features ? Boolean((config.features as any).consulting) : true,
      timesheets: "timesheets" in config.features ? Boolean((config.features as any).timesheets) : false,
      invoicing: "invoicing" in config.features ? Boolean((config.features as any).invoicing) : true,
    };

    const limitsData = {
      users: config.maxUsers,
      customers: config.maxCustomers,
      records: config.maxRecords,
    };

    const isRecommended = config.tier === "basic";

    if (existing.length === 0) {
      await db.insert(globalPricingPlans).values({
        code: config.code,
        name: config.name,
        description: config.description,
        tier: config.tier,
        basePrice: config.basePrice,
        billingCycles: config.billingCycles,
        maxUsers: config.maxUsers,
        maxCustomers: config.maxCustomers,
        features: config.features,
        featureFlags: featureFlagsData,
        limits: limitsData,
        isActive: true,
        isPublic: true,
        isRecommended,
        sortOrder: displayOrder,
        countryCode: "UK",
        currencyCode: "GBP",
      });
      console.log(`[uk-pricing] Created plan: ${config.name}`);
    } else {
      await db
        .update(globalPricingPlans)
        .set({
          name: config.name,
          description: config.description,
          basePrice: config.basePrice,
          billingCycles: config.billingCycles,
          maxUsers: config.maxUsers,
          maxCustomers: config.maxCustomers,
          features: config.features,
          featureFlags: featureFlagsData,
          limits: limitsData,
          isActive: true,
          isPublic: true,
          isRecommended,
          sortOrder: displayOrder,
          countryCode: "UK",
          currencyCode: "GBP",
          updatedAt: new Date(),
        })
        .where(eq(globalPricingPlans.code, config.code));
      console.log(`[uk-pricing] Updated plan: ${config.name}`);
    }
  }

  console.log("[uk-pricing] UK pricing plans seeded successfully");
}

export async function seedMYPricingPlans(): Promise<void> {
  console.log("[my-pricing] Seeding Malaysia pricing plans...");

  for (const config of Object.values(MY_PRICING_CONFIG)) {
    const displayOrder = MY_PLAN_ORDER[config.code] || 1;

    const existing = await db
      .select()
      .from(globalPricingPlans)
      .where(eq(globalPricingPlans.code, config.code))
      .limit(1);

    const featureFlagsData: Record<string, boolean> = {
      sst_features: Boolean((config.features as any).sstFeatures),
      whatsapp_automation: Boolean(config.features.whatsappAutomation),
      priority_support: "prioritySupport" in config.features ? Boolean((config.features as any).prioritySupport) : false,
      email_notifications: Boolean(config.features.emailNotifications),
      sms_notifications: "smsNotifications" in config.features ? Boolean((config.features as any).smsNotifications) : false,
      advanced_analytics: "advancedAnalytics" in config.features ? Boolean((config.features as any).advancedAnalytics) : false,
      unlimited_records: Boolean(config.features.unlimitedRecords),
      software_services: "softwareServices" in config.features ? Boolean((config.features as any).softwareServices) : false,
      consulting: "consulting" in config.features ? Boolean((config.features as any).consulting) : true,
      timesheets: "timesheets" in config.features ? Boolean((config.features as any).timesheets) : false,
      invoicing: "invoicing" in config.features ? Boolean((config.features as any).invoicing) : true,
    };

    const limitsData = {
      users: config.maxUsers,
      customers: config.maxCustomers,
      records: config.maxRecords,
    };

    const isRecommended = config.tier === "basic";

    if (existing.length === 0) {
      await db.insert(globalPricingPlans).values({
        code: config.code,
        name: config.name,
        description: config.description,
        tier: config.tier,
        basePrice: config.basePrice,
        billingCycles: config.billingCycles,
        maxUsers: config.maxUsers,
        maxCustomers: config.maxCustomers,
        features: config.features,
        featureFlags: featureFlagsData,
        limits: limitsData,
        isActive: true,
        isPublic: true,
        isRecommended,
        sortOrder: displayOrder,
        countryCode: "MY",
        currencyCode: "MYR",
      });
      console.log(`[my-pricing] Created plan: ${config.name}`);
    } else {
      await db
        .update(globalPricingPlans)
        .set({
          name: config.name,
          description: config.description,
          basePrice: config.basePrice,
          billingCycles: config.billingCycles,
          maxUsers: config.maxUsers,
          maxCustomers: config.maxCustomers,
          features: config.features,
          featureFlags: featureFlagsData,
          limits: limitsData,
          isActive: true,
          isPublic: true,
          isRecommended,
          sortOrder: displayOrder,
          countryCode: "MY",
          currencyCode: "MYR",
          updatedAt: new Date(),
        })
        .where(eq(globalPricingPlans.code, config.code));
      console.log(`[my-pricing] Updated plan: ${config.name}`);
    }
  }

  console.log("[my-pricing] Malaysia pricing plans seeded successfully");
}
