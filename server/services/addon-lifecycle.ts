import { db } from "../db";
import { 
  addons, 
  addonVersions, 
  addonPricing, 
  tenantAddons, 
  addonInstallHistory 
} from "@shared/schema";
import { eq, and, sql, inArray } from "drizzle-orm";

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
  
  // Check if any other addons depend on this one before uninstall
  async checkDependents(
    tenantId: string, 
    addonId: string
  ): Promise<{ hasDependents: boolean; dependents: string[] }> {
    
    // Get all installed addons for this tenant
    const installed = await db
      .select({
        addonId: tenantAddons.addonId,
        status: tenantAddons.status,
      })
      .from(tenantAddons)
      .where(and(
        eq(tenantAddons.tenantId, tenantId),
        inArray(tenantAddons.status, ["active", "disabled"])
      ));
    
    const dependents: string[] = [];
    
    for (const inst of installed) {
      if (inst.addonId === addonId) continue;
      
      const [addon] = await db
        .select()
        .from(addons)
        .where(eq(addons.id, inst.addonId))
        .limit(1);
      
      if (addon?.dependencies) {
        const deps = addon.dependencies as AddonDependency[];
        const dependsOnTarget = deps.some(d => d.addonId === addonId && !d.optional);
        if (dependsOnTarget) {
          dependents.push(addon.name);
        }
      }
    }
    
    return { hasDependents: dependents.length > 0, dependents };
  }
  
  // Install add-on with dependency checks and rollback
  async install(
    tenantId: string,
    addonId: string,
    pricingId: string | null,
    config: Record<string, any>,
    userId: string
  ): Promise<LifecycleResult> {
    
    // Verify addon exists and is published
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
    
    // Begin installation with rollback capability
    let installationId: string | null = null;
    let historyId: string | null = null;
    
    try {
      // Create installation record
      const [installation] = await db
        .insert(tenantAddons)
        .values({
          tenantId,
          addonId,
          versionId: latestVersion.id,
          pricingId: selectedPricing?.id,
          status: "installing",
          config,
          installedBy: userId,
          trialEndsAt: selectedPricing?.trialDays 
            ? new Date(Date.now() + selectedPricing.trialDays * 24 * 60 * 60 * 1000)
            : null,
        })
        .returning();
      
      installationId = installation.id;
      
      // Record history
      const [history] = await db
        .insert(addonInstallHistory)
        .values({
          tenantAddonId: installation.id,
          tenantId,
          addonId,
          action: "install",
          toVersionId: latestVersion.id,
          status: "in_progress",
          performedBy: userId,
        })
        .returning();
      
      historyId = history.id;
      
      // Simulate installation process (in real app, this would run actual install hooks)
      // If any step fails, we roll back
      
      // Mark as active
      await db
        .update(tenantAddons)
        .set({ status: "active" })
        .where(eq(tenantAddons.id, installation.id));
      
      // Update history
      await db
        .update(addonInstallHistory)
        .set({ status: "completed", completedAt: new Date() })
        .where(eq(addonInstallHistory.id, history.id));
      
      // Update install count
      await db
        .update(addons)
        .set({ installCount: sql`${addons.installCount} + 1` })
        .where(eq(addons.id, addonId));
      
      return { 
        success: true, 
        data: { 
          installation,
          version: getVersionString(latestVersion.semverMajor, latestVersion.semverMinor, latestVersion.semverPatch)
        } 
      };
      
    } catch (error) {
      // Rollback on failure
      if (installationId) {
        await db.delete(tenantAddons).where(eq(tenantAddons.id, installationId));
      }
      if (historyId) {
        await db
          .update(addonInstallHistory)
          .set({ status: "failed", errorMessage: String(error), completedAt: new Date() })
          .where(eq(addonInstallHistory.id, historyId));
      }
      
      return { 
        success: false, 
        error: "Installation failed", 
        code: "INSTALL_FAILED",
        rollbackPerformed: true
      };
    }
  }
  
  // Upgrade add-on to new version with rollback
  async upgrade(
    tenantId: string,
    addonId: string,
    targetVersionId: string,
    userId: string
  ): Promise<LifecycleResult> {
    
    // Get current installation
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
    let historyId: string | null = null;
    
    try {
      // Record history
      const [history] = await db
        .insert(addonInstallHistory)
        .values({
          tenantAddonId: installation.id,
          tenantId,
          addonId,
          action: "update",
          fromVersionId,
          toVersionId: targetVersionId,
          status: "in_progress",
          performedBy: userId,
        })
        .returning();
      
      historyId = history.id;
      
      // Mark as updating
      await db
        .update(tenantAddons)
        .set({ status: "updating", updatedAt: new Date() })
        .where(eq(tenantAddons.id, installation.id));
      
      // Simulate upgrade process
      // In real implementation, this would run migration scripts, etc.
      
      // Update version
      await db
        .update(tenantAddons)
        .set({ 
          versionId: targetVersionId, 
          status: previousStatus,
          updatedAt: new Date() 
        })
        .where(eq(tenantAddons.id, installation.id));
      
      // Update history
      await db
        .update(addonInstallHistory)
        .set({ status: "completed", completedAt: new Date() })
        .where(eq(addonInstallHistory.id, history.id));
      
      return { 
        success: true, 
        data: { 
          fromVersion: fromVersionId,
          toVersion: getVersionString(targetVersion.semverMajor, targetVersion.semverMinor, targetVersion.semverPatch)
        } 
      };
      
    } catch (error) {
      // Rollback to previous version
      await db
        .update(tenantAddons)
        .set({ 
          versionId: fromVersionId, 
          status: previousStatus,
          updatedAt: new Date() 
        })
        .where(eq(tenantAddons.id, installation.id));
      
      if (historyId) {
        await db
          .update(addonInstallHistory)
          .set({ status: "rolled_back", errorMessage: String(error), completedAt: new Date() })
          .where(eq(addonInstallHistory.id, historyId));
      }
      
      return { 
        success: false, 
        error: "Upgrade failed, rolled back to previous version", 
        code: "UPGRADE_FAILED",
        rollbackPerformed: true
      };
    }
  }
  
  // Disable add-on (keeps installation but deactivates)
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
    
    // Check if other addons depend on this one
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
      await db
        .update(tenantAddons)
        .set({ status: "disabled", updatedAt: new Date() })
        .where(eq(tenantAddons.id, installation.id));
      
      // Record history
      await db
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
      
      return { success: true, data: { status: "disabled" } };
      
    } catch (error) {
      return { success: false, error: "Failed to disable add-on", code: "DISABLE_FAILED" };
    }
  }
  
  // Enable a disabled add-on
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
    
    // Re-check dependencies before enabling
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
      await db
        .update(tenantAddons)
        .set({ status: "active", updatedAt: new Date() })
        .where(eq(tenantAddons.id, installation.id));
      
      // Record history
      await db
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
      
      return { success: true, data: { status: "active" } };
      
    } catch (error) {
      return { success: false, error: "Failed to enable add-on", code: "ENABLE_FAILED" };
    }
  }
  
  // Uninstall add-on with dependency checks
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
    
    // Check if other addons depend on this one
    const depCheck = await this.checkDependents(tenantId, addonId);
    if (depCheck.hasDependents) {
      return { 
        success: false, 
        error: "Cannot uninstall: other add-ons depend on this one", 
        code: "HAS_DEPENDENTS",
        data: { dependents: depCheck.dependents }
      };
    }
    
    const previousState = { ...installation };
    let historyId: string | null = null;
    
    try {
      // Record history first
      const [history] = await db
        .insert(addonInstallHistory)
        .values({
          tenantAddonId: installation.id,
          tenantId,
          addonId,
          action: "uninstall",
          fromVersionId: installation.versionId,
          status: "in_progress",
          performedBy: userId,
        })
        .returning();
      
      historyId = history.id;
      
      // Mark as uninstalling
      await db
        .update(tenantAddons)
        .set({ status: "uninstalling", updatedAt: new Date() })
        .where(eq(tenantAddons.id, installation.id));
      
      // Simulate cleanup process
      // In real implementation, this would cleanup addon data, run uninstall hooks, etc.
      
      // Delete installation
      await db
        .delete(tenantAddons)
        .where(eq(tenantAddons.id, installation.id));
      
      // Update history
      await db
        .update(addonInstallHistory)
        .set({ status: "completed", completedAt: new Date() })
        .where(eq(addonInstallHistory.id, history.id));
      
      // Decrement install count
      await db
        .update(addons)
        .set({ installCount: sql`GREATEST(${addons.installCount} - 1, 0)` })
        .where(eq(addons.id, addonId));
      
      return { success: true, data: { uninstalled: true } };
      
    } catch (error) {
      // Rollback - restore the installation
      if (historyId) {
        // Try to restore the installation
        try {
          await db
            .update(tenantAddons)
            .set({ status: previousState.status, updatedAt: new Date() })
            .where(eq(tenantAddons.id, installation.id));
        } catch {
          // If update fails, the record was already deleted, re-insert
          await db.insert(tenantAddons).values(previousState);
        }
        
        await db
          .update(addonInstallHistory)
          .set({ status: "rolled_back", errorMessage: String(error), completedAt: new Date() })
          .where(eq(addonInstallHistory.id, historyId));
      }
      
      return { 
        success: false, 
        error: "Uninstall failed, rolled back", 
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
