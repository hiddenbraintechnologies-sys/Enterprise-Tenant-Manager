import { auditService } from "../core/audit";
import type { AuditAction } from "../core/audit";

export type AuditEvent =
  | "ROLE_CREATED"
  | "ROLE_UPDATED"
  | "ROLE_DELETED"
  | "ROLE_PERMISSIONS_UPDATED"
  | "ROLE_CLONED"
  | "STAFF_INVITED"
  | "STAFF_INVITE_RESENT"
  | "STAFF_INVITE_REVOKED"
  | "STAFF_ACTIVATED"
  | "STAFF_DEACTIVATED"
  | "STAFF_ROLE_CHANGED"
  | "STAFF_UPDATED"
  | "STAFF_REMOVED"
  | "IMPERSONATION_STARTED"
  | "IMPERSONATION_ENDED";

function eventToAction(event: AuditEvent): AuditAction {
  if (event.includes("CREATED") || event.includes("INVITED") || event.includes("CLONED")) {
    return "create";
  }
  if (event.includes("DELETED") || event.includes("REMOVED") || event.includes("REVOKED")) {
    return "delete";
  }
  if (event.includes("UPDATED") || event.includes("CHANGED") || event.includes("ACTIVATED") || event.includes("DEACTIVATED") || event.includes("RESENT")) {
    return "update";
  }
  return "access";
}

function diffPermissions(before: string[], after: string[]): { added: string[]; removed: string[]; unchanged: number } {
  const beforeSet = new Set(before);
  const afterSet = new Set(after);
  return {
    added: after.filter(p => !beforeSet.has(p)),
    removed: before.filter(p => !afterSet.has(p)),
    unchanged: after.filter(p => beforeSet.has(p)).length,
  };
}

export function computePermissionDiff(prev: string[], next: string[]) {
  return diffPermissions(prev, next);
}

export async function logRoleEvent(
  event: AuditEvent,
  params: {
    tenantId: string;
    actorUserId: string;
    roleId: string;
    roleName: string;
    oldPermissions?: string[];
    newPermissions?: string[];
    metadata?: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
  }
): Promise<void> {
  const action = eventToAction(event);
  const permDiff = params.oldPermissions && params.newPermissions
    ? diffPermissions(params.oldPermissions, params.newPermissions)
    : undefined;

  await auditService.logAsync({
    tenantId: params.tenantId,
    userId: params.actorUserId,
    action,
    resource: "tenant_role",
    resourceId: params.roleId,
    oldValue: params.oldPermissions ? { permissions: params.oldPermissions } : undefined,
    newValue: params.newPermissions ? { permissions: params.newPermissions } : undefined,
    metadata: {
      event,
      roleName: params.roleName,
      ...permDiff,
      ...params.metadata,
    },
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
  });
}

export async function logStaffEvent(
  event: AuditEvent,
  params: {
    tenantId: string;
    actorUserId: string;
    staffId: string;
    staffEmail?: string;
    staffName?: string;
    oldValue?: Record<string, any>;
    newValue?: Record<string, any>;
    metadata?: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
  }
): Promise<void> {
  const action = eventToAction(event);

  await auditService.logAsync({
    tenantId: params.tenantId,
    userId: params.actorUserId,
    action,
    resource: "tenant_staff",
    resourceId: params.staffId,
    oldValue: params.oldValue,
    newValue: params.newValue,
    metadata: {
      event,
      staffEmail: params.staffEmail,
      staffName: params.staffName,
      ...params.metadata,
    },
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
  });
}

export async function logImpersonationEvent(
  event: "IMPERSONATION_STARTED" | "IMPERSONATION_ENDED",
  params: {
    tenantId: string;
    actorUserId: string;
    actorStaffId: string;
    targetStaffId: string;
    targetStaffName?: string;
    ipAddress?: string;
    userAgent?: string;
  }
): Promise<void> {
  await auditService.logAsync({
    tenantId: params.tenantId,
    userId: params.actorUserId,
    action: "access",
    resource: "impersonation",
    resourceId: params.targetStaffId,
    metadata: {
      event,
      actorStaffId: params.actorStaffId,
      targetStaffId: params.targetStaffId,
      targetStaffName: params.targetStaffName,
    },
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
  });
}

export async function logHrmsAudit(
  tenantId: string,
  action: AuditAction,
  resource: string,
  resourceId: string,
  oldValue: Record<string, any> | null,
  newValue: Record<string, any> | null,
  userId?: string
): Promise<void> {
  await auditService.logAsync({
    tenantId,
    userId,
    action,
    resource,
    resourceId,
    oldValue,
    newValue,
    metadata: { module: "hrms" },
  });
}

export async function logModuleAudit(
  moduleName: string,
  tenantId: string,
  action: AuditAction,
  resource: string,
  resourceId: string,
  oldValue: Record<string, any> | null,
  newValue: Record<string, any> | null,
  userId?: string
): Promise<void> {
  await auditService.logAsync({
    tenantId,
    userId,
    action,
    resource,
    resourceId,
    oldValue,
    newValue,
    metadata: { module: moduleName },
  });
}

export { auditService };
