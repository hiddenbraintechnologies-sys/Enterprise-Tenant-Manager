import type { Request, Response, NextFunction } from "express";
import { db } from "../db";
import { 
  tenants, users, userTenants, roles, rolePermissions, permissions, 
  tenantFeatures, featureFlags, auditLogs,
  type Tenant, type Role, type RequestContext, type InsertAuditLog
} from "@shared/schema";
import { eq, and, inArray } from "drizzle-orm";

declare global {
  namespace Express {
    interface Request {
      context: RequestContext;
    }
  }
}

export async function resolveTenantFromUser(userId: string, specificTenantId?: string): Promise<{
  tenant: Tenant | null;
  role: Role | null;
  permissions: string[];
}> {
  if (specificTenantId) {
    const [userTenant] = await db.select({
      tenant: tenants,
      role: roles,
    })
    .from(userTenants)
    .leftJoin(tenants, eq(userTenants.tenantId, tenants.id))
    .leftJoin(roles, eq(userTenants.roleId, roles.id))
    .where(and(
      eq(userTenants.userId, userId),
      eq(userTenants.tenantId, specificTenantId),
      eq(userTenants.isActive, true)
    ))
    .limit(1);

    if (!userTenant?.tenant) {
      return { tenant: null, role: null, permissions: [] };
    }

    const perms = await getRolePermissions(userTenant.role?.id);
    return { tenant: userTenant.tenant, role: userTenant.role, permissions: perms };
  }

  const [userTenant] = await db.select({
    tenant: tenants,
    role: roles,
  })
  .from(userTenants)
  .leftJoin(tenants, eq(userTenants.tenantId, tenants.id))
  .leftJoin(roles, eq(userTenants.roleId, roles.id))
  .where(and(
    eq(userTenants.userId, userId),
    eq(userTenants.isActive, true),
    eq(userTenants.isDefault, true)
  ))
  .limit(1);

  if (!userTenant?.tenant) {
    const [anyTenant] = await db.select({
      tenant: tenants,
      role: roles,
    })
    .from(userTenants)
    .leftJoin(tenants, eq(userTenants.tenantId, tenants.id))
    .leftJoin(roles, eq(userTenants.roleId, roles.id))
    .where(and(
      eq(userTenants.userId, userId),
      eq(userTenants.isActive, true)
    ))
    .limit(1);

    if (!anyTenant?.tenant) {
      return { tenant: null, role: null, permissions: [] };
    }

    const perms = await getRolePermissions(anyTenant.role?.id);
    return { tenant: anyTenant.tenant, role: anyTenant.role, permissions: perms };
  }

  const perms = await getRolePermissions(userTenant.role?.id);
  return { tenant: userTenant.tenant, role: userTenant.role, permissions: perms };
}

async function getRolePermissions(roleId: string | undefined | null): Promise<string[]> {
  if (!roleId) return [];
  
  const perms = await db.select({
    code: permissions.code,
  })
  .from(rolePermissions)
  .leftJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
  .where(eq(rolePermissions.roleId, roleId));

  return perms.map(p => p.code).filter(Boolean) as string[];
}

export async function getTenantFeatures(tenantId: string): Promise<string[]> {
  const activeFeatures = await db.select({
    featureCode: tenantFeatures.featureCode,
  })
  .from(tenantFeatures)
  .where(and(
    eq(tenantFeatures.tenantId, tenantId),
    eq(tenantFeatures.isEnabled, true)
  ));

  const defaultFeatures = await db.select({
    code: featureFlags.code,
  })
  .from(featureFlags)
  .where(eq(featureFlags.defaultEnabled, true));

  const featureSet = new Set<string>();
  defaultFeatures.forEach(f => featureSet.add(f.code));
  activeFeatures.forEach(f => featureSet.add(f.featureCode));

  return Array.from(featureSet);
}

export function tenantContextMiddleware() {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user as any;
    
    let context: RequestContext = {
      user: null,
      tenant: null,
      role: null,
      permissions: [],
      features: [],
    };

    if (user?.claims?.sub) {
      const userId = user.claims.sub;
      const [dbUser] = await db.select().from(users).where(eq(users.id, userId));
      
      if (dbUser) {
        context.user = {
          id: dbUser.id,
          email: dbUser.email,
          firstName: dbUser.firstName,
          lastName: dbUser.lastName,
        };

        const tenantInfo = await resolveTenantFromUser(userId);
        context.tenant = tenantInfo.tenant;
        context.role = tenantInfo.role;
        context.permissions = tenantInfo.permissions;

        if (tenantInfo.tenant) {
          context.features = await getTenantFeatures(tenantInfo.tenant.id);
        }
      }
    }

    req.context = context;
    next();
  };
}

export function requireAuth() {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.context.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    next();
  };
}

export function requireTenant() {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.context.tenant) {
      return res.status(403).json({ message: "No tenant access" });
    }
    next();
  };
}

export function requirePermission(...requiredPermissions: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.context.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const hasAllPermissions = requiredPermissions.every(
      perm => req.context.permissions.includes(perm)
    );

    if (!hasAllPermissions) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }

    next();
  };
}

export function requireAnyPermission(...requiredPermissions: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.context.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const hasAnyPermission = requiredPermissions.some(
      perm => req.context.permissions.includes(perm)
    );

    if (!hasAnyPermission) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }

    next();
  };
}

export function requireFeature(featureCode: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.context.features.includes(featureCode)) {
      return res.status(403).json({ 
        message: "Feature not available",
        feature: featureCode,
      });
    }
    next();
  };
}

export async function logAuditAction(data: Omit<InsertAuditLog, "id" | "createdAt">): Promise<void> {
  try {
    await db.insert(auditLogs).values(data);
  } catch (error) {
    console.error("Failed to log audit action:", error);
  }
}

export function auditMiddleware(resource: string, action: "create" | "update" | "delete" | "access") {
  return async (req: Request, res: Response, next: NextFunction) => {
    const originalJson = res.json.bind(res);
    
    res.json = function(body: any) {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        logAuditAction({
          tenantId: req.context?.tenant?.id || null,
          userId: req.context?.user?.id || null,
          action,
          resource,
          resourceId: req.params.id || body?.id || null,
          newValue: action === "create" || action === "update" ? body : null,
          metadata: {
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
          },
          ipAddress: (req.ip || req.socket?.remoteAddress) ?? null,
          userAgent: req.headers["user-agent"] || null,
          correlationId: req.headers["x-correlation-id"] as string || null,
        }).catch(() => {});
      }
      return originalJson(body);
    };

    next();
  };
}

export function hasPermission(context: RequestContext, permission: string): boolean {
  return context.permissions.includes(permission);
}

export function hasFeature(context: RequestContext, featureCode: string): boolean {
  return context.features.includes(featureCode);
}
