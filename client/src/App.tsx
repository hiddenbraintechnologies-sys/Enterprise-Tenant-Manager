import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { useAuth } from "@/hooks/use-auth";

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
import NotFound from "@/pages/not-found";

const DASHBOARD_ROUTES = {
  clinic: "/dashboard/clinic",
  salon: "/dashboard/salon",
  pg: "/dashboard/pg",
  coworking: "/dashboard/coworking",
  service: "/dashboard/service",
} as const;

function AppRouter() {
  const { user, businessType, isLoading } = useAuth();

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
        <Route path="/register" component={Register} />
        <Route component={Landing} />
      </Switch>
    );
  }

  const defaultDashboard = DASHBOARD_ROUTES[businessType] || DASHBOARD_ROUTES.service;

  return (
    <Switch>
      <Route path="/">
        <Redirect to={defaultDashboard} />
      </Route>
      <Route path="/dashboard">
        <Redirect to={defaultDashboard} />
      </Route>
      
      <Route path="/dashboard/clinic" component={ClinicDashboard} />
      <Route path="/dashboard/salon" component={SalonDashboard} />
      <Route path="/dashboard/pg" component={PGDashboard} />
      <Route path="/dashboard/coworking" component={CoworkingDashboard} />
      <Route path="/dashboard/service" component={ServiceDashboard} />
      
      <Route path="/coworking" component={CoworkingDashboard} />
      <Route path="/coworking/desks" component={CoworkingDashboard} />
      <Route path="/coworking/bookings" component={CoworkingDashboard} />
      <Route path="/coworking/spaces" component={CoworkingDashboard} />
      <Route path="/coworking/book" component={CoworkingDashboard} />
      
      <Route path="/customers" component={Customers} />
      <Route path="/customers/new" component={Customers} />
      <Route path="/services" component={Services} />
      <Route path="/services/new" component={Services} />
      <Route path="/bookings" component={Bookings} />
      <Route path="/bookings/new" component={Bookings} />
      <Route path="/analytics" component={Analytics} />
      <Route path="/settings" component={Settings} />
      <Route component={NotFound} />
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
