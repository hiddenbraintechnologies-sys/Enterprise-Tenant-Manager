/**
 * HR Add-on Gating Middleware
 * 
 * Implements clean separation between:
 * - HR Foundation (Employee Directory) - accessible with Payroll OR HRMS add-on
 * - HRMS Suite (Attendance/Leave/Timesheets) - requires HRMS add-on only
 * 
 * Architecture:
 * - Plans remain primary revenue
 * - Add-ons are multipliers
 * - Payroll add-on requires employee directory (HR Foundation)
 * - Payroll add-on does NOT automatically enable full HRMS
 * 
 * @module server/core/hr-addon-gating
 */

import type { Request, Response, NextFunction } from "express";
import { db } from "../db";
import { tenantAddons, addons, tenantPayrollAddon, payrollAddonTiers, hrEmployees } from "@shared/schema";
import { eq, and, or, count } from "drizzle-orm";
import { getTenantAddonEntitlement } from "../services/entitlement";

// Capability Flags
export const HR_FOUNDATION = "HR_FOUNDATION"; // Employee directory only
export const HRMS_SUITE = "HRMS_SUITE"; // Full HRMS (attendance/leave/timesheets)
export const PAYROLL_SUITE = "PAYROLL_SUITE"; // Payroll processing

// Default employee limits for trials and tiers
export const PAYROLL_TRIAL_EMPLOYEE_LIMIT = 5;
export const PAYROLL_TRIAL_DAYS = 7;

export interface HRAccessResult {
  hasPayrollAddon: boolean;
  hasHrmsAddon: boolean;
  hasEmployeeAccess: boolean; // HR_FOUNDATION capability
  hasHrmsSuiteAccess: boolean; // HRMS_SUITE capability
  hasPayrollAccess: boolean; // PAYROLL_SUITE capability
  payrollTierId?: string;
  payrollTierName?: string;
  employeeLimit: number; // -1 means unlimited
  currentEmployeeCount?: number;
  isTrialing: boolean;
  trialEndsAt?: Date | null;
  // Read-only mode: Payroll expired/cancelled, no HRMS installed
  // Employees visible but no create/edit allowed
  isEmployeeReadOnly: boolean;
  readOnlyReason?: string;
}

export interface EmployeeLimitResult {
  allowed: boolean;
  currentCount: number;
  limit: number; // -1 means unlimited
  isTrialing: boolean;
  message?: string;
}

/**
 * Check if tenant has HR-related add-ons installed
 * Uses entitlement service for proper date-based expiry checking
 */
