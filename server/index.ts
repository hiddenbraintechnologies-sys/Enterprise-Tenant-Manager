import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { setupAuth, registerAuthRoutes } from "./replit_integrations/auth";
import { tenantService } from "./core";
import { db } from "./db";
import { roles, userTenants, rolePermissions, permissions, tenantFeatures, featureFlags, users, tenants } from "@shared/schema";
import { eq, and, inArray } from "drizzle-orm";
import type { RequestContext } from "@shared/schema";
import { responseTimeMiddleware } from "./middleware/response-time";
import { metricsMiddleware, metricsHandler, metricsJsonHandler } from "./middleware/performance/metrics";
import { queryTrackerMiddleware } from "./middleware/performance/query-tracker";
import { runMigrations } from "./db-migrate";
import { enforceEnvironmentValidation, getEnvironmentInfo } from "./lib/env-validation";
import { logRateLimitStatus, productionGuardMiddleware } from "./lib/production-guards";
import { requestLoggerMiddleware } from "./lib/request-logger";
import { apiErrorBoundary } from "./lib/error-boundary";
import { validateStartupConfig, logStartupConfig } from "./lib/startup-config";
import { degradedModeMiddleware } from "./lib/degraded-mode";
import { performReadinessCheck } from "./lib/health-ready";
import { logger } from "./lib/structured-logging";
import { securityHeaders } from "./middleware/security-headers";
import { startCleanupScheduler } from "./jobs/cleanupExpiredRefreshTokens";
import { schemaHealthCheck } from "./bootstrap/schemaHealth";
import crypto from "crypto";

// ============================================
// PROCESS-LEVEL ERROR HANDLERS (before anything else)
// ============================================
process.on("uncaughtException", (err) => {
  console.error("[FATAL] Uncaught exception:", err.message);
  console.error(err.stack);
});

process.on("unhandledRejection", (reason) => {
  console.error("[FATAL] Unhandled rejection:", reason);
});

// ============================================
// SECRET MANAGEMENT
// Dev: auto-generate ephemeral secrets
// Production: secrets MUST be set explicitly - server starts in degraded mode without them
// ============================================
const _isDevEnv = process.env.NODE_ENV !== "production";
const _missingProductionSecrets: string[] = [];

if (!process.env.JWT_ACCESS_SECRET) {
  if (_isDevEnv) {
    process.env.JWT_ACCESS_SECRET = crypto.randomBytes(64).toString("hex");
    console.log("[startup] JWT_ACCESS_SECRET auto-generated (dev only)");
  } else {
    _missingProductionSecrets.push("JWT_ACCESS_SECRET");
    console.error("[CRITICAL] JWT_ACCESS_SECRET must be set in production");
  }
}
if (!process.env.JWT_REFRESH_SECRET) {
  if (_isDevEnv) {
    process.env.JWT_REFRESH_SECRET = crypto.randomBytes(64).toString("hex");
    console.log("[startup] JWT_REFRESH_SECRET auto-generated (dev only)");
  } else {
    _missingProductionSecrets.push("JWT_REFRESH_SECRET");
    console.error("[CRITICAL] JWT_REFRESH_SECRET must be set in production");
  }
}
if (!process.env.SESSION_SECRET) {
  if (_isDevEnv) {
    process.env.SESSION_SECRET = crypto.randomBytes(64).toString("hex");
    console.log("[startup] SESSION_SECRET auto-generated (dev only)");
  } else {
    _missingProductionSecrets.push("SESSION_SECRET");
    console.error("[CRITICAL] SESSION_SECRET must be set in production");
  }
}

export const hasMissingProductionSecrets = _missingProductionSecrets.length > 0;
if (hasMissingProductionSecrets) {
  console.error(`[CRITICAL] Missing production secrets: ${_missingProductionSecrets.join(", ")}. Auth endpoints will return 503.`);
}

// ============================================
// PRODUCTION STARTUP VALIDATION
// ============================================
const { isProduction, environment } = getEnvironmentInfo();
logger.startup(`Starting MyBizStream (${environment})`);

// Validate startup configuration (comprehensive check)
validateStartupConfig();
logStartupConfig();

// Validate environment variables (warns but does not exit)
enforceEnvironmentValidation();

// Log rate limit configuration
logRateLimitStatus();

const app = express();
export { app }; // Export for testing
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

// Security headers (Helmet + Permissions-Policy)
securityHeaders.forEach((middleware) => app.use(middleware));

