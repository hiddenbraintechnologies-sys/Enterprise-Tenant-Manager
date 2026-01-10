/**
 * RBAC Permission Matrix - Single Source of Truth
 * 
 * This file defines all platform roles, permissions, and scope rules.
 * Used by both frontend (menu gating) and backend (API authorization).
 */

// ==================== PLATFORM ROLES ====================
export const PLATFORM_ROLES = {
  SUPER_ADMIN: "SUPER_ADMIN",
  PLATFORM_ADMIN: "PLATFORM_ADMIN", 
  TECH_SUPPORT_MANAGER: "TECH_SUPPORT_MANAGER",
  MANAGER: "MANAGER",
  SUPPORT_TEAM: "SUPPORT_TEAM",
} as const;

export type PlatformRole = typeof PLATFORM_ROLES[keyof typeof PLATFORM_ROLES];

// ==================== SCOPE TYPES ====================
export const SCOPE_TYPES = {
  GLOBAL: "GLOBAL",           // No restrictions (Super Admin only)
  COUNTRY: "COUNTRY",         // Restricted to assigned countries
  REGION: "REGION",           // Restricted to assigned regions
  TENANT: "TENANT",           // Restricted to specific tenants
} as const;

export type ScopeType = typeof SCOPE_TYPES[keyof typeof SCOPE_TYPES];

// ==================== PLATFORM PERMISSIONS ====================
export const PLATFORM_PERMISSIONS = {
  // Global Administration (Super Admin Only)
  MANAGE_PLATFORM_ADMINS: "platform:manage_admins",
  MANAGE_COUNTRIES_REGIONS: "platform:manage_countries_regions",
  MANAGE_GLOBAL_CONFIG: "platform:manage_global_config",
  MANAGE_PLANS_PRICING: "platform:manage_plans_pricing",
  MANAGE_BUSINESS_TYPES: "platform:manage_business_types",
  VIEW_ALL_TENANTS: "platform:view_all_tenants",
  VIEW_ALL_REVENUE: "platform:view_all_revenue",
  VIEW_SYSTEM_LOGS: "platform:view_system_logs",
  OVERRIDE_TENANT_LOCKS: "platform:override_tenant_locks",
  MANAGE_EXCHANGE_RATES: "platform:manage_exchange_rates",
  MANAGE_TAX_CONFIGS: "platform:manage_tax_configs",
  MANAGE_INVOICE_TEMPLATES: "platform:manage_invoice_templates",
  MANAGE_WHATSAPP_CONFIG: "platform:manage_whatsapp_config",
  
  // Scoped Administration (Platform Admin, Manager, Support)
  VIEW_TENANTS: "platform:view_tenants",
  SUSPEND_TENANT: "platform:suspend_tenant",
  REACTIVATE_TENANT: "platform:reactivate_tenant",
  VIEW_USAGE_METRICS: "platform:view_usage_metrics",
  VIEW_INVOICES_PAYMENTS: "platform:view_invoices_payments",
  HANDLE_SUPPORT_TICKETS: "platform:handle_support_tickets",
  VIEW_AUDIT_LOGS: "platform:view_audit_logs",
  
  // Tech Support Permissions
  VIEW_SYSTEM_HEALTH: "platform:view_system_health",
  VIEW_API_METRICS: "platform:view_api_metrics",
  MANAGE_APIS: "platform:manage_apis",
  VIEW_ERROR_LOGS: "platform:view_error_logs",
  MANAGE_ALERTS: "platform:manage_alerts",
  VIEW_PERFORMANCE: "platform:view_performance",
  
  // Manager Permissions
  VIEW_OPERATIONS: "platform:view_operations",
  VIEW_REPORTS: "platform:view_reports",
  
  // Support Team Permissions
  VIEW_TICKETS: "platform:view_tickets",
  RESPOND_TICKETS: "platform:respond_tickets",
  ESCALATE_TICKETS: "platform:escalate_tickets",
} as const;

export type PlatformPermission = typeof PLATFORM_PERMISSIONS[keyof typeof PLATFORM_PERMISSIONS];

// ==================== ROLE PERMISSION MATRIX ====================
// Defines which permissions each role has by default

