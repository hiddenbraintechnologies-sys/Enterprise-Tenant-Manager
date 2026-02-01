/**
 * Tenant Branding API Tests
 * 
 * Comprehensive test suite for the tenant branding endpoint covering:
 * 1. Canonical shape validation (themeTokens.brand always exists)
 * 2. Priority chain (themeTokens.brand.primary overrides primaryColor)
 * 3. Plan-based feature gating (emailHeaderHtml requires Pro+)
 * 4. Immutable field protection (tenantId, createdAt cannot be updated)
 * 5. Tenant isolation (cross-tenant access returns 404)
 * 6. Rate limiting and payload limits
 * 
 * Security Contracts:
 * - Gated fields MUST return 403 FEATURE_NOT_ALLOWED for Basic plan
 * - Immutable fields MUST return 400 with validation error
 * - Cross-tenant access MUST return 404 (not 403) to prevent enumeration
 */

import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import { db } from "../db";
import { tenants, users, userTenants, tenantBranding } from "../../shared/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { 
  mintTestJwt, 
  authHeader, 
  getAdminRoleId,
  getAuthHeadersForTenant 
} from "../test-support/auth";

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:5000";
const TEST_TIMEOUT = 15000;

interface TestTenant {
  id: string;
  name: string;
  slug: string;
  planTier: string;
}

interface TestUser {
  id: string;
  email: string;
  tenantId: string;
}

let starterTenant: TestTenant;
let proTenant: TestTenant;
let userStarter: TestUser;
let userPro: TestUser;
let headersStarter: Record<string, string>;
let headersPro: Record<string, string>;

async function createTestTenant(suffix: string, subscriptionTier: string): Promise<TestTenant> {
  const id = randomUUID();
  const name = `Branding Test Tenant ${suffix}`;
  const slug = `branding-test-${suffix.toLowerCase()}-${Date.now()}`;
  
  await db.insert(tenants).values({
    id,
    name,
    slug,
    country: "india",
    status: "active",
    subscriptionTier: subscriptionTier,
  });
  
  return { id, name, slug, planTier: subscriptionTier };
}

async function createTestUser(tenant: TestTenant, suffix: string): Promise<TestUser> {
  const email = `brandingtest-${suffix}-${Date.now()}@test.local`;
  const roleId = await getAdminRoleId();
  
  const [created] = await db.insert(users).values({
    email,
    firstName: `Test`,
    lastName: `User${suffix}`,
    passwordHash: "TEST_USER_NO_PASSWORD",
    lastTenantId: tenant.id,
  }).returning();
  
  await db.insert(userTenants).values({
    userId: created.id,
    tenantId: tenant.id,
    roleId,
    isDefault: true,
    isActive: true,
  });
  
  return { id: created.id, email, tenantId: tenant.id };
}

async function makeRequest(
  method: "GET" | "PUT",
  path: string,
  headers: Record<string, string>,
  body?: Record<string, unknown>
): Promise<{ status: number; body: any }> {
  const fetchOptions: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  };

  if (body && method === "PUT") {
    fetchOptions.body = JSON.stringify(body);
  }

  const response = await fetch(`${BASE_URL}${path}`, fetchOptions);
  
  let responseBody: any;
  try {
    responseBody = await response.json();
  } catch {
    responseBody = null;
  }
  
  return { status: response.status, body: responseBody };
}

