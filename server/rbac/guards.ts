/**
 * RBAC Guards - Permission and Scope Enforcement Middleware
 * 
 * Uses the shared permission matrix as the single source of truth.
 * Provides middleware for:
 * - requireAuth(): Ensures user is authenticated
 * - requirePermission(): Checks for specific permissions
 * - enforceScope(): Filters data based on role scope
 * - getScopeContext(): Derives scope from user profile/JWT
 */

import type { Request, Response, NextFunction } from "express";
import { db } from "../db";
import { platformAdmins, platformAdminCountryAssignments, tenants } from "@shared/schema";
import { eq, inArray } from "drizzle-orm";
import { auditDeniedAccessFromReq } from "../core/denied-access-audit";
import {
  Permissions,
  ROLE_DEFINITIONS,
  PLATFORM_ROLES,
  hasPermission,
  requiresScope,
  isTenantCountryInScope,
  type Permission,
  type Role,
  type PlatformRole,
  type TenantRole,
  type ScopeType,
  type ScopeContext,
} from "@shared/rbac/permissions";

// Re-export permission constants for convenience
export { Permissions, ROLE_DEFINITIONS, hasPermission, requiresScope };

// Map legacy role names to new constants
const LEGACY_ROLE_MAP: Record<string, PlatformRole> = {
  "SUPER_ADMIN": PLATFORM_ROLES.SUPER_ADMIN,
  "PLATFORM_SUPER_ADMIN": PLATFORM_ROLES.SUPER_ADMIN,
  "PLATFORM_ADMIN": PLATFORM_ROLES.PLATFORM_ADMIN,
  "TECH_SUPPORT_MANAGER": PLATFORM_ROLES.TECH_SUPPORT_MANAGER,
  "MANAGER": PLATFORM_ROLES.MANAGER,
  "SUPPORT_TEAM": PLATFORM_ROLES.SUPPORT_TEAM,
};

/**
 * Normalize role string to standard format
 */
function normalizeRole(role: string): Role {
  return LEGACY_ROLE_MAP[role] || role as Role;
}

/**
 * Scope context derived from user profile/JWT claims
 */
export interface DerivedScopeContext extends ScopeContext {
  adminId?: string;
  role?: Role;
  isPlatformAdmin: boolean;
  isTenantUser: boolean;
  isSuperAdmin: boolean;
}

/**
 * requireAuth - Ensures user is authenticated
 * Returns 401 if no authenticated user
 * 
 * Supports both:
 * - JWT-based auth (req.context, req.platformAdminContext, req.tokenPayload)
 * - Session-based auth (req.isAuthenticated(), req.user)
 */
export function requireAuth() {
  return (req: Request, res: Response, next: NextFunction) => {
    // Check for platform admin context (set by authenticateJWT middleware)
    if (req.platformAdminContext?.platformAdmin) {
      return next();
    }

    // Check for tenant user context (set by JWT or hybrid auth middleware)
    if (req.context?.user) {
      return next();
    }

    // Check for token payload (JWT was valid but context not fully resolved)
    if (req.tokenPayload?.userId) {
      return next();
    }

    // Check for session-based authentication (Replit Auth / passport)
    if (req.isAuthenticated && req.isAuthenticated() && req.user) {
      return next();
    }

    return res.status(401).json({ 
      message: "Authentication required",
      code: "UNAUTHORIZED"
    });
  };
}

/**
 * requirePermission - Checks if user has a specific permission
 * Returns 403 if authenticated but lacks permission
 * Works for both platform admins and tenant users
 * 
 * @param permission - The permission to check (from Permissions constant)
 */
