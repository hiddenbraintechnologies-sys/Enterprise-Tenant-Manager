import { createContext, useContext, type ReactNode, useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation, Redirect } from "wouter";
import { useQuery } from "@tanstack/react-query";

export type BusinessType = "clinic" | "salon" | "pg" | "coworking" | "service" | "real_estate" | "tourism" | "education" | "logistics" | "legal" | "furniture_manufacturing" | "software_services" | "consulting";

export interface ModuleConfig {
  id: string;
  name: string;
  enabled: boolean;
  routes: string[];
}

export type FeatureFlag = "hrms_it_extensions" | "advanced_analytics" | "multi_currency";

export interface FeatureFlagConfig {
  [businessType: string]: FeatureFlag[];
}

const FEATURE_FLAGS: FeatureFlagConfig = {
  clinic: ["hrms_it_extensions"],
  salon: [],
  pg: [],
  coworking: ["hrms_it_extensions"],
  service: ["hrms_it_extensions"],
  real_estate: [],
  tourism: [],
  education: ["hrms_it_extensions"],
  logistics: [],
  legal: ["hrms_it_extensions"],
  furniture_manufacturing: ["hrms_it_extensions", "multi_currency"],
  software_services: ["hrms_it_extensions", "multi_currency"],
  consulting: ["hrms_it_extensions", "multi_currency"],
};

const HRMS_MODULE: ModuleConfig = {
  id: "hrms",
  name: "HR Management",
  enabled: true,
  routes: ["/hr", "/hr/employees", "/hr/attendance", "/hr/leaves", "/hr/payroll", "/hr/projects", "/hr/timesheets", "/hr/allocations"],
};

