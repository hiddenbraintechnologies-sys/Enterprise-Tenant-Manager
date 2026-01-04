import { Router, Request, Response } from "express";
import { featureResolutionService } from "../services/feature-resolution";
import { cacheService } from "../services/cache";

const router = Router();

// Runtime feature resolution - returns full feature matrix for a tenant
// Uses cached resolution with Redis + in-memory fallback
router.get("/matrix", async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers["x-tenant-id"] as string | undefined;

    if (!tenantId) {
      return res.status(400).json({ 
        error: "Missing X-Tenant-ID header. Tenant context is required." 
      });
    }

    const matrix = await featureResolutionService.resolveTenantFeatures(tenantId);
    
    if (!matrix) {
      return res.status(404).json({ error: "Tenant not found" });
    }

    res.json(matrix);
  } catch (error: any) {
    console.error("Error resolving feature matrix:", error.message);
    res.status(500).json({ error: "Failed to resolve feature matrix" });
  }
});

// Check if a specific feature is enabled (cached)
router.get("/check/:featureCode", async (req: Request, res: Response) => {
  try {
    const { featureCode } = req.params;
    const tenantId = req.headers["x-tenant-id"] as string | undefined;

    if (!tenantId) {
      return res.status(400).json({ 
        error: "Missing X-Tenant-ID header. Tenant context is required." 
      });
    }

    const enabled = await featureResolutionService.isFeatureEnabledCached(tenantId, featureCode);

    res.json({ 
      feature: featureCode, 
      enabled,
      tenantId,
      evaluatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Error checking feature:", error.message);
    res.status(500).json({ error: "Failed to check feature" });
  }
});

// Check if a specific module is enabled (cached)
router.get("/module/:moduleCode", async (req: Request, res: Response) => {
  try {
    const { moduleCode } = req.params;
    const tenantId = req.headers["x-tenant-id"] as string | undefined;

    if (!tenantId) {
      return res.status(400).json({ 
        error: "Missing X-Tenant-ID header. Tenant context is required." 
      });
    }

    const enabled = await featureResolutionService.isModuleEnabledCached(tenantId, moduleCode);

    res.json({ 
      module: moduleCode, 
      enabled,
      tenantId,
      evaluatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Error checking module:", error.message);
    res.status(500).json({ error: "Failed to check module" });
  }
});

// Invalidate cache for a tenant (admin use)
router.post("/invalidate/:tenantId", async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    await featureResolutionService.invalidateTenantCache(tenantId);
    res.json({ success: true, message: `Cache invalidated for tenant ${tenantId}` });
  } catch (error: any) {
    console.error("Error invalidating cache:", error.message);
    res.status(500).json({ error: "Failed to invalidate cache" });
  }
});

// Cache health check
router.get("/cache/health", async (req: Request, res: Response) => {
  try {
    const health = await cacheService.healthCheck();
    res.json(health);
  } catch (error: any) {
    console.error("Error checking cache health:", error.message);
    res.status(500).json({ error: "Failed to check cache health" });
  }
});

export default router;
