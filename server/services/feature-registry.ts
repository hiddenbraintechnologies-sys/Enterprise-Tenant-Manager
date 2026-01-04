import { db } from "../db";
import { 
  featureRegistry, 
  featureFlagOverrides, 
  businessFeatureMap,
  tenantFeatureOverride,
  businessTypeRegistry,
  tenants,
  FeatureRegistry, 
  InsertFeatureRegistry, 
  FeatureFlagOverride, 
  InsertFeatureFlagOverride 
} from "@shared/schema";
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

  // Runtime Feature Flag Evaluation with Business Gating
  // Evaluation order: 
  // 1. Feature must be globally enabled
  // 2. Business must allow the feature (via businessFeatureMap)
  // 3. Tenant override (via tenantFeatureOverride) - only if business allows
  // 4. Fall back to business default, then feature default
  async isFeatureEnabled(
    featureCode: string, 
    context: { tenantId?: string; businessType?: string } = {}
  ): Promise<boolean> {
    const feature = await this.getByCode(featureCode);
    
    if (!feature) {
      return false;
    }

    // Step 1: Check if feature is globally enabled
    if (!feature.enabled) {
      return false;
    }

    // Step 2: For global scope, return the default
    if (feature.scope === "global") {
      return feature.defaultEnabled ?? false;
    }

    // Step 3: Get business type from context or from tenant
    let businessTypeCode = context.businessType;
    if (!businessTypeCode && context.tenantId) {
      const [tenant] = await db.select()
        .from(tenants)
        .where(eq(tenants.id, context.tenantId));
      if (tenant?.businessType) {
        businessTypeCode = tenant.businessType;
      }
    }

    // Step 4: Check business-level gating (if business type is known)
    if (businessTypeCode && (feature.scope === "business" || feature.scope === "tenant")) {
      // Find the business type registry entry
      const [businessTypeEntry] = await db.select()
        .from(businessTypeRegistry)
        .where(eq(businessTypeRegistry.code, businessTypeCode));
      
      if (businessTypeEntry) {
        // Check if business allows this feature
        const [businessMapping] = await db.select()
          .from(businessFeatureMap)
          .where(and(
            eq(businessFeatureMap.businessTypeId, businessTypeEntry.id),
            eq(businessFeatureMap.featureId, feature.id)
          ));

        // If no mapping exists, feature is not allowed for this business
        if (!businessMapping) {
          return false;
        }

        // If required, it must be enabled
        if (businessMapping.isRequired) {
          return true;
        }

        // Step 5: Check tenant-specific override (only if tenant-scoped feature)
        if (context.tenantId && feature.scope === "tenant") {
          const [tOverride] = await db.select()
            .from(tenantFeatureOverride)
            .where(and(
              eq(tenantFeatureOverride.tenantId, context.tenantId),
              eq(tenantFeatureOverride.featureId, feature.id)
            ));
          
          if (tOverride) {
            return tOverride.enabled;
          }
        }

        // Fall back to business mapping default
        return businessMapping.defaultEnabled;
      }
    }

    // Legacy overrides (featureFlagOverrides table) are ONLY used for global-scoped features
    // or when no business type mapping exists (backwards compatibility for unstructured data)
    // Business/tenant scoped features MUST have a businessFeatureMap entry to be enabled
    
    // For business/tenant scoped features without business context, deny by default
    if (feature.scope === "business" || feature.scope === "tenant") {
      // No business type known and feature requires business context = deny
      return false;
    }

    // Fall back to feature default (only for global scope that fell through)
    return feature.defaultEnabled ?? false;
  }

  // Check if a feature is allowed for a specific business type
  async isFeatureAllowedForBusiness(featureId: string, businessTypeCode: string): Promise<boolean> {
    const [businessTypeEntry] = await db.select()
      .from(businessTypeRegistry)
      .where(eq(businessTypeRegistry.code, businessTypeCode));
    
    if (!businessTypeEntry) {
      return false;
    }

    const [mapping] = await db.select()
      .from(businessFeatureMap)
      .where(and(
        eq(businessFeatureMap.businessTypeId, businessTypeEntry.id),
        eq(businessFeatureMap.featureId, featureId)
      ));

    return !!mapping;
  }

  // Get features allowed for a business type
  async getFeaturesForBusinessType(businessTypeCode: string): Promise<FeatureRegistry[]> {
    const [businessTypeEntry] = await db.select()
      .from(businessTypeRegistry)
      .where(eq(businessTypeRegistry.code, businessTypeCode));
    
    if (!businessTypeEntry) {
      return [];
    }

    const mappings = await db.select()
      .from(businessFeatureMap)
      .where(eq(businessFeatureMap.businessTypeId, businessTypeEntry.id));

    const featureIds = mappings.map(m => m.featureId);
    if (featureIds.length === 0) {
      return [];
    }

    const features: FeatureRegistry[] = [];
    for (const fId of featureIds) {
      const feature = await this.getById(fId);
      if (feature) features.push(feature);
    }
    return features;
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
