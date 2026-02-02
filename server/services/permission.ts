import { storage } from "../storage";
import type { Permission } from "@shared/rbac/permissions";

export class PermissionService {
  static async hasPermission(
    userId: string,
    tenantId: string,
    permission: Permission
  ): Promise<boolean> {
    const staff = await storage.getTenantStaffByUserId(userId, tenantId);
    if (!staff) {
      return false;
    }

    if (staff.status !== "active") {
      return false;
    }

    if (!staff.tenantRoleId) {
      return false;
    }

    const rolePermissions = await storage.getTenantRolePermissions(staff.tenantRoleId);
    return rolePermissions.some(rp => rp.permission === permission);
  }

  static async hasAnyPermission(
    userId: string,
    tenantId: string,
    permissions: Permission[]
  ): Promise<boolean> {
    const staff = await storage.getTenantStaffByUserId(userId, tenantId);
    if (!staff || staff.status !== "active" || !staff.tenantRoleId) {
      return false;
    }

    const rolePermissions = await storage.getTenantRolePermissions(staff.tenantRoleId);
    const permissionSet = new Set(rolePermissions.map(rp => rp.permission));
    return permissions.some(p => permissionSet.has(p));
  }

  static async hasAllPermissions(
    userId: string,
    tenantId: string,
    permissions: Permission[]
  ): Promise<boolean> {
    const staff = await storage.getTenantStaffByUserId(userId, tenantId);
    if (!staff || staff.status !== "active" || !staff.tenantRoleId) {
      return false;
    }

    const rolePermissions = await storage.getTenantRolePermissions(staff.tenantRoleId);
    const permissionSet = new Set(rolePermissions.map(rp => rp.permission));
    return permissions.every(p => permissionSet.has(p));
  }

  static async getStaffPermissions(
    userId: string,
    tenantId: string
  ): Promise<string[]> {
    const staff = await storage.getTenantStaffByUserId(userId, tenantId);
    if (!staff || staff.status !== "active" || !staff.tenantRoleId) {
      return [];
    }

    const rolePermissions = await storage.getTenantRolePermissions(staff.tenantRoleId);
    return rolePermissions.map(rp => rp.permission);
  }

  static async isStaffAdmin(userId: string, tenantId: string): Promise<boolean> {
    const staff = await storage.getTenantStaffByUserId(userId, tenantId);
    if (!staff || staff.status !== "active" || !staff.tenantRoleId) {
      return false;
    }

    const role = await storage.getTenantRole(staff.tenantRoleId, tenantId);
    return role?.name === "Admin" && role?.isSystem === true;
  }
}