const BUSINESS_TYPE_MODULES: Record<BusinessType, ModuleConfig[]> = {
  clinic: [
    { id: "customers", name: "Customers", enabled: true, routes: ["/customers", "/customers/new"] },
    { id: "bookings", name: "Bookings", enabled: true, routes: ["/bookings", "/bookings/new"] },
    HRMS_MODULE,
    { id: "analytics", name: "Analytics", enabled: true, routes: ["/analytics"] },
    { id: "settings", name: "Settings", enabled: true, routes: ["/settings"] },
  ],
  salon: [
    { id: "customers", name: "Clients", enabled: true, routes: ["/customers", "/customers/new"] },
    { id: "services", name: "Services", enabled: true, routes: ["/services", "/services/new"] },
    { id: "bookings", name: "Appointments", enabled: true, routes: ["/bookings", "/bookings/new"] },
    HRMS_MODULE,
    { id: "analytics", name: "Analytics", enabled: true, routes: ["/analytics"] },
    { id: "settings", name: "Settings", enabled: true, routes: ["/settings"] },
  ],
  pg: [
    { id: "customers", name: "Customers", enabled: true, routes: ["/customers", "/customers/new"] },
    { id: "bookings", name: "Bookings", enabled: true, routes: ["/bookings", "/bookings/new"] },
    HRMS_MODULE,
    { id: "analytics", name: "Analytics", enabled: true, routes: ["/analytics"] },
    { id: "settings", name: "Settings", enabled: true, routes: ["/settings"] },
  ],
  coworking: [
    { id: "spaces", name: "Spaces", enabled: true, routes: ["/coworking/spaces"] },
    { id: "desks", name: "Desks", enabled: true, routes: ["/coworking/desks"] },
    { id: "bookings", name: "Bookings", enabled: true, routes: ["/coworking/bookings", "/coworking/book"] },
    HRMS_MODULE,
    { id: "analytics", name: "Analytics", enabled: true, routes: ["/analytics"] },
    { id: "settings", name: "Settings", enabled: true, routes: ["/settings"] },
  ],
  service: [
    { id: "customers", name: "Customers", enabled: true, routes: ["/customers", "/customers/new"] },
    { id: "services", name: "Services", enabled: true, routes: ["/services", "/services/new"] },
    { id: "bookings", name: "Bookings", enabled: true, routes: ["/bookings", "/bookings/new"] },
    HRMS_MODULE,
    { id: "analytics", name: "Analytics", enabled: true, routes: ["/analytics"] },
    { id: "settings", name: "Settings", enabled: true, routes: ["/settings"] },
  ],
  real_estate: [
    { id: "properties", name: "Properties", enabled: true, routes: ["/properties", "/properties/new", "/properties/:id"] },
    { id: "listings", name: "Listings", enabled: true, routes: ["/listings", "/listings/new", "/listings/:id"] },
    { id: "leads", name: "Leads", enabled: true, routes: ["/leads", "/leads/new", "/leads/:id"] },
    { id: "site_visits", name: "Site Visits", enabled: true, routes: ["/site-visits", "/site-visits/new", "/site-visits/:id"] },
    { id: "agents", name: "Agents", enabled: true, routes: ["/agents", "/agents/new", "/agents/:id"] },
    HRMS_MODULE,
    { id: "analytics", name: "Analytics", enabled: true, routes: ["/analytics"] },
    { id: "settings", name: "Settings", enabled: true, routes: ["/settings"] },
  ],
  tourism: [
    { id: "packages", name: "Packages", enabled: true, routes: ["/packages", "/packages/new", "/packages/:id"] },
    { id: "bookings", name: "Bookings", enabled: true, routes: ["/bookings", "/bookings/new", "/bookings/:id"] },
    { id: "customers", name: "Customers", enabled: true, routes: ["/customers", "/customers/new", "/customers/:id"] },
    { id: "itineraries", name: "Itineraries", enabled: true, routes: ["/itineraries", "/itineraries/new", "/itineraries/:id"] },
    { id: "vendors", name: "Vendors", enabled: true, routes: ["/vendors", "/vendors/new", "/vendors/:id"] },
    HRMS_MODULE,
    { id: "analytics", name: "Analytics", enabled: true, routes: ["/analytics"] },
    { id: "settings", name: "Settings", enabled: true, routes: ["/settings"] },
  ],
  education: [
    { id: "students", name: "Students", enabled: true, routes: ["/students", "/students/new", "/students/:id"] },
    { id: "courses", name: "Courses", enabled: true, routes: ["/courses", "/courses/new", "/courses/:id"] },
    { id: "batches", name: "Batches", enabled: true, routes: ["/batches", "/batches/new", "/batches/:id"] },
    { id: "attendance", name: "Attendance", enabled: true, routes: ["/attendance", "/attendance/:batchId"] },
    { id: "exams", name: "Exams", enabled: true, routes: ["/exams", "/exams/new", "/exams/:id", "/exams/:id/results"] },
    { id: "fees", name: "Fees", enabled: true, routes: ["/fees", "/fees/new", "/fees/:id", "/fees/collections"] },
    HRMS_MODULE,
    { id: "analytics", name: "Analytics", enabled: true, routes: ["/analytics"] },
    { id: "settings", name: "Settings", enabled: true, routes: ["/settings"] },
  ],
  logistics: [
    { id: "vehicles", name: "Vehicles", enabled: true, routes: ["/vehicles", "/vehicles/new", "/vehicles/:id"] },
    { id: "drivers", name: "Drivers", enabled: true, routes: ["/drivers", "/drivers/new", "/drivers/:id"] },
    { id: "trips", name: "Trips", enabled: true, routes: ["/trips", "/trips/new", "/trips/:id"] },
    { id: "shipments", name: "Shipments", enabled: true, routes: ["/shipments", "/shipments/new", "/shipments/:id"] },
    { id: "tracking", name: "Tracking", enabled: true, routes: ["/tracking", "/tracking/:shipmentId"] },
    { id: "maintenance", name: "Maintenance", enabled: true, routes: ["/maintenance", "/maintenance/new", "/maintenance/:id"] },
    HRMS_MODULE,
    { id: "analytics", name: "Analytics", enabled: true, routes: ["/analytics"] },
    { id: "settings", name: "Settings", enabled: true, routes: ["/settings"] },
  ],
  legal: [
    { id: "clients", name: "Clients", enabled: true, routes: ["/clients", "/clients/new", "/clients/:id"] },
    { id: "cases", name: "Cases", enabled: true, routes: ["/cases", "/cases/new", "/cases/:id"] },
    { id: "appointments", name: "Appointments", enabled: true, routes: ["/appointments", "/appointments/new", "/appointments/:id"] },
    { id: "documents", name: "Documents", enabled: true, routes: ["/documents", "/documents/new", "/documents/:id"] },
    { id: "billing", name: "Billing", enabled: true, routes: ["/billing", "/billing/new", "/billing/:id", "/billing/invoices"] },
    HRMS_MODULE,
    { id: "analytics", name: "Analytics", enabled: true, routes: ["/analytics"] },
    { id: "settings", name: "Settings", enabled: true, routes: ["/settings"] },
  ],
  furniture_manufacturing: [
    { id: "products", name: "Products", enabled: true, routes: ["/furniture/products", "/furniture/products/new", "/furniture/products/:id"] },
    { id: "raw_materials", name: "Raw Materials", enabled: true, routes: ["/furniture/raw-materials", "/furniture/raw-materials/new", "/furniture/raw-materials/:id"] },
    { id: "bom", name: "Bill of Materials", enabled: true, routes: ["/furniture/bom", "/furniture/bom/new", "/furniture/bom/:id"] },
    { id: "production", name: "Production Orders", enabled: true, routes: ["/furniture/production-orders", "/furniture/production-orders/new", "/furniture/production-orders/:id"] },
    { id: "sales", name: "Sales Orders", enabled: true, routes: ["/furniture/sales-orders", "/furniture/sales-orders/new", "/furniture/sales-orders/:id"] },
    { id: "deliveries", name: "Deliveries", enabled: true, routes: ["/furniture/deliveries", "/furniture/deliveries/new", "/furniture/deliveries/:id"] },
    { id: "installations", name: "Installations", enabled: true, routes: ["/furniture/installations", "/furniture/installations/new", "/furniture/installations/:id"] },
    HRMS_MODULE,
    { id: "analytics", name: "Analytics", enabled: true, routes: ["/analytics"] },
    { id: "settings", name: "Settings", enabled: true, routes: ["/settings"] },
  ],
  software_services: [
    { id: "projects", name: "Projects", enabled: true, routes: ["/software-services/projects", "/software-services/projects/new", "/software-services/projects/:id"] },
    { id: "tasks", name: "Tasks", enabled: true, routes: ["/software-services/tasks", "/software-services/tasks/:id"] },
    { id: "timesheets", name: "Timesheets", enabled: true, routes: ["/software-services/timesheets", "/software-services/timesheets/new"] },
    { id: "invoices", name: "Invoices", enabled: true, routes: ["/software-services/invoices", "/software-services/invoices/new"] },
    { id: "customers", name: "Clients", enabled: true, routes: ["/customers", "/customers/new"] },
    HRMS_MODULE,
    { id: "analytics", name: "Analytics", enabled: true, routes: ["/analytics"] },
    { id: "settings", name: "Settings", enabled: true, routes: ["/settings"] },
  ],
  consulting: [
    { id: "projects", name: "Engagements", enabled: true, routes: ["/consulting/projects", "/consulting/projects/new", "/consulting/projects/:id"] },
    { id: "tasks", name: "Tasks", enabled: true, routes: ["/consulting/tasks", "/consulting/tasks/:id"] },
    { id: "timesheets", name: "Timesheets", enabled: true, routes: ["/consulting/timesheets", "/consulting/timesheets/new"] },
    { id: "invoices", name: "Invoices", enabled: true, routes: ["/consulting/invoices", "/consulting/invoices/new"] },
    { id: "customers", name: "Clients", enabled: true, routes: ["/customers", "/customers/new"] },
    HRMS_MODULE,
    { id: "analytics", name: "Analytics", enabled: true, routes: ["/analytics"] },
    { id: "settings", name: "Settings", enabled: true, routes: ["/settings"] },
  ],
};

