/**
 * Audit Wrapper for consistent audit logging
 * 
 * This wrapper ensures that all sensitive endpoints automatically log
 * audit events with SUCCESS/FAIL outcomes, eliminating the risk of
 * developers forgetting to add audit logging.
 */

import type { Request, Response, NextFunction } from "express";
import { logSoc2Audit, type Soc2AuditAction, type Soc2AuditTargetType } from "../services/soc2-audit";
import { getRequestContext } from "./logAudit";

interface AuthUser {
  id: string;
  tenantId: string;
  isImpersonating?: boolean;
  realUserId?: string;
  permissions?: string[];
}

interface AuditWrapOptions {
  action: Soc2AuditAction;
  targetType?: Soc2AuditTargetType;
  getTargetId?: (req: Request) => string | undefined;
  getBefore?: (req: Request) => Record<string, unknown> | undefined;
  getAfter?: (req: Request, result?: unknown) => Record<string, unknown> | undefined;
  getMetadata?: (req: Request) => Record<string, unknown> | undefined;
}

/**
 * Wraps a route handler with automatic audit logging.
 * 
 * Usage:
 * ```
 * router.post(
 *   "/security/sessions/:sessionId/revoke",
 *   requireStepUp("revoke_session"),
 *   withAudit(
 *     async (req, res) => {
 *       // ... revoke logic ...
 *       res.json({ success: true });
 *     },
 *     { 
 *       action: "session.revoke", 
 *       targetType: "session", 
 *       getTargetId: (req) => req.params.sessionId 
 *     }
 *   )
 * );
 * ```
 */
export function withAudit(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<void> | void,
  options: AuditWrapOptions
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user as AuthUser | undefined;
    const { ipAddress, userAgent } = getRequestContext(req);

    // Capture before state if provided
    const beforeValue = options.getBefore?.(req);

    try {
      // Execute the handler
      await handler(req, res, next);

      // If handler already responded with error, skip success audit
      if (res.headersSent && res.statusCode >= 400) {
        return;
      }

      // Log success audit
      if (user) {
        await logSoc2Audit({
          tenantId: user.tenantId,
          actorUserId: user.id,
          action: options.action,
          targetType: options.targetType,
          targetId: options.getTargetId?.(req),
          outcome: "success",
          ipAddress,
          userAgent,
          isImpersonating: user.isImpersonating,
          realUserId: user.realUserId,
          beforeValue,
          afterValue: options.getAfter?.(req),
          metadata: options.getMetadata?.(req),
        });
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      
      // Log failure audit
      if (user) {
        await logSoc2Audit({
          tenantId: user.tenantId,
          actorUserId: user.id,
          action: options.action,
          targetType: options.targetType,
          targetId: options.getTargetId?.(req),
          outcome: "fail",
          failureReason: errorMessage,
          ipAddress,
          userAgent,
          isImpersonating: user.isImpersonating,
          realUserId: user.realUserId,
          beforeValue,
          metadata: options.getMetadata?.(req),
        });
      }

      // Re-throw or pass to error handler
      next(error);
    }
  };
}

/**
 * Creates a middleware that logs audit events for the current request.
 * Use this when you need more control over when the audit is logged.
 */
export function createAuditLogger(options: AuditWrapOptions) {
  return async (req: Request, _res: Response, outcome: "success" | "fail", additionalData?: {
    failureReason?: string;
    afterValue?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
  }) => {
    const user = req.user as AuthUser | undefined;
    if (!user) return;

    const { ipAddress, userAgent } = getRequestContext(req);

    await logSoc2Audit({
      tenantId: user.tenantId,
      actorUserId: user.id,
      action: options.action,
      targetType: options.targetType,
      targetId: options.getTargetId?.(req),
      outcome,
      failureReason: additionalData?.failureReason,
      ipAddress,
      userAgent,
      isImpersonating: user.isImpersonating,
      realUserId: user.realUserId,
      beforeValue: options.getBefore?.(req),
      afterValue: additionalData?.afterValue,
      metadata: additionalData?.metadata || options.getMetadata?.(req),
    });
  };
}
