import { db } from "../db";
import { 
  addons, 
  addonVersions, 
  addonPricing, 
  tenantAddons, 
  addonInstallHistory 
} from "@shared/schema";
import { eq, and, sql, inArray } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

// Dependency structure
interface AddonDependency {
  addonId: string;
  optional?: boolean;
  minVersion?: string;
}

// Lifecycle operation result
interface LifecycleResult {
  success: boolean;
  error?: string;
  code?: string;
  data?: any;
  rollbackPerformed?: boolean;
}

// Version comparison helper (semver-like)
function compareVersions(v1: string, v2: string): number {
  const parts1 = v1.split(".").map(Number);
  const parts2 = v2.split(".").map(Number);
  
  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const p1 = parts1[i] || 0;
    const p2 = parts2[i] || 0;
    if (p1 > p2) return 1;
    if (p1 < p2) return -1;
  }
  return 0;
}

// Get version string from semver components
function getVersionString(major: number, minor: number, patch: number): string {
  return `${major}.${minor}.${patch}`;
}

export class AddonLifecycleService {
  
  // Check if all dependencies are satisfied for a tenant
  async checkDependencies(
    tenantId: string, 
    addonId: string, 
    targetVersionId?: string
  ): Promise<{ satisfied: boolean; missing: AddonDependency[]; conflicts: string[] }> {
    
    // Get addon and its dependencies
    const [addon] = await db
      .select()
      .from(addons)
      .where(eq(addons.id, addonId))
      .limit(1);
    
    if (!addon) {
      return { satisfied: false, missing: [], conflicts: ["Add-on not found"] };
    }
    
    // Get version-specific dependencies if targetVersionId provided
    let dependencies: AddonDependency[] = (addon.dependencies as AddonDependency[]) || [];
    
    if (targetVersionId) {
      const [version] = await db
        .select()
        .from(addonVersions)
        .where(eq(addonVersions.id, targetVersionId))
        .limit(1);
      
      if (version?.dependencies) {
        dependencies = [...dependencies, ...(version.dependencies as AddonDependency[])];
      }
    }
    
    if (dependencies.length === 0) {
      return { satisfied: true, missing: [], conflicts: [] };
    }
    
    // Get tenant's installed addons
    const installed = await db
      .select({
        addonId: tenantAddons.addonId,
        versionId: tenantAddons.versionId,
        status: tenantAddons.status,
      })
      .from(tenantAddons)
      .where(and(
        eq(tenantAddons.tenantId, tenantId),
        inArray(tenantAddons.status, ["active", "installing", "updating"])
      ));
    
    const installedMap = new Map(installed.map(i => [i.addonId, i]));
    
    const missing: AddonDependency[] = [];
    const conflicts: string[] = [];
    
    for (const dep of dependencies) {
      const installedDep = installedMap.get(dep.addonId);
      
      if (!installedDep) {
        if (!dep.optional) {
          missing.push(dep);
        }
        continue;
      }
      
      // Check version requirement if specified
      if (dep.minVersion && installedDep.versionId) {
        const [installedVersion] = await db
          .select()
          .from(addonVersions)
          .where(eq(addonVersions.id, installedDep.versionId))
          .limit(1);
        
        if (installedVersion) {
          const versionStr = getVersionString(
            installedVersion.semverMajor,
            installedVersion.semverMinor,
            installedVersion.semverPatch
          );
          
          if (compareVersions(versionStr, dep.minVersion) < 0) {
            conflicts.push(
              `Dependency ${dep.addonId} requires version >= ${dep.minVersion}, but ${versionStr} is installed`
            );
          }
        }
      }
    }
    
    return {
      satisfied: missing.length === 0 && conflicts.length === 0,
      missing,
      conflicts,
    };
  }
  
