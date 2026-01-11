import type { Request } from "express";
import { db } from "../db";
import { userTenants } from "@shared/schema";
import { eq, and, asc } from "drizzle-orm";

export interface TenantResolutionResult {
  tenantId: string | null;
  source: "header" | "context" | "default_mapping" | "first_mapping" | null;
  isMember: boolean;
  error?: {
    code: "AUTH_REQUIRED" | "TENANT_REQUIRED" | "TENANT_NOT_FOUND";
    status: 401 | 400 | 404;
    message: string;
  };
}

export async function resolveTenantId(req: Request): Promise<TenantResolutionResult> {
  const context = (req as any).context;
  const userId = context?.user?.id;
  
  if (!userId) {
    return {
      tenantId: null,
      source: null,
      isMember: false,
      error: {
        code: "AUTH_REQUIRED",
        status: 401,
        message: "Authentication required",
      },
    };
  }

  const headerTenantId = req.headers["x-tenant-id"] as string | undefined;
  let resolvedTenantId: string | null = null;
  let source: TenantResolutionResult["source"] = null;

  // SECURITY: Prefer authenticated context over header to prevent spoofing
  // Context tenant is already validated by auth middleware
  if (context?.tenant?.id) {
    resolvedTenantId = context.tenant.id;
    source = "context";
  } else if (headerTenantId) {
    resolvedTenantId = headerTenantId;
    source = "header";
  } else {
    const defaultMapping = await db
      .select({ tenantId: userTenants.tenantId })
      .from(userTenants)
      .where(and(eq(userTenants.userId, userId), eq(userTenants.isDefault, true)))
      .limit(1);

    if (defaultMapping.length > 0) {
      resolvedTenantId = defaultMapping[0].tenantId;
      source = "default_mapping";
    } else {
      const firstMapping = await db
        .select({ tenantId: userTenants.tenantId })
        .from(userTenants)
        .where(eq(userTenants.userId, userId))
        .orderBy(asc(userTenants.joinedAt))
        .limit(1);

      if (firstMapping.length > 0) {
        resolvedTenantId = firstMapping[0].tenantId;
        source = "first_mapping";
      }
    }
  }

  if (!resolvedTenantId) {
    return {
      tenantId: null,
      source: null,
      isMember: false,
      error: {
        code: "TENANT_REQUIRED",
        status: 400,
        message: "Tenant context required",
      },
    };
  }

  if (source === "header" || source === "context") {
    const memberCheck = await db
      .select({ id: userTenants.id })
      .from(userTenants)
      .where(and(eq(userTenants.userId, userId), eq(userTenants.tenantId, resolvedTenantId)))
      .limit(1);

    if (memberCheck.length === 0) {
      return {
        tenantId: null,
        source,
        isMember: false,
        error: {
          code: "TENANT_NOT_FOUND",
          status: 404,
          message: "Tenant not found",
        },
      };
    }
  }

  return {
    tenantId: resolvedTenantId,
    source,
    isMember: true,
  };
}

export function logTenantResolution(
  req: Request,
  result: TenantResolutionResult,
  endpoint: string
): void {
  if (process.env.NODE_ENV !== "development") return;

  const context = (req as any).context;
  const userId = context?.user?.id;
  const maskedUserId = userId ? `...${userId.slice(-6)}` : "none";
  const hasCookie = Boolean(req.cookies?.tenantId);
  const xTenantId = req.headers["x-tenant-id"] || null;

  console.log(
    `[tenant-resolve] ${endpoint} | ` +
      `hasCookie=${hasCookie} | ` +
      `xTenantId=${xTenantId || "null"} | ` +
      `resolved=${result.tenantId || "null"} (${result.source || "none"}) | ` +
      `user=${maskedUserId}`
  );
}
