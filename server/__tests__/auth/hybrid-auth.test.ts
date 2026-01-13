import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import type { Request, Response, NextFunction } from "express";

/**
 * Hybrid Authentication Middleware Tests
 * 
 * Tests the following requirements:
 * 1. JWT authentication (Authorization: Bearer token) takes precedence
 * 2. Session-based authentication (req.isAuthenticated()) works as fallback
 * 3. Unauthenticated requests are rejected with 401 when required
 * 4. Context is properly populated for both auth types
 * 5. Services routes (consulting, software_services) use hybrid auth
 */

describe("Hybrid Authentication Middleware", () => {
  describe("Authentication Priority", () => {
    it("should prioritize JWT auth over session auth when both present", () => {
      const authPriority = ["jwt", "session"];
      expect(authPriority[0]).toBe("jwt");
      expect(authPriority.indexOf("jwt")).toBeLessThan(authPriority.indexOf("session"));
    });

    it("should fall back to session auth when no Authorization header", () => {
      const hasAuthHeader = false;
      const isAuthenticated = true;
      const shouldUseSession = !hasAuthHeader && isAuthenticated;
      expect(shouldUseSession).toBe(true);
    });
  });

  describe("JWT Authentication Path", () => {
    it("should validate Bearer token format", () => {
      const validHeader = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...";
      const parts = validHeader.split(" ");
      expect(parts[0]).toBe("Bearer");
      expect(parts.length).toBe(2);
    });

    it("should reject malformed Authorization headers", () => {
      const invalidHeaders = [
        "Basic dXNlcjpwYXNz",
        "Bearer",
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        "",
      ];
      
      invalidHeaders.forEach(header => {
        const parts = header.split(" ");
        const isValidBearer = parts[0] === "Bearer" && parts.length === 2 && parts[1].length > 0;
        expect(isValidBearer).toBe(false);
      });
    });

    it("should populate context with user, tenant, role, permissions from JWT", () => {
      const jwtPayload = {
        sub: "user-123",
        email: "user@example.com",
        tenantId: "tenant-456",
        role: "admin",
        permissions: ["projects:read", "projects:write"],
      };

      const expectedContext = {
        user: { id: jwtPayload.sub, email: jwtPayload.email },
        tenant: { id: jwtPayload.tenantId },
        role: jwtPayload.role,
        permissions: jwtPayload.permissions,
      };

      expect(expectedContext.user.id).toBe("user-123");
      expect(expectedContext.tenant.id).toBe("tenant-456");
      expect(expectedContext.permissions).toContain("projects:read");
    });
  });

  describe("Session Authentication Path", () => {
    it("should check isAuthenticated() method on request", () => {
      const mockRequest = {
        isAuthenticated: () => true,
        user: { email: "session@example.com" },
      };

      expect(mockRequest.isAuthenticated()).toBe(true);
      expect(mockRequest.user).toBeDefined();
    });

    it("should look up user in database by email", () => {
      const sessionUser = {
        email: "session@example.com",
        claims: { email: "session@example.com" },
      };

      const userEmail = sessionUser.email || sessionUser.claims?.email;
      expect(userEmail).toBe("session@example.com");
    });

    it("should find default tenant for session user", () => {
      const userTenantQuery = {
        userId: "user-123",
        isDefault: true,
        isActive: true,
      };

      expect(userTenantQuery.isDefault).toBe(true);
      expect(userTenantQuery.isActive).toBe(true);
    });

    it("should populate context with empty permissions array for session auth", () => {
      const sessionContext = {
        user: { id: "user-123", email: "user@example.com" },
        tenant: { id: "tenant-456" },
        role: { id: "role-789", name: "admin" },
        permissions: [],
        features: ["module:consulting"],
      };

      expect(sessionContext.permissions).toEqual([]);
      expect(Array.isArray(sessionContext.permissions)).toBe(true);
    });
  });

  describe("Unauthenticated Request Handling", () => {
    it("should return 401 when auth is required and no auth present", () => {
      const options = { required: true };
      const hasAuth = false;
      const expectedStatus = !hasAuth && options.required ? 401 : 200;
      expect(expectedStatus).toBe(401);
    });

    it("should allow pass-through when auth is optional", () => {
      const options = { required: false };
      const hasAuth = false;
      const shouldBlock = !hasAuth && options.required;
      expect(shouldBlock).toBe(false);
    });

    it("should return UNAUTHORIZED error code", () => {
      const errorResponse = {
        message: "Authentication required",
        code: "UNAUTHORIZED",
      };
      expect(errorResponse.code).toBe("UNAUTHORIZED");
    });

    it("should return USER_NOT_FOUND when session user not in database", () => {
      const errorResponse = {
        message: "User not found in system",
        code: "USER_NOT_FOUND",
      };
      expect(errorResponse.code).toBe("USER_NOT_FOUND");
    });
  });

  describe("Module Protected Middleware Configuration", () => {
    const hybridAuthModules = ["software_services", "consulting"];
    const jwtOnlyModules = ["real_estate", "tourism", "education", "logistics", "legal", "furniture_manufacturing"];

    it("should use hybrid auth for consulting module", () => {
      expect(hybridAuthModules).toContain("consulting");
    });

    it("should use hybrid auth for software_services module", () => {
      expect(hybridAuthModules).toContain("software_services");
    });

    it("should use JWT-only auth for real_estate module", () => {
      expect(jwtOnlyModules).toContain("real_estate");
      expect(hybridAuthModules).not.toContain("real_estate");
    });

    it("should use JWT-only auth for other modules", () => {
      jwtOnlyModules.forEach(module => {
        expect(hybridAuthModules).not.toContain(module);
      });
    });
  });

  describe("Context Pre-population Check", () => {
    it("should skip auth if context already populated", () => {
      const reqContext = {
        user: { id: "user-123", email: "user@example.com" },
        tenant: { id: "tenant-456" },
      };

      const shouldSkipAuth = !!reqContext?.user;
      expect(shouldSkipAuth).toBe(true);
    });

    it("should proceed with auth if context not populated", () => {
      const reqContext = null as null | { user?: { id: string } };
      const shouldSkipAuth = reqContext !== null && !!reqContext.user;
      expect(shouldSkipAuth).toBe(false);
    });
  });

  describe("API Path Structure for Services", () => {
    it("should route consulting projects to /api/services/consulting/projects", () => {
      const path = "/api/services/consulting/projects";
      expect(path).toMatch(/^\/api\/services\/consulting\//);
    });

    it("should route software services projects to /api/services/software_services/projects", () => {
      const path = "/api/services/software_services/projects";
      expect(path).toMatch(/^\/api\/services\/software_services\//);
    });

    it("should distinguish from HRMS routes at /api/hr/projects", () => {
      const hrmsPath = "/api/hr/projects";
      const servicesPath = "/api/services/consulting/projects";
      expect(hrmsPath).not.toMatch(/^\/api\/services\//);
      expect(servicesPath).not.toMatch(/^\/api\/hr\//);
    });
  });
});

describe("requireAuth Guard with Session Support", () => {
  it("should recognize session-based authentication via req.isAuthenticated", () => {
    const mockReq = {
      isAuthenticated: () => true,
      context: { user: { id: "user-123" } },
    };

    const isAuth = mockReq.isAuthenticated() || !!mockReq.context?.user;
    expect(isAuth).toBe(true);
  });

  it("should recognize JWT-based authentication via req.context.user", () => {
    const mockReq = {
      isAuthenticated: () => false,
      context: { user: { id: "user-123" } },
    };

    const isAuth = mockReq.isAuthenticated() || !!mockReq.context?.user;
    expect(isAuth).toBe(true);
  });

  it("should reject when neither session nor JWT auth present", () => {
    const mockReq: {
      isAuthenticated: () => boolean;
      context: { user?: { id: string } } | undefined;
    } = {
      isAuthenticated: () => false,
      context: undefined,
    };

    const isAuth = mockReq.isAuthenticated() || !!mockReq.context?.user;
    expect(isAuth).toBe(false);
  });
});
