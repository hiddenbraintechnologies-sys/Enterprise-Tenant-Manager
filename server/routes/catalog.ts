import { Router, Request, Response } from "express";
import { countryRolloutService } from "../services/country-rollout";
import { getBusinessTypeOptions } from "@shared/business-types";

const router = Router();

// Use shared business type registry - single source of truth
const ALL_BUSINESS_TYPES = getBusinessTypeOptions();

// GET /api/catalog/business-types?country=IN
// Returns only allowed business types for the given country
router.get("/business-types", async (req: Request, res: Response) => {
  try {
    const { country } = req.query;
    
    if (!country || typeof country !== "string") {
      return res.status(400).json({ 
        error: "Country code is required",
        code: "COUNTRY_REQUIRED" 
      });
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

export default router;