  // Check if any other addons depend on this one before uninstall/disable
  // Optimized to avoid N+1 queries by batch-fetching addon and version data
  async checkDependents(
    tenantId: string, 
    addonId: string
  ): Promise<{ hasDependents: boolean; dependents: string[] }> {
    
    // Get all installed addons for this tenant with their versions (exclude target)
    const installed = await db
      .select({
        addonId: tenantAddons.addonId,
        versionId: tenantAddons.versionId,
        status: tenantAddons.status,
      })
      .from(tenantAddons)
      .where(and(
        eq(tenantAddons.tenantId, tenantId),
        inArray(tenantAddons.status, ["active", "disabled"])
      ));
    
    // Filter out the target addon
    const otherInstalled = installed.filter(inst => inst.addonId !== addonId);
    
    if (otherInstalled.length === 0) {
      return { hasDependents: false, dependents: [] };
    }
    
    // Batch fetch all addon metadata in one query
    const addonIds = otherInstalled.map(i => i.addonId);
    const addonData = await db
      .select({ id: addons.id, name: addons.name, dependencies: addons.dependencies })
      .from(addons)
      .where(inArray(addons.id, addonIds));
    
    const addonMap = new Map(addonData.map(a => [a.id, a]));
    
    // Batch fetch all version metadata in one query
    const versionIds = otherInstalled.map(i => i.versionId).filter((v): v is string => !!v);
    let versionMap = new Map<string, { dependencies: unknown }>();
    
    if (versionIds.length > 0) {
      const versionData = await db
        .select({ id: addonVersions.id, dependencies: addonVersions.dependencies })
        .from(addonVersions)
        .where(inArray(addonVersions.id, versionIds));
      
      versionMap = new Map(versionData.map(v => [v.id, v]));
    }
    
    const dependents: string[] = [];
    
    // Check dependencies using pre-fetched data
    for (const inst of otherInstalled) {
      const addon = addonMap.get(inst.addonId);
      if (!addon) continue;
      
      // Check addon-level dependencies
      if (addon.dependencies) {
        const deps = addon.dependencies as AddonDependency[];
        const dependsOnTarget = deps.some(d => d.addonId === addonId && !d.optional);
        if (dependsOnTarget) {
          dependents.push(addon.name);
          continue; // Already found dependency, skip version check
        }
      }
      
      // Check version-level dependencies
      if (inst.versionId) {
        const version = versionMap.get(inst.versionId);
        if (version?.dependencies) {
          const versionDeps = version.dependencies as AddonDependency[];
          const versionDependsOnTarget = versionDeps.some(d => d.addonId === addonId && !d.optional);
          if (versionDependsOnTarget) {
            dependents.push(addon.name);
          }
        }
      }
    }
    
    return { hasDependents: dependents.length > 0, dependents };
  }
  
