import { db } from "../db";
import { 
  roles, permissions, rolePermissions, userTenants,
  type Role, type Permission, type RolePermission, type InsertRole, type InsertPermission
} from "@shared/schema";
import { eq, and, inArray, isNull } from "drizzle-orm";

// ==================== PLATFORM ADMIN PERMISSIONS ====================
// Defines explicit permission sets for PLATFORM_SUPER_ADMIN and PLATFORM_ADMIN roles

export const PLATFORM_PERMISSIONS = {
  // Super Admin Only Permissions
  MANAGE_PLATFORM_ADMINS: "platform:manage_admins",
  MANAGE_COUNTRIES_REGIONS: "platform:manage_countries_regions",
  MANAGE_GLOBAL_CONFIG: "platform:manage_global_config",
  MANAGE_PLANS_PRICING: "platform:manage_plans_pricing",
  MANAGE_BUSINESS_TYPES: "platform:manage_business_types",
  VIEW_ALL_TENANTS: "platform:view_all_tenants",
  VIEW_ALL_REVENUE: "platform:view_all_revenue",
  VIEW_SYSTEM_LOGS: "platform:view_system_logs",
  OVERRIDE_TENANT_LOCKS: "platform:override_tenant_locks",
  
  // Platform Admin Permissions (scoped)
  VIEW_TENANTS: "platform:view_tenants",
  SUSPEND_TENANT: "platform:suspend_tenant",
  VIEW_USAGE_METRICS: "platform:view_usage_metrics",
  VIEW_INVOICES_PAYMENTS: "platform:view_invoices_payments",
  HANDLE_SUPPORT_TICKETS: "platform:handle_support_tickets",
} as const;

export type PlatformPermission = typeof PLATFORM_PERMISSIONS[keyof typeof PLATFORM_PERMISSIONS];

export const SUPER_ADMIN_PERMISSIONS: PlatformPermission[] = [
  PLATFORM_PERMISSIONS.MANAGE_PLATFORM_ADMINS,
  PLATFORM_PERMISSIONS.MANAGE_COUNTRIES_REGIONS,
  PLATFORM_PERMISSIONS.MANAGE_GLOBAL_CONFIG,
  PLATFORM_PERMISSIONS.MANAGE_PLANS_PRICING,
  PLATFORM_PERMISSIONS.MANAGE_BUSINESS_TYPES,
  PLATFORM_PERMISSIONS.VIEW_ALL_TENANTS,
  PLATFORM_PERMISSIONS.VIEW_ALL_REVENUE,
  PLATFORM_PERMISSIONS.VIEW_SYSTEM_LOGS,
  PLATFORM_PERMISSIONS.OVERRIDE_TENANT_LOCKS,
  // Super admin also has all platform admin permissions
  PLATFORM_PERMISSIONS.VIEW_TENANTS,
  PLATFORM_PERMISSIONS.SUSPEND_TENANT,
  PLATFORM_PERMISSIONS.VIEW_USAGE_METRICS,
  PLATFORM_PERMISSIONS.VIEW_INVOICES_PAYMENTS,
  PLATFORM_PERMISSIONS.HANDLE_SUPPORT_TICKETS,
];

export const PLATFORM_ADMIN_PERMISSIONS: PlatformPermission[] = [
  PLATFORM_PERMISSIONS.VIEW_TENANTS,
  PLATFORM_PERMISSIONS.SUSPEND_TENANT,
  PLATFORM_PERMISSIONS.VIEW_USAGE_METRICS,
  PLATFORM_PERMISSIONS.VIEW_INVOICES_PAYMENTS,
  PLATFORM_PERMISSIONS.HANDLE_SUPPORT_TICKETS,
];

// Super admin only permissions (not available to platform admins)
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
];

export type AdminRole = "SUPER_ADMIN" | "PLATFORM_ADMIN";

export interface AdminScope {
  countryIds: string[];
  regionIds: string[];
}

