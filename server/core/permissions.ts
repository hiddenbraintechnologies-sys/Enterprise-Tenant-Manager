import { db } from "../db";
import { 
  roles, permissions, rolePermissions, userTenants,
  type Role, type Permission, type RolePermission, type InsertRole, type InsertPermission
} from "@shared/schema";
import { eq, and, inArray, isNull } from "drizzle-orm";

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
