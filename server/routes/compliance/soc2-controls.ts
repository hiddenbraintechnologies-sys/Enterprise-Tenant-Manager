import { Router, Request, Response } from "express";
import archiver from "archiver";
import { db } from "../../db";
import { auditLogs, userSessions, stepUpChallenges, refreshTokens, tenantStaff, tenantIpRules } from "@shared/schema";
import { and, eq, gte, lte, desc, inArray, sql } from "drizzle-orm";
import { requirePermission } from "../../rbac/requirePermission";
import { requireStepUp } from "../../middleware/requireStepUp";
import { logAudit } from "../../audit/logAudit";

const router = Router();

const MAX_EXPORT_ROWS = 50000;

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

function parseDateRange(from?: string, to?: string): { fromDate: Date; toDate: Date } {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  
  return {
    fromDate: from ? new Date(from) : thirtyDaysAgo,
    toDate: to ? new Date(to) : now,
  };
}

function formatResponse(
  res: Response, 
  control: string,
  evidence: unknown[],
  format: string,
  filename: string
) {
  if (format === "csv") {
    const csv = toCsv(evidence as Record<string, unknown>[]);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return res.send(csv);
  }
  
  return res.json({ 
    control,
    evidence,
    metadata: {
      count: evidence.length,
      truncated: evidence.length >= MAX_EXPORT_ROWS,
      exportedAt: new Date().toISOString(),
    }
  });
}

const CC6_ACCESS_EVENTS = [
  "LOGIN",
  "LOGOUT",
  "LOGIN_FAILED",
  "TOKEN_ROTATED",
  "SESSION_CREATED",
  "IMPERSONATION_STARTED",
  "IMPERSONATION_ENDED",
  "ROLE_CHANGED",
  "PERMISSION_CHANGED",
];

const CC7_OPERATIONS_EVENTS = [
  "IP_RULE_CREATED",
  "IP_RULE_UPDATED",
  "IP_RULE_DELETED",
  "SESSION_REVOKED",
  "STEP_UP_REQUIRED",
  "STEP_UP_VERIFIED",
  "STEP_UP_FAILED",
  "SETTINGS_UPDATED",
];

const CC8_INCIDENT_EVENTS = [
  "SUSPICIOUS_LOGIN_DETECTED",
  "REFRESH_TOKEN_REUSE_DETECTED",
  "SESSION_BLOCKED",
  "FORCE_LOGOUT",
  "SESSION_EXPIRED",
];

const CC9_RISK_EVENTS = [
  "ANOMALY_SCORE_HIGH",
  "ANOMALY_SCORE_MEDIUM",
  "STEP_UP_REQUIRED",
  "RISK_ASSESSMENT",
];

/**
 * CC6 - Logical & Physical Access Controls
 * GET /api/compliance/cc6/access-logs
 * 
 * Evidence: User access changes, role/permission changes, authentication events, impersonation
 */
