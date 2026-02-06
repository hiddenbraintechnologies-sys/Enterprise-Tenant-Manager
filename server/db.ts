import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

// Slow query threshold in milliseconds
const SLOW_QUERY_THRESHOLD = parseInt(process.env.SLOW_QUERY_THRESHOLD || "500", 10);

// Lazy initialization to allow server to start before database is ready
let _pool: pg.Pool | null = null;
let _db: ReturnType<typeof drizzle> | null = null;

/**
 * Extract operation type from SQL (sanitized - no PII)
 */
function extractOperation(sql: string): string {
  const match = sql.match(/^\s*(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP)/i);
  return match ? match[1].toUpperCase() : "QUERY";
}

/**
 * Extract table name from SQL (sanitized - no PII)
 */
function extractTable(sql: string): string {
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
 * Log slow queries without exposing PII
 */
function logSlowQuery(sql: string, duration: number): void {
  if (duration >= SLOW_QUERY_THRESHOLD) {
    const operation = extractOperation(sql);
    const table = extractTable(sql);
    console.warn(`[slow-query] ${operation} on ${table} took ${duration}ms (threshold: ${SLOW_QUERY_THRESHOLD}ms)`);
  }
}

function getPool(): pg.Pool {
  if (!_pool) {
    if (!process.env.DATABASE_URL) {
      console.error("[db] DATABASE_URL is not set. Database operations will fail.");
      throw new Error(
        "DATABASE_URL must be set. Did you forget to provision a database?",
      );
    }
    
    const isProduction = process.env.NODE_ENV === "production";
    
    _pool = new Pool({ 
      connectionString: process.env.DATABASE_URL,
      connectionTimeoutMillis: isProduction ? 10000 : 30000,
      idleTimeoutMillis: 30000,
      max: isProduction ? 10 : 20,
      ssl: process.env.DATABASE_URL?.includes('sslmode=require') ? { rejectUnauthorized: false } : false,
    });
    
    console.log("[db] Database pool created successfully");
    
    _pool.on('error', (err) => {
      console.error('[db] Unexpected pool error:', err.message);
    });

    // Wrap the pool's query method to log slow queries
    const originalQuery = _pool.query.bind(_pool) as (...args: unknown[]) => Promise<unknown>;
    (_pool as any).query = async function(this: unknown, ...args: unknown[]) {
      const start = Date.now();
      try {
        const result = await originalQuery.apply(this, args);
        const duration = Date.now() - start;
        
        // Extract SQL from query arguments
        const firstArg = args[0];
        const sql = typeof firstArg === 'string' 
          ? firstArg 
          : (firstArg && typeof firstArg === 'object' && 'text' in firstArg ? String((firstArg as any).text) : '');
        logSlowQuery(sql, duration);
        
        return result;
      } catch (error) {
        const duration = Date.now() - start;
        const firstArg = args[0];
        const sql = typeof firstArg === 'string' 
          ? firstArg 
          : (firstArg && typeof firstArg === 'object' && 'text' in firstArg ? String((firstArg as any).text) : '');
        logSlowQuery(sql, duration);
        throw error;
      }
    };
  }
  return _pool;
}

// Export pool getter for direct access when needed
export const pool = new Proxy({} as pg.Pool, {
  get(_target, prop) {
    return (getPool() as any)[prop];
  }
});

// Export db instance - lazy initialized
export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(_target, prop) {
    if (!_db) {
      _db = drizzle(getPool(), { schema });
    }
    return (_db as any)[prop];
  }
});
