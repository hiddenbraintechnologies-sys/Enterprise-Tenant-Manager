import { Router, Request, Response } from "express";
import { featureRegistryService } from "../services/feature-registry";
import { insertFeatureRegistrySchema, updateFeatureRegistrySchema, insertFeatureFlagOverrideSchema } from "@shared/schema";
import { z } from "zod";

const router = Router();

// Feature Registry CRUD
router.get("/", async (req: Request, res: Response) => {
  try {
    const features = await featureRegistryService.list();
    res.json(features);
  } catch (error: any) {
    console.error("Error fetching features:", error.message);
    res.status(500).json({ error: "Failed to fetch features" });
  }
});

router.get("/enabled", async (req: Request, res: Response) => {
  try {
    const features = await featureRegistryService.listEnabled();
    res.json(features);
  } catch (error: any) {
    console.error("Error fetching enabled features:", error.message);
    res.status(500).json({ error: "Failed to fetch features" });
  }
});

router.get("/scope/:scope", async (req: Request, res: Response) => {
  try {
    const scope = req.params.scope as "global" | "business" | "tenant";
    if (scope !== "global" && scope !== "business" && scope !== "tenant") {
      return res.status(400).json({ error: "Invalid scope. Must be 'global', 'business', or 'tenant'" });
    }
    const features = await featureRegistryService.listByScope(scope);
    res.json(features);
  } catch (error: any) {
    console.error("Error fetching features by scope:", error.message);
    res.status(500).json({ error: "Failed to fetch features" });
  }
});

router.get("/:id", async (req: Request, res: Response) => {
  try {
    const feature = await featureRegistryService.getById(req.params.id);
    if (!feature) {
      return res.status(404).json({ error: "Feature not found" });
    }
    res.json(feature);
  } catch (error: any) {
    console.error("Error fetching feature:", error.message);
    res.status(500).json({ error: "Failed to fetch feature" });
  }
});

router.post("/", async (req: Request, res: Response) => {
  try {
    const parsed = insertFeatureRegistrySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ 
        error: "Validation failed", 
        details: parsed.error.flatten() 
      });
    }

    const existing = await featureRegistryService.getByCode(parsed.data.code);
    if (existing) {
      return res.status(409).json({ error: "Feature with this code already exists" });
    }

    const feature = await featureRegistryService.create(parsed.data);
    res.status(201).json(feature);
  } catch (error: any) {
    console.error("Error creating feature:", error.message);
    res.status(500).json({ error: "Failed to create feature" });
  }
});

router.patch("/:id", async (req: Request, res: Response) => {
  try {
    const existing = await featureRegistryService.getById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: "Feature not found" });
    }

    const parsed = updateFeatureRegistrySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ 
        error: "Validation failed", 
        details: parsed.error.flatten() 
      });
    }

    const updated = await featureRegistryService.update(req.params.id, parsed.data);
    res.json(updated);
  } catch (error: any) {
    console.error("Error updating feature:", error.message);
    res.status(500).json({ error: "Failed to update feature" });
  }
});

router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const existing = await featureRegistryService.getById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: "Feature not found" });
    }

    const deleted = await featureRegistryService.delete(req.params.id);
    if (deleted) {
      res.json({ success: true });
    } else {
      res.status(500).json({ error: "Failed to delete feature" });
    }
  } catch (error: any) {
    console.error("Error deleting feature:", error.message);
    res.status(500).json({ error: "Failed to delete feature" });
  }
});

router.patch("/:id/toggle", async (req: Request, res: Response) => {
  try {
    const existing = await featureRegistryService.getById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: "Feature not found" });
    }

    const updated = await featureRegistryService.setEnabled(req.params.id, !existing.enabled);
    res.json(updated);
  } catch (error: any) {
    console.error("Error toggling feature:", error.message);
    res.status(500).json({ error: "Failed to toggle feature" });
  }
});

// Feature Flag Overrides
router.get("/:id/overrides", async (req: Request, res: Response) => {
  try {
    const overrides = await featureRegistryService.getOverridesForFeature(req.params.id);
    res.json(overrides);
  } catch (error: any) {
    console.error("Error fetching overrides:", error.message);
    res.status(500).json({ error: "Failed to fetch overrides" });
  }
});

const createOverrideSchema = z.object({
  tenantId: z.string().optional().nullable(),
  businessType: z.string().optional().nullable(),
  enabled: z.boolean(),
  reason: z.string().optional().nullable(),
  createdBy: z.string().optional().nullable(),
});

router.post("/:id/overrides", async (req: Request, res: Response) => {
  try {
    const feature = await featureRegistryService.getById(req.params.id);
    if (!feature) {
      return res.status(404).json({ error: "Feature not found" });
    }

    const parsed = createOverrideSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ 
        error: "Validation failed", 
        details: parsed.error.flatten() 
      });
    }

    const override = await featureRegistryService.createOverride({
      featureId: req.params.id,
      ...parsed.data,
    });
    res.status(201).json(override);
  } catch (error: any) {
    console.error("Error creating override:", error.message);
    res.status(500).json({ error: "Failed to create override" });
  }
});

router.delete("/overrides/:overrideId", async (req: Request, res: Response) => {
  try {
    const deleted = await featureRegistryService.deleteOverride(req.params.overrideId);
    if (deleted) {
      res.json({ success: true });
    } else {
      res.status(404).json({ error: "Override not found" });
    }
  } catch (error: any) {
    console.error("Error deleting override:", error.message);
    res.status(500).json({ error: "Failed to delete override" });
  }
});

export default router;
