import { createContext, useContext, type ReactNode } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation, Redirect } from "wouter";

export type BusinessType = "clinic" | "salon" | "pg" | "coworking" | "service" | "real_estate" | "tourism";

export interface ModuleConfig {
  id: string;
  name: string;
  enabled: boolean;
  routes: string[];
}

const BUSINESS_TYPE_MODULES: Record<BusinessType, ModuleConfig[]> = {
  clinic: [
    { id: "customers", name: "Customers", enabled: true, routes: ["/customers", "/customers/new"] },
    { id: "bookings", name: "Bookings", enabled: true, routes: ["/bookings", "/bookings/new"] },
    { id: "analytics", name: "Analytics", enabled: true, routes: ["/analytics"] },
    { id: "settings", name: "Settings", enabled: true, routes: ["/settings"] },
  ],
  salon: [
    { id: "customers", name: "Clients", enabled: true, routes: ["/customers", "/customers/new"] },
    { id: "services", name: "Services", enabled: true, routes: ["/services", "/services/new"] },
    { id: "bookings", name: "Appointments", enabled: true, routes: ["/bookings", "/bookings/new"] },
    { id: "analytics", name: "Analytics", enabled: true, routes: ["/analytics"] },
    { id: "settings", name: "Settings", enabled: true, routes: ["/settings"] },
  ],
  pg: [
    { id: "customers", name: "Customers", enabled: true, routes: ["/customers", "/customers/new"] },
    { id: "bookings", name: "Bookings", enabled: true, routes: ["/bookings", "/bookings/new"] },
    { id: "analytics", name: "Analytics", enabled: true, routes: ["/analytics"] },
    { id: "settings", name: "Settings", enabled: true, routes: ["/settings"] },
  ],
  coworking: [
    { id: "spaces", name: "Spaces", enabled: true, routes: ["/coworking/spaces"] },
    { id: "desks", name: "Desks", enabled: true, routes: ["/coworking/desks"] },
    { id: "bookings", name: "Bookings", enabled: true, routes: ["/coworking/bookings", "/coworking/book"] },
    { id: "analytics", name: "Analytics", enabled: true, routes: ["/analytics"] },
    { id: "settings", name: "Settings", enabled: true, routes: ["/settings"] },
  ],
  service: [
    { id: "customers", name: "Customers", enabled: true, routes: ["/customers", "/customers/new"] },
    { id: "services", name: "Services", enabled: true, routes: ["/services", "/services/new"] },
    { id: "bookings", name: "Bookings", enabled: true, routes: ["/bookings", "/bookings/new"] },
    { id: "analytics", name: "Analytics", enabled: true, routes: ["/analytics"] },
    { id: "settings", name: "Settings", enabled: true, routes: ["/settings"] },
  ],
  real_estate: [
    { id: "properties", name: "Properties", enabled: true, routes: ["/properties", "/properties/new", "/properties/:id"] },
    { id: "listings", name: "Listings", enabled: true, routes: ["/listings", "/listings/new", "/listings/:id"] },
    { id: "leads", name: "Leads", enabled: true, routes: ["/leads", "/leads/new", "/leads/:id"] },
    { id: "site_visits", name: "Site Visits", enabled: true, routes: ["/site-visits", "/site-visits/new", "/site-visits/:id"] },
    { id: "agents", name: "Agents", enabled: true, routes: ["/agents", "/agents/new", "/agents/:id"] },
    { id: "analytics", name: "Analytics", enabled: true, routes: ["/analytics"] },
    { id: "settings", name: "Settings", enabled: true, routes: ["/settings"] },
  ],
  tourism: [
    { id: "packages", name: "Packages", enabled: true, routes: ["/packages", "/packages/new", "/packages/:id"] },
    { id: "bookings", name: "Bookings", enabled: true, routes: ["/bookings", "/bookings/new", "/bookings/:id"] },
    { id: "customers", name: "Customers", enabled: true, routes: ["/customers", "/customers/new", "/customers/:id"] },
    { id: "itineraries", name: "Itineraries", enabled: true, routes: ["/itineraries", "/itineraries/new", "/itineraries/:id"] },
    { id: "vendors", name: "Vendors", enabled: true, routes: ["/vendors", "/vendors/new", "/vendors/:id"] },
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
};


interface TenantContextValue {
  businessType: BusinessType;
  modules: ModuleConfig[];
  dashboardRoute: string;
  isModuleEnabled: (moduleId: string) => boolean;
  isRouteAllowed: (route: string) => boolean;
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

  const value: TenantContextValue = {
    businessType,
    modules,
    dashboardRoute,
    isModuleEnabled,
    isRouteAllowed,
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
