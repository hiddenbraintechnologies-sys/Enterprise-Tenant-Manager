// Unit tests for branding upload validation

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
