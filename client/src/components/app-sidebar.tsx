import { useState, useMemo } from "react";
import { useLocation, Link } from "wouter";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
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
  Bot,
  Lock,
  Wallet,
  Clock,
  FileText,
  BadgeCheck,
  Puzzle,
  Briefcase,
  DollarSign,
  User,
  Palette,
  CreditCard,
  Shield,
  Brush,
  Bell,
  ChevronLeft,
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
import { useModuleAccess } from "@/hooks/use-module-access";
import { usePayrollAddon } from "@/hooks/use-payroll-addon";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { LockedFeatureModal } from "@/components/gating/locked-feature";
import { useFeatureGate, isDismissed, setDismissed } from "@/hooks/use-feature-gate";
import { InstallButton } from "@/components/pwa/install-prompt";
import type { BusinessType } from "@/contexts/tenant-context";
import type { GateReason } from "@/hooks/use-feature-gate";
import { useBranding } from "@/contexts/branding-context";

interface NavItem {
  title: string;
  url: string;
  icon: React.ElementType;
  tourId?: string;
}

// Map English titles to translation keys
const TITLE_TO_KEY: Record<string, string> = {
  "Dashboard": "sidebar.dashboard",
  "Projects": "sidebar.projects",
  "Timesheets": "sidebar.timesheets",
  "Clients": "sidebar.clients",
  "Customers": "sidebar.clients",
  "Invoices": "sidebar.invoices",
  "Analytics": "sidebar.analytics",
  "My Add-ons": "sidebar.myAddons",
  "Bookings": "sidebar.bookings",
  "Appointments": "sidebar.appointments",
  "Services": "sidebar.services",
  "Rooms": "sidebar.rooms",
  "Tenants": "sidebar.tenants",
  "Beds": "sidebar.beds",
  "Properties": "sidebar.properties",
  "Leads": "sidebar.leads",
  "Listings": "sidebar.listings",
  "Site Visits": "sidebar.bookings",
  "Tours": "sidebar.tours",
  "Packages": "sidebar.packages",
  "Itineraries": "sidebar.itineraries",
  "Students": "sidebar.students",
  "Courses": "sidebar.courses",
  "Batches": "sidebar.batches",
  "Exams": "sidebar.exams",
  "Fees": "sidebar.fees",
  "Attendance": "sidebar.attendance",
  "Vehicles": "sidebar.vehicles",
  "Drivers": "sidebar.drivers",
  "Shipments": "sidebar.shipments",
  "Trips": "sidebar.trips",
  "Maintenance": "sidebar.maintenance",
  "Tracking": "sidebar.tracking",
  "Cases": "sidebar.cases",
  "Documents": "sidebar.documents",
  "Billing": "sidebar.billing",
  "Products": "sidebar.products",
  "Raw Materials": "sidebar.inventory",
  "Production": "sidebar.production",
  "Sales Orders": "sidebar.orders",
  "Engagements": "sidebar.projects",
  "Desks": "sidebar.desks",
  "Spaces": "sidebar.spaces",
  "HR Dashboard": "sidebar.hrDashboard",
  "Employees": "sidebar.employees",
  "Payroll": "sidebar.payroll",
  "Attendance & Leave": "sidebar.attendanceLeave",
  "Marketplace": "sidebar.marketplace",
  "Settings": "sidebar.settings",
};

