import { Link, useLocation } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAdmin } from "@/contexts/admin-context";
import {
  Activity,
  LayoutDashboard,
  Building2,
  Users,
  AlertTriangle,
  Ticket,
  BarChart3,
  FileText,
  Shield,
  Settings,
  LogOut,
  Crown,
  UserCog,
  DollarSign,
  MessageSquare,
  Cog,
  Scale,
  Calculator,
  FileEdit,
  Globe,
  Globe2,
  Headphones,
  ClipboardList,
  ArrowRightLeft,
  Wrench,
  ShieldCheck,
  Store,
} from "lucide-react";
import {
  Permissions,
  PLATFORM_ROLES,
  type Permission,
} from "@shared/rbac/permissions";

interface MenuItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: Permission | string;
  permissions?: (Permission | string)[];
  superAdminOnly?: boolean;
}

const superAdminMenuItems: MenuItem[] = [
  {
    title: "Dashboard",
    url: "/super-admin",
    icon: LayoutDashboard,
    superAdminOnly: true,
  },
  {
    title: "Tenants",
    url: "/super-admin/tenants",
    icon: Building2,
    permission: Permissions.VIEW_ALL_TENANTS,
  },
  {
    title: "Platform Admins",
    url: "/super-admin/admins",
    icon: UserCog,
    permission: Permissions.MANAGE_PLATFORM_ADMINS,
  },
  {
    title: "Billing",
    url: "/super-admin/billing",
    icon: DollarSign,
    permission: Permissions.VIEW_INVOICES_PAYMENTS,
  },
  {
    title: "Audit Logs",
    url: "/super-admin/audit-logs",
    icon: FileText,
    permission: Permissions.VIEW_SYSTEM_LOGS,
  },
  {
    title: "Security",
    url: "/super-admin/security",
    icon: ShieldCheck,
  },
  {
    title: "System Settings",
    url: "/super-admin/settings",
    icon: Cog,
    permission: Permissions.MANAGE_GLOBAL_CONFIG,
  },
  {
    title: "Regions",
    url: "/super-admin/regions",
    icon: Globe,
    permission: Permissions.MANAGE_COUNTRIES_REGIONS,
  },
  {
    title: "Marketplace Catalog",
    url: "/super-admin/marketplace/catalog",
    icon: Store,
    permission: Permissions.MARKETPLACE_MANAGE_CATALOG,
  },
  {
    title: "Country Rollouts",
    url: "/super-admin/marketplace/rollouts",
    icon: Globe2,
    permission: Permissions.MARKETPLACE_PUBLISH,
  },
  {
    title: "Marketplace Analytics",
    url: "/super-admin/marketplace-analytics",
    icon: BarChart3,
    permission: Permissions.MARKETPLACE_VIEW_ANALYTICS,
  },
];

const platformAdminMenuItems: MenuItem[] = [
  {
    title: "Dashboard",
    url: "/admin",
    icon: LayoutDashboard,
  },
  {
    title: "Tenants",
    url: "/admin/tenants",
    icon: Building2,
    permission: Permissions.VIEW_TENANTS_SCOPED,
  },
  {
    title: "Billing",
    url: "/admin/billing",
    icon: DollarSign,
    permission: Permissions.VIEW_INVOICES_PAYMENTS,
  },
  {
    title: "Audit Logs",
    url: "/admin/audit-logs",
    icon: FileText,
    permission: Permissions.VIEW_AUDIT_LOGS,
  },
  {
    title: "Security",
    url: "/admin/security",
    icon: ShieldCheck,
  },
  {
    title: "Support Tickets",
    url: "/admin/support",
    icon: Ticket,
    permission: Permissions.HANDLE_SUPPORT_TICKETS,
  },
];

const managerMenuItems: MenuItem[] = [
  {
    title: "Dashboard",
    url: "/manager",
    icon: LayoutDashboard,
  },
  {
    title: "Tenants",
    url: "/manager/tenants",
    icon: Building2,
    permission: Permissions.VIEW_TENANTS_SCOPED,
  },
  {
    title: "Operations",
    url: "/manager/operations",
    icon: ClipboardList,
    permission: Permissions.VIEW_OPERATIONS,
  },
  {
    title: "Reports",
    url: "/manager/reports",
    icon: BarChart3,
    permission: Permissions.VIEW_REPORTS,
  },
];

const supportTeamMenuItems: MenuItem[] = [
  {
    title: "Dashboard",
    url: "/support",
    icon: LayoutDashboard,
  },
  {
    title: "Tickets",
    url: "/support/tickets",
    icon: Ticket,
    permission: Permissions.VIEW_TICKETS,
  },
  {
    title: "User Issues",
    url: "/support/issues",
    icon: Headphones,
    permission: Permissions.HANDLE_SUPPORT_TICKETS,
  },
];

