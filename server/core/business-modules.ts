export const BUSINESS_MODULES = {
  clinic: ['appointments', 'patients', 'billing'],
  salon: ['appointments', 'services', 'staff'],
  pg: ['rooms', 'tenants', 'billing'],
  coworking: ['desks', 'bookings', 'memberships'],
  service: ['customers', 'jobs'],
  real_estate: ['properties', 'listings', 'leads', 'transactions'],
  tourism: ['tours', 'bookings', 'customers', 'packages'],
} as const;

export type BusinessType = keyof typeof BUSINESS_MODULES;
export type BusinessModule = typeof BUSINESS_MODULES[BusinessType][number];

export function getModulesForBusiness(businessType: BusinessType): readonly string[] {
  return BUSINESS_MODULES[businessType] || [];
}

export function hasModule(businessType: BusinessType, module: string): boolean {
  const modules = BUSINESS_MODULES[businessType] as readonly string[];
  return modules?.includes(module) || false;
}

export function requireModule(businessType: BusinessType, module: string): void {
  if (!hasModule(businessType, module)) {
    throw new ModuleNotAvailableError(businessType, module);
  }
}

export class ModuleNotAvailableError extends Error {
  public statusCode = 403;
  public code = "MODULE_NOT_AVAILABLE";
  
  constructor(businessType: string, module: string) {
    super(`Module '${module}' is not available for business type '${businessType}'`);
  }
}

export const ALL_MODULES = [
  'appointments',
  'patients', 
  'billing',
  'services',
  'staff',
  'rooms',
  'tenants',
  'desks',
  'bookings',
  'memberships',
  'customers',
  'jobs',
  'properties',
  'listings',
  'leads',
  'transactions',
  'tours',
  'packages',
] as const;

export const MODULE_DESCRIPTIONS: Record<string, string> = {
  appointments: 'Schedule and manage appointments',
  patients: 'Patient records and medical history',
  billing: 'Invoices, payments, and financial tracking',
  services: 'Service catalog and pricing',
  staff: 'Staff management and scheduling',
  rooms: 'Room inventory and allocation',
  tenants: 'Tenant management for PG/hostels',
  desks: 'Desk and workspace management',
  bookings: 'Booking and reservation system',
  memberships: 'Membership plans and subscriptions',
  customers: 'Customer relationship management',
  jobs: 'Job/task tracking and management',
  properties: 'Property listings and management',
  listings: 'Real estate listing management',
  leads: 'Lead tracking and follow-up',
  transactions: 'Real estate transaction management',
  tours: 'Tour packages and itineraries',
  packages: 'Travel package management',
};
