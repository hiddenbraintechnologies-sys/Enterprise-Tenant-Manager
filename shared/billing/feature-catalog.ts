export interface FeatureCatalogItem {
  key: string;
  label: string;
  description: string;
  group: "core_modules" | "notifications" | "analytics" | "support";
  restrictedOnFree?: boolean;
}

export interface LimitCatalogItem {
  key: string;
  label: string;
  description: string;
  defaultValue: number;
}

export const FEATURE_CATALOG: FeatureCatalogItem[] = [
  { key: "consulting", label: "Consulting", description: "Consulting business module", group: "core_modules" },
  { key: "software_services", label: "Software Services", description: "Software services module", group: "core_modules", restrictedOnFree: true },
  { key: "invoicing", label: "Invoicing", description: "Create and manage invoices", group: "core_modules", restrictedOnFree: true },
  { key: "gst_features", label: "GST Features", description: "GSTIN validation + tax breakdown", group: "core_modules" },
  { key: "custom_roles", label: "Custom Roles", description: "Create custom staff roles and permissions", group: "core_modules" },
  { key: "email_notifications", label: "Email Notifications", description: "Automated email alerts", group: "notifications" },
  { key: "sms_notifications", label: "SMS Notifications", description: "SMS alerts and reminders", group: "notifications" },
  { key: "whatsapp_automation", label: "WhatsApp Automation", description: "Automated WhatsApp reminders and updates", group: "notifications", restrictedOnFree: true },
  { key: "analytics_basic", label: "Basic Analytics", description: "Standard reports and dashboards", group: "analytics" },
  { key: "analytics_advanced", label: "Advanced Analytics", description: "Detailed reports and insights", group: "analytics" },
  { key: "priority_support", label: "Priority Support", description: "Faster support SLA", group: "support" },
];

export const LIMIT_CATALOG: LimitCatalogItem[] = [
  { key: "users", label: "Team Members", description: "Maximum number of staff/team accounts", defaultValue: 1 },
  { key: "clients", label: "Clients", description: "Maximum client profiles", defaultValue: 25 },
  { key: "records", label: "Records", description: "Total records across all modules", defaultValue: 50 },
  { key: "projects", label: "Projects", description: "Maximum active projects", defaultValue: 3 },
  { key: "invoices_per_month", label: "Invoices/Month", description: "Monthly invoice generation limit", defaultValue: 0 },
  { key: "storage_mb", label: "Storage (MB)", description: "File storage capacity in MB", defaultValue: 100 },
];

export const FEATURE_KEYS = FEATURE_CATALOG.map(f => f.key);
export const LIMIT_KEYS = LIMIT_CATALOG.map(l => l.key);

export const FREE_PLAN_RESTRICTED_FEATURES = FEATURE_CATALOG
  .filter(f => f.restrictedOnFree)
  .map(f => f.key);

export const FEATURE_GROUPS = {
  core_modules: "Core Modules",
  notifications: "Notifications",
  analytics: "Analytics",
  support: "Support",
} as const;

export const COUNTRIES = [
  { code: "IN", name: "India", currency: "INR" },
  { code: "MY", name: "Malaysia", currency: "MYR" },
  { code: "GB", name: "United Kingdom", currency: "GBP" },
  { code: "AE", name: "UAE", currency: "AED" },
  { code: "SG", name: "Singapore", currency: "SGD" },
  { code: "US", name: "United States", currency: "USD" },
];

export const COUNTRY_CURRENCY_MAP: Record<string, string> = {
  IN: "INR",
  MY: "MYR",
  GB: "GBP",
  AE: "AED",
  SG: "SGD",
  US: "USD",
};

export const INDIA_VALID_PRICES = [0, 99, 199];

export const CURRENCIES = [
  { code: "INR", symbol: "₹", name: "Indian Rupee" },
  { code: "MYR", symbol: "RM", name: "Malaysian Ringgit" },
  { code: "GBP", symbol: "£", name: "British Pound" },
  { code: "AED", symbol: "د.إ", name: "UAE Dirham" },
  { code: "SGD", symbol: "S$", name: "Singapore Dollar" },
  { code: "USD", symbol: "$", name: "US Dollar" },
];

