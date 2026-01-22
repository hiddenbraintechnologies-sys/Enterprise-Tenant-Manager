import type { Request, Response, NextFunction } from "express";
import { db } from "../db";
import { tenantPayrollAddon, tenantAddons, addons, addonPricing, tenants, tenantSubscriptions, globalPricingPlans } from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";
import { resolveTenantId } from "../lib/resolveTenantId";

const COUNTRY_CODE_MAP: Record<string, string> = {
  india: "IN",
  malaysia: "MY",
  uk: "UK",
  uae: "AE",
  us: "US",
};

export interface AddonAccess {
  payroll: boolean;
  payrollTierId?: string;
  payrollStatus?: string;
}

export type AddonDenialReason = 
  | "ADDON_NOT_FOUND"
  | "ADDON_INACTIVE"
  | "COUNTRY_BLOCKED"
  | "BUSINESS_TYPE_BLOCKED"
  | "PLAN_TOO_LOW"
  | "NOT_INSTALLED"
  | "SUBSCRIPTION_EXPIRED"
  | "TRIAL_EXPIRED"
  | "ROLE_NOT_ALLOWED"
  | "ADDON_DISABLED";

export interface CanUseAddonResult {
  allowed: boolean;
  reason?: AddonDenialReason;
  message?: string;
  upgradeUrl?: string;
  addonDetails?: {
    name: string;
    requiredPlanTier: string;
    currentPlanTier?: string;
    installStatus?: string;
    subscriptionStatus?: string;
    trialEndsAt?: Date;
  };
}

export interface CanUseAddonParams {
  tenantId: string;
  addonCode: string;
  userRole?: string;
  countryCode?: string;
  planTier?: string;
  businessType?: string;
}

const PLAN_TIER_ORDER: Record<string, number> = {
  free: 0,
  basic: 1,
  pro: 2,
  enterprise: 3,
};

function comparePlanTiers(current: string, required: string): boolean {
  const currentLevel = PLAN_TIER_ORDER[current.toLowerCase()] ?? 0;
  const requiredLevel = PLAN_TIER_ORDER[required.toLowerCase()] ?? 0;
  return currentLevel >= requiredLevel;
}

