import type { Request, Response, NextFunction } from "express";
import { db } from "../db";
import { tenants, tenantDomains, userTenants, type Tenant } from "@shared/schema";
import { eq, and, SQL, sql } from "drizzle-orm";
import type { PgTable, PgColumn } from "drizzle-orm/pg-core";

export enum TenantResolutionStrategy {
  SUBDOMAIN = "subdomain",
  HEADER = "header",
  JWT_CLAIM = "jwt_claim",
  PATH = "path",
  USER_DEFAULT = "user_default",
}

export interface TenantResolutionConfig {
  strategies: TenantResolutionStrategy[];
  headerName?: string;
  subdomainBase?: string;
  pathPrefix?: string;
  allowCrossTenantAccess?: boolean;
}

const DEFAULT_CONFIG: TenantResolutionConfig = {
  strategies: [
    TenantResolutionStrategy.JWT_CLAIM,
    TenantResolutionStrategy.HEADER,
    TenantResolutionStrategy.SUBDOMAIN,
    TenantResolutionStrategy.USER_DEFAULT,
  ],
  headerName: "X-Tenant-ID",
  subdomainBase: ".bizflow.app",
  pathPrefix: "/t/",
  allowCrossTenantAccess: false,
};

export class TenantResolver {
  private config: TenantResolutionConfig;
  private cache: Map<string, { tenant: Tenant; timestamp: number }> = new Map();
  private cacheTTL = 5 * 60 * 1000;

  constructor(config: Partial<TenantResolutionConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async resolve(req: Request): Promise<Tenant | null> {
    for (const strategy of this.config.strategies) {
      const tenant = await this.resolveByStrategy(req, strategy);
      if (tenant) {
        return tenant;
      }
    }
    return null;
  }

  private async resolveByStrategy(req: Request, strategy: TenantResolutionStrategy): Promise<Tenant | null> {
    switch (strategy) {
      case TenantResolutionStrategy.SUBDOMAIN:
        return this.resolveBySubdomain(req);
      case TenantResolutionStrategy.HEADER:
        return this.resolveByHeader(req);
      case TenantResolutionStrategy.JWT_CLAIM:
        return this.resolveByJwtClaim(req);
      case TenantResolutionStrategy.PATH:
        return this.resolveByPath(req);
      case TenantResolutionStrategy.USER_DEFAULT:
        return this.resolveByUserDefault(req);
      default:
        return null;
    }
  }

  private async resolveBySubdomain(req: Request): Promise<Tenant | null> {
    const host = req.hostname || req.get("host")?.split(":")[0] || "";
    
    if (!this.config.subdomainBase) {
      return null;
    }

    const baseDomain = this.config.subdomainBase.startsWith(".")
      ? this.config.subdomainBase.slice(1)
      : this.config.subdomainBase;

    if (!host.endsWith(baseDomain)) {
      const tenant = await this.getTenantByDomain(host);
      if (tenant) {
        return tenant;
      }
      return null;
    }

    const subdomain = host.slice(0, -(baseDomain.length + 1));
    if (!subdomain || subdomain === "www" || subdomain === "app") {
      return null;
    }

    return this.getTenantBySlug(subdomain);
  }

  private async resolveByHeader(req: Request): Promise<Tenant | null> {
    const headerName = this.config.headerName || "X-Tenant-ID";
    const tenantId = req.get(headerName);
    
    if (!tenantId) {
      return null;
    }

    return this.getTenantById(tenantId);
  }

  private async resolveByJwtClaim(req: Request): Promise<Tenant | null> {
    const jwtPayload = (req as any).jwtPayload || (req as any).tokenPayload;
    if (!jwtPayload?.tnt && !jwtPayload?.tenantId) {
      return null;
    }

    const tenantId = jwtPayload.tnt || jwtPayload.tenantId;
    return this.getTenantById(tenantId);
  }

  private async resolveByPath(req: Request): Promise<Tenant | null> {
    const pathPrefix = this.config.pathPrefix || "/t/";
    if (!req.path.startsWith(pathPrefix)) {
      return null;
    }

    const pathParts = req.path.slice(pathPrefix.length).split("/");
    const tenantSlug = pathParts[0];
    
    if (!tenantSlug) {
      return null;
    }

    return this.getTenantBySlug(tenantSlug);
  }

  private async resolveByUserDefault(req: Request): Promise<Tenant | null> {
    const userId = req.context?.user?.id;
    if (!userId) {
      return null;
    }

    const [defaultTenant] = await db.select({
      tenant: tenants,
    })
    .from(userTenants)
    .leftJoin(tenants, eq(userTenants.tenantId, tenants.id))
    .where(and(
      eq(userTenants.userId, userId),
      eq(userTenants.isDefault, true),
      eq(userTenants.isActive, true)
    ))
    .limit(1);

    return defaultTenant?.tenant || null;
  }

  private async getTenantById(id: string): Promise<Tenant | null> {
    const cached = this.cache.get(`id:${id}`);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.tenant;
    }

    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, id));
    
    if (tenant) {
      this.cache.set(`id:${id}`, { tenant, timestamp: Date.now() });
    }
    
    return tenant || null;
  }

  private async getTenantBySlug(slug: string): Promise<Tenant | null> {
    const cached = this.cache.get(`slug:${slug}`);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.tenant;
    }

    const [tenant] = await db.select().from(tenants).where(eq(tenants.slug, slug));
    
    if (tenant) {
      this.cache.set(`slug:${slug}`, { tenant, timestamp: Date.now() });
      this.cache.set(`id:${tenant.id}`, { tenant, timestamp: Date.now() });
    }
    
    return tenant || null;
  }

  private async getTenantByDomain(domain: string): Promise<Tenant | null> {
    const cached = this.cache.get(`domain:${domain}`);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.tenant;
    }

    const [result] = await db.select({
      tenant: tenants,
    })
    .from(tenantDomains)
    .leftJoin(tenants, eq(tenantDomains.tenantId, tenants.id))
    .where(and(
      eq(tenantDomains.domain, domain),
      eq(tenantDomains.isVerified, true)
    ));

    const tenant = result?.tenant || null;
    
    if (tenant) {
      this.cache.set(`domain:${domain}`, { tenant, timestamp: Date.now() });
      this.cache.set(`id:${tenant.id}`, { tenant, timestamp: Date.now() });
    }
    
    return tenant;
  }

  clearCache(): void {
    this.cache.clear();
  }
}

