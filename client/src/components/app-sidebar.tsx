import { useLocation, Link } from "wouter";
import {
  LayoutDashboard,
  Users,
  Calendar,
  Package,
  BarChart3,
  Settings,
  Building2,
  Monitor,
  MapPin,
  Stethoscope,
  Scissors,
  BedDouble,
  Home,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import type { BusinessType } from "@/contexts/tenant-context";

interface NavItem {
  title: string;
  url: string;
  icon: React.ElementType;
}

const NAV_ITEMS_BY_BUSINESS_TYPE: Record<BusinessType, NavItem[]> = {
  clinic: [
    { title: "Dashboard", url: "/dashboard/clinic", icon: LayoutDashboard },
    { title: "Customers", url: "/customers", icon: Users },
    { title: "Bookings", url: "/bookings", icon: Calendar },
    { title: "Analytics", url: "/analytics", icon: BarChart3 },
  ],
  salon: [
    { title: "Dashboard", url: "/dashboard/salon", icon: LayoutDashboard },
    { title: "Clients", url: "/customers", icon: Users },
    { title: "Services", url: "/services", icon: Scissors },
    { title: "Appointments", url: "/bookings", icon: Calendar },
    { title: "Analytics", url: "/analytics", icon: BarChart3 },
  ],
  pg: [
    { title: "Dashboard", url: "/dashboard/pg", icon: LayoutDashboard },
    { title: "Customers", url: "/customers", icon: Users },
    { title: "Bookings", url: "/bookings", icon: Calendar },
    { title: "Analytics", url: "/analytics", icon: BarChart3 },
  ],
  coworking: [
    { title: "Dashboard", url: "/dashboard/coworking", icon: LayoutDashboard },
    { title: "Spaces", url: "/coworking/spaces", icon: MapPin },
    { title: "Desks", url: "/coworking/desks", icon: Monitor },
    { title: "Bookings", url: "/coworking/bookings", icon: Calendar },
    { title: "Analytics", url: "/analytics", icon: BarChart3 },
  ],
  service: [
    { title: "Dashboard", url: "/dashboard/service", icon: LayoutDashboard },
    { title: "Customers", url: "/customers", icon: Users },
    { title: "Services", url: "/services", icon: Package },
    { title: "Bookings", url: "/bookings", icon: Calendar },
    { title: "Analytics", url: "/analytics", icon: BarChart3 },
  ],
  real_estate: [
    { title: "Dashboard", url: "/dashboard/real-estate", icon: LayoutDashboard },
    { title: "Properties", url: "/properties", icon: Building2 },
    { title: "Listings", url: "/listings", icon: Home },
    { title: "Leads", url: "/leads", icon: Users },
    { title: "Site Visits", url: "/site-visits", icon: MapPin },
    { title: "Analytics", url: "/analytics", icon: BarChart3 },
  ],
  tourism: [
    { title: "Dashboard", url: "/dashboard/tourism", icon: LayoutDashboard },
    { title: "Packages", url: "/packages", icon: Package },
    { title: "Bookings", url: "/bookings", icon: Calendar },
    { title: "Customers", url: "/customers", icon: Users },
    { title: "Itineraries", url: "/itineraries", icon: MapPin },
    { title: "Analytics", url: "/analytics", icon: BarChart3 },
  ],
  education: [
    { title: "Dashboard", url: "/dashboard/education", icon: LayoutDashboard },
    { title: "Students", url: "/students", icon: Users },
    { title: "Courses", url: "/courses", icon: Package },
    { title: "Batches", url: "/batches", icon: Calendar },
    { title: "Attendance", url: "/attendance", icon: Calendar },
    { title: "Exams", url: "/exams", icon: Package },
    { title: "Fees", url: "/fees", icon: Package },
    { title: "Analytics", url: "/analytics", icon: BarChart3 },
  ],
  logistics: [
    { title: "Dashboard", url: "/dashboard/logistics", icon: LayoutDashboard },
    { title: "Vehicles", url: "/vehicles", icon: Package },
    { title: "Drivers", url: "/drivers", icon: Users },
    { title: "Trips", url: "/trips", icon: MapPin },
    { title: "Shipments", url: "/shipments", icon: Package },
    { title: "Tracking", url: "/tracking", icon: MapPin },
    { title: "Maintenance", url: "/maintenance", icon: Settings },
    { title: "Analytics", url: "/analytics", icon: BarChart3 },
  ],
  legal: [
    { title: "Dashboard", url: "/dashboard/legal", icon: LayoutDashboard },
    { title: "Clients", url: "/clients", icon: Users },
    { title: "Cases", url: "/cases", icon: Package },
    { title: "Appointments", url: "/appointments", icon: Calendar },
    { title: "Documents", url: "/documents", icon: Package },
    { title: "Billing", url: "/billing", icon: Package },
    { title: "Analytics", url: "/analytics", icon: BarChart3 },
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
};

const systemItems: NavItem[] = [
  { title: "Marketplace", url: "/marketplace", icon: Package },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar({ businessType }: { businessType?: string } = {}) {
  const [location] = useLocation();
  const { user, logout, isLoggingOut, businessType: authBusinessType } = useAuth();

  const effectiveBusinessType = (businessType || authBusinessType || "service") as BusinessType;
  const mainNavItems = NAV_ITEMS_BY_BUSINESS_TYPE[effectiveBusinessType] || NAV_ITEMS_BY_BUSINESS_TYPE.service;
  const dashboardRoute = DASHBOARD_ROUTES[effectiveBusinessType] || DASHBOARD_ROUTES.service;

  const getInitials = (firstName?: string | null, lastName?: string | null) => {
    const first = firstName?.charAt(0) || "";
    const last = lastName?.charAt(0) || "";
    return (first + last).toUpperCase() || "U";
  };

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border px-4 py-4">
        <Link href={dashboardRoute} className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Building2 className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-base font-semibold" data-testid="text-app-name">BizFlow</span>
            <span className="text-xs text-muted-foreground">Business Manager</span>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Main Menu
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url || location.startsWith(item.url + "/")}
                  >
                    <Link href={item.url} data-testid={`link-nav-${item.title.toLowerCase().replace(/\s+/g, "-")}`}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            System
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {systemItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url}
                  >
                    <Link href={item.url} data-testid={`link-nav-${item.title.toLowerCase()}`}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarImage src={user?.profileImageUrl || undefined} alt={user?.firstName || "User"} />
            <AvatarFallback className="text-sm">
              {getInitials(user?.firstName, user?.lastName)}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-1 flex-col overflow-hidden">
            <span className="truncate text-sm font-medium" data-testid="text-user-name">
              {user?.firstName} {user?.lastName}
            </span>
            <span className="truncate text-xs text-muted-foreground" data-testid="text-user-email">
              {user?.email}
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => logout()}
            disabled={isLoggingOut}
            data-testid="button-logout"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
