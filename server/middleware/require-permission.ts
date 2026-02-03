import { Request, Response, NextFunction } from "express";
import { PermissionService, EffectiveActor } from "../services/permission";
import type { Permission } from "@shared/rbac/permissions";

declare global {
  namespace Express {
    interface Request {
      effectiveActor?: EffectiveActor;
      impersonatedStaffId?: string;
    }
  }
}

export function requirePermission(permission: Permission) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    const tenant = (req as any).tenant;

    if (!user?.id || !tenant?.id) {
      return res.status(401).json({ error: "Authentication required", code: "AUTH_REQUIRED" });
    }

    const impersonatedStaffId = req.headers["x-impersonate-staff-id"] as string | undefined;
    req.impersonatedStaffId = impersonatedStaffId;

    const actor = await PermissionService.getEffectiveActor(user.id, tenant.id, { impersonatedStaffId });
    if (!actor) {
      return res.status(403).json({ error: "Access denied", code: "NO_STAFF_RECORD" });
    }

    req.effectiveActor = actor;

    const hasPermission = actor.permissions.has(permission);
    if (!hasPermission) {
      return res.status(403).json({ 
        error: "Forbidden", 
        code: "FORBIDDEN",
        requiredPermission: permission 
      });
    }

    next();
  };
}

export function requireAnyPermission(permissions: Permission[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    const tenant = (req as any).tenant;

    if (!user?.id || !tenant?.id) {
      return res.status(401).json({ error: "Authentication required", code: "AUTH_REQUIRED" });
    }

    const impersonatedStaffId = req.headers["x-impersonate-staff-id"] as string | undefined;
    req.impersonatedStaffId = impersonatedStaffId;

    const actor = await PermissionService.getEffectiveActor(user.id, tenant.id, { impersonatedStaffId });
    if (!actor) {
      return res.status(403).json({ error: "Access denied", code: "NO_STAFF_RECORD" });
    }

    req.effectiveActor = actor;

    const hasAny = permissions.some(p => actor.permissions.has(p));
    if (!hasAny) {
      return res.status(403).json({ 
        error: "Forbidden", 
        code: "FORBIDDEN",
        requiredPermissions: permissions 
      });
    }

    next();
  };
}

const IMPERSONATION_BLOCKED_PREFIXES = [
  "/api/billing",
  "/api/settings/roles",
  "/api/settings/staff",
  "/api/settings/impersonation",
  "/api/super-admin",
  "/api/admin",
];

export function blockImpersonationOnSensitiveRoutes(req: Request, res: Response, next: NextFunction) {
  const impersonatedStaffId = req.headers["x-impersonate-staff-id"] as string | undefined;
  if (!impersonatedStaffId) {
    return next();
  }

  const isBlocked = IMPERSONATION_BLOCKED_PREFIXES.some(prefix => req.path.startsWith(prefix));
  if (isBlocked) {
    return res.status(403).json({
      error: "IMPERSONATION_NOT_ALLOWED",
      message: "Impersonation is not allowed for this area.",
    });
  }

  next();
}
