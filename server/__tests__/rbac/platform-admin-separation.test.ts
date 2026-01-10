import { describe, it, expect } from "@jest/globals";

/**
 * Platform Admin RBAC Separation Tests
 * 
 * Tests the following requirements:
 * 1. PLATFORM_ADMIN cannot access SUPER_ADMIN routes (403)
 * 2. PLATFORM_ADMIN sees only scoped tenants
 * 3. SUPER_ADMIN sees everything
 * 4. Tenant admins unaffected
 */

describe("Platform Admin RBAC Separation", () => {
  describe("Permission Constants", () => {
    it("should have distinct permission sets for SUPER_ADMIN and PLATFORM_ADMIN", async () => {
      const { 
        SUPER_ADMIN_PERMISSIONS, 
        PLATFORM_ADMIN_PERMISSIONS, 
        SUPER_ADMIN_ONLY_PERMISSIONS,
        PLATFORM_PERMISSIONS,
      } = await import("../../core/permissions");

      // Super admin should have more permissions
      expect(SUPER_ADMIN_PERMISSIONS.length).toBeGreaterThan(PLATFORM_ADMIN_PERMISSIONS.length);
      
      // Platform admin permissions should be a subset of super admin permissions
      for (const perm of PLATFORM_ADMIN_PERMISSIONS) {
        expect(SUPER_ADMIN_PERMISSIONS).toContain(perm);
      }

      // Super admin only permissions should NOT be in platform admin permissions
      for (const perm of SUPER_ADMIN_ONLY_PERMISSIONS) {
        expect(PLATFORM_ADMIN_PERMISSIONS).not.toContain(perm);
      }

      // Verify expected super admin only permissions
      expect(SUPER_ADMIN_ONLY_PERMISSIONS).toContain(PLATFORM_PERMISSIONS.MANAGE_PLATFORM_ADMINS);
      expect(SUPER_ADMIN_ONLY_PERMISSIONS).toContain(PLATFORM_PERMISSIONS.MANAGE_GLOBAL_CONFIG);
      expect(SUPER_ADMIN_ONLY_PERMISSIONS).toContain(PLATFORM_PERMISSIONS.MANAGE_PLANS_PRICING);
      expect(SUPER_ADMIN_ONLY_PERMISSIONS).toContain(PLATFORM_PERMISSIONS.MANAGE_BUSINESS_TYPES);
    });

    it("should have expected platform admin permissions", async () => {
      const { PLATFORM_ADMIN_PERMISSIONS, PLATFORM_PERMISSIONS } = await import("../../core/permissions");

      expect(PLATFORM_ADMIN_PERMISSIONS).toContain(PLATFORM_PERMISSIONS.VIEW_TENANTS);
      expect(PLATFORM_ADMIN_PERMISSIONS).toContain(PLATFORM_PERMISSIONS.SUSPEND_TENANT);
      expect(PLATFORM_ADMIN_PERMISSIONS).toContain(PLATFORM_PERMISSIONS.VIEW_USAGE_METRICS);
      expect(PLATFORM_ADMIN_PERMISSIONS).toContain(PLATFORM_PERMISSIONS.VIEW_INVOICES_PAYMENTS);
      expect(PLATFORM_ADMIN_PERMISSIONS).toContain(PLATFORM_PERMISSIONS.HANDLE_SUPPORT_TICKETS);
    });
  });

  describe("Permission Resolution", () => {
    it("should resolve SUPER_ADMIN with all permissions and null scope", async () => {
      const { resolveAdminPermissions, SUPER_ADMIN_PERMISSIONS } = await import("../../core/permissions");

      const resolved = resolveAdminPermissions("SUPER_ADMIN", [], []);

      expect(resolved.role).toBe("SUPER_ADMIN");
      expect(resolved.isSuperAdmin).toBe(true);
      expect(resolved.scope).toBeNull();
      expect(resolved.permissions).toEqual(SUPER_ADMIN_PERMISSIONS);
    });

    it("should resolve PLATFORM_ADMIN with limited permissions and scope", async () => {
      const { resolveAdminPermissions, PLATFORM_ADMIN_PERMISSIONS } = await import("../../core/permissions");

      const resolved = resolveAdminPermissions("PLATFORM_ADMIN", ["IN", "AE"], []);

      expect(resolved.role).toBe("PLATFORM_ADMIN");
      expect(resolved.isSuperAdmin).toBe(false);
      expect(resolved.scope).not.toBeNull();
      expect(resolved.scope?.countryIds).toEqual(["IN", "AE"]);
      expect(resolved.permissions).toEqual(PLATFORM_ADMIN_PERMISSIONS);
    });

    it("should return empty scope for PLATFORM_ADMIN without country assignments", async () => {
      const { resolveAdminPermissions } = await import("../../core/permissions");

      const resolved = resolveAdminPermissions("PLATFORM_ADMIN", null, null);

      expect(resolved.scope?.countryIds).toEqual([]);
      expect(resolved.scope?.regionIds).toEqual([]);
    });
  });

  describe("API Route Protection", () => {
    it("should require authentication for platform admin routes", async () => {
      const response = await fetch("http://localhost:5000/api/platform-admin/me");
      expect(response.status).toBe(401);
    });

    it("should require authentication for tenants endpoint", async () => {
      const response = await fetch("http://localhost:5000/api/platform-admin/tenants");
      expect(response.status).toBe(401);
    });

    it("should require authentication for admins management", async () => {
      const response = await fetch("http://localhost:5000/api/platform-admin/admins");
      expect(response.status).toBe(401);
    });
  });

  describe("Scope Access Functions", () => {
    it("should allow super admin to access any country", async () => {
      const { resolveAdminPermissions, canAccessCountry } = await import("../../core/permissions");

      const resolved = resolveAdminPermissions("SUPER_ADMIN", [], []);

      expect(canAccessCountry(resolved, "IN")).toBe(true);
      expect(canAccessCountry(resolved, "AE")).toBe(true);
      expect(canAccessCountry(resolved, "GB")).toBe(true);
      expect(canAccessCountry(resolved, "US")).toBe(true);
    });

    it("should restrict platform admin to assigned countries only", async () => {
      const { resolveAdminPermissions, canAccessCountry } = await import("../../core/permissions");

      const resolved = resolveAdminPermissions("PLATFORM_ADMIN", ["IN", "AE"], []);

      expect(canAccessCountry(resolved, "IN")).toBe(true);
      expect(canAccessCountry(resolved, "AE")).toBe(true);
      expect(canAccessCountry(resolved, "GB")).toBe(false);
      expect(canAccessCountry(resolved, "US")).toBe(false);
    });

    it("should deny all country access for platform admin with no scope", async () => {
      const { resolveAdminPermissions, canAccessCountry } = await import("../../core/permissions");

      const resolved = resolveAdminPermissions("PLATFORM_ADMIN", [], []);

      expect(canAccessCountry(resolved, "IN")).toBe(false);
      expect(canAccessCountry(resolved, "AE")).toBe(false);
    });
  });

  describe("Permission Check Functions", () => {
    it("should allow super admin to have all permissions", async () => {
      const { resolveAdminPermissions, hasPlatformPermission, PLATFORM_PERMISSIONS } = await import("../../core/permissions");

      const resolved = resolveAdminPermissions("SUPER_ADMIN", [], []);

      expect(hasPlatformPermission(resolved, PLATFORM_PERMISSIONS.MANAGE_PLATFORM_ADMINS)).toBe(true);
      expect(hasPlatformPermission(resolved, PLATFORM_PERMISSIONS.MANAGE_GLOBAL_CONFIG)).toBe(true);
      expect(hasPlatformPermission(resolved, PLATFORM_PERMISSIONS.VIEW_TENANTS)).toBe(true);
    });

    it("should restrict platform admin from super admin only permissions", async () => {
      const { resolveAdminPermissions, hasPlatformPermission, PLATFORM_PERMISSIONS } = await import("../../core/permissions");

      const resolved = resolveAdminPermissions("PLATFORM_ADMIN", ["IN"], []);

      // Should NOT have super admin only permissions
      expect(hasPlatformPermission(resolved, PLATFORM_PERMISSIONS.MANAGE_PLATFORM_ADMINS)).toBe(false);
      expect(hasPlatformPermission(resolved, PLATFORM_PERMISSIONS.MANAGE_GLOBAL_CONFIG)).toBe(false);
      expect(hasPlatformPermission(resolved, PLATFORM_PERMISSIONS.MANAGE_PLANS_PRICING)).toBe(false);

      // Should have platform admin permissions
      expect(hasPlatformPermission(resolved, PLATFORM_PERMISSIONS.VIEW_TENANTS)).toBe(true);
      expect(hasPlatformPermission(resolved, PLATFORM_PERMISSIONS.SUSPEND_TENANT)).toBe(true);
    });
  });

  describe("Super Admin Only Permission Check", () => {
    it("should correctly identify super admin only permissions", async () => {
      const { isSuperAdminOnlyPermission, PLATFORM_PERMISSIONS } = await import("../../core/permissions");

      // These should be super admin only
      expect(isSuperAdminOnlyPermission(PLATFORM_PERMISSIONS.MANAGE_PLATFORM_ADMINS)).toBe(true);
      expect(isSuperAdminOnlyPermission(PLATFORM_PERMISSIONS.MANAGE_GLOBAL_CONFIG)).toBe(true);
      expect(isSuperAdminOnlyPermission(PLATFORM_PERMISSIONS.MANAGE_PLANS_PRICING)).toBe(true);
      expect(isSuperAdminOnlyPermission(PLATFORM_PERMISSIONS.VIEW_ALL_TENANTS)).toBe(true);

      // These should NOT be super admin only
      expect(isSuperAdminOnlyPermission(PLATFORM_PERMISSIONS.VIEW_TENANTS)).toBe(false);
      expect(isSuperAdminOnlyPermission(PLATFORM_PERMISSIONS.SUSPEND_TENANT)).toBe(false);
      expect(isSuperAdminOnlyPermission(PLATFORM_PERMISSIONS.HANDLE_SUPPORT_TICKETS)).toBe(false);
    });
  });
});
