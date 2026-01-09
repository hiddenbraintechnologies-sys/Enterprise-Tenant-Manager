import { db } from "../db";
import { 
  globalPricingPlans, tenantSubscriptions, countryPricingConfigs, planLocalPrices,
  tenants, subscriptionInvoices, tenantAddons, addons,
  type GlobalPricingPlan, type InsertGlobalPricingPlan,
  type TenantSubscription, type InsertTenantSubscription,
  type CountryPricingConfig, type InsertCountryPricingConfig,
  type SubscriptionInvoice,
} from "@shared/schema";
import { eq, and, desc, gte, lte, sql, inArray } from "drizzle-orm";

export interface ModuleAccess {
  moduleId: string;
  access: "included" | "addon" | "unavailable";
  reason?: string;
}

export interface SubscriptionFeatures {
  modules: string[];
  maxUsers: number;
  maxCustomers: number;
  multiCurrency: boolean;
  aiInsights: boolean;
  whiteLabel: boolean;
  apiRateLimit: number;
}

const MODULE_TIER_ACCESS: Record<string, Record<string, "included" | "addon" | "unavailable">> = {
  furniture: { free: "unavailable", starter: "addon", pro: "included", enterprise: "included" },
  furniture_manufacturing: { free: "unavailable", starter: "addon", pro: "included", enterprise: "included" },
  hrms: { free: "unavailable", starter: "included", pro: "included", enterprise: "included" },
  legal: { free: "unavailable", starter: "addon", pro: "included", enterprise: "included" },
  education: { free: "unavailable", starter: "addon", pro: "included", enterprise: "included" },
  tourism: { free: "unavailable", starter: "addon", pro: "included", enterprise: "included" },
  logistics: { free: "unavailable", starter: "addon", pro: "included", enterprise: "included" },
  real_estate: { free: "unavailable", starter: "addon", pro: "included", enterprise: "included" },
  pg_hostel: { free: "included", starter: "included", pro: "included", enterprise: "included" },
  coworking: { free: "included", starter: "included", pro: "included", enterprise: "included" },
  clinic: { free: "unavailable", starter: "unavailable", pro: "addon", enterprise: "included" },
  salon: { free: "included", starter: "included", pro: "included", enterprise: "included" },
  gym: { free: "included", starter: "included", pro: "included", enterprise: "included" },
  general_service: { free: "included", starter: "included", pro: "included", enterprise: "included" },
  service: { free: "included", starter: "included", pro: "included", enterprise: "included" },
  marketplace: { free: "unavailable", starter: "included", pro: "included", enterprise: "included" },
  analytics: { free: "unavailable", starter: "included", pro: "included", enterprise: "included" },
  bookings: { free: "included", starter: "included", pro: "included", enterprise: "included" },
  invoices: { free: "included", starter: "included", pro: "included", enterprise: "included" },
  customers: { free: "included", starter: "included", pro: "included", enterprise: "included" },
  services: { free: "included", starter: "included", pro: "included", enterprise: "included" },
  settings: { free: "included", starter: "included", pro: "included", enterprise: "included" },
  onboarding: { free: "included", starter: "included", pro: "included", enterprise: "included" },
  reseller: { free: "unavailable", starter: "unavailable", pro: "addon", enterprise: "included" },
  portal: { free: "included", starter: "included", pro: "included", enterprise: "included" },
};

const TIER_LIMITS: Record<string, { maxUsers: number; maxCustomers: number; apiRateLimit: number }> = {
  free: { maxUsers: 1, maxCustomers: 25, apiRateLimit: 100 },
  starter: { maxUsers: 5, maxCustomers: 100, apiRateLimit: 1000 },
  pro: { maxUsers: 25, maxCustomers: 500, apiRateLimit: 10000 },
  enterprise: { maxUsers: -1, maxCustomers: -1, apiRateLimit: -1 },
};

const MODULE_ADDON_MAPPING: Record<string, string[]> = {
  furniture: ["furniture_manufacturing", "furniture", "manufacturing"],
  furniture_manufacturing: ["furniture_manufacturing", "furniture", "manufacturing"],
  legal: ["legal_services", "legal", "case_management"],
  education: ["education", "coaching", "lms"],
  tourism: ["tourism", "travel", "tour_management"],
  logistics: ["logistics", "delivery", "fleet_management"],
  real_estate: ["real_estate", "property_management"],
  clinic: ["clinic", "healthcare", "medical"],
  analytics: ["analytics", "advanced_analytics", "reporting"],
  marketplace: ["marketplace", "addon_marketplace"],
};

export class SubscriptionService {
  async getActiveSubscription(tenantId: string): Promise<TenantSubscription | null> {
    const [subscription] = await db
      .select()
      .from(tenantSubscriptions)
      .where(
        and(
          eq(tenantSubscriptions.tenantId, tenantId),
          inArray(tenantSubscriptions.status, ["active", "trialing"])
        )
      )
      .limit(1);
    return subscription || null;
  }

