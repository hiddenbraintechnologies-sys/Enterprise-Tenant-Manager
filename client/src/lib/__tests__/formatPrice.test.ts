import { formatPrice, formatPriceOrFree } from "../formatPrice";

describe("formatPrice", () => {
  describe("India currency (INR)", () => {
    it("should format ₹99 for India Basic plan", () => {
      const result = formatPrice(99, "INR");
      expect(result).toBe("₹99");
    });

    it("should format ₹199 for India Pro plan", () => {
      const result = formatPrice(199, "INR");
      expect(result).toBe("₹199");
    });

    it("should format ₹0 for zero amount", () => {
      const result = formatPrice(0, "INR");
      expect(result).toBe("₹0");
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

  describe("Other currencies", () => {
    it("should format USD correctly", () => {
      const result = formatPrice(50, "USD");
      expect(result).toContain("$");
      expect(result).toContain("50");
    });

    it("should format USD with fractional amounts", () => {
      const result = formatPrice(29.99, "USD");
      expect(result).toContain("$");
      expect(result).toContain("29.99");
    });

    it("should format GBP correctly", () => {
      const result = formatPrice(25, "GBP");
      expect(result).toContain("£");
      expect(result).toContain("25");
    });

    it("should format GBP with fractional amounts", () => {
      const result = formatPrice(19.50, "GBP");
      expect(result).toContain("£");
      expect(result).toContain("19.50");
    });

    it("should format AED correctly", () => {
      const result = formatPrice(100, "AED");
      expect(result).toContain("AED");
      expect(result).toContain("100");
    });
  });

  describe("Fallback behavior", () => {
    it("should default to INR when currency is not provided", () => {
      const result = formatPrice(99);
      expect(result).toBe("₹99");
    });

    it("should fallback to INR for invalid currency codes", () => {
      const result = formatPrice(99, "INVALID");
      expect(result).toBe("₹99");
    });
  });
});

describe("formatPriceOrFree", () => {
  it("should return 'Free' for zero amount", () => {
    expect(formatPriceOrFree(0, "INR")).toBe("Free");
    expect(formatPriceOrFree("0", "INR")).toBe("Free");
    expect(formatPriceOrFree("0.00", "INR")).toBe("Free");
  });

  it("should return 'Free' for null/undefined", () => {
    expect(formatPriceOrFree(null, "INR")).toBe("Free");
    expect(formatPriceOrFree(undefined, "INR")).toBe("Free");
  });

  it("should format non-zero amounts with currency", () => {
    expect(formatPriceOrFree(99, "INR")).toBe("₹99");
    expect(formatPriceOrFree(199, "INR")).toBe("₹199");
  });

  it("should show Free for India Free plan (₹0)", () => {
    expect(formatPriceOrFree(0, "INR")).toBe("Free");
  });
});
