import type { Request, Response, NextFunction } from "express";
import { jwtAuthService, DecodedToken } from "./jwt";
import { db } from "../db";
import { users, tenants, roles, userTenants, platformAdmins, platformAdminCountryAssignments, type PlatformAdminRole } from "@shared/schema";
import { eq, and, inArray } from "drizzle-orm";
import { getTenantFeatures } from "./context";
import type { RequestContext } from "@shared/schema";
import { 
  PLATFORM_PERMISSIONS, 
  SUPER_ADMIN_ONLY_PERMISSIONS,
  resolveAdminPermissions,
  type PlatformPermission,
  type ResolvedAdminPermissions 
} from "./permissions";

export interface AdminScope {
  countryIds: string[];
  regionIds: string[];
}

export interface PlatformAdminContext {
  platformAdmin: {
    id: string;
    name: string;
    email: string;
    role: PlatformAdminRole;
  };
  permissions: string[];
  resolvedPermissions: ResolvedAdminPermissions;
  scope: AdminScope | null;
}

declare global {
  namespace Express {
    interface Request {
      tokenPayload?: DecodedToken;
      platformAdminContext?: PlatformAdminContext;
    }
  }
}

export function authenticateJWT(options: { required?: boolean } = { required: true }) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      if (options.required) {
        console.log(`[auth] Missing auth header for ${req.method} ${req.path}`);
        return res.status(401).json({ 
          message: "Missing authorization header",
          code: "MISSING_TOKEN"
        });
      }
      return next();
    }

    const token = authHeader.slice(7);
    const decoded = await jwtAuthService.verifyAccessToken(token);

    if (!decoded) {
      console.log(`[auth] Token verification FAILED for ${req.method} ${req.path}`);
      if (options.required) {
        return res.status(401).json({ 
          message: "Invalid or expired token",
          code: "INVALID_TOKEN"
        });
      }
      return next();
    }
    console.log(`[auth] Token verified for userId=${decoded.userId}, tenantId=${decoded.tenantId}`);

    req.tokenPayload = decoded;

    if (decoded.isPlatformAdmin) {
      const [admin] = await db.select().from(platformAdmins).where(eq(platformAdmins.id, decoded.userId));
      
      if (!admin || !admin.isActive) {
        return res.status(401).json({ 
          message: "Platform admin not found or inactive",
          code: "ADMIN_NOT_FOUND"
        });
      }

      // Fetch admin's country scope
      let countryIds: string[] = [];
      if (admin.role !== "SUPER_ADMIN") {
        const countryAssignments = await db.select()
          .from(platformAdminCountryAssignments)
          .where(eq(platformAdminCountryAssignments.adminId, admin.id));
        countryIds = countryAssignments.map(ca => ca.countryCode);
      }

      // Resolve permissions based on role and scope
      const resolvedPermissions = resolveAdminPermissions(
        admin.role,
        countryIds,
        [] // regionIds - can be extended later
      );

      req.platformAdminContext = {
        platformAdmin: {
          id: admin.id,
          name: admin.name,
          email: admin.email,
          role: admin.role as PlatformAdminRole,
        },
        permissions: decoded.permissions,
        resolvedPermissions,
        scope: resolvedPermissions.scope,
      };
      
      return next();
    }

    if (decoded.userId) {
      const [dbUser] = await db.select().from(users).where(eq(users.id, decoded.userId));
      
      if (!dbUser) {
        return res.status(401).json({ 
          message: "User not found",
          code: "USER_NOT_FOUND"
        });
      }

      let tenant = null;
      let role = null;

      if (decoded.tenantId) {
        [tenant] = await db.select().from(tenants).where(eq(tenants.id, decoded.tenantId));
      }

      if (decoded.roleId) {
        [role] = await db.select().from(roles).where(eq(roles.id, decoded.roleId));
      }

      const features = tenant ? await getTenantFeatures(tenant.id) : [];

      req.context = {
        user: {
          id: dbUser.id,
          email: dbUser.email,
          firstName: dbUser.firstName,
          lastName: dbUser.lastName,
        },
        tenant,
        role,
        permissions: decoded.permissions,
        features,
      };
    }

    next();
  };
}

export function requirePlatformAdmin(requiredRole?: PlatformAdminRole) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.platformAdminContext) {
      return res.status(403).json({ 
        message: "Platform admin access required",
        code: "NOT_PLATFORM_ADMIN"
      });
    }

    if (requiredRole && requiredRole === "SUPER_ADMIN") {
      if (req.platformAdminContext.platformAdmin.role !== "SUPER_ADMIN") {
        return res.status(403).json({ 
          message: "Super admin access required",
          code: "INSUFFICIENT_PLATFORM_ROLE"
        });
      }
    }

    next();
  };
}

