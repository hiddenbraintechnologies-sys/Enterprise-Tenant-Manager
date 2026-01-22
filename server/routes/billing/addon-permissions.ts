import { Router, Request, Response } from "express";
import { canUseAddon, canPurchaseAddon, getAddonPermissionStatus, listEligibleAddons, getTenantAddonState } from "../../core/addon-gating";
import { authenticateHybrid } from "../../core/auth-middleware";
import { resolveTenantId } from "../../lib/resolveTenantId";
import { db } from "../../db";
import { addons, tenantAddons, tenantSubscriptions, tenants, bundleDiscounts, globalPricingPlans } from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";
import { z } from "zod";

const COUNTRY_CODE_MAP: Record<string, string> = {
  india: "IN",
  malaysia: "MY",
  uk: "UK",
  uae: "AE",
  us: "US",
};

const router = Router();

const checkPermissionSchema = z.object({
  addonCode: z.string().min(1),
});

router.get("/check/:addonCode", authenticateHybrid, async (req: Request, res: Response) => {
  try {
    const resolution = await resolveTenantId(req);
    if (resolution.error) {
      return res.status(resolution.error.status).json({
        code: resolution.error.code,
        message: resolution.error.message,
      });
    }

    const tenantId = resolution.tenantId!;
    const addonCode = req.params.addonCode;
    const userRole = (req as any).context?.role?.name;

    const result = await canUseAddon({
      tenantId,
      addonCode,
      userRole,
    });

    return res.json(result);
  } catch (error) {
    console.error("[addon-permissions] Error checking permission:", error);
    return res.status(500).json({
      code: "PERMISSION_CHECK_FAILED",
      message: "Failed to check add-on permission",
    });
  }
});

router.get("/can-purchase/:addonCode", authenticateHybrid, async (req: Request, res: Response) => {
  try {
    const resolution = await resolveTenantId(req);
    if (resolution.error) {
      return res.status(resolution.error.status).json({
        code: resolution.error.code,
        message: resolution.error.message,
      });
    }

    const tenantId = resolution.tenantId!;
    const addonCode = req.params.addonCode;

    const result = await canPurchaseAddon({
      tenantId,
      addonCode,
    });

    return res.json(result);
  } catch (error) {
    console.error("[addon-permissions] Error checking purchase eligibility:", error);
    return res.status(500).json({
      code: "PERMISSION_CHECK_FAILED",
      message: "Failed to check purchase eligibility",
    });
  }
});

router.get("/status/:addonCode", authenticateHybrid, async (req: Request, res: Response) => {
  try {
    const resolution = await resolveTenantId(req);
    if (resolution.error) {
      return res.status(resolution.error.status).json({
        code: resolution.error.code,
        message: resolution.error.message,
      });
    }

    const tenantId = resolution.tenantId!;
    const addonCode = req.params.addonCode;

    const status = await getAddonPermissionStatus(tenantId, addonCode);

    return res.json(status);
  } catch (error) {
    console.error("[addon-permissions] Error getting permission status:", error);
    return res.status(500).json({
      code: "PERMISSION_CHECK_FAILED",
      message: "Failed to get permission status",
    });
  }
});

router.get("/bundle-discounts", authenticateHybrid, async (req: Request, res: Response) => {
  try {
    const resolution = await resolveTenantId(req);
    if (resolution.error) {
      return res.status(resolution.error.status).json({
        code: resolution.error.code,
        message: resolution.error.message,
      });
    }

    const tenantId = resolution.tenantId!;

    const [tenant] = await db
      .select({ country: tenants.country })
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1);

    const countryCode = tenant?.country ? COUNTRY_CODE_MAP[tenant.country] || "IN" : "IN";

    const [subscription] = await db
      .select({ 
        planId: tenantSubscriptions.planId,
        planName: globalPricingPlans.name,
        planTier: globalPricingPlans.tier,
      })
      .from(tenantSubscriptions)
      .leftJoin(globalPricingPlans, eq(tenantSubscriptions.planId, globalPricingPlans.id))
      .where(
        and(
          eq(tenantSubscriptions.tenantId, tenantId),
          eq(tenantSubscriptions.status, "active")
        )
      )
      .limit(1);

    const planCode = subscription?.planTier || "free";

    const discounts = await db
      .select()
      .from(bundleDiscounts)
      .where(
        and(
          eq(bundleDiscounts.countryCode, countryCode),
          eq(bundleDiscounts.planCode, planCode),
          eq(bundleDiscounts.isActive, true)
        )
      );

    return res.json({
      countryCode,
      planCode,
      discounts,
    });
  } catch (error) {
    console.error("[addon-permissions] Error fetching bundle discounts:", error);
    return res.status(500).json({
      code: "BUNDLE_DISCOUNTS_FAILED",
      message: "Failed to fetch bundle discounts",
    });
  }
});

