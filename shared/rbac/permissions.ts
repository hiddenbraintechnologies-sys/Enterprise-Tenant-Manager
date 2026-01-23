/**
 * RBAC Permission Matrix - Single Source of Truth
 * 
 * This file defines all platform and tenant roles, permissions, and scope rules.
 * Used by both frontend (menu gating) and backend (API authorization).
 */

// ==================== SCOPE TYPES ====================
export type ScopeType = "GLOBAL" | "COUNTRY" | "REGION" | "TENANT";

export const SCOPE_TYPES = {
  GLOBAL: "GLOBAL" as const,
  COUNTRY: "COUNTRY" as const,
  REGION: "REGION" as const,
  TENANT: "TENANT" as const,
};

// ==================== ROLE TYPES ====================
export type PlatformRole =
  | "PLATFORM_SUPER_ADMIN"
  | "PLATFORM_ADMIN"
  | "TECH_SUPPORT_MANAGER"
  | "MANAGER"
  | "SUPPORT_TEAM";

export type TenantRole = "TENANT_ADMIN" | "TENANT_STAFF" | "TENANT_VIEWER";

export type Role = PlatformRole | TenantRole;

export const PLATFORM_ROLES = {
  SUPER_ADMIN: "PLATFORM_SUPER_ADMIN" as const,
  PLATFORM_ADMIN: "PLATFORM_ADMIN" as const,
  TECH_SUPPORT_MANAGER: "TECH_SUPPORT_MANAGER" as const,
  MANAGER: "MANAGER" as const,
  SUPPORT_TEAM: "SUPPORT_TEAM" as const,
};

export const TENANT_ROLES = {
  ADMIN: "TENANT_ADMIN" as const,
  STAFF: "TENANT_STAFF" as const,
  VIEWER: "TENANT_VIEWER" as const,
};

// ==================== PERMISSIONS ====================
export const Permissions = {
  // Platform-level permissions
  MANAGE_PLATFORM_ADMINS: "MANAGE_PLATFORM_ADMINS",
  MANAGE_GLOBAL_CONFIG: "MANAGE_GLOBAL_CONFIG",
  MANAGE_PLANS_PRICING: "MANAGE_PLANS_PRICING",
  MANAGE_BUSINESS_TYPES: "MANAGE_BUSINESS_TYPES",
  MANAGE_COUNTRIES_REGIONS: "MANAGE_COUNTRIES_REGIONS",
  VIEW_ALL_TENANTS: "VIEW_ALL_TENANTS",
  VIEW_TENANTS_SCOPED: "VIEW_TENANTS_SCOPED",
  SUSPEND_TENANT_SCOPED: "SUSPEND_TENANT_SCOPED",
  OVERRIDE_TENANT_LOCK: "OVERRIDE_TENANT_LOCK",
  VIEW_SYSTEM_LOGS: "VIEW_SYSTEM_LOGS",
  VIEW_API_METRICS: "VIEW_API_METRICS",
  MANAGE_APIS: "MANAGE_APIS",
  VIEW_INVOICES_PAYMENTS: "VIEW_INVOICES_PAYMENTS",
  VIEW_AUDIT_LOGS: "VIEW_AUDIT_LOGS",
  HANDLE_SUPPORT_TICKETS: "HANDLE_SUPPORT_TICKETS",
  VIEW_TICKETS: "VIEW_TICKETS",
  RESPOND_TICKETS: "RESPOND_TICKETS",
  ESCALATE_TICKETS: "ESCALATE_TICKETS",
  VIEW_SYSTEM_HEALTH: "VIEW_SYSTEM_HEALTH",
  VIEW_ERROR_LOGS: "VIEW_ERROR_LOGS",
  VIEW_PERFORMANCE: "VIEW_PERFORMANCE",
  VIEW_OPERATIONS: "VIEW_OPERATIONS",
  VIEW_REPORTS: "VIEW_REPORTS",

  // Tenant-level permissions
  MANAGE_USERS: "MANAGE_USERS",
  VIEW_DASHBOARD: "VIEW_DASHBOARD",
  MANAGE_PROJECTS: "MANAGE_PROJECTS",
  MANAGE_TIMESHEETS: "MANAGE_TIMESHEETS",
  VIEW_INVOICES: "VIEW_INVOICES",
  CREATE_INVOICES: "CREATE_INVOICES",
  RECORD_PAYMENTS: "RECORD_PAYMENTS",
  VIEW_ANALYTICS: "VIEW_ANALYTICS",
  MANAGE_SETTINGS: "MANAGE_SETTINGS",

  // Tenant subscription permissions
  SUBSCRIPTION_VIEW: "SUBSCRIPTION_VIEW",
  SUBSCRIPTION_CHANGE: "SUBSCRIPTION_CHANGE",
  INVOICES_VIEW: "INVOICES_VIEW",
  PAYMENTS_VIEW: "PAYMENTS_VIEW",

  // Marketplace management permissions (Super Admin / Platform Admin)
  MARKETPLACE_VIEW_CATALOG: "MARKETPLACE_VIEW_CATALOG",
  MARKETPLACE_MANAGE_CATALOG: "MARKETPLACE_MANAGE_CATALOG",
  MARKETPLACE_MANAGE_PRICING: "MARKETPLACE_MANAGE_PRICING",
  MARKETPLACE_MANAGE_ELIGIBILITY: "MARKETPLACE_MANAGE_ELIGIBILITY",
  MARKETPLACE_VIEW_ANALYTICS: "MARKETPLACE_VIEW_ANALYTICS",
  MARKETPLACE_VIEW_AUDIT_LOGS: "MARKETPLACE_VIEW_AUDIT_LOGS",
  MARKETPLACE_PUBLISH: "MARKETPLACE_PUBLISH", // Publish/unpublish add-ons, country rollout
  MARKETPLACE_OVERRIDE: "MARKETPLACE_OVERRIDE", // Force install/uninstall for support

  // Tenant marketplace permissions
  MARKETPLACE_BROWSE: "MARKETPLACE_BROWSE", // View marketplace list and details
  MARKETPLACE_PURCHASE: "MARKETPLACE_PURCHASE", // Start trial / purchase add-on
  MARKETPLACE_MANAGE_BILLING: "MARKETPLACE_MANAGE_BILLING", // View invoices, update payment method
} as const;

