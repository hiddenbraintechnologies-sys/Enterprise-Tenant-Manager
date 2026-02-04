import { Router, Request, Response } from "express";
import { countryRolloutService } from "../services/country-rollout";
import { bootstrapStatus } from "../services/bootstrap-status";
import { getBusinessTypeOptions } from "@shared/business-types";
import { getBusinessTypeConfig } from "@shared/business-type-config";

const router = Router();

// Use shared business type registry - single source of truth
const ALL_BUSINESS_TYPES = getBusinessTypeOptions();

// GET /api/catalog/business-types?country=IN
// Returns only allowed business types for the given country
router.get("/business-types", async (req: Request, res: Response) => {
  // Prevent any caching of this dynamic data
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
  
  try {
    const { country } = req.query;
    console.log("[catalog/business-types] Request for country:", country);
    
    if (!country || typeof country !== "string") {
      return res.status(400).json({ 
        error: "Country code is required",
        code: "COUNTRY_REQUIRED" 
      });
    }

    // Wait for bootstrap to complete country rollout seeding (max 10 seconds)
    if (!bootstrapStatus.isCountryRolloutReady) {
      const ready = await bootstrapStatus.waitForCountryRollout(10000);
      if (!ready) {
        console.warn("[catalog] Bootstrap timeout - serving request without waiting");
      }
    }

    const countryCode = country.toUpperCase();
    const config = await countryRolloutService.getCountryConfig(countryCode);

    if (!config) {
      // Return all business types if country not configured
      return res.json({
        countryCode,
        rolloutStatus: "coming_soon",
        businessTypes: ALL_BUSINESS_TYPES,
      });
    }

    const enabledTypes = config.enabledBusinessTypes;
    
    // If no specific business types are enabled, return empty list (enforces gating)
    if (!enabledTypes || enabledTypes.length === 0) {
      return res.json({
        countryCode,
        rolloutStatus: config.rolloutStatus,
        countryName: config.countryName,
        businessTypes: [],
        message: "No business types are currently enabled for this country.",
      });
    }

    // Filter to only enabled business types
    const filteredTypes = ALL_BUSINESS_TYPES.filter(
      bt => enabledTypes.includes(bt.value)
    );

    res.json({
      countryCode,
      rolloutStatus: config.rolloutStatus,
      countryName: config.countryName,
      businessTypes: filteredTypes,
    });
  } catch (error) {
    console.error("[catalog] Error fetching business types:", error);
    res.status(500).json({ error: "Failed to fetch business types" });
  }
});

// GET /api/catalog/country-config?country=IN
// Returns full rollout config for the country
router.get("/country-config", async (req: Request, res: Response) => {
  // Prevent any caching of this dynamic data
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
  
  try {
    const { country } = req.query;
    
    if (!country || typeof country !== "string") {
      return res.status(400).json({ 
        error: "Country code is required",
        code: "COUNTRY_REQUIRED" 
      });
    }

    const config = await countryRolloutService.getCountryConfig(country);

    if (!config) {
      return res.json({
        countryCode: country.toUpperCase(),
        available: false,
        rolloutStatus: "coming_soon",
      });
    }

    res.json({
      countryCode: config.countryCode,
      countryName: config.countryName,
      available: true,
      rolloutStatus: config.rolloutStatus,
      status: config.status,
      isSignupEnabled: config.isSignupEnabled,
      isBillingEnabled: config.isBillingEnabled,
      defaultCurrency: config.defaultCurrency,
      enabledBusinessTypes: config.enabledBusinessTypes,
      enabledModules: config.enabledModules,
    });
  } catch (error) {
    console.error("[catalog] Error fetching country config:", error);
    res.status(500).json({ error: "Failed to fetch country config" });
  }
});

// GET /api/catalog/regions/:countryCode/business-types
// Public API endpoint for fetching enabled business types by region/country
// This is the preferred endpoint for onboarding flows
router.get("/regions/:countryCode/business-types", async (req: Request, res: Response) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
  
  try {
    const { countryCode } = req.params;
    
    if (!countryCode) {
      return res.status(400).json({ 
        error: "Country code is required",
        code: "COUNTRY_REQUIRED" 
      });
    }

    // Wait for bootstrap to complete country rollout seeding
    if (!bootstrapStatus.isCountryRolloutReady) {
      const ready = await bootstrapStatus.waitForCountryRollout(10000);
      if (!ready) {
        console.warn("[catalog] Bootstrap timeout - serving request without waiting");
      }
    }

    const normalizedCode = countryCode.toUpperCase();
    const config = await countryRolloutService.getCountryConfig(normalizedCode);

    if (!config) {
      return res.json({
        countryCode: normalizedCode,
        available: false,
        businessTypes: [],
        message: "This region is not configured.",
      });
    }

    const enabledTypes = config.enabledBusinessTypes;
    
    // If no specific business types are enabled, return empty list
    if (!enabledTypes || enabledTypes.length === 0) {
      return res.json({
        countryCode: normalizedCode,
        countryName: config.countryName,
        available: true,
        businessTypes: [],
        message: "No business types are currently enabled for this region.",
      });
    }

    // Filter to only enabled business types
    const filteredTypes = ALL_BUSINESS_TYPES.filter(
      bt => enabledTypes.includes(bt.value)
    );

    res.json({
      countryCode: normalizedCode,
      countryName: config.countryName,
      available: true,
      businessTypes: filteredTypes,
    });
  } catch (error) {
    console.error("[catalog] Error fetching business types by region:", error);
    res.status(500).json({ error: "Failed to fetch business types" });
  }
});

export default router;
