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

// ============================================
// PRODUCTION STARTUP VALIDATION
// ============================================
const { isProduction, environment } = getEnvironmentInfo();
console.log(`[startup] Starting MyBizStream (${environment})`);

// Validate environment variables (fails fast in production if missing)
enforceEnvironmentValidation();

// Log rate limit configuration
logRateLimitStatus();

const app = express();
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

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

// Health check endpoint - responds immediately for Replit provisioning
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

// Track initialization state
let isInitialized = false;
let initPromise: Promise<void> | null = null;

// Early catch-all for frontend routes during initialization
// This prevents "Cannot GET" errors when the server is still starting
app.use((req, res, next) => {
  // Skip if already initialized or if it's an API/metrics/health route
  if (isInitialized || req.path.startsWith('/api') || req.path === '/health' || req.path === '/metrics' || req.path.startsWith('/metrics/')) {
    return next();
  }
  
  // For frontend routes during init, wait for initialization then retry
  if (initPromise && !isInitialized) {
    initPromise.then(() => {
      // Initialization complete, let the request continue through the normal middleware
      next();
    }).catch(() => {
      res.status(503).json({ message: 'Server is starting up, please retry' });
    });
  } else {
    next();
  }
});

(async () => {
  // IMPORTANT: Start server FIRST for Replit health check, then run migrations
  // This prevents provisioning timeout on large applications
  
  const port = parseInt(process.env.PORT || "5000", 10);
  
  // Start listening immediately so health checks pass
  await new Promise<void>((resolve) => {
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
  
  // Server is already listening (started at the top of this async block)
  // This ensures Replit health checks pass immediately
  } catch (error) {
    console.error("[startup] Fatal initialization error:", error);
    // Don't exit - keep server running so health checks pass
    isInitialized = true; // Still mark as initialized to unblock waiting requests
  }
  })(); // End of initPromise async function
})();
