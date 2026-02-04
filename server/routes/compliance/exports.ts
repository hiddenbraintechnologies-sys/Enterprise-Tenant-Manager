import { Router, Request, Response } from "express";
import { db } from "../../db";
import { auditLogs, userSessions, stepUpChallenges, tenantStaffLoginHistory } from "@shared/schema";
import { and, eq, gte, lte, desc } from "drizzle-orm";
import { requirePermission } from "../../rbac/requirePermission";
import { requireStepUp } from "../../middleware/requireStepUp";
import { logAudit } from "../../audit/logAudit";

const router = Router();

const MAX_EXPORT_ROWS = 50000;

/**
 * Convert array of objects to CSV string.
 */
function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  
  const headers = Object.keys(rows[0]);
  const escape = (value: unknown): string => {
    const str = value === null || value === undefined 
      ? "" 
      : typeof value === "object" 
        ? JSON.stringify(value) 
        : String(value);
    return `"${str.replace(/"/g, '""').replace(/\n/g, " ")}"`;
  };

  const lines = [
    headers.join(","),
    ...rows.map(row => headers.map(h => escape(row[h])).join(",")),
  ];
  return lines.join("\n");
}

/**
 * Parse date range from query params.
 */
function parseDateRange(from?: string, to?: string): { fromDate: Date; toDate: Date } {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  
  return {
    fromDate: from ? new Date(from) : thirtyDaysAgo,
    toDate: to ? new Date(to) : now,
  };
}

/**
 * Export audit logs (JSON format).
 * GET /api/compliance/export/audit-logs
 */
