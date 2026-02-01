import { Router, Request, Response } from "express";
import { db } from "../db";
import { tenantBranding, insertTenantBrandingSchema } from "@shared/schema";
import { eq } from "drizzle-orm";
import { authenticateHybrid } from "../core/auth-middleware";
import { resolveTenantId, logTenantResolution } from "../lib/resolveTenantId";
import { z } from "zod";

const router = Router();
const requiredAuth = authenticateHybrid();

// Allowed font families (safe, web-standard fonts)
const ALLOWED_FONTS = [
  "Inter", "Roboto", "Open Sans", "Lato", "Montserrat", "Poppins", "Nunito",
  "Raleway", "Work Sans", "Source Sans Pro", "Ubuntu", "Rubik", "Mulish",
  "JetBrains Mono", "Fira Code", "Source Code Pro", "IBM Plex Mono", "Consolas",
  "system-ui", "sans-serif", "serif", "monospace",
];

const fontValidator = z.string().max(100).refine(
  (val) => ALLOWED_FONTS.some(f => val.toLowerCase().includes(f.toLowerCase())),
  { message: "Font family not in allowed list" }
);

// Default branding values for self-healing
const BRANDING_DEFAULTS = {
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
};

// Strict schema - rejects unknown keys
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
  fontFamily: fontValidator.optional(),
  fontFamilyHeading: fontValidator.optional().nullable(),
  fontFamilyMono: fontValidator.optional(),
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
}).strict(); // Reject unknown keys

// Helper: merge defaults for missing fields (self-healing)
function mergeWithDefaults(branding: Record<string, unknown>): Record<string, unknown> {
  const merged = { ...branding };
  for (const [key, defaultValue] of Object.entries(BRANDING_DEFAULTS)) {
    if (merged[key] === null || merged[key] === undefined) {
      merged[key] = defaultValue;
    }
  }
  return merged;
}

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
          ...BRANDING_DEFAULTS,
        })
        .returning();
      return res.json(newBranding);
    }

    // Self-healing: merge defaults for any missing fields (future schema evolution)
    const healedBranding = mergeWithDefaults(branding[0] as Record<string, unknown>);
    
    // If any fields were healed, update the record
    const hasHealedFields = Object.keys(BRANDING_DEFAULTS).some(
      key => branding[0][key as keyof typeof branding[0]] === null && 
             healedBranding[key] !== null
    );
    
    if (hasHealedFields) {
      const [updated] = await db
        .update(tenantBranding)
        .set(healedBranding)
        .where(eq(tenantBranding.tenantId, tenantId))
        .returning();
      return res.json(updated);
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
          ...BRANDING_DEFAULTS,
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
