import { Switch, Route, Redirect, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { useAuth } from "@/hooks/use-auth";
import { TenantProvider, DashboardGuard, ModuleGuard, FeatureGuard, useTenant, OnboardingGuard } from "@/contexts/tenant-context";
import { TourProvider } from "@/contexts/tour-context";
import { TourOverlay } from "@/components/tour/tour-overlay";
import { CountryProvider } from "@/contexts/country-context";

import LandingGlobal from "@/pages/landing-global";
import LandingIndia from "@/pages/landing-india";
import LandingUK from "@/pages/landing-uk";
import LandingUAE from "@/pages/landing-uae";
import LandingSingapore from "@/pages/landing-singapore";
import LandingMalaysia from "@/pages/landing-malaysia";
import Register from "@/pages/register";
import ClinicDashboard from "@/pages/clinic-dashboard";
import SalonDashboard from "@/pages/salon-dashboard";
import PGDashboard from "@/pages/pg-dashboard";
import CoworkingDashboard from "@/pages/coworking-dashboard";
import CoworkingSpaces from "@/pages/coworking/spaces";
import ServiceDashboard from "@/pages/service-dashboard";
import RealEstateDashboard from "@/pages/real-estate-dashboard";
import RealEstateProperties from "@/pages/real-estate/properties";
import RealEstateListings from "@/pages/real-estate/listings";
import RealEstateLeads from "@/pages/real-estate/leads";
import TourismDashboard from "@/pages/tourism-dashboard";
import EducationDashboard from "@/pages/education-dashboard";
import LogisticsDashboard from "@/pages/logistics-dashboard";
import LegalDashboard from "@/pages/legal-dashboard";
import FurnitureDashboard from "@/pages/furniture-dashboard";
import FurnitureProducts from "@/pages/furniture/products";
import FurnitureRawMaterials from "@/pages/furniture/raw-materials";
import FurnitureProduction from "@/pages/furniture/production-orders";
import FurnitureSalesOrders from "@/pages/furniture/sales-orders";
import FurnitureInvoices from "@/pages/furniture/invoices";
import FurnitureAnalytics from "@/pages/furniture/analytics";
import SoftwareServicesDashboard from "@/pages/software-services-dashboard";
import SoftwareServicesProjects from "@/pages/software-services/projects";
import SoftwareServicesTimesheets from "@/pages/software-services/timesheets";
import ConsultingDashboard from "@/pages/consulting-dashboard";
import ConsultingProjects from "@/pages/consulting/projects";
import ConsultingTimesheets from "@/pages/consulting/timesheets";
import HrDashboard from "@/pages/hr-dashboard";
import HrEmployees from "@/pages/hr/employees";
import HrAttendance from "@/pages/hr/attendance";
import HrLeaves from "@/pages/hr/leaves";
import HrPayroll from "@/pages/hr/payroll";
import HrPayRuns from "@/pages/hr/pay-runs";
import HrBilling from "@/pages/hr/billing";
import HrProjects from "@/pages/hr/projects";
import HrTimesheets from "@/pages/hr/timesheets";
import HrAllocations from "@/pages/hr/allocations";
import EmployeePortalLogin from "@/pages/employee-portal/login";
import EmployeePayslips from "@/pages/employee-portal/payslips";
import EmployeeAttendance from "@/pages/employee-portal/attendance";
import Customers from "@/pages/customers";
import Services from "@/pages/services";
import Bookings from "@/pages/bookings";
import Invoices from "@/pages/invoices";
import Analytics from "@/pages/analytics";
import Settings from "@/pages/settings";
import Onboarding from "@/pages/onboarding";
import NotFound from "@/pages/not-found";
import NotAuthorized from "@/pages/not-authorized";

import { AdminLayout } from "@/components/admin-layout";
import { SuperAdminRouteGuard, TechSupportRouteGuard } from "@/contexts/admin-context";
import SuperAdminDashboard from "@/pages/super-admin-dashboard";
import SuperAdminBusinessRegistry from "@/pages/super-admin-business-registry";
import SuperAdminModuleRegistry from "@/pages/super-admin-module-registry";
import SuperAdminFeatureRegistry from "@/pages/super-admin-feature-registry";
import SuperAdminCountries from "@/pages/super-admin/countries";
import SuperAdminPayrollAnalytics from "@/pages/super-admin/payroll-analytics";
import SuperAdminCountryRollout from "@/pages/super-admin/country-rollout";
import AdminAddons from "@/pages/super-admin/admin-addons";
import MarketplaceAnalytics from "@/pages/super-admin/marketplace-analytics";
import MarketplaceManagement from "@/pages/super-admin/marketplace-management";
import PlatformAdminDashboard from "@/pages/platform-admin-dashboard";
import AdminTenants from "@/pages/admin/tenants";
import TenantUsers from "@/pages/admin/tenant-users";
import TenantDetails from "@/pages/admin/tenant-details";
import AdminPlatformAdmins from "@/pages/admin/platform-admins";
import AdminBilling from "@/pages/admin/billing";
import AdminPromos from "@/pages/admin/promos";
import AdminAddonRevenue from "@/pages/admin/addon-revenue";
import AdminExchangeRates from "@/pages/admin/exchange-rates";
import TaxManagement from "@/pages/admin/tax-management";
import InvoiceTemplates from "@/pages/admin/invoice-templates";
import AdminWhatsApp from "@/pages/admin/whatsapp";
import AdminAuditLogs from "@/pages/admin/audit-logs";
import AdminCompliance from "@/pages/admin/compliance";
import AdminSettings from "@/pages/admin/settings";
import AdminSso from "@/pages/admin/sso";
import AdminRegions from "@/pages/admin/regions";
import SubscriptionManagement from "@/pages/admin/subscription-management";
import AdminSecurity from "@/pages/admin/security";
import AdminSecuritySessions from "@/pages/admin/security-sessions";
import ResellerDashboard from "@/pages/reseller-dashboard";
import Marketplace from "@/pages/marketplace";
import AiPermissions from "@/pages/ai-permissions";
import AdminLogin from "@/pages/admin-login";
import AdminForgotPassword from "@/pages/admin-forgot-password";
import Login from "@/pages/login";
import ManagerDashboard from "@/pages/manager/dashboard";
import SupportDashboard from "@/pages/support/dashboard";
import TechSupportDashboard from "@/pages/admin/tech-support";
import PortalLogin from "@/pages/portal/login";
import PortalRegister from "@/pages/portal/register";
import PortalDashboard from "@/pages/portal/dashboard";
import TenantSignup from "@/pages/tenant-signup";
import SubscriptionSelect from "@/pages/subscription-select";
import SubscriptionDashboard from "@/pages/subscription-dashboard";
import Pricing from "@/pages/pricing";
import Packages from "@/pages/packages";
import Checkout from "@/pages/checkout";
import BillingAddons from "@/pages/billing-addons";
import { GatedPage } from "@/components/gating/gated-page";

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
      <Route path="/properties">
        <DashboardGuard allowedBusinessType="real_estate">
          <RealEstateProperties />
        </DashboardGuard>
      </Route>
      <Route path="/listings">
        <DashboardGuard allowedBusinessType="real_estate">
          <RealEstateListings />
        </DashboardGuard>
      </Route>
      <Route path="/leads">
        <DashboardGuard allowedBusinessType="real_estate">
          <RealEstateLeads />
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
      <Route path="/dashboard/furniture">
        <DashboardGuard allowedBusinessType="furniture_manufacturing">
          <FurnitureDashboard />
        </DashboardGuard>
      </Route>
      <Route path="/dashboard/furniture/products">
        <DashboardGuard allowedBusinessType="furniture_manufacturing">
          <FurnitureProducts />
        </DashboardGuard>
      </Route>
      <Route path="/dashboard/furniture/raw-materials">
        <DashboardGuard allowedBusinessType="furniture_manufacturing">
          <FurnitureRawMaterials />
        </DashboardGuard>
      </Route>
      <Route path="/dashboard/furniture/production">
        <DashboardGuard allowedBusinessType="furniture_manufacturing">
          <FurnitureProduction />
        </DashboardGuard>
      </Route>
      <Route path="/dashboard/furniture/sales-orders">
        <DashboardGuard allowedBusinessType="furniture_manufacturing">
          <FurnitureSalesOrders />
        </DashboardGuard>
      </Route>
      <Route path="/dashboard/furniture/invoices">
        <DashboardGuard allowedBusinessType="furniture_manufacturing">
          <FurnitureInvoices />
        </DashboardGuard>
      </Route>
      <Route path="/dashboard/furniture/analytics">
        <DashboardGuard allowedBusinessType="furniture_manufacturing">
          <FurnitureAnalytics />
        </DashboardGuard>
      </Route>
      <Route path="/dashboard/software-services">
        <DashboardGuard allowedBusinessType="software_services">
          <SoftwareServicesDashboard />
        </DashboardGuard>
      </Route>
      <Route path="/dashboard/software-services/projects">
        <DashboardGuard allowedBusinessType="software_services">
          <SoftwareServicesProjects />
        </DashboardGuard>
      </Route>
      <Route path="/dashboard/software-services/timesheets">
        <DashboardGuard allowedBusinessType="software_services">
          <SoftwareServicesTimesheets />
        </DashboardGuard>
      </Route>
      <Route path="/dashboard/software-services/invoices">
        <DashboardGuard allowedBusinessType="software_services">
          <Invoices />
        </DashboardGuard>
      </Route>
      <Route path="/dashboard/consulting">
        <DashboardGuard allowedBusinessType="consulting">
          <ConsultingDashboard />
        </DashboardGuard>
      </Route>
      <Route path="/dashboard/consulting/projects">
        <DashboardGuard allowedBusinessType="consulting">
          <ConsultingProjects />
        </DashboardGuard>
      </Route>
      <Route path="/dashboard/consulting/timesheets">
        <DashboardGuard allowedBusinessType="consulting">
          <ConsultingTimesheets />
        </DashboardGuard>
      </Route>
      <Route path="/dashboard/consulting/invoices">
        <DashboardGuard allowedBusinessType="consulting">
          <Invoices />
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
            <CoworkingSpaces />
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
      <Route path="/invoices" component={Invoices} />
      <Route path="/analytics">
        <GatedPage featureKey="analytics" addonCode="advanced_analytics" mode="modal">
          <Analytics />
        </GatedPage>
      </Route>
      <Route path="/marketplace" component={Marketplace} />
      <Route path="/ai-permissions" component={AiPermissions} />
      <Route path="/settings" component={Settings} />
      <Route path="/pricing" component={Pricing} />
      <Route path="/onboarding" component={Onboarding} />
      <Route path="/reseller" component={ResellerDashboard} />
      <Route path="/subscription/select" component={SubscriptionSelect} />
      <Route path="/subscription-dashboard" component={SubscriptionDashboard} />
      <Route path="/billing/addons" component={BillingAddons} />
      
      <Route path="/hr">
        <ModuleGuard moduleId="hrms">
          <HrDashboard />
        </ModuleGuard>
      </Route>
      <Route path="/hr/employees">
        <ModuleGuard moduleId="hrms">
          <HrEmployees />
        </ModuleGuard>
      </Route>
      <Route path="/hr/attendance">
        <ModuleGuard moduleId="hrms">
          <HrAttendance />
        </ModuleGuard>
      </Route>
      <Route path="/hr/leaves">
        <ModuleGuard moduleId="hrms">
          <HrLeaves />
        </ModuleGuard>
      </Route>
      <Route path="/hr/payroll">
        <ModuleGuard moduleId="hrms">
          <GatedPage featureKey="payroll" addonCode="payroll">
            <HrPayroll />
          </GatedPage>
        </ModuleGuard>
      </Route>
      <Route path="/hr/pay-runs">
        <ModuleGuard moduleId="hrms">
          <GatedPage featureKey="payroll" addonCode="payroll">
            <HrPayRuns />
          </GatedPage>
        </ModuleGuard>
      </Route>
      <Route path="/hr/projects">
        <ModuleGuard moduleId="hrms">
          <GatedPage featureKey="hrms_it_extensions">
            <HrProjects />
          </GatedPage>
        </ModuleGuard>
      </Route>
      <Route path="/hr/timesheets">
        <ModuleGuard moduleId="hrms">
          <GatedPage featureKey="hrms_it_extensions">
            <HrTimesheets />
          </GatedPage>
        </ModuleGuard>
      </Route>
      <Route path="/hr/allocations">
        <ModuleGuard moduleId="hrms">
          <GatedPage featureKey="hrms_it_extensions">
            <HrAllocations />
          </GatedPage>
        </ModuleGuard>
      </Route>
      <Route path="/hr/billing">
        <ModuleGuard moduleId="hrms">
          <HrBilling />
        </ModuleGuard>
      </Route>
      <Route path="/not-authorized" component={NotAuthorized} />
      <Route component={NotFound} />
    </Switch>
  );
}