export const BILLING_INTERVALS = [
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
];

export const PLAN_TIERS = [
  { value: "free", label: "Free" },
  { value: "starter", label: "Starter" },
  { value: "basic", label: "Basic" },
  { value: "pro", label: "Pro" },
  { value: "enterprise", label: "Enterprise" },
];

export type FeatureFlags = Record<string, boolean>;
export type PlanLimits = Record<string, number>;

export interface PlanValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateFeatureFlags(
  featureFlags: Record<string, unknown>,
  tier: string
): PlanValidationResult {
  const errors: string[] = [];
  
  for (const key of Object.keys(featureFlags)) {
    if (!FEATURE_KEYS.includes(key)) {
      errors.push(`Unknown feature key: ${key}`);
    }
    if (typeof featureFlags[key] !== "boolean") {
      errors.push(`Feature '${key}' must be a boolean, got ${typeof featureFlags[key]}`);
    }
  }
  
  if (tier === "free") {
    for (const restrictedKey of FREE_PLAN_RESTRICTED_FEATURES) {
      if (featureFlags[restrictedKey] === true) {
        errors.push(`Free plan cannot enable feature: ${restrictedKey}`);
      }
    }
  }
  
  return { valid: errors.length === 0, errors };
}

export function validateLimits(limits: Record<string, unknown>): PlanValidationResult {
  const errors: string[] = [];
  
  for (const key of Object.keys(limits)) {
    if (!LIMIT_KEYS.includes(key)) {
      errors.push(`Unknown limit key: ${key}`);
    }
    const value = limits[key];
    if (typeof value !== "number" || !Number.isInteger(value)) {
      errors.push(`Limit '${key}' must be an integer, got ${typeof value}`);
    } else if (value < -1) {
      errors.push(`Limit '${key}' must be >= -1 (use -1 for Unlimited)`);
    }
  }
  
  return { valid: errors.length === 0, errors };
}

export function validateCountryPricing(
  countryCode: string,
  currencyCode: string,
  basePrice: number,
  isSuperAdminOverride: boolean = false
): PlanValidationResult {
  const errors: string[] = [];
  
  const expectedCurrency = COUNTRY_CURRENCY_MAP[countryCode];
  if (expectedCurrency && currencyCode !== expectedCurrency) {
    errors.push(`Country ${countryCode} must use currency ${expectedCurrency}, got ${currencyCode}`);
  }
  
  if (countryCode === "IN" && !isSuperAdminOverride) {
    if (!INDIA_VALID_PRICES.includes(basePrice)) {
      errors.push(`India plans must have base_price of ${INDIA_VALID_PRICES.join(", ")} (got ${basePrice}). Super Admin can override.`);
    }
  }
  
  return { valid: errors.length === 0, errors };
}

export function validatePlan(
  tier: string,
  countryCode: string,
  currencyCode: string,
  basePrice: number,
  featureFlags?: Record<string, unknown>,
  limits?: Record<string, unknown>,
  isSuperAdminOverride: boolean = false
): PlanValidationResult {
  const allErrors: string[] = [];
  
  if (featureFlags) {
    const featureResult = validateFeatureFlags(featureFlags, tier);
    allErrors.push(...featureResult.errors);
  }
  
  if (limits) {
    const limitResult = validateLimits(limits);
    allErrors.push(...limitResult.errors);
  }
  
  const countryResult = validateCountryPricing(countryCode, currencyCode, basePrice, isSuperAdminOverride);
  allErrors.push(...countryResult.errors);
  
  return { valid: allErrors.length === 0, errors: allErrors };
}

export function formatLimitValue(limit: number): string {
  if (limit === -1) return "Unlimited";
  if (limit === 0) return "Not available";
  return limit.toString();
}
