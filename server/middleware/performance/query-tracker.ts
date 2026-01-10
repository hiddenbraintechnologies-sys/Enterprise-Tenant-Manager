/**
 * Query Tracker Middleware
 * 
 * Tracks database queries per request to detect N+1 patterns
 * and measure query performance.
 */

import { Request, Response, NextFunction } from 'express';

interface QueryRecord {
  sql: string;
  duration: number;
  timestamp: number;
  signature: string;
}

interface QueryStats {
  totalQueries: number;
  totalDuration: number;
  slowQueries: QueryRecord[];
  duplicateQueries: Map<string, number>;
  n1Candidates: string[];
}

// Extend Express Request to include query tracker
declare global {
  namespace Express {
    interface Request {
      queryTracker?: QueryTracker;
    }
  }
}

class QueryTracker {
  private queries: QueryRecord[] = [];
  private requestId: string;
  private tenantId: string | null;
  private startTime: number;

  constructor(requestId: string, tenantId: string | null = null) {
    this.requestId = requestId;
    this.tenantId = tenantId;
    this.startTime = Date.now();
  }

  /**
   * Generate a signature for the query (normalized for comparison)
   */
  private generateSignature(sql: string): string {
    return sql
      .replace(/\$\d+/g, '?')           // Replace $1, $2 with ?
      .replace(/\d+/g, 'N')             // Replace numbers with N
      .replace(/'[^']*'/g, "'?'")       // Replace string literals
      .replace(/\s+/g, ' ')             // Normalize whitespace
      .trim()
      .toLowerCase();
  }

  /**
   * Record a query execution
   */
  record(sql: string, duration: number): void {
    const signature = this.generateSignature(sql);
    
    this.queries.push({
      sql,
      duration,
      timestamp: Date.now(),
      signature,
    });

    // Log slow queries (>500ms) without PII
    const SLOW_QUERY_THRESHOLD = parseInt(process.env.SLOW_QUERY_THRESHOLD || "500", 10);
    if (duration > SLOW_QUERY_THRESHOLD) {
      const operation = this.extractOperation(sql);
      const table = this.extractTable(sql);
      console.warn(`[slow-query] ${operation} on ${table} took ${duration}ms (threshold: ${SLOW_QUERY_THRESHOLD}ms) [${this.requestId}]`);
    }
  }

  /**
   * Extract operation type from SQL (sanitized)
   */
  private extractOperation(sql: string): string {
    const match = sql.match(/^(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP)/i);
    return match ? match[1].toUpperCase() : "QUERY";
  }

  /**
   * Extract table name from SQL (sanitized)
   */
  private extractTable(sql: string): string {
    const patterns = [
      /FROM\s+["']?(\w+)["']?/i,
      /INTO\s+["']?(\w+)["']?/i,
      /UPDATE\s+["']?(\w+)["']?/i,
      /TABLE\s+["']?(\w+)["']?/i,
    ];
    for (const pattern of patterns) {
      const match = sql.match(pattern);
      if (match) {
        return match[1].substring(0, 50);
      }
    }
    return "unknown";
  }

  /**
   * Get statistics about queries in this request
   */
  getStats(): QueryStats {
    const duplicateQueries = new Map<string, number>();
    const slowQueries: QueryRecord[] = [];
    let totalDuration = 0;

    for (const query of this.queries) {
      totalDuration += query.duration;

      // Track duplicate signatures
      const count = duplicateQueries.get(query.signature) || 0;
      duplicateQueries.set(query.signature, count + 1);

      // Track slow queries (> 100ms)
      if (query.duration > 100) {
        slowQueries.push(query);
      }
    }

    // Identify N+1 candidates (same signature executed 3+ times)
    const n1Candidates = Array.from(duplicateQueries.entries())
      .filter(([_, count]) => count >= 3)
      .map(([signature, count]) => {
        const example = this.queries.find(q => q.signature === signature);
        return `${signature} (executed ${count} times, example: ${example?.sql.substring(0, 100)}...)`;
      });

    return {
      totalQueries: this.queries.length,
      totalDuration,
      slowQueries,
      duplicateQueries,
      n1Candidates,
    };
  }

  /**
   * Check for N+1 query patterns
   */
  hasN1Pattern(): boolean {
    const stats = this.getStats();
    return stats.n1Candidates.length > 0;
  }

  /**
   * Get summary for logging
   */
  getSummary(): object {
    const stats = this.getStats();
    return {
      requestId: this.requestId,
      tenantId: this.tenantId,
      totalQueries: stats.totalQueries,
      totalDuration: stats.totalDuration,
      slowQueryCount: stats.slowQueries.length,
      n1Detected: stats.n1Candidates.length > 0,
      n1Candidates: stats.n1Candidates,
      requestDuration: Date.now() - this.startTime,
    };
  }
}

/**
 * Middleware to attach query tracker to requests
 */
export function queryTrackerMiddleware(
  req: Request, 
  res: Response, 
  next: NextFunction
): void {
  const requestId = req.headers['x-request-id'] as string || 
    `req-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  const tenantId = req.headers['x-tenant-id'] as string || null;

  req.queryTracker = new QueryTracker(requestId, tenantId);

  // Log query stats on response finish
  res.on('finish', () => {
    if (req.queryTracker) {
      const stats = req.queryTracker.getStats();
      
      // Log warnings for potential issues
      if (stats.n1Candidates.length > 0) {
        console.warn('[PERFORMANCE] N+1 query pattern detected:', {
          path: req.path,
          method: req.method,
          ...req.queryTracker.getSummary(),
        });
      } else if (stats.totalQueries > 10) {
        console.warn('[PERFORMANCE] High query count:', {
          path: req.path,
          method: req.method,
          queryCount: stats.totalQueries,
          duration: stats.totalDuration,
        });
      }
    }
  });

  next();
}

/**
 * Wrap a database client to track queries
 */
export function wrapDatabaseClient<T extends object>(
  client: T,
  req: Request | null
): T {
  return new Proxy(client, {
    get(target, prop) {
      const original = (target as any)[prop];
      
      if (typeof original === 'function' && prop === 'query') {
        return async function(...args: any[]) {
          const start = Date.now();
          try {
            const result = await original.apply(target, args);
            const duration = Date.now() - start;
            
            // Record query if tracker is available
            if (req?.queryTracker && args[0]) {
              const sql = typeof args[0] === 'string' ? args[0] : args[0].text || '';
              req.queryTracker.record(sql, duration);
            }
            
            return result;
          } catch (error) {
            throw error;
          }
        };
      }
      
      return original;
    },
  });
}

export { QueryTracker };
