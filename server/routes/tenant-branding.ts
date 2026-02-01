import { Router, Request, Response, json } from "express";
import { db } from "../db";
import { tenantBranding, insertTenantBrandingSchema } from "@shared/schema";
import { eq } from "drizzle-orm";
import { authenticateHybrid } from "../core/auth-middleware";
import { resolveTenantId, logTenantResolution } from "../lib/resolveTenantId";
import { AuditService } from "../core/audit";
import { z } from "zod";

const router = Router();
const requiredAuth = authenticateHybrid();
const auditService = new AuditService();

// Payload size limit for branding updates (50KB max)
const brandingPayloadLimit = json({ limit: "50kb" });

// Simple in-memory rate limiter for branding updates
const brandingRateLimits = new Map<string, { count: number; resetAt: number }>();
const BRANDING_RATE_LIMIT = 10; // 10 updates per window
const BRANDING_RATE_WINDOW = 15 * 60 * 1000; // 15 minutes

function checkBrandingRateLimit(key: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const entry = brandingRateLimits.get(key);
  
  // Skip rate limiting in development if configured
  if (process.env.SKIP_RATE_LIMIT === "true" && process.env.NODE_ENV !== "production") {
    return { allowed: true };
  }
  
  if (!entry || now >= entry.resetAt) {
    brandingRateLimits.set(key, { count: 1, resetAt: now + BRANDING_RATE_WINDOW });
    return { allowed: true };
  }
  
  if (entry.count >= BRANDING_RATE_LIMIT) {
    return { allowed: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
  }
  
  entry.count++;
  return { allowed: true };
}

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
// Using slightly darker shades for better contrast on white text
const BRANDING_DEFAULTS = {
  primaryColor: "#2563eb",      // blue-600 (better contrast for white text)
  secondaryColor: "#1e40af",    // blue-800
  accentColor: "#059669",       // emerald-600 (better contrast for white text)
  backgroundColor: "#ffffff",
  foregroundColor: "#111827",   // gray-900
  mutedColor: "#6b7280",        // gray-500
  borderColor: "#e5e7eb",       // gray-200
  fontFamily: "Inter",
  fontFamilyMono: "JetBrains Mono",
  themeTokens: { brand: {} },   // Normalized canonical shape
  socialLinks: {},
};

// Fields that require Pro/WhiteLabel plan (dangerous without sanitization)
const GATED_FIELDS = new Set([
  "emailHeaderHtml",
  "emailFooterHtml", 
  "customCss",
]);

// Map gated fields to their feature keys for error responses
const GATED_FIELD_TO_FEATURE = {
  emailHeaderHtml: "email_templates",
  emailFooterHtml: "email_templates",
  customCss: "custom_css",
} as const;

import { tenantVerifiedDomains, tenants } from "@shared/schema";

/**
 * Email Domain Verification
 * 
 * DESIGN DECISION: Fail-open when no verified domains configured
 * - This is intentional for backward compatibility during feature rollout
 * - Tenants can opt into strict mode by adding verified domains
 * - Once ANY verified domain exists, strict mode is enforced for that tenant
 * - Enterprise customers can require this via onboarding checklist
 */
async function isEmailDomainVerified(tenantId: string, domain: string): Promise<boolean> {
  const verified = await db
    .select()
    .from(tenantVerifiedDomains)
    .where(eq(tenantVerifiedDomains.tenantId, tenantId))
    .limit(100);
  
  // Fail-open when no domains configured (backward compatibility)
  // Strict mode is automatically enabled when tenant adds first verified domain
  if (verified.length === 0) {
    return true;
  }
  
  // Case-insensitive domain comparison (normalize both sides)
  const normalizedDomain = domain.toLowerCase().trim();
  return verified.some(v => 
    v.domain.toLowerCase().trim() === normalizedDomain && v.status === "verified"
  );
}

/**
 * Plan-Based Feature Gating
 * 
 * DESIGN DECISION: Simple plan tier check with caching
 * - Pro, Business, Enterprise, WhiteLabel plans get all gated branding features
 * - Cache with 5-min TTL reduces database load
 * - Always uses async path (no sync fail-closed fallback)
 * - Future: integrate with feature flags for per-feature granularity
 */
const planCache = new Map<string, { plan: string; expiresAt: number }>();
const PLAN_CACHE_TTL = 5 * 60 * 1000;

// Plans that have access to gated branding features
const PRO_PLANS = new Set(["pro", "business", "enterprise", "whitelabel"]);

async function hasBrandingFeatureAsync(tenantId: string, feature: string): Promise<boolean> {
  const now = Date.now();
  const cached = planCache.get(tenantId);
  
  let planTier: string;
  
  if (cached && now < cached.expiresAt) {
    planTier = cached.plan;
  } else {
    // Always fetch from database when cache miss (no fail-closed)
    const tenant = await db
      .select({ planTier: tenants.planTier })
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1);
    
    planTier = tenant[0]?.planTier || "starter";
    planCache.set(tenantId, { plan: planTier, expiresAt: now + PLAN_CACHE_TTL });
  }
  
  // All gated branding features require Pro or higher plan
  return PRO_PLANS.has(planTier.toLowerCase());
}

