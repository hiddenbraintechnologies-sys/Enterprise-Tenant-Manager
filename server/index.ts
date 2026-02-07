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
// AUTO-GENERATE MISSING SECRETS (development only)
// In production, secrets MUST be set explicitly for stability across restarts
// ============================================
const _isDevEnv = process.env.NODE_ENV !== "production";
if (!process.env.JWT_ACCESS_SECRET) {
  if (_isDevEnv) {
    process.env.JWT_ACCESS_SECRET = crypto.randomBytes(64).toString("hex");
    console.log("[startup] JWT_ACCESS_SECRET auto-generated for development");
  } else {
    console.error("[startup] WARNING: JWT_ACCESS_SECRET not set in production - tokens will use fallback");
  }
}
if (!process.env.JWT_REFRESH_SECRET) {
  if (_isDevEnv) {
    process.env.JWT_REFRESH_SECRET = crypto.randomBytes(64).toString("hex");
    console.log("[startup] JWT_REFRESH_SECRET auto-generated for development");
  } else {
    console.error("[startup] WARNING: JWT_REFRESH_SECRET not set in production - tokens will use fallback");
  }
}
if (!process.env.SESSION_SECRET) {
  if (_isDevEnv) {
    process.env.SESSION_SECRET = crypto.randomBytes(64).toString("hex");
    console.log("[startup] SESSION_SECRET auto-generated for development");
  } else {
    console.error("[startup] WARNING: SESSION_SECRET not set in production - sessions may be unstable");
  }
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

// Health check endpoint - responds immediately for platform provisioning
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Database health check endpoint with timeout
app.get('/health/db', async (_req, res) => {
  const timeout = 5000;
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
  
  // Unified tenant context middleware (after auth, before routes)
  app.use(async (req, res, next) => {
    // Initialize empty context synchronously
    const context: RequestContext = {
      user: null,
      tenant: null,
      role: null,
      permissions: [],
      features: [],
    };
    req.context = context;
    
    // Skip async work for unauthenticated requests
    const user = req.user as any;
    
    // Debug logging for auth troubleshooting
    if (req.path.includes('/marketplace') && req.method === 'POST') {
      console.log(`[tenant-context] ${req.method} ${req.path} - hasUser=${!!user}, claims=${JSON.stringify(user?.claims || {})}, isAuth=${req.isAuthenticated?.()}`);
    }
    
    if (!user?.claims?.sub) {
      return next();
    }
    
    try {
      const userId = user.claims.sub;
      
      // Get user from DB
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
      
      // Get user's tenant
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
      
      // Auto-assign to default tenant if no tenant association
      if (!userTenant?.tenant) {
        const { tenant, roleId } = await tenantService.ensureUserHasTenant(userId);
        const [role] = await db.select().from(roles).where(eq(roles.id, roleId));
        context.tenant = tenant;
        context.role = role || null;
      } else {
        context.tenant = userTenant.tenant;
        context.role = userTenant.role;
      }
      
      // Get permissions for role
      if (context.role) {
        const perms = await db.select({ code: permissions.code })
          .from(rolePermissions)
          .leftJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
          .where(eq(rolePermissions.roleId, context.role.id));
        context.permissions = perms.map(p => p.code).filter(Boolean) as string[];
      }
      
      // Get enabled features for tenant
      if (context.tenant) {
        const [activeFeatures, defaultFeatures] = await Promise.all([
          db.select({ code: tenantFeatures.featureCode })
            .from(tenantFeatures)
            .where(and(
              eq(tenantFeatures.tenantId, context.tenant.id),
              eq(tenantFeatures.isEnabled, true)
            )),
          db.select({ code: featureFlags.code })
            .from(featureFlags)
            .where(eq(featureFlags.defaultEnabled, true)),
        ]);
        const featureSet = new Set<string>();
        defaultFeatures.forEach(f => featureSet.add(f.code));
        activeFeatures.forEach(f => featureSet.add(f.code));
        context.features = Array.from(featureSet);
      }
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

function startScheduledDowngradeProcessor() {
  const INTERVAL_MS = 60 * 60 * 1000;
  
  const runProcessor = async () => {
    try {
      const { processScheduledDowngrades } = await import("./routes/billing");
      const count = await processScheduledDowngrades();
      if (count > 0) {
        log(`Processed ${count} scheduled downgrades`, "billing-job");
      }
    } catch (error) {
      console.error("[billing-job] Error processing scheduled downgrades:", error);
    }
  };

  runProcessor();
  setInterval(runProcessor, INTERVAL_MS);
  log("Scheduled downgrade processor started (runs hourly)", "billing-job");
}

function startSubscriptionExpiryProcessor() {
  const INTERVAL_MS = 60 * 60 * 1000;
  
  const runProcessor = async () => {
    try {
      const { processExpiredSubscriptions } = await import("./middleware/subscription-guard");
      const result = await processExpiredSubscriptions();
      if (result.processed > 0) {
        log(`Processed ${result.processed} expired subscriptions`, "subscription-expiry-job");
      }
    } catch (error) {
      console.error("[subscription-expiry-job] Error processing expired subscriptions:", error);
    }
  };

  setTimeout(() => runProcessor(), 10000);
  setInterval(runProcessor, INTERVAL_MS);
  log("Subscription expiry processor started (runs hourly)", "subscription-expiry-job");
}

function startAddonEntitlementSync() {
  const INTERVAL_MS = 60 * 60 * 1000;
  
  const runSync = async () => {
    try {
      const { syncExpiredAddons } = await import("./services/entitlement");
      const result = await syncExpiredAddons();
      if (result.processed > 0) {
        log(`Synced ${result.processed} addon entitlements`, "addon-entitlement-sync");
      }
    } catch (error) {
      console.error("[addon-entitlement-sync] Error syncing addon entitlements:", error);
    }
  };

  setTimeout(() => runSync(), 15000);
  setInterval(runSync, INTERVAL_MS);
  log("Addon entitlement sync started (runs hourly)", "addon-entitlement-sync");
}

function startLoginHistoryCleanup() {
  const INTERVAL_MS = 24 * 60 * 60 * 1000; // Run once per day
  
  const runCleanup = async () => {
    try {
      const { cleanupOldLoginHistory } = await import("./services/login-history");
      const count = await cleanupOldLoginHistory(90);
      if (count > 0) {
        log(`Cleaned up ${count} old login history entries`, "login-history-cleanup");
      }
    } catch (error) {
      console.error("[login-history-cleanup] Error cleaning up login history:", error);
    }
  };

  setTimeout(() => runCleanup(), 60000);
  setInterval(runCleanup, INTERVAL_MS);
  log("Login history cleanup started (runs daily)", "login-history-cleanup");
}