// Request logger with correlation ID (early in the chain)
app.use(requestLoggerMiddleware);

// Production safety guards - block seed/demo endpoints in production
app.use(productionGuardMiddleware);

// Performance middleware (early in the chain)
app.use(responseTimeMiddleware({ threshold: 1000 }));
app.use(metricsMiddleware);
app.use(queryTrackerMiddleware);

// Metrics endpoints
app.get('/metrics', metricsHandler);
app.get('/metrics/json', metricsJsonHandler);

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

// Legacy response logger removed - replaced by requestLoggerMiddleware
// which provides correlation IDs and avoids logging response bodies (PII risk)

// Block auth endpoints when production secrets are missing
// Server stays up for health checks but refuses to handle auth without proper secrets
if (hasMissingProductionSecrets) {
  app.use('/api/auth', (_req, res) => {
    res.status(503).json({
      error: 'SERVICE_UNAVAILABLE',
      message: 'Authentication unavailable - missing required secrets in production',
    });
  });
  app.use('/api/admin/auth', (_req, res) => {
    res.status(503).json({
      error: 'SERVICE_UNAVAILABLE',
      message: 'Authentication unavailable - missing required secrets in production',
    });
  });
}

// Health check endpoint - responds immediately for platform provisioning
app.get('/health', (_req, res) => {
  res.status(200).json({ 
    status: hasMissingProductionSecrets ? 'degraded' : 'ok', 
    timestamp: new Date().toISOString(),
    ...(hasMissingProductionSecrets && { warning: 'Missing production secrets - auth disabled' }),
  });
});

// Database health check endpoint with timeout
app.get('/health/db', async (_req, res) => {
  const timeout = process.env.NODE_ENV === 'production' ? 10000 : 5000;
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('Database connection timeout')), timeout);
  });
  
  try {
    const { pool } = await import('./db');
    await Promise.race([
      pool.query('SELECT 1'),
      timeoutPromise
    ]);
    res.status(200).json({ 
      status: 'ok', 
      database: 'connected',
      timestamp: new Date().toISOString() 
    });
  } catch (error) {
    res.status(503).json({ 
      status: 'DB_UNAVAILABLE',
      message: error instanceof Error ? error.message : 'Database connection failed',
      timestamp: new Date().toISOString()
    });
  }
});

// Comprehensive readiness check endpoint
app.get('/health/ready', async (_req, res) => {
  try {
    const result = await performReadinessCheck();
    const statusCode = result.ready ? 200 : 503;
    res.status(statusCode).json(result);
  } catch (error) {
    res.status(503).json({
      ready: false,
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      checks: [{
        name: 'readiness_check',
        status: 'unhealthy',
        message: error instanceof Error ? error.message : 'Readiness check failed',
      }],
    });
  }
});

// Degraded mode middleware - blocks non-health endpoints when degraded
app.use(degradedModeMiddleware);

// Track initialization state
let isInitialized = false;
let initPromise: Promise<void> | null = null;

app.use((req, res, next) => {
  if (isInitialized || req.path.startsWith('/api') || 
      req.path === '/health' || req.path.startsWith('/health/') ||
      req.path.startsWith('/metrics')) {
    return next();
  }
  
  if (initPromise) {
    initPromise
      .then(() => next())
      .catch(() => {
        res.status(503).json({ 
          message: 'Server initialization failed',
          retry: true 
        });
      });
  } else {
    next();
  }
});

