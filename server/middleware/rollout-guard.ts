import { Request, Response, NextFunction } from "express";
import { db } from "../db";
import { countryRolloutPolicy } from "@shared/schema";
import { eq } from "drizzle-orm";

/**
 * Middleware to check if a module is enabled for the tenant's country.
 * Returns 403 if the module is not available.
 */
export function requireCountryModule(moduleKey: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Get tenant context from request (set by auth middleware)
      const tenant = (req as any).tenant || (req as any).context?.tenant;
      
      // If no tenant context or no country code, skip check
      if (!tenant?.countryCode) {
        return next();
      }

      const countryCode = String(tenant.countryCode).toUpperCase();
      
      const [rollout] = await db
        .select()
        .from(countryRolloutPolicy)
        .where(eq(countryRolloutPolicy.countryCode, countryCode))
        .limit(1);

      // If no rollout policy or country not active, block
      if (!rollout || rollout.isActive === false) {
        return res.status(403).json({ 
          error: "COUNTRY_NOT_ACTIVE",
          message: "This country is not currently active."
        });
      }

      // Check if module is in enabled list
      const enabledModules = (rollout.enabledModules || []) as string[];
      
      // If enabledModules is empty, all modules are allowed (default behavior)
      if (enabledModules.length > 0 && !enabledModules.includes(moduleKey)) {
        return res.status(403).json({ 
          error: "MODULE_NOT_AVAILABLE", 
          module: moduleKey,
          message: `The "${moduleKey}" module is not available in your country.`
        });
      }

      next();
    } catch (error) {
      console.error("[rollout-guard] Error checking module:", error);
      next(); // On error, allow through (fail-open for now)
    }
  };
}

/**
 * Middleware to check if a feature is enabled for the tenant's country.
 * Returns 403 if the feature is not available.
 */
export function requireCountryFeature(featureKey: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenant = (req as any).tenant || (req as any).context?.tenant;
      
      if (!tenant?.countryCode) {
        return next();
      }

      const countryCode = String(tenant.countryCode).toUpperCase();
      
      const [rollout] = await db
        .select()
        .from(countryRolloutPolicy)
        .where(eq(countryRolloutPolicy.countryCode, countryCode))
        .limit(1);

      if (!rollout || rollout.isActive === false) {
        return res.status(403).json({ 
          error: "COUNTRY_NOT_ACTIVE",
          message: "This country is not currently active."
        });
      }

      // Check enabledFeatures (JSONB object with boolean flags)
      const enabledFeatures = (rollout.enabledFeatures || {}) as Record<string, boolean>;
      
      // Feature must be explicitly set to true to be enabled
      if (enabledFeatures[featureKey] !== true) {
        return res.status(403).json({ 
          error: "FEATURE_NOT_AVAILABLE", 
          feature: featureKey,
          message: `The "${featureKey}" feature is not available in your country.`
        });
      }

      next();
    } catch (error) {
      console.error("[rollout-guard] Error checking feature:", error);
      next(); // Fail-open
    }
  };
}

/**
 * Middleware to check if country is active (for routes that need country check only)
 */
export function requireActiveCountry() {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenant = (req as any).tenant || (req as any).context?.tenant;
      
      if (!tenant?.countryCode) {
        return next();
      }

      const countryCode = String(tenant.countryCode).toUpperCase();
      
      const [rollout] = await db
        .select()
        .from(countryRolloutPolicy)
        .where(eq(countryRolloutPolicy.countryCode, countryCode))
        .limit(1);

      if (!rollout || rollout.isActive === false) {
        return res.status(403).json({ 
          error: "COUNTRY_NOT_ACTIVE",
          message: rollout?.comingSoonMessage || "This country is not currently active."
        });
      }

      next();
    } catch (error) {
      console.error("[rollout-guard] Error checking country:", error);
      next();
    }
  };
}
