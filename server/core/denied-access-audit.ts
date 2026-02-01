import { Request } from "express";
import { auditService } from "./audit";

export type DeniedAccessType = 
  | "ACCESS_DENIED_TENANT" 
  | "ACCESS_DENIED_ADDON" 
  | "ACCESS_DENIED_ADMIN";

export interface DeniedAccessContext {
  eventType: DeniedAccessType;
  tenantId?: string | null;
  userId?: string | null;
  route: string;
  method: string;
  resourceType?: string;
  resourceId?: string;
  reasonCode: string;
  addonCode?: string;
  dependency?: string;
}

const rateLimitCache = new Map<string, number>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_LOGS_PER_WINDOW = 1;

function getRateLimitKey(ctx: DeniedAccessContext): string {
  return `${ctx.userId || "anon"}:${ctx.eventType}:${ctx.route}`;
}

function isRateLimited(ctx: DeniedAccessContext): boolean {
  const key = getRateLimitKey(ctx);
  const now = Date.now();
  const lastLog = rateLimitCache.get(key);
  
  if (lastLog && now - lastLog < RATE_LIMIT_WINDOW_MS) {
    return true;
  }
  
  rateLimitCache.set(key, now);
  
  if (rateLimitCache.size > 10000) {
    const cutoff = now - RATE_LIMIT_WINDOW_MS;
    for (const [k, v] of rateLimitCache) {
      if (v < cutoff) {
        rateLimitCache.delete(k);
      }
    }
  }
  
  return false;
}

export async function auditDeniedAccess(
  ctx: DeniedAccessContext,
  req: Request
): Promise<void> {
  if (process.env.ENABLE_DENIED_ACCESS_AUDIT_LOGS === "false") {
    return;
  }

  if (isRateLimited(ctx)) {
    return;
  }

  try {
    await auditService.logAsync({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      action: "access",
      resource: ctx.eventType,
      resourceId: ctx.resourceId,
      metadata: {
        route: ctx.route,
        method: ctx.method,
        resourceType: ctx.resourceType,
        reasonCode: ctx.reasonCode,
        addonCode: ctx.addonCode,
        dependency: ctx.dependency,
      },
      ipAddress: req.ip || req.headers["x-forwarded-for"]?.toString().split(",")[0],
      userAgent: req.headers["user-agent"],
    });
  } catch (error) {
    console.error("[denied-access-audit] Failed to log:", error);
  }
}

export function auditDeniedAccessFromReq(
  eventType: DeniedAccessType,
  req: Request,
  reasonCode: string,
  extras?: {
    resourceType?: string;
    resourceId?: string;
    addonCode?: string;
    dependency?: string;
  }
): void {
  const ctx: DeniedAccessContext = {
    eventType,
    tenantId: (req as any).context?.tenant?.id || req.headers["x-tenant-id"]?.toString(),
    userId: (req as any).context?.user?.id || (req as any).user?.id,
    route: req.originalUrl || req.url,
    method: req.method,
    reasonCode,
    ...extras,
  };

  auditDeniedAccess(ctx, req).catch(() => {});
}
