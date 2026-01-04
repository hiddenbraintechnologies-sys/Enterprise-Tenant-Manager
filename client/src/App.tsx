import { Switch, Route, Redirect, useLocation } from "wouter";
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
import RealEstateDashboard from "@/pages/real-estate-dashboard";
import TourismDashboard from "@/pages/tourism-dashboard";
import EducationDashboard from "@/pages/education-dashboard";
import LogisticsDashboard from "@/pages/logistics-dashboard";
import LegalDashboard from "@/pages/legal-dashboard";
import Customers from "@/pages/customers";
import Services from "@/pages/services";
import Bookings from "@/pages/bookings";
import Analytics from "@/pages/analytics";
import Settings from "@/pages/settings";
import Onboarding from "@/pages/onboarding";
import NotFound from "@/pages/not-found";

import { AdminLayout } from "@/components/admin-layout";
import { SuperAdminRouteGuard } from "@/contexts/admin-context";
import SuperAdminDashboard from "@/pages/super-admin-dashboard";
import PlatformAdminDashboard from "@/pages/platform-admin-dashboard";
import AdminTenants from "@/pages/admin/tenants";
import AdminPlatformAdmins from "@/pages/admin/platform-admins";
import AdminBilling from "@/pages/admin/billing";
import AdminWhatsApp from "@/pages/admin/whatsapp";
import AdminAuditLogs from "@/pages/admin/audit-logs";
import AdminSettings from "@/pages/admin/settings";
import ResellerDashboard from "@/pages/reseller-dashboard";
import Marketplace from "@/pages/marketplace";

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
      <Route path="/dashboard/real-estate">
        <DashboardGuard allowedBusinessType="real_estate">
          <RealEstateDashboard />
        </DashboardGuard>
      </Route>
      <Route path="/dashboard/tourism">
        <DashboardGuard allowedBusinessType="tourism">
          <TourismDashboard />
        </DashboardGuard>
      </Route>
      <Route path="/dashboard/education">
        <DashboardGuard allowedBusinessType="education">
          <EducationDashboard />
        </DashboardGuard>
      </Route>
      <Route path="/dashboard/logistics">
        <DashboardGuard allowedBusinessType="logistics">
          <LogisticsDashboard />
        </DashboardGuard>
      </Route>
      <Route path="/dashboard/legal">
        <DashboardGuard allowedBusinessType="legal">
          <LegalDashboard />
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
      <Route path="/marketplace" component={Marketplace} />
      <Route path="/settings" component={Settings} />
      <Route path="/onboarding" component={Onboarding} />
      <Route path="/reseller" component={ResellerDashboard} />
      <Route component={NotFound} />
    </Switch>
  );
}

function SuperAdminRoutes() {
  return (
    <SuperAdminRouteGuard>
      <Switch>
        <Route path="/super-admin" component={SuperAdminDashboard} />
        <Route path="/super-admin/tenants" component={AdminTenants} />
        <Route path="/super-admin/admins" component={AdminPlatformAdmins} />
        <Route path="/super-admin/billing" component={AdminBilling} />
        <Route path="/super-admin/whatsapp" component={AdminWhatsApp} />
        <Route path="/super-admin/audit-logs" component={AdminAuditLogs} />
        <Route path="/super-admin/settings" component={AdminSettings} />
        <Route component={NotFound} />
      </Switch>
    </SuperAdminRouteGuard>
  );
}

function PlatformAdminRoutes() {
  return (
    <Switch>
      <Route path="/admin" component={PlatformAdminDashboard} />
      <Route path="/admin/tenants" component={AdminTenants} />
      <Route path="/admin/admins" component={AdminPlatformAdmins} />
      <Route path="/admin/billing" component={AdminBilling} />
      <Route path="/admin/whatsapp" component={AdminWhatsApp} />
      <Route path="/admin/audit-logs" component={AdminAuditLogs} />
      <Route path="/admin/settings" component={AdminSettings} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AdminRoutes() {
  const [location] = useLocation();
  const isSuperAdminPath = location.startsWith("/super-admin");

  return (
    <AdminLayout>
      {isSuperAdminPath ? <SuperAdminRoutes /> : <PlatformAdminRoutes />}
    </AdminLayout>
  );
}

function AppRouter() {
  const { user, isLoading } = useAuth();
  const [location] = useLocation();

  const isAdminPath = location.startsWith("/super-admin") || location.startsWith("/admin");

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

  if (isAdminPath) {
    return <AdminRoutes />;
  }

  if (!user) {
    return (
      <Switch>
        <Route path="/register" component={Register} />
        <Route path="/onboarding" component={Onboarding} />
        <Route component={Landing} />
      </Switch>
    );
  }

  return (
    <TenantProvider>
      <AuthenticatedRoutes />
    </TenantProvider>
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