  // Install add-on with dependency checks - uses transaction for atomicity
  async install(
    tenantId: string,
    addonId: string,
    pricingId: string | null,
    config: Record<string, any>,
    userId: string
  ): Promise<LifecycleResult> {
    
    // Verify addon exists and is published (read-only check, outside transaction)
    const [addon] = await db
      .select()
      .from(addons)
      .where(and(eq(addons.id, addonId), eq(addons.status, "published")))
      .limit(1);
    
    if (!addon) {
      return { success: false, error: "Add-on not found or not available", code: "ADDON_NOT_FOUND" };
    }
    
    // Check if already installed
    const [existing] = await db
      .select()
      .from(tenantAddons)
      .where(and(eq(tenantAddons.tenantId, tenantId), eq(tenantAddons.addonId, addonId)))
      .limit(1);
    
    if (existing) {
      return { success: false, error: "Add-on already installed", code: "ALREADY_INSTALLED" };
    }
    
    // Get latest version
    const [latestVersion] = await db
      .select()
      .from(addonVersions)
      .where(and(eq(addonVersions.addonId, addonId), eq(addonVersions.isLatest, true)))
      .limit(1);
    
    if (!latestVersion) {
      return { success: false, error: "No available version", code: "NO_VERSION" };
    }
    
    // Check dependencies
    const depCheck = await this.checkDependencies(tenantId, addonId, latestVersion.id);
    if (!depCheck.satisfied) {
      return { 
        success: false, 
        error: "Missing dependencies", 
        code: "MISSING_DEPENDENCIES",
        data: { missing: depCheck.missing, conflicts: depCheck.conflicts }
      };
    }
    
    // Validate pricing belongs to addon
    let selectedPricing = null;
    if (pricingId) {
      [selectedPricing] = await db
        .select()
        .from(addonPricing)
        .where(and(eq(addonPricing.id, pricingId), eq(addonPricing.addonId, addonId)))
        .limit(1);
      
      if (!selectedPricing) {
        return { success: false, error: "Invalid pricing option", code: "INVALID_PRICING" };
      }
    }
    
    try {
      // Use transaction for atomic install
      const result = await db.transaction(async (tx) => {
        // Re-check inside transaction to handle concurrent requests
        // The unique constraint on (tenantId, addonId) will enforce this, 
        // but we check here to provide a cleaner error message
        const [existingInTx] = await tx
          .select()
          .from(tenantAddons)
          .where(and(eq(tenantAddons.tenantId, tenantId), eq(tenantAddons.addonId, addonId)))
          .limit(1);
        
        if (existingInTx) {
          throw new Error("ALREADY_INSTALLED");
        }
        
        // Create installation record
        const [installation] = await tx
          .insert(tenantAddons)
          .values({
            tenantId,
            addonId,
            versionId: latestVersion.id,
            pricingId: selectedPricing?.id,
            status: "active",
            config,
            installedBy: userId,
            trialEndsAt: selectedPricing?.trialDays 
              ? new Date(Date.now() + selectedPricing.trialDays * 24 * 60 * 60 * 1000)
              : null,
          })
          .returning();
        
        // Record history
        await tx
          .insert(addonInstallHistory)
          .values({
            tenantAddonId: installation.id,
            tenantId,
            addonId,
            action: "install",
            toVersionId: latestVersion.id,
            status: "completed",
            performedBy: userId,
            completedAt: new Date(),
          });
        
        // Update install count
        await tx
          .update(addons)
          .set({ installCount: sql`${addons.installCount} + 1` })
          .where(eq(addons.id, addonId));
        
        return installation;
      });
      
      return { 
        success: true, 
        data: { 
          installation: result,
          version: getVersionString(latestVersion.semverMajor, latestVersion.semverMinor, latestVersion.semverPatch)
        } 
      };
      
    } catch (error: any) {
      // Handle unique constraint violation (Postgres code 23505) or explicit already installed check
      const errorMessage = String(error?.message || error);
      const errorCode = error?.code;
      
      if (errorMessage.includes("ALREADY_INSTALLED") || 
          errorCode === "23505" || // Postgres unique_violation
          errorMessage.includes("unique constraint") ||
          errorMessage.includes("duplicate key")) {
        return { 
          success: false, 
          error: "Add-on already installed", 
          code: "ALREADY_INSTALLED"
        };
      }
      
      // Transaction automatically rolls back on error
      return { 
        success: false, 
        error: "Installation failed", 
        code: "INSTALL_FAILED",
        rollbackPerformed: true
      };
    }
  }
  
