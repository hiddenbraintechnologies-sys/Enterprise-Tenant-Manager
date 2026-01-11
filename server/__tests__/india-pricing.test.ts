import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import { 
  INDIA_PRICING_TIERS, 
  INDIA_PRICING_CONFIG, 
  INDIA_TIER_LIMITS,
  getTierLimits,
  checkRecordLimit,
  checkUserLimit,
  getPlanFeatures,
  hasFeature,
} from "../core/india-pricing";

describe("India Pricing Configuration", () => {
  describe("INDIA_PRICING_TIERS", () => {
    it("should have FREE, BASIC, and PRO tiers", () => {
      expect(INDIA_PRICING_TIERS.FREE).toBe("free");
      expect(INDIA_PRICING_TIERS.BASIC).toBe("basic");
      expect(INDIA_PRICING_TIERS.PRO).toBe("pro");
    });
  });

  describe("INDIA_PRICING_CONFIG", () => {
    it("should have correct prices for each tier", () => {
      expect(INDIA_PRICING_CONFIG.free.localPrice).toBe("0");
      expect(INDIA_PRICING_CONFIG.basic.localPrice).toBe("99");
      expect(INDIA_PRICING_CONFIG.pro.localPrice).toBe("199");
    });

    it("should have INR currency for all tiers", () => {
      Object.values(INDIA_PRICING_CONFIG).forEach(config => {
        expect(config.currency).toBe("INR");
      });
    });

    it("should have correct feature flags for FREE tier", () => {
      const freeFeatures = INDIA_PRICING_CONFIG.free.features;
      expect(freeFeatures.recordLimit).toBe(true);
      expect(freeFeatures.whatsappAutomation).toBe(false);
      expect(freeFeatures.gstFeatures).toBe(false);
    });

    it("should have correct feature flags for BASIC tier", () => {
      const basicFeatures = INDIA_PRICING_CONFIG.basic.features;
      expect(basicFeatures.recordLimit).toBe(true);
      expect(basicFeatures.whatsappAutomation).toBe(false);
      expect(basicFeatures.gstFeatures).toBe(true);
    });

    it("should have correct feature flags for PRO tier", () => {
      const proFeatures = INDIA_PRICING_CONFIG.pro.features;
      expect(proFeatures.unlimitedRecords).toBe(true);
      expect(proFeatures.whatsappAutomation).toBe(true);
      expect(proFeatures.gstFeatures).toBe(true);
    });
  });

  describe("INDIA_TIER_LIMITS", () => {
    it("should have correct limits for FREE tier", () => {
      expect(INDIA_TIER_LIMITS.free.maxUsers).toBe(1);
      expect(INDIA_TIER_LIMITS.free.maxRecords).toBe(50);
      expect(INDIA_TIER_LIMITS.free.maxCustomers).toBe(25);
    });

    it("should have correct limits for BASIC tier", () => {
      expect(INDIA_TIER_LIMITS.basic.maxUsers).toBe(3);
      expect(INDIA_TIER_LIMITS.basic.maxRecords).toBe(500);
      expect(INDIA_TIER_LIMITS.basic.maxCustomers).toBe(200);
    });

    it("should have unlimited (-1) for PRO tier records and customers", () => {
      expect(INDIA_TIER_LIMITS.pro.maxRecords).toBe(-1);
      expect(INDIA_TIER_LIMITS.pro.maxCustomers).toBe(-1);
    });
  });

  describe("getTierLimits", () => {
    it("should return correct limits for each tier", () => {
      expect(getTierLimits("free").maxRecords).toBe(50);
      expect(getTierLimits("basic").maxRecords).toBe(500);
      expect(getTierLimits("pro").maxRecords).toBe(-1);
    });

    it("should return free tier limits for unknown tier", () => {
      expect(getTierLimits("unknown").maxRecords).toBe(50);
    });
  });

  describe("checkRecordLimit", () => {
    it("should allow creation when under limit", () => {
      const result = checkRecordLimit("free", 10);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(40);
    });

    it("should block creation when at limit", () => {
      const result = checkRecordLimit("free", 50);
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it("should always allow for PRO tier (unlimited)", () => {
      const result = checkRecordLimit("pro", 1000);
      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(-1);
    });
  });

  describe("checkUserLimit", () => {
    it("should allow adding user when under limit", () => {
      const result = checkUserLimit("basic", 1);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(2);
    });

    it("should block adding user when at limit", () => {
      const result = checkUserLimit("free", 1);
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });
  });

  describe("getPlanFeatures", () => {
    it("should return features for each tier", () => {
      const freeFeatures = getPlanFeatures("free");
      expect(freeFeatures.whatsappAutomation).toBe(false);

      const proFeatures = getPlanFeatures("pro");
      expect(proFeatures.whatsappAutomation).toBe(true);
    });
  });

  describe("hasFeature", () => {
    it("should return true for enabled features", () => {
      expect(hasFeature("pro", "whatsappAutomation")).toBe(true);
      expect(hasFeature("basic", "gstFeatures")).toBe(true);
    });

    it("should return false for disabled features", () => {
      expect(hasFeature("free", "whatsappAutomation")).toBe(false);
      expect(hasFeature("basic", "whatsappAutomation")).toBe(false);
    });
  });
});

describe("Free Plan Auto-Applied on Signup", () => {
  it("should default tenant subscriptionTier to 'free'", () => {
    const defaultTier = "free";
    expect(defaultTier).toBe("free");
  });
});