export async function canUseAddon(params: CanUseAddonParams): Promise<CanUseAddonResult> {
  const { tenantId, addonCode, userRole, countryCode, planTier, businessType } = params;

  try {
    const [addon] = await db
      .select()
      .from(addons)
      .where(eq(addons.slug, addonCode))
      .limit(1);

    if (!addon) {
      return {
        allowed: false,
        reason: "ADDON_NOT_FOUND",
        message: `Add-on '${addonCode}' does not exist`,
      };
    }

    if (addon.status !== "published") {
      return {
        allowed: false,
        reason: "ADDON_INACTIVE",
        message: `Add-on '${addon.name}' is not available`,
        addonDetails: {
          name: addon.name,
          requiredPlanTier: addon.requiredPlanTier || "free",
        },
      };
    }

    let tenantCountryCode = countryCode;
    let tenantPlanTier = planTier;
    let tenantBusinessType = businessType;

    if (!tenantCountryCode || !tenantPlanTier || !tenantBusinessType) {
      const [tenant] = await db
        .select({
          country: tenants.country,
          businessType: tenants.businessType,
        })
        .from(tenants)
        .where(eq(tenants.id, tenantId))
        .limit(1);

      if (tenant) {
        tenantCountryCode = tenantCountryCode || COUNTRY_CODE_MAP[tenant.country || "india"] || "IN";
        tenantBusinessType = tenantBusinessType || tenant.businessType || "general";
      }

      if (!tenantPlanTier) {
        const [subscription] = await db
          .select({ tier: globalPricingPlans.tier })
          .from(tenantSubscriptions)
          .leftJoin(globalPricingPlans, eq(tenantSubscriptions.planId, globalPricingPlans.id))
          .where(
            and(
              eq(tenantSubscriptions.tenantId, tenantId),
              eq(tenantSubscriptions.status, "active")
            )
          )
          .limit(1);

        tenantPlanTier = subscription?.tier || "free";
      }
    }

    const supportedCountries = addon.supportedCountries as string[] | null;
    if (supportedCountries && supportedCountries.length > 0) {
      if (!supportedCountries.includes(tenantCountryCode!)) {
        return {
          allowed: false,
          reason: "COUNTRY_BLOCKED",
          message: `Add-on '${addon.name}' is not available in your country`,
          addonDetails: {
            name: addon.name,
            requiredPlanTier: addon.requiredPlanTier || "free",
            currentPlanTier: tenantPlanTier,
          },
        };
      }
    }

    const supportedBusinessTypes = addon.supportedBusinessTypes as string[] | null;
    if (supportedBusinessTypes && supportedBusinessTypes.length > 0) {
      if (!supportedBusinessTypes.includes(tenantBusinessType!)) {
        return {
          allowed: false,
          reason: "BUSINESS_TYPE_BLOCKED",
          message: `Add-on '${addon.name}' is not available for your business type`,
          addonDetails: {
            name: addon.name,
            requiredPlanTier: addon.requiredPlanTier || "free",
            currentPlanTier: tenantPlanTier,
          },
        };
      }
    }

    const requiredPlanTier = addon.requiredPlanTier || "free";
    if (!comparePlanTiers(tenantPlanTier!, requiredPlanTier)) {
      return {
        allowed: false,
        reason: "PLAN_TOO_LOW",
        message: `Add-on '${addon.name}' requires ${requiredPlanTier} plan or higher`,
        upgradeUrl: "/billing/upgrade",
        addonDetails: {
          name: addon.name,
          requiredPlanTier: requiredPlanTier,
          currentPlanTier: tenantPlanTier,
        },
      };
    }

    const [installation] = await db
      .select()
      .from(tenantAddons)
      .where(
        and(
          eq(tenantAddons.tenantId, tenantId),
          eq(tenantAddons.addonId, addon.id)
        )
      )
      .limit(1);

    if (!installation) {
      return {
        allowed: false,
        reason: "NOT_INSTALLED",
        message: `Add-on '${addon.name}' is not installed`,
        upgradeUrl: `/billing/addons/${addonCode}`,
        addonDetails: {
          name: addon.name,
          requiredPlanTier: requiredPlanTier,
          currentPlanTier: tenantPlanTier,
        },
      };
    }

    if (installation.status === "disabled") {
      return {
        allowed: false,
        reason: "ADDON_DISABLED",
        message: `Add-on '${addon.name}' is disabled`,
        addonDetails: {
          name: addon.name,
          requiredPlanTier: requiredPlanTier,
          currentPlanTier: tenantPlanTier,
          installStatus: installation.status,
          subscriptionStatus: installation.subscriptionStatus || undefined,
        },
      };
    }

    if (installation.status !== "active") {
      return {
        allowed: false,
        reason: "NOT_INSTALLED",
        message: `Add-on '${addon.name}' installation is ${installation.status}`,
        addonDetails: {
          name: addon.name,
          requiredPlanTier: requiredPlanTier,
          currentPlanTier: tenantPlanTier,
          installStatus: installation.status,
        },
      };
    }

    const now = new Date();
    const subscriptionStatus = installation.subscriptionStatus?.toLowerCase();

    if (subscriptionStatus === "trialing") {
      if (installation.trialEndsAt && new Date(installation.trialEndsAt) < now) {
        return {
          allowed: false,
          reason: "TRIAL_EXPIRED",
          message: `Trial for '${addon.name}' has expired`,
          upgradeUrl: `/billing/addons/${addonCode}`,
          addonDetails: {
            name: addon.name,
            requiredPlanTier: requiredPlanTier,
            currentPlanTier: tenantPlanTier,
            installStatus: installation.status,
            subscriptionStatus: installation.subscriptionStatus || undefined,
            trialEndsAt: installation.trialEndsAt || undefined,
          },
        };
      }
    } else if (subscriptionStatus === "active") {
      if (installation.currentPeriodEnd && new Date(installation.currentPeriodEnd) < now) {
        return {
          allowed: false,
          reason: "SUBSCRIPTION_EXPIRED",
          message: `Subscription for '${addon.name}' has expired`,
          upgradeUrl: `/billing/addons/${addonCode}`,
          addonDetails: {
            name: addon.name,
            requiredPlanTier: requiredPlanTier,
            currentPlanTier: tenantPlanTier,
            installStatus: installation.status,
            subscriptionStatus: installation.subscriptionStatus || undefined,
          },
        };
      }
    } else if (subscriptionStatus && !["free", "created"].includes(subscriptionStatus)) {
      return {
        allowed: false,
        reason: "SUBSCRIPTION_EXPIRED",
        message: `Subscription for '${addon.name}' is ${subscriptionStatus}`,
        upgradeUrl: `/billing/addons/${addonCode}`,
        addonDetails: {
          name: addon.name,
          requiredPlanTier: requiredPlanTier,
          currentPlanTier: tenantPlanTier,
          installStatus: installation.status,
          subscriptionStatus: installation.subscriptionStatus || undefined,
        },
      };
    }

    const allowedRoles = addon.allowedRoles as string[] | null;
    if (userRole && allowedRoles && allowedRoles.length > 0) {
      if (!allowedRoles.includes(userRole)) {
        return {
          allowed: false,
          reason: "ROLE_NOT_ALLOWED",
          message: `Your role does not have access to '${addon.name}'`,
          addonDetails: {
            name: addon.name,
            requiredPlanTier: requiredPlanTier,
            currentPlanTier: tenantPlanTier,
            installStatus: installation.status,
            subscriptionStatus: installation.subscriptionStatus || undefined,
          },
        };
      }
    }

    return {
      allowed: true,
      addonDetails: {
        name: addon.name,
        requiredPlanTier: requiredPlanTier,
        currentPlanTier: tenantPlanTier,
        installStatus: installation.status,
        subscriptionStatus: installation.subscriptionStatus || undefined,
        trialEndsAt: installation.trialEndsAt || undefined,
      },
    };
  } catch (error) {
    console.error("[addon-gating] Error in canUseAddon:", error);
    return {
      allowed: false,
      reason: "ADDON_NOT_FOUND",
      message: "Failed to verify add-on access",
    };
  }
}