export const ROLE_PERMISSIONS: Record<PlatformRole, PlatformPermission[]> = {
  [PLATFORM_ROLES.SUPER_ADMIN]: [
    // All global administration permissions
    PLATFORM_PERMISSIONS.MANAGE_PLATFORM_ADMINS,
    PLATFORM_PERMISSIONS.MANAGE_COUNTRIES_REGIONS,
    PLATFORM_PERMISSIONS.MANAGE_GLOBAL_CONFIG,
    PLATFORM_PERMISSIONS.MANAGE_PLANS_PRICING,
    PLATFORM_PERMISSIONS.MANAGE_BUSINESS_TYPES,
    PLATFORM_PERMISSIONS.VIEW_ALL_TENANTS,
    PLATFORM_PERMISSIONS.VIEW_ALL_REVENUE,
    PLATFORM_PERMISSIONS.VIEW_SYSTEM_LOGS,
    PLATFORM_PERMISSIONS.OVERRIDE_TENANT_LOCKS,
    PLATFORM_PERMISSIONS.MANAGE_EXCHANGE_RATES,
    PLATFORM_PERMISSIONS.MANAGE_TAX_CONFIGS,
    PLATFORM_PERMISSIONS.MANAGE_INVOICE_TEMPLATES,
    PLATFORM_PERMISSIONS.MANAGE_WHATSAPP_CONFIG,
    // All scoped permissions (super admin has no scope restriction)
    PLATFORM_PERMISSIONS.VIEW_TENANTS,
    PLATFORM_PERMISSIONS.SUSPEND_TENANT,
    PLATFORM_PERMISSIONS.REACTIVATE_TENANT,
    PLATFORM_PERMISSIONS.VIEW_USAGE_METRICS,
    PLATFORM_PERMISSIONS.VIEW_INVOICES_PAYMENTS,
    PLATFORM_PERMISSIONS.HANDLE_SUPPORT_TICKETS,
    PLATFORM_PERMISSIONS.VIEW_AUDIT_LOGS,
    // Tech support permissions
    PLATFORM_PERMISSIONS.VIEW_SYSTEM_HEALTH,
    PLATFORM_PERMISSIONS.VIEW_API_METRICS,
    PLATFORM_PERMISSIONS.MANAGE_APIS,
    PLATFORM_PERMISSIONS.VIEW_ERROR_LOGS,
    PLATFORM_PERMISSIONS.MANAGE_ALERTS,
    PLATFORM_PERMISSIONS.VIEW_PERFORMANCE,
    // Manager permissions
    PLATFORM_PERMISSIONS.VIEW_OPERATIONS,
    PLATFORM_PERMISSIONS.VIEW_REPORTS,
    // Support team permissions
    PLATFORM_PERMISSIONS.VIEW_TICKETS,
    PLATFORM_PERMISSIONS.RESPOND_TICKETS,
    PLATFORM_PERMISSIONS.ESCALATE_TICKETS,
  ],
  
  [PLATFORM_ROLES.PLATFORM_ADMIN]: [
    // Scoped tenant management (country/region restricted)
    PLATFORM_PERMISSIONS.VIEW_TENANTS,
    PLATFORM_PERMISSIONS.SUSPEND_TENANT,
    PLATFORM_PERMISSIONS.REACTIVATE_TENANT,
    PLATFORM_PERMISSIONS.VIEW_USAGE_METRICS,
    PLATFORM_PERMISSIONS.VIEW_INVOICES_PAYMENTS, // Read-only
    PLATFORM_PERMISSIONS.HANDLE_SUPPORT_TICKETS,
    PLATFORM_PERMISSIONS.VIEW_AUDIT_LOGS,
    // Support team permissions (can handle support for their scope)
    PLATFORM_PERMISSIONS.VIEW_TICKETS,
    PLATFORM_PERMISSIONS.RESPOND_TICKETS,
    PLATFORM_PERMISSIONS.ESCALATE_TICKETS,
  ],
  
  [PLATFORM_ROLES.TECH_SUPPORT_MANAGER]: [
    // System monitoring and management
    PLATFORM_PERMISSIONS.VIEW_SYSTEM_HEALTH,
    PLATFORM_PERMISSIONS.VIEW_API_METRICS,
    PLATFORM_PERMISSIONS.MANAGE_APIS,
    PLATFORM_PERMISSIONS.VIEW_ERROR_LOGS,
    PLATFORM_PERMISSIONS.MANAGE_ALERTS,
    PLATFORM_PERMISSIONS.VIEW_PERFORMANCE,
    PLATFORM_PERMISSIONS.VIEW_AUDIT_LOGS,
    // Limited tenant visibility for debugging
    PLATFORM_PERMISSIONS.VIEW_TENANTS,
  ],
  
  [PLATFORM_ROLES.MANAGER]: [
    // Operations oversight (scoped)
    PLATFORM_PERMISSIONS.VIEW_TENANTS,
    PLATFORM_PERMISSIONS.VIEW_OPERATIONS,
    PLATFORM_PERMISSIONS.VIEW_REPORTS,
    PLATFORM_PERMISSIONS.VIEW_USAGE_METRICS,
    // Support oversight
    PLATFORM_PERMISSIONS.VIEW_TICKETS,
  ],
  
  [PLATFORM_ROLES.SUPPORT_TEAM]: [
    // Support ticket handling only (scoped)
    PLATFORM_PERMISSIONS.VIEW_TICKETS,
    PLATFORM_PERMISSIONS.RESPOND_TICKETS,
    PLATFORM_PERMISSIONS.ESCALATE_TICKETS,
    PLATFORM_PERMISSIONS.HANDLE_SUPPORT_TICKETS,
  ],
};

