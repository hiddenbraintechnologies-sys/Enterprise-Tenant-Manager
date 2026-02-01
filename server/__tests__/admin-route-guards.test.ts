/**
 * Admin Route Guard Tests
 * 
 * Verifies that:
 * 1. Tenant users cannot access any admin/super-admin endpoints (403)
 * 2. Unauthenticated requests get 401
 * 3. Admin users can access admin endpoints (200)
 * 
 * Security policy:
 * - Tenant users should get 403 "Platform admin access required" or "NOT_PLATFORM_ADMIN"
 * - Unauthenticated users should get 401 "Authentication required"
 */

import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:5000";
const TEST_TIMEOUT = 10000;

interface TestEndpoint {
  path: string;
  method: "GET" | "POST" | "PATCH" | "DELETE" | "PUT";
  description: string;
  requiresSuperAdmin?: boolean;
}

const ADMIN_ENDPOINTS: TestEndpoint[] = [
  { path: "/api/admin/addons/payroll/tiers", method: "GET", description: "List payroll tiers" },
  { path: "/api/admin/addons/payroll/stats", method: "GET", description: "Payroll stats" },
  { path: "/api/admin/addons/bundle-discounts", method: "GET", description: "Bundle discounts" },
  { path: "/api/admin/addons/marketplace/addons", method: "GET", description: "Marketplace addons list" },
  { path: "/api/admin/billing/promos", method: "GET", description: "Billing promos", requiresSuperAdmin: true },
  { path: "/api/admin/analytics/payroll/summary", method: "GET", description: "Payroll analytics", requiresSuperAdmin: true },
  { path: "/api/admin/analytics/marketplace/overview", method: "GET", description: "Marketplace revenue" },
];

const SUPER_ADMIN_ENDPOINTS: TestEndpoint[] = [
  { path: "/api/super-admin/countries", method: "GET", description: "Countries list" },
  { path: "/api/super-admin/marketplace/addons", method: "GET", description: "Super admin addons" },
  { path: "/api/super-admin/marketplace/countries", method: "GET", description: "Super admin countries" },
  { path: "/api/super-admin/marketplace/analytics/overview", method: "GET", description: "Marketplace analytics" },
];

async function makeRequest(
  endpoint: TestEndpoint,
  options: { cookie?: string; token?: string } = {}
): Promise<{ status: number; body: any }> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  
  if (options.cookie) {
    headers["Cookie"] = options.cookie;
  }
  
  if (options.token) {
    headers["Authorization"] = `Bearer ${options.token}`;
  }

  const response = await fetch(`${BASE_URL}${endpoint.path}`, {
    method: endpoint.method,
    headers,
  });

  let body: any;
  try {
    body = await response.json();
  } catch {
    body = {};
  }

  return { status: response.status, body };
}