(async () => {
  try {
  // IMPORTANT: Start server FIRST for platform health check, then run migrations
  // This prevents provisioning timeout on large applications
  
  const port = parseInt(process.env.PORT || "5000", 10);
  
  // Start listening immediately so health checks pass
  await new Promise<void>((resolve, reject) => {
    httpServer.on("error", (err) => {
      console.error(`[startup] Failed to bind to port ${port}:`, err.message);
      reject(err);
    });
    httpServer.listen({ port, host: "0.0.0.0", reusePort: true }, () => {
      log(`serving on port ${port}`);
      resolve();
    });
  });
  
  // Create and store initialization promise so early requests can wait
  initPromise = (async () => {
  // Wrap all initialization in try-catch to prevent crashes
  try {
    // Now run migrations in the background (server is already responding)
    try {
      await runMigrations();
    } catch (error) {
      console.error("[startup] Migration error (non-fatal):", error);
    }
    
    // Schema health check - verify required tables exist
    try {
      const schemaHealth = await schemaHealthCheck();
      if (!schemaHealth.ok) {
        console.error("[schema-health] SCHEMA_MISSING_TABLES:", schemaHealth.missing);
        console.error("[schema-health] Run 'npm run db:push' to create missing tables");
      } else {
        console.log("[schema-health] All required tables present");
      }
    } catch (error) {
      console.error("[schema-health] Check failed:", error);
    }
    
    // Setup authentication (must be before routes)
    await setupAuth(app);
    registerAuthRoutes(app);
  
  // Tenant context cache - avoids 3-5 DB queries per authenticated request
  const contextCache = new Map<string, { context: RequestContext; expiresAt: number }>();
  const CONTEXT_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
  const CONTEXT_CACHE_MAX_SIZE = 1000;

  function getCachedContext(userId: string): RequestContext | null {
    const entry = contextCache.get(userId);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      contextCache.delete(userId);
      return null;
    }
    return entry.context;
  }

  function setCachedContext(userId: string, context: RequestContext): void {
    if (contextCache.size >= CONTEXT_CACHE_MAX_SIZE) {
      const firstKey = contextCache.keys().next().value;
      if (firstKey) contextCache.delete(firstKey);
    }
    contextCache.set(userId, { context, expiresAt: Date.now() + CONTEXT_CACHE_TTL_MS });
  }

  // Expose cache invalidation for use after role/permission/feature changes
  app.locals.invalidateContextCache = (userId?: string) => {
    if (userId) {
      contextCache.delete(userId);
    } else {
      contextCache.clear();
    }
  };

  // Unified tenant context middleware (after auth, before routes)
  app.use(async (req, res, next) => {
    const context: RequestContext = {
      user: null,
      tenant: null,
      role: null,
      permissions: [],
      features: [],
    };
    req.context = context;
    
    const user = req.user as any;
    
    if (!user?.claims?.sub) {
      return next();
    }
    
    try {
      const userId = user.claims.sub;
      
      // Check cache first - avoids 3-5 DB queries per request
      const cached = getCachedContext(userId);
      if (cached) {
        req.context = cached;
        return next();
      }
      
      // Cache miss - run DB queries
      const [dbUser] = await db.select().from(users).where(eq(users.id, userId));
      if (!dbUser) {
        return next();
      }
      
      context.user = {
        id: dbUser.id,
        email: dbUser.email,
        firstName: dbUser.firstName,
        lastName: dbUser.lastName,
      };
      
      // Get user's tenant + role in a single join query
      let [userTenant] = await db.select({
        userTenant: userTenants,
        tenant: tenants,
        role: roles,
      })
      .from(userTenants)
      .leftJoin(tenants, eq(userTenants.tenantId, tenants.id))
      .leftJoin(roles, eq(userTenants.roleId, roles.id))
      .where(and(
        eq(userTenants.userId, userId),
        eq(userTenants.isActive, true)
      ))
      .limit(1);
      
      if (!userTenant?.tenant) {
        const { tenant, roleId } = await tenantService.ensureUserHasTenant(userId);
        const [role] = await db.select().from(roles).where(eq(roles.id, roleId));
        context.tenant = tenant;
        context.role = role || null;
      } else {
        context.tenant = userTenant.tenant;
        context.role = userTenant.role;
      }
      
      // Fetch permissions + features in parallel
      const [permResult, featureResult] = await Promise.all([
        context.role
          ? db.select({ code: permissions.code })
              .from(rolePermissions)
              .leftJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
              .where(eq(rolePermissions.roleId, context.role.id))
          : Promise.resolve([]),
        context.tenant
          ? Promise.all([
              db.select({ code: tenantFeatures.featureCode })
                .from(tenantFeatures)
                .where(and(
                  eq(tenantFeatures.tenantId, context.tenant.id),
                  eq(tenantFeatures.isEnabled, true)
                )),
              db.select({ code: featureFlags.code })
                .from(featureFlags)
                .where(eq(featureFlags.defaultEnabled, true)),
            ])
          : Promise.resolve([[], []] as Array<{ code: string | null }[]>),
      ]);

      context.permissions = permResult.map(p => p.code).filter(Boolean) as string[];
      
      if (context.tenant) {
        const [activeFeatures, defaultFeatures] = featureResult as [{ code: string | null }[], { code: string | null }[]];
        const featureSet = new Set<string>();
        defaultFeatures.forEach(f => { if (f.code) featureSet.add(f.code); });
        activeFeatures.forEach(f => { if (f.code) featureSet.add(f.code); });
        context.features = Array.from(featureSet);
      }
      
      // Cache the resolved context
      setCachedContext(userId, context);
    } catch (error) {
      console.error("Error in tenant context middleware:", error);
    }
    
    next();
  });
  
  await registerRoutes(httpServer, app);

  // API error boundary with correlation ID
  app.use(apiErrorBoundary);

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // Mark initialization complete
  isInitialized = true;
  log("Server fully initialized");
  
  // Start background job for processing scheduled downgrades
  startScheduledDowngradeProcessor();
  
  // Start background job for processing expired subscriptions
  startSubscriptionExpiryProcessor();
  
  // Start background job for syncing addon entitlements
  startAddonEntitlementSync();
  
  // Start background job for cleaning up old login history
  startLoginHistoryCleanup();
  
  // Start background job for cleaning up expired refresh tokens
  startCleanupScheduler();
  
  // Server is already listening (started at the top of this async block)
  // This ensures platform health checks pass immediately
  } catch (error) {
    console.error("[startup] Fatal initialization error:", error);
    // Don't exit - keep server running so health checks pass
    isInitialized = true; // Still mark as initialized to unblock waiting requests
  }
  })(); // End of initPromise async function
  } catch (outerError) {
    console.error("[startup] CRITICAL: Server failed to start:", outerError);
  }
})();