  // Upgrade add-on to new version - uses transaction for atomicity
  async upgrade(
    tenantId: string,
    addonId: string,
    targetVersionId: string,
    userId: string
  ): Promise<LifecycleResult> {
    
    // Get current installation (read-only check, outside transaction)
    const [installation] = await db
      .select()
      .from(tenantAddons)
      .where(and(eq(tenantAddons.tenantId, tenantId), eq(tenantAddons.addonId, addonId)))
      .limit(1);
    
    if (!installation) {
      return { success: false, error: "Installation not found", code: "NOT_INSTALLED" };
    }
    
    if (installation.status !== "active" && installation.status !== "disabled") {
      return { success: false, error: "Cannot upgrade add-on in current state", code: "INVALID_STATE" };
    }
    
    // Verify target version exists and belongs to this addon
    const [targetVersion] = await db
      .select()
      .from(addonVersions)
      .where(and(eq(addonVersions.id, targetVersionId), eq(addonVersions.addonId, addonId)))
      .limit(1);
    
    if (!targetVersion) {
      return { success: false, error: "Target version not found", code: "VERSION_NOT_FOUND" };
    }
    
    // Check dependencies for new version
    const depCheck = await this.checkDependencies(tenantId, addonId, targetVersionId);
    if (!depCheck.satisfied) {
      return { 
        success: false, 
        error: "Missing dependencies for target version", 
        code: "MISSING_DEPENDENCIES",
        data: { missing: depCheck.missing, conflicts: depCheck.conflicts }
      };
    }
    
    const fromVersionId = installation.versionId;
    const previousStatus = installation.status;
    
    try {
      // Use transaction for atomic upgrade
      await db.transaction(async (tx) => {
        // Update version
        await tx
          .update(tenantAddons)
          .set({ 
            versionId: targetVersionId, 
            status: previousStatus,
            updatedAt: new Date() 
          })
          .where(eq(tenantAddons.id, installation.id));
        
        // Record history
        await tx
          .insert(addonInstallHistory)
          .values({
            tenantAddonId: installation.id,
            tenantId,
            addonId,
            action: "update",
            fromVersionId,
            toVersionId: targetVersionId,
            status: "completed",
            performedBy: userId,
            completedAt: new Date(),
          });
      });
      
      return { 
        success: true, 
        data: { 
          fromVersion: fromVersionId,
          toVersion: getVersionString(targetVersion.semverMajor, targetVersion.semverMinor, targetVersion.semverPatch)
        } 
      };
      
    } catch (error) {
      // Transaction automatically rolls back on error
      return { 
        success: false, 
        error: "Upgrade failed", 
        code: "UPGRADE_FAILED",
        rollbackPerformed: true
      };
    }
  }
  
  // Disable add-on - uses transaction for atomicity
  async disable(
    tenantId: string,
    addonId: string,
    userId: string
  ): Promise<LifecycleResult> {
    
    const [installation] = await db
      .select()
      .from(tenantAddons)
      .where(and(eq(tenantAddons.tenantId, tenantId), eq(tenantAddons.addonId, addonId)))
      .limit(1);
    
    if (!installation) {
      return { success: false, error: "Installation not found", code: "NOT_INSTALLED" };
    }
    
    if (installation.status === "disabled") {
      return { success: false, error: "Add-on is already disabled", code: "ALREADY_DISABLED" };
    }
    
    if (installation.status !== "active") {
      return { success: false, error: "Cannot disable add-on in current state", code: "INVALID_STATE" };
    }
    
    // Check if other addons depend on this one (includes version-level deps)
    const depCheck = await this.checkDependents(tenantId, addonId);
    if (depCheck.hasDependents) {
      return { 
        success: false, 
        error: "Cannot disable: other add-ons depend on this one", 
        code: "HAS_DEPENDENTS",
        data: { dependents: depCheck.dependents }
      };
    }
    
    try {
      // Use transaction for atomic disable
      await db.transaction(async (tx) => {
        await tx
          .update(tenantAddons)
          .set({ status: "disabled", updatedAt: new Date() })
          .where(eq(tenantAddons.id, installation.id));
        
        await tx
          .insert(addonInstallHistory)
          .values({
            tenantAddonId: installation.id,
            tenantId,
            addonId,
            action: "disable",
            status: "completed",
            performedBy: userId,
            completedAt: new Date(),
          });
      });
      
      return { success: true, data: { status: "disabled" } };
      
    } catch (error) {
      return { success: false, error: "Failed to disable add-on", code: "DISABLE_FAILED" };
    }
  }
  
