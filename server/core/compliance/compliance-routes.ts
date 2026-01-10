import { Router, Request, Response, NextFunction } from "express";
import { complianceService } from "./compliance-service";
import { insertCompliancePackSchema, insertComplianceChecklistItemSchema, insertTenantComplianceSettingsSchema } from "@shared/schema";
import { z } from "zod";
import { authenticateJWT, requireMinimumRole } from "../auth-middleware";
import { tenantIsolationMiddleware } from "../tenant-isolation";

const router = Router();

const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) => 
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

const updatePackSchema = insertCompliancePackSchema.partial();
const updateItemSchema = insertComplianceChecklistItemSchema.partial().omit({ packId: true });
const updateTenantSettingsSchema = insertTenantComplianceSettingsSchema.partial().omit({ tenantId: true });
const updateProgressSchema = z.object({
  status: z.enum(["not_started", "in_progress", "completed", "not_applicable", "overdue"]).optional(),
  notes: z.string().optional(),
  evidenceUrl: z.string().optional(),
  evidenceDescription: z.string().optional(),
  assignedTo: z.string().optional(),
});

router.get("/packs", asyncHandler(async (req: Request, res: Response) => {
  const { regulation, country, businessType } = req.query;
  const packs = await complianceService.getAvailablePacks(
    regulation as string | undefined,
    country as string | undefined,
    businessType as string | undefined
  );
  res.json(packs);
}));

router.get("/packs/:packId", asyncHandler(async (req: Request, res: Response) => {
  const pack = await complianceService.getPackById(req.params.packId);
  if (!pack) {
    res.status(404).json({ error: "Pack not found" });
    return;
  }
  res.json(pack);
}));

router.post("/packs", 
  authenticateJWT({ required: true }),
  requireMinimumRole("admin"),
  asyncHandler(async (req: Request, res: Response) => {
    const data = insertCompliancePackSchema.parse(req.body);
    const pack = await complianceService.createPack(data);
    if (!pack) {
      res.status(500).json({ error: "Failed to create pack" });
      return;
    }
    res.status(201).json(pack);
  })
);

router.patch("/packs/:packId",
  authenticateJWT({ required: true }),
  requireMinimumRole("admin"),
  asyncHandler(async (req: Request, res: Response) => {
    const validated = updatePackSchema.parse(req.body);
    const pack = await complianceService.updatePack(req.params.packId, validated);
    if (!pack) {
      res.status(404).json({ error: "Pack not found" });
      return;
    }
    res.json(pack);
  })
);

router.delete("/packs/:packId",
  authenticateJWT({ required: true }),
  requireMinimumRole("admin"),
  asyncHandler(async (req: Request, res: Response) => {
    await complianceService.deletePack(req.params.packId);
    res.status(204).send();
  })
);

router.get("/packs/:packId/items", asyncHandler(async (req: Request, res: Response) => {
  const items = await complianceService.getChecklistItems(req.params.packId);
  res.json(items);
}));

router.post("/packs/:packId/items",
  authenticateJWT({ required: true }),
  requireMinimumRole("admin"),
  asyncHandler(async (req: Request, res: Response) => {
    const data = insertComplianceChecklistItemSchema.parse({
      ...req.body,
      packId: req.params.packId,
    });
    const item = await complianceService.createChecklistItem(data);
    if (!item) {
      res.status(500).json({ error: "Failed to create item" });
      return;
    }
    res.status(201).json(item);
  })
);

router.patch("/items/:itemId",
  authenticateJWT({ required: true }),
  requireMinimumRole("admin"),
  asyncHandler(async (req: Request, res: Response) => {
    const validated = updateItemSchema.parse(req.body);
    const item = await complianceService.updateChecklistItem(req.params.itemId, validated);
    if (!item) {
      res.status(404).json({ error: "Item not found" });
      return;
    }
    res.json(item);
  })
);

router.delete("/items/:itemId",
  authenticateJWT({ required: true }),
  requireMinimumRole("admin"),
  asyncHandler(async (req: Request, res: Response) => {
    await complianceService.deleteChecklistItem(req.params.itemId);
    res.status(204).send();
  })
);

router.get("/tenant/packs",
  authenticateJWT({ required: true }),
  tenantIsolationMiddleware(),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = (req as any).context?.tenant?.id;
    if (!tenantId) {
      res.status(400).json({ error: "Tenant context required" });
      return;
    }
    const packs = await complianceService.getTenantPacks(String(tenantId));
    res.json(packs);
  })
);

