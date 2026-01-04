import { Router, Request, Response } from "express";
import { businessVersionService } from "../services/business-version";
import { z } from "zod";

const router = Router();

const createVersionSchema = z.object({
  businessTypeId: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  modules: z.array(z.object({
    moduleId: z.string().min(1),
    isRequired: z.boolean().default(false),
    defaultEnabled: z.boolean().default(true),
    displayOrder: z.number().default(0),
  })).default([]),
  features: z.array(z.object({
    featureId: z.string().min(1),
    isRequired: z.boolean().default(false),
    defaultEnabled: z.boolean().default(true),
    displayOrder: z.number().default(0),
  })).default([]),
  createdBy: z.string().optional(),
  migrationNotes: z.string().optional(),
  isBackwardCompatible: z.boolean().default(true),
});

router.post("/", async (req: Request, res: Response) => {
  try {
    const input = createVersionSchema.parse(req.body);
    const version = await businessVersionService.createDraftVersion(input);
    res.status(201).json(version);
  } catch (error: any) {
    if (error.name === "ZodError") {
      return res.status(400).json({ error: "Invalid input", details: error.errors });
    }
    console.error("Error creating version:", error.message);
    res.status(500).json({ error: error.message || "Failed to create version" });
  }
});

router.post("/:versionId/publish", async (req: Request, res: Response) => {
  try {
    const { versionId } = req.params;
    const { publishedBy } = req.body;
    const version = await businessVersionService.publishVersion({ versionId, publishedBy });
    res.json(version);
  } catch (error: any) {
    console.error("Error publishing version:", error.message);
    res.status(500).json({ error: error.message || "Failed to publish version" });
  }
});

router.post("/rollback", async (req: Request, res: Response) => {
  try {
    const { businessTypeId, targetVersionNumber, performedBy, reason } = req.body;
    
    if (!businessTypeId || typeof targetVersionNumber !== "number") {
      return res.status(400).json({ error: "businessTypeId and targetVersionNumber are required" });
    }

    const version = await businessVersionService.rollbackToVersion({
      businessTypeId,
      targetVersionNumber,
      performedBy,
      reason,
    });
    res.json(version);
  } catch (error: any) {
    console.error("Error rolling back version:", error.message);
    res.status(500).json({ error: error.message || "Failed to rollback version" });
  }
});

router.get("/business-type/:businessTypeId", async (req: Request, res: Response) => {
  try {
    const { businessTypeId } = req.params;
    const versions = await businessVersionService.getVersions(businessTypeId);
    res.json(versions);
  } catch (error: any) {
    console.error("Error fetching versions:", error.message);
    res.status(500).json({ error: "Failed to fetch versions" });
  }
});

router.get("/:versionId", async (req: Request, res: Response) => {
  try {
    const { versionId } = req.params;
    const version = await businessVersionService.getVersionDetails(versionId);
    
    if (!version) {
      return res.status(404).json({ error: "Version not found" });
    }
    
    res.json(version);
  } catch (error: any) {
    console.error("Error fetching version details:", error.message);
    res.status(500).json({ error: "Failed to fetch version details" });
  }
});

router.get("/business-type/:businessTypeId/published", async (req: Request, res: Response) => {
  try {
    const { businessTypeId } = req.params;
    const version = await businessVersionService.getPublishedVersion(businessTypeId);
    
    if (!version) {
      return res.status(404).json({ error: "No published version found" });
    }
    
    res.json(version);
  } catch (error: any) {
    console.error("Error fetching published version:", error.message);
    res.status(500).json({ error: "Failed to fetch published version" });
  }
});

router.post("/migrate-from-legacy/:businessTypeId", async (req: Request, res: Response) => {
  try {
    const { businessTypeId } = req.params;
    const { createdBy } = req.body;
    const version = await businessVersionService.createVersionFromLegacy(businessTypeId, createdBy);
    res.status(201).json(version);
  } catch (error: any) {
    console.error("Error migrating from legacy:", error.message);
    res.status(500).json({ error: error.message || "Failed to migrate from legacy" });
  }
});

router.post("/tenant/:tenantId/migrate", async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const { targetVersionId, performedBy, reason } = req.body;

    if (!targetVersionId) {
      return res.status(400).json({ error: "targetVersionId is required" });
    }

    const result = await businessVersionService.migrateTenantToVersion({
      tenantId,
      targetVersionId,
      performedBy,
      reason,
    });
    res.json(result);
  } catch (error: any) {
    console.error("Error migrating tenant:", error.message);
    res.status(500).json({ error: error.message || "Failed to migrate tenant" });
  }
});

router.post("/tenant/:tenantId/unpin", async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const { performedBy } = req.body;
    const result = await businessVersionService.unpinTenant(tenantId, performedBy);
    res.json(result);
  } catch (error: any) {
    console.error("Error unpinning tenant:", error.message);
    res.status(500).json({ error: error.message || "Failed to unpin tenant" });
  }
});

router.get("/tenant/:tenantId/history", async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const history = await businessVersionService.getTenantVersionHistory(tenantId);
    res.json(history);
  } catch (error: any) {
    console.error("Error fetching tenant history:", error.message);
    res.status(500).json({ error: "Failed to fetch tenant history" });
  }
});

export default router;
