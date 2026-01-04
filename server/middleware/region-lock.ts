import { Request, Response, NextFunction } from "express";
import { regionLockService } from "../services/region-lock";

/**
 * Middleware to enforce region-based registration restrictions
 */
export function requireRegionRegistration() {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const countryCode = req.body.country || req.body.countryCode || req.query.country;
      
      if (!countryCode) {
        return res.status(400).json({
          error: "Country code is required for registration",
          code: "COUNTRY_REQUIRED",
        });
      }
      
      const result = await regionLockService.canRegister({
        countryCode,
        action: "registration",
        businessType: req.body.businessType,
        betaCode: req.body.betaCode,
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });
      
      if (!result.allowed) {
        return res.status(403).json({
          error: result.reason || "Registration not available in this region",
          code: "REGION_BLOCKED",
          region: result.region ? {
            countryCode: result.region.countryCode,
            status: result.region.status,
          } : undefined,
        });
      }
      
      // Attach region config to request for downstream use
      req.regionConfig = result.region;
      next();
    } catch (error) {
      console.error("Region registration check failed:", error);
      res.status(500).json({
        error: "Failed to verify region eligibility",
        code: "REGION_CHECK_FAILED",
      });
    }
  };
}

/**
 * Middleware to enforce region-based billing restrictions
 */
export function requireRegionBilling() {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenant = req.context?.tenant;
      
      if (!tenant) {
        return res.status(401).json({
          error: "Tenant context required",
          code: "NO_TENANT",
        });
      }
      
      // Map tenant country enum to country code
      const countryMap: Record<string, string> = {
        india: "IN",
        uae: "AE",
        uk: "GB",
        malaysia: "MY",
        singapore: "SG",
        other: "OTHER",
      };
      
      const countryCode = countryMap[tenant.country || "india"] || "IN";
      
      const result = await regionLockService.canBill({
        countryCode,
        action: "billing",
        tenantId: tenant.id,
        subscriptionTier: req.body.subscriptionTier || tenant.subscriptionTier,
      });
      
      if (!result.allowed) {
        return res.status(403).json({
          error: result.reason || "Billing not available in this region",
          code: "BILLING_BLOCKED",
          region: result.region ? {
            countryCode: result.region.countryCode,
            status: result.region.status,
          } : undefined,
        });
      }
      
      // Attach region config to request
      req.regionConfig = result.region;
      next();
    } catch (error) {
      console.error("Region billing check failed:", error);
      res.status(500).json({
        error: "Failed to verify billing eligibility",
        code: "BILLING_CHECK_FAILED",
      });
    }
  };
}

/**
 * Middleware to load region-specific compliance packs
 */
export function loadRegionCompliancePacks() {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenant = req.context?.tenant;
      
      if (!tenant) {
        return next();
      }
      
      const countryMap: Record<string, string> = {
        india: "IN",
        uae: "AE",
        uk: "GB",
        malaysia: "MY",
        singapore: "SG",
        other: "OTHER",
      };
      
      const countryCode = countryMap[tenant.country || "india"] || "IN";
      
      const compliancePacks = await regionLockService.getRegionCompliancePacks(countryCode);
      
      // Attach to request for downstream use
      req.regionCompliancePacks = compliancePacks;
      next();
    } catch (error) {
      console.error("Failed to load region compliance packs:", error);
      next();
    }
  };
}

/**
 * Middleware to check if a specific feature is enabled for the region
 */
export function requireRegionFeature(feature: "sms" | "whatsapp" | "email") {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenant = req.context?.tenant;
      
      if (!tenant) {
        return res.status(401).json({
          error: "Tenant context required",
          code: "NO_TENANT",
        });
      }
      
      const countryMap: Record<string, string> = {
        india: "IN",
        uae: "AE",
        uk: "GB",
        malaysia: "MY",
        singapore: "SG",
        other: "OTHER",
      };
      
      const countryCode = countryMap[tenant.country || "india"] || "IN";
      const config = await regionLockService.getRegionConfig(countryCode);
      
      if (!config) {
        return res.status(403).json({
          error: "Region not configured",
          code: "REGION_NOT_CONFIGURED",
        });
      }
      
      const featureEnabled = {
        sms: config.smsEnabled,
        whatsapp: config.whatsappEnabled,
        email: config.emailEnabled,
      };
      
      if (!featureEnabled[feature]) {
        return res.status(403).json({
          error: `${feature.toUpperCase()} is not available in your region`,
          code: `${feature.toUpperCase()}_DISABLED`,
        });
      }
      
      next();
    } catch (error) {
      console.error(`Region feature check failed for ${feature}:`, error);
      res.status(500).json({
        error: "Failed to verify feature availability",
        code: "FEATURE_CHECK_FAILED",
      });
    }
  };
}

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      regionConfig?: import("@shared/schema").PlatformRegionConfig;
      regionCompliancePacks?: string[];
    }
  }
}
