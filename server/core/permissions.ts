import { db } from "../db";
import { 
  roles, permissions, rolePermissions, userTenants,
  type Role, type Permission, type RolePermission, type InsertRole, type InsertPermission
} from "@shared/schema";
import { eq, and, inArray, isNull } from "drizzle-orm";

// ==================== RE-EXPORT FROM SHARED RBAC MODULE ====================
// Single source of truth for platform permissions
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
  hasPermission,
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
  type PlatformRole,
  type TenantRole,
  type Role,
  type Permission,
  type PlatformPermission,
  type ScopeType,
  type ScopeContext,
  type AdminScope,
  type ResolvedPermissions,
  type RoleDefinition,
  type MenuItem,
} from "@shared/rbac/permissions";

// Legacy exports for backward compatibility
import { 
  PLATFORM_ROLES as _PLATFORM_ROLES,
  Permissions as _Permissions,
  ROLE_PERMISSIONS as _ROLE_PERMISSIONS,
  resolvePermissions as _resolvePermissions,
  hasPermission as _hasPermission,
  type ResolvedPermissions as _ResolvedPermissions,
  type PlatformRole as _PlatformRole,
  type Permission as _Permission,
} from "@shared/rbac/permissions";

// Legacy type alias
export type AdminRole = _PlatformRole;

// Legacy interface alias  
export type ResolvedAdminPermissions = _ResolvedPermissions;

// Legacy permission arrays for backward compatibility
export const SUPER_ADMIN_PERMISSIONS = _ROLE_PERMISSIONS[_PLATFORM_ROLES.SUPER_ADMIN];
export const PLATFORM_ADMIN_PERMISSIONS = _ROLE_PERMISSIONS[_PLATFORM_ROLES.PLATFORM_ADMIN];

/**
 * Legacy function - resolve permissions for a platform admin based on their role
 * @deprecated Use resolvePermissions from @shared/rbac/permissions instead
 */
export function resolveAdminPermissions(
  role: string,
  countryIds?: string[] | null,
  regionIds?: string[] | null
): _ResolvedPermissions {
  return _resolvePermissions(role as _PlatformRole, countryIds, regionIds);
}

/**
 * Legacy function - check if a role has a permission
 * @deprecated Use hasPermission from @shared/rbac/permissions instead
 */
export function hasPlatformPermission(role: string, permission: _Permission): boolean {
  return _hasPermission(role as _PlatformRole, permission);
}

/**
 * Get permission display names for UI
 */
export const PLATFORM_PERMISSION_DISPLAY_NAMES: Partial<Record<_Permission, string>> = {
  [_Permissions.MANAGE_PLATFORM_ADMINS]: "Manage Platform Admins",
  [_Permissions.MANAGE_COUNTRIES_REGIONS]: "Manage Countries & Regions",
  [_Permissions.MANAGE_GLOBAL_CONFIG]: "Manage Global Configuration",
  [_Permissions.MANAGE_PLANS_PRICING]: "Manage Plans & Pricing",
  [_Permissions.MANAGE_BUSINESS_TYPES]: "Manage Business Types",
  [_Permissions.VIEW_ALL_TENANTS]: "View All Tenants (Global)",
  [_Permissions.VIEW_SYSTEM_LOGS]: "View System Logs",
  [_Permissions.OVERRIDE_TENANT_LOCK]: "Override Tenant Locks",
  [_Permissions.VIEW_TENANTS_SCOPED]: "View Tenants (Scoped)",
  [_Permissions.SUSPEND_TENANT_SCOPED]: "Suspend Tenant (Scoped)",
  [_Permissions.VIEW_INVOICES_PAYMENTS]: "View Invoices & Payments (Read-only)",
  [_Permissions.HANDLE_SUPPORT_TICKETS]: "Handle Support Tickets (Scoped)",
  [_Permissions.VIEW_AUDIT_LOGS]: "View Audit Logs",
  [_Permissions.VIEW_SYSTEM_HEALTH]: "View System Health",
  [_Permissions.VIEW_API_METRICS]: "View API Metrics",
  [_Permissions.MANAGE_APIS]: "Manage APIs",
  [_Permissions.VIEW_ERROR_LOGS]: "View Error Logs",
  [_Permissions.VIEW_PERFORMANCE]: "View Performance",
  [_Permissions.VIEW_OPERATIONS]: "View Operations",
  [_Permissions.VIEW_REPORTS]: "View Reports",
  [_Permissions.VIEW_TICKETS]: "View Tickets",
  [_Permissions.RESPOND_TICKETS]: "Respond to Tickets",
  [_Permissions.ESCALATE_TICKETS]: "Escalate Tickets",
  [_Permissions.MANAGE_USERS]: "Manage Users",
  [_Permissions.VIEW_DASHBOARD]: "View Dashboard",
  [_Permissions.MANAGE_PROJECTS]: "Manage Projects",
  [_Permissions.MANAGE_TIMESHEETS]: "Manage Timesheets",
  [_Permissions.VIEW_INVOICES]: "View Invoices",
  [_Permissions.CREATE_INVOICES]: "Create Invoices",
  [_Permissions.RECORD_PAYMENTS]: "Record Payments",
  [_Permissions.VIEW_ANALYTICS]: "View Analytics",
  [_Permissions.MANAGE_SETTINGS]: "Manage Settings",
};

