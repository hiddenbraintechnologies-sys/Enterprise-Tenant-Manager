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
    const host = req.hostname || req.get("host") || "";
    
    if (!this.config.subdomainBase || !host.endsWith(this.config.subdomainBase.slice(1))) {
      return null;
    }

    const subdomain = host.replace(this.config.subdomainBase.slice(1), "").replace(/\.$/, "");
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
    const jwtPayload = (req as any).jwtPayload;
    if (!jwtPayload?.tnt) {
      return null;
    }

    return this.getTenantById(jwtPayload.tnt);
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
  const resolver = new TenantResolver(config);
  
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
