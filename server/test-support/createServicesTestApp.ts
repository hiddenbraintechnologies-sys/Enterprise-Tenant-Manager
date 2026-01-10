import express, { Request, Response, NextFunction } from "express";
import { createServer } from "http";
import servicesRoutes from "../routes/services";
import type { RequestContext } from "@shared/schema";

function injectTenantContext(req: Request, res: Response, next: NextFunction) {
  const tenantId = req.headers['x-tenant-id'] as string;
  if (!tenantId) {
    return res.status(400).json({ message: "Tenant context required" });
  }

  const context: RequestContext = {
    tenant: ({
      id: tenantId,
      name: "Test Tenant",
      slug: "test-tenant",
      businessType: "software_services",
      country: "other",
      region: null,
      timezone: "UTC",
      currency: "USD",
      isActive: true,
      subscriptionTier: "pro",
      settings: null,
      domainVerified: false,
      customDomain: null,
      resellerId: null,
      parentTenantId: null,
      tenantType: "direct",
      onboardingCompletedAt: null,
      featureFlags: null,
      maxUsers: 100,
      currentUserCount: 1,
      brandingConfig: null,
      billingEmail: null,
      technicalContact: null,
      isDeleted: false,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }) as any,
    user: {
      id: "test-user-id",
      email: "test@example.com",
      firstName: "Test",
      lastName: "User",
    },
    role: null,
    permissions: [],
    features: ["software_services", "project_management", "time_tracking"],
  };
  
  req.context = context;
  next();
}

export async function createServicesTestApp() {
  const app = express();
  const httpServer = createServer(app);

  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.get('/health/db', (_req, res) => {
    res.status(200).json({ status: 'ok', database: 'connected' });
  });

  app.use('/api/services/software', injectTenantContext, servicesRoutes);
  app.use('/api/services/consulting', injectTenantContext, servicesRoutes);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
  });

  return { app, httpServer };
}