router.post("/tenant/packs/:packId",
  authenticateJWT({ required: true }),
  tenantIsolationMiddleware(),
  requireMinimumRole("admin"),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = (req as any).context?.tenant?.id;
    if (!tenantId) {
      res.status(400).json({ error: "Tenant context required" });
      return;
    }
    const userId = (req as any).user?.id;
    const { dueDate } = req.body;
    const assignment = await complianceService.assignPackToTenant(
      String(tenantId),
      req.params.packId,
      userId,
      dueDate ? new Date(dueDate) : undefined
    );
    if (!assignment) {
      res.status(500).json({ error: "Failed to assign pack" });
      return;
    }
    res.status(201).json(assignment);
  })
);

router.delete("/tenant/packs/:packId",
  authenticateJWT({ required: true }),
  tenantIsolationMiddleware(),
  requireMinimumRole("admin"),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = (req as any).context?.tenant?.id;
    if (!tenantId) {
      res.status(400).json({ error: "Tenant context required" });
      return;
    }
    await complianceService.unassignPackFromTenant(String(tenantId), req.params.packId);
    res.status(204).send();
  })
);

router.get("/tenant/packs/:packId/progress",
  authenticateJWT({ required: true }),
  tenantIsolationMiddleware(),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = (req as any).context?.tenant?.id;
    if (!tenantId) {
      res.status(400).json({ error: "Tenant context required" });
      return;
    }
    const progress = await complianceService.getTenantProgress(String(tenantId), req.params.packId);
    res.json(progress);
  })
);

router.patch("/tenant/packs/:packId/items/:itemId",
  authenticateJWT({ required: true }),
  tenantIsolationMiddleware(),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = (req as any).context?.tenant?.id;
    if (!tenantId) {
      res.status(400).json({ error: "Tenant context required" });
      return;
    }
    const userId = (req as any).user?.id || "system";
    const validated = updateProgressSchema.parse(req.body);
    
    const progress = await complianceService.updateItemProgress(
      String(tenantId),
      req.params.packId,
      req.params.itemId,
      validated,
      userId
    );
    
    if (!progress) {
      res.status(404).json({ error: "Progress record not found" });
      return;
    }
    res.json(progress);
  })
);

router.get("/tenant/summary",
  authenticateJWT({ required: true }),
  tenantIsolationMiddleware(),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = (req as any).context?.tenant?.id;
    if (!tenantId) {
      res.status(400).json({ error: "Tenant context required" });
      return;
    }
    const summary = await complianceService.getComplianceSummary(String(tenantId));
    res.json(summary);
  })
);

router.post("/seed-defaults",
  authenticateJWT({ required: true }),
  requireMinimumRole("admin"),
  asyncHandler(async (_req: Request, res: Response) => {
    await complianceService.seedDefaultPacks();
    res.json({ message: "Default compliance packs seeded" });
  })
);

router.get("/configs", asyncHandler(async (_req: Request, res: Response) => {
  const configs = await complianceService.getAllComplianceConfigs();
  res.json(configs);
}));

router.get("/configs/:regulation", asyncHandler(async (req: Request, res: Response) => {
  const regulation = req.params.regulation as "gdpr" | "pdpa_sg" | "pdpa_my" | "dpdp" | "uae_dpl";
  const config = await complianceService.getComplianceConfig(regulation);
  if (!config) {
    res.status(404).json({ error: "Config not found" });
    return;
  }
  res.json(config);
}));

router.get("/tenant/settings",
  authenticateJWT({ required: true }),
  tenantIsolationMiddleware(),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = (req as any).context?.tenant?.id;
    if (!tenantId) {
      res.status(400).json({ error: "Tenant context required" });
      return;
    }
    const settings = await complianceService.getTenantComplianceSettings(String(tenantId));
    res.json(settings || {});
  })
);

router.put("/tenant/settings",
  authenticateJWT({ required: true }),
  tenantIsolationMiddleware(),
  requireMinimumRole("admin"),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = (req as any).context?.tenant?.id;
    if (!tenantId) {
      res.status(400).json({ error: "Tenant context required" });
      return;
    }
    const validated = updateTenantSettingsSchema.parse(req.body);
    const success = await complianceService.updateTenantComplianceSettings(String(tenantId), validated);
    if (!success) {
      res.status(500).json({ error: "Failed to update settings" });
      return;
    }
    res.json({ message: "Settings updated" });
  })
);

export default router;
