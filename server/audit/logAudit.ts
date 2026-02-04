import { db } from "../db";
import { auditLogs } from "@shared/schema";

export type AuditAction = "create" | "update" | "delete" | "login" | "logout" | "access";

export type AuditResource =
  | "user"
  | "user_role"
  | "tenant"
  | "plan"
  | "addon"
  | "session"
  | "ip_rule"
  | "security_setting"
  | "permission"
  | "team_invite";

export interface AuditLogEntry {
  tenantId: string;
  userId: string;
  action: AuditAction;
  resource: string;
  resourceId?: string;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  correlationId?: string;
}

/**
 * Logs an audit event for security and compliance tracking.
 * 
 * All role, permission, plan, and security changes should be logged.
 */
export async function logAudit(entry: AuditLogEntry): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      tenantId: entry.tenantId,
      userId: entry.userId,
      action: entry.action,
      resource: entry.resource,
      resourceId: entry.resourceId || null,
      oldValue: entry.oldValue || null,
      newValue: entry.newValue || null,
      metadata: entry.metadata || {},
      ipAddress: entry.ipAddress || null,
      userAgent: entry.userAgent || null,
      correlationId: entry.correlationId || null,
    });
  } catch (error) {
    console.error("[Audit] Failed to log audit event:", error);
  }
}

/**
 * Helper to extract IP and user agent from Express request.
 */
export function getRequestContext(req: { ip?: string; headers?: Record<string, string | string[] | undefined> }): {
  ipAddress: string;
  userAgent: string;
} {
  const ip = req.ip || (req.headers?.["x-forwarded-for"] as string)?.split(",")[0] || "unknown";
  const userAgent = (req.headers?.["user-agent"] as string) || "unknown";
  return { ipAddress: ip, userAgent };
}

/**
 * Convenience functions for common audit events
 */
export const auditHelpers = {
  roleChange: async (opts: {
    tenantId: string;
    actorUserId: string;
    targetUserId: string;
    oldRole: string;
    newRole: string;
    ipAddress?: string;
    userAgent?: string;
  }) => {
    await logAudit({
      tenantId: opts.tenantId,
      userId: opts.actorUserId,
      action: "update",
      resource: "user_role",
      resourceId: opts.targetUserId,
      oldValue: { role: opts.oldRole },
      newValue: { role: opts.newRole },
      ipAddress: opts.ipAddress,
      userAgent: opts.userAgent,
    });
  },

  planChange: async (opts: {
    tenantId: string;
    actorUserId: string;
    oldPlan: string;
    newPlan: string;
    addons?: string[];
    ipAddress?: string;
    userAgent?: string;
  }) => {
    await logAudit({
      tenantId: opts.tenantId,
      userId: opts.actorUserId,
      action: "update",
      resource: "plan",
      resourceId: opts.tenantId,
      oldValue: { plan: opts.oldPlan },
      newValue: { plan: opts.newPlan, addons: opts.addons },
      ipAddress: opts.ipAddress,
      userAgent: opts.userAgent,
    });
  },

  addonInstall: async (opts: {
    tenantId: string;
    actorUserId: string;
    addonCode: string;
    ipAddress?: string;
    userAgent?: string;
  }) => {
    await logAudit({
      tenantId: opts.tenantId,
      userId: opts.actorUserId,
      action: "create",
      resource: "addon",
      resourceId: opts.addonCode,
      newValue: { addon: opts.addonCode, status: "installed" },
      ipAddress: opts.ipAddress,
      userAgent: opts.userAgent,
    });
  },

  addonUninstall: async (opts: {
    tenantId: string;
    actorUserId: string;
    addonCode: string;
    ipAddress?: string;
    userAgent?: string;
  }) => {
    await logAudit({
      tenantId: opts.tenantId,
      userId: opts.actorUserId,
      action: "delete",
      resource: "addon",
      resourceId: opts.addonCode,
      oldValue: { addon: opts.addonCode, status: "installed" },
      ipAddress: opts.ipAddress,
      userAgent: opts.userAgent,
    });
  },

  securitySettingChange: async (opts: {
    tenantId: string;
    actorUserId: string;
    setting: string;
    oldValue: unknown;
    newValue: unknown;
    ipAddress?: string;
    userAgent?: string;
  }) => {
    await logAudit({
      tenantId: opts.tenantId,
      userId: opts.actorUserId,
      action: "update",
      resource: "security_setting",
      resourceId: opts.setting,
      oldValue: { value: opts.oldValue },
      newValue: { value: opts.newValue },
      ipAddress: opts.ipAddress,
      userAgent: opts.userAgent,
    });
  },

  forceLogout: async (opts: {
    tenantId: string;
    actorUserId: string;
    targetUserId: string;
    ipAddress?: string;
    userAgent?: string;
  }) => {
    await logAudit({
      tenantId: opts.tenantId,
      userId: opts.actorUserId,
      action: "delete",
      resource: "session",
      resourceId: opts.targetUserId,
      metadata: { reason: "force_logout", targetUserId: opts.targetUserId },
      ipAddress: opts.ipAddress,
      userAgent: opts.userAgent,
    });
  },

  loginSuccess: async (opts: {
    tenantId: string;
    userId: string;
    ipAddress?: string;
    userAgent?: string;
    method?: string;
  }) => {
    await logAudit({
      tenantId: opts.tenantId,
      userId: opts.userId,
      action: "login",
      resource: "session",
      resourceId: opts.userId,
      metadata: { method: opts.method || "password" },
      ipAddress: opts.ipAddress,
      userAgent: opts.userAgent,
    });
  },

  loginFailed: async (opts: {
    tenantId: string;
    userId: string;
    ipAddress?: string;
    userAgent?: string;
    reason?: string;
  }) => {
    await logAudit({
      tenantId: opts.tenantId,
      userId: opts.userId,
      action: "access",
      resource: "session",
      resourceId: opts.userId,
      metadata: { event: "login_failed", reason: opts.reason },
      ipAddress: opts.ipAddress,
      userAgent: opts.userAgent,
    });
  },
};