// ==================== SCOPE RULES ====================
// Defines the scope type for each role

export const ROLE_SCOPE_RULES: Record<PlatformRole, ScopeType> = {
  [PLATFORM_ROLES.SUPER_ADMIN]: SCOPE_TYPES.GLOBAL,
  [PLATFORM_ROLES.PLATFORM_ADMIN]: SCOPE_TYPES.COUNTRY,
  [PLATFORM_ROLES.TECH_SUPPORT_MANAGER]: SCOPE_TYPES.GLOBAL, // Global for system monitoring
  [PLATFORM_ROLES.MANAGER]: SCOPE_TYPES.COUNTRY,
  [PLATFORM_ROLES.SUPPORT_TEAM]: SCOPE_TYPES.COUNTRY,
};

// ==================== SUPER ADMIN ONLY PERMISSIONS ====================
// Permissions that are exclusive to Super Admin

export const SUPER_ADMIN_ONLY_PERMISSIONS: PlatformPermission[] = [
  PLATFORM_PERMISSIONS.MANAGE_PLATFORM_ADMINS,
  PLATFORM_PERMISSIONS.MANAGE_COUNTRIES_REGIONS,
  PLATFORM_PERMISSIONS.MANAGE_GLOBAL_CONFIG,
  PLATFORM_PERMISSIONS.MANAGE_PLANS_PRICING,
  PLATFORM_PERMISSIONS.MANAGE_BUSINESS_TYPES,
  PLATFORM_PERMISSIONS.VIEW_ALL_TENANTS,
  PLATFORM_PERMISSIONS.VIEW_ALL_REVENUE,
  PLATFORM_PERMISSIONS.VIEW_SYSTEM_LOGS,
  PLATFORM_PERMISSIONS.OVERRIDE_TENANT_LOCKS,
  PLATFORM_PERMISSIONS.MANAGE_EXCHANGE_RATES,
  PLATFORM_PERMISSIONS.MANAGE_TAX_CONFIGS,
  PLATFORM_PERMISSIONS.MANAGE_INVOICE_TEMPLATES,
  PLATFORM_PERMISSIONS.MANAGE_WHATSAPP_CONFIG,
];

// ==================== MENU CONFIGURATION ====================
// Defines which menu items are visible for each role

export interface MenuItem {
  id: string;
  title: string;
  url: string;
  icon: string;
  permission?: PlatformPermission;
  permissions?: PlatformPermission[];
  superAdminOnly?: boolean;
  roles?: PlatformRole[];
}