export type Permission = (typeof Permissions)[keyof typeof Permissions];

// Alias for backward compatibility
export const PLATFORM_PERMISSIONS = Permissions;
export type PlatformPermission = Permission;

// ==================== ROLE DEFINITIONS ====================
export type RoleDefinition = {
  role: Role;
  scopeType: ScopeType;
  permissions: readonly Permission[];
};

export const ROLE_DEFINITIONS: Record<Role, RoleDefinition> = {
  PLATFORM_SUPER_ADMIN: {
    role: "PLATFORM_SUPER_ADMIN",
    scopeType: "GLOBAL",
    permissions: [
      Permissions.MANAGE_PLATFORM_ADMINS,
      Permissions.MANAGE_GLOBAL_CONFIG,
      Permissions.MANAGE_PLANS_PRICING,
      Permissions.MANAGE_BUSINESS_TYPES,
      Permissions.MANAGE_COUNTRIES_REGIONS,
      Permissions.VIEW_ALL_TENANTS,
      Permissions.SUSPEND_TENANT_SCOPED,
      Permissions.OVERRIDE_TENANT_LOCK,
      Permissions.VIEW_SYSTEM_LOGS,
      Permissions.VIEW_API_METRICS,
      Permissions.MANAGE_APIS,
      Permissions.VIEW_INVOICES_PAYMENTS,
      Permissions.VIEW_AUDIT_LOGS,
      Permissions.HANDLE_SUPPORT_TICKETS,
      Permissions.VIEW_TICKETS,
      Permissions.VIEW_SYSTEM_HEALTH,
      Permissions.VIEW_ERROR_LOGS,
      Permissions.VIEW_PERFORMANCE,
      Permissions.VIEW_OPERATIONS,
      Permissions.VIEW_REPORTS,
      // Full marketplace management
      Permissions.MARKETPLACE_VIEW_CATALOG,
      Permissions.MARKETPLACE_MANAGE_CATALOG,
      Permissions.MARKETPLACE_MANAGE_PRICING,
      Permissions.MARKETPLACE_MANAGE_ELIGIBILITY,
      Permissions.MARKETPLACE_VIEW_ANALYTICS,
      Permissions.MARKETPLACE_VIEW_AUDIT_LOGS,
      Permissions.MARKETPLACE_PUBLISH,
      Permissions.MARKETPLACE_OVERRIDE,
    ],
  },

  PLATFORM_ADMIN: {
    role: "PLATFORM_ADMIN",
    scopeType: "COUNTRY",
    permissions: [
      Permissions.VIEW_TENANTS_SCOPED,
      Permissions.SUSPEND_TENANT_SCOPED,
      Permissions.VIEW_INVOICES_PAYMENTS,
      Permissions.VIEW_AUDIT_LOGS,
      Permissions.HANDLE_SUPPORT_TICKETS,
      Permissions.VIEW_TICKETS,
      Permissions.RESPOND_TICKETS,
      Permissions.ESCALATE_TICKETS,
    ],
  },

  TECH_SUPPORT_MANAGER: {
    role: "TECH_SUPPORT_MANAGER",
    scopeType: "GLOBAL",
    permissions: [
      Permissions.VIEW_SYSTEM_LOGS,
      Permissions.VIEW_API_METRICS,
      Permissions.MANAGE_APIS,
      Permissions.VIEW_SYSTEM_HEALTH,
      Permissions.VIEW_ERROR_LOGS,
      Permissions.VIEW_PERFORMANCE,
      Permissions.VIEW_AUDIT_LOGS,
    ],
  },

  MANAGER: {
    role: "MANAGER",
    scopeType: "COUNTRY",
    permissions: [
      Permissions.VIEW_TENANTS_SCOPED,
      Permissions.VIEW_OPERATIONS,
      Permissions.VIEW_REPORTS,
      Permissions.VIEW_TICKETS,
    ],
  },

  SUPPORT_TEAM: {
    role: "SUPPORT_TEAM",
    scopeType: "COUNTRY",
    permissions: [
      Permissions.VIEW_TENANTS_SCOPED,
      Permissions.VIEW_TICKETS,
      Permissions.RESPOND_TICKETS,
      Permissions.ESCALATE_TICKETS,
      Permissions.HANDLE_SUPPORT_TICKETS,
    ],
  },

  TENANT_ADMIN: {
    role: "TENANT_ADMIN",
    scopeType: "TENANT",
    permissions: [
      Permissions.MANAGE_USERS,
      Permissions.VIEW_DASHBOARD,
      Permissions.MANAGE_PROJECTS,
      Permissions.MANAGE_TIMESHEETS,
      Permissions.VIEW_INVOICES,
      Permissions.CREATE_INVOICES,
      Permissions.RECORD_PAYMENTS,
      Permissions.VIEW_ANALYTICS,
      Permissions.MANAGE_SETTINGS,
      Permissions.SUBSCRIPTION_VIEW,
      Permissions.SUBSCRIPTION_CHANGE,
      Permissions.INVOICES_VIEW,
      Permissions.PAYMENTS_VIEW,
      // Marketplace permissions for tenant admin
      Permissions.MARKETPLACE_BROWSE,
      Permissions.MARKETPLACE_PURCHASE,
      Permissions.MARKETPLACE_MANAGE_BILLING,
    ],
  },

  TENANT_STAFF: {
    role: "TENANT_STAFF",
    scopeType: "TENANT",
    permissions: [
      Permissions.VIEW_DASHBOARD,
      Permissions.MANAGE_PROJECTS,
      Permissions.MANAGE_TIMESHEETS,
      Permissions.VIEW_INVOICES,
      Permissions.SUBSCRIPTION_VIEW,
      Permissions.INVOICES_VIEW,
      // Staff can browse marketplace but not purchase
      Permissions.MARKETPLACE_BROWSE,
    ],
  },

  TENANT_VIEWER: {
    role: "TENANT_VIEWER",
    scopeType: "TENANT",
    permissions: [
      Permissions.VIEW_DASHBOARD,
      Permissions.VIEW_INVOICES,
      Permissions.SUBSCRIPTION_VIEW,
    ],
  },
};

