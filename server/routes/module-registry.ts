import { Router, Request, Response } from "express";
import { moduleRegistryService } from "../services/module-registry";
import { insertModuleRegistrySchema } from "@shared/schema";
import { z } from "zod";

const router = Router();

router.get("/", async (req: Request, res: Response) => {
  try {
    const modules = await moduleRegistryService.list();
    res.json(modules);
  } catch (error: any) {
    console.error("Error fetching modules:", error.message);
    res.status(500).json({ error: "Failed to fetch modules" });
  }
});

router.get("/enabled", async (req: Request, res: Response) => {
  try {
    const modules = await moduleRegistryService.listEnabled();
    res.json(modules);
  } catch (error: any) {
    console.error("Error fetching enabled modules:", error.message);
    res.status(500).json({ error: "Failed to fetch modules" });
  }
});

router.get("/category/:category", async (req: Request, res: Response) => {
  try {
    const category = req.params.category as "core" | "optional";
    if (category !== "core" && category !== "optional") {
      return res.status(400).json({ error: "Invalid category. Must be 'core' or 'optional'" });
    }
    const modules = await moduleRegistryService.listByCategory(category);
    res.json(modules);
  } catch (error: any) {
    console.error("Error fetching modules by category:", error.message);
    res.status(500).json({ error: "Failed to fetch modules" });
  }
});

router.get("/:id", async (req: Request, res: Response) => {
  try {
    const module = await moduleRegistryService.getById(req.params.id);
    if (!module) {
      return res.status(404).json({ error: "Module not found" });
    }
    res.json(module);
  } catch (error: any) {
    console.error("Error fetching module:", error.message);
    res.status(500).json({ error: "Failed to fetch module" });
  }
});

router.post("/", async (req: Request, res: Response) => {
  try {
    const parsed = insertModuleRegistrySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ 
        error: "Validation failed", 
        details: parsed.error.flatten() 
      });
    }

    const existing = await moduleRegistryService.getByCode(parsed.data.code);
    if (existing) {
      return res.status(409).json({ error: "Module with this code already exists" });
    }

    const module = await moduleRegistryService.create(parsed.data);
    res.status(201).json(module);
  } catch (error: any) {
    console.error("Error creating module:", error.message);
    res.status(500).json({ error: "Failed to create module" });
  }
});

const updateModuleSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  category: z.enum(["core", "optional"]).optional(),
  requiresAi: z.boolean().optional(),
  enabled: z.boolean().optional(),
  displayOrder: z.number().int().min(0).optional(),
  icon: z.string().optional().nullable(),
});

router.patch("/:id", async (req: Request, res: Response) => {
  try {
    const existing = await moduleRegistryService.getById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: "Module not found" });
    }

    const parsed = updateModuleSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ 
        error: "Validation failed", 
        details: parsed.error.flatten() 
      });
    }

    const updated = await moduleRegistryService.update(req.params.id, parsed.data);
    res.json(updated);
  } catch (error: any) {
    console.error("Error updating module:", error.message);
    res.status(500).json({ error: "Failed to update module" });
  }
});

router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const existing = await moduleRegistryService.getById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: "Module not found" });
    }

    const deleted = await moduleRegistryService.delete(req.params.id);
    if (deleted) {
      res.json({ success: true });
    } else {
      res.status(500).json({ error: "Failed to delete module" });
    }
  } catch (error: any) {
    console.error("Error deleting module:", error.message);
    res.status(500).json({ error: "Failed to delete module" });
  }
});

router.patch("/:id/toggle", async (req: Request, res: Response) => {
  try {
    const existing = await moduleRegistryService.getById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: "Module not found" });
    }

    const updated = await moduleRegistryService.setEnabled(req.params.id, !existing.enabled);
    res.json(updated);
  } catch (error: any) {
    console.error("Error toggling module:", error.message);
    res.status(500).json({ error: "Failed to toggle module" });
  }
});

export default router;
