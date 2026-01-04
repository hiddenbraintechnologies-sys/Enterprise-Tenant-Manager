import { db } from "../db";
import { 
  businessTypeRegistry,
  businessTypeVersions,
  versionedModuleMap,
  versionedFeatureMap,
  businessModuleMap,
  businessFeatureMap,
  tenantBusinessTypeHistory,
  tenants,
} from "@shared/schema";
import { eq, and, desc, asc, sql } from "drizzle-orm";
import { featureResolutionService } from "./feature-resolution";

interface ModuleMapping {
  moduleId: string;
  isRequired: boolean;
  defaultEnabled: boolean;
  displayOrder: number;
}

interface FeatureMapping {
  featureId: string;
  isRequired: boolean;
  defaultEnabled: boolean;
  displayOrder: number;
}

interface CreateVersionInput {
  businessTypeId: string;
  name: string;
  description?: string;
  modules: ModuleMapping[];
  features: FeatureMapping[];
  createdBy?: string;
  migrationNotes?: string;
  isBackwardCompatible?: boolean;
}

interface PublishVersionInput {
  versionId: string;
  publishedBy?: string;
}

interface RollbackInput {
  businessTypeId: string;
  targetVersionNumber: number;
  performedBy?: string;
  reason?: string;
}

interface MigrateTenantInput {
  tenantId: string;
  targetVersionId: string;
  performedBy?: string;
  reason?: string;
}

class BusinessVersionService {
  async createDraftVersion(input: CreateVersionInput) {
    const { businessTypeId, name, description, modules, features, createdBy, migrationNotes, isBackwardCompatible } = input;

    // Get the next version number
    const [businessType] = await db.select()
      .from(businessTypeRegistry)
      .where(eq(businessTypeRegistry.id, businessTypeId));

    if (!businessType) {
      throw new Error(`Business type not found: ${businessTypeId}`);
    }

    const nextVersion = (businessType.latestVersionNumber || 0) + 1;

    // Create the version record
    const [version] = await db.insert(businessTypeVersions)
      .values({
        businessTypeId,
        versionNumber: nextVersion,
        status: "draft",
        name,
        description,
        createdBy,
        migrationNotes,
        isBackwardCompatible: isBackwardCompatible ?? true,
        moduleSnapshot: modules,
        featureSnapshot: features,
      })
      .returning();

    // Create module mappings
    if (modules.length > 0) {
      await db.insert(versionedModuleMap)
        .values(modules.map(m => ({
          versionId: version.id,
          moduleId: m.moduleId,
          isRequired: m.isRequired,
          defaultEnabled: m.defaultEnabled,
          displayOrder: m.displayOrder,
        })));
    }

    // Create feature mappings
    if (features.length > 0) {
      await db.insert(versionedFeatureMap)
        .values(features.map(f => ({
          versionId: version.id,
          featureId: f.featureId,
          isRequired: f.isRequired,
          defaultEnabled: f.defaultEnabled,
          displayOrder: f.displayOrder,
        })));
    }

    // Update latest version number on business type
    await db.update(businessTypeRegistry)
      .set({ latestVersionNumber: nextVersion, updatedAt: new Date() })
      .where(eq(businessTypeRegistry.id, businessTypeId));

    return version;
  }

