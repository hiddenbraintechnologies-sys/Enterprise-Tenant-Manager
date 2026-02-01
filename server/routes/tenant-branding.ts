import { Router, Request, Response } from "express";
import { db } from "../db";
import { tenantBranding, insertTenantBrandingSchema } from "@shared/schema";
import { eq } from "drizzle-orm";
import { authenticateHybrid } from "../core/auth-middleware";
import { resolveTenantId, logTenantResolution } from "../lib/resolveTenantId";
import { z } from "zod";

const router = Router();
const requiredAuth = authenticateHybrid();

const updateBrandingSchema = z.object({
  logoUrl: z.string().url().optional().nullable(),
  logoAltUrl: z.string().url().optional().nullable(),
  faviconUrl: z.string().url().optional().nullable(),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid hex color").optional(),
  secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid hex color").optional(),
  accentColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid hex color").optional(),
  backgroundColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid hex color").optional(),
  foregroundColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid hex color").optional(),
  mutedColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid hex color").optional(),
  borderColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid hex color").optional(),
  fontFamily: z.string().max(100).optional(),
  fontFamilyHeading: z.string().max(100).optional().nullable(),
  fontFamilyMono: z.string().max(100).optional(),
  emailFromName: z.string().max(100).optional().nullable(),
  emailFromAddress: z.string().email().optional().nullable(),
  emailReplyTo: z.string().email().optional().nullable(),
  emailSignature: z.string().max(2000).optional().nullable(),
  emailHeaderHtml: z.string().max(10000).optional().nullable(),
  emailFooterHtml: z.string().max(10000).optional().nullable(),
  termsOfServiceUrl: z.string().url().optional().nullable(),
  privacyPolicyUrl: z.string().url().optional().nullable(),
  supportEmail: z.string().email().optional().nullable(),
  supportPhone: z.string().max(20).optional().nullable(),
  supportUrl: z.string().url().optional().nullable(),
  socialLinks: z.record(z.string()).optional(),
  customCss: z.string().max(50000).optional().nullable(),
  themeTokens: z.record(z.any()).optional(),
});

router.get("/api/tenant/branding", requiredAuth, async (req: Request, res: Response) => {
  try {
    const resolution = await resolveTenantId(req);
    logTenantResolution(req, resolution, "GET /api/tenant/branding");

    if (resolution.error || !resolution.tenantId) {
      return res.status(resolution.error?.status || 401).json({
        code: resolution.error?.code || "TENANT_REQUIRED",
        message: resolution.error?.message || "Tenant context required",
      });
    }

    const tenantId = resolution.tenantId;
    
    const branding = await db
      .select()
      .from(tenantBranding)
      .where(eq(tenantBranding.tenantId, tenantId))
      .limit(1);

    if (branding.length === 0) {
      const [newBranding] = await db
        .insert(tenantBranding)
        .values({ 
          tenantId,
          primaryColor: "#3B82F6",
          secondaryColor: "#1E40AF",
          accentColor: "#10B981",
          backgroundColor: "#FFFFFF",
          foregroundColor: "#111827",
          mutedColor: "#6B7280",
          borderColor: "#E5E7EB",
          fontFamily: "Inter",
          fontFamilyMono: "JetBrains Mono",
          themeTokens: {},
          socialLinks: {},
        })
        .returning();
      return res.json(newBranding);
    }

    res.json(branding[0]);
  } catch (error) {
    console.error("[tenant-branding] Error fetching branding:", error);
    res.status(500).json({ error: "Failed to fetch tenant branding" });
  }
});

router.put("/api/tenant/branding", requiredAuth, async (req: Request, res: Response) => {
  try {
    const resolution = await resolveTenantId(req);
    logTenantResolution(req, resolution, "PUT /api/tenant/branding");

    if (resolution.error || !resolution.tenantId) {
      return res.status(resolution.error?.status || 401).json({
        code: resolution.error?.code || "TENANT_REQUIRED",
        message: resolution.error?.message || "Tenant context required",
      });
    }

    const tenantId = resolution.tenantId;
    const parsed = updateBrandingSchema.safeParse(req.body);
    
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid request body", details: parsed.error.errors });
    }

    const updateData = {
      ...parsed.data,
      updatedAt: new Date(),
    };

    const existing = await db
      .select()
      .from(tenantBranding)
      .where(eq(tenantBranding.tenantId, tenantId))
      .limit(1);

    if (existing.length === 0) {
      const [newBranding] = await db
        .insert(tenantBranding)
        .values({ 
          tenantId,
          primaryColor: "#3B82F6",
          secondaryColor: "#1E40AF",
          accentColor: "#10B981",
          backgroundColor: "#FFFFFF",
          foregroundColor: "#111827",
          mutedColor: "#6B7280",
          borderColor: "#E5E7EB",
          fontFamily: "Inter",
          fontFamilyMono: "JetBrains Mono",
          themeTokens: {},
          socialLinks: {},
          ...updateData,
        })
        .returning();
      return res.json(newBranding);
    }

    const [updatedBranding] = await db
      .update(tenantBranding)
      .set(updateData)
      .where(eq(tenantBranding.tenantId, tenantId))
      .returning();

    res.json(updatedBranding);
  } catch (error) {
    console.error("[tenant-branding] Error updating branding:", error);
    res.status(500).json({ error: "Failed to update tenant branding" });
  }
});

export default router;
