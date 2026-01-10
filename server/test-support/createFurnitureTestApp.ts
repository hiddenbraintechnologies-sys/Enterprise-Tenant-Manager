import express, { Request, Response, NextFunction } from "express";
import { createServer } from "http";
import furnitureRoutes from "../routes/furniture";
import type { RequestContext } from "@shared/schema";

function injectTenantContext(req: Request, res: Response, next: NextFunction) {
  const tenantId = req.headers['x-tenant-id'] as string;
  if (!tenantId) {
    return res.status(400).json({ error: "Tenant ID required" });
  }

  const context: RequestContext = {
    tenant: ({
      id: tenantId,
      name: "Test Furniture Tenant",
      slug: "test-furniture-tenant",
      businessType: "furniture_manufacturing",
      country: "india",
      region: "asia_pacific",
      timezone: "Asia/Kolkata",
      currency: "INR",
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
    features: ["furniture_manufacturing", "production_orders", "sales_orders", "inventory_management"],
  };
  
  req.context = context;
  next();
}

export async function createFurnitureTestApp() {
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

  app.use('/api/furniture', injectTenantContext, furnitureRoutes);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
  });

  return { app, httpServer };
}
