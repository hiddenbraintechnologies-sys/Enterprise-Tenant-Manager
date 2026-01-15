import type { Request, Response, NextFunction } from "express";
import { db } from "../db";
import { tenantPayrollAddon } from "@shared/schema";
import { eq } from "drizzle-orm";
import { resolveTenantId } from "../lib/resolveTenantId";

export interface AddonAccess {
  payroll: boolean;
  payrollTierId?: string;
  payrollStatus?: string;
}

export async function getAddonAccess(tenantId: string): Promise<AddonAccess> {
  const [payrollAddon] = await db
    .select()
    .from(tenantPayrollAddon)
    .where(eq(tenantPayrollAddon.tenantId, tenantId))
    .limit(1);

  if (!payrollAddon) {
    return { payroll: false };
  }

  const now = new Date();
  const isActive = 
    payrollAddon.enabled && 
    payrollAddon.subscriptionStatus === "active" &&
    (!payrollAddon.currentPeriodEnd || new Date(payrollAddon.currentPeriodEnd) > now);

  const isTrialing = 
    payrollAddon.subscriptionStatus === "trialing" &&
    payrollAddon.trialEndsAt && 
    new Date(payrollAddon.trialEndsAt) > now
      ? true : false;

  const inGracePeriod = 
    payrollAddon.subscriptionStatus === "grace_period" &&
    payrollAddon.graceUntil && 
    new Date(payrollAddon.graceUntil) > now
      ? true : false;

  return {
    payroll: isActive || isTrialing || inGracePeriod,
    payrollTierId: payrollAddon.tierId ?? undefined,
    payrollStatus: payrollAddon.subscriptionStatus ?? undefined,
  };
}

export function requirePayrollAddon() {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const resolution = await resolveTenantId(req);
      
      if (resolution.error) {
        return res.status(resolution.error.status).json({
          code: resolution.error.code,
          message: resolution.error.message,
        });
      }

      const tenantId = resolution.tenantId!;
      const access = await getAddonAccess(tenantId);

      if (!access.payroll) {
        console.log(`[addon-gating] Payroll access denied for tenant ${tenantId}`);
        return res.status(403).json({
          code: "ADDON_REQUIRED",
          message: "Payroll add-on is required to access this feature",
          requiredAddon: "payroll",
          upgradeUrl: "/billing/addons",
        });
      }

      (req as any).addonAccess = access;
      next();
    } catch (error) {
      console.error("[addon-gating] Error checking addon access:", error);
      return res.status(500).json({
        code: "ADDON_CHECK_FAILED",
        message: "Failed to verify add-on access",
      });
    }
  };
}

export function requireAddon(addonCode: "payroll") {
  if (addonCode === "payroll") {
    return requirePayrollAddon();
  }
  
  return (_req: Request, res: Response, _next: NextFunction) => {
    return res.status(400).json({
      code: "UNKNOWN_ADDON",
      message: `Unknown addon code: ${addonCode}`,
    });
  };
}

export async function checkPayrollAccessForTenant(tenantId: string): Promise<{
  hasAccess: boolean;
  status: string;
  message: string;
  upgradeUrl?: string;
}> {
  const access = await getAddonAccess(tenantId);
  
  if (access.payroll) {
    return {
      hasAccess: true,
      status: access.payrollStatus || "active",
      message: "Payroll module is active",
    };
  }

  return {
    hasAccess: false,
    status: access.payrollStatus || "not_subscribed",
    message: "Payroll add-on is not active. Subscribe to access payroll features.",
    upgradeUrl: "/billing/addons",
  };
}
