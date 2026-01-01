import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { useAuth } from "@/hooks/use-auth";

import Landing from "@/pages/landing";
import Register from "@/pages/register";
import Dashboard from "@/pages/dashboard";
import CoworkingDashboard from "@/pages/coworking-dashboard";
import Customers from "@/pages/customers";
import Services from "@/pages/services";
import Bookings from "@/pages/bookings";
import Analytics from "@/pages/analytics";
import Settings from "@/pages/settings";
import NotFound from "@/pages/not-found";

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
        <Route path="/register" component={Register} />
        <Route component={Landing} />
      </Switch>
    );
  }

  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/dashboard/coworking" component={CoworkingDashboard} />
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