  async publishVersion(input: PublishVersionInput) {
    const { versionId, publishedBy } = input;

    // Get the version
    const [version] = await db.select()
      .from(businessTypeVersions)
      .where(eq(businessTypeVersions.id, versionId));

    if (!version) {
      throw new Error(`Version not found: ${versionId}`);
    }

    if (version.status !== "draft") {
      throw new Error(`Version ${versionId} is not in draft status (current: ${version.status})`);
    }

    // Retire any currently published version for this business type
    await db.update(businessTypeVersions)
      .set({ 
        status: "retired", 
        retiredAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(
        eq(businessTypeVersions.businessTypeId, version.businessTypeId),
        eq(businessTypeVersions.status, "published")
      ));

    // Publish the new version
    const now = new Date();
    const [published] = await db.update(businessTypeVersions)
      .set({ 
        status: "published", 
        publishedBy,
        publishedAt: now,
        effectiveAt: now,
        updatedAt: now,
      })
      .where(eq(businessTypeVersions.id, versionId))
      .returning();

    // Update the active version on business type
    await db.update(businessTypeRegistry)
      .set({ 
        activeVersionId: versionId,
        updatedAt: now,
      })
      .where(eq(businessTypeRegistry.id, version.businessTypeId));

    // Invalidate caches for all tenants of this business type
    const [businessType] = await db.select()
      .from(businessTypeRegistry)
      .where(eq(businessTypeRegistry.id, version.businessTypeId));

    if (businessType) {
      await featureResolutionService.invalidateBusinessTypeCache(businessType.code);
    }

    return published;
  }

  async rollbackToVersion(input: RollbackInput) {
    const { businessTypeId, targetVersionNumber, performedBy, reason } = input;

    // Find the target version
    const [targetVersion] = await db.select()
      .from(businessTypeVersions)
      .where(and(
        eq(businessTypeVersions.businessTypeId, businessTypeId),
        eq(businessTypeVersions.versionNumber, targetVersionNumber)
      ));

    if (!targetVersion) {
      throw new Error(`Version ${targetVersionNumber} not found for business type ${businessTypeId}`);
    }

    // Get currently active version for audit trail
    const [currentActive] = await db.select()
      .from(businessTypeVersions)
      .where(and(
        eq(businessTypeVersions.businessTypeId, businessTypeId),
        eq(businessTypeVersions.status, "published")
      ));

    // Retire current published version
    if (currentActive) {
      await db.update(businessTypeVersions)
        .set({ 
          status: "retired", 
          retiredAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(businessTypeVersions.id, currentActive.id));
    }

    // Re-publish the target version
    const now = new Date();
    const [republished] = await db.update(businessTypeVersions)
      .set({ 
        status: "published", 
        publishedBy: performedBy,
        publishedAt: now,
        retiredAt: null,
        updatedAt: now,
      })
      .where(eq(businessTypeVersions.id, targetVersion.id))
      .returning();

    // Update active version on business type
    await db.update(businessTypeRegistry)
      .set({ 
        activeVersionId: targetVersion.id,
        updatedAt: now,
      })
      .where(eq(businessTypeRegistry.id, businessTypeId));

    // Log the rollback for all affected tenants
    const affectedTenants = await db.select({ id: tenants.id })
      .from(tenants)
      .where(sql`${tenants.businessType}::text = (SELECT code FROM business_type_registry WHERE id = ${businessTypeId})`);

    if (affectedTenants.length > 0) {
      await db.insert(tenantBusinessTypeHistory)
        .values(affectedTenants.map(t => ({
          tenantId: t.id,
          fromVersionId: currentActive?.id || null,
          toVersionId: targetVersion.id,
          action: "rollback",
          reason,
          performedBy,
          rollbackData: { previousVersion: currentActive?.versionNumber || null },
        })));
    }

    // Invalidate caches
    const [businessType] = await db.select()
      .from(businessTypeRegistry)
      .where(eq(businessTypeRegistry.id, businessTypeId));

    if (businessType) {
      await featureResolutionService.invalidateBusinessTypeCache(businessType.code);
    }

    return republished;
  }

  async migrateTenantToVersion(input: MigrateTenantInput) {
    const { tenantId, targetVersionId, performedBy, reason } = input;

    // Get tenant's current pinned version
    const [tenant] = await db.select()
      .from(tenants)
      .where(eq(tenants.id, tenantId));

    if (!tenant) {
      throw new Error(`Tenant not found: ${tenantId}`);
    }

    // Verify target version exists and is published
    const [targetVersion] = await db.select()
      .from(businessTypeVersions)
      .where(eq(businessTypeVersions.id, targetVersionId));

    if (!targetVersion) {
      throw new Error(`Version not found: ${targetVersionId}`);
    }

    if (targetVersion.status !== "published") {
      throw new Error(`Target version ${targetVersionId} is not published`);
    }

    // Log the migration
    await db.insert(tenantBusinessTypeHistory)
      .values({
        tenantId,
        fromVersionId: tenant.pinnedVersionId || null,
        toVersionId: targetVersionId,
        action: "migrate",
        reason,
        performedBy,
      });

    // Update tenant's pinned version
    await db.update(tenants)
      .set({ 
        pinnedVersionId: targetVersionId,
        updatedAt: new Date(),
      })
      .where(eq(tenants.id, tenantId));

    // Invalidate tenant's cache
    await featureResolutionService.invalidateTenantCache(tenantId);

    return { tenantId, pinnedVersionId: targetVersionId };
  }

  async unpinTenant(tenantId: string, performedBy?: string) {
    // Get tenant's current state
    const [tenant] = await db.select()
      .from(tenants)
      .where(eq(tenants.id, tenantId));

    if (!tenant) {
      throw new Error(`Tenant not found: ${tenantId}`);
    }

    if (tenant.pinnedVersionId) {
      // Log the unpin action
      await db.insert(tenantBusinessTypeHistory)
        .values({
          tenantId,
          fromVersionId: tenant.pinnedVersionId,
          toVersionId: null,
          action: "unpin",
          performedBy,
        });
    }

    // Clear the pinned version (tenant will use latest published)
    await db.update(tenants)
      .set({ 
        pinnedVersionId: null,
        updatedAt: new Date(),
      })
      .where(eq(tenants.id, tenantId));

    // Invalidate cache
    await featureResolutionService.invalidateTenantCache(tenantId);

    return { tenantId, pinnedVersionId: null };
  }

  async getVersions(businessTypeId: string) {
    return db.select()
      .from(businessTypeVersions)
      .where(eq(businessTypeVersions.businessTypeId, businessTypeId))
      .orderBy(desc(businessTypeVersions.versionNumber));
  }

  async getVersionDetails(versionId: string) {
    const [version] = await db.select()
      .from(businessTypeVersions)
      .where(eq(businessTypeVersions.id, versionId));

    if (!version) {
      return null;
    }

    const modules = await db.select()
      .from(versionedModuleMap)
      .where(eq(versionedModuleMap.versionId, versionId))
      .orderBy(asc(versionedModuleMap.displayOrder));

    const features = await db.select()
      .from(versionedFeatureMap)
      .where(eq(versionedFeatureMap.versionId, versionId))
      .orderBy(asc(versionedFeatureMap.displayOrder));

    return {
      ...version,
      modules,
      features,
    };
  }

  async getPublishedVersion(businessTypeId: string) {
    const [version] = await db.select()
      .from(businessTypeVersions)
      .where(and(
        eq(businessTypeVersions.businessTypeId, businessTypeId),
        eq(businessTypeVersions.status, "published")
      ));

    return version || null;
  }

  async createVersionFromLegacy(businessTypeId: string, createdBy?: string) {
    // Get legacy module mappings
    const legacyModules = await db.select()
      .from(businessModuleMap)
      .where(eq(businessModuleMap.businessTypeId, businessTypeId))
      .orderBy(asc(businessModuleMap.displayOrder));

    // Get legacy feature mappings
    const legacyFeatures = await db.select()
      .from(businessFeatureMap)
      .where(eq(businessFeatureMap.businessTypeId, businessTypeId))
      .orderBy(asc(businessFeatureMap.displayOrder));

    // Get business type info
    const [businessType] = await db.select()
      .from(businessTypeRegistry)
      .where(eq(businessTypeRegistry.id, businessTypeId));

    if (!businessType) {
      throw new Error(`Business type not found: ${businessTypeId}`);
    }

    // Create v1 from legacy data
    return this.createDraftVersion({
      businessTypeId,
      name: `v1 - ${businessType.name} (Legacy Migration)`,
      description: "Initial version created from legacy configuration",
      createdBy,
      isBackwardCompatible: true,
      migrationNotes: "Auto-migrated from legacy business_module_map and business_feature_map tables",
      modules: legacyModules.map(m => ({
        moduleId: m.moduleId,
        isRequired: m.isRequired,
        defaultEnabled: m.defaultEnabled,
        displayOrder: m.displayOrder,
      })),
      features: legacyFeatures.map(f => ({
        featureId: f.featureId,
        isRequired: f.isRequired,
        defaultEnabled: f.defaultEnabled,
        displayOrder: f.displayOrder,
      })),
    });
  }

  async getTenantVersionHistory(tenantId: string) {
    return db.select()
      .from(tenantBusinessTypeHistory)
      .where(eq(tenantBusinessTypeHistory.tenantId, tenantId))
      .orderBy(desc(tenantBusinessTypeHistory.createdAt));
  }
}

export const businessVersionService = new BusinessVersionService();