export async function canPurchaseAddon(params: Omit<CanUseAddonParams, "userRole">): Promise<CanUseAddonResult> {
  const { tenantId, addonCode, countryCode, planTier, businessType } = params;

  try {
    const [addon] = await db
      .select()
      .from(addons)
      .where(eq(addons.slug, addonCode))
      .limit(1);

    if (!addon) {
      return {
        allowed: false,
        reason: "ADDON_NOT_FOUND",
        message: `Add-on '${addonCode}' does not exist`,
      };
    }

    if (addon.status !== "published") {
      return {
        allowed: false,
        reason: "ADDON_INACTIVE",
        message: `Add-on '${addon.name}' is not available for purchase`,
        addonDetails: {
          name: addon.name,
          requiredPlanTier: addon.requiredPlanTier || "free",
        },
      };
    }

    let tenantCountryCode = countryCode;
    let tenantPlanTier = planTier;
    let tenantBusinessType = businessType;

    if (!tenantCountryCode || !tenantPlanTier || !tenantBusinessType) {
      const [tenant] = await db
        .select({
          country: tenants.country,
          businessType: tenants.businessType,
        })
        .from(tenants)
        .where(eq(tenants.id, tenantId))
        .limit(1);

      if (tenant) {
        tenantCountryCode = tenantCountryCode || COUNTRY_CODE_MAP[tenant.country || "india"] || "IN";
        tenantBusinessType = tenantBusinessType || tenant.businessType || "general";
      }

      if (!tenantPlanTier) {
        const [subscription] = await db
          .select({ tier: globalPricingPlans.tier })
          .from(tenantSubscriptions)
          .leftJoin(globalPricingPlans, eq(tenantSubscriptions.planId, globalPricingPlans.id))
          .where(
            and(
              eq(tenantSubscriptions.tenantId, tenantId),
              eq(tenantSubscriptions.status, "active")
            )
          )
          .limit(1);

        tenantPlanTier = subscription?.tier || "free";
      }
    }

    const supportedCountries = addon.supportedCountries as string[] | null;
    if (supportedCountries && supportedCountries.length > 0) {
      if (!supportedCountries.includes(tenantCountryCode!)) {
        return {
          allowed: false,
          reason: "COUNTRY_BLOCKED",
          message: `Add-on '${addon.name}' is not available in your country`,
          addonDetails: {
            name: addon.name,
            requiredPlanTier: addon.requiredPlanTier || "free",
            currentPlanTier: tenantPlanTier,
          },
        };
      }
    }

    const supportedBusinessTypes = addon.supportedBusinessTypes as string[] | null;
    if (supportedBusinessTypes && supportedBusinessTypes.length > 0) {
      if (!supportedBusinessTypes.includes(tenantBusinessType!)) {
        return {
          allowed: false,
          reason: "BUSINESS_TYPE_BLOCKED",
          message: `Add-on '${addon.name}' is not available for your business type`,
          addonDetails: {
            name: addon.name,
            requiredPlanTier: addon.requiredPlanTier || "free",
            currentPlanTier: tenantPlanTier,
          },
        };
      }
    }

    const requiredPlanTier = addon.requiredPlanTier || "free";
    if (!comparePlanTiers(tenantPlanTier!, requiredPlanTier)) {
      return {
        allowed: false,
        reason: "PLAN_TOO_LOW",
        message: `Add-on '${addon.name}' requires ${requiredPlanTier} plan or higher`,
        upgradeUrl: "/billing/upgrade",
        addonDetails: {
          name: addon.name,
          requiredPlanTier: requiredPlanTier,
          currentPlanTier: tenantPlanTier,
        },
      };
    }

    const [existingInstall] = await db
      .select()
      .from(tenantAddons)
      .where(
        and(
          eq(tenantAddons.tenantId, tenantId),
          eq(tenantAddons.addonId, addon.id)
        )
      )
      .limit(1);

    if (existingInstall && existingInstall.status === "active") {
      return {
        allowed: false,
        reason: "NOT_INSTALLED",
        message: `Add-on '${addon.name}' is already installed`,
        addonDetails: {
          name: addon.name,
          requiredPlanTier: requiredPlanTier,
          currentPlanTier: tenantPlanTier,
          installStatus: existingInstall.status,
        },
      };
    }

    return {
      allowed: true,
      addonDetails: {
        name: addon.name,
        requiredPlanTier: requiredPlanTier,
        currentPlanTier: tenantPlanTier,
      },
    };
  } catch (error) {
    console.error("[addon-gating] Error in canPurchaseAddon:", error);
    return {
      allowed: false,
      reason: "ADDON_NOT_FOUND",
      message: "Failed to verify purchase eligibility",
    };
  }
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

export function requireAddonMiddleware(addonCode: string) {
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
      const userRole = (req as any).context?.role?.name;

      const result = await canUseAddon({
        tenantId,
        addonCode,
        userRole,
      });

      if (!result.allowed) {
        console.log(`[addon-gating] Access denied for tenant ${tenantId} to addon ${addonCode}: ${result.reason}`);
        return res.status(403).json({
          code: result.reason,
          message: result.message,
          upgradeUrl: result.upgradeUrl,
          addonDetails: result.addonDetails,
        });
      }

      (req as any).addonAccess = {
        [addonCode]: true,
        addonDetails: result.addonDetails,
      };
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

export function requireAddon(addonCode: "payroll" | string) {
  if (addonCode === "payroll") {
    return requirePayrollAddon();
  }
  
  return requireAddonMiddleware(addonCode);
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

export async function getAddonPermissionStatus(
  tenantId: string, 
  addonCode: string
): Promise<{
  canView: boolean;
  canPurchase: boolean;
  canUse: boolean;
  reason?: AddonDenialReason;
  message?: string;
  upgradeUrl?: string;
}> {
  const purchaseResult = await canPurchaseAddon({ tenantId, addonCode });
  const useResult = await canUseAddon({ tenantId, addonCode });

  return {
    canView: purchaseResult.reason !== "ADDON_NOT_FOUND" && purchaseResult.reason !== "ADDON_INACTIVE",
    canPurchase: purchaseResult.allowed,
    canUse: useResult.allowed,
    reason: useResult.reason || purchaseResult.reason,
    message: useResult.message || purchaseResult.message,
    upgradeUrl: useResult.upgradeUrl || purchaseResult.upgradeUrl,
  };
}

export interface TenantAddonState {
  addonCode: string;
  addonName: string;
  installed: boolean;
  installStatus: string | null;
  subscriptionStatus: string | null;
  trialEndsAt: Date | null;
  currentPeriodEnd: Date | null;
  canUse: boolean;
  canPurchase: boolean;
  reason?: AddonDenialReason;
}

export interface EligibleAddon {
  id: string;
  code: string;
  name: string;
  description: string | null;
  category: string;
  requiredPlanTier: string | null;
  isInstalled: boolean;
  canPurchase: boolean;
  purchaseReason?: AddonDenialReason;
  pricing: {
    currency: string;
    monthlyPrice: string | null;
    yearlyPrice: string | null;
    pricingModel: string | null;
    perUnitLabel: string | null;
  } | null;
}

export async function listEligibleAddons(params: {
  tenantId: string;
  countryCode?: string;
  planTier?: string;
  businessType?: string;
  includeInstalled?: boolean;
}): Promise<EligibleAddon[]> {
  const { tenantId, includeInstalled = true } = params;
  
  let countryCode = params.countryCode;
  let planTier = params.planTier;
  let businessType = params.businessType;

  if (!countryCode || !planTier || !businessType) {
    const [tenant] = await db
      .select({
        country: tenants.country,
        businessType: tenants.businessType,
      })
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1);

    if (tenant) {
      countryCode = countryCode || COUNTRY_CODE_MAP[tenant.country || "india"] || "IN";
      businessType = businessType || tenant.businessType || "general";
    }

    if (!planTier) {
      const [subscription] = await db
        .select({ tier: globalPricingPlans.tier })
        .from(tenantSubscriptions)
        .leftJoin(globalPricingPlans, eq(tenantSubscriptions.planId, globalPricingPlans.id))
        .where(
          and(
            eq(tenantSubscriptions.tenantId, tenantId),
            eq(tenantSubscriptions.status, "active")
          )
        )
        .limit(1);

      planTier = subscription?.tier || "free";
    }
  }

  const allAddons = await db
    .select({
      id: addons.id,
      code: addons.code,
      name: addons.name,
      description: addons.description,
      category: addons.category,
      requiredPlanTier: addons.requiredPlanTier,
      supportedCountries: addons.supportedCountries,
      supportedBusinessTypes: addons.supportedBusinessTypes,
      status: addons.status,
    })
    .from(addons)
    .where(eq(addons.status, "published"));

  const installedAddons = await db
    .select({
      addonId: tenantAddons.addonId,
      status: tenantAddons.status,
    })
    .from(tenantAddons)
    .where(eq(tenantAddons.tenantId, tenantId));

  const installedMap = new Map(installedAddons.map(i => [i.addonId, i.status]));

  const eligibleAddons: EligibleAddon[] = [];
  const planOrder = ["free", "basic", "pro", "enterprise"];

  for (const addon of allAddons) {
    const supportedCountries = addon.supportedCountries as string[] | null;
    if (supportedCountries && supportedCountries.length > 0) {
      if (!supportedCountries.includes(countryCode!)) {
        continue;
      }
    }

    const supportedBusinessTypes = addon.supportedBusinessTypes as string[] | null;
    if (supportedBusinessTypes && supportedBusinessTypes.length > 0) {
      if (!supportedBusinessTypes.includes(businessType!)) {
        continue;
      }
    }

    const isInstalled = installedMap.has(addon.id);
    if (!includeInstalled && isInstalled) {
      continue;
    }

    const requiredTier = addon.requiredPlanTier || "free";
    const requiredIndex = planOrder.indexOf(requiredTier);
    const currentIndex = planOrder.indexOf(planTier!);
    const meetsPlanRequirement = currentIndex >= requiredIndex;

    let purchaseReason: AddonDenialReason | undefined;
    if (!meetsPlanRequirement) {
      purchaseReason = "PLAN_TOO_LOW";
    }

    const [pricing] = await db
      .select({
        currency: addonPricing.currency,
        monthlyPrice: addonPricing.monthlyPrice,
        yearlyPrice: addonPricing.yearlyPrice,
        pricingModel: addonPricing.pricingModel,
        perUnitLabel: addonPricing.perUnitLabel,
      })
      .from(addonPricing)
      .where(
        and(
          eq(addonPricing.addonId, addon.id),
          eq(addonPricing.currency, countryCode === "IN" ? "INR" : countryCode === "MY" ? "MYR" : countryCode === "UK" ? "GBP" : "USD")
        )
      )
      .limit(1);

    eligibleAddons.push({
      id: addon.id,
      code: addon.code,
      name: addon.name,
      description: addon.description,
      category: addon.category,
      requiredPlanTier: addon.requiredPlanTier,
      isInstalled,
      canPurchase: meetsPlanRequirement && !isInstalled,
      purchaseReason,
      pricing: pricing || null,
    });
  }

  return eligibleAddons;
}

export async function getTenantAddonState(params: {
  tenantId: string;
  addonCode: string;
}): Promise<TenantAddonState | null> {
  const { tenantId, addonCode } = params;

  const [addon] = await db
    .select()
    .from(addons)
    .where(eq(addons.code, addonCode))
    .limit(1);

  if (!addon) {
    return null;
  }

  const [installation] = await db
    .select()
    .from(tenantAddons)
    .where(
      and(
        eq(tenantAddons.tenantId, tenantId),
        eq(tenantAddons.addonId, addon.id)
      )
    )
    .limit(1);

  const canUseResult = await canUseAddon({ tenantId, addonCode });
  const canPurchaseResult = await canPurchaseAddon({ tenantId, addonCode });

  return {
    addonCode: addon.code,
    addonName: addon.name,
    installed: !!installation,
    installStatus: installation?.status || null,
    subscriptionStatus: installation?.subscriptionStatus || null,
    trialEndsAt: installation?.trialEndsAt || null,
    currentPeriodEnd: installation?.currentPeriodEnd || null,
    canUse: canUseResult.allowed,
    canPurchase: canPurchaseResult.allowed,
    reason: canUseResult.reason || canPurchaseResult.reason,
  };
}

export function enforceAddonAccess(addonCode: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantId = await resolveTenantId(req);
      if (!tenantId) {
        return res.status(401).json({
          error: "Unauthorized",
          message: "Tenant context required",
        });
      }

      const result = await canUseAddon({ tenantId, addonCode });

      if (!result.allowed) {
        return res.status(403).json({
          error: "Addon Access Denied",
          code: result.reason,
          message: result.message,
          upgradeUrl: result.upgradeUrl,
          addonDetails: result.addonDetails,
        });
      }

      next();
    } catch (error) {
      console.error(`[enforceAddonAccess] Error checking addon ${addonCode}:`, error);
      return res.status(500).json({
        error: "Internal Server Error",
        message: "Failed to verify addon access",
      });
    }
  };
}