export function requirePermission(permission: Permission) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Check for platform admin context first
    if (req.platformAdminContext?.platformAdmin) {
      const role = normalizeRole(req.platformAdminContext.platformAdmin.role);

      // Check if role has the required permission
      if (!hasPermission(role, permission)) {
        auditDeniedAccessFromReq("ACCESS_DENIED_ADMIN", req, "INSUFFICIENT_PERMISSIONS");
        return res.status(403).json({ 
          message: "Insufficient permissions",
          code: "FORBIDDEN",
          required: permission,
        });
      }

      return next();
    }

    // Check for tenant user context
    if (req.context?.user && req.context.role) {
      // Map tenant role to tenant role type and check permissions
      const tenantRole = mapTenantRole(req.context.role.name);
      if (tenantRole && hasPermission(tenantRole, permission)) {
        return next();
      }

      // Also check stored permissions array
      if (req.context.permissions?.includes(permission)) {
        return next();
      }

      auditDeniedAccessFromReq("ACCESS_DENIED_ADMIN", req, "INSUFFICIENT_PERMISSIONS");
      return res.status(403).json({ 
        message: "Insufficient permissions",
        code: "FORBIDDEN",
        required: permission,
      });
    }

    // No authenticated context
    auditDeniedAccessFromReq("ACCESS_DENIED_ADMIN", req, "NOT_AUTHENTICATED");
    return res.status(403).json({ 
      message: "Authentication required",
      code: "NOT_AUTHENTICATED"
    });
  };
}

/**
 * Map tenant role name to TenantRole type
 * Handles various casing conventions from the database
 */
function mapTenantRole(roleName: string): TenantRole | null {
  const roleMap: Record<string, TenantRole> = {
    "admin": "TENANT_ADMIN",
    "Admin": "TENANT_ADMIN",
    "ADMIN": "TENANT_ADMIN",
    "TENANT_ADMIN": "TENANT_ADMIN",
    "owner": "TENANT_ADMIN",
    "Owner": "TENANT_ADMIN",
    "OWNER": "TENANT_ADMIN",
    "staff": "TENANT_STAFF",
    "Staff": "TENANT_STAFF",
    "STAFF": "TENANT_STAFF",
    "TENANT_STAFF": "TENANT_STAFF",
    "viewer": "TENANT_VIEWER",
    "Viewer": "TENANT_VIEWER",
    "VIEWER": "TENANT_VIEWER",
    "TENANT_VIEWER": "TENANT_VIEWER",
  };
  return roleMap[roleName] || null;
}

/**
 * requireAnyPermission - Checks if user has any of the specified permissions
 * Returns 403 if authenticated but lacks all permissions
 */
export function requireAnyPermission(...permissions: Permission[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Check for platform admin context
    if (req.platformAdminContext?.platformAdmin) {
      const role = normalizeRole(req.platformAdminContext.platformAdmin.role);

      // Check if role has any of the required permissions
      const hasAny = permissions.some(perm => hasPermission(role, perm));

      if (!hasAny) {
        auditDeniedAccessFromReq("ACCESS_DENIED_ADMIN", req, "INSUFFICIENT_PERMISSIONS");
        return res.status(403).json({ 
          message: "Insufficient permissions",
          code: "FORBIDDEN",
          required: permissions,
        });
      }

      return next();
    }

    // Check for tenant user context
    if (req.context?.user && req.context.role) {
      const tenantRole = mapTenantRole(req.context.role.name);
      if (tenantRole) {
        const hasAny = permissions.some(perm => hasPermission(tenantRole, perm));
        if (hasAny) {
          return next();
        }
      }

      // Check stored permissions array
      const hasAny = permissions.some(perm => req.context?.permissions?.includes(perm));
      if (hasAny) {
        return next();
      }

      auditDeniedAccessFromReq("ACCESS_DENIED_ADMIN", req, "INSUFFICIENT_PERMISSIONS");
      return res.status(403).json({ 
        message: "Insufficient permissions",
        code: "FORBIDDEN",
        required: permissions,
      });
    }

    auditDeniedAccessFromReq("ACCESS_DENIED_ADMIN", req, "NOT_AUTHENTICATED");
    return res.status(403).json({ 
      message: "Authentication required",
      code: "NOT_AUTHENTICATED"
    });
  };
}

