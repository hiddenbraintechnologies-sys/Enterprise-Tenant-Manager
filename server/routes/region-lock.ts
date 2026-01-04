import { Router, Request, Response } from "express";
import { regionLockService } from "../services/region-lock";
import { insertPlatformRegionConfigSchema } from "@shared/schema";
import { requirePlatformAdmin, authenticateJWT } from "../core";
import { z } from "zod";

const router = Router();

// Middleware chain for SuperAdmin-protected routes
const adminAuth = [authenticateJWT({ required: true }), requirePlatformAdmin()];

/**
 * Get all region configurations
 * GET /api/platform/regions
 */
router.get("/", ...adminAuth, async (req: Request, res: Response) => {
  try {
    const regions = await regionLockService.getAllRegions();
    res.json({ regions });
  } catch (error) {
    console.error("Failed to get regions:", error);
    res.status(500).json({ error: "Failed to retrieve regions" });
  }
});

/**
 * Get enabled regions only (public endpoint for registration form)
 * GET /api/platform/regions/enabled
 */
router.get("/enabled", async (req: Request, res: Response) => {
  try {
    const regions = await regionLockService.getEnabledRegions();
    res.json({ 
      regions: regions.map(r => ({
        countryCode: r.countryCode,
        countryName: r.countryName,
        region: r.region,
        defaultCurrency: r.defaultCurrency,
        defaultTimezone: r.defaultTimezone,
        betaAccessOnly: r.betaAccessOnly,
      }))
    });
  } catch (error) {
    console.error("Failed to get enabled regions:", error);
    res.status(500).json({ error: "Failed to retrieve regions" });
  }
});

/**
 * Get single region configuration
 * GET /api/platform/regions/:countryCode
 */
router.get("/:countryCode", ...adminAuth, async (req: Request, res: Response) => {
  try {
    const { countryCode } = req.params;
    const region = await regionLockService.getRegionConfig(countryCode);
    
    if (!region) {
      return res.status(404).json({ error: "Region not found" });
    }
    
    res.json({ region });
  } catch (error) {
    console.error("Failed to get region:", error);
    res.status(500).json({ error: "Failed to retrieve region" });
  }
});

/**
 * Create or update region configuration
 * PUT /api/platform/regions/:countryCode
 */
router.put("/:countryCode", ...adminAuth, async (req: Request, res: Response) => {
  try {
    const { countryCode } = req.params;
    const adminId = req.platformAdminContext?.platformAdmin?.id || "system";
    
    const data = insertPlatformRegionConfigSchema.parse({
      ...req.body,
      countryCode: countryCode.toUpperCase(),
    });
    
    const region = await regionLockService.upsertRegion(data, adminId);
    res.json({ region, message: "Region configuration saved" });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid region data", details: error.errors });
    }
    console.error("Failed to save region:", error);
    res.status(500).json({ error: "Failed to save region configuration" });
  }
});

/**
 * Update region status
 * PATCH /api/platform/regions/:countryCode/status
 */
router.patch("/:countryCode/status", ...adminAuth, async (req: Request, res: Response) => {
  try {
    const { countryCode } = req.params;
    const { status, maintenanceMessage } = req.body;
    const adminId = req.platformAdminContext?.platformAdmin?.id || "system";
    
    const validStatuses = ["enabled", "disabled", "maintenance", "coming_soon"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        error: "Invalid status", 
        validStatuses 
      });
    }
    
    const region = await regionLockService.updateRegionStatus(
      countryCode,
      status,
      adminId,
      maintenanceMessage
    );
    
    if (!region) {
      return res.status(404).json({ error: "Region not found" });
    }
    
    res.json({ region, message: `Region status updated to ${status}` });
  } catch (error) {
    console.error("Failed to update region status:", error);
    res.status(500).json({ error: "Failed to update region status" });
  }
});

/**
 * Toggle region feature
 * PATCH /api/platform/regions/:countryCode/features/:feature
 */