// Branding features for API response
async function getBrandingFeaturesAsync(tenantId: string): Promise<Record<string, boolean>> {
  const hasProFeatures = await hasBrandingFeatureAsync(tenantId, "email_templates");
  return {
    "branding.basic": true,
    "branding.assets": true,
    "branding.colors": true,
    "branding.fonts": true,
    "branding.email_templates": hasProFeatures,
    "branding.custom_css": hasProFeatures,
    "whitelabel.subdomain": hasProFeatures,
    "whitelabel.remove_platform_branding": hasProFeatures,
  };
}

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

// Canonical font name mapping for normalization
const FONT_CANONICAL: Record<string, string> = {
  "inter": "Inter",
  "roboto": "Roboto",
  "open sans": "Open Sans",
  "lato": "Lato",
  "montserrat": "Montserrat",
  "poppins": "Poppins",
  "nunito": "Nunito",
  "raleway": "Raleway",
  "work sans": "Work Sans",
  "source sans pro": "Source Sans Pro",
  "ubuntu": "Ubuntu",
  "rubik": "Rubik",
  "mulish": "Mulish",
  "jetbrains mono": "JetBrains Mono",
  "fira code": "Fira Code",
  "source code pro": "Source Code Pro",
  "ibm plex mono": "IBM Plex Mono",
  "consolas": "Consolas",
  "system-ui": "system-ui",
  "sans-serif": "sans-serif",
  "serif": "serif",
  "monospace": "monospace",
};

// Normalize hex color: lowercase with leading #
function normalizeHexColor(color: string): string {
  const normalized = color.toLowerCase().trim();
  return normalized.startsWith("#") ? normalized : `#${normalized}`;
}

// Normalize font to canonical name
function normalizeFontFamily(font: string): string {
  const key = font.toLowerCase().trim();
  return FONT_CANONICAL[key] || font;
}

// Normalize all branding data before storage
function normalizeBrandingData(data: Record<string, unknown>): Record<string, unknown> {
  const normalized = { ...data };
  
  // Normalize colors
  const colorFields = ["primaryColor", "secondaryColor", "accentColor", "backgroundColor", 
                       "foregroundColor", "mutedColor", "borderColor"];
  for (const field of colorFields) {
    if (typeof normalized[field] === "string") {
      normalized[field] = normalizeHexColor(normalized[field] as string);
    }
  }
  
  // Normalize fonts
  if (typeof normalized.fontFamily === "string") {
    normalized.fontFamily = normalizeFontFamily(normalized.fontFamily as string);
  }
  if (typeof normalized.fontFamilyHeading === "string") {
    normalized.fontFamilyHeading = normalizeFontFamily(normalized.fontFamilyHeading as string);
  }
  if (typeof normalized.fontFamilyMono === "string") {
    normalized.fontFamilyMono = normalizeFontFamily(normalized.fontFamilyMono as string);
  }
  
  // Normalize themeTokens brand colors
  if (normalized.themeTokens && typeof normalized.themeTokens === "object") {
    const tokens = normalized.themeTokens as Record<string, Record<string, string>>;
    if (tokens.brand) {
      for (const key of ["primary", "secondary", "accent"]) {
        if (typeof tokens.brand[key] === "string") {
          tokens.brand[key] = normalizeHexColor(tokens.brand[key]);
        }
      }
    }
  }
  
  return normalized;
}

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
      const features = await getBrandingFeaturesAsync(tenantId);
      return res.json({
        branding: newBranding,
        features,
      });
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
      const features = await getBrandingFeaturesAsync(tenantId);
      return res.json({
        branding: updated,
        features,
      });
    }

    // Return branding with features for frontend gating
    const features = await getBrandingFeaturesAsync(tenantId);
    res.json({
      branding: branding[0],
      features,
    });
  } catch (error) {
    console.error("[tenant-branding] Error fetching branding:", error);
    res.status(500).json({ error: "Failed to fetch tenant branding" });
  }
});