export class TenantIsolation {
  private tenantId: string;

  constructor(tenantId: string) {
    if (!tenantId) {
      throw new TenantIsolationError("Tenant ID is required for tenant-scoped operations");
    }
    this.tenantId = tenantId;
  }

  getTenantId(): string {
    return this.tenantId;
  }

  scopeCondition<T extends PgTable>(table: T, tenantColumn: PgColumn = (table as any).tenantId): SQL {
    return eq(tenantColumn, this.tenantId);
  }

  validateOwnership(record: { tenantId?: string | null } | null | undefined): void {
    if (!record) {
      throw new TenantIsolationError("Record not found", 404);
    }
    
    if (record.tenantId !== this.tenantId) {
      throw new TenantIsolationError("Cross-tenant access denied", 403);
    }
  }

  validateMultiple(records: Array<{ tenantId?: string | null }>): void {
    for (const record of records) {
      this.validateOwnership(record);
    }
  }

  async ensureOwnership<T extends { tenantId?: string | null }>(
    table: PgTable,
    idColumn: PgColumn,
    id: string
  ): Promise<T> {
    const [record] = await db.select()
      .from(table)
      .where(and(
        eq(idColumn, id),
        eq((table as any).tenantId, this.tenantId)
      )) as T[];

    if (!record) {
      throw new TenantIsolationError("Record not found or access denied", 404);
    }

    return record;
  }

  scopedInsert<T extends { tenantId?: string }>(data: Omit<T, "tenantId">): T {
    return {
      ...data,
      tenantId: this.tenantId,
    } as T;
  }
}

export class TenantIsolationError extends Error {
  public statusCode: number;
  public code: string;

  constructor(message: string, statusCode: number = 403) {
    super(message);
    this.name = "TenantIsolationError";
    this.statusCode = statusCode;
    this.code = "TENANT_ISOLATION_VIOLATION";
  }
}

export function createTenantIsolation(req: Request): TenantIsolation {
  const tenantId = req.context?.tenant?.id;
  
  if (!tenantId) {
    throw new TenantIsolationError("No tenant context available");
  }

  return new TenantIsolation(tenantId);
}