function SuperAdminRoutes() {
  return (
    <SuperAdminRouteGuard>
      <Switch>
        <Route path="/super-admin/dashboard">
          <Redirect to="/super-admin" />
        </Route>
        <Route path="/super-admin" component={SuperAdminDashboard} />
        <Route path="/super-admin/tenants/:tenantId/users" component={TenantUsers} />
        <Route path="/super-admin/tenants/:tenantId" component={TenantDetails} />
        <Route path="/super-admin/tenants" component={AdminTenants} />
        <Route path="/super-admin/admins" component={AdminPlatformAdmins} />
        <Route path="/super-admin/business-registry" component={SuperAdminBusinessRegistry} />
        <Route path="/super-admin/module-registry" component={SuperAdminModuleRegistry} />
        <Route path="/super-admin/feature-registry" component={SuperAdminFeatureRegistry} />
        <Route path="/super-admin/billing" component={AdminBilling} />
        <Route path="/super-admin/invoice-templates" component={InvoiceTemplates} />
        <Route path="/super-admin/tax" component={TaxManagement} />
        <Route path="/super-admin/exchange-rates" component={AdminExchangeRates} />
        <Route path="/super-admin/whatsapp">
          <GatedPage featureKey="whatsapp_automation" addonCode="whatsapp_automation" mode="modal">
            <AdminWhatsApp />
          </GatedPage>
        </Route>
        <Route path="/super-admin/audit-logs" component={AdminAuditLogs} />
        <Route path="/super-admin/compliance" component={AdminCompliance} />
        <Route path="/super-admin/sso" component={AdminSso} />
        <Route path="/super-admin/settings" component={AdminSettings} />
        <Route path="/super-admin/regions" component={AdminRegions} />
        <Route path="/super-admin/countries" component={SuperAdminCountries} />
        <Route path="/super-admin/regions/rollout" component={SuperAdminCountryRollout} />
        <Route path="/super-admin/payroll-analytics" component={SuperAdminPayrollAnalytics} />
        <Route path="/super-admin/marketplace-analytics" component={MarketplaceAnalytics} />
        <Route path="/super-admin/marketplace-management" component={MarketplaceManagement} />
        <Route path="/super-admin/addons" component={AdminAddons} />
        <Route path="/super-admin/subscriptions" component={SubscriptionManagement} />
        <Route path="/super-admin/security/sessions" component={AdminSecuritySessions} />
        <Route path="/super-admin/security" component={AdminSecurity} />
        <Route path="/not-authorized" component={NotAuthorized} />
        <Route component={NotFound} />
      </Switch>
    </SuperAdminRouteGuard>
  );
}