// ==================== TENANT-LEVEL PERMISSIONS ====================
// Permissions for users within a tenant

export const PERMISSIONS = {
  CUSTOMERS_READ: "customers:read",
  CUSTOMERS_CREATE: "customers:create",
  CUSTOMERS_UPDATE: "customers:update",
  CUSTOMERS_DELETE: "customers:delete",
  SERVICES_READ: "services:read",
  SERVICES_CREATE: "services:create",
  SERVICES_UPDATE: "services:update",
  SERVICES_DELETE: "services:delete",
  BOOKINGS_READ: "bookings:read",
  BOOKINGS_CREATE: "bookings:create",
  BOOKINGS_UPDATE: "bookings:update",
  BOOKINGS_DELETE: "bookings:delete",
  STAFF_READ: "staff:read",
  STAFF_CREATE: "staff:create",
  STAFF_UPDATE: "staff:update",
  STAFF_DELETE: "staff:delete",
  ANALYTICS_READ: "analytics:read",
  SETTINGS_READ: "settings:read",
  SETTINGS_UPDATE: "settings:update",
  BILLING_READ: "billing:read",
  BILLING_MANAGE: "billing:manage",
  USERS_READ: "users:read",
  USERS_INVITE: "users:invite",
  USERS_MANAGE: "users:manage",
  AUDIT_READ: "audit:read",
  // Furniture Module Permissions
  FURNITURE_PRODUCTS_READ: "furniture_products:read",
  FURNITURE_PRODUCTS_CREATE: "furniture_products:create",
  FURNITURE_PRODUCTS_UPDATE: "furniture_products:update",
  FURNITURE_PRODUCTS_DELETE: "furniture_products:delete",
  RAW_MATERIALS_READ: "raw_materials:read",
  RAW_MATERIALS_CREATE: "raw_materials:create",
  RAW_MATERIALS_UPDATE: "raw_materials:update",
  RAW_MATERIALS_DELETE: "raw_materials:delete",
  RAW_MATERIALS_STOCK_MANAGE: "raw_materials:stock_manage",
  BOM_READ: "bom:read",
  BOM_CREATE: "bom:create",
  BOM_UPDATE: "bom:update",
  BOM_DELETE: "bom:delete",
  PRODUCTION_ORDERS_READ: "production_orders:read",
  PRODUCTION_ORDERS_CREATE: "production_orders:create",
  PRODUCTION_ORDERS_UPDATE: "production_orders:update",
  PRODUCTION_ORDERS_DELETE: "production_orders:delete",
  PRODUCTION_STAGES_UPDATE: "production_stages:update",
  DELIVERY_ORDERS_READ: "delivery_orders:read",
  DELIVERY_ORDERS_CREATE: "delivery_orders:create",
  DELIVERY_ORDERS_UPDATE: "delivery_orders:update",
  DELIVERY_ORDERS_DELETE: "delivery_orders:delete",
  INSTALLATION_ORDERS_READ: "installation_orders:read",
  INSTALLATION_ORDERS_CREATE: "installation_orders:create",
  INSTALLATION_ORDERS_UPDATE: "installation_orders:update",
  FURNITURE_SALES_READ: "furniture_sales:read",
  FURNITURE_SALES_CREATE: "furniture_sales:create",
  FURNITURE_SALES_UPDATE: "furniture_sales:update",
  FURNITURE_SALES_DELETE: "furniture_sales:delete",
  MANUFACTURING_REPORTS_READ: "manufacturing_reports:read",
} as const;

