import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
import { WelcomeMessage } from "@/components/welcome-message";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Users,
  Home,
  DollarSign,
  BedDouble,
  Plus,
  ArrowRight,
} from "lucide-react";
import { Link } from "wouter";

function StatsCard({
  title,
  value,
  icon: Icon,
  loading,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-16" />
            </div>
            <Skeleton className="h-12 w-12 rounded-md" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="mt-1 text-3xl font-bold">{value}</p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function PGDashboard() {
  const { data: stats, isLoading } = useQuery<{
    totalTenants: number;
    occupiedRooms: number;
    availableRooms: number;
    pendingPayments: number;
  }>({
    queryKey: ["/api/pg/stats"],
  });

  return (
    <DashboardLayout title="PG Dashboard" breadcrumbs={[{ label: "Dashboard" }]}>
      <WelcomeMessage businessType="pg" />
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Tenants"
          value={stats?.totalTenants ?? 0}
          icon={Users}
          loading={isLoading}
        />
        <StatsCard
          title="Occupied Rooms"
          value={stats?.occupiedRooms ?? 0}
          icon={BedDouble}
          loading={isLoading}
        />
        <StatsCard
          title="Available Rooms"
          value={stats?.availableRooms ?? 0}
          icon={Home}
          loading={isLoading}
        />
        <StatsCard
          title="Pending Payments"
          value={stats?.pendingPayments ?? 0}
          icon={DollarSign}
          loading={isLoading}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <CardTitle className="text-lg">Room Occupancy</CardTitle>
            <Button variant="outline" size="sm" asChild>
              <Link href="/services">
                View All
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Home className="h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-sm text-muted-foreground">
                No rooms configured yet
              </p>
              <Button className="mt-4" asChild data-testid="button-add-room">
                <Link href="/services?action=new">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Room
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <CardTitle className="text-lg">Recent Tenants</CardTitle>
            <Button variant="outline" size="sm" asChild>
              <Link href="/customers">
                View All
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Users className="h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-sm text-muted-foreground">
                No tenants registered yet
              </p>
              <Button className="mt-4" asChild data-testid="button-add-tenant">
                <Link href="/customers?action=new">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Tenant
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
