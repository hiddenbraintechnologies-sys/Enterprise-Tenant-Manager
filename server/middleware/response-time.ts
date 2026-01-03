/**
 * Enhanced Response Time Logging Middleware
 * 
 * Tracks and logs API response times with detailed metrics.
 */

import { Request, Response, NextFunction } from 'express';
import { metrics } from './performance/metrics';

interface ResponseTimeOptions {
  threshold?: number;      // Log warning if response takes longer (ms)
  logSlowRequests?: boolean;
}

interface RequestTimings {
  start: number;
  dbTime: number;
  cacheTime: number;
}

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      timings?: RequestTimings;
    }
  }
}

const defaultOptions: ResponseTimeOptions = {
  threshold: 1000,        // 1 second
  logSlowRequests: true,
};

/**
 * Response time middleware with detailed logging
 */
export function responseTimeMiddleware(options: ResponseTimeOptions = {}): (req: Request, res: Response, next: NextFunction) => void {
  const opts = { ...defaultOptions, ...options };

  return (req: Request, res: Response, next: NextFunction) => {
    const start = process.hrtime.bigint();
    
    // Initialize request timings
    req.timings = {
      start: Date.now(),
      dbTime: 0,
      cacheTime: 0,
    };

    // Log metrics on response finish (don't try to set headers)
    res.on('finish', () => {
      const duration = Number(process.hrtime.bigint() - start) / 1e6; // Convert to ms
      const durationMs = Math.round(duration * 100) / 100;

      // Track metrics for API requests
      if (req.path.startsWith('/api')) {
        const route = getRoutePattern(req);
        metrics.observeHistogram('http_request_duration_seconds', duration / 1000, {
          method: req.method,
          path: route,
        });

        metrics.incrementCounter('http_requests_total', {
          method: req.method,
          path: route,
          status: String(res.statusCode),
        });

        // Log slow requests
        if (opts.logSlowRequests && durationMs > (opts.threshold || 1000)) {
          console.warn('[SLOW REQUEST]', {
            method: req.method,
            path: req.path,
            status: res.statusCode,
            duration: `${durationMs}ms`,
            dbTime: req.timings?.dbTime ? `${req.timings.dbTime}ms` : 'N/A',
            userId: (req as any).user?.claims?.sub,
            tenantId: req.headers['x-tenant-id'],
          });
        }
      }
    });

    next();
  };
}

/**
 * Track database query time
 */
export function trackDbTime(req: Request, duration: number): void {
  if (req.timings) {
    req.timings.dbTime += duration;
  }
}

/**
 * Track cache operation time
 */
export function trackCacheTime(req: Request, duration: number): void {
  if (req.timings) {
    req.timings.cacheTime += duration;
  }
}

/**
 * Get a normalized route pattern for metrics
 */
function getRoutePattern(req: Request): string {
  // Try to get route pattern from Express
  if (req.route?.path) {
    const basePath = req.baseUrl || '';
    return `${basePath}${req.route.path}`;
  }

  // Normalize path by replacing IDs with placeholders
  return req.path
    .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:id')
    .replace(/\/\d+/g, '/:id');
}

/**
 * Create a summary of response times for the current period
 */
export function getResponseTimeSummary(): object {
  return metrics.exportJson();
}
