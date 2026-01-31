/**
 * Entitlements API Routes
 * 
 * Provides endpoints for checking add-on entitlements for the current tenant.
 */

import { Router } from "express";
import { getAllTenantEntitlements, getTenantAddonEntitlement, checkDependencyEntitlement } from "../../services/entitlement";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const tenantId = req.context?.tenant?.id || (req as any).tokenPayload?.tenantId;
    
    if (!tenantId) {
      return res.status(401).json({
        error: "UNAUTHORIZED",
        message: "Tenant context not found",
      });
    }
    
    const entitlements = await getAllTenantEntitlements(tenantId);
    
    res.json(entitlements);
  } catch (error) {
    console.error("[entitlements-api] Error fetching entitlements:", error);
    res.status(500).json({
      error: "INTERNAL_ERROR",
      message: "Failed to fetch entitlements",
    });
  }
});

router.get("/:addonCode", async (req, res) => {
  try {
    const tenantId = req.context?.tenant?.id || (req as any).tokenPayload?.tenantId;
    const { addonCode } = req.params;
    
    if (!tenantId) {
      return res.status(401).json({
        error: "UNAUTHORIZED",
        message: "Tenant context not found",
      });
    }
    
    if (!addonCode) {
      return res.status(400).json({
        error: "BAD_REQUEST",
        message: "Add-on code is required",
      });
    }
    
    const entitlement = await getTenantAddonEntitlement(tenantId, addonCode);
    const dependencies = await checkDependencyEntitlement(tenantId, addonCode, []);
    
    res.json({
      addonCode,
      ...entitlement,
      dependencies: {
        satisfied: dependencies.satisfied,
        missingDependency: dependencies.missingDependency,
        dependencyState: dependencies.dependencyState,
      },
    });
  } catch (error) {
    console.error("[entitlements-api] Error fetching addon entitlement:", error);
    res.status(500).json({
      error: "INTERNAL_ERROR",
      message: "Failed to fetch add-on entitlement",
    });
  }
});

export default router;