export function requireTenantIsolation() {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const isolation = createTenantIsolation(req);
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

export async function validateUserTenantAccess(
  userId: string,
  tenantId: string
): Promise<boolean> {
  const [access] = await db.select({ id: userTenants.id })
    .from(userTenants)
    .where(and(
      eq(userTenants.userId, userId),
      eq(userTenants.tenantId, tenantId),
      eq(userTenants.isActive, true)
    ))
    .limit(1);

  return !!access;
}

export async function validateCrossTenantAccess(
  req: Request,
  targetTenantId: string
): Promise<boolean> {
  const currentTenantId = req.context?.tenant?.id;
  const userId = req.context?.user?.id;

  if (!userId) {
    return false;
  }

  if (currentTenantId === targetTenantId) {
    return true;
  }

  const isSuperAdmin = req.context?.role?.name === "super_admin";
  if (isSuperAdmin) {
    return await validateUserTenantAccess(userId, targetTenantId);
  }

  return false;
}

export function tenantIsolationErrorHandler() {
  return (error: Error, req: Request, res: Response, next: NextFunction) => {
    if (error instanceof TenantIsolationError) {
      return res.status(error.statusCode).json({
        message: error.message,
        code: error.code,
      });
    }
    next(error);
  };
}

export const tenantResolver = new TenantResolver();

export function scopedQuery<T extends PgTable>(
  table: T,
  tenantId: string
): { table: T; where: SQL } {
  return {
    table,
    where: eq((table as any).tenantId, tenantId),
  };
}

export function withTenantScope<T extends { tenantId?: string }>(
  data: Omit<T, "tenantId">,
  tenantId: string
): T {
  return {
    ...data,
    tenantId,
  } as T;
}

export function assertSameTenant(
  record1: { tenantId?: string | null },
  record2: { tenantId?: string | null }
): void {
  if (record1.tenantId !== record2.tenantId) {
    throw new TenantIsolationError("Cross-tenant operation not allowed");
  }
}

export function tenantResolutionMiddleware(config?: Partial<TenantResolutionConfig>) {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  const resolver = new TenantResolver(mergedConfig);
  
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenant = await resolver.resolve(req);
      
      if (req.context) {
        if (tenant && req.context.tenant && req.context.tenant.id !== tenant.id) {
          return res.status(403).json({
            message: "Tenant mismatch - resolved tenant differs from authenticated context",
            code: "TENANT_MISMATCH",
          });
        }
        
        if (tenant && !req.context.tenant) {
          req.context.tenant = tenant;
        }
      }
      
      if (!tenant && !req.context?.tenant && !mergedConfig.allowCrossTenantAccess) {
        return res.status(403).json({
          message: "Tenant context required",
          code: "TENANT_REQUIRED",
        });
      }
      
      next();
    } catch (error) {
      next(error);
    }
  };
}

export function enforceTenantBoundary() {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.context?.tenant) {
      return res.status(403).json({
        message: "Tenant context required",
        code: "TENANT_REQUIRED",
      });
    }

    const userId = req.context.user?.id;
    const tenantId = req.context.tenant.id;

    if (userId) {
      const hasAccess = await validateUserTenantAccess(userId, tenantId);
      if (!hasAccess) {
        return res.status(403).json({
          message: "User does not have access to this tenant",
          code: "TENANT_ACCESS_DENIED",
        });
      }
    }

    next();
  };
}

export interface UnauthorizedAccessLog {
  userId?: string | null;
  tenantId?: string | null;
  action: string;
  resource: string;
  reason: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  requestBody?: Record<string, any>;
  requestPath: string;
  requestMethod: string;
}

export async function logUnauthorizedAccess(entry: UnauthorizedAccessLog): Promise<void> {
  const { auditService } = await import("./audit");
  
  await auditService.logAsync({
    tenantId: entry.tenantId,
    userId: entry.userId,
    action: "access",
    resource: entry.resource,
    metadata: {
      unauthorized: true,
      reason: entry.reason,
      requestPath: entry.requestPath,
      requestMethod: entry.requestMethod,
      attemptedAction: entry.action,
      requestBody: entry.requestBody ? sanitizeRequestBody(entry.requestBody) : undefined,
    },
    ipAddress: entry.ipAddress,
    userAgent: entry.userAgent,
  });

  console.warn(`[SECURITY] Unauthorized access attempt: ${entry.reason}`, {
    userId: entry.userId,
    tenantId: entry.tenantId,
    path: entry.requestPath,
    method: entry.requestMethod,
  });
}