const DASHBOARD_ROUTES: Record<BusinessType, string> = {
  clinic: "/dashboard/clinic",
  salon: "/dashboard/salon",
  pg: "/dashboard/pg",
  coworking: "/dashboard/coworking",
  service: "/dashboard/service",
  real_estate: "/dashboard/real-estate",
  tourism: "/dashboard/tourism",
  education: "/dashboard/education",
  logistics: "/dashboard/logistics",
  legal: "/dashboard/legal",
  furniture_manufacturing: "/dashboard/furniture",
  software_services: "/dashboard/software-services",
  consulting: "/dashboard/consulting",
};


interface TenantContextValue {
  businessType: BusinessType;
  modules: ModuleConfig[];
  dashboardRoute: string;
  features: FeatureFlag[];
  isModuleEnabled: (moduleId: string) => boolean;
  isRouteAllowed: (route: string) => boolean;
  isFeatureEnabled: (featureId: FeatureFlag) => boolean;
}

const TenantContext = createContext<TenantContextValue | null>(null);

export function useTenant() {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error("useTenant must be used within a TenantProvider");
  }
  return context;
}

export function TenantProvider({ children }: { children: ReactNode }) {
  const { businessType: authBusinessType } = useAuth();
  const businessType = (authBusinessType as BusinessType) || "service";

  const modules = BUSINESS_TYPE_MODULES[businessType] || BUSINESS_TYPE_MODULES.service;
  const dashboardRoute = DASHBOARD_ROUTES[businessType] || DASHBOARD_ROUTES.service;
  const features = FEATURE_FLAGS[businessType] || [];

  const isModuleEnabled = (moduleId: string): boolean => {
    const module = modules.find((m) => m.id === moduleId);
    return module?.enabled ?? false;
  };

  const isRouteAllowed = (route: string): boolean => {
    if (route === "/" || route === "/dashboard" || route === dashboardRoute) {
      return true;
    }

    if (route === "/settings" || route === "/analytics") {
      return true;
    }

    const allowedRoutes = modules.flatMap((m) => (m.enabled ? m.routes : []));
    return allowedRoutes.some((r) => route === r || route.startsWith(r + "/"));
  };

  const isFeatureEnabled = (featureId: FeatureFlag): boolean => {
    return features.includes(featureId);
  };

  const value: TenantContextValue = {
    businessType,
    modules,
    dashboardRoute,
    features,
    isModuleEnabled,
    isRouteAllowed,
    isFeatureEnabled,
  };

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
}