export function requirePlatformPermission(...requiredPermissions: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.platformAdminContext) {
      return res.status(403).json({ 
        message: "Platform admin access required",
        code: "NOT_PLATFORM_ADMIN"
      });
    }

    // SUPER_ADMIN bypasses all permission checks
    if (req.platformAdminContext.platformAdmin.role === "SUPER_ADMIN") {
      return next();
    }

    // Check if the admin has all required permissions using resolved permissions
    const resolved = req.platformAdminContext.resolvedPermissions;
    const hasAllPermissions = requiredPermissions.every(perm => 
      resolved.permissions.includes(perm as PlatformPermission)
    );

    if (!hasAllPermissions) {
      return res.status(403).json({ 
        message: "Insufficient permissions",
        code: "MISSING_PERMISSION",
        required: requiredPermissions,
        current: resolved.permissions,
      });
    }

    next();
  };
}

/**
 * Middleware that requires SUPER_ADMIN role only.
 * Use for routes that should never be accessible to PLATFORM_ADMIN.
 */
export function requireSuperAdmin() {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.platformAdminContext) {
      return res.status(403).json({ 
        message: "Platform admin access required",
        code: "NOT_PLATFORM_ADMIN"
      });
    }

    if (req.platformAdminContext.platformAdmin.role !== "SUPER_ADMIN") {
      return res.status(403).json({ 
        message: "Super admin access required",
        code: "SUPER_ADMIN_REQUIRED"
      });
    }

    next();
  };
}

/**
 * Middleware that checks if admin can access a specific country (scope check).
 * Use for routes that return country-scoped data.
 */
export function requireCountryScope(getCountryCode: (req: Request) => string | undefined) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.platformAdminContext) {
      return res.status(403).json({ 
        message: "Platform admin access required",
        code: "NOT_PLATFORM_ADMIN"
      });
    }

    // Super admin can access all countries
    if (req.platformAdminContext.platformAdmin.role === "SUPER_ADMIN") {
      return next();
    }

    const countryCode = getCountryCode(req);
    if (!countryCode) {
      return next(); // No country specified, allow (filtering should happen in route)
    }

    const scope = req.platformAdminContext.scope;
    if (!scope || scope.countryIds.length === 0) {
      return res.status(403).json({ 
        message: "No country scope assigned",
        code: "NO_COUNTRY_SCOPE"
      });
    }

    if (!scope.countryIds.includes(countryCode)) {
      return res.status(403).json({ 
        message: "Access denied for this country",
        code: "COUNTRY_SCOPE_DENIED",
        requested: countryCode,
        allowed: scope.countryIds,
      });
    }

    next();
  };
}

/**
 * Helper to get admin's allowed country codes for query filtering.
 */
export function getAdminCountryScope(req: Request): string[] | null {
  if (!req.platformAdminContext) {
    return null;
  }

  // Super admin sees all
  if (req.platformAdminContext.platformAdmin.role === "SUPER_ADMIN") {
    return null; // null means no filter
  }

  return req.platformAdminContext.scope?.countryIds || [];
}

export function requireRole(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.context?.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!req.context.role) {
      return res.status(403).json({ message: "No role assigned" });
    }

    const userRoleName = req.context.role.name.toLowerCase();
    const allowed = allowedRoles.map(r => r.toLowerCase());

    if (!allowed.includes(userRoleName)) {
      return res.status(403).json({ 
        message: "Insufficient role privileges",
        required: allowedRoles,
        current: req.context.role.name,
      });
    }

    next();
  };
}

export function validateTenantAccess(paramName: string = "tenantId") {
  return (req: Request, res: Response, next: NextFunction) => {
    const requestedTenantId = req.params[paramName] || req.body?.[paramName] || req.query?.[paramName];
    
    if (!requestedTenantId) {
      return next();
    }

    if (!req.context?.tenant) {
      return res.status(403).json({ message: "No tenant access" });
    }

    if (req.context.tenant.id !== requestedTenantId) {
      return res.status(403).json({ 
        message: "Cross-tenant access denied",
        code: "TENANT_MISMATCH"
      });
    }

    next();
  };
}

