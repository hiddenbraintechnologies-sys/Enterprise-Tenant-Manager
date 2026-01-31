/**
 * Add-on Entitlement Service
 * 
 * Single source of truth for add-on entitlement per tenant.
 * Provides functions to check if a tenant is entitled to use an add-on.
 */

import { db } from "../db";
import { tenantAddons, addons, tenantPayrollAddon } from "@shared/schema";
import { eq, and } from "drizzle-orm";

export type EntitlementState = "active" | "trial" | "grace" | "expired" | "not_installed" | "cancelled";

export type EntitlementReasonCode = 
  | "ADDON_ACTIVE"
  | "ADDON_TRIAL_ACTIVE"
  | "ADDON_GRACE_PERIOD"
  | "ADDON_EXPIRED"
  | "ADDON_TRIAL_EXPIRED"
  | "ADDON_NOT_INSTALLED"
  | "ADDON_CANCELLED"
  | "ADDON_DEPENDENCY_MISSING"
  | "ADDON_DEPENDENCY_EXPIRED";

export interface EntitlementRecord {
  tenantId: string;
  addonCode: string;
  status: string | null;
  subscriptionStatus: string | null;
  installedAt: Date | null;
  trialEndsAt: Date | null;
  paidUntil: Date | null;
  graceUntil: Date | null;
}

export interface AddonEntitlement {
  entitled: boolean;
  state: EntitlementState;
  validUntil: Date | null;
  reasonCode: EntitlementReasonCode;
  addonName?: string;
  message?: string;
  daysRemaining?: number;
}

export interface TenantEntitlements {
  addons: Record<string, AddonEntitlement>;
}

const ADDON_DEPENDENCIES: Record<string, string[]> = {
  "payroll": ["hrms"],
  "payroll-india": ["hrms", "hrms-india"],
  "payroll-malaysia": ["hrms", "hrms-malaysia"],
  "payroll-uk": ["hrms", "hrms-uk"],
};

const GRACE_PERIOD_DAYS = 3;

