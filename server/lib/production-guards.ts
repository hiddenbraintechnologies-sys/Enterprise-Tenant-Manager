/**
 * Production Safety Guards
 * Ensures unsafe operations are disabled in production.
 */

import type { Request, Response, NextFunction } from "express";

const isProduction = process.env.NODE_ENV === "production";

/**
 * Middleware to block seed/demo endpoints in production
 */
export function blockInProduction(endpointName: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (isProduction) {
      console.warn(`[production-guard] Blocked access to ${endpointName} in production from ${req.ip}`);
      return res.status(403).json({
        error: "Forbidden",
        message: "This endpoint is disabled in production",
        code: "PRODUCTION_BLOCKED",
      });
    }
    next();
  };
}

/**
 * Check if we're in production environment
 */
export function isProductionEnvironment(): boolean {
  return isProduction;
}

/**
 * Log rate limit configuration at boot
 */
export function logRateLimitStatus(): void {
  const skipRateLimit = process.env.SKIP_RATE_LIMIT === "true";
  const nodeEnv = process.env.NODE_ENV || "development";
  
  if (isProduction) {
    console.log("[rate-limit] Rate limiting is ENFORCED in production");
    if (skipRateLimit) {
      console.warn("[rate-limit] SKIP_RATE_LIMIT=true is IGNORED in production (security measure)");
    }
  } else {
    if (skipRateLimit) {
      console.warn(`[rate-limit] Rate limiting BYPASSED (SKIP_RATE_LIMIT=true, env=${nodeEnv})`);
    } else {
      console.log(`[rate-limit] Rate limiting is ENABLED (env=${nodeEnv})`);
    }
  }
}

/**
 * List of seed/demo endpoint patterns that should be blocked in production
 */
export const BLOCKED_PRODUCTION_ENDPOINTS = [
  "/api/seed",
  "/api/demo",
  "/api/test-data",
  "/api/mock",
  "/api/reset-demo",
  "/api/clear-data",
];

/**
 * Middleware to apply production guards to all known unsafe endpoints
 */
export function productionGuardMiddleware(req: Request, res: Response, next: NextFunction) {
  if (!isProduction) {
    return next();
  }

  const path = req.path.toLowerCase();
  
  for (const pattern of BLOCKED_PRODUCTION_ENDPOINTS) {
    if (path.startsWith(pattern)) {
      console.warn(`[production-guard] Blocked ${req.method} ${req.path} in production`);
      return res.status(403).json({
        error: "Forbidden",
        message: "This endpoint is disabled in production",
        code: "PRODUCTION_BLOCKED",
      });
    }
  }
  
  next();
}
