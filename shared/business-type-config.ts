// Business Type Configuration - Single Source of Truth
// This file defines:
// 1. Modules enabled per business type
// 2. Terminology key for UI copy switching
// 3. Forbidden terms to enforce in CI scans
//
// ❌ Never change business type keys after launch
// ✅ You may update modules, terminology, forbiddenTerms freely

export interface BusinessTypeConfig {
  modules: string[];
  terminology: "core" | "clinic" | "gym" | "coworking" | "pg" | "salon" | "education" | "legal" | "logistics" | "tourism" | "real_estate";
  forbiddenTerms: string[];
  label: string;
  category: string;
}

export const BUSINESS_TYPE_CONFIG: Record<string, BusinessTypeConfig> = {
  // Phase 1 - Core business types
  software_services: {
    label: "Software Services / IT Business",
    category: "technology",
    modules: ["core", "crm", "invoices", "projects", "timesheets", "hrms"],
    terminology: "core",
    forbiddenTerms: ["patient", "doctor", "member", "trainer", "host", "tenant", "room"],
  },

  consulting: {
    label: "Consulting & Professional Services",
    category: "professional",
    modules: ["core", "crm", "invoices", "projects", "timesheets", "analytics"],
    terminology: "core",
    forbiddenTerms: ["patient", "doctor", "member", "trainer", "host", "tenant", "room"],
  },

  pg_hostel: {
    label: "PG / Hostel Business",
    category: "hospitality",
    modules: ["pg", "tenants", "rooms", "bookings", "payments", "invoicing"],
    terminology: "pg",
    forbiddenTerms: ["patient", "doctor", "member", "trainer", "host"],
  },

  pg: {
    label: "PG / Hostel Business",
    category: "hospitality",
    modules: ["pg", "tenants", "rooms", "bookings", "payments", "invoicing"],
    terminology: "pg",
    forbiddenTerms: ["patient", "doctor", "member", "trainer", "host"],
  },

  // Healthcare
  clinic_healthcare: {
    label: "Healthcare / Clinic Business",
    category: "healthcare",
    modules: ["clinic", "appointments", "patients", "services", "billing"],
    terminology: "clinic",
    forbiddenTerms: ["member", "trainer", "host", "tenant", "room"],
  },

  clinic: {
    label: "Healthcare / Clinic Business",
    category: "healthcare",
    modules: ["clinic", "appointments", "patients", "services", "billing"],
    terminology: "clinic",
    forbiddenTerms: ["member", "trainer", "host", "tenant", "room"],
  },

  // Services
  salon_spa: {
    label: "Salon & Spa Business",
    category: "services",
    modules: ["salon", "appointments", "staff", "billing"],
    terminology: "salon",
    forbiddenTerms: ["patient", "doctor", "member", "trainer", "host", "tenant", "room"],
  },

  salon: {
    label: "Salon & Spa Business",
    category: "services",
    modules: ["salon", "appointments", "staff", "billing"],
    terminology: "salon",
    forbiddenTerms: ["patient", "doctor", "member", "trainer", "host", "tenant", "room"],
  },

  gym: {
    label: "Gym / Fitness Center",
    category: "services",
    modules: ["gym", "members", "trainers", "sessions", "payments"],
    terminology: "gym",
    forbiddenTerms: ["patient", "doctor", "host", "tenant", "room"],
  },

  coworking: {
    label: "Coworking Space Business",
    category: "hospitality",
    modules: ["coworking", "desks", "hosts", "memberships", "bookings", "invoicing"],
    terminology: "coworking",
    forbiddenTerms: ["patient", "doctor", "trainer", "tenant", "room"],
  },

  // Professional Services
  legal: {
    label: "Legal Business Services",
    category: "professional",
    modules: ["legal", "cases", "clients", "documents", "billing"],
    terminology: "legal",
    forbiddenTerms: ["patient", "doctor", "member", "trainer", "host", "tenant", "room"],
  },

  digital_agency: {
    label: "Digital Marketing Agency",
    category: "technology",
    modules: ["core", "campaigns", "clients", "billing"],
    terminology: "core",
    forbiddenTerms: ["patient", "doctor", "member", "trainer", "host", "tenant", "room"],
  },

  // Retail & Manufacturing
  retail_store: {
    label: "Retail Store / POS",
    category: "retail",
    modules: ["pos", "inventory", "gst", "invoicing"],
    terminology: "core",
    forbiddenTerms: ["patient", "doctor", "member", "trainer", "host", "tenant", "room"],
  },

  furniture_manufacturing: {
    label: "Furniture Business",
    category: "manufacturing",
    modules: ["inventory", "orders", "gst", "payroll"],
    terminology: "core",
    forbiddenTerms: ["patient", "doctor", "member", "trainer", "host", "tenant", "room"],
  },

  furniture: {
    label: "Furniture Business",
    category: "manufacturing",
    modules: ["inventory", "orders", "gst", "payroll"],
    terminology: "core",
    forbiddenTerms: ["patient", "doctor", "member", "trainer", "host", "tenant", "room"],
  },

  // Logistics
  logistics_fleet: {
    label: "Logistics & Fleet",
    category: "logistics",
    modules: ["logistics", "vehicles", "trips", "expenses"],
    terminology: "logistics",
    forbiddenTerms: ["patient", "doctor", "member", "trainer", "host", "tenant", "room"],
  },

  logistics: {
    label: "Logistics Business Services",
    category: "logistics",
    modules: ["logistics", "vehicles", "trips", "expenses"],
    terminology: "logistics",
    forbiddenTerms: ["patient", "doctor", "member", "trainer", "host", "tenant", "room"],
  },

  // Education
  education_institute: {
    label: "Training & Education Services",
    category: "education",
    modules: ["education", "students", "courses", "fees"],
    terminology: "education",
    forbiddenTerms: ["patient", "doctor", "member", "trainer", "host", "tenant", "room"],
  },

  education: {
    label: "Training & Education Services",
    category: "education",
    modules: ["education", "students", "courses", "fees"],
    terminology: "education",
    forbiddenTerms: ["patient", "doctor", "member", "trainer", "host", "tenant", "room"],
  },

  // Travel & Real Estate
  tourism: {
    label: "Tours & Travels Business",
    category: "travel",
    modules: ["tourism", "bookings", "vendors", "billing"],
    terminology: "tourism",
    forbiddenTerms: ["patient", "doctor", "member", "trainer", "host"],
  },

  real_estate: {
    label: "Real Estate Business",
    category: "property",
    modules: ["real_estate", "properties", "leads", "commissions"],
    terminology: "real_estate",
    forbiddenTerms: ["patient", "doctor", "member", "trainer", "host"],
  },

  // Generic service
  service: {
    label: "Service Business",
    category: "services",
    modules: ["core", "customers", "bookings", "invoicing"],
    terminology: "core",
    forbiddenTerms: ["patient", "doctor", "member", "trainer", "host", "tenant", "room"],
  },
} as const;

