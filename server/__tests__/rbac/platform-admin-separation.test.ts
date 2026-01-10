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

      expect(PLATFORM_ROLES.SUPER_ADMIN).toBe("PLATFORM_SUPER_ADMIN");
      expect(PLATFORM_ROLES.PLATFORM_ADMIN).toBe("PLATFORM_ADMIN");
      expect(PLATFORM_ROLES.TECH_SUPPORT_MANAGER).toBe("TECH_SUPPORT_MANAGER");
      expect(PLATFORM_ROLES.MANAGER).toBe("MANAGER");
      expect(PLATFORM_ROLES.SUPPORT_TEAM).toBe("SUPPORT_TEAM");
    });

    it("should define tenant roles", async () => {
      const { TENANT_ROLES } = await import("@shared/rbac/permissions");

      expect(TENANT_ROLES.ADMIN).toBe("TENANT_ADMIN");
      expect(TENANT_ROLES.STAFF).toBe("TENANT_STAFF");
      expect(TENANT_ROLES.VIEWER).toBe("TENANT_VIEWER");
    });

    it("should define scope types", async () => {
      const { SCOPE_TYPES } = await import("@shared/rbac/permissions");

      expect(SCOPE_TYPES.GLOBAL).toBe("GLOBAL");
      expect(SCOPE_TYPES.COUNTRY).toBe("COUNTRY");
      expect(SCOPE_TYPES.REGION).toBe("REGION");
      expect(SCOPE_TYPES.TENANT).toBe("TENANT");
    });

    it("should have role definitions for all roles", async () => {
      const { ROLE_DEFINITIONS } = await import("@shared/rbac/permissions");

      // Platform roles
      expect(ROLE_DEFINITIONS.PLATFORM_SUPER_ADMIN).toBeDefined();
      expect(ROLE_DEFINITIONS.PLATFORM_ADMIN).toBeDefined();
      expect(ROLE_DEFINITIONS.TECH_SUPPORT_MANAGER).toBeDefined();
      expect(ROLE_DEFINITIONS.MANAGER).toBeDefined();
      expect(ROLE_DEFINITIONS.SUPPORT_TEAM).toBeDefined();

      // Tenant roles
      expect(ROLE_DEFINITIONS.TENANT_ADMIN).toBeDefined();
      expect(ROLE_DEFINITIONS.TENANT_STAFF).toBeDefined();
      expect(ROLE_DEFINITIONS.TENANT_VIEWER).toBeDefined();
    });

    it("should define scope types in role definitions", async () => {
      const { ROLE_DEFINITIONS } = await import("@shared/rbac/permissions");

      // Super admin has global scope
      expect(ROLE_DEFINITIONS.PLATFORM_SUPER_ADMIN.scopeType).toBe("GLOBAL");

      // Platform admin has country scope
      expect(ROLE_DEFINITIONS.PLATFORM_ADMIN.scopeType).toBe("COUNTRY");

      // Tech support manager has global scope for system monitoring
      expect(ROLE_DEFINITIONS.TECH_SUPPORT_MANAGER.scopeType).toBe("GLOBAL");

      // Manager has country scope
      expect(ROLE_DEFINITIONS.MANAGER.scopeType).toBe("COUNTRY");

      // Support team has country scope
      expect(ROLE_DEFINITIONS.SUPPORT_TEAM.scopeType).toBe("COUNTRY");

      // Tenant roles have tenant scope
      expect(ROLE_DEFINITIONS.TENANT_ADMIN.scopeType).toBe("TENANT");
      expect(ROLE_DEFINITIONS.TENANT_STAFF.scopeType).toBe("TENANT");
      expect(ROLE_DEFINITIONS.TENANT_VIEWER.scopeType).toBe("TENANT");
    });
  });

  describe("Permission Constants", () => {
    it("should have distinct permission sets for SUPER_ADMIN and PLATFORM_ADMIN", async () => {
      const { ROLE_DEFINITIONS, SUPER_ADMIN_ONLY_PERMISSIONS, Permissions } = 
        await import("@shared/rbac/permissions");

      const superAdminPerms = ROLE_DEFINITIONS.PLATFORM_SUPER_ADMIN.permissions;
      const platformAdminPerms = ROLE_DEFINITIONS.PLATFORM_ADMIN.permissions;

      // Super admin should have more permissions
      expect(superAdminPerms.length).toBeGreaterThan(platformAdminPerms.length);

      // Super admin only permissions should NOT be in platform admin permissions
      for (const perm of SUPER_ADMIN_ONLY_PERMISSIONS) {
        expect(platformAdminPerms).not.toContain(perm);
      }

      // Verify expected super admin only permissions
      expect(SUPER_ADMIN_ONLY_PERMISSIONS).toContain(Permissions.MANAGE_PLATFORM_ADMINS);
      expect(SUPER_ADMIN_ONLY_PERMISSIONS).toContain(Permissions.MANAGE_GLOBAL_CONFIG);
      expect(SUPER_ADMIN_ONLY_PERMISSIONS).toContain(Permissions.MANAGE_PLANS_PRICING);
      expect(SUPER_ADMIN_ONLY_PERMISSIONS).toContain(Permissions.MANAGE_BUSINESS_TYPES);
    });

    it("should have expected platform admin permissions", async () => {
      const { ROLE_DEFINITIONS, Permissions } = await import("@shared/rbac/permissions");
      
      const platformAdminPerms = ROLE_DEFINITIONS.PLATFORM_ADMIN.permissions;

      expect(platformAdminPerms).toContain(Permissions.VIEW_TENANTS_SCOPED);
      expect(platformAdminPerms).toContain(Permissions.SUSPEND_TENANT_SCOPED);
      expect(platformAdminPerms).toContain(Permissions.VIEW_INVOICES_PAYMENTS);
      expect(platformAdminPerms).toContain(Permissions.HANDLE_SUPPORT_TICKETS);
    });

    it("should have expected tech support manager permissions", async () => {
      const { ROLE_DEFINITIONS, Permissions } = await import("@shared/rbac/permissions");
      
      const techSupportPerms = ROLE_DEFINITIONS.TECH_SUPPORT_MANAGER.permissions;

      expect(techSupportPerms).toContain(Permissions.VIEW_SYSTEM_HEALTH);
      expect(techSupportPerms).toContain(Permissions.VIEW_API_METRICS);
      expect(techSupportPerms).toContain(Permissions.VIEW_ERROR_LOGS);
      expect(techSupportPerms).toContain(Permissions.VIEW_PERFORMANCE);
      expect(techSupportPerms).toContain(Permissions.VIEW_AUDIT_LOGS);
    });

    it("should have expected tenant admin permissions", async () => {
      const { ROLE_DEFINITIONS, Permissions } = await import("@shared/rbac/permissions");
      
      const tenantAdminPerms = ROLE_DEFINITIONS.TENANT_ADMIN.permissions;

      expect(tenantAdminPerms).toContain(Permissions.MANAGE_USERS);
      expect(tenantAdminPerms).toContain(Permissions.VIEW_DASHBOARD);
      expect(tenantAdminPerms).toContain(Permissions.MANAGE_PROJECTS);
      expect(tenantAdminPerms).toContain(Permissions.MANAGE_TIMESHEETS);
      expect(tenantAdminPerms).toContain(Permissions.VIEW_INVOICES);
      expect(tenantAdminPerms).toContain(Permissions.CREATE_INVOICES);
      expect(tenantAdminPerms).toContain(Permissions.RECORD_PAYMENTS);
      expect(tenantAdminPerms).toContain(Permissions.VIEW_ANALYTICS);
      expect(tenantAdminPerms).toContain(Permissions.MANAGE_SETTINGS);
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

  describe("Simple Permission Check", () => {
    it("should check permissions with hasPermission function", async () => {
      const { hasPermission, Permissions } = await import("@shared/rbac/permissions");

      // Super admin should have all permissions
      expect(hasPermission("PLATFORM_SUPER_ADMIN", Permissions.MANAGE_PLATFORM_ADMINS)).toBe(true);
      expect(hasPermission("PLATFORM_SUPER_ADMIN", Permissions.VIEW_ALL_TENANTS)).toBe(true);

      // Platform admin should not have super admin only permissions
      expect(hasPermission("PLATFORM_ADMIN", Permissions.MANAGE_PLATFORM_ADMINS)).toBe(false);
      expect(hasPermission("PLATFORM_ADMIN", Permissions.VIEW_TENANTS_SCOPED)).toBe(true);

      // Tech support should have system permissions
      expect(hasPermission("TECH_SUPPORT_MANAGER", Permissions.VIEW_SYSTEM_HEALTH)).toBe(true);
      expect(hasPermission("TECH_SUPPORT_MANAGER", Permissions.MANAGE_PLATFORM_ADMINS)).toBe(false);

      // Tenant admin should have tenant permissions
      expect(hasPermission("TENANT_ADMIN", Permissions.MANAGE_PROJECTS)).toBe(true);
      expect(hasPermission("TENANT_ADMIN", Permissions.CREATE_INVOICES)).toBe(true);

      // Tenant staff should have limited permissions
      expect(hasPermission("TENANT_STAFF", Permissions.VIEW_DASHBOARD)).toBe(true);
      expect(hasPermission("TENANT_STAFF", Permissions.CREATE_INVOICES)).toBe(false);

      // Tenant viewer should have very limited permissions
      expect(hasPermission("TENANT_VIEWER", Permissions.VIEW_DASHBOARD)).toBe(true);
      expect(hasPermission("TENANT_VIEWER", Permissions.MANAGE_PROJECTS)).toBe(false);
    });
  });

  describe("Scope Requirements", () => {
    it("should return correct scope type for each role", async () => {
      const { requiresScope } = await import("@shared/rbac/permissions");

      expect(requiresScope("PLATFORM_SUPER_ADMIN")).toBe("GLOBAL");
      expect(requiresScope("PLATFORM_ADMIN")).toBe("COUNTRY");
      expect(requiresScope("TECH_SUPPORT_MANAGER")).toBe("GLOBAL");
      expect(requiresScope("MANAGER")).toBe("COUNTRY");
      expect(requiresScope("SUPPORT_TEAM")).toBe("COUNTRY");
      expect(requiresScope("TENANT_ADMIN")).toBe("TENANT");
      expect(requiresScope("TENANT_STAFF")).toBe("TENANT");
      expect(requiresScope("TENANT_VIEWER")).toBe("TENANT");
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

  describe("Super Admin Only Permission Check", () => {
    it("should correctly identify super admin only permissions", async () => {
      const { isSuperAdminOnly, Permissions } = await import("@shared/rbac/permissions");

      // These should be super admin only
      expect(isSuperAdminOnly(Permissions.MANAGE_PLATFORM_ADMINS)).toBe(true);
      expect(isSuperAdminOnly(Permissions.MANAGE_GLOBAL_CONFIG)).toBe(true);
      expect(isSuperAdminOnly(Permissions.MANAGE_PLANS_PRICING)).toBe(true);
      expect(isSuperAdminOnly(Permissions.VIEW_ALL_TENANTS)).toBe(true);

      // These should NOT be super admin only
      expect(isSuperAdminOnly(Permissions.VIEW_TENANTS_SCOPED)).toBe(false);
      expect(isSuperAdminOnly(Permissions.SUSPEND_TENANT_SCOPED)).toBe(false);
      expect(isSuperAdminOnly(Permissions.HANDLE_SUPPORT_TICKETS)).toBe(false);
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
