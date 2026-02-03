import { storage } from "../storage";
import type { Permission } from "@shared/rbac/permissions";
import { Permissions } from "@shared/rbac/permissions";

export type EffectiveActor = {
  userId: string;
  tenantId: string;
  staffId: string;
  roleId: string;
  roleName: string;
  permissions: Set<string>;
  isImpersonating: boolean;
  impersonatedStaffId?: string;
  realActorStaffId?: string;
};

export class PermissionService {
  static async getEffectiveActor(
    userId: string,
    tenantId: string,
    opts?: { impersonatedStaffId?: string }
  ): Promise<EffectiveActor | null> {
    const staff = await storage.getTenantStaffByUserId(userId, tenantId);
    if (!staff || staff.status !== "active") {
      return null;
    }

    let effectiveStaffId = staff.id;
    let isImpersonating = false;
    let realActorStaffId = staff.id;

    if (opts?.impersonatedStaffId && opts.impersonatedStaffId !== staff.id) {
      const canImpersonate = await this.hasPermissionInternal(userId, tenantId, Permissions.IMPERSONATION_USE);
      if (canImpersonate) {
        const targetStaff = await storage.getTenantStaffMember(opts.impersonatedStaffId, tenantId);
        if (targetStaff && targetStaff.status === "active") {
          effectiveStaffId = opts.impersonatedStaffId;
          isImpersonating = true;
        }
      }
    }

    const effectiveStaff = isImpersonating 
      ? await storage.getTenantStaffMember(effectiveStaffId, tenantId)
      : staff;
    
    if (!effectiveStaff || !effectiveStaff.tenantRoleId) {
      return null;
    }

    const role = await storage.getTenantRole(effectiveStaff.tenantRoleId, tenantId);
    const rolePermissions = await storage.getTenantRolePermissions(effectiveStaff.tenantRoleId);
    const perms = new Set(rolePermissions.map(rp => rp.permission));

    return {
      userId,
      tenantId,
      staffId: effectiveStaff.id,
      roleId: effectiveStaff.tenantRoleId,
      roleName: role?.name ?? "Unknown",
      permissions: perms,
      isImpersonating,
      impersonatedStaffId: isImpersonating ? effectiveStaff.id : undefined,
      realActorStaffId,
    };
  }

  private static async hasPermissionInternal(
    userId: string,
    tenantId: string,
    permission: Permission
  ): Promise<boolean> {
    const staff = await storage.getTenantStaffByUserId(userId, tenantId);
    if (!staff || staff.status !== "active" || !staff.tenantRoleId) {
      return false;
    }
    const rolePermissions = await storage.getTenantRolePermissions(staff.tenantRoleId);
    return rolePermissions.some(rp => rp.permission === permission);
  }

  static async hasPermission(
    userId: string,
    tenantId: string,
    permission: Permission,
    opts?: { impersonatedStaffId?: string }
  ): Promise<boolean> {
    const actor = await this.getEffectiveActor(userId, tenantId, opts);
    if (!actor) return false;
    
    if (actor.permissions.has(permission)) return true;
    const wildcardPerm = permission.split("_")[0] + "_*";
    return actor.permissions.has(wildcardPerm);
  }

  static async hasAnyPermission(
    userId: string,
    tenantId: string,
    permissions: Permission[],
    opts?: { impersonatedStaffId?: string }
  ): Promise<boolean> {
    const actor = await this.getEffectiveActor(userId, tenantId, opts);
    if (!actor) return false;
    return permissions.some(p => actor.permissions.has(p));
  }

  static async hasAllPermissions(
    userId: string,
    tenantId: string,
    permissions: Permission[],
    opts?: { impersonatedStaffId?: string }
  ): Promise<boolean> {
    const actor = await this.getEffectiveActor(userId, tenantId, opts);
    if (!actor) return false;
    return permissions.every(p => actor.permissions.has(p));
  }

  static async getStaffPermissions(
    userId: string,
    tenantId: string
  ): Promise<string[]> {
    const actor = await this.getEffectiveActor(userId, tenantId);
    if (!actor) return [];
    return Array.from(actor.permissions);
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
