import { Router, Request, Response } from "express";
import { businessRegistryService } from "../services/business-registry";
import { insertBusinessTypeRegistrySchema } from "@shared/schema";
import { z } from "zod";

const router = Router();

router.get("/", async (req: Request, res: Response) => {
  try {
    const businessTypes = await businessRegistryService.list();
    res.json(businessTypes);
  } catch (error: any) {
    console.error("Error fetching business types:", error.message);
    res.status(500).json({ error: "Failed to fetch business types" });
  }
});

router.get("/enabled", async (req: Request, res: Response) => {
  try {
    const businessTypes = await businessRegistryService.listEnabled();
    res.json(businessTypes);
  } catch (error: any) {
    console.error("Error fetching enabled business types:", error.message);
    res.status(500).json({ error: "Failed to fetch business types" });
  }
});

router.get("/:id", async (req: Request, res: Response) => {
  try {
    const businessType = await businessRegistryService.getById(req.params.id);
    if (!businessType) {
      return res.status(404).json({ error: "Business type not found" });
    }
    res.json(businessType);
  } catch (error: any) {
    console.error("Error fetching business type:", error.message);
    res.status(500).json({ error: "Failed to fetch business type" });
  }
});

router.post("/", async (req: Request, res: Response) => {
  try {
    const parsed = insertBusinessTypeRegistrySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ 
        error: "Validation failed", 
        details: parsed.error.flatten() 
      });
    }

    const existing = await businessRegistryService.getByCode(parsed.data.code);
    if (existing) {
      return res.status(409).json({ error: "Business type with this code already exists" });
    }

    const businessType = await businessRegistryService.create(parsed.data);
    res.status(201).json(businessType);
  } catch (error: any) {
    console.error("Error creating business type:", error.message);
    res.status(500).json({ error: "Failed to create business type" });
  }
});

const updateBusinessTypeSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  enabled: z.boolean().optional(),
  defaultModules: z.array(z.string()).optional(),
  defaultFeatures: z.array(z.string()).optional(),
  onboardingFlowId: z.string().optional().nullable(),
  compliancePacks: z.array(z.string()).optional(),
  displayOrder: z.number().int().min(0).optional(),
  icon: z.string().optional().nullable(),
});

router.patch("/:id", async (req: Request, res: Response) => {
  try {
    const existing = await businessRegistryService.getById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: "Business type not found" });
    }

    const parsed = updateBusinessTypeSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ 
        error: "Validation failed", 
        details: parsed.error.flatten() 
      });
    }

    const updated = await businessRegistryService.update(req.params.id, parsed.data);
    res.json(updated);
  } catch (error: any) {
    console.error("Error updating business type:", error.message);
    res.status(500).json({ error: "Failed to update business type" });
  }
});

router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const existing = await businessRegistryService.getById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: "Business type not found" });
    }

    const deleted = await businessRegistryService.delete(req.params.id);
    if (deleted) {
      res.json({ success: true });
    } else {
      res.status(500).json({ error: "Failed to delete business type" });
    }
  } catch (error: any) {
    console.error("Error deleting business type:", error.message);
    res.status(500).json({ error: "Failed to delete business type" });
  }
});

router.patch("/:id/toggle", async (req: Request, res: Response) => {
  try {
    const existing = await businessRegistryService.getById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: "Business type not found" });
    }

    const updated = await businessRegistryService.setEnabled(req.params.id, !existing.enabled);
    res.json(updated);
  } catch (error: any) {
    console.error("Error toggling business type:", error.message);
    res.status(500).json({ error: "Failed to toggle business type" });
  }
});

export default router;