  async getPlan(planId: string): Promise<GlobalPricingPlan | null> {
    const [plan] = await db
      .select()
      .from(globalPricingPlans)
      .where(eq(globalPricingPlans.id, planId))
      .limit(1);
    return plan || null;
  }

  async getTenantPlan(tenantId: string): Promise<GlobalPricingPlan | null> {
    const subscription = await this.getActiveSubscription(tenantId);
    if (!subscription) return null;
    return this.getPlan(subscription.planId);
  }

  getModuleAccess(tier: string, moduleId: string): ModuleAccess {
    const moduleMap = MODULE_TIER_ACCESS[moduleId.toLowerCase()];
    if (!moduleMap) {
      return { moduleId, access: "unavailable", reason: "Unknown module" };
    }
    const access = moduleMap[tier.toLowerCase()] || "unavailable";
    return { moduleId, access };
  }

  getAllModuleAccess(tier: string): ModuleAccess[] {
    return Object.keys(MODULE_TIER_ACCESS).map(moduleId => this.getModuleAccess(tier, moduleId));
  }

  getSubscriptionFeatures(tier: string): SubscriptionFeatures {
    const limits = TIER_LIMITS[tier.toLowerCase()] || TIER_LIMITS.free;
    const modules = Object.entries(MODULE_TIER_ACCESS)
      .filter(([_, tiers]) => tiers[tier.toLowerCase()] === "included")
      .map(([moduleId]) => moduleId);

    return {
      modules,
      maxUsers: limits.maxUsers,
      maxCustomers: limits.maxCustomers,
      multiCurrency: tier === "enterprise" || tier === "pro",
      aiInsights: tier === "enterprise",
      whiteLabel: tier === "enterprise",
      apiRateLimit: limits.apiRateLimit,
    };
  }

  async getTenantActiveAddons(tenantId: string): Promise<string[]> {
    try {
      const activeAddons = await db
        .select({ 
          addonId: tenantAddons.addonId,
          slug: addons.slug,
          category: addons.category,
          status: tenantAddons.status,
          subscriptionStatus: tenantAddons.subscriptionStatus
        })
        .from(tenantAddons)
        .innerJoin(addons, eq(addons.id, tenantAddons.addonId))
        .where(eq(tenantAddons.tenantId, tenantId));
      
      const validStatuses = ["active"];
      const invalidSubStatuses = ["cancelled", "past_due", "suspended"];
      
      return activeAddons
        .filter(a => {
          if (!validStatuses.includes(a.status || "")) return false;
          if (a.subscriptionStatus && invalidSubStatuses.includes(a.subscriptionStatus)) return false;
          return true;
        })
        .map(a => a.slug || a.category || a.addonId);
    } catch (error) {
      console.error("[getTenantActiveAddons] Error:", error);
      return [];
    }
  }

  hasModuleAddon(moduleId: string, tenantAddons: string[]): boolean {
    const moduleNormalized = moduleId.toLowerCase();
    const mappedAddons = MODULE_ADDON_MAPPING[moduleNormalized] || [moduleNormalized];
    
    for (const addonCode of tenantAddons) {
      const addonNorm = addonCode.toLowerCase();
      if (mappedAddons.includes(addonNorm)) return true;
      if (addonNorm === moduleNormalized) return true;
      if (addonNorm.includes(moduleNormalized) || moduleNormalized.includes(addonNorm)) return true;
    }
    return false;
  }

  async canAccessModule(tenantId: string, moduleId: string): Promise<{ allowed: boolean; reason?: string }> {
    const plan = await this.getTenantPlan(tenantId);
    if (!plan) {
      return { allowed: false, reason: "No active subscription" };
    }

    const access = this.getModuleAccess(plan.tier, moduleId);
    if (access.access === "included") {
      return { allowed: true };
    }
    if (access.access === "addon") {
      const tenantActiveAddons = await this.getTenantActiveAddons(tenantId);
      
      if (this.hasModuleAddon(moduleId, tenantActiveAddons)) {
        return { allowed: true };
      }
      
      const planFeatures = plan.features as { addons?: string[] } | null;
      const planAddons = planFeatures?.addons || [];
      if (planAddons.includes(moduleId)) {
        return { allowed: true };
      }
      
      return { allowed: false, reason: `Module '${moduleId}' requires add-on purchase` };
    }
    return { allowed: false, reason: `Module '${moduleId}' not available in ${plan.tier} tier` };
  }

  async canAccessFeature(tenantId: string, feature: "multiCurrency" | "aiInsights" | "whiteLabel"): Promise<boolean> {
    const plan = await this.getTenantPlan(tenantId);
    if (!plan) return false;

    const features = this.getSubscriptionFeatures(plan.tier);
    return features[feature] || false;
  }

  async getAllPlans(): Promise<GlobalPricingPlan[]> {
    return db
      .select()
      .from(globalPricingPlans)
      .where(eq(globalPricingPlans.isActive, true))
      .orderBy(globalPricingPlans.sortOrder);
  }

