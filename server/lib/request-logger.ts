/**
 * Request Logger Middleware
 * Lightweight request logging with method, route, status, latency.
 * Includes correlation ID for request tracing.
 */

import type { Request, Response, NextFunction } from "express";
import crypto from "crypto";

declare global {
  namespace Express {
    interface Request {
      correlationId?: string;
      requestStartTime?: number;
    }
  }
}

export interface RequestLogEntry {
  correlationId: string;
  method: string;
  path: string;
  status: number;
  latencyMs: number;
  timestamp: string;
  userAgent?: string;
  ip?: string;
}

/**
 * Generate a unique correlation ID for request tracing
 */
export function generateCorrelationId(): string {
  return crypto.randomBytes(8).toString("hex");
}

/**
 * Request logger middleware
 * Attaches correlation ID and logs request completion
 */
export function requestLoggerMiddleware(req: Request, res: Response, next: NextFunction) {
  // Generate or use existing correlation ID
  req.correlationId = (req.headers["x-correlation-id"] as string) || generateCorrelationId();
  req.requestStartTime = Date.now();

  // Set correlation ID in response header for client tracking
  res.setHeader("X-Correlation-Id", req.correlationId);

  // Log on response finish
  res.on("finish", () => {
    const latencyMs = Date.now() - (req.requestStartTime || Date.now());
    
    // Skip logging for health checks and static assets to reduce noise
    if (req.path === "/health" || req.path === "/health/db" || !req.path.startsWith("/api")) {
      return;
    }

    const entry: RequestLogEntry = {
      correlationId: req.correlationId!,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      latencyMs,
      timestamp: new Date().toISOString(),
    };

    // Log slow requests with more detail
    if (latencyMs > 1000) {
      console.warn(`[request] SLOW ${entry.method} ${entry.path} ${entry.status} ${latencyMs}ms [${entry.correlationId}]`);
    }
  });

  next();
}

/**
 * Get correlation ID from request
 */
export function getCorrelationId(req: Request): string {
  return req.correlationId || "unknown";
}
