/**
 * Structured Logging Module
 * Provides consistent logging format for observability and monitoring.
 */

type LogLevel = "info" | "warn" | "error" | "debug";
type LogCategory = 
  | "auth"
  | "tenant-isolation"
  | "config"
  | "database"
  | "request"
  | "security"
  | "health"
  | "startup";

interface StructuredLog {
  timestamp: string;
  level: LogLevel;
  category: LogCategory;
  message: string;
  correlationId?: string;
  tenantId?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
}

function formatLog(log: StructuredLog): string {
  const base = `[${log.timestamp}] [${log.level.toUpperCase()}] [${log.category}] ${log.message}`;
  const context = [];
  
  if (log.correlationId) context.push(`correlationId=${log.correlationId}`);
  if (log.tenantId) context.push(`tenantId=${log.tenantId}`);
  if (log.userId) context.push(`userId=${log.userId}`);
  
  if (context.length > 0) {
    return `${base} {${context.join(", ")}}`;
  }
  return base;
}

function createLog(
  level: LogLevel,
  category: LogCategory,
  message: string,
  options?: {
    correlationId?: string;
    tenantId?: string;
    userId?: string;
    metadata?: Record<string, unknown>;
  }
): void {
  const log: StructuredLog = {
    timestamp: new Date().toISOString(),
    level,
    category,
    message,
    ...options,
  };

  const formatted = formatLog(log);

  switch (level) {
    case "error":
      console.error(formatted);
      break;
    case "warn":
      console.warn(formatted);
      break;
    case "debug":
      if (process.env.NODE_ENV !== "production") {
        console.log(formatted);
      }
      break;
    default:
      console.log(formatted);
  }

  if (process.env.SENTRY_DSN && level === "error") {
    captureToSentry(log);
  }
}

function captureToSentry(log: StructuredLog): void {
  try {
    (async () => {
      const dynamicImport = new Function("specifier", "return import(specifier)");
      const Sentry = await dynamicImport("@sentry/node").catch(() => null);
      if (Sentry) {
        Sentry.captureMessage(log.message, {
          level: log.level,
          tags: {
            category: log.category,
            tenantId: log.tenantId,
          },
          extra: log.metadata,
        });
      }
    })();
  } catch {
  }
}

export const logger = {
  authFailure: (message: string, options?: { userId?: string; tenantId?: string; reason?: string; ip?: string }) => {
    createLog("warn", "auth", message, {
      tenantId: options?.tenantId,
      userId: options?.userId,
      metadata: { reason: options?.reason, ip: options?.ip },
    });
  },

  tenantIsolationBlock: (message: string, options?: { requestedTenantId?: string; actualTenantId?: string; resource?: string; correlationId?: string }) => {
    createLog("warn", "tenant-isolation", message, {
      tenantId: options?.actualTenantId,
      correlationId: options?.correlationId,
      metadata: { requestedTenantId: options?.requestedTenantId, resource: options?.resource },
    });
  },

  configError: (message: string, options?: { missingVars?: string[]; category?: string }) => {
    createLog("error", "config", message, {
      metadata: { missingVars: options?.missingVars, category: options?.category },
    });
  },

  databaseError: (message: string, options?: { error?: string; operation?: string }) => {
    createLog("error", "database", message, {
      metadata: { error: options?.error, operation: options?.operation },
    });
  },

  databaseConnection: (status: "connected" | "disconnected" | "error", options?: { error?: string }) => {
    const level: LogLevel = status === "error" ? "error" : "info";
    createLog(level, "database", `Database ${status}`, {
      metadata: { error: options?.error },
    });
  },

  securityEvent: (message: string, options?: { ip?: string; userId?: string; action?: string }) => {
    createLog("warn", "security", message, {
      userId: options?.userId,
      metadata: { ip: options?.ip, action: options?.action },
    });
  },

  healthCheck: (endpoint: string, status: "ok" | "degraded" | "unhealthy", options?: { details?: Record<string, unknown> }) => {
    const level: LogLevel = status === "unhealthy" ? "error" : status === "degraded" ? "warn" : "info";
    createLog(level, "health", `Health check ${endpoint}: ${status}`, {
      metadata: options?.details,
    });
  },

  startup: (message: string, options?: { metadata?: Record<string, unknown> }) => {
    createLog("info", "startup", message, options);
  },

  request: (method: string, path: string, status: number, duration: number, options?: { tenantId?: string; userId?: string; correlationId?: string }) => {
    const level: LogLevel = status >= 500 ? "error" : status >= 400 ? "warn" : "info";
    createLog(level, "request", `${method} ${path} ${status} ${duration}ms`, {
      tenantId: options?.tenantId,
      userId: options?.userId,
      correlationId: options?.correlationId,
    });
  },

  info: (category: LogCategory, message: string, options?: { metadata?: Record<string, unknown> }) => {
    createLog("info", category, message, options);
  },

  warn: (category: LogCategory, message: string, options?: { metadata?: Record<string, unknown> }) => {
    createLog("warn", category, message, options);
  },

  error: (category: LogCategory, message: string, options?: { metadata?: Record<string, unknown> }) => {
    createLog("error", category, message, options);
  },
};
