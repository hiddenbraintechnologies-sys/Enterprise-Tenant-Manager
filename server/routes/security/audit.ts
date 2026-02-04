import { Router } from "express";
import type { Request, Response } from "express";
import { queryAuditLogs, getAuditSummary, type Soc2AuditTargetType } from "../../services/soc2-audit";
import { requirePermission } from "../../rbac/requirePermission";

const router = Router();

interface AuthUser {
  id: string;
  tenantId: string;
  role?: string;
  permissions?: string[];
}

/**
 * GET /api/security/audit-logs
 * Query audit logs with filters.
 */
router.get(
  "/audit-logs",
  requirePermission("SETTINGS_SECURITY_VIEW"),
  async (req: Request, res: Response) => {
    const user = req.user as AuthUser | undefined;
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      const {
        actorUserId,
        action,
        targetType,
        targetId,
        outcome,
        startDate,
        endDate,
        limit,
        offset,
      } = req.query;

      const logs = await queryAuditLogs({
        tenantId: user.tenantId,
        actorUserId: actorUserId as string | undefined,
        action: action as string | undefined,
        targetType: targetType as Soc2AuditTargetType | undefined,
        targetId: targetId as string | undefined,
        outcome: outcome as "success" | "fail" | undefined,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        limit: limit ? parseInt(limit as string, 10) : 100,
        offset: offset ? parseInt(offset as string, 10) : 0,
      });

      res.json(logs);
    } catch (error) {
      console.error("Error querying audit logs:", error);
      res.status(500).json({ error: "Failed to query audit logs" });
    }
  }
);

/**
 * GET /api/security/audit-summary
 * Get audit log summary for compliance reporting.
 */
router.get(
  "/audit-summary",
  requirePermission("SETTINGS_SECURITY_VIEW"),
  async (req: Request, res: Response) => {
    const user = req.user as AuthUser | undefined;
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      const days = parseInt(req.query.days as string, 10) || 30;
      const summary = await getAuditSummary(user.tenantId, days);

      res.json(summary);
    } catch (error) {
      console.error("Error getting audit summary:", error);
      res.status(500).json({ error: "Failed to get audit summary" });
    }
  }
);

export default router;
