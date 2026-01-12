import { describe, it, expect } from "@jest/globals";
import {
  getLostFeatures,
  getReducedLimits,
  formatLimitDisplay,
  type PlanWithFlags,
} from "../downgrade-helpers";

describe("getLostFeatures", () => {
  it("should return features enabled in current plan but not in target plan", () => {
    const currentPlan: PlanWithFlags = {
      featureFlags: {
        gst_features: true,
        whatsapp_automation: true,
        priority_support: true,
        email_notifications: true,
      },
    };

    const targetPlan: PlanWithFlags = {
      featureFlags: {
        gst_features: true,
        whatsapp_automation: false,
        priority_support: false,
        email_notifications: true,
      },
    };

    const lostFeatures = getLostFeatures(currentPlan, targetPlan);

    expect(lostFeatures).toHaveLength(2);
    expect(lostFeatures.map((f) => f.key)).toContain("whatsapp_automation");
    expect(lostFeatures.map((f) => f.key)).toContain("priority_support");
    expect(lostFeatures.map((f) => f.key)).not.toContain("gst_features");
    expect(lostFeatures.map((f) => f.key)).not.toContain("email_notifications");
  });

  it("should return empty array when no features are lost", () => {
    const currentPlan: PlanWithFlags = {
      featureFlags: {
        gst_features: true,
        email_notifications: true,
      },
    };

    const targetPlan: PlanWithFlags = {
      featureFlags: {
        gst_features: true,
        email_notifications: true,
        whatsapp_automation: true,
      },
    };

    const lostFeatures = getLostFeatures(currentPlan, targetPlan);
    expect(lostFeatures).toHaveLength(0);
  });

  it("should handle missing featureFlags gracefully", () => {
    const currentPlan: PlanWithFlags = {};
    const targetPlan: PlanWithFlags = {};

    const lostFeatures = getLostFeatures(currentPlan, targetPlan);
    expect(lostFeatures).toHaveLength(0);
  });

  it("should treat undefined target flags as feature lost", () => {
    const currentPlan: PlanWithFlags = {
      featureFlags: {
        api_access: true,
        custom_branding: true,
      },
    };

    const targetPlan: PlanWithFlags = {
      featureFlags: {},
    };

    const lostFeatures = getLostFeatures(currentPlan, targetPlan);
    expect(lostFeatures).toHaveLength(2);
  });

  it("should include label and description from catalog", () => {
    const currentPlan: PlanWithFlags = {
      featureFlags: {
        advanced_analytics: true,
      },
    };

    const targetPlan: PlanWithFlags = {
      featureFlags: {
        advanced_analytics: false,
      },
    };

    const lostFeatures = getLostFeatures(currentPlan, targetPlan);
    expect(lostFeatures).toHaveLength(1);
    expect(lostFeatures[0].key).toBe("advanced_analytics");
    expect(lostFeatures[0].label).toBe("Advanced analytics");
    expect(lostFeatures[0].description).toBeDefined();
  });
});

