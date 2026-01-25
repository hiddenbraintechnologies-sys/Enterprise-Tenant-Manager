import { Router, Request, Response } from "express";
import { db } from "../db";
import { tenantSettings } from "@shared/schema";
import { eq } from "drizzle-orm";
import { authenticateHybrid } from "../core/auth-middleware";
import { resolveTenantId, logTenantResolution } from "../lib/resolveTenantId";
import { z } from "zod";

const router = Router();
const requiredAuth = authenticateHybrid();

const updateSettingsSchema = z.object({
  language: z.enum(["en", "hi", "te", "ta", "kn", "ml"]).optional(),
});

router.get("/api/tenant/settings", requiredAuth, async (req: Request, res: Response) => {
  try {
    const resolution = await resolveTenantId(req);
    logTenantResolution(req, resolution, "GET /api/tenant/settings");

    if (resolution.error || !resolution.tenantId) {
      return res.status(resolution.error?.status || 401).json({
        code: resolution.error?.code || "TENANT_REQUIRED",
        message: resolution.error?.message || "Tenant context required",
      });
    }

    const tenantId = resolution.tenantId;
    
    const settings = await db
      .select()
      .from(tenantSettings)
      .where(eq(tenantSettings.tenantId, tenantId))
      .limit(1);

    if (settings.length === 0) {
      const [newSettings] = await db
        .insert(tenantSettings)
        .values({ tenantId, language: "en" })
        .returning();
      return res.json(newSettings);
    }

    res.json(settings[0]);
  } catch (error) {
    console.error("[tenant-settings] Error fetching settings:", error);
    res.status(500).json({ error: "Failed to fetch tenant settings" });
  }
});

router.patch("/api/tenant/settings", requiredAuth, async (req: Request, res: Response) => {
  try {
    const resolution = await resolveTenantId(req);
    logTenantResolution(req, resolution, "PATCH /api/tenant/settings");

    if (resolution.error || !resolution.tenantId) {
      return res.status(resolution.error?.status || 401).json({
        code: resolution.error?.code || "TENANT_REQUIRED",
        message: resolution.error?.message || "Tenant context required",
      });
    }

    const tenantId = resolution.tenantId;
    const parsed = updateSettingsSchema.safeParse(req.body);
    
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid request body", details: parsed.error.errors });
    }

    const { language } = parsed.data;

    const existing = await db
      .select()
      .from(tenantSettings)
      .where(eq(tenantSettings.tenantId, tenantId))
      .limit(1);

    if (existing.length === 0) {
      const [newSettings] = await db
        .insert(tenantSettings)
        .values({ tenantId, language: language || "en" })
        .returning();
      return res.json(newSettings);
    }

    const [updatedSettings] = await db
      .update(tenantSettings)
      .set({ 
        language: language || existing[0].language,
        updatedAt: new Date()
      })
      .where(eq(tenantSettings.tenantId, tenantId))
      .returning();

    res.json(updatedSettings);
  } catch (error) {
    console.error("[tenant-settings] Error updating settings:", error);
    res.status(500).json({ error: "Failed to update tenant settings" });
  }
});

export default router;
