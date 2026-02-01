import { Router, Request, Response } from "express";
import { db } from "../db";
import { tenantBranding, insertTenantBrandingSchema } from "@shared/schema";
import { eq } from "drizzle-orm";
import { authenticateHybrid } from "../core/auth-middleware";
import { resolveTenantId, logTenantResolution } from "../lib/resolveTenantId";
import { z } from "zod";

const router = Router();
const requiredAuth = authenticateHybrid();

// Allowed font families (safe, web-standard fonts) - exact match required
const ALLOWED_FONTS = new Set([
  "inter", "roboto", "open sans", "lato", "montserrat", "poppins", "nunito",
  "raleway", "work sans", "source sans pro", "ubuntu", "rubik", "mulish",
  "jetbrains mono", "fira code", "source code pro", "ibm plex mono", "consolas",
  "system-ui", "sans-serif", "serif", "monospace",
]);

const fontValidator = z.string().max(100).refine(
  (val) => ALLOWED_FONTS.has(val.toLowerCase().trim()),
  { message: "Font family not in allowed list. Allowed: Inter, Roboto, Open Sans, Lato, Montserrat, Poppins, etc." }
);

// Validated themeTokens schema for brand colors
const themeTokensSchema = z.object({
  brand: z.object({
    primary: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid hex color").optional(),
    secondary: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid hex color").optional(),
    accent: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid hex color").optional(),
  }).partial().optional(),
}).partial().optional();

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
  themeTokens: themeTokensSchema,
}).strict(); // Reject unknown keys

// Columns that can be safely healed with defaults
const HEALABLE_COLUMNS = [
  "primaryColor", "secondaryColor", "accentColor", "backgroundColor",
  "foregroundColor", "mutedColor", "borderColor", "fontFamily", "fontFamilyMono",
] as const;

// Helper: build update object for missing/null fields (self-healing)
// Only updates specific healable columns to avoid touching immutable fields
function getHealingUpdates(branding: Record<string, unknown>): Record<string, unknown> | null {
  const updates: Record<string, unknown> = {};
  let hasUpdates = false;
  
  for (const key of HEALABLE_COLUMNS) {
    const currentValue = branding[key];
    const defaultValue = BRANDING_DEFAULTS[key as keyof typeof BRANDING_DEFAULTS];
    
    if ((currentValue === null || currentValue === undefined) && defaultValue !== undefined) {
      updates[key] = defaultValue;
      hasUpdates = true;
    }
  }
  
  // Handle JSON columns separately
  if (!branding.themeTokens || (typeof branding.themeTokens === 'object' && Object.keys(branding.themeTokens as object).length === 0)) {
    // Don't overwrite existing themeTokens
  }
  if (!branding.socialLinks || (typeof branding.socialLinks === 'object' && Object.keys(branding.socialLinks as object).length === 0)) {
    // Don't overwrite existing socialLinks  
  }
  
  return hasUpdates ? updates : null;
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

    // Self-healing: check for null/undefined fields that need defaults
    const healingUpdates = getHealingUpdates(branding[0] as Record<string, unknown>);
    
    if (healingUpdates) {
      // Only update the specific columns that need healing
      const [updated] = await db
        .update(tenantBranding)
        .set({ ...healingUpdates, updatedAt: new Date() })
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
