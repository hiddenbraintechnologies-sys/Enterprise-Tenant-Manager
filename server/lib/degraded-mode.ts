/**
 * Degraded Mode Middleware
 * Blocks all non-health endpoints when application is in degraded mode.
 */

import type { Request, Response, NextFunction } from "express";
import { isDegradedMode } from "./startup-config";

const ALLOWED_PATHS = [
  "/health",
  "/health/db",
  "/health/ready",
  "/api/health",
  "/api/health/db",
  "/api/health/ready",
];

export function degradedModeMiddleware(req: Request, res: Response, next: NextFunction) {
  if (!isDegradedMode()) {
    return next();
  }

  const path = req.path.toLowerCase();
  
  for (const allowed of ALLOWED_PATHS) {
    if (path === allowed || path.startsWith(`${allowed}/`)) {
      return next();
    }
  }

  console.warn(`[degraded-mode] Blocked ${req.method} ${req.path} - application in degraded mode`);
  
  return res.status(503).json({
    error: "Service Unavailable",
    code: "DEGRADED_MODE",
    message: "Application is running in degraded mode due to configuration issues. Only health endpoints are available.",
    timestamp: new Date().toISOString(),
  });
}
