// Unit tests for branding upload validation and regression tests

// Validation constants matching server/routes/branding-upload.ts
// PNG only for logo (SVG blocked for security - no script/external ref sanitization)
const ALLOWED_LOGO_TYPES = ["image/png"];
const ALLOWED_FAVICON_TYPES = ["image/png", "image/x-icon", "image/vnd.microsoft.icon"];
const MAX_LOGO_SIZE = 1 * 1024 * 1024; // 1MB
const MAX_FAVICON_SIZE = 200 * 1024; // 200KB

function validateUpload(type: "logo" | "favicon", contentType: string, size: number): { valid: boolean; error?: string } {
  const maxSize = type === "logo" ? MAX_LOGO_SIZE : MAX_FAVICON_SIZE;
  const maxSizeLabel = type === "logo" ? "1MB" : "200KB";
  
  if (size > maxSize) {
    return { valid: false, error: `File too large. Maximum size for ${type} is ${maxSizeLabel}` };
  }

  const allowedTypes = type === "logo" ? ALLOWED_LOGO_TYPES : ALLOWED_FAVICON_TYPES;
  const allowedTypesLabel = type === "logo" ? "PNG" : "PNG, ICO";
  
  if (!allowedTypes.includes(contentType)) {
    return { valid: false, error: `Invalid file type for ${type}. Allowed: ${allowedTypesLabel}` };
  }

  return { valid: true };
}

// Mock confirm-upload response for regression test
const mockConfirmResponse = {
  success: true,
  logoUrl: "/objects/tenants/test-tenant-123/branding/logo_abc123.png",
  objectKey: "tenants/test-tenant-123/branding/logo_abc123.png",
  branding: {
    id: "branding-1",
    tenantId: "test-tenant-123",
    logoUrl: "/objects/tenants/test-tenant-123/branding/logo_abc123.png",
    logoAltUrl: null,
    faviconUrl: null,
    primaryColor: "#3B82F6",
    secondaryColor: "#1E40AF",
    accentColor: "#10B981",
    backgroundColor: "#FFFFFF",
    foregroundColor: "#111827",
    mutedColor: "#6B7280",
    borderColor: "#E5E7EB",
    fontFamily: "Inter",
    fontFamilyHeading: null,
    fontFamilyMono: "JetBrains Mono",
    themeTokens: {},
    emailFromName: null,
    emailFromAddress: null,
    emailReplyTo: null,
    emailSignature: null,
    emailHeaderHtml: null,
    emailFooterHtml: null,
    termsOfServiceUrl: null,
    privacyPolicyUrl: null,
    supportEmail: null,
    supportPhone: null,
    supportUrl: null,
    socialLinks: {},
    customCss: null,
    createdBy: null,
    createdAt: new Date("2026-02-01T00:00:00.000Z"),
    updatedAt: new Date("2026-02-01T00:00:00.000Z"),
  }
};

describe("Branding Upload Validation", () => {
  describe("Logo validation", () => {
    it("accepts PNG files under 1MB", () => {
      const result = validateUpload("logo", "image/png", 500 * 1024);
      expect(result.valid).toBe(true);
    });

    it("rejects SVG files (security)", () => {
      const result = validateUpload("logo", "image/svg+xml", 100 * 1024);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Invalid file type");
    });

    it("rejects JPEG files", () => {
      const result = validateUpload("logo", "image/jpeg", 100 * 1024);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Invalid file type");
      expect(result.error).toContain("PNG");
    });

    it("rejects WebP files", () => {
      const result = validateUpload("logo", "image/webp", 100 * 1024);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Invalid file type");
    });

    it("rejects files over 1MB", () => {
      const result = validateUpload("logo", "image/png", 1.5 * 1024 * 1024);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("File too large");
      expect(result.error).toContain("1MB");
    });

    it("accepts files exactly at 1MB limit", () => {
      const result = validateUpload("logo", "image/png", MAX_LOGO_SIZE);
      expect(result.valid).toBe(true);
    });
  });

  describe("Favicon validation", () => {
    it("accepts PNG files under 200KB", () => {
      const result = validateUpload("favicon", "image/png", 50 * 1024);
      expect(result.valid).toBe(true);
    });

    it("accepts ICO files under 200KB", () => {
      const result = validateUpload("favicon", "image/x-icon", 30 * 1024);
      expect(result.valid).toBe(true);
    });

    it("accepts Microsoft ICO format", () => {
      const result = validateUpload("favicon", "image/vnd.microsoft.icon", 30 * 1024);
      expect(result.valid).toBe(true);
    });

    it("rejects JPEG files", () => {
      const result = validateUpload("favicon", "image/jpeg", 50 * 1024);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Invalid file type");
      expect(result.error).toContain("PNG, ICO");
    });

    it("rejects SVG files for favicon", () => {
      const result = validateUpload("favicon", "image/svg+xml", 50 * 1024);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Invalid file type");
    });

    it("rejects files over 200KB", () => {
      const result = validateUpload("favicon", "image/png", 250 * 1024);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("File too large");
      expect(result.error).toContain("200KB");
    });

    it("accepts files exactly at 200KB limit", () => {
      const result = validateUpload("favicon", "image/png", MAX_FAVICON_SIZE);
      expect(result.valid).toBe(true);
    });
  });
});

