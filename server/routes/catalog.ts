import { Router, Request, Response } from "express";
import { countryRolloutService } from "../services/country-rollout";

const router = Router();

// Business Type Registry - matches shared/business-types.ts
// ❌ Never change codes after launch | ✅ Labels can be renamed
const ALL_BUSINESS_TYPES = [
  // Phase-1 India
  { value: "pg_hostel", label: "PG / Hostel", category: "hospitality", phase: "phase1" },
  // Phase-1 Multi-country
  { value: "consulting", label: "Consulting / Professional Services", category: "professional", phase: "phase1" },
  { value: "software_services", label: "Software / IT Services", category: "technology", phase: "phase1" },
  // Phase-2
  { value: "clinic_healthcare", label: "Clinic / Healthcare", category: "healthcare", phase: "phase2" },
  // Later phases
  { value: "legal", label: "Legal & Compliance", category: "professional", phase: "later" },
  { value: "digital_agency", label: "Digital Marketing Agency", category: "technology", phase: "later" },
  { value: "retail_store", label: "Retail Store / POS", category: "retail", phase: "later" },
  { value: "salon_spa", label: "Salon / Spa", category: "services", phase: "later" },
  { value: "furniture_manufacturing", label: "Furniture Manufacturing", category: "manufacturing", phase: "later" },
  { value: "logistics_fleet", label: "Logistics & Fleet", category: "logistics", phase: "later" },
  { value: "education_institute", label: "Coaching / Training Institute", category: "education", phase: "later" },
  { value: "tourism", label: "Tourism / Travel Agency", category: "travel", phase: "later" },
  { value: "real_estate", label: "Real Estate Agency", category: "property", phase: "later" },
];

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
    
    // If no specific business types are enabled, return all
    if (!enabledTypes || enabledTypes.length === 0) {
      return res.json({
        countryCode,
        rolloutStatus: config.rolloutStatus,
        countryName: config.countryName,
        businessTypes: ALL_BUSINESS_TYPES,
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
