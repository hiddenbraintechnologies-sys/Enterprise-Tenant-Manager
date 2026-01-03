export const BUSINESS_MODULES = {
  clinic: ['appointments', 'patients', 'billing'],
  salon: ['appointments', 'services', 'staff'],
  pg: ['rooms', 'tenants', 'billing'],
  coworking: ['desks', 'bookings', 'memberships'],
  service: ['customers', 'jobs'],
  real_estate: ['properties', 'listings', 'leads', 'site_visits', 'agents'],
  tourism: ['packages', 'bookings', 'customers', 'itineraries', 'vendors'],
  education: ['students', 'courses', 'batches', 'attendance', 'exams', 'fees'],
  logistics: ['vehicles', 'drivers', 'trips', 'shipments', 'tracking', 'maintenance'],
  legal: ['clients', 'cases', 'appointments', 'documents', 'billing'],
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
  'site_visits',
  'agents',
  'packages',
  'itineraries',
  'vendors',
  'students',
  'courses',
  'batches',
  'attendance',
  'exams',
  'fees',
  'vehicles',
  'drivers',
  'trips',
  'shipments',
  'tracking',
  'maintenance',
  'clients',
  'cases',
  'documents',
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
  properties: 'Property inventory and details',
  listings: 'Property listings for sale or rent',
  leads: 'Lead capture and follow-up tracking',
  site_visits: 'Site visit scheduling and tracking',
  agents: 'Agent management and commissions',
  packages: 'Travel packages and pricing',
  itineraries: 'Trip itinerary planning',
  vendors: 'Vendor and supplier management',
  students: 'Student enrollment and records',
  courses: 'Course catalog and curriculum',
  batches: 'Batch/class management and scheduling',
  attendance: 'Student attendance tracking',
  exams: 'Exam scheduling and result management',
  fees: 'Fee collection and payment tracking',
  vehicles: 'Vehicle fleet management',
  drivers: 'Driver profiles and assignments',
  trips: 'Trip planning and scheduling',
  shipments: 'Shipment tracking and management',
  tracking: 'Real-time shipment and vehicle tracking',
  maintenance: 'Vehicle maintenance scheduling',
  clients: 'Client management for legal practice',
  cases: 'Case management and tracking',
  documents: 'Legal document management',
};
