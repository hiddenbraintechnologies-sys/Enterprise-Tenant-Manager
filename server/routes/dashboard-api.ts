import { Router, Request, Response, NextFunction } from "express";
import { db } from "../db";
import { 
  tenants, tenantSubscriptions, globalPricingPlans,
  users, userTenants
} from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { 
  authenticateJWT, tenantResolutionMiddleware, enforceTenantBoundary
} from "../core";
import { subscriptionService } from "../services/subscription";

const router = Router();

export function subscriptionCheckMiddleware() {
  return async (req: Request, res: Response, next: NextFunction) => {
    const tenantId = req.context?.tenant?.id;
    
    if (!tenantId) {
      return res.status(400).json({
        error: "Tenant context required",
        code: "TENANT_REQUIRED",
        redirectUrl: "/signup"
      });
    }

    const subscription = await subscriptionService.getActiveSubscription(tenantId);
    
    if (!subscription) {
      const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId));
      
      if (tenant?.subscriptionTier === "free") {
        (req as any).subscription = null;
        (req as any).subscriptionPlan = { tier: "free" };
        (req as any).subscriptionTier = "free";
        return next();
      }

      return res.status(402).json({
        error: "Subscription required",
        code: "NO_SUBSCRIPTION",
        message: "Please select a subscription plan to continue",
        redirectUrl: "/subscription/select"
      });
    }

    if (subscription.status === "suspended" || subscription.status === "cancelled") {
      return res.status(402).json({
        error: "Subscription inactive",
        code: "SUBSCRIPTION_INACTIVE",
        status: subscription.status,
        message: "Your subscription is no longer active",
        redirectUrl: "/subscription/reactivate"
      });
    }

    if (subscription.status === "past_due") {
      return res.status(402).json({
        error: "Payment past due",
        code: "PAYMENT_PAST_DUE",
        message: "Please update your payment method",
        redirectUrl: "/billing"
      });
    }

    const plan = await subscriptionService.getPlan(subscription.planId);
    
    (req as any).subscription = subscription;
    (req as any).subscriptionPlan = plan;
    (req as any).subscriptionTier = plan?.tier || "free";

    next();
  };
}

export function requireDashboardAccessMiddleware() {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.context?.user) {
      return res.status(401).json({
        error: "Authentication required",
        code: "AUTH_REQUIRED",
        redirectUrl: "/login"
      });
    }

    if (!req.context?.tenant) {
      return res.status(400).json({
        error: "Tenant context required",
        code: "TENANT_REQUIRED",
        redirectUrl: "/select-tenant"
      });
    }

    const tokenTenantId = (req.tokenPayload as any)?.tnt || req.tokenPayload?.tenantId;
    const requestTenantId = req.context.tenant.id;
    
    if (tokenTenantId && tokenTenantId !== requestTenantId) {
      return res.status(403).json({
        error: "Cross-tenant access denied",
        code: "TENANT_MISMATCH",
        message: "Your session is for a different tenant"
      });
    }

    next();
  };
}

const dashboardMiddlewareStack = [
  authenticateJWT({ required: true }),
  tenantResolutionMiddleware(),
  enforceTenantBoundary(),
  subscriptionCheckMiddleware(),
  requireDashboardAccessMiddleware(),
];

router.get("/", ...dashboardMiddlewareStack, async (req: Request, res: Response) => {
  try {
    const tenantId = req.context?.tenant?.id;
    const userId = req.context?.user?.id;
    const subscription = (req as any).subscription;
    const subscriptionPlan = (req as any).subscriptionPlan;

    if (!tenantId) {
      return res.status(400).json({ error: "Tenant context required" });
    }

    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId));
    if (!tenant) {
      return res.status(404).json({ error: "Tenant not found" });
    }

    const tier = subscriptionPlan?.tier || tenant.subscriptionTier || "free";
    const moduleAccess = subscriptionService.getAllModuleAccess(tier);
    const subscriptionFeatures = subscriptionService.getSubscriptionFeatures(tier);

    const enabledModules = moduleAccess
      .filter(m => m.access === "included")
      .map(m => m.moduleId);

    const addonModules = moduleAccess
      .filter(m => m.access === "addon")
      .map(m => m.moduleId);

    const tenantAddons = await subscriptionService.getTenantActiveAddons(tenantId);
    
    const addonEnabledModules = addonModules.filter(moduleId => 
      subscriptionService.hasModuleAddon(moduleId, tenantAddons)
    );

    const allEnabledModules = [...new Set([...enabledModules, ...addonEnabledModules])];

    const businessTypeModuleMapping: Record<string, string[]> = {
      clinic: ["bookings", "customers", "invoices", "analytics", "settings"],
      salon: ["bookings", "customers", "services", "invoices", "analytics", "settings"],
      pg: ["bookings", "customers", "invoices", "settings"],
      coworking: ["bookings", "customers", "invoices", "analytics", "settings"],
      service: ["bookings", "customers", "services", "invoices", "analytics", "settings"],
      real_estate: ["real_estate", "customers", "invoices", "analytics", "settings"],
      tourism: ["tourism", "customers", "bookings", "invoices", "analytics", "settings"],
      education: ["education", "customers", "invoices", "analytics", "settings"],
      logistics: ["logistics", "customers", "invoices", "analytics", "settings"],
      legal: ["legal", "customers", "invoices", "analytics", "settings"],
      furniture_manufacturing: ["furniture_manufacturing", "customers", "invoices", "analytics", "settings"],
    };

    const businessModules = businessTypeModuleMapping[tenant.businessType || "service"] || [];
    const filteredModules = allEnabledModules.filter(m => businessModules.includes(m) || enabledModules.includes(m));

    const dashboardRoute = `/dashboard/${tenant.businessType === "furniture_manufacturing" ? "furniture" : tenant.businessType}`;

    res.json({
      tenant: {
        id: tenant.id,
        name: tenant.name,
        businessType: tenant.businessType,
        country: tenant.country,
        onboardingCompleted: tenant.onboardingCompleted,
      },
      subscription: subscription ? {
        id: subscription.id,
        status: subscription.status,
        trialEndsAt: subscription.trialEndsAt,
        currentPeriodEnd: subscription.currentPeriodEnd,
      } : null,
      plan: subscriptionPlan ? {
        id: subscriptionPlan.id,
        name: subscriptionPlan.name,
        tier: subscriptionPlan.tier,
      } : { tier: "free", name: "Free Plan" },
      modules: {
        enabled: filteredModules.length > 0 ? filteredModules : enabledModules,
        available: addonModules,
        addons: addonEnabledModules,
      },
      features: subscriptionFeatures,
      limits: {
        maxUsers: subscriptionFeatures.maxUsers,
        maxCustomers: subscriptionFeatures.maxCustomers,
        apiRateLimit: subscriptionFeatures.apiRateLimit,
      },
      dashboardRoute,
      navigation: buildNavigationItems(filteredModules.length > 0 ? filteredModules : enabledModules, tenant.businessType || "service"),
    });
  } catch (error) {
    console.error("[dashboard-api] Error:", error);
    res.status(500).json({ error: "Failed to load dashboard data" });
  }
});

