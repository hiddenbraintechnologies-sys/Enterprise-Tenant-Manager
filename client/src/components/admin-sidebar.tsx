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
    title: "Platform Admins",
    url: "/super-admin/admins",
    icon: UserCog,
    superAdminOnly: true,
  },
  {
    title: "All Tenants",
    url: "/super-admin/tenants",
    icon: Building2,
    superAdminOnly: true,
  },
  {
    title: "System Settings",
    url: "/super-admin/settings",
    icon: Settings,
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
    title: "Error Logs",
    url: "/admin/errors",
    icon: AlertTriangle,
    permission: "view_logs",
  },
  {
    title: "Support Tickets",
    url: "/admin/tickets",
    icon: Ticket,
    permission: "view_logs",
  },
  {
    title: "Analytics",
    url: "/admin/analytics",
    icon: BarChart3,
    permission: "view_analytics",
  },
  {
    title: "Audit Logs",
    url: "/admin/audit-logs",
    icon: FileText,
    permission: "view_logs",
  },
  {
    title: "Billing",
    url: "/admin/billing",
    icon: Shield,
    permission: "view_billing",
  },
];

export function AdminSidebar() {
  const [location] = useLocation();
  const { admin, isSuperAdmin, hasPermission } = useAdmin();

  const menuItems = isSuperAdmin ? superAdminMenuItems : platformAdminMenuItems;

  const visibleItems = menuItems.filter((item) => {
    if (item.superAdminOnly && !isSuperAdmin) return false;
    if (item.permission && !hasPermission(item.permission)) return false;
    if (item.permissions && !item.permissions.some(p => hasPermission(p))) return false;
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
            ) : (
              <Shield className="h-5 w-5 text-primary-foreground" />
            )}
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-foreground">BizFlow Admin</span>
            <Badge variant={isSuperAdmin ? "default" : "secondary"} className="text-xs w-fit">
              {isSuperAdmin ? "Super Admin" : "Platform Admin"}
            </Badge>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>
            {isSuperAdmin ? "Super Admin" : "Platform Admin"}
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
