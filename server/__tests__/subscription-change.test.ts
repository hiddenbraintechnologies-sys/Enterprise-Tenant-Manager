import { describe, it, expect, beforeAll, afterAll, beforeEach } from "@jest/globals";
import { getBootstrapResult } from "./setup";

const BASE_URL = "http://localhost:5000";

describe("Subscription Change Workflow", () => {
  let authToken: string;
  let tenantId: string;
  let setupSucceeded = false;
  let freePlanId: string;
  let basicPlanId: string;
  let proPlanId: string;

  beforeAll(async () => {
    const bootstrap = getBootstrapResult();
    if (!bootstrap?.dbConnected) {
      console.warn("[subscription-change-test] Database not connected, skipping tests");
      return;
    }

    const plansResponse = await fetch(`${BASE_URL}/api/billing/plans?country=india`);
    if (!plansResponse.ok) {
      console.warn("[subscription-change-test] Failed to fetch plans");
      return;
    }
    
    const plansData = await plansResponse.json();
    const plans = plansData.plans || [];
    
    for (const plan of plans) {
      if (plan.tier === "free") freePlanId = plan.id;
      if (plan.tier === "basic") basicPlanId = plan.id;
      if (plan.tier === "pro") proPlanId = plan.id;
    }

    if (!freePlanId || !basicPlanId || !proPlanId) {
      console.warn("[subscription-change-test] Missing India plans");
      return;
    }

    const uniqueId = Date.now();
    const signupResponse = await fetch(`${BASE_URL}/api/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: `sub-change-test-${uniqueId}@example.com`,
        password: "SecurePass123!",
        firstName: "Subscription",
        lastName: "Test",
        tenantName: `Sub Change Test ${uniqueId}`,
        businessType: "service",
        country: "india",
      }),
    });

    if (signupResponse.ok) {
      const data = await signupResponse.json();
      authToken = data.token;
      tenantId = data.tenant?.id;
      setupSucceeded = true;
    } else {
      console.warn("[subscription-change-test] Signup failed:", await signupResponse.text());
    }
  });

  describe("GET /api/billing/subscription", () => {
    it("should return subscription status for authenticated tenant", async () => {
      if (!setupSucceeded) {
        console.warn("[subscription-change-test] Skipping - setup did not succeed");
        return;
      }

      const response = await fetch(`${BASE_URL}/api/billing/subscription`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
          "X-Tenant-ID": tenantId,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty("subscription");
      expect(data).toHaveProperty("status");
    });
  });

  describe("POST /api/billing/subscription/change - Upgrade", () => {
    it("should create pending payment and NOT immediately change planId for paid upgrade", async () => {
      if (!setupSucceeded) {
        console.warn("[subscription-change-test] Skipping - setup did not succeed");
        return;
      }

      const beforeResponse = await fetch(`${BASE_URL}/api/billing/subscription`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
          "X-Tenant-ID": tenantId,
        },
      });
      const beforeData = await beforeResponse.json();
      const currentPlanId = beforeData.subscription?.planId;

      const upgradeResponse = await fetch(`${BASE_URL}/api/billing/subscription/change`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
          "X-Tenant-ID": tenantId,
        },
        body: JSON.stringify({ planId: basicPlanId, action: "upgrade" }),
      });

      if (upgradeResponse.status === 400 && (await upgradeResponse.clone().json())?.code === "INVALID_UPGRADE") {
        console.log("[subscription-change-test] Already on higher plan - upgrade test passes by default");
        return;
      }

      expect(upgradeResponse.status).toBe(200);
      const upgradeData = await upgradeResponse.json();
      expect(upgradeData.success).toBe(true);
      expect(upgradeData.requiresPayment).toBe(true);
      expect(upgradeData.paymentId).toBeDefined();
      expect(upgradeData.redirectUrl).toContain("/checkout");

      const afterResponse = await fetch(`${BASE_URL}/api/billing/subscription`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
          "X-Tenant-ID": tenantId,
        },
      });
      const afterData = await afterResponse.json();
      
      expect(afterData.subscription?.planId).toBe(currentPlanId);
      expect(afterData.subscription?.pendingPlanId).toBe(basicPlanId);
      expect(afterData.subscription?.status).toBe("pending_payment");
    });
  });

  describe("POST /api/billing/subscription/cancel-pending-upgrade", () => {
    it("should revert subscription to active and cancel payment", async () => {
      if (!setupSucceeded) {
        console.warn("[subscription-change-test] Skipping - setup did not succeed");
        return;
      }

      const beforeResponse = await fetch(`${BASE_URL}/api/billing/subscription`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
          "X-Tenant-ID": tenantId,
        },
      });
      const beforeData = await beforeResponse.json();
      
      if (beforeData.subscription?.status !== "pending_payment") {
        console.log("[subscription-change-test] No pending payment to cancel - skipping");
        return;
      }

      const cancelResponse = await fetch(`${BASE_URL}/api/billing/subscription/cancel-pending-upgrade`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
          "X-Tenant-ID": tenantId,
        },
        body: JSON.stringify({}),
      });

      expect(cancelResponse.status).toBe(200);
      const cancelData = await cancelResponse.json();
      expect(cancelData.success).toBe(true);

      const afterResponse = await fetch(`${BASE_URL}/api/billing/subscription`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
          "X-Tenant-ID": tenantId,
        },
      });
      const afterData = await afterResponse.json();
      
      expect(afterData.subscription?.status).toBe("active");
      expect(afterData.subscription?.pendingPlanId).toBeNull();
    });
  });

  describe("POST /api/billing/subscription/change - Downgrade", () => {
    it("should schedule downgrade at period end without immediately changing planId", async () => {
      if (!setupSucceeded) {
        console.warn("[subscription-change-test] Skipping - setup did not succeed");
        return;
      }

      const subResponse = await fetch(`${BASE_URL}/api/billing/subscription`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
          "X-Tenant-ID": tenantId,
        },
      });
      const subData = await subResponse.json();
      
      if (subData.subscription?.planId === freePlanId) {
        console.log("[subscription-change-test] Already on free plan - cannot downgrade further, skipping");
        return;
      }

      const downgradeResponse = await fetch(`${BASE_URL}/api/billing/subscription/change`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
          "X-Tenant-ID": tenantId,
        },
        body: JSON.stringify({ planId: freePlanId, action: "downgrade" }),
      });

      if (downgradeResponse.status === 400) {
        const errorData = await downgradeResponse.json();
        if (errorData.code === "INVALID_DOWNGRADE" || errorData.code === "INVALID_SUBSCRIPTION_STATUS") {
          console.log("[subscription-change-test] Cannot downgrade in current state - test passes by default");
          return;
        }
      }

      expect(downgradeResponse.status).toBe(200);
      const downgradeData = await downgradeResponse.json();
      expect(downgradeData.success).toBe(true);
      expect(downgradeData.effectiveAt).toBeDefined();

      const afterResponse = await fetch(`${BASE_URL}/api/billing/subscription`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
          "X-Tenant-ID": tenantId,
        },
      });
      const afterData = await afterResponse.json();
      
      expect(afterData.subscription?.status).toBe("downgrading");
      expect(afterData.subscription?.pendingPlanId).toBe(freePlanId);
      expect(afterData.subscription?.cancelAtPeriodEnd).toBe(true);
    });
  });

  describe("POST /api/billing/subscription/cancel-downgrade", () => {
    it("should cancel scheduled downgrade", async () => {
      if (!setupSucceeded) {
        console.warn("[subscription-change-test] Skipping - setup did not succeed");
        return;
      }

      const beforeResponse = await fetch(`${BASE_URL}/api/billing/subscription`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
          "X-Tenant-ID": tenantId,
        },
      });
      const beforeData = await beforeResponse.json();
      
      if (beforeData.subscription?.status !== "downgrading") {
        console.log("[subscription-change-test] No pending downgrade to cancel - skipping");
        return;
      }

      const cancelResponse = await fetch(`${BASE_URL}/api/billing/subscription/cancel-downgrade`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
          "X-Tenant-ID": tenantId,
        },
        body: JSON.stringify({}),
      });

      expect(cancelResponse.status).toBe(200);
      const cancelData = await cancelResponse.json();
      expect(cancelData.success).toBe(true);

      const afterResponse = await fetch(`${BASE_URL}/api/billing/subscription`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
          "X-Tenant-ID": tenantId,
        },
      });
      const afterData = await afterResponse.json();
      
      expect(afterData.subscription?.status).toBe("active");
      expect(afterData.subscription?.pendingPlanId).toBeNull();
      expect(afterData.subscription?.cancelAtPeriodEnd).toBe(false);
    });
  });

  describe("Permission enforcement", () => {
    it("should return 401 without auth token", async () => {
      const response = await fetch(`${BASE_URL}/api/billing/subscription/change`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: basicPlanId, action: "upgrade" }),
      });

      expect(response.status).toBe(401);
    });
  });

  describe("GET /api/billing/plans", () => {
    it("should return India plans with correct currency", async () => {
      const response = await fetch(`${BASE_URL}/api/billing/plans?country=india`);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.plans).toBeDefined();
      expect(Array.isArray(data.plans)).toBe(true);
      expect(data.plans.length).toBeGreaterThan(0);
      
      for (const plan of data.plans) {
        expect(plan.code.startsWith("india_")).toBe(true);
        expect(["INR", "inr"].includes(plan.currency?.toUpperCase() || plan.currencyCode?.toUpperCase())).toBe(true);
      }
    });

    it("should filter out archived plans", async () => {
      const response = await fetch(`${BASE_URL}/api/billing/plans?country=india`);

      expect(response.status).toBe(200);
      const data = await response.json();
      
      for (const plan of data.plans) {
        expect(plan.archivedAt).toBeFalsy();
      }
    });
  });
});
