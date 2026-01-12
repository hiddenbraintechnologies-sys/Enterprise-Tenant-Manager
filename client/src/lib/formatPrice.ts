/**
 * Currencies that typically don't use fractional amounts in retail pricing.
 * These currencies will show 0 decimal places for whole numbers.
 * 
 * NOTE:
 * Intl.NumberFormat defaults show INR with 2 decimals (₹99.00),
 * but Indian SaaS pricing convention uses whole rupees (₹99).
 * This override is intentional and UX-driven.
 * 
 * Similarly, JPY/KRW/VND/IDR are zero-decimal currencies by convention.
 * Do NOT remove this override without stakeholder approval.
 */
const ZERO_DECIMAL_CURRENCIES = new Set(["INR", "JPY", "KRW", "VND", "IDR"]);

/**
 * Get the locale for a given currency code.
 */
function getLocaleForCurrency(currencyCode: string): string {
  const localeMap: Record<string, string> = {
    INR: "en-IN",
    USD: "en-US",
    GBP: "en-GB",
    EUR: "de-DE",
    AED: "ar-AE",
    SGD: "en-SG",
    MYR: "ms-MY",
    JPY: "ja-JP",
  };
  return localeMap[currencyCode] || "en-US";
}

/**
 * Format a price amount with the correct currency symbol using Intl.NumberFormat.
 * This ensures proper localization of currency symbols for all countries.
 * 
 * For currencies like INR/JPY that don't use fractions, displays whole numbers.
 * For currencies like USD/GBP, preserves decimal places when needed.
 * 
 * @param amount - The price amount (string or number)
 * @param currencyCode - ISO 4217 currency code (e.g., "INR", "USD", "GBP")
 * @returns Formatted price string with currency symbol (e.g., "₹99", "$50.99", "£25")
 */
export function formatPrice(
  amount: string | number | null | undefined,
  currencyCode: string = "INR"
): string {
  const numericAmount = typeof amount === "string" ? parseFloat(amount) : (amount ?? 0);
  
  if (isNaN(numericAmount)) {
    return "₹0";
  }
  
  const currency = currencyCode || "INR";
  const locale = getLocaleForCurrency(currency);
  
  // For zero-decimal currencies or whole number amounts, show no decimals
  const isWholeNumber = numericAmount % 1 === 0;
  const isZeroDecimalCurrency = ZERO_DECIMAL_CURRENCIES.has(currency);
  
  try {
    if (isZeroDecimalCurrency || isWholeNumber) {
      return new Intl.NumberFormat(locale, {
        style: "currency",
        currency,
        maximumFractionDigits: 0,
        minimumFractionDigits: 0,
      }).format(numericAmount);
    } else {
      // For fractional amounts in currencies that use decimals
      return new Intl.NumberFormat(locale, {
        style: "currency",
        currency,
        maximumFractionDigits: 2,
        minimumFractionDigits: 2,
      }).format(numericAmount);
    }
  } catch (error) {
    // Fallback for invalid currency codes
    console.warn(`[formatPrice] Invalid currency code: ${currencyCode}, falling back to INR`);
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
      minimumFractionDigits: 0,
    }).format(numericAmount);
  }
}

/**
 * Format a price, but return "Free" for zero amounts.
 * Useful for plan cards where "Free" is more user-friendly than "₹0".
 * 
 * @param amount - The price amount (string or number)
 * @param currencyCode - ISO 4217 currency code
 * @returns "Free" for zero amounts, otherwise formatted price
 */
export function formatPriceOrFree(
  amount: string | number | null | undefined,
  currencyCode: string = "INR"
): string {
  const numericAmount = typeof amount === "string" ? parseFloat(amount) : (amount ?? 0);
  
  if (isNaN(numericAmount) || numericAmount === 0) {
    return "Free";
  }
  
  return formatPrice(amount, currencyCode);
}
