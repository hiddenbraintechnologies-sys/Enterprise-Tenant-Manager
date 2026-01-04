import { db } from "../db";
import { 
  tenants,
  businessTypeRegistry,
  moduleRegistry,
  featureRegistry,
  businessModuleMap,
  businessFeatureMap,
  tenantFeatureOverride,
} from "@shared/schema";
import { eq, and, asc, inArray, sql } from "drizzle-orm";
import { cacheService } from "./cache";

export interface ResolvedModule {
  code: string;
  name: string;
  category: string;
  enabled: boolean;
  isRequired: boolean;
}

export interface ResolvedFeature {
  code: string;
  name: string;
  scope: string;
  enabled: boolean;
  isRequired: boolean;
  source: "business_default" | "tenant_override" | "feature_default";
}

export interface FeatureMatrix {
  tenantId: string;
  businessType: string;
  businessTypeName: string;
  modules: ResolvedModule[];
  features: ResolvedFeature[];
  resolvedAt: string;
  cacheHit: boolean;
}

const CACHE_TTL = 300; // 5 minutes

class FeatureResolutionService {
  async resolveTenantFeatures(tenantId: string): Promise<FeatureMatrix | null> {
    // Step 1: Check cache first
    const cached = await cacheService.getTenantFeatureMatrix<FeatureMatrix>(tenantId);
    if (cached) {
      return { ...cached, cacheHit: true };
    }

    // Step 2: Resolve from database
    const matrix = await this.resolveFromDatabase(tenantId);
    if (!matrix) {
      return null;
    }

    // Step 3: Cache the result
    await cacheService.setTenantFeatureMatrix(tenantId, matrix, CACHE_TTL);
    
    return { ...matrix, cacheHit: false };
  }

  private async resolveFromDatabase(tenantId: string): Promise<FeatureMatrix | null> {
    // Step 1: Get tenant and business type
    const [tenant] = await db.select()
      .from(tenants)
      .where(eq(tenants.id, tenantId));

    if (!tenant) {
      console.warn(`[FeatureResolution] Tenant not found: ${tenantId}`);
      return null;
    }

    const businessTypeCode = tenant.businessType;
    if (!businessTypeCode) {
      console.warn(`[FeatureResolution] Tenant ${tenantId} has no business type`);
      return {
        tenantId,
        businessType: "",
        businessTypeName: "Unknown",
        modules: [],
        features: [],
        resolvedAt: new Date().toISOString(),
        cacheHit: false,
      };
    }

    // Step 2: Get business type registry entry
    const [businessType] = await db.select()
      .from(businessTypeRegistry)
      .where(eq(businessTypeRegistry.code, businessTypeCode));

    if (!businessType) {
      console.warn(`[FeatureResolution] Business type not found: ${businessTypeCode}`);
      return {
        tenantId,
        businessType: businessTypeCode,
        businessTypeName: businessTypeCode,
        modules: [],
        features: [],
        resolvedAt: new Date().toISOString(),
        cacheHit: false,
      };
    }

    // Step 3: Load allowed modules for this business type
    const modules = await this.resolveModules(businessType.id);

    // Step 4: Load allowed features with tenant overrides
    const features = await this.resolveFeatures(businessType.id, tenantId);

    return {
      tenantId,
      businessType: businessTypeCode,
      businessTypeName: businessType.name,
      modules,
      features,
      resolvedAt: new Date().toISOString(),
      cacheHit: false,
    };
  }

  private async resolveModules(businessTypeId: string): Promise<ResolvedModule[]> {
    // Get business-module mappings
    const mappings = await db.select({
      mapping: businessModuleMap,
      module: moduleRegistry,
    })
      .from(businessModuleMap)
      .innerJoin(moduleRegistry, eq(businessModuleMap.moduleId, moduleRegistry.id))
      .where(eq(businessModuleMap.businessTypeId, businessTypeId))
      .orderBy(asc(businessModuleMap.displayOrder));

    return mappings.map(({ mapping, module }) => ({
      code: module.code,
      name: module.name,
      category: module.category || "optional",
      enabled: mapping.defaultEnabled,
      isRequired: mapping.isRequired,
    }));
  }

  private async resolveFeatures(businessTypeId: string, tenantId: string): Promise<ResolvedFeature[]> {
    // Get business-feature mappings
    const mappings = await db.select({
      mapping: businessFeatureMap,
      feature: featureRegistry,
    })
      .from(businessFeatureMap)
      .innerJoin(featureRegistry, eq(businessFeatureMap.featureId, featureRegistry.id))
      .where(and(
        eq(businessFeatureMap.businessTypeId, businessTypeId),
        eq(featureRegistry.enabled, true)
      ))
      .orderBy(asc(businessFeatureMap.displayOrder));

    // Get tenant overrides ONLY for features allowed by business (enforces gating hierarchy)
    const featureIds = mappings.map(m => m.feature.id);
    const overrides = featureIds.length > 0 
      ? await db.select()
          .from(tenantFeatureOverride)
          .where(and(
            eq(tenantFeatureOverride.tenantId, tenantId),
            inArray(tenantFeatureOverride.featureId, featureIds)
          ))
      : [];

    const overrideMap = new Map(overrides.map(o => [o.featureId, o]));

    return mappings.map(({ mapping, feature }) => {
      const override = overrideMap.get(feature.id);
      
      // If required, always enabled
      if (mapping.isRequired) {
        return {
          code: feature.code,
          name: feature.name,
          scope: feature.scope,
          enabled: true,
          isRequired: true,
          source: "business_default" as const,
        };
      }

      // Check tenant override
      if (override) {
        return {
          code: feature.code,
          name: feature.name,
          scope: feature.scope,
          enabled: override.enabled,
          isRequired: false,
          source: "tenant_override" as const,
        };
      }

      // Use business default
      return {
        code: feature.code,
        name: feature.name,
        scope: feature.scope,
        enabled: mapping.defaultEnabled,
        isRequired: false,
        source: "business_default" as const,
      };
    });
  }

  async isFeatureEnabledCached(tenantId: string, featureCode: string): Promise<boolean> {
    const matrix = await this.resolveTenantFeatures(tenantId);
    if (!matrix) {
      return false;
    }

    const feature = matrix.features.find(f => f.code === featureCode);
    return feature?.enabled ?? false;
  }

  async isModuleEnabledCached(tenantId: string, moduleCode: string): Promise<boolean> {
    const matrix = await this.resolveTenantFeatures(tenantId);
    if (!matrix) {
      return false;
    }

    const module = matrix.modules.find(m => m.code === moduleCode);
    return module?.enabled ?? false;
  }

  async invalidateTenantCache(tenantId: string): Promise<void> {
    await cacheService.invalidateTenantCache(tenantId);
  }

  async invalidateBusinessTypeCache(businessTypeCode: string): Promise<void> {
    // Find only tenants with this business type using SQL cast for enum comparison
    const matchingTenants = await db.select({ id: tenants.id })
      .from(tenants)
      .where(sql`${tenants.businessType}::text = ${businessTypeCode}`);

    await Promise.all(
      matchingTenants.map(t => cacheService.invalidateTenantCache(t.id))
    );
  }

  async invalidateAllCaches(): Promise<void> {
    await cacheService.invalidateAllFeatureMatrices();
  }
}

export const featureResolutionService = new FeatureResolutionService();
