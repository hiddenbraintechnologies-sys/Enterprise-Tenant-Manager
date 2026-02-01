import { describe, expect, test, beforeEach, afterEach } from "@jest/globals";
import { 
  containsProfanity, 
  isProfanityCheckEnabled, 
  isStrictProfanityBlock 
} from "../validation/profanity";
import { validateBusinessName } from "../../shared/validation/business";

describe("Profanity Detection", () => {
  describe("containsProfanity", () => {
    test("should detect explicit profanity", () => {
      const result = containsProfanity("damn company");
      expect(result.hit).toBe(true);
      expect(result.ruleId).toBeDefined();
    });

    test("should detect obfuscated profanity (leet speak)", () => {
      const result = containsProfanity("d4mn services");
      expect(result.hit).toBe(true);
    });

    test("should detect character repetition", () => {
      const result = containsProfanity("fuuuck business");
      expect(result.hit).toBe(true);
    });

    test("should NOT flag false positives in allowlist", () => {
      const allowlistWords = [
        "assistant",
        "classic",
        "cockpit",
        "scunthorpe",
        "analyst",
        "Essex",
        "Sussex",
        "Hancock",
        "Peacock",
        "Babcock"
      ];
      
      for (const word of allowlistWords) {
        const result = containsProfanity(word);
        expect(result.hit).toBe(false);
      }
    });

    test("should allow clean business names", () => {
      const cleanNames = [
        "Acme Corporation",
        "Tech Solutions Ltd",
        "Global Services Inc",
        "Sunshine Bakery",
        "Mountain View Trading",
        "Blue Ocean Consulting"
      ];
      
      for (const name of cleanNames) {
        const result = containsProfanity(name);
        expect(result.hit).toBe(false);
      }
    });

    test("should handle Unicode business names", () => {
      const unicodeNames = [
        "张伟贸易有限公司",
        "Müller GmbH",
        "Café del Sol",
        "Sdn. Bhd.",
        "Trading Co."
      ];
      
      for (const name of unicodeNames) {
        const result = containsProfanity(name);
        expect(result.hit).toBe(false);
      }
    });

    test("should detect profanity with special characters", () => {
      const result = containsProfanity("sh!t-services");
      expect(result.hit).toBe(true);
    });
  });

  describe("validateBusinessName", () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    test("should normalize whitespace", () => {
      const result = validateBusinessName("  Acme   Corporation  ");
      expect(result.normalized).toBe("Acme Corporation");
    });

    test("should reject too short names", () => {
      const result = validateBusinessName("A");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("at least 2 characters");
    });

    test("should reject too long names", () => {
      const longName = "A".repeat(121);
      const result = validateBusinessName(longName);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("at most 120 characters");
    });

    test("should reject special-character-only names", () => {
      const result = validateBusinessName("---...");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("at least one letter or number");
    });

    test("should allow valid business names with punctuation", () => {
      const result = validateBusinessName("O'Connor & Associates, LLC");
      expect(result.valid).toBe(true);
    });

    test("should pass validation for profane names (profanity check is separate)", () => {
      const result = validateBusinessName("damn company");
      expect(result.valid).toBe(true);
      expect(result.normalized).toBe("damn company");
    });
  });

  describe("Profanity + Business validation workflow", () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    test("should detect profanity when ENABLE_PROFANITY_CHECK is true", () => {
      process.env.ENABLE_PROFANITY_CHECK = "true";
      
      const nameResult = validateBusinessName("damn company");
      expect(nameResult.valid).toBe(true);
      
      if (isProfanityCheckEnabled()) {
        const profanityResult = containsProfanity(nameResult.normalized);
        expect(profanityResult.hit).toBe(true);
        expect(profanityResult.ruleId).toBeDefined();
      }
    });

    test("should not check profanity when ENABLE_PROFANITY_CHECK is false", () => {
      process.env.ENABLE_PROFANITY_CHECK = "false";
      
      const nameResult = validateBusinessName("damn company");
      expect(nameResult.valid).toBe(true);
      
      expect(isProfanityCheckEnabled()).toBe(false);
    });
  });

  describe("Environment variable controls", () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    test("isProfanityCheckEnabled returns correct value", () => {
      process.env.ENABLE_PROFANITY_CHECK = "true";
      expect(isProfanityCheckEnabled()).toBe(true);
      
      process.env.ENABLE_PROFANITY_CHECK = "false";
      expect(isProfanityCheckEnabled()).toBe(false);
      
      delete process.env.ENABLE_PROFANITY_CHECK;
      expect(isProfanityCheckEnabled()).toBe(false);
    });

    test("isStrictProfanityBlock returns correct value", () => {
      process.env.STRICT_PROFANITY_BLOCK = "true";
      expect(isStrictProfanityBlock()).toBe(true);
      
      process.env.STRICT_PROFANITY_BLOCK = "false";
      expect(isStrictProfanityBlock()).toBe(false);
      
      delete process.env.STRICT_PROFANITY_BLOCK;
      expect(isStrictProfanityBlock()).toBe(false);
    });
  });
});
