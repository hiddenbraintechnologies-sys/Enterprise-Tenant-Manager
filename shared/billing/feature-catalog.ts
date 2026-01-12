export interface FeatureCatalogItem {
  key: string;
  label: string;
  description: string;
}

export interface LimitCatalogItem {
  key: string;
  label: string;
  description: string;
  defaultValue: number;
}

export const FEATURE_CATALOG: FeatureCatalogItem[] = [
  { key: "record_limit", label: "Record limits", description: "Enforce record caps per module" },
  { key: "unlimited_records", label: "Unlimited records", description: "Removes all record caps" },
  { key: "gst_features", label: "GST invoicing", description: "GSTIN validation + tax breakdown" },
  { key: "whatsapp_automation", label: "WhatsApp automation", description: "Automated reminders and updates" },
  { key: "priority_support", label: "Priority support", description: "Faster support SLA" },
  { key: "email_notifications", label: "Email notifications", description: "Automated email alerts" },
  { key: "sms_notifications", label: "SMS notifications", description: "SMS alerts (if enabled)" },
  { key: "api_access", label: "API access", description: "REST API integration access" },
  { key: "custom_branding", label: "Custom branding", description: "White-label branding options" },
  { key: "advanced_analytics", label: "Advanced analytics", description: "Detailed reports and dashboards" },
  { key: "multi_location", label: "Multi-location", description: "Support for multiple business locations" },
  { key: "data_export", label: "Data export", description: "Export data in CSV/Excel formats" },
];

export const LIMIT_CATALOG: LimitCatalogItem[] = [
  { key: "users", label: "Team members", description: "Maximum number of staff/team accounts", defaultValue: 5 },
  { key: "records", label: "Records", description: "Total records across all modules", defaultValue: 500 },
  { key: "customers", label: "Customers", description: "Maximum customer profiles", defaultValue: 200 },
  { key: "staffSeats", label: "Staff seats", description: "Number of concurrent staff logins", defaultValue: 3 },
  { key: "locations", label: "Locations", description: "Business locations/branches", defaultValue: 1 },
  { key: "storageGB", label: "Storage (GB)", description: "File storage capacity in GB", defaultValue: 1 },
  { key: "monthlyEmails", label: "Monthly emails", description: "Email notifications per month", defaultValue: 100 },
  { key: "monthlySMS", label: "Monthly SMS", description: "SMS notifications per month", defaultValue: 0 },
];

export const COUNTRIES = [
  { code: "IN", name: "India", currency: "INR" },
  { code: "MY", name: "Malaysia", currency: "MYR" },
  { code: "GB", name: "United Kingdom", currency: "GBP" },
  { code: "AE", name: "UAE", currency: "AED" },
  { code: "SG", name: "Singapore", currency: "SGD" },
  { code: "US", name: "United States", currency: "USD" },
];

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