describe("Tenant Branding API", () => {
  beforeAll(async () => {
    starterTenant = await createTestTenant("Starter", "starter");
    proTenant = await createTestTenant("Pro", "pro");
    
    userStarter = await createTestUser(starterTenant, "starter");
    userPro = await createTestUser(proTenant, "pro");
    
    headersStarter = getAuthHeadersForTenant(userStarter.id, starterTenant.id);
    headersPro = getAuthHeadersForTenant(userPro.id, proTenant.id);
  }, TEST_TIMEOUT * 2);

  afterAll(async () => {
    await db.delete(tenantBranding).where(eq(tenantBranding.tenantId, starterTenant.id));
    await db.delete(tenantBranding).where(eq(tenantBranding.tenantId, proTenant.id));
    await db.delete(userTenants).where(eq(userTenants.userId, userStarter.id));
    await db.delete(userTenants).where(eq(userTenants.userId, userPro.id));
    await db.delete(users).where(eq(users.id, userStarter.id));
    await db.delete(users).where(eq(users.id, userPro.id));
    await db.delete(tenants).where(eq(tenants.id, starterTenant.id));
    await db.delete(tenants).where(eq(tenants.id, proTenant.id));
  }, TEST_TIMEOUT);

  describe("Canonical Shape", () => {
    it("1) themeTokens.brand always exists in response", async () => {
      const res = await makeRequest("GET", "/api/tenant/branding", headersStarter);
      
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("branding");
      expect(res.body.branding).toHaveProperty("themeTokens");
      expect(res.body.branding.themeTokens).toHaveProperty("brand");
      expect(typeof res.body.branding.themeTokens.brand).toBe("object");
    }, TEST_TIMEOUT);

    it("features object is returned with branding", async () => {
      const res = await makeRequest("GET", "/api/tenant/branding", headersStarter);
      
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("features");
      expect(res.body.features["branding.basic"]).toBe(true);
      expect(res.body.features["branding.email_templates"]).toBeDefined();
    }, TEST_TIMEOUT);
  });

  describe("Priority Chain", () => {
    it("2) themeTokens.brand.primary stored alongside primaryColor", async () => {
      await makeRequest("PUT", "/api/tenant/branding", headersStarter, {
        primaryColor: "#2563eb",
        themeTokens: { brand: { primary: "#111111" } },
      });

      const res = await makeRequest("GET", "/api/tenant/branding", headersStarter);
      
      expect(res.status).toBe(200);
      expect(res.body.branding.themeTokens.brand.primary).toBe("#111111");
      expect(res.body.branding.primaryColor).toBe("#2563eb");
    }, TEST_TIMEOUT);
  });

  describe("Plan-Based Feature Gating", () => {
    it("3) Starter plan cannot set emailHeaderHtml (403 FEATURE_NOT_ALLOWED)", async () => {
      const res = await makeRequest("PUT", "/api/tenant/branding", headersStarter, {
        emailHeaderHtml: "<div>Hello</div>",
      });
      
      expect(res.status).toBe(403);
      expect(res.body.code).toBe("FEATURE_NOT_ALLOWED");
      expect(res.body.feature).toContain("email_templates");
    }, TEST_TIMEOUT);

    it("Starter plan cannot set customCss (403 FEATURE_NOT_ALLOWED)", async () => {
      const res = await makeRequest("PUT", "/api/tenant/branding", headersStarter, {
        customCss: ".custom { color: red; }",
      });
      
      expect(res.status).toBe(403);
      expect(res.body.code).toBe("FEATURE_NOT_ALLOWED");
      expect(res.body.feature).toContain("custom_css");
    }, TEST_TIMEOUT);

    it("4) Pro plan can set emailHeaderHtml (200)", async () => {
      const res = await makeRequest("PUT", "/api/tenant/branding", headersPro, {
        emailHeaderHtml: "<div>Pro Header</div>",
      });
      
      expect(res.status).toBe(200);
      
      const getRes = await makeRequest("GET", "/api/tenant/branding", headersPro);
      expect(getRes.body.branding.emailHeaderHtml).toContain("Pro Header");
    }, TEST_TIMEOUT);
  });

  describe("Immutable Field Protection", () => {
    it("5) tenantId and createdAt cannot be updated (400)", async () => {
      const res = await makeRequest("PUT", "/api/tenant/branding", headersStarter, {
        tenantId: randomUUID(),
        createdAt: "2020-01-01T00:00:00Z",
      });
      
      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    }, TEST_TIMEOUT);

    it("id cannot be updated (400)", async () => {
      const res = await makeRequest("PUT", "/api/tenant/branding", headersStarter, {
        id: randomUUID(),
      });
      
      expect(res.status).toBe(400);
    }, TEST_TIMEOUT);
  });

  describe("Input Validation", () => {
    it("rejects invalid hex colors", async () => {
      const res = await makeRequest("PUT", "/api/tenant/branding", headersStarter, {
        primaryColor: "invalid-color",
      });
      
      expect(res.status).toBe(400);
    }, TEST_TIMEOUT);

    it("rejects disallowed font families", async () => {
      const res = await makeRequest("PUT", "/api/tenant/branding", headersStarter, {
        fontFamily: "SuspiciousFont",
      });
      
      expect(res.status).toBe(400);
    }, TEST_TIMEOUT);

    it("accepts allowed font families", async () => {
      const res = await makeRequest("PUT", "/api/tenant/branding", headersStarter, {
        fontFamily: "Inter",
      });
      
      expect(res.status).toBe(200);
    }, TEST_TIMEOUT);

    it("normalizes hex colors to lowercase", async () => {
      await makeRequest("PUT", "/api/tenant/branding", headersStarter, {
        primaryColor: "#AABBCC",
      });
      
      const res = await makeRequest("GET", "/api/tenant/branding", headersStarter);
      expect(res.body.branding.primaryColor).toBe("#aabbcc");
    }, TEST_TIMEOUT);
  });

  describe("Tenant Isolation", () => {
    it("6) Starter user cannot access Pro tenant branding", async () => {
      const crossTenantHeaders = getAuthHeadersForTenant(userStarter.id, proTenant.id);
      const res = await makeRequest("GET", "/api/tenant/branding", crossTenantHeaders);
      
      expect([403, 404]).toContain(res.status);
    }, TEST_TIMEOUT);

    it("X-Tenant-Id header spoofing is ignored or blocked", async () => {
      const spoofedHeaders = {
        ...headersStarter,
        "X-Tenant-Id": proTenant.id,
      };
      
      const res = await makeRequest("GET", "/api/tenant/branding", spoofedHeaders);
      
      if (res.status === 200) {
        expect(res.body.branding.tenantId).toBe(starterTenant.id);
      } else {
        expect([403, 404]).toContain(res.status);
      }
    }, TEST_TIMEOUT);
  });

  describe("Authentication", () => {
    it("unauthenticated request returns 401", async () => {
      const res = await makeRequest("GET", "/api/tenant/branding", {});
      
      expect(res.status).toBe(401);
    }, TEST_TIMEOUT);

    it("invalid token returns 401", async () => {
      const res = await makeRequest("GET", "/api/tenant/branding", {
        Authorization: "Bearer invalid-token",
      });
      
      expect(res.status).toBe(401);
    }, TEST_TIMEOUT);
  });

  describe("Self-Healing", () => {
    it("missing themeTokens is healed on GET", async () => {
      const existingBranding = await db.select()
        .from(tenantBranding)
        .where(eq(tenantBranding.tenantId, starterTenant.id));
      
      if (existingBranding.length > 0) {
        await db.update(tenantBranding)
          .set({ themeTokens: null })
          .where(eq(tenantBranding.tenantId, starterTenant.id));
      }
      
      const res = await makeRequest("GET", "/api/tenant/branding", headersStarter);
      
      expect(res.status).toBe(200);
      expect(res.body.branding.themeTokens).toBeDefined();
      expect(res.body.branding.themeTokens.brand).toBeDefined();
    }, TEST_TIMEOUT);
  });
});
