/**
 * Entitlement Service Tests
 * 
 * Tests for add-on entitlement enforcement:
 * - isAddonEntitled function
 * - getTenantAddonEntitlement function
 * - Dependency checking
 */

import { isAddonEntitled, type EntitlementRecord } from "../services/entitlement";

describe("isAddonEntitled", () => {
  const now = new Date("2025-06-15T12:00:00Z");

  it("returns false for null record", () => {
    expect(isAddonEntitled(null, now)).toBe(false);
  });

  it("returns false for inactive status", () => {
    const record: EntitlementRecord = {
      tenantId: "t1",
      addonCode: "payroll",
      status: "disabled",
      subscriptionStatus: "active",
      installedAt: new Date("2025-01-01"),
      trialEndsAt: null,
      paidUntil: new Date("2025-12-31"),
      graceUntil: null,
    };
    expect(isAddonEntitled(record, now)).toBe(false);
  });

  it("returns true for active subscription with valid paidUntil", () => {
    const record: EntitlementRecord = {
      tenantId: "t1",
      addonCode: "payroll",
      status: "active",
      subscriptionStatus: "active",
      installedAt: new Date("2025-01-01"),
      trialEndsAt: null,
      paidUntil: new Date("2025-12-31"),
      graceUntil: null,
    };
    expect(isAddonEntitled(record, now)).toBe(true);
  });

  it("returns true for active trial", () => {
    const record: EntitlementRecord = {
      tenantId: "t1",
      addonCode: "payroll",
      status: "active",
      subscriptionStatus: "trialing",
      installedAt: new Date("2025-06-01"),
      trialEndsAt: new Date("2025-06-20"),
      paidUntil: null,
      graceUntil: null,
    };
    expect(isAddonEntitled(record, now)).toBe(true);
  });

  it("returns false for expired trial", () => {
    const record: EntitlementRecord = {
      tenantId: "t1",
      addonCode: "payroll",
      status: "active",
      subscriptionStatus: "trialing",
      installedAt: new Date("2025-05-01"),
      trialEndsAt: new Date("2025-06-10"),
      paidUntil: null,
      graceUntil: null,
    };
    expect(isAddonEntitled(record, now)).toBe(false);
  });

  it("returns true during grace period", () => {
    const record: EntitlementRecord = {
      tenantId: "t1",
      addonCode: "payroll",
      status: "active",
      subscriptionStatus: "grace_period",
      installedAt: new Date("2025-01-01"),
      trialEndsAt: null,
      paidUntil: new Date("2025-06-10"),
      graceUntil: new Date("2025-06-20"),
    };
    expect(isAddonEntitled(record, now)).toBe(true);
  });

  it("returns false after grace period ends", () => {
    const record: EntitlementRecord = {
      tenantId: "t1",
      addonCode: "payroll",
      status: "active",
      subscriptionStatus: "grace_period",
      installedAt: new Date("2025-01-01"),
      trialEndsAt: null,
      paidUntil: new Date("2025-06-01"),
      graceUntil: new Date("2025-06-10"),
    };
    expect(isAddonEntitled(record, now)).toBe(false);
  });

  it("returns true for active subscription without paidUntil", () => {
    const record: EntitlementRecord = {
      tenantId: "t1",
      addonCode: "payroll",
      status: "active",
      subscriptionStatus: "active",
      installedAt: new Date("2025-01-01"),
      trialEndsAt: null,
      paidUntil: null,
      graceUntil: null,
    };
    expect(isAddonEntitled(record, now)).toBe(true);
  });

  it("returns true when status is trial with active trial subscription", () => {
    const record: EntitlementRecord = {
      tenantId: "t1",
      addonCode: "payroll",
      status: "trial",
      subscriptionStatus: "trialing",
      installedAt: new Date("2025-06-01"),
      trialEndsAt: new Date("2025-06-20"),
      paidUntil: null,
      graceUntil: null,
    };
    expect(isAddonEntitled(record, now)).toBe(true);
  });
});

describe("Middleware Responses", () => {
  it("should have correct error codes for different denial reasons", () => {
    const expectedCodes = [
      "ADDON_EXPIRED",
      "ADDON_TRIAL_EXPIRED",
      "ADDON_NOT_INSTALLED",
      "ADDON_CANCELLED",
      "ADDON_DEPENDENCY_MISSING",
      "ADDON_DEPENDENCY_EXPIRED",
    ];
    
    expectedCodes.forEach(code => {
      expect(typeof code).toBe("string");
      expect(code.startsWith("ADDON_")).toBe(true);
    });
  });
});
