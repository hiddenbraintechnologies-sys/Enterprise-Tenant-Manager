import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { isAuthenticated } from "./replit_integrations/auth";
import { insertCustomerSchema, insertServiceSchema, insertBookingSchema } from "@shared/schema";
import { 
  requirePermission, requireFeature, auditMiddleware, 
  tenantService, auditService, featureService, permissionService,
  FEATURES, PERMISSIONS
} from "./core";

function getTenantId(req: Request): string {
  return req.context?.tenant?.id || "";
}

function getUserId(req: Request): string | undefined {
  return req.context?.user?.id;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  await tenantService.getOrCreateDefaultTenant();

  app.get("/api/dashboard/stats", isAuthenticated, async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) {
        return res.status(403).json({ message: "No tenant access" });
      }
      const stats = await storage.getDashboardStats(tenantId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  app.get("/api/analytics", isAuthenticated, async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) {
        return res.status(403).json({ message: "No tenant access" });
      }
      const analytics = await storage.getAnalytics(tenantId);
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching analytics:", error);
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  app.get("/api/customers", isAuthenticated, async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) {
        return res.status(403).json({ message: "No tenant access" });
      }
      const customers = await storage.getCustomers(tenantId);
      res.json(customers);
    } catch (error) {
      console.error("Error fetching customers:", error);
      res.status(500).json({ message: "Failed to fetch customers" });
    }
  });

  app.get("/api/customers/:id", isAuthenticated, async (req, res) => {
    try {
      const customer = await storage.getCustomer(req.params.id);
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      res.json(customer);
    } catch (error) {
      console.error("Error fetching customer:", error);
      res.status(500).json({ message: "Failed to fetch customer" });
    }
  });

  app.post("/api/customers", isAuthenticated, async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) {
        return res.status(403).json({ message: "No tenant access" });
      }
      const parsed = insertCustomerSchema.safeParse({ ...req.body, tenantId, createdBy: getUserId(req) });
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.message });
      }
      const customer = await storage.createCustomer(parsed.data);
      
      auditService.logAsync({
        tenantId,
        userId: getUserId(req),
        action: "create",
        resource: "customers",
        resourceId: customer.id,
        newValue: customer as any,
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });
      
      res.status(201).json(customer);
    } catch (error) {
      console.error("Error creating customer:", error);
      res.status(500).json({ message: "Failed to create customer" });
    }
  });

  app.patch("/api/customers/:id", isAuthenticated, async (req, res) => {
    try {
      const oldCustomer = await storage.getCustomer(req.params.id);
      const customer = await storage.updateCustomer(req.params.id, req.body);
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      
      auditService.logAsync({
        tenantId: getTenantId(req),
        userId: getUserId(req),
        action: "update",
        resource: "customers",
        resourceId: customer.id,
        oldValue: oldCustomer as any,
        newValue: customer as any,
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });
      
      res.json(customer);
    } catch (error) {
      console.error("Error updating customer:", error);
      res.status(500).json({ message: "Failed to update customer" });
    }
  });

  app.delete("/api/customers/:id", isAuthenticated, async (req, res) => {
    try {
      const oldCustomer = await storage.getCustomer(req.params.id);
      await storage.deleteCustomer(req.params.id);
      
      auditService.logAsync({
        tenantId: getTenantId(req),
        userId: getUserId(req),
        action: "delete",
        resource: "customers",
        resourceId: req.params.id,
        oldValue: oldCustomer as any,
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting customer:", error);
      res.status(500).json({ message: "Failed to delete customer" });
    }
  });

  app.get("/api/services", isAuthenticated, async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) {
        return res.status(403).json({ message: "No tenant access" });
      }
      const services = await storage.getServices(tenantId);
      res.json(services);
    } catch (error) {
      console.error("Error fetching services:", error);
      res.status(500).json({ message: "Failed to fetch services" });
    }
  });

  app.get("/api/services/:id", isAuthenticated, async (req, res) => {
    try {
      const service = await storage.getService(req.params.id);
      if (!service) {
        return res.status(404).json({ message: "Service not found" });
      }
      res.json(service);
    } catch (error) {
      console.error("Error fetching service:", error);
      res.status(500).json({ message: "Failed to fetch service" });
    }
  });

  app.post("/api/services", isAuthenticated, async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) {
        return res.status(403).json({ message: "No tenant access" });
      }
      const parsed = insertServiceSchema.safeParse({ ...req.body, tenantId, createdBy: getUserId(req) });
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.message });
      }
      const service = await storage.createService(parsed.data);
      
      auditService.logAsync({
        tenantId,
        userId: getUserId(req),
        action: "create",
        resource: "services",
        resourceId: service.id,
        newValue: service as any,
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });
      
      res.status(201).json(service);
    } catch (error) {
      console.error("Error creating service:", error);
      res.status(500).json({ message: "Failed to create service" });
    }
  });

  app.patch("/api/services/:id", isAuthenticated, async (req, res) => {
    try {
      const oldService = await storage.getService(req.params.id);
      const service = await storage.updateService(req.params.id, req.body);
      if (!service) {
        return res.status(404).json({ message: "Service not found" });
      }
      
      auditService.logAsync({
        tenantId: getTenantId(req),
        userId: getUserId(req),
        action: "update",
        resource: "services",
        resourceId: service.id,
        oldValue: oldService as any,
        newValue: service as any,
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });
      
      res.json(service);
    } catch (error) {
      console.error("Error updating service:", error);
      res.status(500).json({ message: "Failed to update service" });
    }
  });

  app.delete("/api/services/:id", isAuthenticated, async (req, res) => {
    try {
      const oldService = await storage.getService(req.params.id);
      await storage.deleteService(req.params.id);
      
      auditService.logAsync({
        tenantId: getTenantId(req),
        userId: getUserId(req),
        action: "delete",
        resource: "services",
        resourceId: req.params.id,
        oldValue: oldService as any,
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting service:", error);
      res.status(500).json({ message: "Failed to delete service" });
    }
  });

  app.get("/api/bookings", isAuthenticated, async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) {
        return res.status(403).json({ message: "No tenant access" });
      }
      const bookings = await storage.getBookings(tenantId);
      res.json(bookings);
    } catch (error) {
      console.error("Error fetching bookings:", error);
      res.status(500).json({ message: "Failed to fetch bookings" });
    }
  });

  app.get("/api/bookings/upcoming", isAuthenticated, async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) {
        return res.status(403).json({ message: "No tenant access" });
      }
      const limit = parseInt(req.query.limit as string) || 10;
      const bookings = await storage.getUpcomingBookings(tenantId, limit);
      res.json(bookings);
    } catch (error) {
      console.error("Error fetching upcoming bookings:", error);
      res.status(500).json({ message: "Failed to fetch upcoming bookings" });
    }
  });

  app.get("/api/bookings/:id", isAuthenticated, async (req, res) => {
    try {
      const booking = await storage.getBooking(req.params.id);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      res.json(booking);
    } catch (error) {
      console.error("Error fetching booking:", error);
      res.status(500).json({ message: "Failed to fetch booking" });
    }
  });

  app.post("/api/bookings", isAuthenticated, async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) {
        return res.status(403).json({ message: "No tenant access" });
      }
      const parsed = insertBookingSchema.safeParse({ ...req.body, tenantId, createdBy: getUserId(req) });
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.message });
      }
      const booking = await storage.createBooking(parsed.data);
      
      auditService.logAsync({
        tenantId,
        userId: getUserId(req),
        action: "create",
        resource: "bookings",
        resourceId: booking.id,
        newValue: booking as any,
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });
      
      res.status(201).json(booking);
    } catch (error) {
      console.error("Error creating booking:", error);
      res.status(500).json({ message: "Failed to create booking" });
    }
  });

  app.patch("/api/bookings/:id", isAuthenticated, async (req, res) => {
    try {
      const oldBooking = await storage.getBooking(req.params.id);
      const booking = await storage.updateBooking(req.params.id, req.body);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      
      auditService.logAsync({
        tenantId: getTenantId(req),
        userId: getUserId(req),
        action: "update",
        resource: "bookings",
        resourceId: booking.id,
        oldValue: oldBooking as any,
        newValue: booking as any,
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });
      
      res.json(booking);
    } catch (error) {
      console.error("Error updating booking:", error);
      res.status(500).json({ message: "Failed to update booking" });
    }
  });

  app.delete("/api/bookings/:id", isAuthenticated, async (req, res) => {
    try {
      const oldBooking = await storage.getBooking(req.params.id);
      await storage.deleteBooking(req.params.id);
      
      auditService.logAsync({
        tenantId: getTenantId(req),
        userId: getUserId(req),
        action: "delete",
        resource: "bookings",
        resourceId: req.params.id,
        oldValue: oldBooking as any,
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting booking:", error);
      res.status(500).json({ message: "Failed to delete booking" });
    }
  });

  app.get("/api/context", isAuthenticated, async (req, res) => {
    try {
      const context = req.context;
      res.json({
        user: context.user,
        tenant: context.tenant ? {
          id: context.tenant.id,
          name: context.tenant.name,
          businessType: context.tenant.businessType,
          logoUrl: context.tenant.logoUrl,
          primaryColor: context.tenant.primaryColor,
        } : null,
        role: context.role ? {
          id: context.role.id,
          name: context.role.name,
        } : null,
        permissions: context.permissions,
        features: context.features,
      });
    } catch (error) {
      console.error("Error fetching context:", error);
      res.status(500).json({ message: "Failed to fetch context" });
    }
  });

  app.get("/api/features", isAuthenticated, async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) {
        return res.status(403).json({ message: "No tenant access" });
      }
      const features = await featureService.getTenantFeatures(tenantId);
      const allFeatures = await featureService.getAllFeatures();
      res.json({
        enabled: features,
        available: allFeatures,
      });
    } catch (error) {
      console.error("Error fetching features:", error);
      res.status(500).json({ message: "Failed to fetch features" });
    }
  });

  app.get("/api/audit-logs", isAuthenticated, async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) {
        return res.status(403).json({ message: "No tenant access" });
      }
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      const result = await auditService.getAuditLogsWithUsers({ tenantId, limit, offset });
      res.json(result);
    } catch (error) {
      console.error("Error fetching audit logs:", error);
      res.status(500).json({ message: "Failed to fetch audit logs" });
    }
  });

  return httpServer;
}
