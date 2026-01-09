import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAdmin, SuperAdminGuard } from "@/contexts/admin-context";
import { Link } from "wouter";
import {
  Building2,
  Users,
  UserCog,
  AlertTriangle,
  Ticket,
  BarChart3,
  Shield,
  Crown,
  ArrowRight,
  Activity,
  Globe,
  X,
} from "lucide-react";
import type { PlatformRegionConfig } from "@shared/schema";

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
}: {
  title: string;
  value: string | number;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
  variant?: "default" | "warning" | "success";
}) {
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

function DashboardContent() {
  const { admin } = useAdmin();
  const [selectedCountry, setSelectedCountry] = useState<string>("");

  const { data: regions } = useQuery<PlatformRegionConfig[]>({
    queryKey: ["/api/region-configs/active"],
    staleTime: 60 * 1000,
  });

  const queryKey = selectedCountry && selectedCountry !== "all"
    ? ["/api/platform-admin/dashboard/overview", { countries: selectedCountry }]
    : ["/api/platform-admin/dashboard/overview"];

  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey,
    staleTime: 30 * 1000,
  });

  const { data: adminsData } = useQuery<{ admins: any[]; total: number }>({
    queryKey: ["/api/platform-admin/admins"],
    staleTime: 60 * 1000,
  });

  const enabledRegions = regions?.filter(r => r.status === "enabled") || [];

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground" data-testid="text-super-admin-title">
            Super Admin Dashboard
          </h1>
          <p className="text-muted-foreground">
            Welcome back, {admin?.firstName}. You have full platform access.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-muted-foreground" />
            <Select value={selectedCountry || "all"} onValueChange={(val) => setSelectedCountry(val === "all" ? "" : val)}>
              <SelectTrigger className="w-[180px]" data-testid="select-country-filter">
                <SelectValue placeholder="All Countries" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Countries</SelectItem>
                {enabledRegions.map((region) => (
                  <SelectItem key={region.countryCode} value={region.countryCode}>
                    {region.countryName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedCountry && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedCountry("")}
                data-testid="button-clear-country-filter"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          <Badge className="gap-1">
            <Crown className="h-3 w-3" />
            Super Admin
          </Badge>
        </div>
      </div>

      {selectedCountry && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Filtering by:</span>
          <Badge variant="secondary" data-testid="badge-active-filter">
            {enabledRegions.find(r => r.countryCode === selectedCountry)?.countryName || selectedCountry}
          </Badge>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Tenants"
          value={stats?.tenantStats?.total || 0}
          description={`${stats?.tenantStats?.active || 0} active`}
          icon={Building2}
          href="/super-admin/tenants"
        />
        <StatCard
          title="Total Users"
          value={stats?.userStats?.total || 0}
          description={`${stats?.userStats?.active || 0} active`}
          icon={Users}
          href="/admin/users"
        />
        <StatCard
          title="Platform Admins"
          value={adminsData?.total || 0}
          description="Manage admin accounts"
          icon={UserCog}
          href="/super-admin/admins"
        />
        <StatCard
          title="Unresolved Errors"
          value={stats?.errorStats?.unresolved || 0}
          description={`${stats?.errorStats?.total || 0} total errors`}
          icon={AlertTriangle}
          href="/admin/errors"
          variant={stats?.errorStats?.unresolved ? "warning" : "default"}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Platform Overview
            </CardTitle>
            <CardDescription>Key metrics across the platform</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Open Support Tickets</span>
                <Badge variant={stats?.ticketStats?.open ? "destructive" : "secondary"}>
                  {stats?.ticketStats?.open || 0}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Active Users (24h)</span>
                <Badge variant="secondary">{stats?.usageStats?.activeUsers || 0}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">API Calls Today</span>
                <Badge variant="outline">{stats?.usageStats?.totalApiCalls || 0}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Quick Actions
            </CardTitle>
            <CardDescription>Common administrative tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2">
              <Button variant="outline" asChild className="justify-start">
                <Link href="/super-admin/admins" data-testid="link-manage-admins">
                  <UserCog className="h-4 w-4 mr-2" />
                  Manage Platform Admins
                </Link>
              </Button>
              <Button variant="outline" asChild className="justify-start">
                <Link href="/super-admin/tenants" data-testid="link-view-tenants">
                  <Building2 className="h-4 w-4 mr-2" />
                  View All Tenants
                </Link>
              </Button>
              <Button variant="outline" asChild className="justify-start">
                <Link href="/admin/tickets" data-testid="link-support-tickets">
                  <Ticket className="h-4 w-4 mr-2" />
                  Support Tickets
                </Link>
              </Button>
              <Button variant="outline" asChild className="justify-start">
                <Link href="/admin/analytics" data-testid="link-analytics">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Platform Analytics
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {stats?.tenantStats?.byBusinessType && (
        <Card>
          <CardHeader>
            <CardTitle>Tenants by Business Type</CardTitle>
            <CardDescription>Distribution of tenant businesses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.tenantStats.byBusinessType).map(([type, count]) => (
                <Badge key={type} variant="outline" className="text-sm">
                  {type}: {count}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function SuperAdminDashboard() {
  return (
    <SuperAdminGuard>
      <DashboardContent />
    </SuperAdminGuard>
  );
}