export async function checkHRAccess(tenantId: string): Promise<HRAccessResult> {
  const result: HRAccessResult = {
    hasPayrollAddon: false,
    hasHrmsAddon: false,
    hasEmployeeAccess: false,
    hasHrmsSuiteAccess: false,
    hasPayrollAccess: false,
    employeeLimit: 0,
    isTrialing: false,
    isEmployeeReadOnly: false,
  };
  
  // Track if tenant previously had payroll (expired/cancelled)
  let hadPayrollPreviously = false;

  try {
    // Use entitlement service for proper date-based checks
    const payrollEntitlement = await getTenantAddonEntitlement(tenantId, "payroll", { checkDependencies: false });
    const hrmsEntitlement = await getTenantAddonEntitlement(tenantId, "hrms", { checkDependencies: false });
    
    // Check payroll entitlement
    if (payrollEntitlement.entitled) {
      result.hasPayrollAddon = true;
      result.hasPayrollAccess = true;
      if (payrollEntitlement.state === "trial") {
        result.isTrialing = true;
        result.trialEndsAt = payrollEntitlement.validUntil;
        result.employeeLimit = PAYROLL_TRIAL_EMPLOYEE_LIMIT;
      } else {
        result.employeeLimit = -1; // Unlimited for active paid subscriptions
      }
    } else if (payrollEntitlement.state === "expired" || payrollEntitlement.state === "cancelled") {
      hadPayrollPreviously = true;
    }
    
    // Check HRMS entitlement
    if (hrmsEntitlement.entitled) {
      result.hasHrmsAddon = true;
    }

    // Also check legacy tenantPayrollAddon table
    const [legacyPayroll] = await db
      .select()
      .from(tenantPayrollAddon)
      .where(
        and(
          eq(tenantPayrollAddon.tenantId, tenantId),
          eq(tenantPayrollAddon.enabled, true)
        )
      )
      .limit(1);

    if (legacyPayroll) {
      result.hasPayrollAddon = true;
      result.hasPayrollAccess = true;
      result.payrollTierId = legacyPayroll.tierId || undefined;
      result.trialEndsAt = legacyPayroll.trialEndsAt;
      
      // Check if trialing
      if (legacyPayroll.trialEndsAt && new Date(legacyPayroll.trialEndsAt) > new Date()) {
        result.isTrialing = true;
        result.employeeLimit = PAYROLL_TRIAL_EMPLOYEE_LIMIT;
      }
      
      // Get employee limit from tier if not trialing
      if (legacyPayroll.tierId && !result.isTrialing) {
        const [tier] = await db
          .select({ maxEmployees: payrollAddonTiers.maxEmployees, tierName: payrollAddonTiers.tierName })
          .from(payrollAddonTiers)
          .where(eq(payrollAddonTiers.id, legacyPayroll.tierId))
          .limit(1);
        
        if (tier) {
          result.employeeLimit = tier.maxEmployees;
          result.payrollTierName = tier.tierName;
        }
      }
    }

    // Determine access levels (capability flags)
    // HR_FOUNDATION: Employee Directory accessible if tenant has Payroll OR HRMS
    result.hasEmployeeAccess = result.hasPayrollAddon || result.hasHrmsAddon;
    
    // HRMS_SUITE: attendance/leave/timesheets requires HRMS add-on specifically
    result.hasHrmsSuiteAccess = result.hasHrmsAddon;
    
    // PAYROLL_SUITE: payroll processing requires Payroll add-on
    // (already set above)

    // If HRMS only (no payroll), no employee limit for HR purposes
    if (result.hasHrmsAddon && !result.hasPayrollAddon) {
      result.employeeLimit = -1; // Unlimited for HRMS-only
    }
    
    // Read-only mode: Payroll expired/cancelled, no HRMS installed
    // Employees visible for data preservation but create/edit blocked
    if (hadPayrollPreviously && !result.hasPayrollAddon && !result.hasHrmsAddon) {
      // Check if tenant has any employees (data to preserve)
      const employeeCount = await countTenantEmployees(tenantId);
      if (employeeCount > 0) {
        result.hasEmployeeAccess = true; // Allow read access
        result.isEmployeeReadOnly = true;
        result.readOnlyReason = "Re-enable Payroll or add HRMS to create or edit employees.";
      }
    }

    return result;
  } catch (error) {
    console.error("[hr-addon-gating] Error checking HR access:", error);
    return result;
  }
}

/**
 * Count employees for a tenant
 */
export async function countTenantEmployees(tenantId: string): Promise<number> {
  try {
    const [result] = await db
      .select({ count: count() })
      .from(hrEmployees)
      .where(eq(hrEmployees.tenantId, tenantId));
    return result?.count || 0;
  } catch (error) {
    console.error("[hr-addon-gating] Error counting employees:", error);
    return 0;
  }
}

/**
 * Check if tenant can add more employees based on their payroll tier limit
 */
