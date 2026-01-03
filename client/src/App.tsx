import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { useAuth } from "@/hooks/use-auth";
import { TenantProvider, DashboardGuard, ModuleGuard, useTenant } from "@/contexts/tenant-context";

import Landing from "@/pages/landing";
import Register from "@/pages/register";
import ClinicDashboard from "@/pages/clinic-dashboard";
import SalonDashboard from "@/pages/salon-dashboard";
import PGDashboard from "@/pages/pg-dashboard";
import CoworkingDashboard from "@/pages/coworking-dashboard";
import ServiceDashboard from "@/pages/service-dashboard";
import Customers from "@/pages/customers";
import Services from "@/pages/services";
import Bookings from "@/pages/bookings";
import Analytics from "@/pages/analytics";
import Settings from "@/pages/settings";
import PlatformAdmin from "@/pages/platform-admin";
import NotFound from "@/pages/not-found";

function AuthenticatedRoutes() {
  const { dashboardRoute, businessType } = useTenant();

  return (
    <Switch>
      <Route path="/">
        <Redirect to={dashboardRoute} />
      </Route>
      <Route path="/dashboard">
        <Redirect to={dashboardRoute} />
      </Route>
      
      <Route path="/dashboard/clinic">
        <DashboardGuard allowedBusinessType="clinic">
          <ClinicDashboard />
        </DashboardGuard>
      </Route>
      <Route path="/dashboard/salon">
        <DashboardGuard allowedBusinessType="salon">
          <SalonDashboard />
        </DashboardGuard>
      </Route>
      <Route path="/dashboard/pg">
        <DashboardGuard allowedBusinessType="pg">
          <PGDashboard />
        </DashboardGuard>
      </Route>
      <Route path="/dashboard/coworking">
        <DashboardGuard allowedBusinessType="coworking">
          <CoworkingDashboard />
        </DashboardGuard>
      </Route>
      <Route path="/dashboard/service">
        <DashboardGuard allowedBusinessType="service">
          <ServiceDashboard />
        </DashboardGuard>
      </Route>
      
      <Route path="/coworking">
        <DashboardGuard allowedBusinessType="coworking">
          <CoworkingDashboard />
        </DashboardGuard>
      </Route>
      <Route path="/coworking/desks">
        <DashboardGuard allowedBusinessType="coworking">
          <ModuleGuard moduleId="desks">
            <CoworkingDashboard />
          </ModuleGuard>
        </DashboardGuard>
      </Route>
      <Route path="/coworking/bookings">
        <DashboardGuard allowedBusinessType="coworking">
          <ModuleGuard moduleId="bookings">
            <CoworkingDashboard />
          </ModuleGuard>
        </DashboardGuard>
      </Route>
      <Route path="/coworking/spaces">
        <DashboardGuard allowedBusinessType="coworking">
          <ModuleGuard moduleId="spaces">
            <CoworkingDashboard />
          </ModuleGuard>
        </DashboardGuard>
      </Route>
      <Route path="/coworking/book">
        <DashboardGuard allowedBusinessType="coworking">
          <ModuleGuard moduleId="bookings">
            <CoworkingDashboard />
          </ModuleGuard>
        </DashboardGuard>
      </Route>
      
      <Route path="/customers">
        <ModuleGuard moduleId="customers">
          <Customers />
        </ModuleGuard>
      </Route>
      <Route path="/customers/new">
        <ModuleGuard moduleId="customers">
          <Customers />
        </ModuleGuard>
      </Route>
      <Route path="/services">
        <ModuleGuard moduleId="services">
          <Services />
        </ModuleGuard>
      </Route>
      <Route path="/services/new">
        <ModuleGuard moduleId="services">
          <Services />
        </ModuleGuard>
      </Route>
      <Route path="/bookings">
        <ModuleGuard moduleId="bookings">
          <Bookings />
        </ModuleGuard>
      </Route>
      <Route path="/bookings/new">
        <ModuleGuard moduleId="bookings">
          <Bookings />
        </ModuleGuard>
      </Route>
      <Route path="/analytics" component={Analytics} />
      <Route path="/settings" component={Settings} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppRouter() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <Switch>
        <Route path="/platform-admin" component={PlatformAdmin} />
        <Route path="/register" component={Register} />
        <Route component={Landing} />
      </Switch>
    );
  }

  return (
    <Switch>
      <Route path="/platform-admin" component={PlatformAdmin} />
      <Route>
        <TenantProvider>
          <AuthenticatedRoutes />
        </TenantProvider>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="system" storageKey="bizflow-theme">
        <TooltipProvider>
          <Toaster />
          <AppRouter />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
