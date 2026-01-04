import { db } from "../db";
import { featureRegistry, featureFlagOverrides, FeatureRegistry, InsertFeatureRegistry, FeatureFlagOverride, InsertFeatureFlagOverride } from "@shared/schema";
import { eq, asc, and, isNull, or } from "drizzle-orm";

export class FeatureRegistryService {
  // Feature Registry CRUD
  async list(): Promise<FeatureRegistry[]> {
    return db.select()
      .from(featureRegistry)
      .orderBy(asc(featureRegistry.displayOrder), asc(featureRegistry.name));
  }

  async listEnabled(): Promise<FeatureRegistry[]> {
    return db.select()
      .from(featureRegistry)
      .where(eq(featureRegistry.enabled, true))
      .orderBy(asc(featureRegistry.displayOrder), asc(featureRegistry.name));
  }

  async listByScope(scope: "global" | "business" | "tenant"): Promise<FeatureRegistry[]> {
    return db.select()
      .from(featureRegistry)
      .where(eq(featureRegistry.scope, scope))
      .orderBy(asc(featureRegistry.displayOrder), asc(featureRegistry.name));
  }

  async getById(id: string): Promise<FeatureRegistry | null> {
    const [result] = await db.select()
      .from(featureRegistry)
      .where(eq(featureRegistry.id, id));
    return result || null;
  }

  async getByCode(code: string): Promise<FeatureRegistry | null> {
    const [result] = await db.select()
      .from(featureRegistry)
      .where(eq(featureRegistry.code, code));
    return result || null;
  }

  async create(data: Omit<InsertFeatureRegistry, 'id' | 'createdAt' | 'updatedAt'>): Promise<FeatureRegistry> {
    const [result] = await db.insert(featureRegistry)
      .values({
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return result;
  }

  async update(id: string, data: Partial<Omit<InsertFeatureRegistry, 'id' | 'code' | 'createdAt' | 'updatedAt'>>): Promise<FeatureRegistry | null> {
    const [result] = await db.update(featureRegistry)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(featureRegistry.id, id))
      .returning();
    return result || null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await db.delete(featureRegistry)
      .where(eq(featureRegistry.id, id))
      .returning();
    return result.length > 0;
  }

  async setEnabled(id: string, enabled: boolean): Promise<FeatureRegistry | null> {
    return this.update(id, { enabled });
  }

  // Feature Flag Overrides
  async getOverridesForFeature(featureId: string): Promise<FeatureFlagOverride[]> {
    return db.select()
      .from(featureFlagOverrides)
      .where(eq(featureFlagOverrides.featureId, featureId));
  }

  async getOverridesForTenant(tenantId: string): Promise<FeatureFlagOverride[]> {
    return db.select()
      .from(featureFlagOverrides)
      .where(eq(featureFlagOverrides.tenantId, tenantId));
  }

  async createOverride(data: Omit<InsertFeatureFlagOverride, 'id' | 'createdAt' | 'updatedAt'>): Promise<FeatureFlagOverride> {
    const [result] = await db.insert(featureFlagOverrides)
      .values({
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return result;
  }

  async updateOverride(id: string, data: Partial<Omit<InsertFeatureFlagOverride, 'id' | 'createdAt' | 'updatedAt'>>): Promise<FeatureFlagOverride | null> {
    const [result] = await db.update(featureFlagOverrides)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(featureFlagOverrides.id, id))
      .returning();
    return result || null;
  }

  async deleteOverride(id: string): Promise<boolean> {
    const result = await db.delete(featureFlagOverrides)
      .where(eq(featureFlagOverrides.id, id))
      .returning();
    return result.length > 0;
  }

  // Runtime Feature Flag Evaluation
  async isFeatureEnabled(
    featureCode: string, 
    context: { tenantId?: string; businessType?: string } = {}
  ): Promise<boolean> {
    const feature = await this.getByCode(featureCode);
    
    if (!feature) {
      return false;
    }

    if (!feature.enabled) {
      return false;
    }

    // Check for overrides based on scope
    if (feature.scope === "global") {
      return feature.defaultEnabled ?? false;
    }

    // Check for tenant-specific override
    if (context.tenantId && (feature.scope === "tenant" || feature.scope === "business")) {
      const [tenantOverride] = await db.select()
        .from(featureFlagOverrides)
        .where(and(
          eq(featureFlagOverrides.featureId, feature.id),
          eq(featureFlagOverrides.tenantId, context.tenantId),
          isNull(featureFlagOverrides.businessType)
        ));
      
      if (tenantOverride) {
        return tenantOverride.enabled;
      }
    }

    // Check for business-type override
    if (context.businessType && feature.scope === "business") {
      const [businessOverride] = await db.select()
        .from(featureFlagOverrides)
        .where(and(
          eq(featureFlagOverrides.featureId, feature.id),
          eq(featureFlagOverrides.businessType, context.businessType),
          isNull(featureFlagOverrides.tenantId)
        ));
      
      if (businessOverride) {
        return businessOverride.enabled;
      }
    }

    // Fall back to default
    return feature.defaultEnabled ?? false;
  }

  // Get all feature flags with their effective status for a context
  async getFeatureFlags(
    context: { tenantId?: string; businessType?: string } = {}
  ): Promise<{ code: string; name: string; enabled: boolean; scope: string }[]> {
    const features = await this.listEnabled();
    const flags = await Promise.all(
      features.map(async (feature) => ({
        code: feature.code,
        name: feature.name,
        enabled: await this.isFeatureEnabled(feature.code, context),
        scope: feature.scope || "tenant",
      }))
    );
    return flags;
  }
}

export const featureRegistryService = new FeatureRegistryService();