interface ProtectedRouteProps {
  children: ReactNode;
  requiredBusinessType?: BusinessType;
  moduleId?: string;
}

export function ProtectedRoute({ children, requiredBusinessType, moduleId }: ProtectedRouteProps) {
  const { businessType, isModuleEnabled, dashboardRoute } = useTenant();

  if (requiredBusinessType && businessType !== requiredBusinessType) {
    return <Redirect to={dashboardRoute} />;
  }

  if (moduleId && !isModuleEnabled(moduleId)) {
    return <Redirect to={dashboardRoute} />;
  }

  return <>{children}</>;
}

interface DashboardGuardProps {
  allowedBusinessType: BusinessType;
  children: ReactNode;
}

export function DashboardGuard({ allowedBusinessType, children }: DashboardGuardProps) {
  const { businessType, dashboardRoute } = useTenant();

  if (businessType !== allowedBusinessType) {
    return <Redirect to={dashboardRoute} />;
  }

  return <>{children}</>;
}

interface ModuleGuardProps {
  children: ReactNode;
  moduleId: string;
}

export function ModuleGuard({ children, moduleId }: ModuleGuardProps) {
  const { isModuleEnabled, dashboardRoute } = useTenant();

  if (!isModuleEnabled(moduleId)) {
    return <Redirect to={dashboardRoute} />;
  }

  return <>{children}</>;
}

interface FeatureGuardProps {
  children: ReactNode;
  featureId: FeatureFlag;
  fallback?: ReactNode;
}

export function FeatureGuard({ children, featureId, fallback = null }: FeatureGuardProps) {
  const { isFeatureEnabled, dashboardRoute } = useTenant();

  if (!isFeatureEnabled(featureId)) {
    if (fallback) {
      return <>{fallback}</>;
    }
    return <Redirect to={dashboardRoute} />;
  }

  return <>{children}</>;
}