router.get(
  "/cc6/access-logs",
  requirePermission("SETTINGS_SECURITY_VIEW"),
  requireStepUp("data_export"),
  async (req: Request, res: Response) => {
    const { tenantId, userId } = req.tokenPayload!;
    const { from, to, format = "json" } = req.query as { from?: string; to?: string; format?: string };

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

    const accessEvents = rows.filter(log => {
      const metadata = log.metadata as Record<string, unknown> | null;
      const event = metadata?.event as string | undefined;
      return event && CC6_ACCESS_EVENTS.includes(event);
    });

    await logAudit({
      tenantId,
      userId,
      action: "access",
      resource: "cc6_access_logs",
      metadata: { 
        event: "DATA_EXPORT_COMPLETED",
        control: "CC6",
        format,
        rowCount: accessEvents.length,
      },
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    const filename = `cc6_access_logs_${fromDate.toISOString().split("T")[0]}.${format}`;
    return formatResponse(res, "CC6", accessEvents, format, filename);
  }
);

/**
 * CC6 - Role Changes
 * GET /api/compliance/cc6/role-changes
 */
router.get(
  "/cc6/role-changes",
  requirePermission("SETTINGS_SECURITY_VIEW"),
  requireStepUp("data_export"),
  async (req: Request, res: Response) => {
    const { tenantId, userId } = req.tokenPayload!;
    const { from, to, format = "json" } = req.query as { from?: string; to?: string; format?: string };

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
          eq(auditLogs.resource, "role"),
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
      resource: "cc6_role_changes",
      metadata: { 
        event: "DATA_EXPORT_COMPLETED",
        control: "CC6",
        format,
        rowCount: rows.length,
      },
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    const filename = `cc6_role_changes_${fromDate.toISOString().split("T")[0]}.${format}`;
    return formatResponse(res, "CC6", rows, format, filename);
  }
);

/**
 * CC6 - Impersonation Events
 * GET /api/compliance/cc6/impersonation-events
 */
router.get(
  "/cc6/impersonation-events",
  requirePermission("SETTINGS_SECURITY_VIEW"),
  requireStepUp("data_export"),
  async (req: Request, res: Response) => {
    const { tenantId, userId } = req.tokenPayload!;
    const { from, to, format = "json" } = req.query as { from?: string; to?: string; format?: string };

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

    const impersonationEvents = rows.filter(log => {
      const metadata = log.metadata as Record<string, unknown> | null;
      const event = metadata?.event as string | undefined;
      return event && ["IMPERSONATION_STARTED", "IMPERSONATION_ENDED"].includes(event);
    });

    await logAudit({
      tenantId,
      userId,
      action: "access",
      resource: "cc6_impersonation_events",
      metadata: { 
        event: "DATA_EXPORT_COMPLETED",
        control: "CC6",
        format,
        rowCount: impersonationEvents.length,
      },
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    const filename = `cc6_impersonation_${fromDate.toISOString().split("T")[0]}.${format}`;
    return formatResponse(res, "CC6", impersonationEvents, format, filename);
  }
);

/**
 * CC7 - System Operations & Change Management
 * GET /api/compliance/cc7/security-events
 */
router.get(
  "/cc7/security-events",
  requirePermission("SETTINGS_SECURITY_VIEW"),
  requireStepUp("data_export"),
  async (req: Request, res: Response) => {
    const { tenantId, userId } = req.tokenPayload!;
    const { from, to, format = "json" } = req.query as { from?: string; to?: string; format?: string };

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

    const operationsEvents = rows.filter(log => {
      const metadata = log.metadata as Record<string, unknown> | null;
      const event = metadata?.event as string | undefined;
      return event && CC7_OPERATIONS_EVENTS.includes(event);
    });

    await logAudit({
      tenantId,
      userId,
      action: "access",
      resource: "cc7_security_events",
      metadata: { 
        event: "DATA_EXPORT_COMPLETED",
        control: "CC7",
        format,
        rowCount: operationsEvents.length,
      },
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    const filename = `cc7_security_events_${fromDate.toISOString().split("T")[0]}.${format}`;
    return formatResponse(res, "CC7", operationsEvents, format, filename);
  }
);

/**
 * CC7 - IP Rule Changes
 * GET /api/compliance/cc7/ip-rule-changes
 */
router.get(
  "/cc7/ip-rule-changes",
  requirePermission("SETTINGS_SECURITY_VIEW"),
  requireStepUp("data_export"),
  async (req: Request, res: Response) => {
    const { tenantId, userId } = req.tokenPayload!;
    const { from, to, format = "json" } = req.query as { from?: string; to?: string; format?: string };

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
          eq(auditLogs.resource, "ip_rule"),
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
      resource: "cc7_ip_rule_changes",
      metadata: { 
        event: "DATA_EXPORT_COMPLETED",
        control: "CC7",
        format,
        rowCount: rows.length,
      },
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    const filename = `cc7_ip_rules_${fromDate.toISOString().split("T")[0]}.${format}`;
    return formatResponse(res, "CC7", rows, format, filename);
  }
);

/**
 * CC7 - Session Invalidations
 * GET /api/compliance/cc7/session-invalidations
 */
router.get(
  "/cc7/session-invalidations",
  requirePermission("SETTINGS_SECURITY_VIEW"),
  requireStepUp("data_export"),
  async (req: Request, res: Response) => {
    const { tenantId, userId } = req.tokenPayload!;
    const { from, to, format = "json" } = req.query as { from?: string; to?: string; format?: string };

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

    const invalidations = rows.filter(log => {
      const metadata = log.metadata as Record<string, unknown> | null;
      const event = metadata?.event as string | undefined;
      return event && ["SESSION_REVOKED", "SESSION_EXPIRED", "FORCE_LOGOUT"].includes(event);
    });

    await logAudit({
      tenantId,
      userId,
      action: "access",
      resource: "cc7_session_invalidations",
      metadata: { 
        event: "DATA_EXPORT_COMPLETED",
        control: "CC7",
        format,
        rowCount: invalidations.length,
      },
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    const filename = `cc7_invalidations_${fromDate.toISOString().split("T")[0]}.${format}`;
    return formatResponse(res, "CC7", invalidations, format, filename);
  }
);

/**
 * CC8 - Risk Mitigation & Incident Response
 * GET /api/compliance/cc8/security-incidents
 */
router.get(
  "/cc8/security-incidents",
  requirePermission("SETTINGS_SECURITY_VIEW"),
  requireStepUp("data_export"),
  async (req: Request, res: Response) => {
    const { tenantId, userId } = req.tokenPayload!;
    const { from, to, format = "json" } = req.query as { from?: string; to?: string; format?: string };

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

    const incidents = rows.filter(log => {
      const metadata = log.metadata as Record<string, unknown> | null;
      const event = metadata?.event as string | undefined;
      return event && CC8_INCIDENT_EVENTS.includes(event);
    });

    const reuseTokens = await db
      .select({
        id: refreshTokens.id,
        userId: refreshTokens.userId,
        familyId: refreshTokens.familyId,
        revokeReason: refreshTokens.revokeReason,
        suspiciousReuseAt: refreshTokens.suspiciousReuseAt,
        ipAddress: refreshTokens.ipAddress,
        deviceFingerprint: refreshTokens.deviceFingerprint,
      })
      .from(refreshTokens)
      .where(
        and(
          eq(refreshTokens.tenantId, tenantId),
          eq(refreshTokens.revokeReason, "reuse_detected"),
          gte(refreshTokens.suspiciousReuseAt, fromDate),
          lte(refreshTokens.suspiciousReuseAt, toDate)
        )
      )
      .orderBy(desc(refreshTokens.suspiciousReuseAt))
      .limit(MAX_EXPORT_ROWS);

    await logAudit({
      tenantId,
      userId,
      action: "access",
      resource: "cc8_security_incidents",
      metadata: { 
        event: "DATA_EXPORT_COMPLETED",
        control: "CC8",
        format,
        incidentCount: incidents.length,
        reuseCount: reuseTokens.length,
      },
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    if (format === "csv") {
      const combined = [
        ...incidents.map(i => ({ ...i, type: "audit_incident" })),
        ...reuseTokens.map(r => ({ ...r, type: "token_reuse" })),
      ];
      const filename = `cc8_incidents_${fromDate.toISOString().split("T")[0]}.csv`;
      return formatResponse(res, "CC8", combined, "csv", filename);
    }

    return res.json({
      control: "CC8",
      auditIncidents: incidents,
      tokenReuseIncidents: reuseTokens,
      metadata: {
        incidentCount: incidents.length,
        reuseCount: reuseTokens.length,
        exportedAt: new Date().toISOString(),
      }
    });
  }
);

/**
 * CC9 - Risk Assessment & Monitoring
 * GET /api/compliance/cc9/anomaly-decisions
 */
router.get(
  "/cc9/anomaly-decisions",
  requirePermission("SETTINGS_SECURITY_VIEW"),
  requireStepUp("data_export"),
  async (req: Request, res: Response) => {
    const { tenantId, userId } = req.tokenPayload!;
    const { from, to, format = "json" } = req.query as { from?: string; to?: string; format?: string };

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

    const anomalyDecisions = rows.filter(log => {
      const metadata = log.metadata as Record<string, unknown> | null;
      return metadata?.score !== undefined || 
             metadata?.reasons !== undefined ||
             CC9_RISK_EVENTS.includes(metadata?.event as string);
    });

    const [stepUpEvents] = await Promise.all([
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
    ]);

    await logAudit({
      tenantId,
      userId,
      action: "access",
      resource: "cc9_anomaly_decisions",
      metadata: { 
        event: "DATA_EXPORT_COMPLETED",
        control: "CC9",
        format,
        anomalyCount: anomalyDecisions.length,
        stepUpCount: stepUpEvents.length,
      },
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    if (format === "csv") {
      const combined = [
        ...anomalyDecisions.map(a => ({ ...a, type: "anomaly_decision" })),
        ...stepUpEvents.map(s => ({ ...s, type: "step_up_challenge" })),
      ];
      const filename = `cc9_anomaly_${fromDate.toISOString().split("T")[0]}.csv`;
      return formatResponse(res, "CC9", combined, "csv", filename);
    }

    return res.json({
      control: "CC9",
      anomalyDecisions,
      stepUpChallenges: stepUpEvents,
      metadata: {
        anomalyCount: anomalyDecisions.length,
        stepUpCount: stepUpEvents.length,
        exportedAt: new Date().toISOString(),
      }
    });
  }
);

/**
 * Summary endpoint - all controls overview
 * GET /api/compliance/soc2/summary
 */
router.get(
  "/soc2/summary",
  requirePermission("SETTINGS_SECURITY_VIEW"),
  requireStepUp("data_export"),
  async (req: Request, res: Response) => {
    const { tenantId, userId } = req.tokenPayload!;
    const { from, to } = req.query as { from?: string; to?: string };

    if (!tenantId) {
      return res.status(400).json({ error: "Tenant context required" });
    }

    const { fromDate, toDate } = parseDateRange(from, to);

    const allLogs = await db
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

    const categorize = (events: string[]) => allLogs.filter(log => {
      const metadata = log.metadata as Record<string, unknown> | null;
      const event = metadata?.event as string | undefined;
      return event && events.includes(event);
    }).length;

    const summary = {
      period: { from: fromDate.toISOString(), to: toDate.toISOString() },
      controls: {
        CC6: {
          name: "Logical & Physical Access Controls",
          eventCount: categorize(CC6_ACCESS_EVENTS),
          endpoints: [
            "/api/compliance/cc6/access-logs",
            "/api/compliance/cc6/role-changes",
            "/api/compliance/cc6/impersonation-events",
          ],
        },
        CC7: {
          name: "System Operations & Change Management",
          eventCount: categorize(CC7_OPERATIONS_EVENTS),
          endpoints: [
            "/api/compliance/cc7/security-events",
            "/api/compliance/cc7/ip-rule-changes",
            "/api/compliance/cc7/session-invalidations",
          ],
        },
        CC8: {
          name: "Risk Mitigation & Incident Response",
          eventCount: categorize(CC8_INCIDENT_EVENTS),
          endpoints: [
            "/api/compliance/cc8/security-incidents",
          ],
        },
        CC9: {
          name: "Risk Assessment & Monitoring",
          eventCount: categorize(CC9_RISK_EVENTS),
          endpoints: [
            "/api/compliance/cc9/anomaly-decisions",
          ],
        },
      },
      totalEvents: allLogs.length,
      exportedAt: new Date().toISOString(),
    };

    await logAudit({
      tenantId,
      userId,
      action: "access",
      resource: "soc2_summary",
      metadata: { 
        event: "DATA_EXPORT_COMPLETED",
        control: "ALL",
        totalEvents: allLogs.length,
      },
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    return res.json(summary);
  }
);

/**
 * One-Click SOC2 Evidence Bundle (ZIP)
 * POST /api/compliance/export/bundle
 * 
 * Generates a ZIP file containing all SOC2 evidence grouped by control category.
 * This is auditor-ready evidence for Type II audits.
 */
router.post(
  "/export/bundle",
  requirePermission("SETTINGS_SECURITY_VIEW"),
  requireStepUp("data_export"),
  async (req: Request, res: Response) => {
    const { tenantId, userId } = req.tokenPayload!;
    const { from, to } = req.body as { from?: string; to?: string };

    if (!tenantId) {
      return res.status(400).json({ error: "Tenant context required" });
    }

    const { fromDate, toDate } = parseDateRange(from, to);
    const periodLabel = `${fromDate.toISOString().split("T")[0]}_to_${toDate.toISOString().split("T")[0]}`;

    await logAudit({
      tenantId,
      userId,
      action: "access",
      resource: "soc2_bundle",
      metadata: { 
        event: "DATA_EXPORT_STARTED",
        from: fromDate.toISOString(),
        to: toDate.toISOString(),
      },
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    const allLogs = await db
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

    const filterByEvents = (events: string[]) => allLogs.filter(log => {
      const metadata = log.metadata as Record<string, unknown> | null;
      const event = metadata?.event as string | undefined;
      return event && events.includes(event);
    });

    const cc6AccessLogs = filterByEvents(CC6_ACCESS_EVENTS);
    const cc6RoleChanges = allLogs.filter(log => log.resource === "role");
    const cc6Impersonation = filterByEvents(["IMPERSONATION_STARTED", "IMPERSONATION_ENDED"]);

    const cc7SecurityEvents = filterByEvents(CC7_OPERATIONS_EVENTS);
    const cc7IpRules = allLogs.filter(log => log.resource === "ip_rule");
    const cc7Invalidations = filterByEvents(["SESSION_REVOKED", "SESSION_EXPIRED", "FORCE_LOGOUT"]);

    const cc8Incidents = filterByEvents(CC8_INCIDENT_EVENTS);
    const cc8ReuseTokens = await db
      .select({
        id: refreshTokens.id,
        userId: refreshTokens.userId,
        familyId: refreshTokens.familyId,
        revokeReason: refreshTokens.revokeReason,
        suspiciousReuseAt: refreshTokens.suspiciousReuseAt,
        ipAddress: refreshTokens.ipAddress,
        deviceFingerprint: refreshTokens.deviceFingerprint,
      })
      .from(refreshTokens)
      .where(
        and(
          eq(refreshTokens.tenantId, tenantId),
          eq(refreshTokens.revokeReason, "reuse_detected"),
          gte(refreshTokens.suspiciousReuseAt, fromDate),
          lte(refreshTokens.suspiciousReuseAt, toDate)
        )
      )
      .orderBy(desc(refreshTokens.suspiciousReuseAt))
      .limit(MAX_EXPORT_ROWS);

    const cc9Anomaly = allLogs.filter(log => {
      const metadata = log.metadata as Record<string, unknown> | null;
      return metadata?.score !== undefined || metadata?.reasons !== undefined;
    });

    const stepUpEvents = await db
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
      .limit(MAX_EXPORT_ROWS);

    const readme = `SOC2 Type II Evidence Bundle
============================

Period: ${fromDate.toISOString()} to ${toDate.toISOString()}
Generated: ${new Date().toISOString()}
Tenant: ${tenantId}

This archive contains SOC2 Type II evidence grouped by Trust Services Criteria.
All data was generated automatically from immutable audit logs.
Exports were performed by an authorized administrator with step-up authentication.

Contents:
---------
CC6_Access_Control/
  - access_logs.csv: Authentication events, logins, logouts
  - role_changes.csv: Role and permission modifications
  - impersonation_events.csv: Admin impersonation sessions

CC7_Security_Operations/
  - security_events.csv: Configuration and security changes
  - ip_rule_changes.csv: IP allow/deny rule modifications
  - session_invalidations.csv: Forced logouts and session revocations

CC8_Incident_Response/
  - security_incidents.csv: Suspicious login detections
  - token_reuse_incidents.csv: Refresh token reuse detections

CC9_Monitoring/
  - anomaly_decisions.csv: Risk scoring and adaptive auth decisions
  - step_up_challenges.csv: OTP verification challenges

Evidence Integrity:
-------------------
- All records are append-only and immutable
- Export actions are logged in the audit trail
- Data can be verified against the source database

For questions, contact your security administrator.
`;

    const archive = archiver("zip", { zlib: { level: 9 } });
    
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="SOC2_Evidence_${periodLabel}.zip"`);
    
    archive.pipe(res);

    archive.append(readme, { name: "README.txt" });

    archive.append(toCsv(cc6AccessLogs as Record<string, unknown>[]), { name: "CC6_Access_Control/access_logs.csv" });
    archive.append(toCsv(cc6RoleChanges as Record<string, unknown>[]), { name: "CC6_Access_Control/role_changes.csv" });
    archive.append(toCsv(cc6Impersonation as Record<string, unknown>[]), { name: "CC6_Access_Control/impersonation_events.csv" });

    archive.append(toCsv(cc7SecurityEvents as Record<string, unknown>[]), { name: "CC7_Security_Operations/security_events.csv" });
    archive.append(toCsv(cc7IpRules as Record<string, unknown>[]), { name: "CC7_Security_Operations/ip_rule_changes.csv" });
    archive.append(toCsv(cc7Invalidations as Record<string, unknown>[]), { name: "CC7_Security_Operations/session_invalidations.csv" });

    archive.append(toCsv(cc8Incidents as Record<string, unknown>[]), { name: "CC8_Incident_Response/security_incidents.csv" });
    archive.append(toCsv(cc8ReuseTokens as Record<string, unknown>[]), { name: "CC8_Incident_Response/token_reuse_incidents.csv" });

    archive.append(toCsv(cc9Anomaly as Record<string, unknown>[]), { name: "CC9_Monitoring/anomaly_decisions.csv" });
    archive.append(toCsv(stepUpEvents as Record<string, unknown>[]), { name: "CC9_Monitoring/step_up_challenges.csv" });

    await logAudit({
      tenantId,
      userId,
      action: "access",
      resource: "soc2_bundle",
      metadata: { 
        event: "DATA_EXPORT_COMPLETED",
        from: fromDate.toISOString(),
        to: toDate.toISOString(),
        files: 10,
        totalRecords: allLogs.length + cc8ReuseTokens.length + stepUpEvents.length,
      },
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    await archive.finalize();
  }
);

export default router;