export async function buildAddonAccessMap(tenantId: string): Promise<Record<string, {
  canUse: boolean;
  canPurchase: boolean;
  reason?: AddonDenialReason;
  installStatus?: string;
  subscriptionStatus?: string;
}>> {
  const accessMap: Record<string, {
    canUse: boolean;
    canPurchase: boolean;
    reason?: AddonDenialReason;
    installStatus?: string;
    subscriptionStatus?: string;
  }> = {};

  const allAddons = await db
    .select({ code: addons.code })
    .from(addons)
    .where(eq(addons.status, "published"));

  const installations = await db
    .select({
      addonId: tenantAddons.addonId,
      status: tenantAddons.status,
      subscriptionStatus: tenantAddons.subscriptionStatus,
    })
    .from(tenantAddons)
    .where(eq(tenantAddons.tenantId, tenantId));

  const addonDetails = await db
    .select({ id: addons.id, code: addons.code })
    .from(addons);

  const addonIdToCode = new Map(addonDetails.map(a => [a.id, a.code]));
  const installMap = new Map(installations.map(i => [addonIdToCode.get(i.addonId), i]));

  for (const addon of allAddons) {
    const useResult = await canUseAddon({ tenantId, addonCode: addon.code });
    const purchaseResult = await canPurchaseAddon({ tenantId, addonCode: addon.code });
    const install = installMap.get(addon.code);

    accessMap[addon.code] = {
      canUse: useResult.allowed,
      canPurchase: purchaseResult.allowed,
      reason: useResult.reason || purchaseResult.reason,
      installStatus: install?.status || undefined,
      subscriptionStatus: install?.subscriptionStatus || undefined,
    };
  }

  return accessMap;
}
