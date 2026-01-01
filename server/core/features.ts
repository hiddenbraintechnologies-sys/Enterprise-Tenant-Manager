import { db } from "../db";
import { 
  featureFlags, tenantFeatures, tenants,
  type FeatureFlag, type TenantFeature, type InsertTenantFeature
} from "@shared/schema";
import { eq, and } from "drizzle-orm";

export const FEATURES = {
  BOOKING_SYSTEM: "booking_system",
  CUSTOMER_MANAGEMENT: "customer_management",
  SERVICE_CATALOG: "service_catalog",
  STAFF_MANAGEMENT: "staff_management",
  ANALYTICS_BASIC: "analytics_basic",
  ANALYTICS_ADVANCED: "analytics_advanced",
  INVENTORY: "inventory",
  NOTIFICATIONS_EMAIL: "notifications_email",
  NOTIFICATIONS_SMS: "notifications_sms",
  NOTIFICATIONS_WHATSAPP: "notifications_whatsapp",
  BILLING_INVOICES: "billing_invoices",
  BILLING_SUBSCRIPTIONS: "billing_subscriptions",
  CUSTOM_DOMAINS: "custom_domains",
  WHITE_LABEL: "white_label",
  API_ACCESS: "api_access",
  MULTI_LOCATION: "multi_location",
} as const;

export type FeatureCode = typeof FEATURES[keyof typeof FEATURES];

const featureCache = new Map<string, { features: string[]; expiresAt: number }>();
const CACHE_TTL = 60 * 1000;

export class FeatureService {
  async getAllFeatures(): Promise<FeatureFlag[]> {
    return db.select().from(featureFlags);
  }

  async getFeaturesByCategory(category: string): Promise<FeatureFlag[]> {
    return db.select().from(featureFlags).where(eq(featureFlags.category, category));
  }

  async getTenantFeatures(tenantId: string, useCache = true): Promise<string[]> {
    if (useCache) {
      const cached = featureCache.get(tenantId);
      if (cached && cached.expiresAt > Date.now()) {
        return cached.features;
      }
    }

    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId));
    if (!tenant) {
      return [];
    }

    const allFeatures = await db.select().from(featureFlags);
    const enabledOverrides = await db.select()
      .from(tenantFeatures)
      .where(and(
        eq(tenantFeatures.tenantId, tenantId),
        eq(tenantFeatures.isEnabled, true)
      ));
    const disabledOverrides = await db.select()
      .from(tenantFeatures)
      .where(and(
        eq(tenantFeatures.tenantId, tenantId),
        eq(tenantFeatures.isEnabled, false)
      ));

    const tier = tenant.subscriptionTier || "free";
    const tierOrder = ["free", "pro", "enterprise"];
    const tierIndex = tierOrder.indexOf(tier);

    const enabledCodes = new Set<string>();

    for (const feature of allFeatures) {
      if (feature.isGlobal) {
        enabledCodes.add(feature.code);
        continue;
      }

      const requiredTierIndex = tierOrder.indexOf(feature.requiredTier || "free");
      if (tierIndex >= requiredTierIndex && feature.defaultEnabled) {
        enabledCodes.add(feature.code);
      }
    }

    for (const override of enabledOverrides) {
      enabledCodes.add(override.featureCode);
    }

    for (const override of disabledOverrides) {
      enabledCodes.delete(override.featureCode);
    }

    const features = Array.from(enabledCodes);
    
    featureCache.set(tenantId, {
      features,
      expiresAt: Date.now() + CACHE_TTL,
    });

    return features;
  }

  async isFeatureEnabled(tenantId: string, featureCode: string): Promise<boolean> {
    const features = await this.getTenantFeatures(tenantId);
    return features.includes(featureCode);
  }

  async enableFeature(tenantId: string, featureCode: string, enabledBy?: string): Promise<TenantFeature> {
    const [existing] = await db.select()
      .from(tenantFeatures)
      .where(and(
        eq(tenantFeatures.tenantId, tenantId),
        eq(tenantFeatures.featureCode, featureCode)
      ));

    if (existing) {
      const [updated] = await db.update(tenantFeatures)
        .set({ isEnabled: true, enabledBy, enabledAt: new Date() })
        .where(eq(tenantFeatures.id, existing.id))
        .returning();
      
      featureCache.delete(tenantId);
      return updated;
    }

    const [created] = await db.insert(tenantFeatures)
      .values({
        tenantId,
        featureCode,
        isEnabled: true,
        enabledBy,
      })
      .returning();

    featureCache.delete(tenantId);
    return created;
  }

  async disableFeature(tenantId: string, featureCode: string): Promise<void> {
    const [existing] = await db.select()
      .from(tenantFeatures)
      .where(and(
        eq(tenantFeatures.tenantId, tenantId),
        eq(tenantFeatures.featureCode, featureCode)
      ));

    if (existing) {
      await db.update(tenantFeatures)
        .set({ isEnabled: false })
        .where(eq(tenantFeatures.id, existing.id));
    } else {
      await db.insert(tenantFeatures)
        .values({
          tenantId,
          featureCode,
          isEnabled: false,
        });
    }

    featureCache.delete(tenantId);
  }

  async setFeatureConfig(tenantId: string, featureCode: string, config: Record<string, any>): Promise<void> {
    const [existing] = await db.select()
      .from(tenantFeatures)
      .where(and(
        eq(tenantFeatures.tenantId, tenantId),
        eq(tenantFeatures.featureCode, featureCode)
      ));

    if (existing) {
      await db.update(tenantFeatures)
        .set({ config })
        .where(eq(tenantFeatures.id, existing.id));
    } else {
      await db.insert(tenantFeatures)
        .values({
          tenantId,
          featureCode,
          isEnabled: true,
          config,
        });
    }

    featureCache.delete(tenantId);
  }

  async getFeatureConfig(tenantId: string, featureCode: string): Promise<Record<string, any> | null> {
    const [result] = await db.select()
      .from(tenantFeatures)
      .where(and(
        eq(tenantFeatures.tenantId, tenantId),
        eq(tenantFeatures.featureCode, featureCode)
      ));

    return result?.config as Record<string, any> || null;
  }

  clearCache(tenantId?: string): void {
    if (tenantId) {
      featureCache.delete(tenantId);
    } else {
      featureCache.clear();
    }
  }
}

export const featureService = new FeatureService();