export const SUPER_ADMIN_MENU_ITEMS: MenuItem[] = [
  { id: "dashboard", title: "Dashboard", url: "/super-admin", icon: "LayoutDashboard", superAdminOnly: true },
  { id: "tenants", title: "Tenants", url: "/super-admin/tenants", icon: "Building2", permission: PLATFORM_PERMISSIONS.VIEW_ALL_TENANTS },
  { id: "admins", title: "Platform Admins", url: "/super-admin/admins", icon: "UserCog", permission: PLATFORM_PERMISSIONS.MANAGE_PLATFORM_ADMINS },
  { id: "billing", title: "Billing", url: "/super-admin/billing", icon: "DollarSign", permission: PLATFORM_PERMISSIONS.VIEW_ALL_REVENUE },
  { id: "invoice-templates", title: "Invoice Templates", url: "/super-admin/invoice-templates", icon: "FileEdit", permission: PLATFORM_PERMISSIONS.MANAGE_INVOICE_TEMPLATES },
  { id: "tax", title: "Tax Management", url: "/super-admin/tax", icon: "Calculator", permission: PLATFORM_PERMISSIONS.MANAGE_TAX_CONFIGS },
  { id: "exchange-rates", title: "Exchange Rates", url: "/super-admin/exchange-rates", icon: "ArrowRightLeft", permission: PLATFORM_PERMISSIONS.MANAGE_EXCHANGE_RATES },
  { id: "whatsapp", title: "WhatsApp", url: "/super-admin/whatsapp", icon: "MessageSquare", permission: PLATFORM_PERMISSIONS.MANAGE_WHATSAPP_CONFIG },
  { id: "audit-logs", title: "Audit Logs", url: "/super-admin/audit-logs", icon: "FileText", permission: PLATFORM_PERMISSIONS.VIEW_SYSTEM_LOGS },
  { id: "compliance", title: "Compliance", url: "/super-admin/compliance", icon: "Scale", permission: PLATFORM_PERMISSIONS.VIEW_SYSTEM_LOGS },
  { id: "settings", title: "System Settings", url: "/super-admin/settings", icon: "Cog", permission: PLATFORM_PERMISSIONS.MANAGE_GLOBAL_CONFIG },
  { id: "regions", title: "Regions", url: "/super-admin/regions", icon: "Globe", permission: PLATFORM_PERMISSIONS.MANAGE_COUNTRIES_REGIONS },
];

export const PLATFORM_ADMIN_MENU_ITEMS: MenuItem[] = [
  { id: "dashboard", title: "Dashboard", url: "/admin", icon: "LayoutDashboard" },
  { id: "tenants", title: "Tenants", url: "/admin/tenants", icon: "Building2", permission: PLATFORM_PERMISSIONS.VIEW_TENANTS },
  { id: "users", title: "Users", url: "/admin/users", icon: "Users", permission: PLATFORM_PERMISSIONS.VIEW_TENANTS },
  { id: "billing", title: "Billing", url: "/admin/billing", icon: "DollarSign", permission: PLATFORM_PERMISSIONS.VIEW_INVOICES_PAYMENTS },
  { id: "audit-logs", title: "Audit Logs", url: "/admin/audit-logs", icon: "FileText", permission: PLATFORM_PERMISSIONS.VIEW_AUDIT_LOGS },
  { id: "support", title: "Support Tickets", url: "/admin/support", icon: "Ticket", permission: PLATFORM_PERMISSIONS.HANDLE_SUPPORT_TICKETS },
];

export const TECH_SUPPORT_MENU_ITEMS: MenuItem[] = [
  { id: "dashboard", title: "Dashboard", url: "/tech-support", icon: "LayoutDashboard" },
  { id: "health", title: "System Health", url: "/tech-support/health", icon: "Activity", permission: PLATFORM_PERMISSIONS.VIEW_SYSTEM_HEALTH },
  { id: "apis", title: "API Management", url: "/tech-support/apis", icon: "Globe", permission: PLATFORM_PERMISSIONS.VIEW_API_METRICS },
  { id: "errors", title: "Error Logs", url: "/tech-support/errors", icon: "AlertTriangle", permission: PLATFORM_PERMISSIONS.VIEW_ERROR_LOGS },
  { id: "performance", title: "Performance", url: "/tech-support/performance", icon: "BarChart3", permission: PLATFORM_PERMISSIONS.VIEW_PERFORMANCE },
  { id: "audit-logs", title: "Audit Logs", url: "/tech-support/audit-logs", icon: "FileText", permission: PLATFORM_PERMISSIONS.VIEW_AUDIT_LOGS },
];