const CONSECUTIVE_FAILURE_ALERT_THRESHOLD = 3;

function createResilientJob(
  name: string, 
  jobFn: () => Promise<{ count: number } | void>,
  intervalMs: number,
  initialDelayMs: number = 0,
) {
  let consecutiveFailures = 0;
  
  const run = async () => {
    try {
      const result = await jobFn();
      consecutiveFailures = 0;
      if (result && result.count > 0) {
        log(`Processed ${result.count} items`, name);
      }
    } catch (error) {
      consecutiveFailures++;
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error(`[${name}] Failed (${consecutiveFailures} consecutive):`, errMsg);
      
      if (consecutiveFailures >= CONSECUTIVE_FAILURE_ALERT_THRESHOLD) {
        console.error(`[${name}] ALERT: ${consecutiveFailures} consecutive failures - job may be broken. Last error: ${errMsg}`);
      }
    }
  };

  if (initialDelayMs > 0) {
    setTimeout(() => run(), initialDelayMs);
  } else {
    run();
  }
  setInterval(run, intervalMs);
  log(`${name} started (interval: ${Math.round(intervalMs / 1000 / 60)}m)`, name);
}

function startScheduledDowngradeProcessor() {
  createResilientJob("billing-job", async () => {
    const { processScheduledDowngrades } = await import("./routes/billing");
    const count = await processScheduledDowngrades();
    return { count };
  }, 60 * 60 * 1000);
}

function startSubscriptionExpiryProcessor() {
  createResilientJob("subscription-expiry-job", async () => {
    const { processExpiredSubscriptions } = await import("./middleware/subscription-guard");
    const result = await processExpiredSubscriptions();
    return { count: result.processed };
  }, 60 * 60 * 1000, 10000);
}

function startAddonEntitlementSync() {
  createResilientJob("addon-entitlement-sync", async () => {
    const { syncExpiredAddons } = await import("./services/entitlement");
    const result = await syncExpiredAddons();
    return { count: result.processed };
  }, 60 * 60 * 1000, 15000);
}

function startLoginHistoryCleanup() {
  createResilientJob("login-history-cleanup", async () => {
    const { cleanupOldLoginHistory } = await import("./services/login-history");
    const count = await cleanupOldLoginHistory(90);
    return { count };
  }, 24 * 60 * 60 * 1000, 60000);
}

// ============================================
// GRACEFUL SHUTDOWN
// ============================================
const gracefulShutdown = async (signal: string) => {
  console.log(`[shutdown] ${signal} received, starting graceful shutdown...`);

  httpServer.close(() => {
    console.log("[shutdown] HTTP server closed");
  });

  const forceTimeout = setTimeout(() => {
    console.error("[shutdown] Forced shutdown after 10s timeout");
    process.exit(1);
  }, 10000);
  forceTimeout.unref();

  try {
    const { pool } = await import("./db");
    await pool.end();
    console.log("[shutdown] Database connections closed");
    process.exit(0);
  } catch (error) {
    console.error("[shutdown] Error during cleanup:", error);
    process.exit(1);
  }
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