interface OnboardingGuardProps {
  children: ReactNode;
}

interface SubscriptionData {
  subscription: {
    id: string;
    status: string;
  } | null;
  plan: {
    id: string;
    tier: string;
    name: string;
  } | null;
  status: string;
  isActive: boolean;
}

export function OnboardingGuard({ children }: OnboardingGuardProps) {
  const [location] = useLocation();
  const { isAuthenticated, tenant } = useAuth();
  const tenantId = tenant?.id;

  // Check for recently activated subscription flag (set by packages page on activation)
  const recentlyActivated = localStorage.getItem("subscriptionJustActivated") === "true";

  // CRITICAL: Only fetch subscription when tenantId is available
  const canFetchSubscription = Boolean(tenantId) && isAuthenticated;
  
  // Use default query function from queryClient (includes getAuthHeaders with X-Tenant-ID)
  const { data: subscriptionData, isLoading, isError, isSuccess, refetch, isFetching } = useQuery<SubscriptionData>({
    queryKey: ["/api/billing/subscription"],
    enabled: canFetchSubscription, // 🔑 NEVER run when tenantId is null/undefined
    staleTime: 30000,
    retry: canFetchSubscription ? 2 : false, // Don't retry if missing tenant
  });

  // When activation flag is detected and subscription is active, clear the flag
  useEffect(() => {
    if (recentlyActivated && subscriptionData?.isActive === true) {
      localStorage.removeItem("subscriptionJustActivated");
    }
  }, [recentlyActivated, subscriptionData]);

  // If activation flag is set but subscription still shows inactive, refetch
  useEffect(() => {
    if (recentlyActivated && tenantId && isAuthenticated && !isFetching && !subscriptionData?.isActive) {
      refetch();
    }
  }, [recentlyActivated, tenantId, isAuthenticated, isFetching, subscriptionData, refetch]);

  const allowedPaths = ["/packages", "/checkout", "/pricing", "/subscription/select", "/onboarding"];
  const isAllowedPath = allowedPaths.some(path => location.startsWith(path));

  // Always allow access to onboarding-related paths
  if (isAllowedPath) {
    return <>{children}</>;
  }

  // Allow access if not authenticated (login/register pages handle this)
  if (!isAuthenticated || !tenantId) {
    return <>{children}</>;
  }

  // Wait for subscription query to complete before making redirect decisions
  if (isLoading || isFetching) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading subscription...</p>
        </div>
      </div>
    );
  }

  // If query failed after retries, show error with retry option instead of blind redirect
  if (isError) {
    // Use refetch directly - simpler and avoids duplicate requests
    const handleRetry = () => {
      refetch();
    };

    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 max-w-md text-center px-4">
          <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
            <span className="text-2xl">!</span>
          </div>
          <h2 className="text-lg font-semibold">Unable to load subscription</h2>
          <p className="text-sm text-muted-foreground">
            We couldn't verify your subscription status. This may be a temporary network issue.
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleRetry}
              className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
              data-testid="button-retry-subscription"
            >
              Try again
            </button>
            <a
              href="/packages"
              className="px-4 py-2 text-sm border rounded-md hover:bg-muted"
              data-testid="link-select-plan"
            >
              Select a plan
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Only proceed if query succeeded - don't allow access on null/undefined data
  if (!isSuccess) {
    return <Redirect to="/packages" />;
  }

  // Normalize status to lowercase for consistent comparison
  const isActive = subscriptionData?.isActive === true;
  const rawStatus = subscriptionData?.status || subscriptionData?.subscription?.status || "";
  const status = rawStatus.toLowerCase();
  
  // ACTIVE/TRIALING - allow access to dashboard routes
  if (isActive || status === "active" || status === "trialing") {
    return <>{children}</>;
  }

  // PENDING_PAYMENT - redirect to checkout to complete payment
  if (status === "pending_payment") {
    return <Redirect to="/checkout" />;
  }

  // No subscription (NONE) or other states - redirect to packages
  return <Redirect to="/packages" />;
}