const techSupportManagerMenuItems: MenuItem[] = [
  {
    title: "Dashboard",
    url: "/tech-support",
    icon: LayoutDashboard,
  },
  {
    title: "System Health",
    url: "/tech-support/health",
    icon: Activity,
    permission: Permissions.VIEW_SYSTEM_HEALTH,
  },
  {
    title: "API Management",
    url: "/tech-support/apis",
    icon: Globe,
    permission: Permissions.VIEW_API_METRICS,
  },
  {
    title: "Error Logs",
    url: "/tech-support/errors",
    icon: AlertTriangle,
    permission: Permissions.VIEW_ERROR_LOGS,
  },
  {
    title: "Performance",
    url: "/tech-support/performance",
    icon: BarChart3,
    permission: Permissions.VIEW_PERFORMANCE,
  },
  {
    title: "Audit Logs",
    url: "/tech-support/audit-logs",
    icon: FileText,
    permission: Permissions.VIEW_AUDIT_LOGS,
  },
  {
    title: "Security",
    url: "/tech-support/security",
    icon: ShieldCheck,
  },
];

export function AdminSidebar() {
  const [location] = useLocation();
  const { admin, isSuperAdmin, isPlatformAdmin, isTechSupportManager, isManager, isSupportTeam, hasPermission, countryAssignments } = useAdmin();

  const getMenuItems = () => {
    if (isSuperAdmin) return superAdminMenuItems;
    if (isPlatformAdmin) return platformAdminMenuItems;
    if (isTechSupportManager) return techSupportManagerMenuItems;
    if (isManager) return managerMenuItems;
    if (isSupportTeam) return supportTeamMenuItems;
    return platformAdminMenuItems;
  };

  const menuItems = getMenuItems();

  const getRoleLabel = () => {
    if (isSuperAdmin) return "Super Admin";
    if (isPlatformAdmin) return "Platform Admin";
    if (isTechSupportManager) return "Tech Support Manager";
    if (isManager) return "Manager";
    if (isSupportTeam) return "Support Team";
    return "Admin";
  };

  const getRoleBadgeVariant = () => {
    if (isSuperAdmin) return "default";
    if (isPlatformAdmin) return "secondary";
    if (isTechSupportManager) return "secondary";
    return "outline";
  };

  const hasAnyPermission = (perms: string[]): boolean => {
    if (isSuperAdmin) return true;
    return perms.some(p => hasPermission(p));
  };

  const visibleItems = menuItems.filter((item) => {
    if (item.superAdminOnly && !isSuperAdmin) return false;
    if (item.permission && !hasPermission(item.permission)) return false;
    if (item.permissions && !hasAnyPermission(item.permissions)) return false;
    return true;
  });

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
      window.location.href = "/";
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-border p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary">
            {isSuperAdmin ? (
              <Crown className="h-5 w-5 text-primary-foreground" />
            ) : isTechSupportManager ? (
              <Wrench className="h-5 w-5 text-primary-foreground" />
            ) : isManager ? (
              <ClipboardList className="h-5 w-5 text-primary-foreground" />
            ) : isSupportTeam ? (
              <Headphones className="h-5 w-5 text-primary-foreground" />
            ) : (
              <Shield className="h-5 w-5 text-primary-foreground" />
            )}
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-foreground">MyBizStream Admin</span>
            <Badge variant={getRoleBadgeVariant() as "default" | "secondary" | "outline"} className="text-xs w-fit">
              {getRoleLabel()}
            </Badge>
          </div>
        </div>
        {(isManager || isSupportTeam) && countryAssignments.length > 0 && (
          <div className="mt-2 text-xs text-muted-foreground">
            {countryAssignments.length} region{countryAssignments.length > 1 ? "s" : ""} assigned
          </div>
        )}
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>
            {getRoleLabel()}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleItems.map((item) => {
                const isActive = location === item.url || 
                  (item.url !== "/admin" && item.url !== "/super-admin" && location.startsWith(item.url + "/"));
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild data-active={isActive}>
                      <Link href={item.url} data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, "-")}`}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isSuperAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Quick Access</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild data-active={location === "/admin"}>
                    <Link href="/admin" data-testid="nav-platform-admin-view">
                      <Shield className="h-4 w-4" />
                      <span>Platform Admin View</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-border p-4">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
              <Users className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex flex-col text-sm">
              <span className="font-medium text-foreground">
                {admin?.firstName} {admin?.lastName}
              </span>
              <span className="text-xs text-muted-foreground">{admin?.email}</span>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={handleLogout}
            data-testid="button-admin-logout"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
