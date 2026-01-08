export * from "./context";
export * from "./features";
export * from "./permissions";
export * from "./tenants";
export * from "./audit";
export * from "./jwt";
export * from "./auth-middleware";
export * from "./tenant-isolation";
export * from "./scoped-repository";
export * from "./compliance";
export * from "./data-masking";
export { 
  BUSINESS_MODULES, 
  getModulesForBusiness, 
  hasModule, 
  requireModule, 
  ModuleNotAvailableError,
  ALL_MODULES,
  MODULE_DESCRIPTIONS,
  type BusinessModule 
} from "./business-modules";
export { whatsappService, whatsappProviderSelector, initializeWhatsappProviders } from "./whatsapp";
export { domainService, resolveTenantByDomain, requireVerifiedDomain, attachDomainBranding } from "./domain";
export { realEstateRouter } from "./real-estate";
export { tourismRouter } from "./tourism";
export { educationRouter } from "./education";
export { logisticsRouter } from "./logistics";
export { legalRouter } from "./legal";
export { clinicRouter } from "./clinic";
export { salonRouter } from "./salon";
export { gymRouter } from "./gym";
export { pgHostelRouter } from "./pg-hostel";
export { coworkingRouter } from "./coworking";
export { generalServiceRouter } from "./general-service";
export { 
  validateDashboardAccess, 
  validateDashboardAccessAsync, 
  enforceDashboardLock,
  getCanonicalDashboardRoute,
  getBusinessTypeFromRoute,
  validateModuleAccess,
  validateApiModuleAccess,
} from "./dashboard-access";