// Backward compatibility: extract role permissions as arrays
export const ROLE_PERMISSIONS: Record<PlatformRole, Permission[]> = {
  PLATFORM_SUPER_ADMIN: [...ROLE_DEFINITIONS.PLATFORM_SUPER_ADMIN.permissions],
  PLATFORM_ADMIN: [...ROLE_DEFINITIONS.PLATFORM_ADMIN.permissions],
  TECH_SUPPORT_MANAGER: [...ROLE_DEFINITIONS.TECH_SUPPORT_MANAGER.permissions],
  MANAGER: [...ROLE_DEFINITIONS.MANAGER.permissions],
  SUPPORT_TEAM: [...ROLE_DEFINITIONS.SUPPORT_TEAM.permissions],
};

// Backward compatibility: scope rules
export const ROLE_SCOPE_RULES: Record<PlatformRole, ScopeType> = {
  PLATFORM_SUPER_ADMIN: ROLE_DEFINITIONS.PLATFORM_SUPER_ADMIN.scopeType,
  PLATFORM_ADMIN: ROLE_DEFINITIONS.PLATFORM_ADMIN.scopeType,
  TECH_SUPPORT_MANAGER: ROLE_DEFINITIONS.TECH_SUPPORT_MANAGER.scopeType,
  MANAGER: ROLE_DEFINITIONS.MANAGER.scopeType,
  SUPPORT_TEAM: ROLE_DEFINITIONS.SUPPORT_TEAM.scopeType,
};