router.get(
  "/audit-logs",
  requirePermission("SETTINGS_SECURITY_VIEW"),
  requireStepUp("data_export"),
  async (req: Request, res: Response) => {
    const { tenantId, userId } = req.tokenPayload!;
    const { from, to } = req.query as { from?: string; to?: string };

    if (!tenantId) {
      return res.status(400).json({ error: "Tenant context required" });
    }

    const { fromDate, toDate } = parseDateRange(from, to);

    const rows = await db
      .select()
      .from(auditLogs)
      .where(
        and(
          eq(auditLogs.tenantId, tenantId),
          gte(auditLogs.createdAt, fromDate),
          lte(auditLogs.createdAt, toDate)
        )
      )
      .orderBy(desc(auditLogs.createdAt))
      .limit(MAX_EXPORT_ROWS);

    await logAudit({
      tenantId,
      userId,
      action: "access",
      resource: "audit_logs_export",
      metadata: { 
        event: "DATA_EXPORT_COMPLETED",
        from: fromDate.toISOString(),
        to: toDate.toISOString(),
        format: "json",
        rowCount: rows.length,
      },
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.json({ 
      rows,
      metadata: {
        from: fromDate.toISOString(),
        to: toDate.toISOString(),
        count: rows.length,
        truncated: rows.length >= MAX_EXPORT_ROWS,
      },
    });
  }
);

/**
 * Export audit logs (CSV format).
 * GET /api/compliance/export/audit-logs.csv
 */
router.get(
  "/audit-logs.csv",
  requirePermission("SETTINGS_SECURITY_VIEW"),
  requireStepUp("data_export"),
  async (req: Request, res: Response) => {
    const { tenantId, userId } = req.tokenPayload!;
    const { from, to } = req.query as { from?: string; to?: string };

    if (!tenantId) {
      return res.status(400).json({ error: "Tenant context required" });
    }

    const { fromDate, toDate } = parseDateRange(from, to);

    const rows = await db
      .select({
        id: auditLogs.id,
        userId: auditLogs.userId,
        action: auditLogs.action,
        resource: auditLogs.resource,
        resourceId: auditLogs.resourceId,
        ipAddress: auditLogs.ipAddress,
        userAgent: auditLogs.userAgent,
        createdAt: auditLogs.createdAt,
        metadata: auditLogs.metadata,
      })
      .from(auditLogs)
      .where(
        and(
          eq(auditLogs.tenantId, tenantId),
          gte(auditLogs.createdAt, fromDate),
          lte(auditLogs.createdAt, toDate)
        )
      )
      .orderBy(desc(auditLogs.createdAt))
      .limit(MAX_EXPORT_ROWS);

    const csv = toCsv(rows as Record<string, unknown>[]);

    await logAudit({
      tenantId,
      userId,
      action: "access",
      resource: "audit_logs_export",
      metadata: { 
        event: "DATA_EXPORT_COMPLETED",
        from: fromDate.toISOString(),
        to: toDate.toISOString(),
        format: "csv",
        rowCount: rows.length,
      },
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    const filename = `audit_logs_${fromDate.toISOString().split("T")[0]}_${toDate.toISOString().split("T")[0]}.csv`;
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(csv);
  }
);

/**
 * Export sessions (JSON format).
 * GET /api/compliance/export/sessions
 */
router.get(
  "/sessions",
  requirePermission("SETTINGS_SECURITY_VIEW"),
  requireStepUp("data_export"),
  async (req: Request, res: Response) => {
    const { tenantId, userId } = req.tokenPayload!;
    const { from, to } = req.query as { from?: string; to?: string };

    if (!tenantId) {
      return res.status(400).json({ error: "Tenant context required" });
    }

    const { fromDate, toDate } = parseDateRange(from, to);

    const rows = await db
      .select()
      .from(userSessions)
      .where(
        and(
          eq(userSessions.tenantId, tenantId),
          gte(userSessions.createdAt, fromDate),
          lte(userSessions.createdAt, toDate)
        )
      )
      .orderBy(desc(userSessions.createdAt))
      .limit(MAX_EXPORT_ROWS);

    await logAudit({
      tenantId,
      userId,
      action: "access",
      resource: "sessions_export",
      metadata: { 
        event: "DATA_EXPORT_COMPLETED",
        from: fromDate.toISOString(),
        to: toDate.toISOString(),
        format: "json",
        rowCount: rows.length,
      },
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.json({ 
      rows,
      metadata: {
        from: fromDate.toISOString(),
        to: toDate.toISOString(),
        count: rows.length,
        truncated: rows.length >= MAX_EXPORT_ROWS,
      },
    });
  }
);

/**
 * Export sessions (CSV format).
 * GET /api/compliance/export/sessions.csv
 */
router.get(
  "/sessions.csv",
  requirePermission("SETTINGS_SECURITY_VIEW"),
  requireStepUp("data_export"),
  async (req: Request, res: Response) => {
    const { tenantId, userId } = req.tokenPayload!;
    const { from, to } = req.query as { from?: string; to?: string };

    if (!tenantId) {
      return res.status(400).json({ error: "Tenant context required" });
    }

    const { fromDate, toDate } = parseDateRange(from, to);

    const rows = await db
      .select({
        id: userSessions.id,
        userId: userSessions.userId,
        staffId: userSessions.staffId,
        ipAddress: userSessions.ipAddress,
        country: userSessions.country,
        city: userSessions.city,
        deviceFingerprint: userSessions.deviceFingerprint,
        createdAt: userSessions.createdAt,
        lastSeenAt: userSessions.lastSeenAt,
        revokedAt: userSessions.revokedAt,
        revokeReason: userSessions.revokeReason,
      })
      .from(userSessions)
      .where(
        and(
          eq(userSessions.tenantId, tenantId),
          gte(userSessions.createdAt, fromDate),
          lte(userSessions.createdAt, toDate)
        )
      )
      .orderBy(desc(userSessions.createdAt))
      .limit(MAX_EXPORT_ROWS);

    const csv = toCsv(rows as Record<string, unknown>[]);

    await logAudit({
      tenantId,
      userId,
      action: "access",
      resource: "sessions_export",
      metadata: { 
        event: "DATA_EXPORT_COMPLETED",
        format: "csv",
        rowCount: rows.length,
      },
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    const filename = `sessions_${fromDate.toISOString().split("T")[0]}_${toDate.toISOString().split("T")[0]}.csv`;
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(csv);
  }
);

/**
 * Export login history (JSON format).
 * GET /api/compliance/export/login-history
 */
router.get(
  "/login-history",
  requirePermission("SETTINGS_SECURITY_VIEW"),
  requireStepUp("data_export"),
  async (req: Request, res: Response) => {
    const { tenantId, userId } = req.tokenPayload!;
    const { from, to } = req.query as { from?: string; to?: string };

    if (!tenantId) {
      return res.status(400).json({ error: "Tenant context required" });
    }

    const { fromDate, toDate } = parseDateRange(from, to);

    const rows = await db
      .select()
      .from(tenantStaffLoginHistory)
      .where(
        and(
          eq(tenantStaffLoginHistory.tenantId, tenantId),
          gte(tenantStaffLoginHistory.loginAt, fromDate),
          lte(tenantStaffLoginHistory.loginAt, toDate)
        )
      )
      .orderBy(desc(tenantStaffLoginHistory.loginAt))
      .limit(MAX_EXPORT_ROWS);

    await logAudit({
      tenantId,
      userId,
      action: "access",
      resource: "login_history_export",
      metadata: { 
        event: "DATA_EXPORT_COMPLETED",
        format: "json",
        rowCount: rows.length,
      },
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.json({ 
      rows,
      metadata: {
        from: fromDate.toISOString(),
        to: toDate.toISOString(),
        count: rows.length,
        truncated: rows.length >= MAX_EXPORT_ROWS,
      },
    });
  }
);

/**
 * Export security events (step-up challenges, force logouts, etc).
 * GET /api/compliance/export/security-events
 */
router.get(
  "/security-events",
  requirePermission("SETTINGS_SECURITY_VIEW"),
  requireStepUp("data_export"),
  async (req: Request, res: Response) => {
    const { tenantId, userId } = req.tokenPayload!;
    const { from, to } = req.query as { from?: string; to?: string };

    if (!tenantId) {
      return res.status(400).json({ error: "Tenant context required" });
    }

    const { fromDate, toDate } = parseDateRange(from, to);

    const [stepUpEvents, securityAuditLogs] = await Promise.all([
      db
        .select()
        .from(stepUpChallenges)
        .where(
          and(
            eq(stepUpChallenges.tenantId, tenantId),
            gte(stepUpChallenges.createdAt, fromDate),
            lte(stepUpChallenges.createdAt, toDate)
          )
        )
        .orderBy(desc(stepUpChallenges.createdAt))
        .limit(MAX_EXPORT_ROWS),

      db
        .select()
        .from(auditLogs)
        .where(
          and(
            eq(auditLogs.tenantId, tenantId),
            gte(auditLogs.createdAt, fromDate),
            lte(auditLogs.createdAt, toDate)
          )
        )
        .orderBy(desc(auditLogs.createdAt))
        .limit(MAX_EXPORT_ROWS),
    ]);

    const securityEvents = securityAuditLogs.filter(log => {
      const metadata = log.metadata as Record<string, unknown> | null;
      const event = metadata?.event as string | undefined;
      return event && [
        "FORCE_LOGOUT",
        "SESSION_REVOKED",
        "IP_RULE_CREATED",
        "IP_RULE_UPDATED",
        "IP_RULE_DELETED",
        "IMPERSONATION_STARTED",
        "IMPERSONATION_ENDED",
        "SUSPICIOUS_LOGIN_DETECTED",
        "REFRESH_TOKEN_REUSE_DETECTED",
      ].includes(event);
    });

    await logAudit({
      tenantId,
      userId,
      action: "access",
      resource: "security_events_export",
      metadata: { 
        event: "DATA_EXPORT_COMPLETED",
        format: "json",
        stepUpCount: stepUpEvents.length,
        securityEventCount: securityEvents.length,
      },
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.json({
      stepUpChallenges: stepUpEvents,
      securityEvents,
      metadata: {
        from: fromDate.toISOString(),
        to: toDate.toISOString(),
        stepUpCount: stepUpEvents.length,
        securityEventCount: securityEvents.length,
      },
    });
  }
);

export default router;
