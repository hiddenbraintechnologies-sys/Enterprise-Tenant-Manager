// Business Type Registry - Single source of truth
// ❌ Never change business type codes after launch
// ✅ You may rename labels freely

export const BUSINESS_TYPE_REGISTRY = {
  pg_hostel: {
    label: "PG / Hostel Business",
    category: "hospitality",
    modules: ["tenants", "rooms", "bookings", "payments", "invoicing"],
    phase: "phase1",
  },
  pg: {
    label: "PG / Hostel Business",
    category: "hospitality",
    modules: ["tenants", "rooms", "bookings", "payments", "invoicing"],
    phase: "phase1",
  },
  consulting: {
    label: "Consulting & Professional Services",
    category: "professional",
    modules: ["projects", "timesheets", "invoices", "analytics"],
    phase: "phase1",
  },
  software_services: {
    label: "Software Services / IT Business",
    category: "technology",
    modules: ["projects", "timesheets", "hrms", "invoicing"],
    phase: "phase1",
  },
  legal: {
    label: "Legal Business Services",
    category: "professional",
    modules: ["cases", "clients", "documents", "billing"],
    phase: "later",
  },
  digital_agency: {
    label: "Digital Marketing Agency",
    category: "technology",
    modules: ["campaigns", "clients", "billing"],
    phase: "later",
  },
  clinic_healthcare: {
    label: "Healthcare / Clinic Business",
    category: "healthcare",
    modules: ["appointments", "patients", "billing"],
    restrictions: { currencyLocked: true, timezoneLocked: true },
    phase: "phase2",
  },
  clinic: {
    label: "Healthcare / Clinic Business",
    category: "healthcare",
    modules: ["appointments", "patients", "billing"],
    restrictions: { currencyLocked: true, timezoneLocked: true },
    phase: "phase2",
  },
  retail_store: {
    label: "Retail Store / POS",
    category: "retail",
    modules: ["pos", "inventory", "gst", "invoicing"],
    phase: "later",
  },
  salon_spa: {
    label: "Salon & Spa Business",
    category: "services",
    modules: ["appointments", "staff", "billing"],
    phase: "later",
  },
  salon: {
    label: "Salon & Spa Business",
    category: "services",
    modules: ["appointments", "staff", "billing"],
    phase: "later",
  },
  furniture_manufacturing: {
    label: "Furniture Business",
    category: "manufacturing",
    modules: ["inventory", "orders", "gst", "payroll"],
    phase: "later",
  },
  furniture: {
    label: "Furniture Business",
    category: "manufacturing",
    modules: ["inventory", "orders", "gst", "payroll"],
    phase: "later",
  },
  logistics_fleet: {
    label: "Logistics & Fleet",
    category: "logistics",
    modules: ["vehicles", "trips", "expenses"],
    phase: "later",
  },
  logistics: {
    label: "Logistics Business Services",
    category: "logistics",
    modules: ["vehicles", "trips", "expenses"],
    phase: "later",
  },
  education_institute: {
    label: "Training & Education Services",
    category: "education",
    modules: ["students", "courses", "fees"],
    phase: "later",
  },
  education: {
    label: "Training & Education Services",
    category: "education",
    modules: ["students", "courses", "fees"],
    phase: "later",
  },
  tourism: {
    label: "Tours & Travels Business",
    category: "travel",
    modules: ["bookings", "vendors", "billing"],
    phase: "later",
  },
  real_estate: {
    label: "Real Estate Business",
    category: "property",
    modules: ["properties", "leads", "commissions"],
    phase: "later",
  },
  coworking: {
    label: "Coworking Space Business",
    category: "hospitality",
    modules: ["memberships", "bookings", "invoicing"],
    phase: "later",
  },
  service: {
    label: "Service Business",
    category: "services",
    modules: ["customers", "bookings", "invoicing"],
    phase: "later",
  },
} as const;

export type BusinessTypeCode = keyof typeof BUSINESS_TYPE_REGISTRY;

export const BUSINESS_TYPE_CODES = Object.keys(BUSINESS_TYPE_REGISTRY) as BusinessTypeCode[];

// Get label for a business type code
export function getBusinessTypeLabel(code: string): string {
  const entry = BUSINESS_TYPE_REGISTRY[code as BusinessTypeCode];
  return entry?.label || code;
}

// Get all business types as array for dropdowns
export function getBusinessTypeOptions() {
  return Object.entries(BUSINESS_TYPE_REGISTRY).map(([code, config]) => ({
    value: code,
    label: config.label,
    category: config.category,
    phase: config.phase,
  }));
}

// Country-specific rollout configuration
export const COUNTRY_ROLLOUT_CONFIG = {
  IN: {
    status: "live" as const,
    enabledBusinessTypes: ["pg_hostel"],
    notes: "Phase-1 India launch - PG/Hostel only",
  },
  MY: {
    status: "beta" as const,
    enabledBusinessTypes: ["consulting", "software_services"],
    notes: "Malaysia beta - Professional services",
  },
  GB: {
    status: "beta" as const,
    enabledBusinessTypes: ["consulting", "software_services"],
    notes: "UK beta - Professional services",
  },
} as const;

export type CountryCode = keyof typeof COUNTRY_ROLLOUT_CONFIG;