/**
 * requireSuperAdminOnly - Blocks all roles except PLATFORM_SUPER_ADMIN
 * Returns 401 if not authenticated, 403 if authenticated but not super admin
 */
export function requireSuperAdminOnly() {
  return (req: Request, res: Response, next: NextFunction) => {
    // Check if user is authenticated at all
    if (!req.platformAdminContext?.platformAdmin) {
      return res.status(401).json({ 
        message: "Authentication required",
        code: "UNAUTHENTICATED"
      });
    }

    const role = normalizeRole(req.platformAdminContext.platformAdmin.role);

    // Only PLATFORM_SUPER_ADMIN role passes
    if (role !== PLATFORM_ROLES.SUPER_ADMIN) {
      auditDeniedAccessFromReq("ACCESS_DENIED_ADMIN", req, "SUPER_ADMIN_ONLY");
      return res.status(403).json({ 
        message: "Super admin access required",
        code: "FORBIDDEN_SUPER_ADMIN_ONLY"
      });
    }

    next();
  };
}

/**
 * requireTenantAdmin - Requires tenant authentication with admin role
 * Returns 401 if not authenticated, 403 if not tenant admin
 */
export function requireTenantAdmin() {
  return (req: Request, res: Response, next: NextFunction) => {
    // Check for tenant user context
    if (!req.context?.user || !req.context?.tenant) {
      return res.status(401).json({ 
        message: "Tenant authentication required",
        code: "UNAUTHENTICATED"
      });
    }

    // Check if user has admin role
    const roleName = req.context.role?.name?.toLowerCase() || "";
    const isAdmin = ["admin", "owner", "tenant_admin"].includes(roleName);

    if (!isAdmin) {
      auditDeniedAccessFromReq("ACCESS_DENIED_ADMIN", req, "TENANT_ADMIN_REQUIRED");
      return res.status(403).json({ 
        message: "Tenant admin access required",
        code: "TENANT_ADMIN_REQUIRED"
      });
    }

    next();
  };
}

/**
 * getScopeContext - Derives scope context from user profile/JWT claims
 * Returns the scope information for the current user
 */
export function getScopeContext(req: Request): DerivedScopeContext | null {
  // Check for platform admin context
  if (req.platformAdminContext?.platformAdmin) {
    const admin = req.platformAdminContext.platformAdmin;
    const role = normalizeRole(admin.role);
    const scopeType = requiresScope(role);
    const scope = req.platformAdminContext.scope;

    return {
      scopeType,
      adminId: admin.id,
      role,
      isPlatformAdmin: true,
      isTenantUser: false,
      isSuperAdmin: role === PLATFORM_ROLES.SUPER_ADMIN,
      allowedCountryIds: scope?.countryIds || [],
      allowedRegionIds: scope?.regionIds || [],
    };
  }

  // Check for tenant user context
  if (req.context?.user && req.context.tenant) {
    const tenantRole = req.context.role ? mapTenantRole(req.context.role.name) : null;

    return {
      scopeType: "TENANT",
      role: tenantRole || undefined,
      isPlatformAdmin: false,
      isTenantUser: true,
      isSuperAdmin: false,
      tenantId: req.context.tenant.id,
      allowedCountryIds: [],
      allowedRegionIds: [],
    };
  }

  return null;
}

/**
 * enforceScope - Filters data based on role scope
 * 
 * For GLOBAL scope: no filtering
 * For COUNTRY scope: restrict to allowedCountryIds
 * For REGION scope: restrict to allowedRegionIds  
 * For TENANT scope: restrict to tenant_id
 * 
 * This middleware adds scopeFilter to the request for use in route handlers
 */
