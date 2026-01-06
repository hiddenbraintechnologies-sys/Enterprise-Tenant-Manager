import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAdmin } from "@/contexts/admin-context";
import { useQuery } from "@tanstack/react-query";
import { Building2, Users, TrendingUp, Globe, Ticket } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface ManagerDashboardData {
  assignedCountries: string[];
  tenantStats: {
    totalTenants: number;
    activeTenants: number;
    tenantsByBusinessType: { type: string; count: number }[];
    tenantsByTier: { tier: string; count: number }[];
  };
  ticketStats: {
    totalTickets: number;
    openTickets: number;
    ticketsByStatus: { status: string; count: number }[];
    ticketsByPriority: { priority: string; count: number }[];
  };
  role: string;
}

export default function ManagerDashboard() {
  const { countryAssignments } = useAdmin();

  const { data, isLoading } = useQuery<ManagerDashboardData>({
    queryKey: ["/api/platform-admin/manager/dashboard"],
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold" data-testid="text-manager-dashboard-title">Manager Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of operations for your assigned regions
        </p>
      </div>

      {(data?.assignedCountries?.length ?? 0) > 0 && (
        <div className="flex flex-wrap gap-2">
          <span className="text-sm text-muted-foreground flex items-center gap-1">
            <Globe className="h-4 w-4" />
            Assigned Regions:
          </span>
          {data?.assignedCountries?.map((code) => (
            <Badge key={code} variant="secondary" data-testid={`badge-country-${code}`}>
              {code}
            </Badge>
          ))}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tenants</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold" data-testid="text-total-tenants">
                {data?.tenantStats?.totalTenants ?? 0}
              </div>
            )}
            <p className="text-xs text-muted-foreground">In assigned regions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Tenants</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold" data-testid="text-active-tenants">
                {data?.tenantStats?.activeTenants ?? 0}
              </div>
            )}
            <p className="text-xs text-muted-foreground">Currently active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tickets</CardTitle>
            <Ticket className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold" data-testid="text-total-tickets">
                {data?.ticketStats?.totalTickets ?? 0}
              </div>
            )}
            <p className="text-xs text-muted-foreground">Support tickets</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Tickets</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold" data-testid="text-open-tickets">
                {data?.ticketStats?.openTickets ?? 0}
              </div>
            )}
            <p className="text-xs text-muted-foreground">Require attention</p>
          </CardContent>
        </Card>
      </div>

      {(data?.assignedCountries?.length ?? 0) === 0 && data?.role !== "SUPER_ADMIN" && data?.role !== "PLATFORM_ADMIN" && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Globe className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Regions Assigned</h3>
            <p className="text-muted-foreground text-center max-w-md">
              You have not been assigned any regions yet. Contact your administrator to get access to specific countries or regions.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