function calculateDaysRemaining(targetDate: Date | null): number {
  if (!targetDate) return 0;
  const now = new Date();
  const diff = targetDate.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export function isAddonEntitled(record: EntitlementRecord | null, now: Date = new Date()): boolean {
  if (!record) return false;
  
  const status = record.status?.toLowerCase();
  const subscriptionStatus = record.subscriptionStatus?.toLowerCase();
  
  // Accept both "active" and "trial" as valid install statuses
  if (status !== "active" && status !== "trial") return false;
  
  // Active paid subscription
  if (subscriptionStatus === "active") {
    if (record.paidUntil && new Date(record.paidUntil) >= now) {
      return true;
    }
    // No paidUntil means unlimited/free tier
    if (!record.paidUntil) {
      return true;
    }
  }
  
  // Active trial
  if (subscriptionStatus === "trialing" || subscriptionStatus === "trial") {
    if (record.trialEndsAt && new Date(record.trialEndsAt) >= now) {
      return true;
    }
  }
  
  // Grace period
  if (subscriptionStatus === "grace_period" || subscriptionStatus === "grace" || record.graceUntil) {
    if (record.graceUntil && new Date(record.graceUntil) >= now) {
      return true;
    }
  }
  
  return false;
}

export async function getAddonRecord(tenantId: string, addonCode: string): Promise<EntitlementRecord | null> {
  try {
    const result = await db
      .select({
        tenantId: tenantAddons.tenantId,
        addonCode: addons.slug,
        status: tenantAddons.status,
        subscriptionStatus: tenantAddons.subscriptionStatus,
        installedAt: tenantAddons.installedAt,
        trialEndsAt: tenantAddons.trialEndsAt,
        paidUntil: tenantAddons.currentPeriodEnd,
        graceUntil: tenantAddons.graceUntil,
      })
      .from(tenantAddons)
      .innerJoin(addons, eq(tenantAddons.addonId, addons.id))
      .where(
        and(
          eq(tenantAddons.tenantId, tenantId),
          eq(addons.slug, addonCode)
        )
      )
      .limit(1);
    
    if (result.length === 0) {
      const baseSlug = addonCode.replace(/-india$|-malaysia$|-uk$|-uae$/, "");
      if (baseSlug !== addonCode) {
        const fallbackResult = await db
          .select({
            tenantId: tenantAddons.tenantId,
            addonCode: addons.slug,
            status: tenantAddons.status,
            subscriptionStatus: tenantAddons.subscriptionStatus,
            installedAt: tenantAddons.installedAt,
            trialEndsAt: tenantAddons.trialEndsAt,
            paidUntil: tenantAddons.currentPeriodEnd,
            graceUntil: tenantAddons.graceUntil,
          })
          .from(tenantAddons)
          .innerJoin(addons, eq(tenantAddons.addonId, addons.id))
          .where(
            and(
              eq(tenantAddons.tenantId, tenantId),
              eq(addons.slug, baseSlug)
            )
          )
          .limit(1);
        
        if (fallbackResult.length > 0) {
          return fallbackResult[0];
        }
      }
      
      return null;
    }
    
    return result[0];
  } catch (error) {
    console.error("[entitlement] Error getting addon record:", error);
    return null;
  }
}

async function checkLegacyPayrollAddon(tenantId: string): Promise<EntitlementRecord | null> {
  try {
    const [legacy] = await db
      .select()
      .from(tenantPayrollAddon)
      .where(eq(tenantPayrollAddon.tenantId, tenantId))
      .limit(1);
    
    if (!legacy) return null;
    
    return {
      tenantId,
      addonCode: "payroll",
      status: legacy.enabled ? "active" : "disabled",
      subscriptionStatus: legacy.subscriptionStatus,
      installedAt: legacy.createdAt,
      trialEndsAt: legacy.trialEndsAt,
      paidUntil: legacy.currentPeriodEnd,
      graceUntil: legacy.graceUntil,
    };
  } catch (error) {
    console.error("[entitlement] Error checking legacy payroll:", error);
    return null;
  }
}

export async function getTenantAddonEntitlement(
  tenantId: string, 
  addonCode: string,
  options: { checkDependencies?: boolean } = {}
): Promise<AddonEntitlement> {
  const now = new Date();
  const { checkDependencies = true } = options;
  
  let record = await getAddonRecord(tenantId, addonCode);
  
  if (!record && (addonCode === "payroll" || addonCode.startsWith("payroll-"))) {
    record = await checkLegacyPayrollAddon(tenantId);
  }
  
  if (!record) {
    return {
      entitled: false,
      state: "not_installed",
      validUntil: null,
      reasonCode: "ADDON_NOT_INSTALLED",
      message: "Add-on is not installed",
    };
  }
  
  const status = record.status?.toLowerCase();
  const subscriptionStatus = record.subscriptionStatus?.toLowerCase();
  
  // Handle trial subscriptionStatus BEFORE checking install status
  // This ensures trial records are processed correctly regardless of install status
  if (subscriptionStatus === "trialing" || subscriptionStatus === "trial") {
    if (record.trialEndsAt) {
      const trialEnd = new Date(record.trialEndsAt);
      if (trialEnd >= now) {
        const daysRemaining = calculateDaysRemaining(trialEnd);
        return {
          entitled: true,
          state: "trial",
          validUntil: trialEnd,
          reasonCode: "ADDON_TRIAL_ACTIVE",
          daysRemaining,
          message: `Trial active, ${daysRemaining} days remaining`,
        };
      } else {
        return {
          entitled: false,
          state: "expired",
          validUntil: trialEnd,
          reasonCode: "ADDON_TRIAL_EXPIRED",
          message: `Your trial ended on ${trialEnd.toLocaleDateString()}. Renew to continue.`,
        };
      }
    }
  }
  
  // Check install status - accept both "active" and "trial"
  if (status !== "active" && status !== "trial") {
    return {
      entitled: false,
      state: "cancelled",
      validUntil: null,
      reasonCode: "ADDON_CANCELLED",
      message: "Add-on has been cancelled or disabled",
    };
  }
  
  // Trial handling is already done above before status check
  // No need for duplicate trial code here
  
  if (subscriptionStatus === "active") {
    if (record.paidUntil) {
      const paidUntil = new Date(record.paidUntil);
      if (paidUntil >= now) {
        const daysRemaining = calculateDaysRemaining(paidUntil);
        return {
          entitled: true,
          state: "active",
          validUntil: paidUntil,
          reasonCode: "ADDON_ACTIVE",
          daysRemaining,
          message: "Subscription active",
        };
      }
    } else {
      return {
        entitled: true,
        state: "active",
        validUntil: null,
        reasonCode: "ADDON_ACTIVE",
        message: "Subscription active",
      };
    }
  }
  
  if (record.graceUntil) {
    const graceEnd = new Date(record.graceUntil);
    if (graceEnd >= now) {
      const daysRemaining = calculateDaysRemaining(graceEnd);
      return {
        entitled: true,
        state: "grace",
        validUntil: graceEnd,
        reasonCode: "ADDON_GRACE_PERIOD",
        daysRemaining,
        message: `You're in grace period until ${graceEnd.toLocaleDateString()}.`,
      };
    }
  }
  
  if (subscriptionStatus === "cancelled" || subscriptionStatus === "expired" || subscriptionStatus === "halted") {
    return {
      entitled: false,
      state: "expired",
      validUntil: record.paidUntil,
      reasonCode: "ADDON_EXPIRED",
      message: "Subscription has expired. Renew to continue.",
    };
  }
  
  return {
    entitled: false,
    state: "expired",
    validUntil: null,
    reasonCode: "ADDON_EXPIRED",
    message: "Add-on subscription has expired",
  };
}

export async function checkDependencyEntitlement(
  tenantId: string, 
  addonCode: string,
  customDependencies?: string[]
): Promise<{ satisfied: boolean; missingDependency?: string; dependencyState?: EntitlementState }> {
  // Merge built-in dependencies with custom dependencies
  const builtInDeps = ADDON_DEPENDENCIES[addonCode] || [];
  const allDependencies = customDependencies 
    ? [...new Set([...builtInDeps, ...customDependencies])]
    : builtInDeps;
  
  if (allDependencies.length === 0) {
    return { satisfied: true };
  }
  
  // Check if ANY of the dependencies are satisfied (OR logic)
  for (const depCode of allDependencies) {
    const depEntitlement = await getTenantAddonEntitlement(tenantId, depCode, { checkDependencies: false });
    
    if (depEntitlement.entitled) {
      return { satisfied: true };
    }
  }
  
  // None satisfied - find the first dependency to report
  const firstDep = allDependencies[0];
  const firstDepEntitlement = await getTenantAddonEntitlement(tenantId, firstDep, { checkDependencies: false });
  
  return {
    satisfied: false,
    missingDependency: firstDep,
    dependencyState: firstDepEntitlement.state,
  };
}

export async function getAllTenantEntitlements(tenantId: string): Promise<TenantEntitlements> {
  const entitlements: Record<string, AddonEntitlement> = {};
  
  try {
    const installations = await db
      .select({
        addonCode: addons.slug,
        addonName: addons.name,
        status: tenantAddons.status,
        subscriptionStatus: tenantAddons.subscriptionStatus,
        trialEndsAt: tenantAddons.trialEndsAt,
        paidUntil: tenantAddons.currentPeriodEnd,
        graceUntil: tenantAddons.graceUntil,
      })
      .from(tenantAddons)
      .innerJoin(addons, eq(tenantAddons.addonId, addons.id))
      .where(eq(tenantAddons.tenantId, tenantId));
    
    for (const install of installations) {
      if (!install.addonCode) continue;
      
      const entitlement = await getTenantAddonEntitlement(tenantId, install.addonCode);
      entitlements[install.addonCode] = {
        ...entitlement,
        addonName: install.addonName ?? undefined,
      };
    }
    
    const legacyPayroll = await checkLegacyPayrollAddon(tenantId);
    if (legacyPayroll && !entitlements["payroll"]) {
      const payrollEntitlement = await getTenantAddonEntitlement(tenantId, "payroll");
      entitlements["payroll"] = payrollEntitlement;
    }
    
    const hrmsVariants = ["hrms", "hrms-india", "hrms-malaysia", "hrms-uk"];
    const hasAnyHrms = hrmsVariants.some(code => entitlements[code]?.entitled);
    if (hasAnyHrms && !entitlements["hrms"]) {
      const foundHrms = hrmsVariants.find(code => entitlements[code]?.entitled);
      if (foundHrms) {
        entitlements["hrms"] = entitlements[foundHrms];
      }
    }
    
  } catch (error) {
    console.error("[entitlement] Error getting all entitlements:", error);
  }
  
  return { addons: entitlements };
}

export async function syncExpiredAddons(): Promise<{ processed: number; errors: number }> {
  const now = new Date();
  let processed = 0;
  let errors = 0;
  
  console.log("[entitlement-sync] Starting addon expiry sync...");
  
  try {
    const allInstallations = await db
      .select({
        id: tenantAddons.id,
        tenantId: tenantAddons.tenantId,
        status: tenantAddons.status,
        subscriptionStatus: tenantAddons.subscriptionStatus,
        trialEndsAt: tenantAddons.trialEndsAt,
        paidUntil: tenantAddons.currentPeriodEnd,
        graceUntil: tenantAddons.graceUntil,
      })
      .from(tenantAddons)
      .where(eq(tenantAddons.status, "active"));
    
    for (const install of allInstallations) {
      try {
        const subscriptionStatus = install.subscriptionStatus?.toLowerCase();
        let newStatus: string | null = null;
        
        if (subscriptionStatus === "trialing" && install.trialEndsAt) {
          if (new Date(install.trialEndsAt) < now) {
            newStatus = "expired";
          }
        }
        
        if (subscriptionStatus === "active" && install.paidUntil) {
          if (new Date(install.paidUntil) < now) {
            if (install.graceUntil && new Date(install.graceUntil) >= now) {
              newStatus = "grace_period";
            } else {
              newStatus = "expired";
            }
          }
        }
        
        if (subscriptionStatus === "grace_period" && install.graceUntil) {
          if (new Date(install.graceUntil) < now) {
            newStatus = "expired";
          }
        }
        
        if (newStatus) {
          await db
            .update(tenantAddons)
            .set({
              subscriptionStatus: newStatus,
              updatedAt: now,
            })
            .where(eq(tenantAddons.id, install.id));
          
          console.log(`[entitlement-sync] Updated addon ${install.id} to status: ${newStatus}`);
          processed++;
        }
      } catch (installError) {
        console.error(`[entitlement-sync] Error processing addon ${install.id}:`, installError);
        errors++;
      }
    }
    
    console.log(`[entitlement-sync] Completed: ${processed} updated, ${errors} errors`);
    return { processed, errors };
  } catch (error) {
    console.error("[entitlement-sync] Fatal error:", error);
    return { processed: 0, errors: 1 };
  }
}

export function startEntitlementSyncJob(intervalMinutes: number = 60): NodeJS.Timeout {
  console.log(`[entitlement-sync] Starting background sync job, runs every ${intervalMinutes} minutes`);
  
  setTimeout(() => syncExpiredAddons(), 10000);
  
  return setInterval(() => {
    syncExpiredAddons().catch(err => {
      console.error("[entitlement-sync] Job error:", err);
    });
  }, intervalMinutes * 60 * 1000);
}
