import type { Request, Response, NextFunction } from "express";
import type { Permission } from "../../shared/rbac";

export function requirePermission(permission: Permission) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user as { permissions?: Permission[] } | undefined;
    const perms: Permission[] = user?.permissions ?? [];
    if (!perms.includes(permission)) {
      return res.status(403).json({ 
        error: "Forbidden",
        message: "You do not have permission to access this resource"
      });
    }
    next();
  };
}

export function requireAnyPermission(...permissions: Permission[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user as { permissions?: Permission[] } | undefined;
    const perms: Permission[] = user?.permissions ?? [];
    const hasAny = permissions.some(p => perms.includes(p));
    if (!hasAny) {
      return res.status(403).json({ 
        error: "Forbidden",
        message: "You do not have permission to access this resource"
      });
    }
    next();
  };
}

export function requireAllPermissions(...permissions: Permission[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user as { permissions?: Permission[] } | undefined;
    const perms: Permission[] = user?.permissions ?? [];
    const hasAll = permissions.every(p => perms.includes(p));
    if (!hasAll) {
      return res.status(403).json({ 
        error: "Forbidden",
        message: "You do not have permission to access this resource"
      });
    }
    next();
  };
}
