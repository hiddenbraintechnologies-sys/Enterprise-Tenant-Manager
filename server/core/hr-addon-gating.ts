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
import { tenantAddons, addons, tenantPayrollAddon } from "@shared/schema";
import { eq, and, or, like, inArray } from "drizzle-orm";

export interface HRAccessResult {
  hasPayrollAddon: boolean;
  hasHrmsAddon: boolean;
  hasEmployeeAccess: boolean;
  hasHrmsSuiteAccess: boolean;
  payrollTier?: string;
  employeeLimit?: number;
}

/**
 * Check if tenant has HR-related add-ons installed
 */
export async function checkHRAccess(tenantId: string): Promise<HRAccessResult> {
  const result: HRAccessResult = {
    hasPayrollAddon: false,
    hasHrmsAddon: false,
    hasEmployeeAccess: false,
    hasHrmsSuiteAccess: false,
  };

  try {
    // Check marketplace tenantAddons for payroll/hrms
    const installedAddons = await db
      .select({
        slug: addons.slug,
        status: tenantAddons.status,
        subscriptionStatus: tenantAddons.subscriptionStatus,
      })
      .from(tenantAddons)
      .innerJoin(addons, eq(tenantAddons.addonId, addons.id))
      .where(
        and(
          eq(tenantAddons.tenantId, tenantId),
          eq(tenantAddons.status, "active"),
          or(
            eq(tenantAddons.subscriptionStatus, "active"),
            eq(tenantAddons.subscriptionStatus, "trialing")
          )
        )
      );

    for (const addon of installedAddons) {
      const slug = addon.slug?.toLowerCase() || "";
      if (slug.startsWith("payroll")) {
        result.hasPayrollAddon = true;
      }
      if (slug.startsWith("hrms")) {
        result.hasHrmsAddon = true;
      }
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
      result.payrollTier = legacyPayroll.tierId || undefined;
    }

    // Determine access levels
    // Employee Directory: accessible if tenant has Payroll OR HRMS
    result.hasEmployeeAccess = result.hasPayrollAddon || result.hasHrmsAddon;
    
    // HRMS Suite (attendance/leave/timesheets): requires HRMS add-on specifically
    result.hasHrmsSuiteAccess = result.hasHrmsAddon;

    return result;
  } catch (error) {
    console.error("[hr-addon-gating] Error checking HR access:", error);
    return result;
  }
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
