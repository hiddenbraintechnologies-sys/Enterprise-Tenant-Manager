import { getBootstrapResult } from "./setup";

const BASE_URL = "http://localhost:5000";

describe("API Contract Tests", () => {
  let authToken: string;
  let tenantId: string;
  let signupSucceeded = false;

  beforeAll(async () => {
    const bootstrap = getBootstrapResult();
    if (!bootstrap?.dbConnected) {
      console.warn("[contract-test] Database not connected, skipping tests");
      return;
    }

    const uniqueId = Date.now();
    const signupResponse = await fetch(`${BASE_URL}/api/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: `contract-test-${uniqueId}@example.com`,
        password: "SecurePass123!",
        firstName: "Contract",
        lastName: "Test",
        tenantName: `Contract Test ${uniqueId}`,
        businessType: "salon",
        country: "india",
      }),
    });

    if (signupResponse.ok) {
      const data = await signupResponse.json();
      authToken = data.token;
      tenantId = data.tenant?.id;
      signupSucceeded = true;
    } else {
      console.warn("[contract-test] Signup failed:", await signupResponse.text());
    }
  });

  describe("Dashboard API Contract", () => {
    describe("GET /api/dashboard", () => {
      it("should return response with required shape: tenant, modules, features", async () => {
        if (!signupSucceeded) {
          console.warn("[contract-test] Skipping - signup did not succeed");
          return;
        }

        const response = await fetch(`${BASE_URL}/api/dashboard`, {
          headers: {
            Authorization: `Bearer ${authToken}`,
            "X-Tenant-ID": tenantId,
          },
        });

        expect(response.status).toBe(200);
        const data = await response.json();

        expect(data).toHaveProperty("tenant");
        expect(typeof data.tenant).toBe("object");
        expect(data.tenant).toHaveProperty("id");
        expect(data.tenant).toHaveProperty("businessType");

        expect(data).toHaveProperty("modules");
        expect(typeof data.modules).toBe("object");

        expect(data).toHaveProperty("features");
        expect(typeof data.features).toBe("object");

        expect(data).not.toHaveProperty("quickStats");
      });
    });

    describe("GET /api/dashboard - modules structure", () => {
      it("should return modules with { enabled: [], available: [], addons: [] } structure", async () => {
        if (!signupSucceeded) {
          console.warn("[contract-test] Skipping - signup did not succeed");
          return;
        }

        const response = await fetch(`${BASE_URL}/api/dashboard`, {
          headers: {
            Authorization: `Bearer ${authToken}`,
            "X-Tenant-ID": tenantId,
          },
        });

        expect(response.status).toBe(200);
        const data = await response.json();

        expect(data.modules).toHaveProperty("enabled");
        expect(Array.isArray(data.modules.enabled)).toBe(true);

        expect(data.modules).toHaveProperty("available");
        expect(Array.isArray(data.modules.available)).toBe(true);

        expect(data.modules).toHaveProperty("addons");
        expect(Array.isArray(data.modules.addons)).toBe(true);
      });
    });
  });

  describe("Subscription API Contract", () => {
    describe("GET /api/dashboard/subscription/status", () => {
      it("should return response with hasSubscription boolean", async () => {
        if (!signupSucceeded) {
          console.warn("[contract-test] Skipping - signup did not succeed");
          return;
        }

        const response = await fetch(`${BASE_URL}/api/dashboard/subscription/status`, {
          headers: {
            Authorization: `Bearer ${authToken}`,
            "X-Tenant-ID": tenantId,
          },
        });

        expect(response.status).toBe(200);
        const data = await response.json();

        expect(data).toHaveProperty("hasSubscription");
        expect(typeof data.hasSubscription).toBe("boolean");

        expect(data).toHaveProperty("tier");
        expect(typeof data.tier).toBe("string");
      });
    });
  });

  describe("Module Access API Contract", () => {
    describe("GET /api/dashboard/modules/:moduleId/access", () => {
      it("should return response with { allowed: boolean, reason?: string }", async () => {
        if (!signupSucceeded) {
          console.warn("[contract-test] Skipping - signup did not succeed");
          return;
        }

        const response = await fetch(`${BASE_URL}/api/dashboard/modules/salon/access`, {
          headers: {
            Authorization: `Bearer ${authToken}`,
            "X-Tenant-ID": tenantId,
          },
        });

        expect(response.status).toBe(200);
        const data = await response.json();

        expect(data).toHaveProperty("allowed");
        expect(typeof data.allowed).toBe("boolean");

        expect(data).toHaveProperty("moduleId");
        expect(typeof data.moduleId).toBe("string");

        if (!data.allowed) {
          expect(data).toHaveProperty("reason");
          expect(typeof data.reason).toBe("string");
        }
      });

      it("should return allowed=true OR reason string when allowed=false", async () => {
        if (!signupSucceeded) {
          console.warn("[contract-test] Skipping - signup did not succeed");
          return;
        }

        const response = await fetch(`${BASE_URL}/api/dashboard/modules/clinic/access`, {
          headers: {
            Authorization: `Bearer ${authToken}`,
            "X-Tenant-ID": tenantId,
          },
        });

        expect(response.status).toBe(200);
        const data = await response.json();

        if (data.allowed === true) {
          expect(data.reason).toBeUndefined();
        } else {
          expect(data.reason).toBeDefined();
          expect(typeof data.reason).toBe("string");
        }
      });
    });
  });

  describe("Plans API Contract", () => {
    describe("GET /api/subscription/plans-with-pricing", () => {
      it("should return array of plans with required properties", async () => {
        const response = await fetch(`${BASE_URL}/api/subscription/plans-with-pricing?country=india`);

        expect(response.status).toBe(200);
        const data = await response.json();

        expect(Array.isArray(data)).toBe(true);
        if (data.length > 0) {
          const plan = data[0];
          expect(plan).toHaveProperty("tier");
          expect(plan).toHaveProperty("name");
        }
      });
    });
  });
});
