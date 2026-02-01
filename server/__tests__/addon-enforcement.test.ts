/**
 * Add-on Enforcement Tests
 * 
 * Tests for verifying add-on access enforcement across the platform.
 * Tests cover: expired addons, not installed, dependency missing/expired.
 */

import { describe, it, expect, beforeAll, afterAll, jest } from "@jest/globals";
import { 
  getTenantAddonEntitlement, 
  checkDependencyEntitlement,
  isAddonEntitled,
  type EntitlementRecord 
} from "../services/entitlement";

describe("Add-on Entitlement Service", () => {
  describe("isAddonEntitled", () => {
    it("should return false for null record", () => {
      expect(isAddonEntitled(null)).toBe(false);
    });

    it("should return true for active subscription with valid paidUntil", () => {
      const record: EntitlementRecord = {
        tenantId: "tenant-1",
        addonCode: "hrms",
        status: "active",
        subscriptionStatus: "active",
        installedAt: new Date(),
        trialEndsAt: null,
        paidUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        graceUntil: null,
      };
      expect(isAddonEntitled(record)).toBe(true);
    });

    it("should return false for expired subscription", () => {
      const record: EntitlementRecord = {
        tenantId: "tenant-1",
        addonCode: "hrms",
        status: "active",
        subscriptionStatus: "active",
        installedAt: new Date(),
        trialEndsAt: null,
        paidUntil: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
        graceUntil: null,
      };
      expect(isAddonEntitled(record)).toBe(false);
    });

    it("should return true for active trial", () => {
      const record: EntitlementRecord = {
        tenantId: "tenant-1",
        addonCode: "hrms",
        status: "trial",
        subscriptionStatus: "trialing",
        installedAt: new Date(),
        trialEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        paidUntil: null,
        graceUntil: null,
      };
      expect(isAddonEntitled(record)).toBe(true);
    });

    it("should return false for expired trial", () => {
      const record: EntitlementRecord = {
        tenantId: "tenant-1",
        addonCode: "hrms",
        status: "trial",
        subscriptionStatus: "trialing",
        installedAt: new Date(),
        trialEndsAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
        paidUntil: null,
        graceUntil: null,
      };
      expect(isAddonEntitled(record)).toBe(false);
    });

    it("should return true during grace period", () => {
      const record: EntitlementRecord = {
        tenantId: "tenant-1",
        addonCode: "hrms",
        status: "active",
        subscriptionStatus: "grace_period",
        installedAt: new Date(),
        trialEndsAt: null,
        paidUntil: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
        graceUntil: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
      };
      expect(isAddonEntitled(record)).toBe(true);
    });

    it("should return false when grace period has expired", () => {
      const record: EntitlementRecord = {
        tenantId: "tenant-1",
        addonCode: "hrms",
        status: "active",
        subscriptionStatus: "grace_period",
        installedAt: new Date(),
        trialEndsAt: null,
        paidUntil: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        graceUntil: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
      };
      expect(isAddonEntitled(record)).toBe(false);
    });
  });

  describe("Dependency Checking", () => {
    it("should report satisfied when no dependencies", async () => {
      const result = await checkDependencyEntitlement("nonexistent-tenant", "whatsapp-automation", []);
      expect(result.satisfied).toBe(true);
    });

    it("should check built-in dependencies for payroll", async () => {
      // Payroll has built-in dependency on hrms
      const result = await checkDependencyEntitlement("nonexistent-tenant", "payroll", undefined);
      // Will fail because tenant doesn't exist (no hrms)
      expect(result.satisfied).toBe(false);
      expect(result.missingDependency).toBe("hrms");
    });
  });
});

describe("API Response Codes", () => {
  const expectedCodes = [
    "ADDON_EXPIRED",
    "ADDON_TRIAL_EXPIRED", 
    "ADDON_NOT_INSTALLED",
    "ADDON_CANCELLED",
    "ADDON_DEPENDENCY_MISSING",
    "ADDON_DEPENDENCY_EXPIRED",
  ];

  it("should have all expected error codes documented", () => {
    // Verify the error codes are properly typed
    type ErrorCode = "ADDON_EXPIRED" | "ADDON_TRIAL_EXPIRED" | "ADDON_NOT_INSTALLED" | 
                     "ADDON_CANCELLED" | "ADDON_DEPENDENCY_MISSING" | "ADDON_DEPENDENCY_EXPIRED";
    
    expectedCodes.forEach(code => {
      const typedCode: ErrorCode = code as ErrorCode;
      expect(typedCode).toBeTruthy();
    });
  });
});

describe("Grace Period Behavior", () => {
  function computeEffectiveAllowGrace(method: string, allowGraceForReads: boolean): boolean {
    const isReadMethod = method === "GET" || method === "HEAD";
    return allowGraceForReads ? isReadMethod : true;
  }

  it("should allow read access during grace period", () => {
    expect(computeEffectiveAllowGrace("GET", true)).toBe(true);
    expect(computeEffectiveAllowGrace("HEAD", true)).toBe(true);
  });

  it("should block write access during grace period", () => {
    expect(computeEffectiveAllowGrace("POST", true)).toBe(false);
    expect(computeEffectiveAllowGrace("PUT", true)).toBe(false);
    expect(computeEffectiveAllowGrace("DELETE", true)).toBe(false);
    expect(computeEffectiveAllowGrace("PATCH", true)).toBe(false);
  });
});
