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
  Headphones,
  ClipboardList,
} from "lucide-react";

interface MenuItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: string;
  permissions?: string[];
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
    superAdminOnly: true,
  },
  {
    title: "Platform Admins",
    url: "/super-admin/admins",
    icon: UserCog,
    superAdminOnly: true,
  },
  {
    title: "Billing",
    url: "/super-admin/billing",
    icon: DollarSign,
    superAdminOnly: true,
  },
  {
    title: "Invoice Templates",
    url: "/super-admin/invoice-templates",
    icon: FileEdit,
    superAdminOnly: true,
  },
  {
    title: "Tax Management",
    url: "/super-admin/tax",
    icon: Calculator,
    superAdminOnly: true,
  },
  {
    title: "WhatsApp",
    url: "/super-admin/whatsapp",
    icon: MessageSquare,
    superAdminOnly: true,
  },
  {
    title: "Audit Logs",
    url: "/super-admin/audit-logs",
    icon: FileText,
    superAdminOnly: true,
  },
  {
    title: "Compliance",
    url: "/super-admin/compliance",
    icon: Scale,
    superAdminOnly: true,
  },
  {
    title: "System Settings",
    url: "/super-admin/settings",
    icon: Cog,
    superAdminOnly: true,
  },
  {
    title: "Regions",
    url: "/super-admin/regions",
    icon: Globe,
    superAdminOnly: true,
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
    permission: "read_tenants",
  },
  {
    title: "Users",
    url: "/admin/users",
    icon: Users,
    permission: "read_users",
  },
  {
    title: "Billing",
    url: "/admin/billing",
    icon: DollarSign,
    permission: "view_billing",
  },
  {
    title: "Tax Management",
    url: "/admin/tax",
    icon: Calculator,
    permission: "manage_billing",
  },
  {
    title: "Invoice Templates",
    url: "/admin/invoice-templates",
    icon: FileEdit,
    permission: "manage_billing",
  },
  {
    title: "WhatsApp",
    url: "/admin/whatsapp",
    icon: MessageSquare,
    permission: "manage_features",
  },
  {
    title: "Audit Logs",
    url: "/admin/audit-logs",
    icon: FileText,
    permission: "view_logs",
  },
  {
    title: "Compliance",
    url: "/admin/compliance",
    icon: Scale,
    permission: "read_tenants",
  },
  {
    title: "System Settings",
    url: "/admin/settings",
    icon: Cog,
    permissions: ["manage_features"],
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
  },
  {
    title: "Operations",
    url: "/manager/operations",
    icon: ClipboardList,
  },
  {
    title: "Reports",
    url: "/manager/reports",
    icon: BarChart3,
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
  },
  {
    title: "User Issues",
    url: "/support/issues",
    icon: Headphones,
  },
];

export function AdminSidebar() {
  const [location] = useLocation();
  const { admin, isSuperAdmin, isPlatformAdmin, isManager, isSupportTeam, hasPermission, countryAssignments } = useAdmin();

  const getMenuItems = () => {
    if (isSuperAdmin) return superAdminMenuItems;
    if (isPlatformAdmin) return platformAdminMenuItems;
    if (isManager) return managerMenuItems;
    if (isSupportTeam) return supportTeamMenuItems;
    return platformAdminMenuItems;
  };

  const menuItems = getMenuItems();

  const getRoleLabel = () => {
    if (isSuperAdmin) return "Super Admin";
    if (isPlatformAdmin) return "Platform Admin";
    if (isManager) return "Manager";
    if (isSupportTeam) return "Support Team";
    return "Admin";
  };

  const getRoleBadgeVariant = () => {
    if (isSuperAdmin) return "default";
    if (isPlatformAdmin) return "secondary";
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
            ) : isManager ? (
              <ClipboardList className="h-5 w-5 text-primary-foreground" />
            ) : isSupportTeam ? (
              <Headphones className="h-5 w-5 text-primary-foreground" />
            ) : (
              <Shield className="h-5 w-5 text-primary-foreground" />
            )}
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-foreground">BizFlow Admin</span>
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
                  (item.url !== "/admin" && item.url !== "/super-admin" && location.startsWith(item.url));
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