function sanitizeRequestBody(body: Record<string, any>): Record<string, any> {
  const sensitiveFields = ["password", "token", "secret", "apiKey", "creditCard"];
  const sanitized: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(body)) {
    if (sensitiveFields.some(f => key.toLowerCase().includes(f.toLowerCase()))) {
      sanitized[key] = "[REDACTED]";
    } else if (typeof value === "object" && value !== null) {
      sanitized[key] = sanitizeRequestBody(value);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

export function blockBusinessTypeModification() {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (req.method !== "POST" && req.method !== "PUT" && req.method !== "PATCH") {
      return next();
    }

    const body = req.body;
    if (!body || typeof body !== "object") {
      return next();
    }

    const hasBusinessTypeField = "businessType" in body || "business_type" in body;
    
    if (!hasBusinessTypeField) {
      return next();
    }

    const isTenantRoute = req.path.includes("/tenant") || req.path.includes("/organization");
    
    if (!isTenantRoute) {
      return next();
    }

    await logUnauthorizedAccess({
      userId: req.context?.user?.id,
      tenantId: req.context?.tenant?.id,
      action: "modify_business_type",
      resource: "tenant",
      reason: "Attempted to modify immutable business_type field",
      ipAddress: req.ip || req.socket?.remoteAddress,
      userAgent: req.get("user-agent"),
      requestBody: body,
      requestPath: req.path,
      requestMethod: req.method,
    });

    return res.status(403).json({
      message: "Business type cannot be modified after tenant creation",
      code: "BUSINESS_TYPE_IMMUTABLE",
    });
  };
}

export function tenantIsolationMiddleware() {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.context?.tenant) {
        return res.status(403).json({
          message: "Tenant context required",
          code: "TENANT_REQUIRED",
        });
      }

      const tenantId = req.context.tenant.id;
      const businessType = req.context.tenant.businessType;

      (req as any).tenantId = tenantId;
      (req as any).businessType = businessType;

      const isolation = new TenantIsolation(tenantId);
      (req as any).tenantIsolation = isolation;

      if (req.context.user?.id) {
        const hasAccess = await validateUserTenantAccess(req.context.user.id, tenantId);
        
        if (!hasAccess) {
          await logUnauthorizedAccess({
            userId: req.context.user.id,
            tenantId: tenantId,
            action: "access",
            resource: req.path,
            reason: "User does not have access to tenant",
            ipAddress: req.ip || req.socket?.remoteAddress,
            userAgent: req.get("user-agent"),
            requestPath: req.path,
            requestMethod: req.method,
          });

          return res.status(403).json({
            message: "Access denied to this tenant",
            code: "TENANT_ACCESS_DENIED",
          });
        }
      }

      next();
    } catch (error) {
      if (error instanceof TenantIsolationError) {
        await logUnauthorizedAccess({
          userId: req.context?.user?.id,
          tenantId: req.context?.tenant?.id,
          action: "access",
          resource: req.path,
          reason: error.message,
          ipAddress: req.ip || req.socket?.remoteAddress,
          userAgent: req.get("user-agent"),
          requestPath: req.path,
          requestMethod: req.method,
        });

        return res.status(error.statusCode).json({
          message: error.message,
          code: error.code,
        });
      }
      next(error);
    }
  };
}

export function createTenantScopedMiddlewareStack(options?: { 
  blockBusinessType?: boolean;
  requireAuth?: boolean;
}) {
  const { authenticateJWT } = require("./auth-middleware");
  const opts = { blockBusinessType: true, requireAuth: true, ...options };
  
  const stack: any[] = [];
  
  if (opts.requireAuth) {
    stack.push(authenticateJWT({ required: true }));
  }
  
  stack.push(tenantResolutionMiddleware());
  stack.push(tenantIsolationMiddleware());
  
  if (opts.blockBusinessType) {
    stack.push(blockBusinessTypeModification());
  }
  
  return stack;
}
