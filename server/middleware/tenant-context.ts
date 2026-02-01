import type { Request, Response, NextFunction } from "express";
import { TenantIsolation, TenantIsolationError } from "../core/tenant-isolation";

export interface TenantContext {
  tenantId: string;
  userId: string;
  roles: string[];
  isolation: TenantIsolation;
}

declare global {
  namespace Express {
    interface Request {
      tenantContext?: TenantContext;
    }
  }
}

export function requireTenantContext() {
  return (req: Request, res: Response, next: NextFunction) => {
    const tenantId = req.context?.tenant?.id;
    const userId = req.context?.user?.id;
    
    if (!tenantId) {
      return res.status(403).json({
        message: "Tenant context required",
        code: "TENANT_REQUIRED",
      });
    }
    
    if (!userId) {
      return res.status(401).json({
        message: "User authentication required",
        code: "AUTH_REQUIRED",
      });
    }
    
    const roles = req.context?.role?.name ? [req.context.role.name] : [];
    
    try {
      const isolation = new TenantIsolation(tenantId);
      
      req.tenantContext = {
        tenantId,
        userId,
        roles,
        isolation,
      };
      
      (req as any).tenantId = tenantId;
      (req as any).tenantIsolation = isolation;
      
      next();
    } catch (error) {
      if (error instanceof TenantIsolationError) {
        return res.status(error.statusCode).json({
          message: error.message,
          code: error.code,
        });
      }
      next(error);
    }
  };
}

export function getTenantContext(req: Request): TenantContext {
  if (!req.tenantContext) {
    throw new TenantIsolationError("Tenant context not initialized - ensure requireTenantContext middleware is applied");
  }
  return req.tenantContext;
}

export function getTenantId(req: Request): string {
  return getTenantContext(req).tenantId;
}

export function getIsolation(req: Request): TenantIsolation {
  return getTenantContext(req).isolation;
}