// ==================== SUPER ADMIN ONLY PERMISSIONS ====================
export const SUPER_ADMIN_ONLY_PERMISSIONS: Permission[] = [
  Permissions.MANAGE_PLATFORM_ADMINS,
  Permissions.MANAGE_GLOBAL_CONFIG,
  Permissions.MANAGE_PLANS_PRICING,
  Permissions.MANAGE_BUSINESS_TYPES,
  Permissions.MANAGE_COUNTRIES_REGIONS,
  Permissions.VIEW_ALL_TENANTS,
  Permissions.OVERRIDE_TENANT_LOCK,
  // Marketplace management permissions (exclusive to super admin)
  Permissions.MARKETPLACE_MANAGE_CATALOG,
  Permissions.MARKETPLACE_MANAGE_PRICING,
  Permissions.MARKETPLACE_MANAGE_ELIGIBILITY,
  Permissions.MARKETPLACE_OVERRIDE,
];

// ==================== HELPER FUNCTIONS ====================

/**
 * Check if a role has a specific permission (simple version)
 */
export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_DEFINITIONS[role].permissions.includes(permission);
}

/**
 * Get the required scope type for a role
 */
export function requiresScope(role: Role): ScopeType {
  return ROLE_DEFINITIONS[role].scopeType;
}

/**
 * Check if a permission is super admin only
 */
export function isSuperAdminOnly(permission: Permission): boolean {
  return SUPER_ADMIN_ONLY_PERMISSIONS.includes(permission);
}

// ==================== SCOPE CONTEXT ====================
export type ScopeContext = {
  scopeType: ScopeType;
  tenantId?: string;
  allowedCountryIds?: string[];
  allowedRegionIds?: string[];
};

export interface AdminScope {
  countryIds: string[];
  regionIds: string[];
}

export interface ResolvedPermissions {
  role: PlatformRole;
  permissions: Permission[];
  scope: AdminScope | null;
  scopeType: ScopeType;
  isSuperAdmin: boolean;
  isGlobalScope: boolean;
}

/**
 * Resolve permissions for a platform admin based on their role
 */
export function resolvePermissions(
  role: PlatformRole | string,
  countryIds?: string[] | null,
  regionIds?: string[] | null
): ResolvedPermissions {
  const normalizedRole = (role as PlatformRole) || PLATFORM_ROLES.SUPPORT_TEAM;
  const rolePermissions = ROLE_PERMISSIONS[normalizedRole] || [];
  const scopeType = ROLE_SCOPE_RULES[normalizedRole] || SCOPE_TYPES.COUNTRY;
  const isGlobalScope = scopeType === SCOPE_TYPES.GLOBAL;
  const isSuperAdmin = normalizedRole === PLATFORM_ROLES.SUPER_ADMIN;
  
  return {
    role: normalizedRole,
    permissions: rolePermissions,
    scope: isGlobalScope ? null : {
      countryIds: countryIds || [],
      regionIds: regionIds || [],
    },
    scopeType,
    isSuperAdmin,
    isGlobalScope,
  };
}

/**
 * Check if resolved permissions include a specific permission
 */
