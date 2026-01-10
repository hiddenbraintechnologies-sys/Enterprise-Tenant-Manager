/**
 * Slow Query Logger
 * Logs database queries that exceed threshold without leaking PII.
 */

const SLOW_QUERY_THRESHOLD_MS = parseInt(process.env.SLOW_QUERY_THRESHOLD || "500", 10);

interface SlowQueryLog {
  duration: number;
  operation: string;
  table?: string;
  threshold: number;
  timestamp: string;
  correlationId?: string;
}

/**
 * Log a slow query (sanitized - no PII)
 */
export function logSlowQuery(
  duration: number,
  operation: string,
  table?: string,
  correlationId?: string
): void {
  if (duration < SLOW_QUERY_THRESHOLD_MS) {
    return;
  }

  const log: SlowQueryLog = {
    duration,
    operation: sanitizeOperation(operation),
    table: table ? sanitizeTableName(table) : undefined,
    threshold: SLOW_QUERY_THRESHOLD_MS,
    timestamp: new Date().toISOString(),
    correlationId,
  };

  console.warn(`[slow-query] ${log.operation} on ${log.table || "unknown"} took ${log.duration}ms (threshold: ${log.threshold}ms) [${log.correlationId || "no-correlation"}]`);
}

/**
 * Sanitize operation string - remove any potential PII
 */
function sanitizeOperation(operation: string): string {
  // Only keep the operation type (SELECT, INSERT, UPDATE, DELETE)
  const match = operation.match(/^(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP)/i);
  return match ? match[1].toUpperCase() : "QUERY";
}

/**
 * Sanitize table name - only allow alphanumeric and underscores
 */
function sanitizeTableName(table: string): string {
  return table.replace(/[^a-zA-Z0-9_]/g, "").substring(0, 50);
}

/**
 * Wrap a database operation with slow query logging
 */
export async function withSlowQueryLogging<T>(
  operation: string,
  table: string,
  fn: () => Promise<T>,
  correlationId?: string
): Promise<T> {
  const start = Date.now();
  try {
    return await fn();
  } finally {
    const duration = Date.now() - start;
    logSlowQuery(duration, operation, table, correlationId);
  }
}

/**
 * Get current slow query threshold
 */
export function getSlowQueryThreshold(): number {
  return SLOW_QUERY_THRESHOLD_MS;
}