export async function checkEmployeeLimit(tenantId: string): Promise<EmployeeLimitResult> {
  const access = await checkHRAccess(tenantId);
  const currentCount = await countTenantEmployees(tenantId);
  
  // If no payroll addon, check if HRMS-only (unlimited)
  if (!access.hasPayrollAddon && access.hasHrmsAddon) {
    return {
      allowed: true,
      currentCount,
      limit: -1,
      isTrialing: false,
    };
  }
  
  // If no HR addons at all, not allowed
  if (!access.hasEmployeeAccess) {
    return {
      allowed: false,
      currentCount,
      limit: 0,
      isTrialing: false,
      message: "Employee directory requires Payroll or HRMS add-on",
    };
  }
  
  const limit = access.employeeLimit;
  
  // -1 means unlimited
  if (limit === -1) {
    return {
      allowed: true,
      currentCount,
      limit: -1,
      isTrialing: access.isTrialing,
    };
  }
  
  const allowed = currentCount < limit;
  
  return {
    allowed,
    currentCount,
    limit,
    isTrialing: access.isTrialing,
    message: allowed 
      ? undefined 
      : `Employee limit reached (${currentCount}/${limit}). Upgrade your Payroll plan for more employees.`,
  };
}

/**
 * Middleware: Require HR Foundation (Employee Directory) access
 * Allows access if tenant has Payroll OR HRMS add-on installed
 */
export function requireEmployeeAccess() {
  return async (req: Request, res: Response, next: NextFunction) => {
    const tenantId = req.context?.tenant?.id;
    if (!tenantId) {
      return res.status(401).json({ error: "Tenant not found" });
    }

    const access = await checkHRAccess(tenantId);
    
    if (!access.hasEmployeeAccess) {
      return res.status(403).json({
        error: "Employee directory requires Payroll or HRMS add-on",
        code: "ADDON_REQUIRED",
        requiredAddons: ["payroll", "hrms"],
        upgradeUrl: "/marketplace",
      });
    }

    // Attach access info to request for downstream use
    req.hrAccess = access;
    next();
  };
}

/**
 * Middleware: Require full HRMS Suite access
 * Only allows access if tenant has HRMS add-on installed
 * Payroll add-on does NOT grant access to HRMS suite features
 */
export function requireHrmsSuiteAccess() {
  return async (req: Request, res: Response, next: NextFunction) => {
    const tenantId = req.context?.tenant?.id;
    if (!tenantId) {
      return res.status(401).json({ error: "Tenant not found" });
    }

    const access = await checkHRAccess(tenantId);
    
    if (!access.hasHrmsSuiteAccess) {
      return res.status(403).json({
        error: "This feature requires the HRMS add-on",
        code: "HRMS_ADDON_REQUIRED",
        requiredAddons: ["hrms"],
        upgradeUrl: "/marketplace",
        message: access.hasPayrollAddon 
          ? "Your Payroll add-on includes employee directory. Upgrade to HRMS for attendance, leave, and timesheet management."
          : "Install the HRMS add-on to access attendance, leave, and timesheet management.",
      });
    }

    req.hrAccess = access;
    next();
  };
}

/**
 * Middleware: Require Payroll add-on access
 * Only allows access if tenant has Payroll add-on installed
 * HRMS add-on alone does NOT grant payroll access
 */
export function requirePayrollAccess() {
  return async (req: Request, res: Response, next: NextFunction) => {
    const tenantId = req.context?.tenant?.id;
    if (!tenantId) {
      return res.status(401).json({ error: "Tenant not found" });
    }

    const access = await checkHRAccess(tenantId);
    
    if (!access.hasPayrollAddon) {
      return res.status(403).json({
        error: "This feature requires the Payroll add-on",
        code: "PAYROLL_ADDON_REQUIRED",
        requiredAddons: ["payroll"],
        upgradeUrl: "/marketplace",
        message: access.hasHrmsAddon 
          ? "Your HRMS add-on includes employee management. Add the Payroll add-on for payroll processing."
          : "Install the Payroll add-on to access payroll processing features.",
      });
    }

    req.hrAccess = access;
    next();
  };
}

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      hrAccess?: HRAccessResult;
    }
  }
}