export function hasResolvedPermission(
  resolved: ResolvedPermissions,
  permission: Permission
): boolean {
  return resolved.permissions.includes(permission);
}

/**
 * Check if resolved permissions include any of the specified permissions
 */
export function hasAnyPermission(
  resolved: ResolvedPermissions,
  permissions: Permission[]
): boolean {
  return permissions.some(p => resolved.permissions.includes(p));
}

/**
 * Check if an admin can access a specific country
 */
export function canAccessCountry(
  resolved: ResolvedPermissions,
  countryCode: string
): boolean {
  if (resolved.isGlobalScope || resolved.scope === null) {
    return true;
  }
  return resolved.scope.countryIds.includes(countryCode);
}

/**
 * Check if an admin can access a specific region
 */
export function canAccessRegion(
  resolved: ResolvedPermissions,
  regionCode: string
): boolean {
  if (resolved.isGlobalScope || resolved.scope === null) {
    return true;
  }
  return resolved.scope.regionIds.includes(regionCode);
}

// ==================== MENU CONFIGURATION ====================
export interface MenuItem {
  id: string;
  title: string;
  url: string;
  icon: string;
  permission?: Permission;
  permissions?: Permission[];
  superAdminOnly?: boolean;
  roles?: PlatformRole[];
}

export const SUPER_ADMIN_MENU_ITEMS: MenuItem[] = [
  { id: "dashboard", title: "Dashboard", url: "/super-admin", icon: "LayoutDashboard", superAdminOnly: true },
  { id: "tenants", title: "Tenants", url: "/super-admin/tenants", icon: "Building2", permission: Permissions.VIEW_ALL_TENANTS },
  { id: "admins", title: "Platform Admins", url: "/super-admin/admins", icon: "UserCog", permission: Permissions.MANAGE_PLATFORM_ADMINS },
  { id: "marketplace", title: "Marketplace", url: "/super-admin/marketplace-management", icon: "Store", permission: Permissions.MARKETPLACE_VIEW_CATALOG },
  { id: "billing", title: "Billing", url: "/super-admin/billing", icon: "DollarSign", permission: Permissions.VIEW_INVOICES_PAYMENTS },
  { id: "audit-logs", title: "Audit Logs", url: "/super-admin/audit-logs", icon: "FileText", permission: Permissions.VIEW_SYSTEM_LOGS },
  { id: "settings", title: "System Settings", url: "/super-admin/settings", icon: "Cog", permission: Permissions.MANAGE_GLOBAL_CONFIG },
  { id: "regions", title: "Regions", url: "/super-admin/regions", icon: "Globe", permission: Permissions.MANAGE_COUNTRIES_REGIONS },
];

export const PLATFORM_ADMIN_MENU_ITEMS: MenuItem[] = [
  { id: "dashboard", title: "Dashboard", url: "/admin", icon: "LayoutDashboard" },
  { id: "tenants", title: "Tenants", url: "/admin/tenants", icon: "Building2", permission: Permissions.VIEW_TENANTS_SCOPED },
  { id: "billing", title: "Billing", url: "/admin/billing", icon: "DollarSign", permission: Permissions.VIEW_INVOICES_PAYMENTS },
  { id: "audit-logs", title: "Audit Logs", url: "/admin/audit-logs", icon: "FileText", permission: Permissions.VIEW_AUDIT_LOGS },
  { id: "support", title: "Support Tickets", url: "/admin/support", icon: "Ticket", permission: Permissions.HANDLE_SUPPORT_TICKETS },
];

export const TECH_SUPPORT_MENU_ITEMS: MenuItem[] = [
  { id: "dashboard", title: "Dashboard", url: "/tech-support", icon: "LayoutDashboard" },
  { id: "health", title: "System Health", url: "/tech-support/health", icon: "Activity", permission: Permissions.VIEW_SYSTEM_HEALTH },
  { id: "apis", title: "API Management", url: "/tech-support/apis", icon: "Globe", permission: Permissions.VIEW_API_METRICS },
  { id: "errors", title: "Error Logs", url: "/tech-support/errors", icon: "AlertTriangle", permission: Permissions.VIEW_ERROR_LOGS },
  { id: "performance", title: "Performance", url: "/tech-support/performance", icon: "BarChart3", permission: Permissions.VIEW_PERFORMANCE },
  { id: "audit-logs", title: "Audit Logs", url: "/tech-support/audit-logs", icon: "FileText", permission: Permissions.VIEW_AUDIT_LOGS },
];

