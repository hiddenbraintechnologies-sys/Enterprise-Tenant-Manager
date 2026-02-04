import { Router } from "express";
import type { Request, Response } from "express";
import { 
  getUserSessions, 
  getTenantSessions, 
  revokeSession, 
  revokeAllUserSessions,
  parseUserAgent,
  getSessionById
} from "../../services/user-sessions";
import { requirePermission } from "../../rbac/requirePermission";
import { requireStepUp } from "../../middleware/requireStepUp";
import { logSoc2Audit } from "../../services/soc2-audit";
import { getRequestContext } from "../../audit/logAudit";

const router = Router();

interface AuthUser {
  id: string;
  tenantId: string;
  staffId?: string;
  role?: string;
  permissions?: string[];
}

/**
 * GET /api/security/sessions
 * List active sessions. Admin can view any user, regular users can view their own.
 */
router.get("/sessions", async (req: Request, res: Response) => {
  const user = req.user as AuthUser | undefined;
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const targetUserId = (req.query.userId as string) || user.id;
  const isOwnSessions = targetUserId === user.id;
  
  const hasAdminPermission = user.permissions?.includes("SETTINGS_SECURITY_VIEW");

  if (!isOwnSessions && !hasAdminPermission) {
    return res.status(403).json({ error: "Cannot view other users' sessions" });
  }

  try {
    const sessions = await getUserSessions(user.tenantId, targetUserId);
    
    const enrichedSessions = sessions.map(session => ({
      ...session,
      device: parseUserAgent(session.userAgent || ""),
      isCurrentSession: session.isCurrent,
    }));

    res.json(enrichedSessions);
  } catch (error) {
    console.error("Error fetching sessions:", error);
    res.status(500).json({ error: "Failed to fetch sessions" });
  }
});

/**
 * GET /api/security/sessions/all
 * List all active sessions for the tenant (admin only).
 */
router.get(
  "/sessions/all",
  requirePermission("SETTINGS_SECURITY_VIEW"),
  async (req: Request, res: Response) => {
    const user = req.user as AuthUser | undefined;
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      const sessions = await getTenantSessions(user.tenantId);
      
      const enrichedSessions = sessions.map(session => ({
        ...session,
        device: parseUserAgent(session.userAgent || ""),
      }));

      res.json(enrichedSessions);
    } catch (error) {
      console.error("Error fetching tenant sessions:", error);
      res.status(500).json({ error: "Failed to fetch sessions" });
    }
  }
);

/**
 * POST /api/security/sessions/:sessionId/revoke
 * Revoke a specific session.
 */
router.post(
  "/sessions/:sessionId/revoke",
  requireStepUp("revoke_session"),
  async (req: Request, res: Response) => {
    const user = req.user as AuthUser | undefined;
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { sessionId } = req.params;
    const { ipAddress, userAgent } = getRequestContext(req);

    try {
      const session = await getSessionById(sessionId);
      
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }

      if (session.tenantId !== user.tenantId) {
        return res.status(404).json({ error: "Session not found" });
      }

      const isOwnSession = session.userId === user.id;
      const hasAdminPermission = user.permissions?.includes("SETTINGS_SECURITY_EDIT");

      if (!isOwnSession && !hasAdminPermission) {
        return res.status(403).json({ error: "Cannot revoke other users' sessions" });
      }

      const success = await revokeSession(sessionId, user.id, isOwnSession ? "user_requested" : "admin_forced");

      if (!success) {
        return res.status(404).json({ error: "Session already revoked" });
      }

      await logSoc2Audit({
        tenantId: user.tenantId,
        actorUserId: user.id,
        actorRole: user.role,
        action: "SESSION_REVOKED",
        outcome: "success",
        targetType: "session",
        targetId: sessionId,
        ipAddress,
        userAgent,
      });

      res.json({ success: true, message: "Session revoked" });
    } catch (error) {
      console.error("Error revoking session:", error);
      res.status(500).json({ error: "Failed to revoke session" });
    }
  }
);

/**
 * POST /api/security/sessions/revoke-all
 * Revoke all sessions for a user (except current optionally).
 */
router.post(
  "/sessions/revoke-all",
  requireStepUp("revoke_session"),
  async (req: Request, res: Response) => {
    const user = req.user as AuthUser | undefined;
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const targetUserId = (req.body.userId as string) || user.id;
    const isOwnSessions = targetUserId === user.id;
    const exceptCurrent = req.body.exceptCurrent === true;

    const hasAdminPermission = user.permissions?.includes("SETTINGS_SECURITY_EDIT");

    if (!isOwnSessions && !hasAdminPermission) {
      return res.status(403).json({ error: "Cannot revoke other users' sessions" });
    }

    const { ipAddress, userAgent } = getRequestContext(req);

    try {
      const count = await revokeAllUserSessions(
        user.tenantId,
        targetUserId,
        user.id,
        exceptCurrent ? req.body.currentSessionId : undefined
      );

      await logSoc2Audit({
        tenantId: user.tenantId,
        actorUserId: user.id,
        actorRole: user.role,
        action: "SESSION_REVOKE_ALL",
        outcome: "success",
        targetType: "user",
        targetId: targetUserId,
        ipAddress,
        userAgent,
        metadata: { revokedCount: count, exceptCurrent },
      });

      res.json({ success: true, message: `${count} sessions revoked` });
    } catch (error) {
      console.error("Error revoking sessions:", error);
      res.status(500).json({ error: "Failed to revoke sessions" });
    }
  }
);

export default router;
