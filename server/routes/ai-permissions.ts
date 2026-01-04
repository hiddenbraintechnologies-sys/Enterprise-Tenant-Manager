import { Router, Request, Response } from "express";
import { aiPermissionService } from "../services/ai-permission";
import { authenticateJWT, requireMinimumRole, requirePlatformAdmin } from "../core/auth-middleware";
import { tenantResolutionMiddleware, enforceTenantBoundary, tenantIsolationMiddleware } from "../core/tenant-isolation";
import { db } from "../db";
import { roles } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const router = Router();

const authMiddleware = [
  authenticateJWT({ required: true }),
  tenantResolutionMiddleware(),
  enforceTenantBoundary(),
  tenantIsolationMiddleware(),
];

const adminMiddleware = [
  ...authMiddleware,
  requireMinimumRole("admin"),
];

const updateRoleSettingSchema = z.object({
  isEnabled: z.boolean().optional(),
  usageLimit: z.number().nullable().optional(),
  resetWindow: z.enum(["daily", "weekly", "monthly"]).optional(),
});

router.get("/features", ...authMiddleware, async (req: Request, res: Response) => {
  try {
    const features = await aiPermissionService.getFeatures();
    res.json({ features });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/roles/:roleId/settings", ...authMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = req.context?.tenant?.id;
    const { roleId } = req.params;
    
    if (!tenantId) {
      return res.status(403).json({ error: "Tenant context required" });
    }

    const [role] = await db
      .select()
      .from(roles)
      .where(and(eq(roles.id, roleId), eq(roles.tenantId, tenantId)));

    if (!role) {
      return res.status(404).json({ error: "Role not found in this tenant" });
    }

    const settings = await aiPermissionService.getRoleSettings(tenantId, roleId);
    res.json({ settings });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/check/:featureCode", ...authMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = req.context?.tenant?.id;
    const { featureCode } = req.params;
    const roleId = req.query.roleId as string;
    
    if (!tenantId) {
      return res.status(403).json({ error: "Tenant context required" });
    }
    
    if (!roleId) {
      return res.status(400).json({ error: "roleId query parameter required" });
    }

    const [role] = await db
      .select()
      .from(roles)
      .where(and(eq(roles.id, roleId), eq(roles.tenantId, tenantId)));

    if (!role) {
      return res.status(404).json({ error: "Role not found in this tenant" });
    }
    
    const result = await aiPermissionService.checkPermission(tenantId, roleId, featureCode);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.patch(
  "/roles/:roleId/features/:featureId",
  ...adminMiddleware,
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.context?.tenant?.id;
      const { roleId, featureId } = req.params;
      
      if (!tenantId) {
        return res.status(403).json({ error: "Tenant context required" });
      }
      
      const parsed = updateRoleSettingSchema.safeParse(req.body);
      
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }

      const [role] = await db
        .select()
        .from(roles)
        .where(and(eq(roles.id, roleId), eq(roles.tenantId, tenantId)));

      if (!role) {
        return res.status(404).json({ error: "Role not found in this tenant" });
      }
      
      const updatedBy = req.context?.user?.id;
      await aiPermissionService.updateRoleSetting(
        tenantId,
        roleId,
        featureId,
        parsed.data,
        updatedBy
      );
      
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

router.post("/record-usage", ...authMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = req.context?.tenant?.id;
    const { roleId, featureCode } = req.body;
    
    if (!tenantId) {
      return res.status(403).json({ error: "Tenant context required" });
    }
    
    if (!roleId || !featureCode) {
      return res.status(400).json({ error: "roleId and featureCode required" });
    }

    const [role] = await db
      .select()
      .from(roles)
      .where(and(eq(roles.id, roleId), eq(roles.tenantId, tenantId)));

    if (!role) {
      return res.status(404).json({ error: "Role not found in this tenant" });
    }
    
    await aiPermissionService.recordUsage(tenantId, roleId, featureCode);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/reset-usage", ...adminMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = req.context?.tenant?.id;
    const { roleId, featureId } = req.body;
    
    if (!tenantId) {
      return res.status(403).json({ error: "Tenant context required" });
    }

    if (roleId) {
      const [role] = await db
        .select()
        .from(roles)
        .where(and(eq(roles.id, roleId), eq(roles.tenantId, tenantId)));

      if (!role) {
        return res.status(404).json({ error: "Role not found in this tenant" });
      }
    }
    
    await aiPermissionService.resetUsage(tenantId, roleId, featureId);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/usage-stats", ...authMiddleware, requireMinimumRole("manager"), async (req: Request, res: Response) => {
  try {
    const tenantId = req.context?.tenant?.id;
    const roleId = req.query.roleId as string | undefined;
    
    if (!tenantId) {
      return res.status(403).json({ error: "Tenant context required" });
    }

    if (roleId) {
      const [role] = await db
        .select()
        .from(roles)
        .where(and(eq(roles.id, roleId), eq(roles.tenantId, tenantId)));

      if (!role) {
        return res.status(404).json({ error: "Role not found in this tenant" });
      }
    }
    
    const stats = await aiPermissionService.getUsageStats(tenantId, roleId);
    res.json({ stats });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/roles", ...authMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = req.context?.tenant?.id;
    
    if (!tenantId) {
      return res.status(403).json({ error: "Tenant context required" });
    }

    const tenantRoles = await db
      .select()
      .from(roles)
      .where(eq(roles.tenantId, tenantId));

    res.json({ roles: tenantRoles });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post(
  "/seed-features",
  authenticateJWT({ required: true }),
  requirePlatformAdmin(),
  async (req: Request, res: Response) => {
    try {
      await aiPermissionService.seedDefaultFeatures();
      res.json({ success: true, message: "Default AI features seeded" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

export default router;
