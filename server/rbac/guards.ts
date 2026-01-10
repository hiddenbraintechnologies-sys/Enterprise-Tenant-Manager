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
import {
  Permissions,
  ROLE_DEFINITIONS,
  hasPermission,
  requiresScope,
  isTenantCountryInScope,
  type Permission,
  type Role,
  type PlatformRole,
  type ScopeType,
  type ScopeContext,
} from "@shared/rbac/permissions";

// Re-export permission constants for convenience
export { Permissions, ROLE_DEFINITIONS, hasPermission, requiresScope };

/**
 * Error response format for RBAC failures
 */
interface RBACError {
  error: {
    code: "UNAUTHORIZED" | "FORBIDDEN" | "NOT_FOUND";
    message: string;
    details?: Record<string, unknown>;
  };
}

/**
 * Scope context derived from user profile/JWT claims
 */
export interface DerivedScopeContext extends ScopeContext {
  adminId?: string;
  role?: Role;
  isPlatformAdmin: boolean;
  isSuperAdmin: boolean;
}

/**
 * requireAuth - Ensures user is authenticated
 * Returns 401 if no authenticated user
 */
export function requireAuth() {
  return (req: Request, res: Response, next: NextFunction) => {
    // Check for platform admin context (set by authenticateJWT middleware)
    if (req.platformAdminContext?.platformAdmin) {
      return next();
    }

    // Check for tenant user context
    if (req.context?.user) {
      return next();
    }

    // Check for token payload (JWT was valid but context not fully resolved)
    if (req.tokenPayload?.userId) {
      return next();
    }

    const error: RBACError = {
      error: {
        code: "UNAUTHORIZED",
        message: "Authentication required",
      },
    };
    return res.status(401).json(error);
  };
}

/**
 * requirePermission - Checks if user has a specific permission
 * Returns 403 if authenticated but lacks permission
 * 
 * @param permission - The permission to check (from Permissions constant)
 */
export function requirePermission(permission: Permission) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Must be authenticated first
    if (!req.platformAdminContext?.platformAdmin) {
      const error: RBACError = {
        error: {
          code: "FORBIDDEN",
          message: "Platform admin access required",
        },
      };
      return res.status(403).json(error);
    }

    const role = req.platformAdminContext.platformAdmin.role as Role;

    // Check if role has the required permission
    if (!hasPermission(role, permission)) {
      const error: RBACError = {
        error: {
          code: "FORBIDDEN",
          message: "Not authorized",
          details: {
            required: permission,
            role: role,
          },
        },
      };
      return res.status(403).json(error);
    }

    next();
  };
}

/**
 * requireAnyPermission - Checks if user has any of the specified permissions
 * Returns 403 if authenticated but lacks all permissions
 */
export function requireAnyPermission(...permissions: Permission[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.platformAdminContext?.platformAdmin) {
      const error: RBACError = {
        error: {
          code: "FORBIDDEN",
          message: "Platform admin access required",
        },
      };
      return res.status(403).json(error);
    }

    const role = req.platformAdminContext.platformAdmin.role as Role;

    // Check if role has any of the required permissions
    const hasAny = permissions.some(perm => hasPermission(role, perm));

    if (!hasAny) {
      const error: RBACError = {
        error: {
          code: "FORBIDDEN",
          message: "Not authorized",
          details: {
            required: permissions,
            role: role,
          },
        },
      };
      return res.status(403).json(error);
    }

    next();
  };
}

/**
 * requireSuperAdminOnly - Blocks all roles except PLATFORM_SUPER_ADMIN
 * Returns 403 for any non-super-admin
 */
export function requireSuperAdminOnly() {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.platformAdminContext?.platformAdmin) {
      const error: RBACError = {
        error: {
          code: "FORBIDDEN",
          message: "Platform admin access required",
        },
      };
      return res.status(403).json(error);
    }

    const role = req.platformAdminContext.platformAdmin.role;

    // Only SUPER_ADMIN role passes
    if (role !== "SUPER_ADMIN" && role !== "PLATFORM_SUPER_ADMIN") {
      const error: RBACError = {
        error: {
          code: "FORBIDDEN",
          message: "Not authorized",
          details: {
            message: "Super admin access required",
          },
        },
      };
      return res.status(403).json(error);
    }

    next();
  };
}

/**
 * getScopeContext - Derives scope context from user profile/JWT claims
 * Returns the scope information for the current user
 */
export function getScopeContext(req: Request): DerivedScopeContext | null {
  if (!req.platformAdminContext?.platformAdmin) {
    return null;
  }

  const admin = req.platformAdminContext.platformAdmin;
  const role = admin.role as PlatformRole;
  const scopeType = requiresScope(role);
  const scope = req.platformAdminContext.scope;

  return {
    scopeType,
    adminId: admin.id,
    role,
    isPlatformAdmin: true,
    isSuperAdmin: role === "SUPER_ADMIN" || role === "PLATFORM_SUPER_ADMIN",
    allowedCountryIds: scope?.countryIds || [],
    allowedRegionIds: scope?.regionIds || [],
  };
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
        const error: RBACError = {
          error: {
            code: "NOT_FOUND",
            message: "Resource not found",
          },
        };
        return res.status(404).json(error);
      }
      return next();
    }

    // If tenant ID is provided, look up the tenant's country
    if (target.tenantId) {
      const [tenant] = await db.select({ country: tenants.country })
        .from(tenants)
        .where(eq(tenants.id, target.tenantId));

      if (!tenant) {
        const error: RBACError = {
          error: {
            code: "NOT_FOUND",
            message: "Resource not found",
          },
        };
        return res.status(404).json(error);
      }

      // Check if tenant's country is in admin's scope
      const isInScope = isTenantCountryInScope(
        tenant.country,
        scopeContext.allowedCountryIds || []
      );

      if (!isInScope) {
        // Return 404 to not leak tenant existence
        const error: RBACError = {
          error: {
            code: "NOT_FOUND",
            message: "Resource not found",
          },
        };
        return res.status(404).json(error);
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