function PlatformAdminRoutes() {
  return (
    <Switch>
      <Route path="/admin/dashboard">
        <Redirect to="/admin" />
      </Route>
      <Route path="/platform-admin/dashboard">
        <Redirect to="/admin" />
      </Route>
      <Route path="/admin" component={PlatformAdminDashboard} />
      <Route path="/admin/tenants" component={AdminTenants} />
      <Route path="/admin/admins" component={AdminPlatformAdmins} />
      <Route path="/admin/billing" component={AdminBilling} />
      <Route path="/admin/billing/promos" component={AdminPromos} />
      <Route path="/admin/addon-revenue" component={AdminAddonRevenue} />
      <Route path="/admin/addons" component={AdminAddons} />
      <Route path="/admin/invoice-templates" component={InvoiceTemplates} />
      <Route path="/admin/tax" component={TaxManagement} />
      <Route path="/admin/whatsapp">
        <GatedPage featureKey="whatsapp_automation" addonCode="whatsapp_automation" mode="modal">
          <AdminWhatsApp />
        </GatedPage>
      </Route>
      <Route path="/admin/audit-logs" component={AdminAuditLogs} />
      <Route path="/admin/compliance" component={AdminCompliance} />
      <Route path="/admin/sso" component={AdminSso} />
      <Route path="/admin/settings" component={AdminSettings} />
      <Route path="/admin/regions" component={AdminRegions} />
      <Route path="/admin/subscriptions" component={SubscriptionManagement} />
      <Route path="/admin/security/sessions" component={AdminSecuritySessions} />
      <Route path="/admin/security" component={AdminSecurity} />
      <Route path="/not-authorized" component={NotAuthorized} />
      <Route component={NotFound} />
    </Switch>
  );
}

