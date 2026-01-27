import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { CountrySelector } from "@/components/country-selector";
import { NotificationBell } from "@/components/notification-bell";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { HelpCircle, Loader2, ArrowLeft } from "lucide-react";
import { useTour } from "@/contexts/tour-context";
import { dashboardTour } from "@/lib/tours";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { SubscriptionExpiryBanner } from "@/components/subscription-expiry-banner";
import { PlanUpgradeNudge } from "@/components/plan-upgrade-nudge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface DashboardLayoutProps {
  children: React.ReactNode;
  title: string;
  breadcrumbs?: { label: string; href?: string }[];
}

export function DashboardLayout({ children, title, breadcrumbs = [] }: DashboardLayoutProps) {
  const { startTour, completedTours, state } = useTour();
  const hasCompletedDashboardTour = completedTours.includes(dashboardTour.id);
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const [, setLocation] = useLocation();
  
  // Redirect to login if not authenticated after auth check completes
  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      setLocation("/login");
    }
  }, [isAuthLoading, isAuthenticated, setLocation]);

  // Auto-start tour for new users after a short delay
  useEffect(() => {
    if (isAuthenticated && !isAuthLoading && !hasCompletedDashboardTour && !state.isRunning) {
      const timer = setTimeout(() => {
        startTour(dashboardTour);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, isAuthLoading, hasCompletedDashboardTour, state.isRunning, startTour]);
  
  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };
  
  // Show loading state while checking authentication
  // This prevents child components from making API calls before tokens are ready
  if (isAuthLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }
  
  // Don't render dashboard content if not authenticated (redirect is happening)
  if (!isAuthenticated) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider style={sidebarStyle as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <SidebarInset className="flex flex-1 flex-col overflow-hidden">
          <header className="sticky top-0 z-50 flex h-14 shrink-0 items-center gap-2 border-b bg-background px-3 md:h-16 md:px-4">
            <SidebarTrigger className="-ml-1" data-testid="button-sidebar-toggle" />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                if (window.history.length > 1) {
                  window.history.back();
                } else {
                  setLocation("/dashboard");
                }
              }}
              className="sm:hidden -ml-1"
              data-testid="button-back-mobile"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Separator orientation="vertical" className="mr-2 h-4 hidden sm:block" />
            <Breadcrumb className="flex-1 hidden sm:block">
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/dashboard">Home</BreadcrumbLink>
                </BreadcrumbItem>
                {breadcrumbs.map((crumb, index) => (
                  <span key={index} className="contents">
                    <BreadcrumbSeparator className="hidden md:block" />
                    <BreadcrumbItem>
                      {crumb.href ? (
                        <BreadcrumbLink href={crumb.href}>{crumb.label}</BreadcrumbLink>
                      ) : (
                        <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                      )}
                    </BreadcrumbItem>
                  </span>
                ))}
              </BreadcrumbList>
            </Breadcrumb>
            <div className="flex items-center gap-1 sm:gap-2 ml-auto">
              <div className="hidden md:block">
                <CountrySelector />
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => startTour(dashboardTour)}
                    data-testid="button-start-tour"
                    className="hidden sm:flex"
                  >
                    <HelpCircle className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {hasCompletedDashboardTour ? "Replay tour" : "Take a tour"}
                </TooltipContent>
              </Tooltip>
              <NotificationBell />
              <ThemeToggle />
            </div>
          </header>
          <main className="flex-1 overflow-auto p-4 md:p-6">
            <div className="mx-auto max-w-7xl">
              <SubscriptionExpiryBanner />
              <PlanUpgradeNudge />
              <h1 className="mb-4 text-xl font-semibold md:mb-6 md:text-2xl" data-testid="text-page-title">{title}</h1>
              {children}
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
