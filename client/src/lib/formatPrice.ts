/**
 * Format a price amount with the correct currency symbol using Intl.NumberFormat.
 * This ensures proper localization of currency symbols for all countries.
 * 
 * @param amount - The price amount (string or number)
 * @param currencyCode - ISO 4217 currency code (e.g., "INR", "USD", "GBP")
 * @returns Formatted price string with currency symbol (e.g., "₹99", "$50", "£25")
 */
export function formatPrice(
  amount: string | number | null | undefined,
  currencyCode: string = "INR"
): string {
  const numericAmount = typeof amount === "string" ? parseFloat(amount) : (amount ?? 0);
  
  if (isNaN(numericAmount)) {
    return "₹0";
  }
  
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: currencyCode || "INR",
      maximumFractionDigits: 0,
      minimumFractionDigits: 0,
    }).format(numericAmount);
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