function ManagerRoutes() {
  return (
    <Switch>
      <Route path="/manager/dashboard">
        <Redirect to="/manager" />
      </Route>
      <Route path="/manager" component={ManagerDashboard} />
      <Route path="/manager/tenants" component={AdminTenants} />
      <Route path="/manager/operations" component={ManagerDashboard} />
      <Route path="/manager/reports" component={ManagerDashboard} />
      <Route path="/not-authorized" component={NotAuthorized} />
      <Route component={NotFound} />
    </Switch>
  );
}

function SupportTeamRoutes() {
  return (
    <Switch>
      <Route path="/support/dashboard">
        <Redirect to="/support" />
      </Route>
      <Route path="/support" component={SupportDashboard} />
      <Route path="/support/tickets" component={SupportDashboard} />
      <Route path="/support/issues" component={SupportDashboard} />
      <Route path="/not-authorized" component={NotAuthorized} />
      <Route component={NotFound} />
    </Switch>
  );
}

function TechSupportRoutes() {
  return (
    <TechSupportRouteGuard>
      <Switch>
        <Route path="/tech-support/dashboard">
          <Redirect to="/tech-support" />
        </Route>
        <Route path="/tech-support" component={TechSupportDashboard} />
        <Route path="/tech-support/health" component={TechSupportDashboard} />
        <Route path="/tech-support/apis" component={TechSupportDashboard} />
        <Route path="/tech-support/errors" component={TechSupportDashboard} />
        <Route path="/tech-support/performance" component={TechSupportDashboard} />
        <Route path="/tech-support/audit-logs" component={AdminAuditLogs} />
        <Route path="/tech-support/security" component={AdminSecurity} />
        <Route path="/tech-support/security/sessions" component={AdminSecuritySessions} />
        <Route path="/not-authorized" component={NotAuthorized} />
        <Route component={NotFound} />
      </Switch>
    </TechSupportRouteGuard>
  );
}