export const MANAGER_MENU_ITEMS: MenuItem[] = [
  { id: "dashboard", title: "Dashboard", url: "/manager", icon: "LayoutDashboard" },
  { id: "tenants", title: "Tenants", url: "/manager/tenants", icon: "Building2", permission: PLATFORM_PERMISSIONS.VIEW_TENANTS },
  { id: "operations", title: "Operations", url: "/manager/operations", icon: "ClipboardList", permission: PLATFORM_PERMISSIONS.VIEW_OPERATIONS },
  { id: "reports", title: "Reports", url: "/manager/reports", icon: "BarChart3", permission: PLATFORM_PERMISSIONS.VIEW_REPORTS },
];

export const SUPPORT_TEAM_MENU_ITEMS: MenuItem[] = [
  { id: "dashboard", title: "Dashboard", url: "/support", icon: "LayoutDashboard" },
  { id: "tickets", title: "Tickets", url: "/support/tickets", icon: "Ticket", permission: PLATFORM_PERMISSIONS.VIEW_TICKETS },
  { id: "issues", title: "User Issues", url: "/support/issues", icon: "Headphones", permission: PLATFORM_PERMISSIONS.HANDLE_SUPPORT_TICKETS },
];

// ==================== HELPER FUNCTIONS ====================

export interface AdminScope {
  countryIds: string[];
  regionIds: string[];
}

export interface ResolvedPermissions {
  role: PlatformRole;
  permissions: PlatformPermission[];
  scope: AdminScope | null; // null means global access
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
 * Check if a role has a specific permission
 */
export function hasPermission(
  resolved: ResolvedPermissions,
  permission: PlatformPermission
): boolean {
  return resolved.permissions.includes(permission);
}

/**
 * Check if a role has any of the specified permissions
 */
export function hasAnyPermission(
  resolved: ResolvedPermissions,
  permissions: PlatformPermission[]
): boolean {
  return permissions.some(p => resolved.permissions.includes(p));
}

/**
 * Check if a permission is super admin only
 */
export function isSuperAdminOnly(permission: PlatformPermission): boolean {
  return SUPER_ADMIN_ONLY_PERMISSIONS.includes(permission);
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
    // Super admin only items
    if (item.superAdminOnly && !resolved.isSuperAdmin) {
      return false;
    }
    
    // Role-restricted items
    if (item.roles && !item.roles.includes(resolved.role)) {
      return false;
    }
    
    // Single permission check
    if (item.permission && !hasPermission(resolved, item.permission)) {
      return false;
    }
    
    // Multiple permissions check (any)
    if (item.permissions && !hasAnyPermission(resolved, item.permissions)) {
      return false;
    }
    
    return true;
  });
}

// ==================== COUNTRY CODE MAPPING ====================
// Canonical mapping between ISO 2-letter country codes and tenant.country enum values

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

/**
 * Convert ISO country codes to tenant country values
 */
export function isoToTenantCountries(isoCodes: string[]): string[] {
  return isoCodes.map(code => ISO_TO_TENANT_COUNTRY[code] || code.toLowerCase());
}

/**
 * Convert tenant country value to ISO country code
 */
export function tenantCountryToISO(tenantCountry: string): string {
  return TENANT_COUNTRY_TO_ISO[tenantCountry] || tenantCountry.toUpperCase();
}

/**
 * Check if a tenant country is in the allowed ISO country codes
 */
export function isTenantCountryInScope(
  tenantCountry: string | null,
  allowedIsoCodes: string[]
): boolean {
  if (!tenantCountry) return false;
  if (allowedIsoCodes.length === 0) return false;
  const allowedTenantCountries = isoToTenantCountries(allowedIsoCodes);
  return allowedTenantCountries.includes(tenantCountry);
}