router.get("/modules/:moduleId/access", ...dashboardMiddlewareStack, async (req: Request, res: Response) => {
  try {
    const tenantId = req.context?.tenant?.id;
    const { moduleId } = req.params;

    if (!tenantId) {
      return res.status(400).json({ error: "Tenant context required" });
    }

    const accessResult = await subscriptionService.canAccessModule(tenantId, moduleId);

    res.json({
      moduleId,
      ...accessResult,
    });
  } catch (error) {
    console.error("[module-access] Error:", error);
    res.status(500).json({ error: "Failed to check module access" });
  }
});

router.get("/subscription/status", ...dashboardMiddlewareStack.slice(0, 3), async (req: Request, res: Response) => {
  try {
    const tenantId = req.context?.tenant?.id;

    if (!tenantId) {
      return res.status(400).json({ error: "Tenant context required" });
    }

    const subscription = await subscriptionService.getActiveSubscription(tenantId);
    
    if (!subscription) {
      const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId));
      return res.json({
        hasSubscription: false,
        tier: tenant?.subscriptionTier || "free",
        needsSubscription: tenant?.subscriptionTier !== "free",
        redirectUrl: "/subscription/select"
      });
    }

    const plan = await subscriptionService.getPlan(subscription.planId);

    res.json({
      hasSubscription: true,
      subscription: {
        id: subscription.id,
        status: subscription.status,
        trialEndsAt: subscription.trialEndsAt,
        currentPeriodEnd: subscription.currentPeriodEnd,
      },
      plan: plan ? {
        id: plan.id,
        name: plan.name,
        tier: plan.tier,
      } : null,
      needsSubscription: false,
    });
  } catch (error) {
    console.error("[subscription-status] Error:", error);
    res.status(500).json({ error: "Failed to check subscription status" });
  }
});

function buildNavigationItems(enabledModules: string[], businessType: string): Array<{ id: string; label: string; path: string; icon: string }> {
  const baseNavItems = [
    { id: "dashboard", label: "Dashboard", path: "/dashboard", icon: "LayoutDashboard" },
  ];

  const moduleNavItems: Record<string, { label: string; path: string; icon: string }> = {
    customers: { label: "Customers", path: "/customers", icon: "Users" },
    services: { label: "Services", path: "/services", icon: "Briefcase" },
    bookings: { label: "Bookings", path: "/bookings", icon: "Calendar" },
    invoices: { label: "Invoices", path: "/invoices", icon: "Receipt" },
    analytics: { label: "Analytics", path: "/analytics", icon: "BarChart3" },
    settings: { label: "Settings", path: "/settings", icon: "Settings" },
    real_estate: { label: "Properties", path: "/real-estate", icon: "Building2" },
    tourism: { label: "Tours", path: "/tourism", icon: "Plane" },
    education: { label: "Courses", path: "/education", icon: "GraduationCap" },
    logistics: { label: "Logistics", path: "/logistics", icon: "Truck" },
    legal: { label: "Cases", path: "/legal", icon: "Scale" },
    furniture_manufacturing: { label: "Production", path: "/furniture", icon: "Factory" },
    hrms: { label: "HR", path: "/hr", icon: "UserCog" },
    marketplace: { label: "Marketplace", path: "/marketplace", icon: "Store" },
  };

  const navItems = [...baseNavItems];

  for (const moduleId of enabledModules) {
    if (moduleNavItems[moduleId]) {
      navItems.push({
        id: moduleId,
        ...moduleNavItems[moduleId],
      });
    }
  }

  return navItems;
}

export default router;