router.get("/available", authenticateHybrid, async (req: Request, res: Response) => {
  try {
    const resolution = await resolveTenantId(req);
    if (resolution.error) {
      return res.status(resolution.error.status).json({
        code: resolution.error.code,
        message: resolution.error.message,
      });
    }

    const tenantId = resolution.tenantId!;

    const [tenant] = await db
      .select({ 
        country: tenants.country,
        businessType: tenants.businessType,
      })
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1);

    const countryCode = tenant?.country ? COUNTRY_CODE_MAP[tenant.country] || "IN" : "IN";
    const businessType = tenant?.businessType || "general";

    const [subscription] = await db
      .select({ 
        planId: tenantSubscriptions.planId,
        planTier: globalPricingPlans.tier,
      })
      .from(tenantSubscriptions)
      .leftJoin(globalPricingPlans, eq(tenantSubscriptions.planId, globalPricingPlans.id))
      .where(
        and(
          eq(tenantSubscriptions.tenantId, tenantId),
          eq(tenantSubscriptions.status, "active")
        )
      )
      .limit(1);

    const planTier = subscription?.planTier || "free";

    const allAddons = await db
      .select()
      .from(addons)
      .where(eq(addons.status, "published"));

    const installedAddons = await db
      .select({ addonId: tenantAddons.addonId })
      .from(tenantAddons)
      .where(eq(tenantAddons.tenantId, tenantId));

    const installedAddonIds = new Set(installedAddons.map(a => a.addonId));

    const PLAN_TIER_ORDER: Record<string, number> = {
      free: 0,
      basic: 1,
      pro: 2,
      enterprise: 3,
    };

    const currentPlanLevel = PLAN_TIER_ORDER[planTier.toLowerCase()] ?? 0;

    const availableAddons = allAddons.map(addon => {
      const supportedCountries = addon.supportedCountries as string[] | null;
      const isCountrySupported = !supportedCountries || supportedCountries.length === 0 || 
        supportedCountries.includes(countryCode);

      const supportedBusinessTypes = addon.supportedBusinessTypes as string[] | null;
      const isBusinessTypeSupported = !supportedBusinessTypes || supportedBusinessTypes.length === 0 || 
        supportedBusinessTypes.includes(businessType);

      const requiredPlanLevel = PLAN_TIER_ORDER[(addon.requiredPlanTier || "free").toLowerCase()] ?? 0;
      const isPlanSufficient = currentPlanLevel >= requiredPlanLevel;

      const isInstalled = installedAddonIds.has(addon.id);

      let status: "available" | "installed" | "plan_required" | "country_blocked" | "business_type_blocked";
      let message = "";

      if (isInstalled) {
        status = "installed";
        message = "Already installed";
      } else if (!isCountrySupported) {
        status = "country_blocked";
        message = "Not available in your country";
      } else if (!isBusinessTypeSupported) {
        status = "business_type_blocked";
        message = "Not available for your business type";
      } else if (!isPlanSufficient) {
        status = "plan_required";
        message = `Requires ${addon.requiredPlanTier} plan or higher`;
      } else {
        status = "available";
        message = "Available for purchase";
      }

      return {
        id: addon.id,
        slug: addon.slug,
        name: addon.name,
        shortDescription: addon.shortDescription,
        category: addon.category,
        requiredPlanTier: addon.requiredPlanTier,
        featured: addon.featured,
        featuredOrder: addon.featuredOrder,
        status,
        message,
        canPurchase: status === "available",
        isInstalled,
      };
    });

    availableAddons.sort((a, b) => {
      if (a.canPurchase && !b.canPurchase) return -1;
      if (!a.canPurchase && b.canPurchase) return 1;
      if (a.featured && !b.featured) return -1;
      if (!a.featured && b.featured) return 1;
      return (a.featuredOrder || 999) - (b.featuredOrder || 999);
    });

    return res.json({
      tenantId,
      countryCode,
      businessType,
      planTier,
      addons: availableAddons,
    });
  } catch (error) {
    console.error("[addon-permissions] Error fetching available addons:", error);
    return res.status(500).json({
      code: "AVAILABLE_ADDONS_FAILED",
      message: "Failed to fetch available addons",
    });
  }
});

router.get("/eligible", authenticateHybrid, async (req: Request, res: Response) => {
  try {
    const resolution = await resolveTenantId(req);
    if (resolution.error) {
      return res.status(resolution.error.status).json({
        code: resolution.error.code,
        message: resolution.error.message,
      });
    }

    const tenantId = resolution.tenantId!;
    const includeInstalled = req.query.includeInstalled !== "false";

    const eligibleAddons = await listEligibleAddons({
      tenantId,
      includeInstalled,
    });

    return res.json({
      tenantId,
      addons: eligibleAddons,
    });
  } catch (error) {
    console.error("[addon-permissions] Error fetching eligible addons:", error);
    return res.status(500).json({
      code: "ELIGIBLE_ADDONS_FAILED",
      message: "Failed to fetch eligible addons",
    });
  }
});

router.get("/state/:addonCode", authenticateHybrid, async (req: Request, res: Response) => {
  try {
    const resolution = await resolveTenantId(req);
    if (resolution.error) {
      return res.status(resolution.error.status).json({
        code: resolution.error.code,
        message: resolution.error.message,
      });
    }

    const tenantId = resolution.tenantId!;
    const addonCode = req.params.addonCode;

    const state = await getTenantAddonState({
      tenantId,
      addonCode,
    });

    if (!state) {
      return res.status(404).json({
        code: "ADDON_NOT_FOUND",
        message: `Add-on with code '${addonCode}' not found`,
      });
    }

    return res.json(state);
  } catch (error) {
    console.error("[addon-permissions] Error fetching addon state:", error);
    return res.status(500).json({
      code: "ADDON_STATE_FAILED",
      message: "Failed to fetch addon state",
    });
  }
});

export default router;
