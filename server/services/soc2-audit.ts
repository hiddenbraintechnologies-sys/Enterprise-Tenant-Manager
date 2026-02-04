import { db } from "../db";
import { soc2AuditLogs } from "@shared/schema";
import { eq, and, desc, gte, lte } from "drizzle-orm";

export type Soc2AuditAction =
  // Authentication & Session
  | "AUTH_LOGIN_SUCCESS"
  | "AUTH_LOGIN_FAILED"
  | "AUTH_LOGOUT"
  | "AUTH_TOKEN_REFRESH"
  | "SESSION_CREATED"
  | "SESSION_REVOKED"
  | "SESSION_REVOKE_ALL"
  | "SESSION_INVALIDATED"
  | "MFA_ENROLLED"
  | "MFA_DISABLED"
  | "STEP_UP_REQUIRED"
  | "STEP_UP_VERIFIED"
  | "SUSPICIOUS_LOGIN_DETECTED"
  // Identity & Access Management
  | "USER_INVITED"
  | "USER_INVITE_RESENT"
  | "USER_INVITE_REVOKED"
  | "USER_DEACTIVATED"
  | "USER_REACTIVATED"
  | "USER_ROLE_UPDATED"
  | "USER_PERMISSIONS_UPDATED"
  | "ROLE_CREATED"
  | "ROLE_UPDATED"
  | "ROLE_DELETED"
  // Impersonation
  | "IMPERSONATION_STARTED"
  | "IMPERSONATION_ENDED"
  // Security Configuration
  | "SSO_ENABLED"
  | "SSO_DISABLED"
  | "SSO_CONFIG_UPDATED"
  | "IP_RULE_CREATED"
  | "IP_RULE_UPDATED"
  | "IP_RULE_DELETED"
  | "SECURITY_ALERTS_UPDATED"
  // Billing & Subscription
  | "PLAN_CHANGED"
  | "ADDON_ENABLED"
  | "ADDON_DISABLED"
  | "PAYMENT_METHOD_UPDATED"
  | "INVOICE_PAID"
  | "INVOICE_PAYMENT_FAILED"
  | "SUBSCRIPTION_CANCELED"
  // Data Access
  | "DATA_EXPORT_STARTED"
  | "DATA_EXPORT_COMPLETED"
  | "DATA_EXPORT_DENIED";

export type Soc2AuditTargetType =
  | "user"
  | "role"
  | "session"
  | "ip_rule"
  | "sso_config"
  | "subscription"
  | "addon"
  | "tenant"
  | "permission"
  | "data_export";

export interface Soc2AuditEntry {
  tenantId: string;
  actorUserId: string;
  actorRole?: string;
  isImpersonating?: boolean;
  realUserId?: string;
  action: Soc2AuditAction;
  outcome?: "success" | "fail";
  failureReason?: string;
  targetType?: Soc2AuditTargetType;
  targetId?: string;
  ipAddress?: string;
  userAgent?: string;
  country?: string;
  city?: string;
  beforeValue?: Record<string, unknown>;
  afterValue?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

/**
 * Log a SOC2-compliant audit event.
 */
export async function logSoc2Audit(entry: Soc2AuditEntry): Promise<void> {
  try {
    await db.insert(soc2AuditLogs).values({
      tenantId: entry.tenantId,
      actorUserId: entry.actorUserId,
      actorRole: entry.actorRole || null,
      isImpersonating: entry.isImpersonating || false,
      realUserId: entry.realUserId || null,
      action: entry.action,
      outcome: entry.outcome || "success",
      failureReason: entry.failureReason || null,
      targetType: entry.targetType || null,
      targetId: entry.targetId || null,
      ipAddress: entry.ipAddress || null,
      userAgent: entry.userAgent || null,
      country: entry.country || null,
      city: entry.city || null,
      beforeValue: sanitizeAuditData(entry.beforeValue) || null,
      afterValue: sanitizeAuditData(entry.afterValue) || null,
      metadata: entry.metadata || {},
    });
  } catch (error) {
    console.error("[SOC2 Audit] Failed to log event:", error);
  }
}

/**
 * Sanitize data for audit logging (remove sensitive fields).
 */
function sanitizeAuditData(data: Record<string, unknown> | undefined): Record<string, unknown> | null {
  if (!data) return null;

  const sensitiveFields = [
    "password",
    "passwordHash",
    "totpSecret",
    "apiKey",
    "secretKey",
    "accessToken",
    "refreshToken",
    "backupCodes",
  ];

  const sanitized = { ...data };
  
  for (const field of sensitiveFields) {
    if (field in sanitized) {
      sanitized[field] = "[REDACTED]";
    }
  }

  return sanitized;
}

/**
 * Query audit logs for a tenant with filters.
 */
export async function queryAuditLogs(params: {
  tenantId: string;
  actorUserId?: string;
  action?: string;
  targetType?: Soc2AuditTargetType;
  targetId?: string;
  outcome?: "success" | "fail";
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}) {
  const conditions = [eq(soc2AuditLogs.tenantId, params.tenantId)];

  if (params.actorUserId) {
    conditions.push(eq(soc2AuditLogs.actorUserId, params.actorUserId));
  }
  if (params.action) {
    conditions.push(eq(soc2AuditLogs.action, params.action));
  }
  if (params.targetType) {
    conditions.push(eq(soc2AuditLogs.targetType, params.targetType));
  }
  if (params.targetId) {
    conditions.push(eq(soc2AuditLogs.targetId, params.targetId));
  }
  if (params.outcome) {
    conditions.push(eq(soc2AuditLogs.outcome, params.outcome));
  }
  if (params.startDate) {
    conditions.push(gte(soc2AuditLogs.createdAt, params.startDate));
  }
  if (params.endDate) {
    conditions.push(lte(soc2AuditLogs.createdAt, params.endDate));
  }

  const query = db
    .select()
    .from(soc2AuditLogs)
    .where(and(...conditions))
    .orderBy(desc(soc2AuditLogs.createdAt))
    .limit(params.limit || 100)
    .offset(params.offset || 0);

  return query;
}

/**
 * Get audit log summary for compliance reporting.
 */
export async function getAuditSummary(tenantId: string, days: number = 30) {
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const logs = await db
    .select()
    .from(soc2AuditLogs)
    .where(
      and(
        eq(soc2AuditLogs.tenantId, tenantId),
        gte(soc2AuditLogs.createdAt, startDate)
      )
    );

  const summary = {
    totalEvents: logs.length,
    successCount: logs.filter(l => l.outcome === "success").length,
    failCount: logs.filter(l => l.outcome === "fail").length,
    byAction: {} as Record<string, number>,
    byTargetType: {} as Record<string, number>,
    suspiciousLogins: logs.filter(l => l.action === "SUSPICIOUS_LOGIN_DETECTED").length,
    sessionRevocations: logs.filter(l => l.action.startsWith("SESSION_")).length,
    roleChanges: logs.filter(l => l.action.includes("ROLE")).length,
  };

  for (const log of logs) {
    summary.byAction[log.action] = (summary.byAction[log.action] || 0) + 1;
    if (log.targetType) {
      summary.byTargetType[log.targetType] = (summary.byTargetType[log.targetType] || 0) + 1;
    }
  }

  return summary;
}
