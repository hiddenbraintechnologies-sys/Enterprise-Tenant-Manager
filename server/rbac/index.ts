/**
 * RBAC Module - Role-Based Access Control
 * 
 * Exports all RBAC guards and utilities for use in route handlers.
 */

export {
  requireAuth,
  requirePermission,
  requireAnyPermission,
  requireSuperAdminOnly,
  getScopeContext,
  enforceScope,
  enforceTenantScope,
  getScopedCountryFilter,
  canAccessTenantCountry,
  Permissions,
  ROLE_DEFINITIONS,
  hasPermission,
  requiresScope,
  type DerivedScopeContext,
} from "./guards";
