import { Request, Response, NextFunction } from "express";
import { db } from "../db";
import { tenantStaff, tenantRolePermissions, tenantRoles } from "@shared/schema";
import { eq, and } from "drizzle-orm";

export interface TenantPermissionContext {
  staffId: string;
  roleId: string | null;
  roleName: string | null;
  permissions: string[];
}

declare global {
  namespace Express {
    interface Request {
      tenantPermissions?: TenantPermissionContext;
    }
  }
}

export async function getTenantStaffPermissions(userId: string, tenantId: string): Promise<TenantPermissionContext | null> {
  const [staffMember] = await db.select().from(tenantStaff)
    .where(and(eq(tenantStaff.userId, userId), eq(tenantStaff.tenantId, tenantId)));

  if (!staffMember) {
    return null;
  }

  let permissions: string[] = [];
  let roleName: string | null = null;

  if (staffMember.tenantRoleId) {
    const [role] = await db.select().from(tenantRoles)
      .where(eq(tenantRoles.id, staffMember.tenantRoleId));
    
    if (role) {
      roleName = role.name;
      const rolePermissions = await db.select().from(tenantRolePermissions)
        .where(eq(tenantRolePermissions.tenantRoleId, staffMember.tenantRoleId));
      permissions = rolePermissions.map(p => p.permission);
    }
  }

  return {
    staffId: staffMember.id,
    roleId: staffMember.tenantRoleId,
    roleName,
    permissions,
  };
}

export function loadTenantPermissions() {
  return async (req: Request, res: Response, next: NextFunction) => {
    const context = (req as any).context;
    
    if (!context?.userId || !context?.tenantId) {
      return next();
    }

    try {
      const permContext = await getTenantStaffPermissions(context.userId, context.tenantId);
      if (permContext) {
        req.tenantPermissions = permContext;
      }
    } catch (error) {
      console.error("[tenant-permission] Error loading permissions:", error);
    }

    next();
  };
}

export function requireTenantPermission(...requiredPermissions: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const context = (req as any).context;
    
    if (!context?.userId || !context?.tenantId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Tenant owner (admin) always has access - check if user is the tenant creator
    // For now, we check if user is linked to this tenant with Admin role
    let permContext: TenantPermissionContext | null | undefined = req.tenantPermissions;
    
    if (!permContext) {
      permContext = await getTenantStaffPermissions(context.userId, context.tenantId);
    }

    // If user is not a staff member yet, check if they are the tenant owner
    // Tenant owners (those who registered the tenant) get full access
    if (!permContext) {
      // Check if user has Admin role via userTenants (legacy system integration)
      const { userTenants, roles } = await import("@shared/schema");
      const [userTenant] = await db.select({
        roleId: userTenants.roleId,
        roleName: roles.name,
      })
        .from(userTenants)
        .leftJoin(roles, eq(userTenants.roleId, roles.id))
        .where(and(eq(userTenants.userId, context.userId), eq(userTenants.tenantId, context.tenantId)));
      
      if (userTenant?.roleName?.toLowerCase() === "admin") {
        // Admin users have all permissions
        return next();
      }
      
      return res.status(403).json({ 
        error: "Forbidden",
        message: "You do not have permission to access this resource",
        requiredPermissions,
      });
    }

    // Check if user has Admin role
    if (permContext.roleName?.toLowerCase() === "admin") {
      return next();
    }

    // Check for specific permissions
    const hasPermission = requiredPermissions.some(perm => {
      // Check for exact match
      if (permContext!.permissions.includes(perm)) return true;
      
      // Check for wildcard permission (e.g., "staff:*" matches "staff:view")
      const [module] = perm.split("_");
      const wildcardPerm = `${module}:*`;
      if (permContext!.permissions.includes(wildcardPerm)) return true;
      
      return false;
    });

    if (!hasPermission) {
      return res.status(403).json({ 
        error: "Forbidden",
        message: "You do not have permission to access this resource",
        requiredPermissions,
        userPermissions: permContext.permissions,
      });
    }

    next();
  };
}

export function requireAnyTenantPermission(...requiredPermissions: string[]) {
  return requireTenantPermission(...requiredPermissions);
}

export function requireAllTenantPermissions(...requiredPermissions: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const context = (req as any).context;
    
    if (!context?.userId || !context?.tenantId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    let permContext: TenantPermissionContext | null | undefined = req.tenantPermissions;
    if (!permContext) {
      permContext = await getTenantStaffPermissions(context.userId, context.tenantId);
    }

    if (!permContext) {
      return res.status(403).json({ error: "Forbidden" });
    }

    if (permContext.roleName?.toLowerCase() === "admin") {
      return next();
    }

    const hasAllPermissions = requiredPermissions.every(perm => 
      permContext!.permissions.includes(perm)
    );

    if (!hasAllPermissions) {
      return res.status(403).json({ 
        error: "Forbidden",
        requiredPermissions,
        userPermissions: permContext.permissions,
      });
    }

    next();
  };
}
