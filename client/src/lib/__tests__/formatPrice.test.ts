import { formatPrice, formatPriceOrFree } from "../formatPrice";

describe("formatPrice", () => {
  describe("India currency (INR) - zero decimal convention", () => {
    it("should format INR whole number without decimals: 99 -> ₹99", () => {
      expect(formatPrice(99, "INR")).toBe("₹99");
    });

    it("should format INR large amount with thousands separator: 1999 -> ₹1,999", () => {
      expect(formatPrice(1999, "INR")).toBe("₹1,999");
    });

    it("should format ₹199 for India Pro plan", () => {
      expect(formatPrice(199, "INR")).toBe("₹199");
    });

    it("should strip .00 from INR amounts: 99.00 -> ₹99 (never show decimals)", () => {
      expect(formatPrice("99.00", "INR")).toBe("₹99");
      expect(formatPrice(99.0, "INR")).toBe("₹99");
    });

    it("should format ₹0 for zero amount", () => {
      expect(formatPrice(0, "INR")).toBe("₹0");
    });

    it("should handle string amounts", () => {
      expect(formatPrice("99", "INR")).toBe("₹99");
      expect(formatPrice("199.00", "INR")).toBe("₹199");
    });

    it("should handle null/undefined amounts", () => {
      expect(formatPrice(null, "INR")).toBe("₹0");
      expect(formatPrice(undefined, "INR")).toBe("₹0");
    });
  });

  describe("USD - 2 decimal convention", () => {
    it("should format USD whole number without decimals: 50 -> $50", () => {
      expect(formatPrice(50, "USD")).toBe("$50");
    });

    it("should format USD fractional with 2 decimals: 29.99 -> $29.99", () => {
      expect(formatPrice(29.99, "USD")).toBe("$29.99");
    });

    it("should format USD with trailing zero: 19.50 -> $19.50", () => {
      expect(formatPrice(19.5, "USD")).toBe("$19.50");
    });
  });

  describe("GBP - 2 decimal convention", () => {
    it("should format GBP whole number without decimals: 25 -> £25", () => {
      expect(formatPrice(25, "GBP")).toBe("£25");
    });

    it("should format GBP fractional with trailing zero: 19.5 -> £19.50", () => {
      expect(formatPrice(19.5, "GBP")).toBe("£19.50");
    });

    it("should format GBP with 2 decimals: 29.99 -> £29.99", () => {
      expect(formatPrice(29.99, "GBP")).toBe("£29.99");
    });
  });

  describe("JPY - zero decimal currency", () => {
    it("should format JPY without decimals: 500 -> ¥500 (no .00)", () => {
      const result = formatPrice(500, "JPY");
      expect(result).toContain("500");
      expect(result).not.toContain(".");
    });

    it("should format JPY large amounts with thousands separator", () => {
      const result = formatPrice(10000, "JPY");
      expect(result).toContain("10");
      expect(result).toContain("000");
      expect(result).not.toContain(".");
    });
  });

  describe("Other currencies", () => {
    it("should format AED correctly", () => {
      const result = formatPrice(100, "AED");
      expect(result).toContain("100");
    });

    it("should format EUR correctly", () => {
      const result = formatPrice(50, "EUR");
      expect(result).toContain("50");
      expect(result).toContain("€");
    });
  });

  describe("Fallback and error handling", () => {
    it("should default to INR when currency is not provided", () => {
      expect(formatPrice(99)).toBe("₹99");
    });

    it("should fallback to INR for invalid currency codes (not crash)", () => {
      expect(formatPrice(99, "INVALID")).toBe("₹99");
      expect(formatPrice(99, "")).toBe("₹99");
    });

    it("should handle unknown but valid-looking currency codes without crashing", () => {
      const result = formatPrice(99, "XYZ");
      expect(result).toContain("99");
    });

    it("should handle NaN gracefully", () => {
      expect(formatPrice("not-a-number", "INR")).toBe("₹0");
    });

    it("should handle empty string", () => {
      expect(formatPrice("", "INR")).toBe("₹0");
    });
  });
});

describe("formatPriceOrFree", () => {
  describe("Zero amounts display as 'Free'", () => {
    it("should return 'Free' for zero numeric amount", () => {
      expect(formatPriceOrFree(0, "INR")).toBe("Free");
    });

    it("should return 'Free' for zero string amount", () => {
      expect(formatPriceOrFree("0", "INR")).toBe("Free");
      expect(formatPriceOrFree("0.00", "INR")).toBe("Free");
    });

    it("should return 'Free' for null/undefined", () => {
      expect(formatPriceOrFree(null, "INR")).toBe("Free");
      expect(formatPriceOrFree(undefined, "INR")).toBe("Free");
    });

    it("should return 'Free' for zero in any currency", () => {
      expect(formatPriceOrFree(0, "USD")).toBe("Free");
      expect(formatPriceOrFree(0, "GBP")).toBe("Free");
      expect(formatPriceOrFree(0, "JPY")).toBe("Free");
    });
  });

  describe("Non-zero amounts display with currency", () => {
    it("should format INR non-zero amounts", () => {
      expect(formatPriceOrFree(99, "INR")).toBe("₹99");
      expect(formatPriceOrFree(199, "INR")).toBe("₹199");
    });

    it("should format USD non-zero amounts", () => {
      expect(formatPriceOrFree(29.99, "USD")).toBe("$29.99");
    });

    it("should format GBP non-zero amounts", () => {
      expect(formatPriceOrFree(19.5, "GBP")).toBe("£19.50");
    });
  });
});