function AdminRoutes() {
  const [location] = useLocation();
  const isSuperAdminPath = location.startsWith("/super-admin");
  const isManagerPath = location.startsWith("/manager");
  const isSupportPath = location.startsWith("/support");
  const isTechSupportPath = location.startsWith("/tech-support");

  const getRoutes = () => {
    if (isSuperAdminPath) return <SuperAdminRoutes />;
    if (isTechSupportPath) return <TechSupportRoutes />;
    if (isManagerPath) return <ManagerRoutes />;
    if (isSupportPath) return <SupportTeamRoutes />;
    return <PlatformAdminRoutes />;
  };

  return (
    <AdminLayout>
      {getRoutes()}
    </AdminLayout>
  );
}

function AppRouter() {
  const { user, isLoading } = useAuth();
  const [location] = useLocation();

  const isAdminPath = location.startsWith("/super-admin") || location.startsWith("/admin") || location.startsWith("/platform-admin") || location.startsWith("/manager") || location.startsWith("/support") || location.startsWith("/tech-support");
  const isAdminLoginPath = location === "/admin-login";
  const isAdminForgotPasswordPath = location === "/admin-forgot-password";
  const isPortalPath = location.startsWith("/portal");
  const isEmployeePortalPath = location.startsWith("/employee");
  
  // PUBLIC ROUTES - Always accessible, no subscription checks, no TenantProvider
  // Must check BEFORE authenticated routes to prevent OnboardingGuard from running
  // Includes: landing pages, auth pages (login/register), pricing
  const publicPaths = ["/", "/in", "/uk", "/uae", "/sg", "/my", "/pricing", "/login", "/register", "/signup", "/not-authorized"];
  const isPublicPath = publicPaths.includes(location);

  if (isAdminLoginPath) {
    return <AdminLogin />;
  }

  if (isAdminForgotPasswordPath) {
    return <AdminForgotPassword />;
  }

  if (isPortalPath) {
    return (
      <Switch>
        <Route path="/portal/dashboard" component={PortalDashboard} />
        <Route path="/portal/invite/:inviteToken" component={PortalRegister} />
        <Route path="/portal/:token" component={PortalLogin} />
        <Route component={NotFound} />
      </Switch>
    );
  }

  if (isEmployeePortalPath) {
    return (
      <Switch>
        <Route path="/employee/login" component={EmployeePortalLogin} />
        <Route path="/employee/payslips" component={EmployeePayslips} />
        <Route path="/employee/attendance" component={EmployeeAttendance} />
        <Route component={NotFound} />
      </Switch>
    );
  }

  // Render ALL public routes BEFORE auth loading check
  // This ensures public pages never show subscription errors or loading spinners
  if (isPublicPath) {
    return (
      <Switch>
        <Route path="/login" component={Login} />
        <Route path="/register" component={Register} />
        <Route path="/signup" component={TenantSignup} />
        <Route path="/in" component={LandingIndia} />
        <Route path="/uk" component={LandingUK} />
        <Route path="/uae" component={LandingUAE} />
        <Route path="/sg" component={LandingSingapore} />
        <Route path="/my" component={LandingMalaysia} />
        <Route path="/pricing" component={Pricing} />
        <Route path="/not-authorized" component={NotAuthorized} />
        <Route path="/" component={LandingGlobal} />
      </Switch>
    );
  }

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
        <Route path="/login" component={Login} />
        <Route path="/register" component={Register} />
        <Route path="/signup" component={TenantSignup} />
        <Route path="/packages" component={Packages} />
        <Route path="/checkout" component={Checkout} />
        <Route path="/pricing" component={Pricing} />
        <Route path="/subscription/select" component={SubscriptionSelect} />
        <Route path="/subscription-dashboard" component={SubscriptionDashboard} />
        <Route path="/onboarding" component={Onboarding} />
        <Route path="/not-authorized" component={NotAuthorized} />
        <Route path="/in" component={LandingIndia} />
        <Route path="/uk" component={LandingUK} />
        <Route path="/uae" component={LandingUAE} />
        <Route path="/sg" component={LandingSingapore} />
        <Route path="/my" component={LandingMalaysia} />
        <Route path="/" component={LandingGlobal} />
        <Route component={LandingGlobal} />
      </Switch>
    );
  }

  return (
    <TenantProvider>
      <OnboardingGuard>
        <Switch>
          <Route path="/packages" component={Packages} />
          <Route path="/checkout" component={Checkout} />
          <Route>
            <AuthenticatedRoutes />
          </Route>
        </Switch>
      </OnboardingGuard>
    </TenantProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="system" storageKey="mybizstream-theme">
        <CountryProvider>
          <TooltipProvider>
            <TourProvider>
              <Toaster />
              <AppRouter />
              <TourOverlay />
            </TourProvider>
          </TooltipProvider>
        </CountryProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
