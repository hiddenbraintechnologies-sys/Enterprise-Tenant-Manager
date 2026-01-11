export * from "./context";
export * from "./features";
export { 
  PLATFORM_ROLES,
  PLATFORM_PERMISSIONS,
  Permissions,
  ROLE_PERMISSIONS,
  ROLE_SCOPE_RULES,
  ROLE_DEFINITIONS,
  SUPER_ADMIN_ONLY_PERMISSIONS,
  SCOPE_TYPES,
  TENANT_ROLES,
  ISO_TO_TENANT_COUNTRY,
  TENANT_COUNTRY_TO_ISO,
  resolvePermissions,
  hasResolvedPermission,
  hasAnyPermission,
  isSuperAdminOnly,
  requiresScope,
  canAccessCountry,
  canAccessRegion,
  getMenuItemsForRole,
  filterMenuItems,
  isoToTenantCountries,
  tenantCountryToISO,
  isTenantCountryInScope,
  SUPER_ADMIN_PERMISSIONS,
  PLATFORM_ADMIN_PERMISSIONS,
  resolveAdminPermissions,
  hasPlatformPermission,
  PLATFORM_PERMISSION_DISPLAY_NAMES,
  PERMISSIONS,
  PermissionService,
  permissionService,
} from "./permissions";
export type { 
  PlatformRole,
  TenantRole,
  Role,
  Permission,
  PlatformPermission,
  ScopeType,
  ScopeContext,
  ResolvedPermissions,
  RoleDefinition,
  MenuItem,
  AdminRole,
  ResolvedAdminPermissions,
  PermissionCode,
} from "./permissions";
export * from "./tenants";
export * from "./audit";
export * from "./jwt";
export { 
  requirePlatformAdmin,
  requirePlatformPermission,
  requireSuperAdmin,
  authenticateJWT,
  requireCountryScope,
  getAdminCountryScope,
  requireRole,
  validateTenantAccess,
  requireScope,
  isRateLimitBypassed,
  rateLimit,
  ROLE_HIERARCHY,
  requireMinimumRole,
  type AdminScope,
  type PlatformAdminContext,
} from "./auth-middleware";
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
