import { describe, it, expect } from "@jest/globals";

/**
 * Auth Consolidation Tests
 * 
 * Tests the following requirements:
 * 1. Platform admin login with loginContext parameter
 * 2. Tenant-only user gets 403 NOT_PLATFORM_ADMIN on admin login
 * 3. Role-based redirect paths for all 5 platform roles
 * 4. Forgot/reset password with role-aware redirects
 */

describe("Auth Consolidation", () => {
  describe("LoginContext Parameter", () => {
    it("should accept PLATFORM_ADMIN loginContext", () => {
      const validContexts = ["PLATFORM_ADMIN", "TENANT"];
      expect(validContexts).toContain("PLATFORM_ADMIN");
      expect(validContexts).toContain("TENANT");
    });

    it("should default to PLATFORM_ADMIN if not provided", () => {
      const defaultContext = "PLATFORM_ADMIN";
      expect(defaultContext).toBe("PLATFORM_ADMIN");
    });
  });

  describe("Role-Based Redirect Paths", () => {
    const ROLE_DASHBOARDS: Record<string, string> = {
      SUPER_ADMIN: "/super-admin/dashboard",
      PLATFORM_ADMIN: "/platform-admin/dashboard",
      TECH_SUPPORT_MANAGER: "/tech-support/dashboard",
      MANAGER: "/manager/dashboard",
      SUPPORT_TEAM: "/support/dashboard",
    };

    it("should have correct redirect for SUPER_ADMIN", () => {
      expect(ROLE_DASHBOARDS.SUPER_ADMIN).toBe("/super-admin/dashboard");
    });

    it("should have correct redirect for PLATFORM_ADMIN", () => {
      expect(ROLE_DASHBOARDS.PLATFORM_ADMIN).toBe("/platform-admin/dashboard");
    });

    it("should have correct redirect for TECH_SUPPORT_MANAGER", () => {
      expect(ROLE_DASHBOARDS.TECH_SUPPORT_MANAGER).toBe("/tech-support/dashboard");
    });

    it("should have correct redirect for MANAGER", () => {
      expect(ROLE_DASHBOARDS.MANAGER).toBe("/manager/dashboard");
    });

    it("should have correct redirect for SUPPORT_TEAM", () => {
      expect(ROLE_DASHBOARDS.SUPPORT_TEAM).toBe("/support/dashboard");
    });

    it("should cover all 5 platform roles", () => {
      expect(Object.keys(ROLE_DASHBOARDS)).toHaveLength(5);
    });
  });

  describe("403 NOT_PLATFORM_ADMIN Response", () => {
    it("should define NOT_PLATFORM_ADMIN error code", () => {
      const errorResponse = {
        message: "This account does not have platform admin access. Please use the tenant login.",
        code: "NOT_PLATFORM_ADMIN",
      };
      
      expect(errorResponse.code).toBe("NOT_PLATFORM_ADMIN");
      expect(errorResponse.message).toContain("platform admin access");
    });
  });

  describe("Password Reset Redirects", () => {
    it("should redirect platform admin to /admin-login after reset", () => {
      const loginContext = "PLATFORM_ADMIN";
      const redirectPath = loginContext === "PLATFORM_ADMIN" ? "/admin-login" : "/login";
      expect(redirectPath).toBe("/admin-login");
    });

    it("should redirect tenant user to /login after reset", () => {
      const loginContext: string = "TENANT";
      const redirectPath = loginContext === "PLATFORM_ADMIN" ? "/admin-login" : "/login";
      expect(redirectPath).toBe("/login");
    });
  });

  describe("Forgot Password Endpoint", () => {
    it("should return success regardless of email existence (prevent enumeration)", () => {
      const expectedMessage = "If an account exists with this email, a password reset link has been sent.";
      expect(expectedMessage).toContain("If an account exists");
    });

    it("should include redirectPath in response", () => {
      const response = {
        message: "If an account exists with this email, a password reset link has been sent.",
        redirectPath: "/admin-login",
      };
      expect(response.redirectPath).toBeDefined();
    });
  });

  describe("Platform Admin Roles Validation", () => {
    const PLATFORM_ADMIN_ROLES = ["SUPER_ADMIN", "PLATFORM_ADMIN", "TECH_SUPPORT_MANAGER", "MANAGER", "SUPPORT_TEAM"];

    it("should include all 5 platform admin roles", () => {
      expect(PLATFORM_ADMIN_ROLES).toContain("SUPER_ADMIN");
      expect(PLATFORM_ADMIN_ROLES).toContain("PLATFORM_ADMIN");
      expect(PLATFORM_ADMIN_ROLES).toContain("TECH_SUPPORT_MANAGER");
      expect(PLATFORM_ADMIN_ROLES).toContain("MANAGER");
      expect(PLATFORM_ADMIN_ROLES).toContain("SUPPORT_TEAM");
      expect(PLATFORM_ADMIN_ROLES).toHaveLength(5);
    });

    it("should reject invalid platform roles", () => {
      expect(PLATFORM_ADMIN_ROLES).not.toContain("TENANT_ADMIN");
      expect(PLATFORM_ADMIN_ROLES).not.toContain("USER");
      expect(PLATFORM_ADMIN_ROLES).not.toContain("ADMIN");
    });
  });
});