router.patch("/:countryCode/features/:feature", ...adminAuth, async (req: Request, res: Response) => {
  try {
    const { countryCode, feature } = req.params;
    const { enabled } = req.body;
    const adminId = req.platformAdminContext?.platformAdmin?.id || "system";
    
    const validFeatures = ["registration", "billing", "compliance", "sms", "whatsapp", "email"];
    if (!validFeatures.includes(feature)) {
      return res.status(400).json({ 
        error: "Invalid feature", 
        validFeatures 
      });
    }
    
    if (typeof enabled !== "boolean") {
      return res.status(400).json({ error: "enabled must be a boolean" });
    }
    
    const region = await regionLockService.toggleRegionFeature(
      countryCode,
      feature as any,
      enabled,
      adminId
    );
    
    if (!region) {
      return res.status(404).json({ error: "Region not found" });
    }
    
    res.json({ 
      region, 
      message: `${feature} ${enabled ? "enabled" : "disabled"} for ${countryCode}` 
    });
  } catch (error) {
    console.error("Failed to toggle region feature:", error);
    res.status(500).json({ error: "Failed to toggle region feature" });
  }
});

/**
 * Check registration eligibility
 * POST /api/platform/regions/check/registration
 */
router.post("/check/registration", async (req: Request, res: Response) => {
  try {
    const { countryCode, businessType, betaCode } = req.body;
    
    if (!countryCode) {
      return res.status(400).json({ error: "countryCode is required" });
    }
    
    const result = await regionLockService.canRegister({
      countryCode,
      action: "registration",
      businessType,
      betaCode,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });
    
    res.json(result);
  } catch (error) {
    console.error("Failed to check registration:", error);
    res.status(500).json({ error: "Failed to check registration eligibility" });
  }
});

/**
 * Check billing eligibility
 * POST /api/platform/regions/check/billing
 */
router.post("/check/billing", async (req: Request, res: Response) => {
  try {
    const { countryCode, tenantId, subscriptionTier } = req.body;
    
    if (!countryCode) {
      return res.status(400).json({ error: "countryCode is required" });
    }
    
    const result = await regionLockService.canBill({
      countryCode,
      action: "billing",
      tenantId,
      subscriptionTier,
    });
    
    res.json(result);
  } catch (error) {
    console.error("Failed to check billing:", error);
    res.status(500).json({ error: "Failed to check billing eligibility" });
  }
});

/**
 * Get compliance packs for a region
 * GET /api/platform/regions/:countryCode/compliance-packs
 */
router.get("/:countryCode/compliance-packs", async (req: Request, res: Response) => {
  try {
    const { countryCode } = req.params;
    const packs = await regionLockService.getRegionCompliancePacks(countryCode);
    res.json({ compliancePacks: packs });
  } catch (error) {
    console.error("Failed to get compliance packs:", error);
    res.status(500).json({ error: "Failed to retrieve compliance packs" });
  }
});

/**
 * Get region access logs (audit trail)
 * GET /api/platform/regions/logs
 */
router.get("/audit/logs", ...adminAuth, async (req: Request, res: Response) => {
  try {
    const { countryCode, action, limit } = req.query;
    
    const logs = await regionLockService.getAccessLogs(
      countryCode as string | undefined,
      action as string | undefined,
      limit ? parseInt(limit as string) : 100
    );
    
    res.json({ logs });
  } catch (error) {
    console.error("Failed to get access logs:", error);
    res.status(500).json({ error: "Failed to retrieve access logs" });
  }
});

/**
 * Seed default regions (SuperAdmin only, one-time setup)
 * POST /api/platform/regions/seed
 */
router.post("/seed", ...adminAuth, async (req: Request, res: Response) => {
  try {
    await regionLockService.seedDefaultRegions();
    const regions = await regionLockService.getAllRegions();
    res.json({ message: "Default regions seeded", regions });
  } catch (error) {
    console.error("Failed to seed regions:", error);
    res.status(500).json({ error: "Failed to seed default regions" });
  }
});

export default router;
