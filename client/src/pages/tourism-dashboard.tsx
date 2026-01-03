import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
import { WelcomeMessage } from "@/components/welcome-message";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Plane,
  Users,
  Calendar,
  TrendingUp,
  Plus,
  Package,
  MapPin,
  Building,
  ArrowRight,
  DollarSign,
} from "lucide-react";
import { Link } from "wouter";

interface DashboardStats {
  totalPackages: number;
  activeBookings: number;
  upcomingDepartures: number;
  totalTravelers: number;
  totalVendors: number;
  monthlyRevenue: number;
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

function getBookingStatusVariant(status: string) {
  switch (status) {
    case "confirmed":
      return "default";
    case "paid":
      return "default";
    case "in_progress":
      return "secondary";
    case "completed":
      return "outline";
    case "cancelled":
      return "destructive";
    default:
      return "outline";
  }
}

export default function TourismDashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/tourism/dashboard/stats"],
  });

  const { data: recentBookings, isLoading: bookingsLoading } = useQuery<{ data: any[]; pagination: any }>({
    queryKey: ["/api/tourism/bookings", { limit: 5 }],
  });

  const { data: featuredPackages, isLoading: packagesLoading } = useQuery<{ data: any[]; pagination: any }>({
    queryKey: ["/api/tourism/packages", { isFeatured: true, limit: 4 }],
  });

  return (
    <DashboardLayout title="Tourism Dashboard" breadcrumbs={[{ label: "Dashboard" }]}>
      <WelcomeMessage businessType="tourism" />
      
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <StatsCard
          title="Total Packages"
          value={stats?.totalPackages ?? 0}
          icon={Package}
          loading={statsLoading}
        />
        <StatsCard
          title="Active Bookings"
          value={stats?.activeBookings ?? 0}
          icon={Calendar}
          loading={statsLoading}
        />
        <StatsCard
          title="Upcoming Departures"
          value={stats?.upcomingDepartures ?? 0}
          icon={Plane}
          loading={statsLoading}
        />
        <StatsCard
          title="Total Travelers"
          value={stats?.totalTravelers ?? 0}
          icon={Users}
          loading={statsLoading}
        />
        <StatsCard
          title="Partner Vendors"
          value={stats?.totalVendors ?? 0}
          icon={Building}
          loading={statsLoading}
        />
        <StatsCard
          title="Monthly Revenue"
          value={stats?.monthlyRevenue ? `$${stats.monthlyRevenue.toLocaleString()}` : "$0"}
          icon={DollarSign}
          loading={statsLoading}
          trend={{ value: 8, label: "vs last month" }}
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
            <CardTitle className="text-base font-semibold">Recent Bookings</CardTitle>
            <Link href="/bookings/new">
              <Button size="sm" data-testid="button-new-booking">
                <Plus className="mr-2 h-4 w-4" />
                New Booking
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {bookingsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : recentBookings?.data?.length ? (
              <div className="space-y-4">
                {recentBookings.data.slice(0, 5).map((booking: any) => (
                  <div
                    key={booking.id}
                    className="flex items-center justify-between rounded-lg border p-4"
                    data-testid={`card-booking-${booking.id}`}
                  >
                    <div>
                      <p className="font-medium">{booking.bookingNumber}</p>
                      <p className="text-sm text-muted-foreground">
                        {booking.package?.name || "Custom Package"} - {booking.departureDate}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={getBookingStatusVariant(booking.status)}>
                        {booking.status.replace("_", " ")}
                      </Badge>
                      <Link href={`/bookings/${booking.id}`}>
                        <Button size="icon" variant="ghost" data-testid={`button-view-booking-${booking.id}`}>
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-8 text-center text-muted-foreground">
                No bookings yet. Create your first booking to get started.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
            <CardTitle className="text-base font-semibold">Featured Packages</CardTitle>
            <Link href="/packages/new">
              <Button size="sm" data-testid="button-create-package">
                <Plus className="mr-2 h-4 w-4" />
                Create Package
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {packagesLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : featuredPackages?.data?.length ? (
              <div className="space-y-4">
                {featuredPackages.data.slice(0, 4).map((pkg: any) => (
                  <div
                    key={pkg.id}
                    className="flex items-center justify-between rounded-lg border p-4"
                    data-testid={`card-package-${pkg.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
                        <MapPin className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{pkg.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {pkg.duration} {pkg.durationUnit} - ${pkg.basePrice}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline">{pkg.packageType}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-8 text-center text-muted-foreground">
                No featured packages. Create packages and mark them as featured.
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
              <Link href="/packages/new">
                <Button variant="outline" data-testid="button-add-package">
                  <Package className="mr-2 h-4 w-4" />
                  Add Package
                </Button>
              </Link>
              <Link href="/bookings/new">
                <Button variant="outline" data-testid="button-create-booking">
                  <Calendar className="mr-2 h-4 w-4" />
                  Create Booking
                </Button>
              </Link>
              <Link href="/vendors/new">
                <Button variant="outline" data-testid="button-add-vendor">
                  <Building className="mr-2 h-4 w-4" />
                  Add Vendor
                </Button>
              </Link>
              <Link href="/itineraries/new">
                <Button variant="outline" data-testid="button-create-itinerary">
                  <MapPin className="mr-2 h-4 w-4" />
                  Create Itinerary
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
