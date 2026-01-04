import { Router, Request, Response } from "express";
import { featureRegistryService } from "../services/feature-registry";

const router = Router();

// Runtime feature flag evaluation - for tenant apps to check if features are enabled
// This endpoint is meant to be called by authenticated tenant users

router.get("/check/:featureCode", async (req: Request, res: Response) => {
  try {
    const { featureCode } = req.params;
    const tenantId = req.headers["x-tenant-id"] as string;
    const businessType = req.query.businessType as string | undefined;

    const enabled = await featureRegistryService.isFeatureEnabled(featureCode, {
      tenantId,
      businessType,
    });

    res.json({ 
      feature: featureCode, 
      enabled,
      evaluatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Error checking feature flag:", error.message);
    res.status(500).json({ error: "Failed to check feature flag" });
  }
});

// Get all feature flags for the current context
router.get("/", async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers["x-tenant-id"] as string;
    const businessType = req.query.businessType as string | undefined;

    const flags = await featureRegistryService.getFeatureFlags({
      tenantId,
      businessType,
    });

    res.json({ 
      flags,
      evaluatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Error fetching feature flags:", error.message);
    res.status(500).json({ error: "Failed to fetch feature flags" });
  }
});

export default router;