describe("getReducedLimits", () => {
  it("should detect when unlimited (-1) becomes finite", () => {
    const currentPlan: PlanWithFlags = {
      limits: {
        users: -1,
        records: -1,
      },
    };

    const targetPlan: PlanWithFlags = {
      limits: {
        users: 5,
        records: 500,
      },
    };

    const reducedLimits = getReducedLimits(currentPlan, targetPlan);

    expect(reducedLimits.length).toBeGreaterThanOrEqual(2);
    
    const usersLimit = reducedLimits.find((l) => l.key === "users");
    expect(usersLimit).toBeDefined();
    expect(usersLimit?.from).toBe("Unlimited");
    expect(usersLimit?.to).toBe(5);

    const recordsLimit = reducedLimits.find((l) => l.key === "records");
    expect(recordsLimit).toBeDefined();
    expect(recordsLimit?.from).toBe("Unlimited");
    expect(recordsLimit?.to).toBe(500);
  });

  it("should detect when finite limit decreases", () => {
    const currentPlan: PlanWithFlags = {
      limits: {
        customers: 200,
        storageGB: 10,
      },
    };

    const targetPlan: PlanWithFlags = {
      limits: {
        customers: 50,
        storageGB: 2,
      },
    };

    const reducedLimits = getReducedLimits(currentPlan, targetPlan);

    const customersLimit = reducedLimits.find((l) => l.key === "customers");
    expect(customersLimit).toBeDefined();
    expect(customersLimit?.from).toBe(200);
    expect(customersLimit?.to).toBe(50);

    const storageLimit = reducedLimits.find((l) => l.key === "storageGB");
    expect(storageLimit).toBeDefined();
    expect(storageLimit?.from).toBe(10);
    expect(storageLimit?.to).toBe(2);
  });

  it("should NOT include limits that stay the same", () => {
    const currentPlan: PlanWithFlags = {
      limits: {
        users: 10,
        customers: 100,
      },
    };

    const targetPlan: PlanWithFlags = {
      limits: {
        users: 10,
        customers: 100,
      },
    };

    const reducedLimits = getReducedLimits(currentPlan, targetPlan);
    expect(reducedLimits.find((l) => l.key === "users")).toBeUndefined();
    expect(reducedLimits.find((l) => l.key === "customers")).toBeUndefined();
  });

  it("should NOT include limits that increase", () => {
    const currentPlan: PlanWithFlags = {
      limits: {
        users: 5,
        customers: 50,
      },
    };

    const targetPlan: PlanWithFlags = {
      limits: {
        users: 10,
        customers: 100,
      },
    };

    const reducedLimits = getReducedLimits(currentPlan, targetPlan);
    expect(reducedLimits.find((l) => l.key === "users")).toBeUndefined();
    expect(reducedLimits.find((l) => l.key === "customers")).toBeUndefined();
  });

  it("should use maxUsers/maxCustomers as fallback for users/customers", () => {
    const currentPlan: PlanWithFlags = {
      maxUsers: 20,
      maxCustomers: 500,
    };

    const targetPlan: PlanWithFlags = {
      maxUsers: 5,
      maxCustomers: 100,
    };

    const reducedLimits = getReducedLimits(currentPlan, targetPlan);

    const usersLimit = reducedLimits.find((l) => l.key === "users");
    expect(usersLimit).toBeDefined();
    expect(usersLimit?.from).toBe(20);
    expect(usersLimit?.to).toBe(5);

    const customersLimit = reducedLimits.find((l) => l.key === "customers");
    expect(customersLimit).toBeDefined();
    expect(customersLimit?.from).toBe(500);
    expect(customersLimit?.to).toBe(100);
  });

  it("should handle mixed unlimited and finite correctly", () => {
    const currentPlan: PlanWithFlags = {
      limits: {
        users: -1,
        customers: 200,
      },
    };

    const targetPlan: PlanWithFlags = {
      limits: {
        users: -1,
        customers: 50,
      },
    };

    const reducedLimits = getReducedLimits(currentPlan, targetPlan);

    expect(reducedLimits.find((l) => l.key === "users")).toBeUndefined();
    
    const customersLimit = reducedLimits.find((l) => l.key === "customers");
    expect(customersLimit).toBeDefined();
    expect(customersLimit?.from).toBe(200);
    expect(customersLimit?.to).toBe(50);
  });
});

describe("formatLimitDisplay", () => {
  it("should return 'Unlimited' for Unlimited value", () => {
    expect(formatLimitDisplay("Unlimited")).toBe("Unlimited");
  });

  it("should format numbers with locale string", () => {
    expect(formatLimitDisplay(1000)).toBe("1,000");
    expect(formatLimitDisplay(5)).toBe("5");
    expect(formatLimitDisplay(1000000)).toBe("1,000,000");
  });
});