export const MANAGER_MENU_ITEMS: MenuItem[] = [
  { id: "dashboard", title: "Dashboard", url: "/manager", icon: "LayoutDashboard" },
  { id: "tenants", title: "Tenants", url: "/manager/tenants", icon: "Building2", permission: Permissions.VIEW_TENANTS_SCOPED },
  { id: "operations", title: "Operations", url: "/manager/operations", icon: "ClipboardList", permission: Permissions.VIEW_OPERATIONS },
  { id: "reports", title: "Reports", url: "/manager/reports", icon: "BarChart3", permission: Permissions.VIEW_REPORTS },
];

export const SUPPORT_TEAM_MENU_ITEMS: MenuItem[] = [
  { id: "dashboard", title: "Dashboard", url: "/support", icon: "LayoutDashboard" },
  { id: "tickets", title: "Tickets", url: "/support/tickets", icon: "Ticket", permission: Permissions.VIEW_TICKETS },
  { id: "issues", title: "User Issues", url: "/support/issues", icon: "Headphones", permission: Permissions.HANDLE_SUPPORT_TICKETS },
];

/**
 * Get menu items for a specific role
 */
export function getMenuItemsForRole(role: PlatformRole): MenuItem[] {
  switch (role) {
    case PLATFORM_ROLES.SUPER_ADMIN:
      return SUPER_ADMIN_MENU_ITEMS;
    case PLATFORM_ROLES.PLATFORM_ADMIN:
      return PLATFORM_ADMIN_MENU_ITEMS;
    case PLATFORM_ROLES.TECH_SUPPORT_MANAGER:
      return TECH_SUPPORT_MENU_ITEMS;
    case PLATFORM_ROLES.MANAGER:
      return MANAGER_MENU_ITEMS;
    case PLATFORM_ROLES.SUPPORT_TEAM:
      return SUPPORT_TEAM_MENU_ITEMS;
    default:
      return [];
  }
}

/**
 * Filter menu items based on resolved permissions
 */
export function filterMenuItems(
  items: MenuItem[],
  resolved: ResolvedPermissions
): MenuItem[] {
  return items.filter(item => {
    if (item.superAdminOnly && !resolved.isSuperAdmin) {
      return false;
    }
    if (item.roles && !item.roles.includes(resolved.role)) {
      return false;
    }
    if (item.permission && !hasResolvedPermission(resolved, item.permission)) {
      return false;
    }
    if (item.permissions && !hasAnyPermission(resolved, item.permissions)) {
      return false;
    }
    return true;
  });
}

// ==================== COUNTRY CODE MAPPING ====================
export const ISO_TO_TENANT_COUNTRY: Record<string, string> = {
  "IN": "india",
  "AE": "uae",
  "GB": "uk",
  "MY": "malaysia",
  "SG": "singapore",
  "US": "united_states",
  "AU": "australia",
  "CA": "canada",
  "NZ": "new_zealand",
  "DE": "germany",
  "FR": "france",
  "ES": "spain",
  "IT": "italy",
  "NL": "netherlands",
  "ZA": "south_africa",
  "NG": "nigeria",
  "BR": "brazil",
  "JP": "japan",
  "CN": "china",
  "SA": "saudi_arabia",
};

export const TENANT_COUNTRY_TO_ISO: Record<string, string> = Object.fromEntries(
  Object.entries(ISO_TO_TENANT_COUNTRY).map(([iso, tenant]) => [tenant, iso])
);

export function isoToTenantCountries(isoCodes: string[]): string[] {
  return isoCodes.map(code => ISO_TO_TENANT_COUNTRY[code] || code.toLowerCase());
}

export function tenantCountryToISO(tenantCountry: string): string {
  return TENANT_COUNTRY_TO_ISO[tenantCountry] || tenantCountry.toUpperCase();
}

export function isTenantCountryInScope(
  tenantCountry: string | null,
  allowedIsoCodes: string[]
): boolean {
  if (!tenantCountry) return false;
  if (allowedIsoCodes.length === 0) return false;
  const allowedTenantCountries = isoToTenantCountries(allowedIsoCodes);
  return allowedTenantCountries.includes(tenantCountry);
}