  async createPlan(plan: InsertGlobalPricingPlan): Promise<GlobalPricingPlan> {
    const [created] = await db
      .insert(globalPricingPlans)
      .values(plan)
      .returning();
    return created;
  }

  async updatePlan(id: string, updates: Partial<InsertGlobalPricingPlan>): Promise<GlobalPricingPlan | null> {
    const [updated] = await db
      .update(globalPricingPlans)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(globalPricingPlans.id, id))
      .returning();
    return updated || null;
  }

  async deletePlan(id: string): Promise<boolean> {
    const result = await db
      .update(globalPricingPlans)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(globalPricingPlans.id, id));
    return true;
  }

  async getCountryPricing(): Promise<CountryPricingConfig[]> {
    return db.select().from(countryPricingConfigs).where(eq(countryPricingConfigs.isActive, true));
  }

  async getCountryPricingByCountry(country: string): Promise<CountryPricingConfig | null> {
    const [config] = await db
      .select()
      .from(countryPricingConfigs)
      .where(eq(countryPricingConfigs.country, country as any))
      .limit(1);
    return config || null;
  }

  async upsertCountryPricing(config: InsertCountryPricingConfig): Promise<CountryPricingConfig> {
    const existing = await this.getCountryPricingByCountry(config.country as string);
    if (existing) {
      const [updated] = await db
        .update(countryPricingConfigs)
        .set({ ...config, updatedAt: new Date() })
        .where(eq(countryPricingConfigs.id, existing.id))
        .returning();
      return updated;
    }
    const [created] = await db
      .insert(countryPricingConfigs)
      .values(config)
      .returning();
    return created;
  }

  async getLocalPrices(planId: string): Promise<Array<{ country: string; localPrice: string }>> {
    const prices = await db
      .select({ country: planLocalPrices.country, localPrice: planLocalPrices.localPrice })
      .from(planLocalPrices)
      .where(eq(planLocalPrices.planId, planId));
    return prices;
  }

  async setLocalPrice(planId: string, country: string, localPrice: string): Promise<void> {
    const existing = await db
      .select()
      .from(planLocalPrices)
      .where(and(eq(planLocalPrices.planId, planId), eq(planLocalPrices.country, country as any)))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(planLocalPrices)
        .set({ localPrice, updatedAt: new Date() })
        .where(eq(planLocalPrices.id, existing[0].id));
    } else {
      await db.insert(planLocalPrices).values({ planId, country: country as any, localPrice });
    }
  }

  async assignSubscription(tenantId: string, planId: string, options: {
    billingCycle?: "monthly" | "quarterly" | "yearly";
    trialDays?: number;
  } = {}): Promise<TenantSubscription> {
    const existingSub = await this.getActiveSubscription(tenantId);
    if (existingSub) {
      await db
        .update(tenantSubscriptions)
        .set({ status: "cancelled", cancelledAt: new Date(), updatedAt: new Date() })
        .where(eq(tenantSubscriptions.id, existingSub.id));
    }

    const now = new Date();
    const periodEnd = new Date(now);
    
    switch (options.billingCycle || "monthly") {
      case "yearly":
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);
        break;
      case "quarterly":
        periodEnd.setMonth(periodEnd.getMonth() + 3);
        break;
      default:
        periodEnd.setMonth(periodEnd.getMonth() + 1);
    }

    const trialEndsAt = options.trialDays 
      ? new Date(now.getTime() + options.trialDays * 24 * 60 * 60 * 1000)
      : null;

    const [subscription] = await db
      .insert(tenantSubscriptions)
      .values({
        tenantId,
        planId,
        status: trialEndsAt ? "trialing" : "active",
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        trialEndsAt,
        nextPaymentAt: trialEndsAt || periodEnd,
      })
      .returning();

    return subscription;
  }

  async cancelSubscription(tenantId: string, atPeriodEnd: boolean = true): Promise<TenantSubscription | null> {
    const subscription = await this.getActiveSubscription(tenantId);
    if (!subscription) return null;

    const [updated] = await db
      .update(tenantSubscriptions)
      .set({
        status: atPeriodEnd ? "active" : "cancelled",
        cancelAtPeriodEnd: atPeriodEnd,
        cancelledAt: atPeriodEnd ? null : new Date(),
        updatedAt: new Date(),
      })
      .where(eq(tenantSubscriptions.id, subscription.id))
      .returning();

    return updated;
  }

  async getSubscriptionInvoices(tenantId: string): Promise<SubscriptionInvoice[]> {
    return db
      .select()
      .from(subscriptionInvoices)
      .where(eq(subscriptionInvoices.tenantId, tenantId))
      .orderBy(desc(subscriptionInvoices.createdAt));
  }

  calculateLocalPrice(basePrice: number, country: string, exchangeRate: number, priceMultiplier: number): number {
    return Math.round(basePrice * priceMultiplier * exchangeRate * 100) / 100;
  }

  calculateTotalWithTax(localPrice: number, taxRate: number): number {
    return Math.round(localPrice * (1 + taxRate / 100) * 100) / 100;
  }
}

export const subscriptionService = new SubscriptionService();
