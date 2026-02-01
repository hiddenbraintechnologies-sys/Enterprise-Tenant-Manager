/**
 * Enhanced Add-on Access Middleware
 * 
 * Implements hard backend enforcement for add-on access with:
 * - Entitlement checking (active, trial, grace period)
 * - Dependency checking (e.g., Payroll requires HRMS)
 * - Consistent error responses
 */

import type { Request, Response, NextFunction } from "express";
import { 
  getTenantAddonEntitlement, 
  checkDependencyEntitlement,
  type AddonEntitlement 
} from "../services/entitlement";
import { auditDeniedAccessFromReq } from "../core/denied-access-audit";

export interface RequireAddonOptions {
  allowGrace?: boolean;
  allowGraceForReads?: boolean;
  dependencies?: string[];
}

export interface AddonAccessDeniedResponse {
  error: "ADDON_ACCESS_DENIED";
  code: "ADDON_EXPIRED" | "ADDON_TRIAL_EXPIRED" | "ADDON_NOT_INSTALLED" | "ADDON_CANCELLED" | 
        "ADDON_DEPENDENCY_MISSING" | "ADDON_DEPENDENCY_EXPIRED";
  addon: string;
  dependency?: string;
  validUntil?: string;
  message: string;
  upgradeUrl: string;
}

declare global {
  namespace Express {
    interface Request {
      addonEntitlement?: AddonEntitlement;
    }
  }
}

export function requireAddonMiddleware(addonCode: string, options: RequireAddonOptions = {}) {
  const { allowGrace = true, allowGraceForReads = false, dependencies = [] } = options;
  
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantId = req.context?.tenant?.id || (req as any).tokenPayload?.tenantId;
      
      if (!tenantId) {
        return res.status(401).json({
          error: "UNAUTHORIZED",
          message: "Tenant context not found",
        });
      }
      
      const entitlement = await getTenantAddonEntitlement(tenantId, addonCode);
      
      req.addonEntitlement = entitlement;
      
      // Determine effective allowGrace based on HTTP method
      // If allowGraceForReads is true, allow grace for GET/HEAD, deny for writes
      const isReadMethod = req.method === "GET" || req.method === "HEAD";
      const effectiveAllowGrace = allowGraceForReads ? isReadMethod : allowGrace;
      
      if (!entitlement.entitled) {
        if (entitlement.state === "grace" && !effectiveAllowGrace) {
          const response: AddonAccessDeniedResponse = {
            error: "ADDON_ACCESS_DENIED",
            code: "ADDON_EXPIRED",
            addon: addonCode,
            validUntil: entitlement.validUntil?.toISOString(),
            message: entitlement.message || "Add-on subscription has expired",
            upgradeUrl: "/marketplace",
          };
          
          console.log(`[require-addon] Access denied for tenant ${tenantId}, addon ${addonCode}: grace period not allowed`);
          auditDeniedAccessFromReq("ACCESS_DENIED_ADDON", req, "ADDON_EXPIRED", { addonCode });
          return res.status(403).json(response);
        }
        
        let errorCode: AddonAccessDeniedResponse["code"];
        
        switch (entitlement.reasonCode) {
          case "ADDON_TRIAL_EXPIRED":
            errorCode = "ADDON_TRIAL_EXPIRED";
            break;
          case "ADDON_NOT_INSTALLED":
            errorCode = "ADDON_NOT_INSTALLED";
            break;
          case "ADDON_CANCELLED":
            errorCode = "ADDON_CANCELLED";
            break;
          default:
            errorCode = "ADDON_EXPIRED";
        }
        
        const response: AddonAccessDeniedResponse = {
          error: "ADDON_ACCESS_DENIED",
          code: errorCode,
          addon: addonCode,
          validUntil: entitlement.validUntil?.toISOString(),
          message: entitlement.message || "Add-on access denied",
          upgradeUrl: "/marketplace",
        };
        
        console.log(`[require-addon] Access denied for tenant ${tenantId}, addon ${addonCode}: ${entitlement.reasonCode}`);
        auditDeniedAccessFromReq("ACCESS_DENIED_ADDON", req, errorCode, { addonCode });
        return res.status(403).json(response);
      }
      
      // Always check dependencies - built-in deps are checked even if no custom deps provided
      const depCheck = await checkDependencyEntitlement(tenantId, addonCode, dependencies.length > 0 ? dependencies : undefined);
      
      if (!depCheck.satisfied) {
        const depCode = depCheck.missingDependency || "unknown";
        const isExpired = depCheck.dependencyState === "expired";
        
        const response: AddonAccessDeniedResponse = {
          error: "ADDON_ACCESS_DENIED",
          code: isExpired ? "ADDON_DEPENDENCY_EXPIRED" : "ADDON_DEPENDENCY_MISSING",
          addon: addonCode,
          dependency: depCode,
          message: isExpired 
            ? `Required add-on '${depCode}' has expired. Please renew it to continue using ${addonCode}.`
            : `This feature requires '${depCode}' add-on to be installed first.`,
          upgradeUrl: "/marketplace",
        };
        
        console.log(`[require-addon] Access denied for tenant ${tenantId}: dependency ${depCode} not satisfied`);
        auditDeniedAccessFromReq("ACCESS_DENIED_ADDON", req, response.code, { addonCode, dependency: depCode });
        return res.status(403).json(response);
      }
      
      next();
    } catch (error) {
      console.error("[require-addon] Middleware error:", error);
      return res.status(500).json({
        error: "INTERNAL_ERROR",
        message: "Failed to verify add-on access",
      });
    }
  };
}

export function requirePayroll(options: Omit<RequireAddonOptions, "dependencies"> = {}) {
  return requireAddonMiddleware("payroll", { allowGraceForReads: true, ...options });
}

export function requireHrms(options: Omit<RequireAddonOptions, "dependencies"> = {}) {
  return requireAddonMiddleware("hrms", { allowGraceForReads: true, ...options });
}

export function requireAttendance(options: Omit<RequireAddonOptions, "dependencies"> = {}) {
  return requireAddonMiddleware("hrms", { allowGraceForReads: true, ...options });
}

export function requireEmployeeDirectory(options: RequireAddonOptions = {}) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantId = req.context?.tenant?.id || (req as any).tokenPayload?.tenantId;
      
      if (!tenantId) {
        return res.status(401).json({
          error: "UNAUTHORIZED",
          message: "Tenant context not found",
        });
      }
      
      const payrollEntitlement = await getTenantAddonEntitlement(tenantId, "payroll");
      const hrmsEntitlement = await getTenantAddonEntitlement(tenantId, "hrms");
      
      if (payrollEntitlement.entitled || hrmsEntitlement.entitled) {
        req.addonEntitlement = payrollEntitlement.entitled ? payrollEntitlement : hrmsEntitlement;
        return next();
      }
      
      const response: AddonAccessDeniedResponse = {
        error: "ADDON_ACCESS_DENIED",
        code: "ADDON_NOT_INSTALLED",
        addon: "hrms",
        message: "Employee directory requires Payroll or HRMS add-on",
        upgradeUrl: "/marketplace",
      };
      
      console.log(`[require-addon] Employee directory access denied for tenant ${tenantId}`);
      auditDeniedAccessFromReq("ACCESS_DENIED_ADDON", req, "ADDON_NOT_INSTALLED", { addonCode: "hrms" });
      return res.status(403).json(response);
    } catch (error) {
      console.error("[require-addon] Employee directory middleware error:", error);
      return res.status(500).json({
        error: "INTERNAL_ERROR",
        message: "Failed to verify add-on access",
      });
    }
  };
}
