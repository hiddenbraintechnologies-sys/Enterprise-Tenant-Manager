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

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // Server is already listening (started at the top of this async block)
  // This ensures Replit health checks pass immediately
})();
