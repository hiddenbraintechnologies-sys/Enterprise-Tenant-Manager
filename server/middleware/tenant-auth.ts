import { Request, Response, NextFunction } from "express";
import { db } from "../db";
import { tenants, users, userTenants } from "@shared/schema";
import { eq, and } from "drizzle-orm";

export interface TenantContext {
  tenantId: string;
  subdomain?: string;
  domain?: string;
}

export function extractTenantFromRequest(req: Request): TenantContext | null {
  const tenantId = req.headers["x-tenant-id"] as string;
  if (tenantId) {
    return { tenantId };
  }

  const queryTenantId = req.query.tenantId as string;
  if (queryTenantId) {
    return { tenantId: queryTenantId };
  }

  const bodyTenantId = req.body?.tenantId;
  if (bodyTenantId) {
    return { tenantId: bodyTenantId };
  }

  const host = req.headers.host || "";
  const hostParts = host.split(".");
  
  if (hostParts.length >= 3) {
    const subdomain = hostParts[0];
    if (subdomain && subdomain !== "www" && subdomain !== "api") {
      return { tenantId: subdomain, subdomain };
    }
  }

  return null;
}

export function isPublicDomain(req: Request): boolean {
  const host = req.headers.host || "";
  const publicDomains = [
    "www.payodsoft.co.uk",
    "payodsoft.co.uk",
    "localhost",
    "127.0.0.1",
  ];
  
  for (const domain of publicDomains) {
    if (host.includes(domain)) {
      return true;
    }
  }
  
  const hostParts = host.split(".");
  return hostParts.length < 3 || hostParts[0] === "www";
}

export function requireTenant() {
  return async (req: Request, res: Response, next: NextFunction) => {
    const tenantContext = extractTenantFromRequest(req);
    
    if (!tenantContext) {
      if (isPublicDomain(req)) {
        return res.status(400).json({
          error: "Tenant selection required",
          code: "TENANT_REQUIRED",
          message: "Please select a tenant or access via tenant subdomain",
          redirectUrl: "/select-tenant"
        });
      }
      return res.status(400).json({
        error: "Tenant not found",
        code: "TENANT_REQUIRED"
      });
    }

    const [tenant] = await db.select().from(tenants).where(
      eq(tenants.slug, tenantContext.tenantId)
    );
    
    if (!tenant) {
      const [tenantById] = await db.select().from(tenants).where(
        eq(tenants.id, tenantContext.tenantId)
      );
      
      if (!tenantById) {
        return res.status(404).json({
          error: "Tenant not found",
          code: "TENANT_NOT_EXIST"
        });
      }
      
      (req as any).tenantFromMiddleware = tenantById;
    } else {
      (req as any).tenantFromMiddleware = tenant;
    }

    next();
  };
}

export function requireAuth() {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.context?.user) {
      const isApiRequest = req.path.startsWith("/api/");
      
      if (isApiRequest) {
        return res.status(401).json({
          error: "Authentication required",
          code: "AUTH_REQUIRED"
        });
      }

      const tenantContext = extractTenantFromRequest(req);
      const redirectUrl = tenantContext 
        ? `/login?tenant=${tenantContext.tenantId}`
        : "/login";
      
      return res.redirect(redirectUrl);
    }

    next();
  };
}

export function requireDashboardAccess() {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.context?.user) {
      return res.status(401).json({
        error: "Authentication required",
        code: "AUTH_REQUIRED",
        redirectUrl: "/login"
      });
    }

    if (!req.context?.tenant) {
      return res.status(400).json({
        error: "Tenant context required",
        code: "TENANT_REQUIRED",
        redirectUrl: "/select-tenant"
      });
    }

    // JWT uses 'tnt' claim for tenant ID (check both for compatibility)
    const tokenTenantId = (req.tokenPayload as any)?.tnt || req.tokenPayload?.tenantId;
    const requestTenantId = req.context.tenant.id;
    
    if (tokenTenantId && tokenTenantId !== requestTenantId) {
      return res.status(403).json({
        error: "Cross-tenant access denied",
        code: "TENANT_MISMATCH",
        message: "Your session is for a different tenant"
      });
    }

    next();
  };
}

export async function validateUserTenantAccess(
  userId: string, 
  tenantId: string
): Promise<{ valid: boolean; roleId?: string; error?: string }> {
  const [userTenantRecord] = await db.select()
    .from(userTenants)
    .where(and(
      eq(userTenants.userId, userId),
      eq(userTenants.tenantId, tenantId)
    ));

  if (!userTenantRecord) {
    return { valid: false, error: "User does not have access to this tenant" };
  }

  return { valid: true, roleId: userTenantRecord.roleId };
}

export async function resolveTenantByIdentifier(
  identifier: string
): Promise<{ tenant: any; error?: string } | null> {
  let [tenant] = await db.select().from(tenants).where(
    eq(tenants.slug, identifier)
  );
  
  if (!tenant) {
    [tenant] = await db.select().from(tenants).where(
      eq(tenants.id, identifier)
    );
  }
  
  if (!tenant) {
    [tenant] = await db.select().from(tenants).where(
      eq(tenants.name, identifier)
    );
  }

  if (!tenant) {
    return null;
  }

  return { tenant };
}
