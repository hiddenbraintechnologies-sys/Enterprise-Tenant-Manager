import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdmin, PermissionGuard, AdminGuard } from "@/contexts/admin-context";
import { Link } from "wouter";
import {
  Building2,
  Users,
  AlertTriangle,
  Ticket,
  BarChart3,
  FileText,
  Shield,
  ArrowRight,
  Activity,
  DollarSign,
} from "lucide-react";

interface DashboardStats {
  tenantStats?: {
    total: number;
    active: number;
    byBusinessType: Record<string, number>;
  };
  userStats?: {
    total: number;
    active: number;
    byRole: Record<string, number>;
  };
  errorStats?: {
    total: number;
    unresolved: number;
    bySeverity: Record<string, number>;
  };
  ticketStats?: {
    total: number;
    open: number;
    byStatus: Record<string, number>;
  };
  usageStats?: {
    totalApiCalls: number;
    totalStorage: number;
    activeUsers: number;
  };
}

function StatCard({
  title,
  value,
  description,
  icon: Icon,
  href,
  variant = "default",
  permission,
}: {
  title: string;
  value: string | number;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
  variant?: "default" | "warning" | "success";
  permission?: string;
}) {
  const { hasPermission } = useAdmin();

  if (permission && !hasPermission(permission)) {
    return null;
  }

  const content = (
    <Card className={variant === "warning" ? "border-orange-500/50" : variant === "success" ? "border-green-500/50" : ""}>
      <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold" data-testid={`stat-${title.toLowerCase().replace(/\s+/g, "-")}`}>
          {value}
        </div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
        {href && (
          <div className="mt-3">
            <Button variant="ghost" size="sm" className="p-0 h-auto text-xs">
              View details <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}

function QuickActionButton({
  href,
  icon: Icon,
  label,
  permission,
  testId,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  permission?: string;
  testId: string;
}) {
  const { hasPermission } = useAdmin();

  if (permission && !hasPermission(permission)) {
    return null;
  }

  return (
    <Button variant="outline" asChild className="justify-start">
      <Link href={href} data-testid={testId}>
        <Icon className="h-4 w-4 mr-2" />
        {label}
      </Link>
    </Button>
  );
}

function DashboardContent() {
  const { admin, permissions, isSuperAdmin } = useAdmin();

  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/platform-admin/dashboard/overview"],
    staleTime: 30 * 1000,
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-3 w-32 mt-2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground" data-testid="text-admin-title">
            Platform Admin Dashboard
          </h1>
          <p className="text-muted-foreground">
            Welcome back, {admin?.firstName}. 
            {isSuperAdmin ? " You have full platform access." : ` You have ${permissions.length} permissions.`}
          </p>
        </div>
        <Badge variant={isSuperAdmin ? "default" : "secondary"} className="gap-1">
          <Shield className="h-3 w-3" />
          {isSuperAdmin ? "Super Admin" : "Platform Admin"}
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Tenants"
          value={stats?.tenantStats?.total || 0}
          description={`${stats?.tenantStats?.active || 0} active`}
          icon={Building2}
          href="/admin/tenants"
          permission="read_tenants"
        />
        <StatCard
          title="Total Users"
          value={stats?.userStats?.total || 0}
          description={`${stats?.userStats?.active || 0} active`}
          icon={Users}
          href="/admin/users"
          permission="read_users"
        />
        <StatCard
          title="Unresolved Errors"
          value={stats?.errorStats?.unresolved || 0}
          description={`${stats?.errorStats?.total || 0} total errors`}
          icon={AlertTriangle}
          href="/admin/errors"
          variant={stats?.errorStats?.unresolved ? "warning" : "default"}
          permission="view_logs"
        />
        <StatCard
          title="Open Tickets"
          value={stats?.ticketStats?.open || 0}
          description={`${stats?.ticketStats?.total || 0} total tickets`}
          icon={Ticket}
          href="/admin/tickets"
          variant={stats?.ticketStats?.open ? "warning" : "default"}
          permission="view_logs"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <PermissionGuard permission="view_analytics" fallback={null}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Platform Metrics
              </CardTitle>
              <CardDescription>Usage statistics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Active Users (24h)</span>
                  <Badge variant="secondary">{stats?.usageStats?.activeUsers || 0}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">API Calls Today</span>
                  <Badge variant="outline">{stats?.usageStats?.totalApiCalls || 0}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Storage Used</span>
                  <Badge variant="outline">
                    {((stats?.usageStats?.totalStorage || 0) / (1024 * 1024)).toFixed(2)} MB
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </PermissionGuard>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Quick Actions
            </CardTitle>
            <CardDescription>Common support tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2">
              <QuickActionButton
                href="/admin/tenants"
                icon={Building2}
                label="Browse Tenants"
                permission="read_tenants"
                testId="link-browse-tenants"
              />
              <QuickActionButton
                href="/admin/users"
                icon={Users}
                label="Browse Users"
                permission="read_users"
                testId="link-browse-users"
              />
              <QuickActionButton
                href="/admin/tickets"
                icon={Ticket}
                label="Support Tickets"
                permission="view_logs"
                testId="link-tickets"
              />
              <QuickActionButton
                href="/admin/audit-logs"
                icon={FileText}
                label="Audit Logs"
                permission="view_logs"
                testId="link-audit-logs"
              />
              <QuickActionButton
                href="/admin/analytics"
                icon={BarChart3}
                label="Analytics"
                permission="view_analytics"
                testId="link-analytics"
              />
              <QuickActionButton
                href="/admin/billing"
                icon={DollarSign}
                label="Billing Overview"
                permission="view_billing"
                testId="link-billing"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <PermissionGuard permission="view_logs" fallback={null}>
        {stats?.errorStats?.bySeverity && Object.keys(stats.errorStats.bySeverity).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Errors by Severity
              </CardTitle>
              <CardDescription>Distribution of error log severities</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {Object.entries(stats.errorStats.bySeverity).map(([severity, count]) => (
                  <Badge
                    key={severity}
                    variant={
                      severity === "critical" || severity === "error"
                        ? "destructive"
                        : severity === "warning"
                        ? "default"
                        : "secondary"
                    }
                  >
                    {severity}: {count}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </PermissionGuard>

      {!isSuperAdmin && permissions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Your Permissions</CardTitle>
            <CardDescription>Permissions assigned to your account</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {permissions.map((permission) => (
                <Badge key={permission} variant="outline">
                  {permission}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function PlatformAdminDashboard() {
  return (
    <AdminGuard>
      <DashboardContent />
    </AdminGuard>
  );
}