export function enforceScope() {
  return (req: Request, res: Response, next: NextFunction) => {
    const scopeContext = getScopeContext(req);

    if (!scopeContext) {
      // Not a platform admin, skip scope enforcement
      return next();
    }

    // Attach scope context to request for route handlers to use
    (req as any).scopeContext = scopeContext;

    // For GLOBAL scope, no filtering needed
    if (scopeContext.scopeType === "GLOBAL" || scopeContext.isSuperAdmin) {
      (req as any).scopeFilter = null; // null = no filter
      return next();
    }

    // For COUNTRY scope, create country filter
    if (scopeContext.scopeType === "COUNTRY") {
      (req as any).scopeFilter = {
        type: "country",
        allowedCountryIds: scopeContext.allowedCountryIds,
      };
      return next();
    }

    // For REGION scope, create region filter
    if (scopeContext.scopeType === "REGION") {
      (req as any).scopeFilter = {
        type: "region",
        allowedRegionIds: scopeContext.allowedRegionIds,
      };
      return next();
    }

    // For TENANT scope
    if (scopeContext.scopeType === "TENANT") {
      (req as any).scopeFilter = {
        type: "tenant",
        tenantId: scopeContext.tenantId,
      };
      return next();
    }

    next();
  };
}

/**
 * enforceTenantScope - Checks if a specific tenant is within the admin's scope
 * Returns 404 if tenant is outside scope (to not leak existence)
 * 
 * @param getTenantIdOrCountry - Function to extract tenant ID or country from request
 */
export function enforceTenantScope(
  getTenantIdOrCountry: (req: Request) => { tenantId?: string; countryCode?: string } | undefined
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const scopeContext = getScopeContext(req);

    if (!scopeContext) {
      return next();
    }

    // Super admin can access all tenants
    if (scopeContext.isSuperAdmin || scopeContext.scopeType === "GLOBAL") {
      return next();
    }

    const target = getTenantIdOrCountry(req);
    if (!target) {
      return next();
    }

    // If country code is directly provided
    if (target.countryCode) {
      const isInScope = scopeContext.allowedCountryIds?.includes(target.countryCode);
      if (!isInScope) {
        // Return 404 to not leak tenant existence
        return res.status(404).json({
          message: "Resource not found",
          code: "NOT_FOUND"
        });
      }
      return next();
    }

    // If tenant ID is provided, look up the tenant's country
    if (target.tenantId) {
      const [tenant] = await db.select({ country: tenants.country })
        .from(tenants)
        .where(eq(tenants.id, target.tenantId));

      if (!tenant) {
        return res.status(404).json({
          message: "Resource not found",
          code: "NOT_FOUND"
        });
      }

      // Check if tenant's country is in admin's scope
      const isInScope = isTenantCountryInScope(
        tenant.country,
        scopeContext.allowedCountryIds || []
      );

      if (!isInScope) {
        // Return 404 to not leak tenant existence
        return res.status(404).json({
          message: "Resource not found",
          code: "NOT_FOUND"
        });
      }
    }

    next();
  };
}

/**
 * Helper to get scoped tenant filter for database queries
 * Returns null for global scope (no filter), or array of allowed country codes
 */
export function getScopedCountryFilter(req: Request): string[] | null {
  const scopeContext = getScopeContext(req);

  if (!scopeContext) {
    return []; // No platform admin context = no access
  }

  // Global scope = no filter
  if (scopeContext.isSuperAdmin || scopeContext.scopeType === "GLOBAL") {
    return null;
  }

  // Return the allowed country IDs for filtering
  return scopeContext.allowedCountryIds || [];
}

/**
 * Check if a tenant country is accessible by the current admin
 */
export function canAccessTenantCountry(req: Request, tenantCountry: string | null): boolean {
  const scopeContext = getScopeContext(req);

  if (!scopeContext) {
    return false;
  }

  // Global scope can access all
  if (scopeContext.isSuperAdmin || scopeContext.scopeType === "GLOBAL") {
    return true;
  }

  if (!tenantCountry) {
    return false;
  }

  return isTenantCountryInScope(tenantCountry, scopeContext.allowedCountryIds || []);
}