export interface ResolvedAdminPermissions {
  role: AdminRole;
  permissions: PlatformPermission[];
  scope: AdminScope | null; // null means global access (super admin)
  isSuperAdmin: boolean;
}

/**
 * Resolve permissions for a platform admin based on their role
 */
export function resolveAdminPermissions(
  role: string,
  countryIds?: string[] | null,
  regionIds?: string[] | null
): ResolvedAdminPermissions {
  const isSuperAdmin = role === "SUPER_ADMIN";
  
  return {
    role: isSuperAdmin ? "SUPER_ADMIN" : "PLATFORM_ADMIN",
    permissions: isSuperAdmin ? SUPER_ADMIN_PERMISSIONS : PLATFORM_ADMIN_PERMISSIONS,
    scope: isSuperAdmin ? null : {
      countryIds: countryIds || [],
      regionIds: regionIds || [],
    },
    isSuperAdmin,
  };
}

/**
 * Check if an admin has a specific platform permission
 */
export function hasPlatformPermission(
  resolved: ResolvedAdminPermissions,
  permission: PlatformPermission
): boolean {
  return resolved.permissions.includes(permission);
}

/**
 * Check if a permission is super admin only
 */
export function isSuperAdminOnlyPermission(permission: PlatformPermission): boolean {
  return SUPER_ADMIN_ONLY_PERMISSIONS.includes(permission);
}

/**
 * Check if an admin can access a specific country (scope check)
 */
export function canAccessCountry(
  resolved: ResolvedAdminPermissions,
  countryCode: string
): boolean {
  // Super admin can access all countries
  if (resolved.isSuperAdmin || resolved.scope === null) {
    return true;
  }
  
  // Platform admin must have country in their scope
  return resolved.scope.countryIds.includes(countryCode);
}

/**
 * Check if an admin can access a specific region (scope check)
 */
export function canAccessRegion(
  resolved: ResolvedAdminPermissions,
  region: string
): boolean {
  // Super admin can access all regions
  if (resolved.isSuperAdmin || resolved.scope === null) {
    return true;
  }
  
  // Platform admin must have region in their scope
  return resolved.scope.regionIds.includes(region);
}

/**
 * Get permission display names for UI
 */
export const PLATFORM_PERMISSION_DISPLAY_NAMES: Record<PlatformPermission, string> = {
  [PLATFORM_PERMISSIONS.MANAGE_PLATFORM_ADMINS]: "Manage Platform Admins",
  [PLATFORM_PERMISSIONS.MANAGE_COUNTRIES_REGIONS]: "Manage Countries & Regions",
  [PLATFORM_PERMISSIONS.MANAGE_GLOBAL_CONFIG]: "Manage Global Configuration",
  [PLATFORM_PERMISSIONS.MANAGE_PLANS_PRICING]: "Manage Plans & Pricing",
  [PLATFORM_PERMISSIONS.MANAGE_BUSINESS_TYPES]: "Manage Business Types",
  [PLATFORM_PERMISSIONS.VIEW_ALL_TENANTS]: "View All Tenants (Global)",
  [PLATFORM_PERMISSIONS.VIEW_ALL_REVENUE]: "View All Revenue (Global)",
  [PLATFORM_PERMISSIONS.VIEW_SYSTEM_LOGS]: "View System Logs",
  [PLATFORM_PERMISSIONS.OVERRIDE_TENANT_LOCKS]: "Override Tenant Locks",
  [PLATFORM_PERMISSIONS.VIEW_TENANTS]: "View Tenants (Scoped)",
  [PLATFORM_PERMISSIONS.SUSPEND_TENANT]: "Suspend Tenant (Scoped)",
  [PLATFORM_PERMISSIONS.VIEW_USAGE_METRICS]: "View Usage Metrics (Scoped)",
  [PLATFORM_PERMISSIONS.VIEW_INVOICES_PAYMENTS]: "View Invoices & Payments (Read-only)",
  [PLATFORM_PERMISSIONS.HANDLE_SUPPORT_TICKETS]: "Handle Support Tickets (Scoped)",
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