export type PermissionCode = typeof PERMISSIONS[keyof typeof PERMISSIONS];

const permissionCache = new Map<string, { permissions: string[]; expiresAt: number }>();
const CACHE_TTL = 60 * 1000;

export class PermissionService {
  async getAllPermissions(): Promise<Permission[]> {
    return db.select().from(permissions);
  }

  async getPermissionsByResource(resource: string): Promise<Permission[]> {
    return db.select().from(permissions).where(eq(permissions.resource, resource));
  }

  async getSystemRoles(): Promise<Role[]> {
    return db.select().from(roles).where(and(
      isNull(roles.tenantId),
      eq(roles.isSystem, true)
    ));
  }

  async getTenantRoles(tenantId: string): Promise<Role[]> {
    const systemRoles = await db.select().from(roles).where(eq(roles.isSystem, true));
    const tenantRoles = await db.select().from(roles).where(eq(roles.tenantId, tenantId));
    return [...systemRoles, ...tenantRoles];
  }

  async createTenantRole(tenantId: string, data: Omit<InsertRole, "tenantId" | "isSystem">): Promise<Role> {
    const [created] = await db.insert(roles)
      .values({
        ...data,
        tenantId,
        isSystem: false,
      })
      .returning();
    return created;
  }

  async getRolePermissions(roleId: string, useCache = true): Promise<string[]> {
    if (useCache) {
      const cached = permissionCache.get(roleId);
      if (cached && cached.expiresAt > Date.now()) {
        return cached.permissions;
      }
    }

    const perms = await db.select({
      code: permissions.code,
    })
    .from(rolePermissions)
    .leftJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
    .where(eq(rolePermissions.roleId, roleId));

    const codes = perms.map(p => p.code).filter(Boolean) as string[];

    permissionCache.set(roleId, {
      permissions: codes,
      expiresAt: Date.now() + CACHE_TTL,
    });

    return codes;
  }

  async assignPermissionsToRole(roleId: string, permissionCodes: string[]): Promise<void> {
    const permissionRecords = await db.select()
      .from(permissions)
      .where(inArray(permissions.code, permissionCodes));

    for (const permission of permissionRecords) {
      const [existing] = await db.select()
        .from(rolePermissions)
        .where(and(
          eq(rolePermissions.roleId, roleId),
          eq(rolePermissions.permissionId, permission.id)
        ));

      if (!existing) {
        await db.insert(rolePermissions).values({
          roleId,
          permissionId: permission.id,
        });
      }
    }

    permissionCache.delete(roleId);
  }

  async removePermissionsFromRole(roleId: string, permissionCodes: string[]): Promise<void> {
    const permissionRecords = await db.select()
      .from(permissions)
      .where(inArray(permissions.code, permissionCodes));

    for (const permission of permissionRecords) {
      await db.delete(rolePermissions)
        .where(and(
          eq(rolePermissions.roleId, roleId),
          eq(rolePermissions.permissionId, permission.id)
        ));
    }

    permissionCache.delete(roleId);
  }

  async getUserPermissions(userId: string, tenantId: string): Promise<string[]> {
    const [userTenant] = await db.select()
      .from(userTenants)
      .where(and(
        eq(userTenants.userId, userId),
        eq(userTenants.tenantId, tenantId),
        eq(userTenants.isActive, true)
      ));

    if (!userTenant) {
      return [];
    }

    return this.getRolePermissions(userTenant.roleId);
  }

  async hasPermission(userId: string, tenantId: string, permission: string): Promise<boolean> {
    const permissions = await this.getUserPermissions(userId, tenantId);
    return permissions.includes(permission);
  }

  async hasAnyPermission(userId: string, tenantId: string, requiredPermissions: string[]): Promise<boolean> {
    const permissions = await this.getUserPermissions(userId, tenantId);
    return requiredPermissions.some(p => permissions.includes(p));
  }

  async hasAllPermissions(userId: string, tenantId: string, requiredPermissions: string[]): Promise<boolean> {
    const permissions = await this.getUserPermissions(userId, tenantId);
    return requiredPermissions.every(p => permissions.includes(p));
  }

  clearCache(roleId?: string): void {
    if (roleId) {
      permissionCache.delete(roleId);
    } else {
      permissionCache.clear();
    }
  }
}

export const permissionService = new PermissionService();
