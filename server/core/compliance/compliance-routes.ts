import { Router, Request, Response, NextFunction } from "express";
import { complianceService } from "./compliance-service";
import { insertCompliancePackSchema, insertComplianceChecklistItemSchema } from "@shared/schema";
import { z } from "zod";

const router = Router();

const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) => 
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

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

router.post("/packs", asyncHandler(async (req: Request, res: Response) => {
  const data = insertCompliancePackSchema.parse(req.body);
  const pack = await complianceService.createPack(data);
  if (!pack) {
    res.status(500).json({ error: "Failed to create pack" });
    return;
  }
  res.status(201).json(pack);
}));

router.patch("/packs/:packId", asyncHandler(async (req: Request, res: Response) => {
  const pack = await complianceService.updatePack(req.params.packId, req.body);
  if (!pack) {
    res.status(404).json({ error: "Pack not found" });
    return;
  }
  res.json(pack);
}));

router.delete("/packs/:packId", asyncHandler(async (req: Request, res: Response) => {
  await complianceService.deletePack(req.params.packId);
  res.status(204).send();
}));

router.get("/packs/:packId/items", asyncHandler(async (req: Request, res: Response) => {
  const items = await complianceService.getChecklistItems(req.params.packId);
  res.json(items);
}));

router.post("/packs/:packId/items", asyncHandler(async (req: Request, res: Response) => {
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
}));

router.patch("/items/:itemId", asyncHandler(async (req: Request, res: Response) => {
  const item = await complianceService.updateChecklistItem(req.params.itemId, req.body);
  if (!item) {
    res.status(404).json({ error: "Item not found" });
    return;
  }
  res.json(item);
}));

router.delete("/items/:itemId", asyncHandler(async (req: Request, res: Response) => {
  await complianceService.deleteChecklistItem(req.params.itemId);
  res.status(204).send();
}));

router.get("/tenant/:tenantId/packs", asyncHandler(async (req: Request, res: Response) => {
  const packs = await complianceService.getTenantPacks(req.params.tenantId);
  res.json(packs);
}));

router.post("/tenant/:tenantId/packs/:packId", asyncHandler(async (req: Request, res: Response) => {
  const { assignedBy, dueDate } = req.body;
  const assignment = await complianceService.assignPackToTenant(
    req.params.tenantId,
    req.params.packId,
    assignedBy,
    dueDate ? new Date(dueDate) : undefined
  );
  if (!assignment) {
    res.status(500).json({ error: "Failed to assign pack" });
    return;
  }
  res.status(201).json(assignment);
}));

router.delete("/tenant/:tenantId/packs/:packId", asyncHandler(async (req: Request, res: Response) => {
  await complianceService.unassignPackFromTenant(req.params.tenantId, req.params.packId);
  res.status(204).send();
}));

router.get("/tenant/:tenantId/packs/:packId/progress", asyncHandler(async (req: Request, res: Response) => {
  const progress = await complianceService.getTenantProgress(req.params.tenantId, req.params.packId);
  res.json(progress);
}));

router.patch("/tenant/:tenantId/packs/:packId/items/:itemId", asyncHandler(async (req: Request, res: Response) => {
  const userId = req.body.userId || "system";
  const { status, notes, evidenceUrl, evidenceDescription, assignedTo } = req.body;
  
  const progress = await complianceService.updateItemProgress(
    req.params.tenantId,
    req.params.packId,
    req.params.itemId,
    { status, notes, evidenceUrl, evidenceDescription, assignedTo },
    userId
  );
  
  if (!progress) {
    res.status(404).json({ error: "Progress record not found" });
    return;
  }
  res.json(progress);
}));

router.get("/tenant/:tenantId/summary", asyncHandler(async (req: Request, res: Response) => {
  const summary = await complianceService.getComplianceSummary(req.params.tenantId);
  res.json(summary);
}));

router.post("/seed-defaults", asyncHandler(async (_req: Request, res: Response) => {
  await complianceService.seedDefaultPacks();
  res.json({ message: "Default compliance packs seeded" });
}));

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

router.get("/tenant/:tenantId/settings", asyncHandler(async (req: Request, res: Response) => {
  const settings = await complianceService.getTenantComplianceSettings(req.params.tenantId);
  res.json(settings || {});
}));

router.put("/tenant/:tenantId/settings", asyncHandler(async (req: Request, res: Response) => {
  const success = await complianceService.updateTenantComplianceSettings(req.params.tenantId, req.body);
  if (!success) {
    res.status(500).json({ error: "Failed to update settings" });
    return;
  }
  res.json({ message: "Settings updated" });
}));

export default router;
