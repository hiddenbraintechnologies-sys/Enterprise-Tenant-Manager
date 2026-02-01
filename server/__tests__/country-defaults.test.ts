import { 
  getCountryDefaults, 
  normalizeCountryCode, 
  needsRepair,
  COUNTRY_DEFAULTS 
} from "../../shared/locale/country-defaults";

describe("Country Defaults", () => {
  describe("COUNTRY_DEFAULTS", () => {
    test("Malaysia has correct defaults", () => {
      expect(COUNTRY_DEFAULTS.MY).toEqual({
        currency: "MYR",
        timezone: "Asia/Kuala_Lumpur",
        locale: "en-MY",
        taxType: "SST",
        taxRate: 6,
      });
    });

    test("India has correct defaults", () => {
      expect(COUNTRY_DEFAULTS.IN).toEqual({
        currency: "INR",
        timezone: "Asia/Kolkata",
        locale: "en-IN",
        taxType: "GST",
        taxRate: 18,
      });
    });

    test("Singapore has correct defaults", () => {
      expect(COUNTRY_DEFAULTS.SG).toEqual({
        currency: "SGD",
        timezone: "Asia/Singapore",
        locale: "en-SG",
        taxType: "GST",
        taxRate: 9,
      });
    });

    test("UAE has correct defaults", () => {
      expect(COUNTRY_DEFAULTS.AE).toEqual({
        currency: "AED",
        timezone: "Asia/Dubai",
        locale: "en-AE",
        taxType: "VAT",
        taxRate: 5,
      });
    });

    test("UK has correct defaults", () => {
      expect(COUNTRY_DEFAULTS.GB).toEqual({
        currency: "GBP",
        timezone: "Europe/London",
        locale: "en-GB",
        taxType: "VAT",
        taxRate: 20,
      });
    });

    test("US has correct defaults", () => {
      expect(COUNTRY_DEFAULTS.US).toEqual({
        currency: "USD",
        timezone: "America/New_York",
        locale: "en-US",
        taxType: "SalesTax",
        taxRate: 0,
      });
    });
  });

  describe("getCountryDefaults", () => {
    test("returns correct defaults for MY", () => {
      const defaults = getCountryDefaults("MY");
      expect(defaults.currency).toBe("MYR");
      expect(defaults.timezone).toBe("Asia/Kuala_Lumpur");
    });

    test("returns correct defaults for IN", () => {
      const defaults = getCountryDefaults("IN");
      expect(defaults.currency).toBe("INR");
      expect(defaults.timezone).toBe("Asia/Kolkata");
    });

    test("handles lowercase country code", () => {
      const defaults = getCountryDefaults("my");
      expect(defaults.currency).toBe("MYR");
      expect(defaults.timezone).toBe("Asia/Kuala_Lumpur");
    });

    test("handles whitespace", () => {
      const defaults = getCountryDefaults("  MY  ");
      expect(defaults.currency).toBe("MYR");
    });

    test("falls back to MY for unknown country", () => {
      const defaults = getCountryDefaults("XX");
      expect(defaults.currency).toBe("MYR");
      expect(defaults.timezone).toBe("Asia/Kuala_Lumpur");
    });
  });

  describe("normalizeCountryCode", () => {
    test("normalizes Malaysia to MY", () => {
      expect(normalizeCountryCode("Malaysia")).toBe("MY");
      expect(normalizeCountryCode("malaysia")).toBe("MY");
      expect(normalizeCountryCode("MALAYSIA")).toBe("MY");
    });

    test("normalizes India to IN", () => {
      expect(normalizeCountryCode("India")).toBe("IN");
      expect(normalizeCountryCode("india")).toBe("IN");
    });

    test("normalizes UAE to AE", () => {
      expect(normalizeCountryCode("United Arab Emirates")).toBe("AE");
      expect(normalizeCountryCode("uae")).toBe("AE");
    });

    test("normalizes UK to GB", () => {
      expect(normalizeCountryCode("United Kingdom")).toBe("GB");
      expect(normalizeCountryCode("uk")).toBe("GB");
    });

    test("passes through already-normalized codes", () => {
      expect(normalizeCountryCode("MY")).toBe("MY");
      expect(normalizeCountryCode("IN")).toBe("IN");
    });
  });

  describe("needsRepair", () => {
    test("returns false when settings match", () => {
      expect(needsRepair("MY", "MYR", "Asia/Kuala_Lumpur")).toBe(false);
      expect(needsRepair("IN", "INR", "Asia/Kolkata")).toBe(false);
    });

    test("returns true when timezone is wrong", () => {
      expect(needsRepair("MY", "MYR", "Asia/Singapore")).toBe(true);
      expect(needsRepair("MY", "MYR", "Asia/Kolkata")).toBe(true);
    });

    test("returns true when currency is wrong", () => {
      expect(needsRepair("MY", "INR", "Asia/Kuala_Lumpur")).toBe(true);
    });

    test("returns true when both are wrong", () => {
      expect(needsRepair("MY", "INR", "Asia/Kolkata")).toBe(true);
    });
  });
});