export type BusinessTypeKey = keyof typeof BUSINESS_TYPE_CONFIG;

// Get config for a business type
export function getBusinessTypeConfig(key: string): BusinessTypeConfig | undefined {
  return BUSINESS_TYPE_CONFIG[key];
}

// Get modules for a business type
export function getBusinessTypeModules(key: string): string[] {
  return BUSINESS_TYPE_CONFIG[key]?.modules || ["core"];
}

// Get terminology key for a business type
export function getBusinessTypeTerminology(key: string): string {
  return BUSINESS_TYPE_CONFIG[key]?.terminology || "core";
}

// Get forbidden terms for a business type (for CI scans)
export function getBusinessTypeForbiddenTerms(key: string): string[] {
  return BUSINESS_TYPE_CONFIG[key]?.forbiddenTerms || [];
}

// Get all business type configs as array for dropdowns
export function getBusinessTypeConfigOptions() {
  return Object.entries(BUSINESS_TYPE_CONFIG).map(([code, config]) => ({
    value: code,
    label: config.label,
    category: config.category,
    modules: config.modules,
    terminology: config.terminology,
  }));
}

// Terminology mapping: generic term → terminology-specific term
const TERMINOLOGY_MAP: Record<string, Record<string, string>> = {
  core: {
    customers: "Clients",
    customer: "Client",
    services: "Services",
    service: "Service",
    bookings: "Bookings",
    booking: "Booking",
  },
  clinic: {
    customers: "Patients",
    customer: "Patient",
    clients: "Patients",
    client: "Patient",
    services: "Services",
    service: "Service",
    bookings: "Appointments",
    booking: "Appointment",
  },
  salon: {
    customers: "Clients",
    customer: "Client",
    patients: "Clients",
    patient: "Client",
    bookings: "Appointments",
    booking: "Appointment",
  },
  gym: {
    customers: "Members",
    customer: "Member",
    clients: "Members",
    client: "Member",
    bookings: "Sessions",
    booking: "Session",
  },
  coworking: {
    customers: "Members",
    customer: "Member",
    clients: "Members",
    client: "Member",
    bookings: "Bookings",
    booking: "Booking",
  },
  pg: {
    customers: "Tenants",
    customer: "Tenant",
    clients: "Tenants",
    client: "Tenant",
    bookings: "Bookings",
    booking: "Booking",
  },
  education: {
    customers: "Students",
    customer: "Student",
    clients: "Students",
    client: "Student",
  },
  legal: {
    customers: "Clients",
    customer: "Client",
  },
  logistics: {
    customers: "Customers",
    customer: "Customer",
  },
  tourism: {
    customers: "Travelers",
    customer: "Traveler",
    clients: "Travelers",
    client: "Traveler",
  },
  real_estate: {
    customers: "Leads",
    customer: "Lead",
    clients: "Leads",
    client: "Lead",
  },
};

// Get translated term for a business type
export function getTermForBusinessType(businessType: string, genericTerm: string): string {
  const terminology = getBusinessTypeTerminology(businessType);
  const termMap = TERMINOLOGY_MAP[terminology] || TERMINOLOGY_MAP.core;
  return termMap[genericTerm.toLowerCase()] || genericTerm;
}