  // Enable a disabled add-on - uses transaction for atomicity
  async enable(
    tenantId: string,
    addonId: string,
    userId: string
  ): Promise<LifecycleResult> {
    
    const [installation] = await db
      .select()
      .from(tenantAddons)
      .where(and(eq(tenantAddons.tenantId, tenantId), eq(tenantAddons.addonId, addonId)))
      .limit(1);
    
    if (!installation) {
      return { success: false, error: "Installation not found", code: "NOT_INSTALLED" };
    }
    
    if (installation.status !== "disabled") {
      return { success: false, error: "Add-on is not disabled", code: "NOT_DISABLED" };
    }
    
    // Re-check dependencies before enabling (includes version-level deps)
    const depCheck = await this.checkDependencies(tenantId, addonId, installation.versionId);
    if (!depCheck.satisfied) {
      return { 
        success: false, 
        error: "Cannot enable: missing dependencies", 
        code: "MISSING_DEPENDENCIES",
        data: { missing: depCheck.missing, conflicts: depCheck.conflicts }
      };
    }
    
    try {
      // Use transaction for atomic enable
      await db.transaction(async (tx) => {
        await tx
          .update(tenantAddons)
          .set({ status: "active", updatedAt: new Date() })
          .where(eq(tenantAddons.id, installation.id));
        
        await tx
          .insert(addonInstallHistory)
          .values({
            tenantAddonId: installation.id,
            tenantId,
            addonId,
            action: "enable",
            status: "completed",
            performedBy: userId,
            completedAt: new Date(),
          });
      });
      
      return { success: true, data: { status: "active" } };
      
    } catch (error) {
      return { success: false, error: "Failed to enable add-on", code: "ENABLE_FAILED" };
    }
  }
  
  // Uninstall add-on - uses transaction for atomicity
  async uninstall(
    tenantId: string,
    addonId: string,
    userId: string
  ): Promise<LifecycleResult> {
    
    const [installation] = await db
      .select()
      .from(tenantAddons)
      .where(and(eq(tenantAddons.tenantId, tenantId), eq(tenantAddons.addonId, addonId)))
      .limit(1);
    
    if (!installation) {
      return { success: false, error: "Installation not found", code: "NOT_INSTALLED" };
    }
    
    // Check if other addons depend on this one (includes version-level deps)
    const depCheck = await this.checkDependents(tenantId, addonId);
    if (depCheck.hasDependents) {
      return { 
        success: false, 
        error: "Cannot uninstall: other add-ons depend on this one", 
        code: "HAS_DEPENDENTS",
        data: { dependents: depCheck.dependents }
      };
    }
    
    try {
      // Use transaction for atomic uninstall
      await db.transaction(async (tx) => {
        // Record history
        await tx
          .insert(addonInstallHistory)
          .values({
            tenantAddonId: installation.id,
            tenantId,
            addonId,
            action: "uninstall",
            fromVersionId: installation.versionId,
            status: "completed",
            performedBy: userId,
            completedAt: new Date(),
          });
        
        // Delete installation
        await tx
          .delete(tenantAddons)
          .where(eq(tenantAddons.id, installation.id));
        
        // Decrement install count
        await tx
          .update(addons)
          .set({ installCount: sql`GREATEST(${addons.installCount} - 1, 0)` })
          .where(eq(addons.id, addonId));
      });
      
      return { success: true, data: { uninstalled: true } };
      
    } catch (error) {
      // Transaction automatically rolls back on error
      return { 
        success: false, 
        error: "Uninstall failed", 
        code: "UNINSTALL_FAILED",
        rollbackPerformed: true
      };
    }
  }
  
  // Get installation history for tenant/addon
  async getHistory(tenantId: string, addonId?: string) {
    let query = db
      .select()
      .from(addonInstallHistory)
      .where(eq(addonInstallHistory.tenantId, tenantId))
      .orderBy(sql`${addonInstallHistory.performedAt} DESC`);
    
    if (addonId) {
      query = db
        .select()
        .from(addonInstallHistory)
        .where(and(eq(addonInstallHistory.tenantId, tenantId), eq(addonInstallHistory.addonId, addonId)))
        .orderBy(sql`${addonInstallHistory.performedAt} DESC`);
    }
    
    return query;
  }
}

export const addonLifecycle = new AddonLifecycleService();
