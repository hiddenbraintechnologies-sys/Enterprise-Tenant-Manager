import { db } from "../db";
import { impersonationSessions, tenantStaff, tenantRolePermissions } from "@shared/schema";
import { and, eq, isNull, gt } from "drizzle-orm";
import type { Request, Response, NextFunction } from "express";

export async function applyImpersonationContext(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const token = req.headers["x-impersonation-token"] as string | undefined;
  if (!token) return next();

  const user = (req as any).user;
  const tenantId = (req as any).tenant?.id || (req as any).context?.tenant?.id;
  if (!user || !tenantId) return next();

  const now = new Date();

  try {
    const [session] = await db
      .select({
        id: impersonationSessions.id,
        actorUserId: impersonationSessions.actorUserId,
        targetStaffId: impersonationSessions.targetStaffId,
        expiresAt: impersonationSessions.expiresAt,
      })
      .from(impersonationSessions)
      .where(
        and(
          eq(impersonationSessions.id, token),
          eq(impersonationSessions.tenantId, tenantId),
          isNull(impersonationSessions.revokedAt),
          gt(impersonationSessions.expiresAt, now)
        )
      )
      .limit(1);

    if (!session) return next();

    if (session.actorUserId !== user.id) return next();

    const [target] = await db
      .select({
        id: tenantStaff.id,
        tenantRoleId: tenantStaff.tenantRoleId,
        fullName: tenantStaff.fullName,
        email: tenantStaff.email,
        status: tenantStaff.status,
      })
      .from(tenantStaff)
      .where(
        and(
          eq(tenantStaff.id, session.targetStaffId),
          eq(tenantStaff.tenantId, tenantId)
        )
      )
      .limit(1);

    if (!target || target.status !== "active") return next();

    const roleId = target.tenantRoleId;
    let permissions: string[] = [];

    if (roleId) {
      const perms = await db
        .select({ permission: tenantRolePermissions.permission })
        .from(tenantRolePermissions)
        .where(eq(tenantRolePermissions.tenantRoleId, roleId));
      permissions = perms.map((p) => p.permission);
    }

    (req as any).impersonation = {
      sessionId: session.id,
      actorUserId: session.actorUserId,
      targetStaffId: target.id,
      target: { fullName: target.fullName, email: target.email },
      expiresAt: session.expiresAt,
    };

    (req as any).effectivePermissions = permissions;

    return next();
  } catch (error) {
    console.error("Impersonation context error:", error);
    return next();
  }
}

export function requirePermission(permission: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const perms: string[] =
      (req as any).effectivePermissions ||
      (req as any).context?.permissions ||
      (req as any).permissions ||
      [];

    if (!perms.includes(permission)) {
      return res.status(403).json({ error: "FORBIDDEN", message: "Insufficient permissions" });
    }
    next();
  };
}
