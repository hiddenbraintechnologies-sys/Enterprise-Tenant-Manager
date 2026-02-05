import { Router } from "express";
import { db } from "../../db";
import { impersonationSessions, tenantStaff } from "@shared/schema";
import { and, eq, isNull } from "drizzle-orm";
import { authenticateJWT } from "../../core/auth-middleware";
import { logImpersonationEvent } from "../../services/audit";

const router = Router();

const IMPERSONATION_DURATION_MS = 30 * 60 * 1000;

router.post("/impersonate/start", authenticateJWT(), async (req: any, res) => {
  try {
    const user = req.user;
    const tenantId = req.tenant?.id || req.context?.tenant?.id;
    const staff = req.staff;
    
    if (!user || !tenantId) {
      return res.status(401).json({ error: "UNAUTHORIZED", message: "Not authenticated" });
    }
    
    const permissions: string[] = req.context?.permissions || req.permissions || [];
    if (!permissions.includes("IMPERSONATE_STAFF")) {
      return res.status(403).json({ error: "FORBIDDEN", message: "IMPERSONATE_STAFF permission required" });
    }

    const { staffId } = req.body as { staffId: string };
    if (!staffId) {
      return res.status(400).json({ error: "VALIDATION_ERROR", message: "staffId required" });
    }

    const [target] = await db
      .select({
        id: tenantStaff.id,
        fullName: tenantStaff.fullName,
        email: tenantStaff.email,
        status: tenantStaff.status,
      })
      .from(tenantStaff)
      .where(and(eq(tenantStaff.id, staffId), eq(tenantStaff.tenantId, tenantId)))
      .limit(1);

    if (!target) {
      return res.status(404).json({ error: "NOT_FOUND", message: "Staff not found" });
    }
    if (target.status !== "active") {
      return res.status(400).json({ error: "INVALID_STATE", message: "Staff not active" });
    }

    const expiresAt = new Date(Date.now() + IMPERSONATION_DURATION_MS);

    const [session] = await db
      .insert(impersonationSessions)
      .values({
        tenantId,
        actorUserId: user.id,
        targetStaffId: target.id,
        expiresAt,
      })
      .returning({ id: impersonationSessions.id, expiresAt: impersonationSessions.expiresAt });

    const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket?.remoteAddress;
    const userAgent = req.headers["user-agent"] as string;

    await logImpersonationEvent("IMPERSONATION_STARTED", {
      tenantId,
      actorUserId: user.id,
      actorStaffId: staff?.id || "",
      targetStaffId: target.id,
      targetStaffName: target.fullName,
      ipAddress: ip,
      userAgent,
    });

    return res.json({
      success: true,
      impersonationToken: session.id,
      expiresAt: session.expiresAt,
      target: {
        id: target.id,
        fullName: target.fullName,
        email: target.email,
      },
    });
  } catch (error) {
    console.error("Start impersonation error:", error);
    return res.status(500).json({ error: "INTERNAL_ERROR", message: "Failed to start impersonation" });
  }
});

router.post("/impersonate/stop", authenticateJWT(), async (req: any, res) => {
  try {
    const user = req.user;
    const tenantId = req.tenant?.id || req.context?.tenant?.id;
    const staff = req.staff;

    if (!user || !tenantId) {
      return res.status(401).json({ error: "UNAUTHORIZED", message: "Not authenticated" });
    }

    const { token } = req.body as { token: string };
    if (!token) {
      return res.status(400).json({ error: "VALIDATION_ERROR", message: "token required" });
    }

    const [session] = await db
      .select({
        id: impersonationSessions.id,
        targetStaffId: impersonationSessions.targetStaffId,
      })
      .from(impersonationSessions)
      .where(
        and(
          eq(impersonationSessions.id, token),
          eq(impersonationSessions.tenantId, tenantId),
          eq(impersonationSessions.actorUserId, user.id),
          isNull(impersonationSessions.revokedAt)
        )
      )
      .limit(1);

    if (!session) {
      return res.status(404).json({ error: "NOT_FOUND", message: "Session not found" });
    }

    await db
      .update(impersonationSessions)
      .set({
        revokedAt: new Date(),
        revokeReason: "stopped",
      })
      .where(eq(impersonationSessions.id, token));

    const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket?.remoteAddress;
    const userAgent = req.headers["user-agent"] as string;

    await logImpersonationEvent("IMPERSONATION_ENDED", {
      tenantId,
      actorUserId: user.id,
      actorStaffId: staff?.id || "",
      targetStaffId: session.targetStaffId,
      ipAddress: ip,
      userAgent,
    });

    return res.json({ success: true });
  } catch (error) {
    console.error("Stop impersonation error:", error);
    return res.status(500).json({ error: "INTERNAL_ERROR", message: "Failed to stop impersonation" });
  }
});

router.get("/impersonate/current", authenticateJWT(), async (req: any, res) => {
  try {
    const impersonation = req.impersonation;
    
    if (!impersonation) {
      return res.json({ active: false });
    }

    return res.json({
      active: true,
      sessionId: impersonation.sessionId,
      target: impersonation.target,
      expiresAt: impersonation.expiresAt,
    });
  } catch (error) {
    console.error("Get current impersonation error:", error);
    return res.status(500).json({ error: "INTERNAL_ERROR", message: "Failed to get impersonation status" });
  }
});

export default router;