const NAV_ITEMS_BY_BUSINESS_TYPE: Record<BusinessType, NavItem[]> = {
  clinic: [
    { title: "Dashboard", url: "/dashboard/clinic", icon: LayoutDashboard },
    { title: "Customers", url: "/customers", icon: Users },
    { title: "Services", url: "/services", icon: Stethoscope },
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
  pg_hostel: [
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
    { title: "Site Visits", url: "/bookings", icon: MapPin },
    { title: "Customers", url: "/customers", icon: Users },
    { title: "Analytics", url: "/analytics", icon: BarChart3 },
  ],
  tourism: [
    { title: "Dashboard", url: "/dashboard/tourism", icon: LayoutDashboard },
    { title: "Packages", url: "/dashboard/tourism/packages", icon: Package },
    { title: "Services", url: "/services", icon: Scissors },
    { title: "Bookings", url: "/bookings", icon: Calendar },
    { title: "Customers", url: "/customers", icon: Users },
    { title: "Itineraries", url: "/dashboard/tourism/itineraries", icon: MapPin },
    { title: "Analytics", url: "/analytics", icon: BarChart3 },
  ],
  education: [
    { title: "Dashboard", url: "/dashboard/education", icon: LayoutDashboard },
    { title: "Students", url: "/dashboard/education/students", icon: Users },
    { title: "Courses", url: "/dashboard/education/courses", icon: Package },
    { title: "Batches", url: "/dashboard/education/batches", icon: Calendar },
    { title: "Attendance", url: "/dashboard/education/attendance", icon: Calendar },
    { title: "Exams", url: "/dashboard/education/exams", icon: Package },
    { title: "Fees", url: "/dashboard/education/fees", icon: Package },
    { title: "Analytics", url: "/analytics", icon: BarChart3 },
  ],
  logistics: [
    { title: "Dashboard", url: "/dashboard/logistics", icon: LayoutDashboard },
    { title: "Vehicles", url: "/dashboard/logistics/vehicles", icon: Package },
    { title: "Drivers", url: "/dashboard/logistics/drivers", icon: Users },
    { title: "Trips", url: "/dashboard/logistics/trips", icon: MapPin },
    { title: "Shipments", url: "/dashboard/logistics/shipments", icon: Package },
    { title: "Tracking", url: "/dashboard/logistics/tracking", icon: MapPin },
    { title: "Maintenance", url: "/dashboard/logistics/maintenance", icon: Settings },
    { title: "Analytics", url: "/analytics", icon: BarChart3 },
  ],
  legal: [
    { title: "Dashboard", url: "/dashboard/legal", icon: LayoutDashboard },
    { title: "Clients", url: "/dashboard/legal/clients", icon: Users },
    { title: "Cases", url: "/dashboard/legal/cases", icon: Briefcase },
    { title: "Appointments", url: "/dashboard/legal/appointments", icon: Calendar },
    { title: "Documents", url: "/dashboard/legal/documents", icon: FileText },
    { title: "Billing", url: "/dashboard/legal/billing", icon: DollarSign },
    { title: "Analytics", url: "/analytics", icon: BarChart3 },
  ],
  furniture_manufacturing: [
    { title: "Dashboard", url: "/dashboard/furniture", icon: LayoutDashboard },
    { title: "Products", url: "/dashboard/furniture/products", icon: Package },
    { title: "Raw Materials", url: "/dashboard/furniture/raw-materials", icon: Package },
    { title: "Production", url: "/dashboard/furniture/production", icon: Package },
    { title: "Sales Orders", url: "/dashboard/furniture/sales-orders", icon: Package },
    { title: "Invoices", url: "/dashboard/furniture/invoices", icon: Package },
    { title: "Analytics", url: "/dashboard/furniture/analytics", icon: BarChart3 },
  ],
  software_services: [
    { title: "Dashboard", url: "/dashboard/software-services", icon: LayoutDashboard },
    { title: "Projects", url: "/dashboard/software-services/projects", icon: Package },
    { title: "Timesheets", url: "/dashboard/software-services/timesheets", icon: Calendar },
    { title: "Clients", url: "/customers", icon: Users },
    { title: "Invoices", url: "/dashboard/software-services/invoices", icon: Package },
    { title: "Analytics", url: "/analytics", icon: BarChart3 },
  ],
  consulting: [
    { title: "Dashboard", url: "/dashboard/consulting", icon: LayoutDashboard },
    { title: "Engagements", url: "/dashboard/consulting/projects", icon: Package },
    { title: "Timesheets", url: "/dashboard/consulting/timesheets", icon: Calendar },
    { title: "Clients", url: "/customers", icon: Users },
    { title: "Invoices", url: "/dashboard/consulting/invoices", icon: Package },
    { title: "Analytics", url: "/analytics", icon: BarChart3 },
  ],
  digital_agency: [
    { title: "Dashboard", url: "/dashboard/digital-agency", icon: LayoutDashboard },
    { title: "Campaigns", url: "/digital-agency/projects", icon: Package },
    { title: "Clients", url: "/customers", icon: Users },
    { title: "Invoices", url: "/digital-agency/invoices", icon: Package },
    { title: "Analytics", url: "/analytics", icon: BarChart3 },
  ],
  retail_store: [
    { title: "Dashboard", url: "/dashboard/retail", icon: LayoutDashboard },
    { title: "Products", url: "/retail/products", icon: Package },
    { title: "Orders", url: "/retail/orders", icon: Calendar },
    { title: "Customers", url: "/customers", icon: Users },
    { title: "Invoices", url: "/retail/invoices", icon: Package },
    { title: "Analytics", url: "/analytics", icon: BarChart3 },
  ],
};

const DASHBOARD_ROUTES: Record<BusinessType, string> = {
  clinic: "/dashboard/clinic",
  salon: "/dashboard/salon",
  pg: "/dashboard/pg",
  pg_hostel: "/dashboard/pg",
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
  digital_agency: "/dashboard/digital-agency",
  retail_store: "/dashboard/retail",
};

const systemItems: NavItem[] = [
  { title: "Marketplace", url: "/marketplace", icon: Package, tourId: "sidebar-marketplace" },
  { title: "AI Permissions", url: "/ai-permissions", icon: Bot },
  { title: "Settings", url: "/settings", icon: Settings, tourId: "sidebar-settings" },
];

const settingsNavItems: NavItem[] = [
  { title: "Profile", url: "/settings/profile", icon: User },
  { title: "Business", url: "/settings/business", icon: Building2 },
  { title: "Branding", url: "/settings/branding", icon: Brush },
  { title: "Appearance", url: "/settings/appearance", icon: Palette },
  { title: "Notifications", url: "/settings/notifications", icon: Bell },
  { title: "Billing", url: "/settings/billing", icon: CreditCard },
  { title: "Customer Portal", url: "/settings/portal", icon: Users },
  { title: "Security", url: "/settings/security", icon: Shield },
];

// HR Core items (Payroll OR HRMS add-on) - Employee Directory
const hrCoreItems: NavItem[] = [
  { title: "HR Dashboard", url: "/hr", icon: LayoutDashboard },
  { title: "Employees", url: "/hr/employees", icon: Users },
];

// Payroll item (Payroll add-on ONLY - HRMS alone does NOT grant access)
const payrollItem: NavItem = { title: "Payroll", url: "/hr/payroll", icon: Wallet };

// HRMS Suite items (HRMS add-on ONLY)
const hrmsSuiteItems: NavItem[] = [
  { title: "Attendance", url: "/hr/attendance", icon: Clock },
  { title: "Leave", url: "/hr/leaves", icon: Calendar },
  { title: "Pay Runs", url: "/hr/pay-runs", icon: FileText },
];

const MODULE_GATED_BUSINESS_TYPES: BusinessType[] = ["software_services", "consulting", "furniture_manufacturing"];

interface LockedModalState {
  open: boolean;
  featureKey: string;
  featureDisplayName: string;
  reason: GateReason;
  requiredPlanTier?: "basic" | "pro" | "enterprise";
  addonCode?: string;
  trialDays?: number;
  countryCode?: string;
}

export function AppSidebar({ businessType }: { businessType?: string } = {}) {
  const [location] = useLocation();
  const { t } = useTranslation();
  const { user, logout, isLoggingOut, businessType: authBusinessType, tenant } = useAuth();
  const { canAccessModule, getModuleAccessInfo, isFreePlan } = useModuleAccess();
  const { hasPayrollAccess, isPayrollTrialing, countryCode, isLoading: isPayrollLoading } = usePayrollAddon();
  const { branding } = useBranding();

  const [lockedModal, setLockedModal] = useState<LockedModalState>({
    open: false,
    featureKey: "",
    featureDisplayName: "",
    reason: "PLAN_TOO_LOW",
  });

  const effectiveBusinessType = (businessType || authBusinessType || "service") as BusinessType;
  const tenantId = tenant?.id || "";
  
  // Check for marketplace-installed payroll/HRMS add-ons
  const { data: installedAddonsData } = useQuery<{ installedAddons: Array<{ addon: { slug: string } | null; installation: { status: string; subscriptionStatus: string } }> }>({
    queryKey: ["/api/addons/tenant", tenantId, "addons"],
    enabled: Boolean(user && tenantId),
  });
  
  // Separate checks for Payroll vs HRMS add-ons
  const { hasMarketplacePayroll, hasMarketplaceHrms } = useMemo(() => {
    if (!installedAddonsData?.installedAddons) {
      return { hasMarketplacePayroll: false, hasMarketplaceHrms: false };
    }
    
    let payroll = false;
    let hrms = false;
    
    for (const item of installedAddonsData.installedAddons) {
      const slug = item.addon?.slug?.toLowerCase() || "";
      const isActive = item.installation.status === "active" && 
        (item.installation.subscriptionStatus === "active" || item.installation.subscriptionStatus === "trialing");
      
      if (!isActive) continue;
      
      if (slug.startsWith("payroll")) {
        payroll = true;
      }
      if (slug.startsWith("hrms")) {
        hrms = true;
      }
    }
    
    return { hasMarketplacePayroll: payroll, hasMarketplaceHrms: hrms };
  }, [installedAddonsData]);
  
  // HR Foundation access: Payroll OR HRMS add-on
  const hasEmployeeDirectoryAccess = hasPayrollAccess() || hasMarketplacePayroll || hasMarketplaceHrms;
  
  // HRMS Suite access: HRMS add-on ONLY (Payroll does NOT grant this)
  const hasHrmsSuiteAccess = hasMarketplaceHrms;
  
  // Show HR section if tenant has any HR add-on (Payroll or HRMS)
  const showHrSection = Boolean(user && hasEmployeeDirectoryAccess);
  const mainNavItems = NAV_ITEMS_BY_BUSINESS_TYPE[effectiveBusinessType] || NAV_ITEMS_BY_BUSINESS_TYPE.service;
  const dashboardRoute = DASHBOARD_ROUTES[effectiveBusinessType] || DASHBOARD_ROUTES.service;
  
  const isModuleGated = MODULE_GATED_BUSINESS_TYPES.includes(effectiveBusinessType);
  const hasModuleAccess = !isModuleGated || canAccessModule(effectiveBusinessType);
  const moduleAccessInfo = getModuleAccessInfo(effectiveBusinessType);
  const shouldHideModules = isModuleGated && isFreePlan() && !hasModuleAccess;

  const payrollGate = useFeatureGate("payroll", "payroll");
  const moduleGate = useFeatureGate(effectiveBusinessType);

  const openLockedModal = (featureKey: string, featureDisplayName: string, reason: GateReason, opts?: { addonCode?: string; trialDays?: number; requiredPlanTier?: "basic" | "pro" | "enterprise"; countryCode?: string }) => {
    if (tenantId && isDismissed(tenantId, featureKey)) {
      return;
    }
    setLockedModal({
      open: true,
      featureKey,
      featureDisplayName,
      reason,
      ...opts,
    });
  };

  const handlePayrollLockedClick = () => {
    if (payrollGate.allowed) return;
    openLockedModal(
      "payroll",
      payrollGate.featureDisplayName || "Payroll",
      payrollGate.reason || "NOT_INSTALLED",
      {
        addonCode: payrollGate.addonCode,
        trialDays: payrollGate.trialDays,
        requiredPlanTier: payrollGate.requiredPlanTier,
        countryCode: payrollGate.countryCode,
      }
    );
  };

  const handleModuleLockedClick = () => {
    if (moduleGate.allowed) return;
    openLockedModal(
      effectiveBusinessType,
      moduleGate.featureDisplayName || effectiveBusinessType.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
      moduleGate.reason || "PLAN_TOO_LOW",
      {
        requiredPlanTier: moduleGate.requiredPlanTier || "basic",
        countryCode: moduleGate.countryCode,
      }
    );
  };

  const handleDismiss = () => {
    if (tenantId) {
      setDismissed(tenantId, lockedModal.featureKey);
    }
  };

  const getInitials = (firstName?: string | null, lastName?: string | null) => {
    const first = firstName?.charAt(0) || "";
    const last = lastName?.charAt(0) || "";
    return (first + last).toUpperCase() || "U";
  };

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border px-4 py-4">
        <Link href={dashboardRoute} className="flex items-center gap-3">
          {branding?.logoUrl ? (
            <img 
              src={branding.logoUrl} 
              alt={(tenant as any)?.businessName || "Company Logo"}
              className="h-9 w-auto max-w-[140px] object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
                (e.target as HTMLImageElement).nextElementSibling?.classList.remove("hidden");
              }}
              data-testid="img-sidebar-logo"
            />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Building2 className="h-5 w-5" />
            </div>
          )}
          <div className="flex flex-col">
            <span className="text-base font-semibold" data-testid="text-app-name">
              {(tenant as any)?.businessName || "MyBizStream"}
            </span>
            <span className="text-xs text-muted-foreground">Business Manager</span>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        {/* Settings Navigation - shown when on /settings/* pages */}
        {location.startsWith("/settings") ? (
          <>
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <Link href={dashboardRoute} data-testid="link-back-to-dashboard">
                        <ChevronLeft className="h-4 w-4" />
                        <span>Back to Dashboard</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
            <SidebarGroup>
              <SidebarGroupLabel className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Settings
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {settingsNavItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        isActive={location === item.url || location.startsWith(item.url + "/")}
                      >
                        <Link 
                          href={item.url} 
                          data-testid={`link-settings-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
                        >
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        ) : (
          <>
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {t("sidebar.mainMenu", "Main Menu")}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {hasModuleAccess ? (
                mainNavItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={location === item.url || location.startsWith(item.url + "/")}
                    >
                      <Link 
                        href={item.url} 
                        data-testid={`link-nav-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
                        data-tour={`sidebar-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{t(TITLE_TO_KEY[item.title] || item.title, item.title)}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))
              ) : shouldHideModules ? (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link 
                      href={`/packages?reason=upgrade&module=${encodeURIComponent(effectiveBusinessType)}`}
                      data-testid="link-upgrade-plan"
                    >
                      <Package className="h-4 w-4" />
                      <span>{t("lockedFeature.upgradeButton")}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ) : (
                <>
                  <SidebarMenuItem>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div 
                          className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground bg-muted/50 rounded-md cursor-pointer hover-elevate"
                          onClick={handleModuleLockedClick}
                          data-testid="div-module-locked"
                        >
                          <Lock className="h-4 w-4" />
                          <span>{t("lockedFeature.plan.title", { feature: effectiveBusinessType.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()) })}</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{t("lockedFeature.plan.body")}</p>
                      </TooltipContent>
                    </Tooltip>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <Link 
                        href={`/packages?reason=locked&module=${encodeURIComponent(effectiveBusinessType)}`}
                        data-testid="link-upgrade-plan"
                      >
                        <Package className="h-4 w-4" />
                        <span>{t("lockedFeature.upgradeButton")}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </>
              )}
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={location === "/my-addons"}
                >
                  <Link 
                    href="/my-addons"
                    data-testid="link-nav-my-add-ons"
                  >
                    <Puzzle className="h-4 w-4" />
                    <span>My Add-ons</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {showHrSection && (
          <SidebarGroup data-testid="sidebar-group-hr">
            <SidebarGroupLabel className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              {hasHrmsSuiteAccess ? t("sidebar.hrmsSuite", "HRMS Suite") : t("sidebar.hrPayroll", "HR / Payroll")}
              {isPayrollTrialing() && (
                <span 
                  className="text-xs bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 px-1.5 py-0.5 rounded"
                  data-testid="badge-payroll-trial"
                >
                  Trial
                </span>
              )}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {/* HR Core items (Payroll OR HRMS) - Employee Directory */}
                {hrCoreItems.map((item: NavItem) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={location === item.url || location.startsWith(item.url + "/")}
                    >
                      <Link
                        href={item.url}
                        data-testid={`link-hr-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{t(TITLE_TO_KEY[item.title] || item.title, item.title)}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
                
                {/* Payroll item (Payroll add-on ONLY) */}
                {hasMarketplacePayroll || hasPayrollAccess() ? (
                  <SidebarMenuItem key={payrollItem.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={location === payrollItem.url || location.startsWith(payrollItem.url + "/")}
                    >
                      <Link
                        href={payrollItem.url}
                        data-testid="link-hr-payroll"
                      >
                        <payrollItem.icon className="h-4 w-4" />
                        <span>{payrollItem.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ) : (
                  /* Show locked Payroll for HRMS-only users */
                  <SidebarMenuItem>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div 
                          className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground bg-muted/50 rounded-md cursor-pointer hover-elevate"
                          onClick={() => openLockedModal("payroll", "Payroll", "NOT_INSTALLED", { addonCode: "payroll" })}
                          data-testid="div-payroll-locked"
                        >
                          <Lock className="h-4 w-4" />
                          <span>Payroll</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Add the Payroll add-on for payroll processing</p>
                      </TooltipContent>
                    </Tooltip>
                  </SidebarMenuItem>
                )}
                
                {/* HRMS Suite items (HRMS add-on ONLY) */}
                {hasHrmsSuiteAccess ? (
                  hrmsSuiteItems.map((item: NavItem) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        isActive={location === item.url || location.startsWith(item.url + "/")}
                      >
                        <Link
                          href={item.url}
                          data-testid={`link-hrms-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
                        >
                          <item.icon className="h-4 w-4" />
                          <span>{t(TITLE_TO_KEY[item.title] || item.title, item.title)}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))
                ) : (
                  /* Show locked HRMS features for Payroll-only users */
                  <SidebarMenuItem>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div 
                          className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground bg-muted/50 rounded-md cursor-pointer hover-elevate"
                          onClick={() => openLockedModal("hrms", "HRMS Suite", "NOT_INSTALLED", { addonCode: "hrms" })}
                          data-testid="div-hrms-locked"
                        >
                          <Lock className="h-4 w-4" />
                          <span>Attendance & Leave</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Upgrade to HRMS add-on for attendance, leave, and timesheets</p>
                      </TooltipContent>
                    </Tooltip>
                  </SidebarMenuItem>
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {t("sidebar.system", "System")}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {systemItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url}
                  >
                    <Link 
                      href={item.url} 
                      data-testid={`link-nav-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
                      data-tour={item.tourId || `sidebar-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{t(TITLE_TO_KEY[item.title] || item.title, item.title)}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
          </>
        )}
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
          <InstallButton variant="ghost" />
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

      <LockedFeatureModal
        open={lockedModal.open}
        onOpenChange={(open) => setLockedModal(prev => ({ ...prev, open }))}
        featureKey={lockedModal.featureKey}
        featureDisplayName={lockedModal.featureDisplayName}
        reason={lockedModal.reason}
        requiredPlanTier={lockedModal.requiredPlanTier}
        addonCode={lockedModal.addonCode}
        trialDays={lockedModal.trialDays}
        countryCode={lockedModal.countryCode}
        onDismiss={handleDismiss}
      />
    </Sidebar>
  );
}