router.put("/api/tenant/branding", brandingPayloadLimit, requiredAuth, async (req: Request, res: Response) => {
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
    const user = (req as any).user;
    const userId = user?.id || null;
    
    // Rate limit check
    const rateLimitKey = `branding:${tenantId}:${userId || req.ip}`;
    const rateCheck = checkBrandingRateLimit(rateLimitKey);
    if (!rateCheck.allowed) {
      return res.status(429).json({ 
        error: "Too many branding updates", 
        code: "RATE_LIMIT_EXCEEDED",
        retryAfter: rateCheck.retryAfter 
      });
    }
    
    const parsed = updateBrandingSchema.safeParse(req.body);
    
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid request body", details: parsed.error.errors });
    }

    // Check for gated fields that require higher plan
    // Stronger enforcement: reject ENTIRE request if ANY forbidden field is present
    const attemptedGatedFields = Object.keys(parsed.data).filter(k => GATED_FIELDS.has(k));
    if (attemptedGatedFields.length > 0) {
      // Check each gated field and reject on first forbidden one (async plan check)
      for (const field of attemptedGatedFields) {
        const featureKey = GATED_FIELD_TO_FEATURE[field as keyof typeof GATED_FIELD_TO_FEATURE];
        const hasAccess = await hasBrandingFeatureAsync(tenantId, featureKey);
        if (!hasAccess) {
          return res.status(403).json({
            error: "Feature not available on your plan",
            code: "FEATURE_NOT_ALLOWED",
            feature: `branding.${featureKey}`,
            field: field,
            message: `${field} requires Pro or WhiteLabel plan. Upgrade to unlock this feature.`,
          });
        }
      }
    }
    
    // Validate emailFromAddress against verified domains (if provided)
    const emailFromAddress = (parsed.data as any).emailFromAddress;
    if (emailFromAddress) {
      const domain = emailFromAddress.split("@")[1];
      const isVerified = await isEmailDomainVerified(tenantId, domain);
      if (!isVerified) {
        return res.status(400).json({
          error: "Email domain not verified",
          code: "EMAIL_DOMAIN_NOT_VERIFIED",
          domain: domain,
          message: "emailFromAddress must use a verified domain. Add and verify this domain first.",
        });
      }
    }

    // Normalize data before storage
    const normalizedData = normalizeBrandingData(parsed.data as Record<string, unknown>);
    const updateData = {
      ...normalizedData,
      updatedAt: new Date(),
    };

    const existing = await db
      .select()
      .from(tenantBranding)
      .where(eq(tenantBranding.tenantId, tenantId))
      .limit(1);

    const oldValue = existing.length > 0 ? existing[0] : null;
    
    let result;
    if (existing.length === 0) {
      const [newBranding] = await db
        .insert(tenantBranding)
        .values({ 
          tenantId,
          ...BRANDING_DEFAULTS,
          ...updateData,
        })
        .returning();
      result = newBranding;
    } else {
      const [updatedBranding] = await db
        .update(tenantBranding)
        .set(updateData)
        .where(eq(tenantBranding.tenantId, tenantId))
        .returning();
      result = updatedBranding;
    }

    // Audit log the branding change
    const changedFields = Object.keys(parsed.data);
    await auditService.log({
      tenantId,
      userId,
      action: oldValue ? "update" : "create",
      resource: "tenant_branding",
      resourceId: result.id,
      oldValue: oldValue ? { ...oldValue } : null,
      newValue: { fieldsChanged: changedFields },
      metadata: { 
        fieldsChanged: changedFields,
        source: "branding_settings_page"
      },
      ipAddress: req.ip || null,
      userAgent: req.get("user-agent") || null,
    });

    res.json(result);
  } catch (error) {
    console.error("[tenant-branding] Error updating branding:", error);
    res.status(500).json({ error: "Failed to update tenant branding" });
  }
});

export default router;