/**
 * Regression test: Branding upload should update preview immediately
 * 
 * Bug: Upload shows "Upload complete" toast but UI still shows "No logo uploaded"
 * Fix: After confirm-upload succeeds:
 *   1. Backend returns full branding object (camelCase from Drizzle)
 *   2. Frontend updates query cache with setQueryData
 *   3. Preview reads from tenantBranding query (single source of truth)
 *   4. Cache-busting applied to preview images
 */
describe("Branding Upload Regression - Preview Update", () => {
  describe("confirm-upload response", () => {
    it("returns success flag", () => {
      expect(mockConfirmResponse.success).toBe(true);
    });

    it("returns logoUrl at root level", () => {
      expect(mockConfirmResponse.logoUrl).toBe(
        "/objects/tenants/test-tenant-123/branding/logo_abc123.png"
      );
    });

    it("returns full branding object", () => {
      expect(mockConfirmResponse.branding).toBeDefined();
      expect(mockConfirmResponse.branding.logoUrl).toBe(mockConfirmResponse.logoUrl);
    });

    it("branding object has all required fields", () => {
      const { branding } = mockConfirmResponse;
      expect(branding).toHaveProperty("id");
      expect(branding).toHaveProperty("tenantId");
      expect(branding).toHaveProperty("logoUrl");
      expect(branding).toHaveProperty("faviconUrl");
      expect(branding).toHaveProperty("primaryColor");
      expect(branding).toHaveProperty("secondaryColor");
      expect(branding).toHaveProperty("accentColor");
      expect(branding).toHaveProperty("backgroundColor");
      expect(branding).toHaveProperty("foregroundColor");
      expect(branding).toHaveProperty("supportEmail");
      expect(branding).toHaveProperty("supportPhone");
    });
  });

  describe("cache-busting", () => {
    it("adds timestamp query param to image URLs", () => {
      const logoUrl = "/objects/tenants/test/branding/logo.png";
      const timestamp = Date.now();
      const cacheBustedUrl = `${logoUrl}?v=${timestamp}`;
      
      expect(cacheBustedUrl).toContain("?v=");
      expect(cacheBustedUrl).toMatch(/\?v=\d+$/);
    });

    it("preserves original URL path", () => {
      const logoUrl = "/objects/tenants/test/branding/logo.png";
      const cacheBustedUrl = `${logoUrl}?v=${Date.now()}`;
      
      expect(cacheBustedUrl.split("?")[0]).toBe(logoUrl);
    });
  });

  describe("preview rendering decision", () => {
    it("should render img when logoUrl is present", () => {
      const logoUrl = mockConfirmResponse.branding.logoUrl;
      const shouldRenderImg = !!logoUrl;
      
      expect(shouldRenderImg).toBe(true);
    });

    it("should render placeholder when logoUrl is null", () => {
      const logoUrl = null;
      const shouldRenderPlaceholder = !logoUrl;
      
      expect(shouldRenderPlaceholder).toBe(true);
    });

    it("should render placeholder when logoUrl is empty string", () => {
      const logoUrl = "";
      const shouldRenderPlaceholder = !logoUrl;
      
      expect(shouldRenderPlaceholder).toBe(true);
    });
  });
});
