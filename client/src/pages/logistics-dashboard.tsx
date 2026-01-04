import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
import { WelcomeMessage } from "@/components/welcome-message";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Truck,
  Users,
  MapPin,
  TrendingUp,
  Plus,
  Package,
  Navigation,
  Wrench,
  ArrowRight,
  Clock,
} from "lucide-react";
import { Link } from "wouter";

interface DashboardStats {
  totalVehicles: number;
  activeDrivers: number;
  ongoingTrips: number;
  pendingShipments: number;
  deliveredToday: number;
  maintenanceDue: number;
}

function StatsCard({
  title,
  value,
  icon: Icon,
  trend,
  loading,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  trend?: { value: number; label: string };
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
            {trend && (
              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <TrendingUp className="h-3 w-3 text-green-500" />
                <span className="text-green-500">{trend.value}%</span>
                <span>{trend.label}</span>
              </p>
            )}
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function getStatusVariant(status: string) {
  switch (status) {
    case "in_transit":
    case "active":
      return "default";
    case "delivered":
    case "completed":
      return "outline";
    case "pending":
    case "scheduled":
      return "secondary";
    case "delayed":
    case "cancelled":
      return "destructive";
    default:
      return "outline";
  }
}

export default function LogisticsDashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/logistics/dashboard/stats"],
  });

  const { data: activeTrips, isLoading: tripsLoading } = useQuery<{ data: any[]; pagination: any }>({
    queryKey: ["/api/logistics/trips", { status: "in_progress", limit: 5 }],
  });

  const { data: recentShipments, isLoading: shipmentsLoading } = useQuery<{ data: any[]; pagination: any }>({
    queryKey: ["/api/logistics/shipments", { limit: 4 }],
  });

  return (
    <DashboardLayout title="Logistics Dashboard" breadcrumbs={[{ label: "Dashboard" }]}>
      <WelcomeMessage businessType="logistics" />
      
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <StatsCard
          title="Total Vehicles"
          value={stats?.totalVehicles ?? 0}
          icon={Truck}
          loading={statsLoading}
        />
        <StatsCard
          title="Active Drivers"
          value={stats?.activeDrivers ?? 0}
          icon={Users}
          loading={statsLoading}
        />
        <StatsCard
          title="Ongoing Trips"
          value={stats?.ongoingTrips ?? 0}
          icon={Navigation}
          loading={statsLoading}
        />
        <StatsCard
          title="Pending Shipments"
          value={stats?.pendingShipments ?? 0}
          icon={Package}
          loading={statsLoading}
        />
        <StatsCard
          title="Delivered Today"
          value={stats?.deliveredToday ?? 0}
          icon={MapPin}
          loading={statsLoading}
          trend={{ value: 12, label: "vs yesterday" }}
        />
        <StatsCard
          title="Maintenance Due"
          value={stats?.maintenanceDue ?? 0}
          icon={Wrench}
          loading={statsLoading}
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
            <CardTitle className="text-base font-semibold">Active Trips</CardTitle>
            <Link href="/trips/new">
              <Button size="sm" data-testid="button-create-trip">
                <Plus className="mr-2 h-4 w-4" />
                Create Trip
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {tripsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : activeTrips?.data?.length ? (
              <div className="space-y-4">
                {activeTrips.data.slice(0, 5).map((trip: any) => (
                  <div
                    key={trip.id}
                    className="flex items-center justify-between rounded-lg border p-4"
                    data-testid={`card-trip-${trip.id}`}
                  >
                    <div>
                      <p className="font-medium">{trip.tripNumber}</p>
                      <p className="text-sm text-muted-foreground">
                        {trip.origin} to {trip.destination}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={getStatusVariant(trip.status)}>
                        {trip.status.replace("_", " ")}
                      </Badge>
                      <Link href={`/trips/${trip.id}`}>
                        <Button size="icon" variant="ghost" data-testid={`button-view-trip-${trip.id}`}>
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-8 text-center text-muted-foreground">
                No active trips. Create a new trip to get started.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
            <CardTitle className="text-base font-semibold">Recent Shipments</CardTitle>
            <Link href="/shipments/new">
              <Button size="sm" data-testid="button-create-shipment">
                <Plus className="mr-2 h-4 w-4" />
                New Shipment
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {shipmentsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : recentShipments?.data?.length ? (
              <div className="space-y-4">
                {recentShipments.data.slice(0, 4).map((shipment: any) => (
                  <div
                    key={shipment.id}
                    className="flex items-center justify-between rounded-lg border p-4"
                    data-testid={`card-shipment-${shipment.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
                        <Package className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{shipment.trackingNumber}</p>
                        <p className="text-sm text-muted-foreground">
                          {shipment.senderName} - {shipment.receiverCity}
                        </p>
                      </div>
                    </div>
                    <Badge variant={getStatusVariant(shipment.status)}>{shipment.status}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-8 text-center text-muted-foreground">
                No shipments yet. Create your first shipment.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
            <CardTitle className="text-base font-semibold">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Link href="/vehicles/new">
                <Button variant="outline" data-testid="button-add-vehicle">
                  <Truck className="mr-2 h-4 w-4" />
                  Add Vehicle
                </Button>
              </Link>
              <Link href="/drivers/new">
                <Button variant="outline" data-testid="button-add-driver">
                  <Users className="mr-2 h-4 w-4" />
                  Add Driver
                </Button>
              </Link>
              <Link href="/shipments/new">
                <Button variant="outline" data-testid="button-book-shipment">
                  <Package className="mr-2 h-4 w-4" />
                  Book Shipment
                </Button>
              </Link>
              <Link href="/maintenance/new">
                <Button variant="outline" data-testid="button-schedule-maintenance">
                  <Wrench className="mr-2 h-4 w-4" />
                  Schedule Maintenance
                </Button>
              </Link>
              <Link href="/tracking">
                <Button variant="outline" data-testid="button-live-tracking">
                  <MapPin className="mr-2 h-4 w-4" />
                  Live Tracking
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