export function requireScope(...requiredScopes: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({ message: "Missing authorization" });
    }

    if (authHeader.startsWith("ApiKey ")) {
      const apiKey = authHeader.slice(7);
      const apiToken = await jwtAuthService.verifyApiToken(apiKey);

      if (!apiToken) {
        return res.status(401).json({ message: "Invalid API key" });
      }

      const hasScopes = requiredScopes.every(scope => apiToken.scopes.includes(scope));
      if (!hasScopes) {
        return res.status(403).json({ 
          message: "Insufficient scopes",
          required: requiredScopes,
        });
      }

      const [dbUser] = await db.select().from(users).where(eq(users.id, apiToken.userId));
      if (!dbUser) {
        return res.status(401).json({ message: "User not found" });
      }

      let tenant = null;
      if (apiToken.tenantId) {
        [tenant] = await db.select().from(tenants).where(eq(tenants.id, apiToken.tenantId));
      }

      req.context = {
        user: {
          id: dbUser.id,
          email: dbUser.email,
          firstName: dbUser.firstName,
          lastName: dbUser.lastName,
        },
        tenant,
        role: null,
        permissions: apiToken.scopes,
        features: tenant ? await getTenantFeatures(tenant.id) : [],
      };

      return next();
    }

    return res.status(401).json({ message: "Invalid authorization type" });
  };
}

/**
 * Hybrid authentication middleware that supports both JWT and session-based auth.
 * 
 * 1. If Authorization header is present, use JWT auth
 * 2. If no auth header but session auth (req.isAuthenticated()), populate context from session
 * 3. Falls back to 401 if neither method works and `required` is true
 */
export function authenticateHybrid(options: { required?: boolean } = { required: true }) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    
    // If Authorization header is present, use JWT authentication
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      const decoded = await jwtAuthService.verifyAccessToken(token);

      if (!decoded) {
        console.log(`[auth-hybrid] JWT verification FAILED for ${req.method} ${req.path}`);
        if (options.required) {
          return res.status(401).json({ 
            message: "Invalid or expired token",
            code: "INVALID_TOKEN"
          });
        }
        return next();
      }
      
      console.log(`[auth-hybrid] JWT verified for userId=${decoded.userId}, tenantId=${decoded.tenantId}`);
      req.tokenPayload = decoded;

      // Handle platform admin JWT
      if (decoded.isPlatformAdmin) {
        const [admin] = await db.select().from(platformAdmins).where(eq(platformAdmins.id, decoded.userId));
        
        if (!admin || !admin.isActive) {
          return res.status(401).json({ 
            message: "Platform admin not found or inactive",
            code: "ADMIN_NOT_FOUND"
          });
        }

        let countryIds: string[] = [];
        if (admin.role !== "SUPER_ADMIN") {
          const countryAssignments = await db.select()
            .from(platformAdminCountryAssignments)
            .where(eq(platformAdminCountryAssignments.adminId, admin.id));
          countryIds = countryAssignments.map(ca => ca.countryCode);
        }

        const resolvedPermissions = resolveAdminPermissions(
          admin.role,
          countryIds,
          []
        );

        req.platformAdminContext = {
          platformAdmin: {
            id: admin.id,
            name: admin.name,
            email: admin.email,
            role: admin.role as PlatformAdminRole,
          },
          permissions: decoded.permissions,
          resolvedPermissions,
          scope: resolvedPermissions.scope,
        };
        
        return next();
      }

      // Handle regular user JWT
      if (decoded.userId) {
        const [dbUser] = await db.select().from(users).where(eq(users.id, decoded.userId));
        
        if (!dbUser) {
          return res.status(401).json({ 
            message: "User not found",
            code: "USER_NOT_FOUND"
          });
        }

        let tenant = null;
        let role = null;

        if (decoded.tenantId) {
          [tenant] = await db.select().from(tenants).where(eq(tenants.id, decoded.tenantId));
        }

        if (decoded.roleId) {
          [role] = await db.select().from(roles).where(eq(roles.id, decoded.roleId));
        }

        const features = tenant ? await getTenantFeatures(tenant.id) : [];

        req.context = {
          user: {
            id: dbUser.id,
            email: dbUser.email,
            firstName: dbUser.firstName,
            lastName: dbUser.lastName,
          },
          tenant,
          role,
          permissions: decoded.permissions,
          features,
        };
      }

      return next();
    }

    // No Authorization header - check for session-based authentication
    if (req.isAuthenticated && req.isAuthenticated() && req.user) {
      console.log(`[auth-hybrid] Session auth detected for ${req.method} ${req.path}`);
      
      // Session user data from Replit Auth
      const sessionUser = req.user as any;
      
      // If context is already populated (by other middleware), proceed
      if (req.context?.user) {
        console.log(`[auth-hybrid] Context already populated for userId=${req.context.user.id}`);
        return next();
      }
      
      // Try to find the user in our database by email
      const userEmail = sessionUser.email || sessionUser.claims?.email;
      if (userEmail) {
        const [dbUser] = await db.select().from(users).where(eq(users.email, userEmail));
        
        if (dbUser) {
          // Find user's default tenant
          const [defaultTenantResult] = await db.select({
            tenant: tenants,
            role: roles,
          })
          .from(userTenants)
          .leftJoin(tenants, eq(userTenants.tenantId, tenants.id))
          .leftJoin(roles, eq(userTenants.roleId, roles.id))
          .where(and(
            eq(userTenants.userId, dbUser.id),
            eq(userTenants.isDefault, true),
            eq(userTenants.isActive, true)
          ))
          .limit(1);

          const tenant = defaultTenantResult?.tenant || null;
          const role = defaultTenantResult?.role || null;
          const features = tenant ? await getTenantFeatures(tenant.id) : [];

          req.context = {
            user: {
              id: dbUser.id,
              email: dbUser.email,
              firstName: dbUser.firstName,
              lastName: dbUser.lastName,
            },
            tenant,
            role,
            permissions: [],  // Permissions are loaded separately via role-permission mapping
            features,
          };
          
          console.log(`[auth-hybrid] Session context resolved for userId=${dbUser.id}, tenantId=${tenant?.id}`);
          return next();
        }
      }
      
      // User is authenticated via session but not found in our DB
      // This can happen for new Replit users - allow them through for registration flows
      console.log(`[auth-hybrid] Session user not found in DB, email=${userEmail}`);
      if (options.required) {
        return res.status(401).json({ 
          message: "User not found in system",
          code: "USER_NOT_FOUND"
        });
      }
      return next();
    }

    // No authentication found
    if (options.required) {
      console.log(`[auth-hybrid] No auth found for ${req.method} ${req.path}`);
      return res.status(401).json({ 
        message: "Authentication required",
        code: "UNAUTHORIZED"
      });
    }
    
    return next();
  };
}

