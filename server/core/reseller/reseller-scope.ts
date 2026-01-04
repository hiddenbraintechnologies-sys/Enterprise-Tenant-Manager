import { Request, Response, NextFunction } from "express";
import { db } from "../../db";
import { tenants, resellerProfiles } from "@shared/schema";
import { eq, and, isNull } from "drizzle-orm";

export interface ResellerContext {
  isReseller: boolean;
  resellerId: string | null;
  parentResellerId: string | null;
  tenantType: "platform" | "reseller" | "direct";
  resellerProfile: typeof resellerProfiles.$inferSelect | null;
}

declare global {
  namespace Express {
    interface Request {
      resellerContext?: ResellerContext;
    }
  }
}

export async function resolveResellerContext(tenantId: string): Promise<ResellerContext> {
  const [tenant] = await db
    .select()
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);

  if (!tenant) {
    return {
      isReseller: false,
      resellerId: null,
      parentResellerId: null,
      tenantType: "direct",
      resellerProfile: null,
    };
  }

  let resellerProfile = null;
  if (tenant.tenantType === "reseller") {
    const [profile] = await db
      .select()
      .from(resellerProfiles)
      .where(eq(resellerProfiles.tenantId, tenantId))
      .limit(1);
    resellerProfile = profile || null;
  }

  return {
    isReseller: tenant.tenantType === "reseller",
    resellerId: tenant.tenantType === "reseller" ? tenantId : null,
    parentResellerId: tenant.parentResellerId,
    tenantType: (tenant.tenantType || "direct") as "platform" | "reseller" | "direct",
    resellerProfile,
  };
}

export function resellerContextMiddleware() {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as any).user;
      if (user?.tenantId) {
        req.resellerContext = await resolveResellerContext(user.tenantId);
      }
      next();
    } catch (error) {
      console.error("Error resolving reseller context:", error);
      next();
    }
  };
}

export function requireReseller() {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.resellerContext?.isReseller) {
      return res.status(403).json({ error: "Reseller access required" });
    }

    if (req.resellerContext.resellerProfile?.status !== "active") {
      return res.status(403).json({ error: "Reseller account is not active" });
    }

    next();
  };
}

export async function validateResellerHierarchy(
  requestorTenantId: string,
  targetTenantId: string
): Promise<{ valid: boolean; reason?: string }> {
  if (requestorTenantId === targetTenantId) {
    return { valid: true };
  }

  const [requestor] = await db
    .select()
    .from(tenants)
    .where(eq(tenants.id, requestorTenantId))
    .limit(1);

  if (!requestor) {
    return { valid: false, reason: "Requestor tenant not found" };
  }

  if (requestor.tenantType === "platform") {
    return { valid: true };
  }

  if (requestor.tenantType === "reseller") {
    const [target] = await db
      .select()
      .from(tenants)
      .where(
        and(
          eq(tenants.id, targetTenantId),
          eq(tenants.parentResellerId, requestorTenantId),
          isNull(tenants.deletedAt)
        )
      )
      .limit(1);

    if (target) {
      return { valid: true };
    }
    return { valid: false, reason: "Target tenant is not a child of this reseller" };
  }

  return { valid: false, reason: "Insufficient permissions" };
}

export function resellerScopeGuard() {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    if (["super_admin", "admin"].includes(user.role)) {
      return next();
    }

    const targetTenantId = req.params.tenantId || req.params.resellerId || req.body?.tenantId;
    
    if (!targetTenantId) {
      return next();
    }

    const validation = await validateResellerHierarchy(user.tenantId, targetTenantId);
    if (!validation.valid) {
      return res.status(403).json({ error: validation.reason || "Access denied" });
    }

    next();
  };
}

export async function getResellerHierarchyChain(tenantId: string): Promise<string[]> {
  const chain: string[] = [tenantId];
  
  let currentTenantId = tenantId;
  let depth = 0;
  const maxDepth = 10;

  while (depth < maxDepth) {
    const [tenant] = await db
      .select()
      .from(tenants)
      .where(eq(tenants.id, currentTenantId))
      .limit(1);

    if (!tenant || !tenant.parentResellerId) {
      break;
    }

    chain.push(tenant.parentResellerId);
    currentTenantId = tenant.parentResellerId;
    depth++;
  }

  return chain;
}

export async function isChildOfReseller(
  childTenantId: string,
  resellerId: string
): Promise<boolean> {
  const chain = await getResellerHierarchyChain(childTenantId);
  return chain.includes(resellerId);
}

export async function getAllChildTenantIds(resellerId: string): Promise<string[]> {
  const childTenants = await db
    .select({ id: tenants.id })
    .from(tenants)
    .where(
      and(
        eq(tenants.parentResellerId, resellerId),
        isNull(tenants.deletedAt)
      )
    );

  return childTenants.map((t) => t.id);
}
