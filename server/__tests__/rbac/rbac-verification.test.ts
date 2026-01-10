/**
 * RBAC Production Verification Tests
 * 
 * Production validation for RBAC + scope enforcement
 * Tests UI gating, API behavior, and error responses
 */

import { describe, it, expect, jest } from "@jest/globals";

describe("RBAC Production Verification", () => {
  
  describe("1. Test User Configuration", () => {
    it("PLATFORM_SUPER_ADMIN role exists and has global scope", async () => {
      const { PLATFORM_ROLES, requiresScope } = await import("@shared/rbac/permissions");
      const role = PLATFORM_ROLES.SUPER_ADMIN;
      expect(role).toBe("PLATFORM_SUPER_ADMIN");
      expect(requiresScope(role)).toBe("GLOBAL");
    });

    it("PLATFORM_ADMIN role exists and has country scope", async () => {
      const { PLATFORM_ROLES, requiresScope } = await import("@shared/rbac/permissions");
      const role = PLATFORM_ROLES.PLATFORM_ADMIN;
      expect(role).toBe("PLATFORM_ADMIN");
      expect(requiresScope(role)).toBe("COUNTRY");
    });

    it("India (IN) is a valid country code for scope", () => {
      const testScope = { countryIds: ["IN"], regionIds: [] };
      expect(testScope.countryIds).toContain("IN");
    });
  });

  describe("2. UI Gating - Menu Visibility", () => {
    it("PLATFORM_SUPER_ADMIN sees all menus", async () => {
      const { PLATFORM_ROLES, getMenuItemsForRole } = await import("@shared/rbac/permissions");
      const superAdminMenus = getMenuItemsForRole(PLATFORM_ROLES.SUPER_ADMIN);
      const menuTitles = superAdminMenus.map((m: { title: string }) => m.title);
      
      expect(menuTitles).toContain("Dashboard");
      expect(menuTitles).toContain("Tenants");
      expect(menuTitles).toContain("Platform Admins");
      expect(menuTitles).toContain("System Settings");
      expect(menuTitles).toContain("Regions");
    });

    it("PLATFORM_ADMIN does NOT see Plans/Pricing menu", async () => {
      const { PLATFORM_ROLES, getMenuItemsForRole } = await import("@shared/rbac/permissions");
      const platformAdminMenus = getMenuItemsForRole(PLATFORM_ROLES.PLATFORM_ADMIN);
      const menuTitles = platformAdminMenus.map((m: { title: string }) => m.title);
      expect(menuTitles).not.toContain("Plans & Pricing");
      expect(menuTitles).not.toContain("Plans");
    });

    it("PLATFORM_ADMIN does NOT see Admin Management menu", async () => {
      const { PLATFORM_ROLES, getMenuItemsForRole } = await import("@shared/rbac/permissions");
      const platformAdminMenus = getMenuItemsForRole(PLATFORM_ROLES.PLATFORM_ADMIN);
      const menuTitles = platformAdminMenus.map((m: { title: string }) => m.title);
      expect(menuTitles).not.toContain("Platform Admins");
      expect(menuTitles).not.toContain("Admin Management");
    });

    it("PLATFORM_ADMIN does NOT see Countries/Regions menu", async () => {
      const { PLATFORM_ROLES, getMenuItemsForRole } = await import("@shared/rbac/permissions");
      const platformAdminMenus = getMenuItemsForRole(PLATFORM_ROLES.PLATFORM_ADMIN);
      const menuTitles = platformAdminMenus.map((m: { title: string }) => m.title);
      expect(menuTitles).not.toContain("Regions");
      expect(menuTitles).not.toContain("Countries & Regions");
    });

    it("PLATFORM_ADMIN does NOT see Global Config menu", async () => {
      const { PLATFORM_ROLES, getMenuItemsForRole } = await import("@shared/rbac/permissions");
      const platformAdminMenus = getMenuItemsForRole(PLATFORM_ROLES.PLATFORM_ADMIN);
      const menuTitles = platformAdminMenus.map((m: { title: string }) => m.title);
      expect(menuTitles).not.toContain("System Settings");
    });

    it("PLATFORM_ADMIN sees permitted menus (Dashboard, Tenants)", async () => {
      const { PLATFORM_ROLES, getMenuItemsForRole } = await import("@shared/rbac/permissions");
      const platformAdminMenus = getMenuItemsForRole(PLATFORM_ROLES.PLATFORM_ADMIN);
      const menuTitles = platformAdminMenus.map((m: { title: string }) => m.title);
      expect(menuTitles).toContain("Dashboard");
      expect(menuTitles).toContain("Tenants");
    });
  });

  describe("3. API Behavior - Permission Enforcement", () => {
    
    describe("3.1 PLATFORM_ADMIN accessing SUPER_ADMIN endpoints returns 403", () => {
      it("requireSuperAdminOnly blocks PLATFORM_ADMIN with 403", async () => {
        const { requireSuperAdminOnly } = await import("../../rbac/guards");
        
        const req = {
          platformAdminContext: {
            platformAdmin: { id: "test-pa", role: "PLATFORM_ADMIN", email: "test@example.com" },
            scope: { countryIds: ["IN"], regionIds: [] },
          },
        };
        const res = {
          status: jest.fn().mockReturnThis() as jest.Mock,
          json: jest.fn().mockReturnThis() as jest.Mock,
        };
        const next = jest.fn();

        requireSuperAdminOnly()(req as any, res as any, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
          message: expect.any(String),
          code: expect.any(String),
        }));
        expect(next).not.toHaveBeenCalled();
      });

      it("requirePermission blocks PLATFORM_ADMIN from plans:manage with 403", async () => {
        const { requirePermission } = await import("../../rbac/guards");
        const { Permissions } = await import("@shared/rbac/permissions");
        
        const req = {
          platformAdminContext: {
            platformAdmin: { id: "test-pa", role: "PLATFORM_ADMIN", email: "test@example.com" },
            scope: { countryIds: ["IN"], regionIds: [] },
          },
        };
        const res = {
          status: jest.fn().mockReturnThis() as jest.Mock,
          json: jest.fn().mockReturnThis() as jest.Mock,
        };
        const next = jest.fn();

        requirePermission(Permissions.PLANS_MANAGE)(req as any, res as any, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(next).not.toHaveBeenCalled();
      });

      it("requirePermission blocks PLATFORM_ADMIN from admins:manage with 403", async () => {
        const { requirePermission } = await import("../../rbac/guards");
        const { Permissions } = await import("@shared/rbac/permissions");
        
        const req = {
          platformAdminContext: {
            platformAdmin: { id: "test-pa", role: "PLATFORM_ADMIN", email: "test@example.com" },
            scope: { countryIds: ["IN"], regionIds: [] },
          },
        };
        const res = {
          status: jest.fn().mockReturnThis() as jest.Mock,
          json: jest.fn().mockReturnThis() as jest.Mock,
        };
        const next = jest.fn();

        requirePermission(Permissions.ADMINS_MANAGE)(req as any, res as any, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(next).not.toHaveBeenCalled();
      });

      it("PLATFORM_SUPER_ADMIN passes requireSuperAdminOnly", async () => {
        const { requireSuperAdminOnly } = await import("../../rbac/guards");
        
        const req = {
          platformAdminContext: {
            platformAdmin: { id: "test-super", role: "PLATFORM_SUPER_ADMIN", email: "super@example.com" },
          },
        };
        const res = {
          status: jest.fn().mockReturnThis() as jest.Mock,
          json: jest.fn().mockReturnThis() as jest.Mock,
        };
        const next = jest.fn();

        requireSuperAdminOnly()(req as any, res as any, next);

        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
      });

      it("Legacy SUPER_ADMIN role also passes (role normalization)", async () => {
        const { requireSuperAdminOnly } = await import("../../rbac/guards");
        
        const req = {
          platformAdminContext: {
            platformAdmin: { id: "test-super", role: "SUPER_ADMIN", email: "super@example.com" },
          },
        };
        const res = {
          status: jest.fn().mockReturnThis() as jest.Mock,
          json: jest.fn().mockReturnThis() as jest.Mock,
        };
        const next = jest.fn();

        requireSuperAdminOnly()(req as any, res as any, next);

        expect(next).toHaveBeenCalled();
      });
    });

    describe("3.2 Auth missing returns 401", () => {
      it("requireAuth returns 401 when no auth context", async () => {
        const { requireAuth } = await import("../../rbac/guards");
        
        const req = {};
        const res = {
          status: jest.fn().mockReturnThis() as jest.Mock,
          json: jest.fn().mockReturnThis() as jest.Mock,
        };
        const next = jest.fn();

        requireAuth()(req as any, res as any, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
          message: "Authentication required",
          code: "UNAUTHORIZED",
        }));
        expect(next).not.toHaveBeenCalled();
      });

      it("requirePermission returns 403 NOT_AUTHENTICATED when no auth context", async () => {
        const { requirePermission } = await import("../../rbac/guards");
        const { Permissions } = await import("@shared/rbac/permissions");
        
        const req = {};
        const res = {
          status: jest.fn().mockReturnThis() as jest.Mock,
          json: jest.fn().mockReturnThis() as jest.Mock,
        };
        const next = jest.fn();

        requirePermission(Permissions.TENANTS_VIEW)(req as any, res as any, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
          message: "Authentication required",
          code: "NOT_AUTHENTICATED",
        }));
      });
    });

    describe("3.3 Error payload uses { message, code } format", () => {
      it("401 response has correct format", async () => {
        const { requireAuth } = await import("../../rbac/guards");
        
        const req = {};
        const res = {
          status: jest.fn().mockReturnThis() as jest.Mock,
          json: jest.fn().mockReturnThis() as jest.Mock,
        };
        const next = jest.fn();

        requireAuth()(req as any, res as any, next);

        const jsonCall = (res.json as jest.Mock).mock.calls[0][0];
        expect(jsonCall).toHaveProperty("message");
        expect(jsonCall).toHaveProperty("code");
        expect(typeof jsonCall.message).toBe("string");
        expect(typeof jsonCall.code).toBe("string");
      });

      it("403 response has correct format", async () => {
        const { requireSuperAdminOnly } = await import("../../rbac/guards");
        
        const req = {
          platformAdminContext: {
            platformAdmin: { id: "test-pa", role: "PLATFORM_ADMIN", email: "test@example.com" },
          },
        };
        const res = {
          status: jest.fn().mockReturnThis() as jest.Mock,
          json: jest.fn().mockReturnThis() as jest.Mock,
        };
        const next = jest.fn();

        requireSuperAdminOnly()(req as any, res as any, next);

        const jsonCall = (res.json as jest.Mock).mock.calls[0][0];
        expect(jsonCall).toHaveProperty("message");
        expect(jsonCall).toHaveProperty("code");
        expect(typeof jsonCall.message).toBe("string");
        expect(typeof jsonCall.code).toBe("string");
      });
    });

    describe("3.4 Scope context derivation", () => {
      it("getScopeContext returns correct scope for PLATFORM_ADMIN with IN", async () => {
        const { getScopeContext } = await import("../../rbac/guards");
        
        const req = {
          platformAdminContext: {
            platformAdmin: { id: "test-pa", role: "PLATFORM_ADMIN", email: "test@example.com" },
            scope: { countryIds: ["IN"], regionIds: [] },
          },
        };

        const scopeContext = getScopeContext(req as any);

        expect(scopeContext).not.toBeNull();
        expect(scopeContext?.scopeType).toBe("COUNTRY");
        expect(scopeContext?.allowedCountryIds).toContain("IN");
        expect(scopeContext?.isSuperAdmin).toBe(false);
        expect(scopeContext?.isPlatformAdmin).toBe(true);
      });

      it("getScopeContext returns GLOBAL scope for PLATFORM_SUPER_ADMIN", async () => {
        const { getScopeContext } = await import("../../rbac/guards");
        
        const req = {
          platformAdminContext: {
            platformAdmin: { id: "test-super", role: "PLATFORM_SUPER_ADMIN", email: "super@example.com" },
          },
        };

        const scopeContext = getScopeContext(req as any);

        expect(scopeContext).not.toBeNull();
        expect(scopeContext?.scopeType).toBe("GLOBAL");
        expect(scopeContext?.isSuperAdmin).toBe(true);
      });

      it("getScopeContext returns tenant scope for tenant users", async () => {
        const { getScopeContext } = await import("../../rbac/guards");
        
        const req = {
          context: {
            user: { id: "user-1" },
            tenant: { id: "tenant-1" },
            role: { name: "TENANT_ADMIN" },
          },
        };

        const scopeContext = getScopeContext(req as any);

        expect(scopeContext).not.toBeNull();
        expect(scopeContext?.scopeType).toBe("TENANT");
        expect(scopeContext?.tenantId).toBe("tenant-1");
        expect(scopeContext?.isTenantUser).toBe(true);
        expect(scopeContext?.isPlatformAdmin).toBe(false);
      });
    });
  });

  describe("4. Permission Matrix Verification", () => {
    it("PLATFORM_SUPER_ADMIN has all platform permissions", async () => {
      const { ROLE_DEFINITIONS, Permissions } = await import("@shared/rbac/permissions");
      const permissions = ROLE_DEFINITIONS.PLATFORM_SUPER_ADMIN.permissions;
      expect(permissions).toContain(Permissions.MANAGE_PLATFORM_ADMINS);
      expect(permissions).toContain(Permissions.MANAGE_GLOBAL_CONFIG);
      expect(permissions).toContain(Permissions.MANAGE_PLANS_PRICING);
      expect(permissions).toContain(Permissions.MANAGE_COUNTRIES_REGIONS);
      expect(permissions).toContain(Permissions.VIEW_ALL_TENANTS);
    });

    it("PLATFORM_ADMIN has VIEW_TENANTS_SCOPED but not MANAGE_PLATFORM_ADMINS", async () => {
      const { hasPermission, Permissions, PLATFORM_ROLES } = await import("@shared/rbac/permissions");
      expect(hasPermission(PLATFORM_ROLES.PLATFORM_ADMIN, Permissions.VIEW_TENANTS_SCOPED)).toBe(true);
      expect(hasPermission(PLATFORM_ROLES.PLATFORM_ADMIN, Permissions.MANAGE_PLATFORM_ADMINS)).toBe(false);
    });

    it("PLATFORM_ADMIN cannot manage plans", async () => {
      const { hasPermission, Permissions, PLATFORM_ROLES } = await import("@shared/rbac/permissions");
      expect(hasPermission(PLATFORM_ROLES.PLATFORM_ADMIN, Permissions.MANAGE_PLANS_PRICING)).toBe(false);
    });

    it("PLATFORM_ADMIN cannot manage countries/regions", async () => {
      const { hasPermission, Permissions, PLATFORM_ROLES } = await import("@shared/rbac/permissions");
      expect(hasPermission(PLATFORM_ROLES.PLATFORM_ADMIN, Permissions.MANAGE_COUNTRIES_REGIONS)).toBe(false);
    });

    it("PLATFORM_ADMIN cannot manage global config", async () => {
      const { hasPermission, Permissions, PLATFORM_ROLES } = await import("@shared/rbac/permissions");
      expect(hasPermission(PLATFORM_ROLES.PLATFORM_ADMIN, Permissions.MANAGE_GLOBAL_CONFIG)).toBe(false);
    });

    it("PLATFORM_ADMIN cannot manage platform admins", async () => {
      const { hasPermission, Permissions, PLATFORM_ROLES } = await import("@shared/rbac/permissions");
      expect(hasPermission(PLATFORM_ROLES.PLATFORM_ADMIN, Permissions.MANAGE_PLATFORM_ADMINS)).toBe(false);
    });
  });

  describe("5. Tenant Role Support", () => {
    it("TENANT_ADMIN can view dashboard and manage users", async () => {
      const { hasPermission, Permissions } = await import("@shared/rbac/permissions");
      expect(hasPermission("TENANT_ADMIN", Permissions.VIEW_DASHBOARD)).toBe(true);
      expect(hasPermission("TENANT_ADMIN", Permissions.MANAGE_USERS)).toBe(true);
    });

    it("TENANT_STAFF can manage projects and timesheets", async () => {
      const { hasPermission, Permissions } = await import("@shared/rbac/permissions");
      expect(hasPermission("TENANT_STAFF", Permissions.VIEW_DASHBOARD)).toBe(true);
      expect(hasPermission("TENANT_STAFF", Permissions.MANAGE_PROJECTS)).toBe(true);
      expect(hasPermission("TENANT_STAFF", Permissions.MANAGE_PLATFORM_ADMINS)).toBe(false);
    });

    it("TENANT_VIEWER has read-only dashboard access", async () => {
      const { hasPermission, Permissions } = await import("@shared/rbac/permissions");
      expect(hasPermission("TENANT_VIEWER", Permissions.VIEW_DASHBOARD)).toBe(true);
      expect(hasPermission("TENANT_VIEWER", Permissions.MANAGE_PROJECTS)).toBe(false);
    });
  });
});
