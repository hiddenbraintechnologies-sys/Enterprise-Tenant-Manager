/**
 * Country Defaults - Single Source of Truth
 * 
 * This file defines the default locale settings for each supported country.
 * Used during tenant creation and for fixing existing tenants with incorrect settings.
 */

export interface CountryDefaults {
  currency: string;
  timezone: string;
  locale: string;
  taxType?: string;
  taxRate?: number;
}

/**
 * Default settings for each supported country code (ISO 3166-1 alpha-2)
 */
export const COUNTRY_DEFAULTS: Record<string, CountryDefaults> = {
  MY: {
    currency: "MYR",
    timezone: "Asia/Kuala_Lumpur",
    locale: "en-MY",
    taxType: "SST",
    taxRate: 6,
  },
  IN: {
    currency: "INR",
    timezone: "Asia/Kolkata",
    locale: "en-IN",
    taxType: "GST",
    taxRate: 18,
  },
  SG: {
    currency: "SGD",
    timezone: "Asia/Singapore",
    locale: "en-SG",
    taxType: "GST",
    taxRate: 9,
  },
  AE: {
    currency: "AED",
    timezone: "Asia/Dubai",
    locale: "en-AE",
    taxType: "VAT",
    taxRate: 5,
  },
  GB: {
    currency: "GBP",
    timezone: "Europe/London",
    locale: "en-GB",
    taxType: "VAT",
    taxRate: 20,
  },
  US: {
    currency: "USD",
    timezone: "America/New_York",
    locale: "en-US",
    taxType: "SalesTax",
    taxRate: 0,
  },
};

/**
 * Get country defaults with fallback
 * @param countryCode ISO 3166-1 alpha-2 country code
 * @returns Country defaults, never returns undefined
 */
export function getCountryDefaults(countryCode: string): CountryDefaults {
  const normalized = countryCode?.toUpperCase()?.trim();
  const defaults = COUNTRY_DEFAULTS[normalized];
  
  if (defaults) {
    return defaults;
  }
  
  console.warn(`[country-defaults] Unknown country code: ${countryCode}, using MY defaults`);
  return COUNTRY_DEFAULTS.MY;
}

/**
 * Normalize country name to ISO 3166-1 alpha-2 code
 * @param country Country name or code
 * @returns ISO 3166-1 alpha-2 code
 */
export function normalizeCountryCode(country: string): string {
  if (!country) return "MY";
  
  const normalized = country.trim().toLowerCase();
  
  const countryNameMap: Record<string, string> = {
    "malaysia": "MY",
    "my": "MY",
    "india": "IN",
    "in": "IN",
    "singapore": "SG",
    "sg": "SG",
    "united arab emirates": "AE",
    "uae": "AE",
    "ae": "AE",
    "united kingdom": "GB",
    "uk": "GB",
    "gb": "GB",
    "united states": "US",
    "usa": "US",
    "us": "US",
  };
  
  return countryNameMap[normalized] || country.toUpperCase().slice(0, 2);
}

/**
 * Check if country defaults match expected values
 * Used for repair scripts
 */
export function needsRepair(
  countryCode: string,
  currentCurrency: string,
  currentTimezone: string
): boolean {
  const expected = getCountryDefaults(countryCode);
  return currentCurrency !== expected.currency || currentTimezone !== expected.timezone;
}