export function isRateLimitBypassed(): boolean {
  const nodeEnv = process.env.NODE_ENV;
  if (!nodeEnv || nodeEnv === "production") {
    return false;
  }
  if (nodeEnv === "test") {
    return true;
  }
  if (nodeEnv === "development" && process.env.SKIP_RATE_LIMIT === "true") {
    return true;
  }
  return false;
}

let rateLimitBypassWarningLogged = false;

export function rateLimit(options: {
  windowMs: number;
  maxRequests: number;
}) {
  const requests = new Map<string, { count: number; resetAt: number }>();

  return (req: Request, res: Response, next: NextFunction) => {
    if (isRateLimitBypassed()) {
      if (!rateLimitBypassWarningLogged && process.env.SKIP_RATE_LIMIT === "true") {
        console.warn(`WARNING: Rate limiting bypass ENABLED (SKIP_RATE_LIMIT=true, env=${process.env.NODE_ENV || "development"})`);
        rateLimitBypassWarningLogged = true;
      }
      return next();
    }

    const key = req.ip || req.socket?.remoteAddress || "unknown";
    const now = Date.now();

    const record = requests.get(key);
    
    if (!record || record.resetAt < now) {
      requests.set(key, {
        count: 1,
        resetAt: now + options.windowMs,
      });
      return next();
    }

    if (record.count >= options.maxRequests) {
      return res.status(429).json({
        message: "Too many requests",
        retryAfter: Math.ceil((record.resetAt - now) / 1000),
      });
    }

    record.count++;
    next();
  };
}

export const ROLE_HIERARCHY = {
  super_admin: 5,
  admin: 4,
  manager: 3,
  staff: 2,
  customer: 1,
} as const;

export function requireMinimumRole(minimumRole: keyof typeof ROLE_HIERARCHY) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.context?.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!req.context.role) {
      return res.status(403).json({ message: "No role assigned" });
    }

    const userRoleName = req.context.role.name.toLowerCase() as keyof typeof ROLE_HIERARCHY;
    const userLevel = ROLE_HIERARCHY[userRoleName] || 0;
    const requiredLevel = ROLE_HIERARCHY[minimumRole];

    if (userLevel < requiredLevel) {
      return res.status(403).json({
        message: "Insufficient role level",
        required: minimumRole,
        current: req.context.role.name,
      });
    }

    next();
  };
}
