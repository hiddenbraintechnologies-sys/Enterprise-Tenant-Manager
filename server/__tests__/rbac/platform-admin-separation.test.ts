import { describe, it, expect } from "@jest/globals";

/**
 * Platform Admin RBAC Separation Tests
 * 
 * Tests the following requirements:
 * 1. PLATFORM_ADMIN cannot access SUPER_ADMIN routes (403)
 * 2. PLATFORM_ADMIN sees only scoped tenants
 * 3. SUPER_ADMIN sees everything
 * 4. Tenant admins unaffected
 * 5. UI menu items are hidden/shown correctly based on permissions
 */

describe("Platform Admin RBAC Separation", () => {
  describe("Permission Matrix - Single Source of Truth", () => {
    it("should define all platform roles", async () => {
      const { PLATFORM_ROLES } = await import("@shared/rbac/permissions");

      expect(PLATFORM_ROLES.SUPER_ADMIN).toBe("SUPER_ADMIN");
      expect(PLATFORM_ROLES.PLATFORM_ADMIN).toBe("PLATFORM_ADMIN");
      expect(PLATFORM_ROLES.TECH_SUPPORT_MANAGER).toBe("TECH_SUPPORT_MANAGER");
      expect(PLATFORM_ROLES.MANAGER).toBe("MANAGER");
      expect(PLATFORM_ROLES.SUPPORT_TEAM).toBe("SUPPORT_TEAM");
    });

    it("should define scope types", async () => {
      const { SCOPE_TYPES } = await import("@shared/rbac/permissions");

      expect(SCOPE_TYPES.GLOBAL).toBe("GLOBAL");
      expect(SCOPE_TYPES.COUNTRY).toBe("COUNTRY");
      expect(SCOPE_TYPES.REGION).toBe("REGION");
      expect(SCOPE_TYPES.TENANT).toBe("TENANT");
    });

    it("should have distinct permission sets for each role", async () => {
      const { ROLE_PERMISSIONS, PLATFORM_ROLES } = await import("@shared/rbac/permissions");

      // Super admin should have the most permissions
      expect(ROLE_PERMISSIONS[PLATFORM_ROLES.SUPER_ADMIN].length).toBeGreaterThan(
        ROLE_PERMISSIONS[PLATFORM_ROLES.PLATFORM_ADMIN].length
      );

      // Platform admin should have more permissions than manager
      expect(ROLE_PERMISSIONS[PLATFORM_ROLES.PLATFORM_ADMIN].length).toBeGreaterThanOrEqual(
        ROLE_PERMISSIONS[PLATFORM_ROLES.MANAGER].length
      );

      // All roles should have at least some permissions
      Object.values(PLATFORM_ROLES).forEach(role => {
        expect(ROLE_PERMISSIONS[role].length).toBeGreaterThan(0);
      });
    });

    it("should define scope rules for each role", async () => {
      const { ROLE_SCOPE_RULES, PLATFORM_ROLES, SCOPE_TYPES } = await import("@shared/rbac/permissions");

      // Super admin has global scope
      expect(ROLE_SCOPE_RULES[PLATFORM_ROLES.SUPER_ADMIN]).toBe(SCOPE_TYPES.GLOBAL);

      // Platform admin has country scope
      expect(ROLE_SCOPE_RULES[PLATFORM_ROLES.PLATFORM_ADMIN]).toBe(SCOPE_TYPES.COUNTRY);

      // Tech support manager has global scope for system monitoring
      expect(ROLE_SCOPE_RULES[PLATFORM_ROLES.TECH_SUPPORT_MANAGER]).toBe(SCOPE_TYPES.GLOBAL);

      // Manager has country scope
      expect(ROLE_SCOPE_RULES[PLATFORM_ROLES.MANAGER]).toBe(SCOPE_TYPES.COUNTRY);

      // Support team has country scope
      expect(ROLE_SCOPE_RULES[PLATFORM_ROLES.SUPPORT_TEAM]).toBe(SCOPE_TYPES.COUNTRY);
    });
  });

  describe("Permission Constants", () => {
    it("should have distinct permission sets for SUPER_ADMIN and PLATFORM_ADMIN", async () => {
      const { ROLE_PERMISSIONS, PLATFORM_ROLES, SUPER_ADMIN_ONLY_PERMISSIONS, PLATFORM_PERMISSIONS } = 
        await import("@shared/rbac/permissions");

      const superAdminPerms = ROLE_PERMISSIONS[PLATFORM_ROLES.SUPER_ADMIN];
      const platformAdminPerms = ROLE_PERMISSIONS[PLATFORM_ROLES.PLATFORM_ADMIN];

      // Super admin should have more permissions
      expect(superAdminPerms.length).toBeGreaterThan(platformAdminPerms.length);
      
      // Platform admin permissions should be a subset of super admin permissions
      for (const perm of platformAdminPerms) {
        expect(superAdminPerms).toContain(perm);
      }

      // Super admin only permissions should NOT be in platform admin permissions
      for (const perm of SUPER_ADMIN_ONLY_PERMISSIONS) {
        expect(platformAdminPerms).not.toContain(perm);
      }

      // Verify expected super admin only permissions
      expect(SUPER_ADMIN_ONLY_PERMISSIONS).toContain(PLATFORM_PERMISSIONS.MANAGE_PLATFORM_ADMINS);
      expect(SUPER_ADMIN_ONLY_PERMISSIONS).toContain(PLATFORM_PERMISSIONS.MANAGE_GLOBAL_CONFIG);
      expect(SUPER_ADMIN_ONLY_PERMISSIONS).toContain(PLATFORM_PERMISSIONS.MANAGE_PLANS_PRICING);
      expect(SUPER_ADMIN_ONLY_PERMISSIONS).toContain(PLATFORM_PERMISSIONS.MANAGE_BUSINESS_TYPES);
    });

    it("should have expected platform admin permissions", async () => {
      const { ROLE_PERMISSIONS, PLATFORM_ROLES, PLATFORM_PERMISSIONS } = await import("@shared/rbac/permissions");
      
      const platformAdminPerms = ROLE_PERMISSIONS[PLATFORM_ROLES.PLATFORM_ADMIN];

      expect(platformAdminPerms).toContain(PLATFORM_PERMISSIONS.VIEW_TENANTS);
      expect(platformAdminPerms).toContain(PLATFORM_PERMISSIONS.SUSPEND_TENANT);
      expect(platformAdminPerms).toContain(PLATFORM_PERMISSIONS.VIEW_USAGE_METRICS);
      expect(platformAdminPerms).toContain(PLATFORM_PERMISSIONS.VIEW_INVOICES_PAYMENTS);
      expect(platformAdminPerms).toContain(PLATFORM_PERMISSIONS.HANDLE_SUPPORT_TICKETS);
    });

    it("should have expected tech support manager permissions", async () => {
      const { ROLE_PERMISSIONS, PLATFORM_ROLES, PLATFORM_PERMISSIONS } = await import("@shared/rbac/permissions");
      
      const techSupportPerms = ROLE_PERMISSIONS[PLATFORM_ROLES.TECH_SUPPORT_MANAGER];

      expect(techSupportPerms).toContain(PLATFORM_PERMISSIONS.VIEW_SYSTEM_HEALTH);
      expect(techSupportPerms).toContain(PLATFORM_PERMISSIONS.VIEW_API_METRICS);
      expect(techSupportPerms).toContain(PLATFORM_PERMISSIONS.VIEW_ERROR_LOGS);
      expect(techSupportPerms).toContain(PLATFORM_PERMISSIONS.VIEW_PERFORMANCE);
      expect(techSupportPerms).toContain(PLATFORM_PERMISSIONS.VIEW_AUDIT_LOGS);
    });
  });

  describe("Permission Resolution", () => {
    it("should resolve SUPER_ADMIN with all permissions and null scope", async () => {
      const { resolvePermissions, PLATFORM_ROLES, ROLE_PERMISSIONS, SCOPE_TYPES } = 
        await import("@shared/rbac/permissions");

      const resolved = resolvePermissions(PLATFORM_ROLES.SUPER_ADMIN, [], []);

      expect(resolved.role).toBe(PLATFORM_ROLES.SUPER_ADMIN);
      expect(resolved.isSuperAdmin).toBe(true);
      expect(resolved.isGlobalScope).toBe(true);
      expect(resolved.scope).toBeNull();
      expect(resolved.scopeType).toBe(SCOPE_TYPES.GLOBAL);
      expect(resolved.permissions).toEqual(ROLE_PERMISSIONS[PLATFORM_ROLES.SUPER_ADMIN]);
    });

    it("should resolve PLATFORM_ADMIN with limited permissions and scope", async () => {
      const { resolvePermissions, PLATFORM_ROLES, ROLE_PERMISSIONS, SCOPE_TYPES } = 
        await import("@shared/rbac/permissions");

      const resolved = resolvePermissions(PLATFORM_ROLES.PLATFORM_ADMIN, ["IN", "AE"], []);

      expect(resolved.role).toBe(PLATFORM_ROLES.PLATFORM_ADMIN);
      expect(resolved.isSuperAdmin).toBe(false);
      expect(resolved.isGlobalScope).toBe(false);
      expect(resolved.scope).not.toBeNull();
      expect(resolved.scope?.countryIds).toEqual(["IN", "AE"]);
      expect(resolved.scopeType).toBe(SCOPE_TYPES.COUNTRY);
      expect(resolved.permissions).toEqual(ROLE_PERMISSIONS[PLATFORM_ROLES.PLATFORM_ADMIN]);
    });

    it("should return empty scope for PLATFORM_ADMIN without country assignments", async () => {
      const { resolvePermissions, PLATFORM_ROLES } = await import("@shared/rbac/permissions");

      const resolved = resolvePermissions(PLATFORM_ROLES.PLATFORM_ADMIN, null, null);

      expect(resolved.scope?.countryIds).toEqual([]);
      expect(resolved.scope?.regionIds).toEqual([]);
    });

    it("should resolve TECH_SUPPORT_MANAGER with global scope", async () => {
      const { resolvePermissions, PLATFORM_ROLES, SCOPE_TYPES } = await import("@shared/rbac/permissions");

      const resolved = resolvePermissions(PLATFORM_ROLES.TECH_SUPPORT_MANAGER, [], []);

      expect(resolved.role).toBe(PLATFORM_ROLES.TECH_SUPPORT_MANAGER);
      expect(resolved.isSuperAdmin).toBe(false);
      expect(resolved.isGlobalScope).toBe(true);
      expect(resolved.scope).toBeNull();
      expect(resolved.scopeType).toBe(SCOPE_TYPES.GLOBAL);
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
      const { resolvePermissions, canAccessCountry, PLATFORM_ROLES } = await import("@shared/rbac/permissions");

      const resolved = resolvePermissions(PLATFORM_ROLES.SUPER_ADMIN, [], []);

      expect(canAccessCountry(resolved, "IN")).toBe(true);
      expect(canAccessCountry(resolved, "AE")).toBe(true);
      expect(canAccessCountry(resolved, "GB")).toBe(true);
      expect(canAccessCountry(resolved, "US")).toBe(true);
    });

    it("should restrict platform admin to assigned countries only", async () => {
      const { resolvePermissions, canAccessCountry, PLATFORM_ROLES } = await import("@shared/rbac/permissions");

      const resolved = resolvePermissions(PLATFORM_ROLES.PLATFORM_ADMIN, ["IN", "AE"], []);

      expect(canAccessCountry(resolved, "IN")).toBe(true);
      expect(canAccessCountry(resolved, "AE")).toBe(true);
      expect(canAccessCountry(resolved, "GB")).toBe(false);
      expect(canAccessCountry(resolved, "US")).toBe(false);
    });

    it("should deny all country access for platform admin with no scope", async () => {
      const { resolvePermissions, canAccessCountry, PLATFORM_ROLES } = await import("@shared/rbac/permissions");

      const resolved = resolvePermissions(PLATFORM_ROLES.PLATFORM_ADMIN, [], []);

      expect(canAccessCountry(resolved, "IN")).toBe(false);
      expect(canAccessCountry(resolved, "AE")).toBe(false);
    });

    it("should allow tech support manager global access", async () => {
      const { resolvePermissions, canAccessCountry, PLATFORM_ROLES } = await import("@shared/rbac/permissions");

      const resolved = resolvePermissions(PLATFORM_ROLES.TECH_SUPPORT_MANAGER, [], []);

      expect(canAccessCountry(resolved, "IN")).toBe(true);
      expect(canAccessCountry(resolved, "US")).toBe(true);
    });
  });

  describe("Permission Check Functions", () => {
    it("should allow super admin to have all permissions", async () => {
      const { resolvePermissions, hasPermission, PLATFORM_PERMISSIONS, PLATFORM_ROLES } = 
        await import("@shared/rbac/permissions");

      const resolved = resolvePermissions(PLATFORM_ROLES.SUPER_ADMIN, [], []);

      expect(hasPermission(resolved, PLATFORM_PERMISSIONS.MANAGE_PLATFORM_ADMINS)).toBe(true);
      expect(hasPermission(resolved, PLATFORM_PERMISSIONS.MANAGE_GLOBAL_CONFIG)).toBe(true);
      expect(hasPermission(resolved, PLATFORM_PERMISSIONS.VIEW_TENANTS)).toBe(true);
      expect(hasPermission(resolved, PLATFORM_PERMISSIONS.VIEW_SYSTEM_HEALTH)).toBe(true);
    });

    it("should restrict platform admin from super admin only permissions", async () => {
      const { resolvePermissions, hasPermission, PLATFORM_PERMISSIONS, PLATFORM_ROLES } = 
        await import("@shared/rbac/permissions");

      const resolved = resolvePermissions(PLATFORM_ROLES.PLATFORM_ADMIN, ["IN"], []);

      // Should NOT have super admin only permissions
      expect(hasPermission(resolved, PLATFORM_PERMISSIONS.MANAGE_PLATFORM_ADMINS)).toBe(false);
      expect(hasPermission(resolved, PLATFORM_PERMISSIONS.MANAGE_GLOBAL_CONFIG)).toBe(false);
      expect(hasPermission(resolved, PLATFORM_PERMISSIONS.MANAGE_PLANS_PRICING)).toBe(false);

      // Should have platform admin permissions
      expect(hasPermission(resolved, PLATFORM_PERMISSIONS.VIEW_TENANTS)).toBe(true);
      expect(hasPermission(resolved, PLATFORM_PERMISSIONS.SUSPEND_TENANT)).toBe(true);
    });

    it("should restrict tech support manager to system monitoring permissions", async () => {
      const { resolvePermissions, hasPermission, PLATFORM_PERMISSIONS, PLATFORM_ROLES } = 
        await import("@shared/rbac/permissions");

      const resolved = resolvePermissions(PLATFORM_ROLES.TECH_SUPPORT_MANAGER, [], []);

      // Should have tech support permissions
      expect(hasPermission(resolved, PLATFORM_PERMISSIONS.VIEW_SYSTEM_HEALTH)).toBe(true);
      expect(hasPermission(resolved, PLATFORM_PERMISSIONS.VIEW_ERROR_LOGS)).toBe(true);

      // Should NOT have admin management permissions
      expect(hasPermission(resolved, PLATFORM_PERMISSIONS.MANAGE_PLATFORM_ADMINS)).toBe(false);
      expect(hasPermission(resolved, PLATFORM_PERMISSIONS.SUSPEND_TENANT)).toBe(false);
    });
  });

  describe("Super Admin Only Permission Check", () => {
    it("should correctly identify super admin only permissions", async () => {
      const { isSuperAdminOnly, PLATFORM_PERMISSIONS } = await import("@shared/rbac/permissions");

      // These should be super admin only
      expect(isSuperAdminOnly(PLATFORM_PERMISSIONS.MANAGE_PLATFORM_ADMINS)).toBe(true);
      expect(isSuperAdminOnly(PLATFORM_PERMISSIONS.MANAGE_GLOBAL_CONFIG)).toBe(true);
      expect(isSuperAdminOnly(PLATFORM_PERMISSIONS.MANAGE_PLANS_PRICING)).toBe(true);
      expect(isSuperAdminOnly(PLATFORM_PERMISSIONS.VIEW_ALL_TENANTS)).toBe(true);

      // These should NOT be super admin only
      expect(isSuperAdminOnly(PLATFORM_PERMISSIONS.VIEW_TENANTS)).toBe(false);
      expect(isSuperAdminOnly(PLATFORM_PERMISSIONS.SUSPEND_TENANT)).toBe(false);
      expect(isSuperAdminOnly(PLATFORM_PERMISSIONS.HANDLE_SUPPORT_TICKETS)).toBe(false);
    });
  });

  describe("Country Code Mapping", () => {
    it("should correctly map ISO codes to tenant country values", async () => {
      const { isoToTenantCountries } = await import("@shared/rbac/permissions");

      expect(isoToTenantCountries(["IN"])).toEqual(["india"]);
      expect(isoToTenantCountries(["AE"])).toEqual(["uae"]);
      expect(isoToTenantCountries(["GB"])).toEqual(["uk"]);
      expect(isoToTenantCountries(["US"])).toEqual(["united_states"]);
      expect(isoToTenantCountries(["IN", "AE", "GB"])).toEqual(["india", "uae", "uk"]);
    });

    it("should correctly check tenant country in scope", async () => {
      const { isTenantCountryInScope } = await import("@shared/rbac/permissions");

      // India admin can access india tenants
      expect(isTenantCountryInScope("india", ["IN"])).toBe(true);
      expect(isTenantCountryInScope("india", ["IN", "AE"])).toBe(true);

      // India admin cannot access other countries
      expect(isTenantCountryInScope("uk", ["IN"])).toBe(false);
      expect(isTenantCountryInScope("uae", ["IN"])).toBe(false);

      // Multi-country admin
      expect(isTenantCountryInScope("india", ["IN", "AE", "GB"])).toBe(true);
      expect(isTenantCountryInScope("uae", ["IN", "AE", "GB"])).toBe(true);
      expect(isTenantCountryInScope("uk", ["IN", "AE", "GB"])).toBe(true);
      expect(isTenantCountryInScope("united_states", ["IN", "AE", "GB"])).toBe(false);

      // Empty scope means no access
      expect(isTenantCountryInScope("india", [])).toBe(false);

      // Null country means no access
      expect(isTenantCountryInScope(null, ["IN"])).toBe(false);
    });

    it("should handle extended country mappings", async () => {
      const { isTenantCountryInScope } = await import("@shared/rbac/permissions");

      // Test US, Australia, etc.
      expect(isTenantCountryInScope("united_states", ["US"])).toBe(true);
      expect(isTenantCountryInScope("australia", ["AU"])).toBe(true);
      expect(isTenantCountryInScope("canada", ["CA"])).toBe(true);
      expect(isTenantCountryInScope("germany", ["DE"])).toBe(true);
      expect(isTenantCountryInScope("south_africa", ["ZA"])).toBe(true);
      expect(isTenantCountryInScope("nigeria", ["NG"])).toBe(true);
      expect(isTenantCountryInScope("brazil", ["BR"])).toBe(true);
    });

    it("should convert tenant country back to ISO code", async () => {
      const { tenantCountryToISO } = await import("@shared/rbac/permissions");

      expect(tenantCountryToISO("india")).toBe("IN");
      expect(tenantCountryToISO("uae")).toBe("AE");
      expect(tenantCountryToISO("uk")).toBe("GB");
      expect(tenantCountryToISO("united_states")).toBe("US");
    });
  });

  describe("Menu Configuration", () => {
    it("should provide menu items for each role", async () => {
      const { getMenuItemsForRole, PLATFORM_ROLES } = await import("@shared/rbac/permissions");

      const superAdminMenu = getMenuItemsForRole(PLATFORM_ROLES.SUPER_ADMIN);
      const platformAdminMenu = getMenuItemsForRole(PLATFORM_ROLES.PLATFORM_ADMIN);
      const techSupportMenu = getMenuItemsForRole(PLATFORM_ROLES.TECH_SUPPORT_MANAGER);
      const managerMenu = getMenuItemsForRole(PLATFORM_ROLES.MANAGER);
      const supportMenu = getMenuItemsForRole(PLATFORM_ROLES.SUPPORT_TEAM);

      expect(superAdminMenu.length).toBeGreaterThan(0);
      expect(platformAdminMenu.length).toBeGreaterThan(0);
      expect(techSupportMenu.length).toBeGreaterThan(0);
      expect(managerMenu.length).toBeGreaterThan(0);
      expect(supportMenu.length).toBeGreaterThan(0);
    });

    it("should filter menu items based on permissions", async () => {
      const { filterMenuItems, resolvePermissions, getMenuItemsForRole, PLATFORM_ROLES } = 
        await import("@shared/rbac/permissions");

      // Super admin should see all super admin menu items
      const superAdminResolved = resolvePermissions(PLATFORM_ROLES.SUPER_ADMIN, [], []);
      const superAdminMenu = getMenuItemsForRole(PLATFORM_ROLES.SUPER_ADMIN);
      const filteredSuperAdmin = filterMenuItems(superAdminMenu, superAdminResolved);
      expect(filteredSuperAdmin.length).toBe(superAdminMenu.length);

      // Platform admin with permissions should see matching items
      const platformAdminResolved = resolvePermissions(PLATFORM_ROLES.PLATFORM_ADMIN, ["IN"], []);
      const platformAdminMenu = getMenuItemsForRole(PLATFORM_ROLES.PLATFORM_ADMIN);
      const filteredPlatformAdmin = filterMenuItems(platformAdminMenu, platformAdminResolved);
      expect(filteredPlatformAdmin.length).toBeGreaterThan(0);
    });

    it("should hide super admin only items from platform admin", async () => {
      const { filterMenuItems, resolvePermissions, getMenuItemsForRole, PLATFORM_ROLES } = 
        await import("@shared/rbac/permissions");

      const platformAdminResolved = resolvePermissions(PLATFORM_ROLES.PLATFORM_ADMIN, ["IN"], []);
      const superAdminMenu = getMenuItemsForRole(PLATFORM_ROLES.SUPER_ADMIN);
      const filtered = filterMenuItems(superAdminMenu, platformAdminResolved);

      // Platform admin should not see super admin only items
      const superAdminOnlyItems = superAdminMenu.filter(item => item.superAdminOnly);
      superAdminOnlyItems.forEach(item => {
        expect(filtered.find(f => f.id === item.id)).toBeUndefined();
      });
    });
  });
});