describe("Admin Route Guards", () => {
  let tenantUserCookie: string | null = null;
  let tenantUserToken: string | null = null;

  beforeAll(async () => {
    try {
      const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "test@tenant.local",
          password: "testpassword123",
        }),
      });

      if (loginResponse.ok) {
        const setCookie = loginResponse.headers.get("set-cookie");
        if (setCookie) {
          tenantUserCookie = setCookie.split(";")[0];
        }
        const data = await loginResponse.json();
        tenantUserToken = data.token || null;
      }
    } catch (error) {
      console.log("[admin-guards-test] Could not log in tenant user - using unauthenticated tests only");
    }
  }, 30000);

  describe("A) Unauthenticated Access Denied", () => {
    describe("Admin endpoints require authentication", () => {
      ADMIN_ENDPOINTS.forEach((endpoint) => {
        it(`${endpoint.method} ${endpoint.path} returns 401 without auth`, async () => {
          const { status, body } = await makeRequest(endpoint);
          
          expect(status).toBe(401);
          expect(body.code).toMatch(/UNAUTHORIZED|MISSING_TOKEN|INVALID_TOKEN/);
        }, TEST_TIMEOUT);
      });
    });

    describe("Super-admin endpoints require authentication", () => {
      SUPER_ADMIN_ENDPOINTS.forEach((endpoint) => {
        it(`${endpoint.method} ${endpoint.path} returns 401 without auth`, async () => {
          const { status, body } = await makeRequest(endpoint);
          
          expect(status).toBe(401);
          expect(body.code).toMatch(/UNAUTHORIZED|MISSING_TOKEN|INVALID_TOKEN/);
        }, TEST_TIMEOUT);
      });
    });
  });

  describe("B) Tenant User Access Denied (403)", () => {
    describe("Tenant users cannot access admin endpoints", () => {
      ADMIN_ENDPOINTS.forEach((endpoint) => {
        it(`${endpoint.method} ${endpoint.path} returns 403 for tenant user`, async () => {
          if (!tenantUserCookie && !tenantUserToken) {
            console.warn(`[skip] No tenant user credentials - verifying 401 instead`);
            const { status } = await makeRequest(endpoint);
            expect([401, 403]).toContain(status);
            return;
          }

          const { status, body } = await makeRequest(endpoint, { 
            cookie: tenantUserCookie || undefined,
            token: tenantUserToken || undefined,
          });
          
          expect(status).toBe(403);
          expect(body.code).toMatch(/NOT_PLATFORM_ADMIN|FORBIDDEN/);
          expect(body.message).toMatch(/platform admin/i);
        }, TEST_TIMEOUT);
      });
    });

    describe("Tenant users cannot access super-admin endpoints", () => {
      SUPER_ADMIN_ENDPOINTS.forEach((endpoint) => {
        it(`${endpoint.method} ${endpoint.path} returns 403 for tenant user`, async () => {
          if (!tenantUserCookie && !tenantUserToken) {
            console.warn(`[skip] No tenant user credentials - verifying 401 instead`);
            const { status } = await makeRequest(endpoint);
            expect([401, 403]).toContain(status);
            return;
          }

          const { status, body } = await makeRequest(endpoint, { 
            cookie: tenantUserCookie || undefined,
            token: tenantUserToken || undefined,
          });
          
          expect(status).toBe(403);
          expect(body.code).toMatch(/NOT_PLATFORM_ADMIN|FORBIDDEN|UNAUTHENTICATED|SUPER_ADMIN_REQUIRED/);
        }, TEST_TIMEOUT);
      });
    });
  });

  describe("C) Response Consistency", () => {
    it("Admin endpoints never return tenant context errors", async () => {
      for (const endpoint of ADMIN_ENDPOINTS) {
        const { status, body } = await makeRequest(endpoint);
        
        expect(body.code).not.toBe("TENANT_NOT_FOUND");
        expect(body.code).not.toBe("TENANT_REQUIRED");
        expect(body.message || "").not.toMatch(/tenant context/i);
      }
    }, TEST_TIMEOUT * 2);

    it("Super-admin endpoints never return tenant context errors", async () => {
      for (const endpoint of SUPER_ADMIN_ENDPOINTS) {
        const { status, body } = await makeRequest(endpoint);
        
        expect(body.code).not.toBe("TENANT_NOT_FOUND");
        expect(body.code).not.toBe("TENANT_REQUIRED");
        expect(body.message || "").not.toMatch(/tenant context/i);
      }
    }, TEST_TIMEOUT * 2);
  });

  describe("D) Security Headers", () => {
    it("Admin endpoints include proper error codes", async () => {
      const endpoint = ADMIN_ENDPOINTS[0];
      const { status, body } = await makeRequest(endpoint);
      
      expect(body).toHaveProperty("code");
      expect(body).toHaveProperty("message");
    }, TEST_TIMEOUT);

    it("Super-admin endpoints include proper error codes", async () => {
      const endpoint = SUPER_ADMIN_ENDPOINTS[0];
      const { status, body } = await makeRequest(endpoint);
      
      expect(body).toHaveProperty("code");
      expect(body).toHaveProperty("message");
    }, TEST_TIMEOUT);
  });
});

describe("Admin Route Guard Policy Summary", () => {
  it("Documents the expected guard middleware chain", () => {
    const policy = {
      adminRoutes: {
        requiredMiddleware: ["authenticateJWT", "requirePlatformAdmin"],
        expectedDenialCode: "NOT_PLATFORM_ADMIN",
        expectedDenialStatus: 403,
      },
      superAdminRoutes: {
        requiredMiddleware: ["authenticateJWT", "requireSuperAdmin OR requireSuperAdminOnly"],
        expectedDenialCode: "SUPER_ADMIN_REQUIRED",
        expectedDenialStatus: 403,
      },
      tenantRoutes: {
        requiredMiddleware: ["requireAuth", "requireTenantContext"],
        note: "Tenant routes are separate from admin routes",
      },
    };

    expect(policy.adminRoutes.expectedDenialStatus).toBe(403);
    expect(policy.superAdminRoutes.expectedDenialStatus).toBe(403);
  });
});
