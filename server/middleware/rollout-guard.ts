import { Request, Response, NextFunction } from "express";
import { countryRolloutService } from "../services/country-rollout";

/**
 * Middleware to check if a module is enabled for the tenant's country.
 * Uses centralized countryRolloutService for consistency.
 * FAIL-CLOSED: Returns 403/500 on errors, never allows unauthorized access.
 */
export function requireCountryModule(moduleKey: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenant = (req as any).tenant || (req as any).context?.tenant;
      
      if (!tenant?.countryCode) {
        return next();
      }

      const countryCode = String(tenant.countryCode).toUpperCase();
      
      const result = await countryRolloutService.isModuleAllowed(countryCode, moduleKey);
      
      if (!result.allowed) {
        return res.status(403).json({ 
          error: result.code || "MODULE_NOT_AVAILABLE",
          module: moduleKey,
          message: result.message || `The "${moduleKey}" module is not available in your country.`
        });
      }

      next();
    } catch (error) {
      console.error("[rollout-guard] Error checking module:", error);
      return res.status(500).json({ 
        error: "ROLLOUT_CHECK_FAILED",
        message: "Unable to verify module access. Please try again."
      });
    }
  };
}

/**
 * Middleware to check if a feature is enabled for the tenant's country.
 * Uses centralized countryRolloutService for consistency.
 * FAIL-CLOSED: Returns 403/500 on errors, never allows unauthorized access.
 */
export function requireCountryFeature(featureKey: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenant = (req as any).tenant || (req as any).context?.tenant;
      
      if (!tenant?.countryCode) {
        return next();
      }

      const countryCode = String(tenant.countryCode).toUpperCase();
      
      const result = await countryRolloutService.isFeatureAllowed(countryCode, featureKey);
      
      if (!result.allowed) {
        return res.status(403).json({ 
          error: result.code || "FEATURE_NOT_AVAILABLE",
          feature: featureKey,
          message: result.message || `The "${featureKey}" feature is not available in your country.`
        });
      }

      next();
    } catch (error) {
      console.error("[rollout-guard] Error checking feature:", error);
      return res.status(500).json({ 
        error: "ROLLOUT_CHECK_FAILED",
        message: "Unable to verify feature access. Please try again."
      });
    }
  };
}

/**
 * Middleware to check if country is active (for routes that need country check only).
 * Uses centralized countryRolloutService for consistency.
 * FAIL-CLOSED: Returns 403/500 on errors, never allows unauthorized access.
 */
export function requireActiveCountry() {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenant = (req as any).tenant || (req as any).context?.tenant;
      
      if (!tenant?.countryCode) {
        return next();
      }

      const countryCode = String(tenant.countryCode).toUpperCase();
      
      const policy = await countryRolloutService.getCountryPolicy(countryCode);
      
      if (!policy || policy.isActive === false) {
        return res.status(403).json({ 
          error: "COUNTRY_NOT_ACTIVE",
          message: policy?.comingSoonMessage || "This country is not currently active."
        });
      }

      next();
    } catch (error) {
      console.error("[rollout-guard] Error checking country:", error);
      return res.status(500).json({ 
        error: "ROLLOUT_CHECK_FAILED",
        message: "Unable to verify country access. Please try again."
      });
    }
  };
}
