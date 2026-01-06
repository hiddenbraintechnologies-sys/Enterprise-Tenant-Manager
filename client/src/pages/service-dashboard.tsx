import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
import { WelcomeMessage } from "@/components/welcome-message";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Calendar,
  DollarSign,
  TrendingUp,
  Plus,
  Clock,
  ArrowRight,
} from "lucide-react";
import { Link } from "wouter";
import type { BookingWithDetails } from "@shared/schema";
import { format, parseISO, isToday, isTomorrow } from "date-fns";
import { useCountry } from "@/contexts/country-context";

interface DashboardStats {
  totalCustomers: number;
  totalBookings: number;
  todayBookings: number;
  monthlyRevenue: number;
  revenueGrowth: number;
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
    case "completed":
      return "secondary";
    case "cancelled":
      return "destructive";
    default:
      return "outline";
  }
}

function formatBookingDate(dateStr: string) {
  const date = parseISO(dateStr);
  if (isToday(date)) return "Today";
  if (isTomorrow(date)) return "Tomorrow";
  return format(date, "MMM d, yyyy");
}

export default function ServiceDashboard() {
  const { formatCurrency } = useCountry();
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: upcomingBookings, isLoading: bookingsLoading } = useQuery<BookingWithDetails[]>({
    queryKey: ["/api/bookings/upcoming"],
  });

  return (
    <DashboardLayout title="Dashboard" breadcrumbs={[{ label: "Dashboard" }]}>
      <WelcomeMessage businessType="service" />
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Customers"
          value={stats?.totalCustomers ?? 0}
          icon={Users}
          loading={statsLoading}
        />
        <StatsCard
          title="Today's Bookings"
          value={stats?.todayBookings ?? 0}
          icon={Calendar}
          loading={statsLoading}
        />
        <StatsCard
          title="Total Bookings"
          value={stats?.totalBookings ?? 0}
          icon={Clock}
          loading={statsLoading}
        />
        <StatsCard
          title="Monthly Revenue"
          value={formatCurrency(stats?.monthlyRevenue ?? 0)}
          icon={DollarSign}
          trend={
            stats?.revenueGrowth
              ? { value: stats.revenueGrowth, label: "vs last month" }
              : undefined
          }
          loading={statsLoading}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <CardTitle className="text-lg">Upcoming Bookings</CardTitle>
            <Button variant="outline" size="sm" asChild>
              <Link href="/bookings">
                View All
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {bookingsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-12 w-12 rounded-md" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                ))}
              </div>
            ) : upcomingBookings?.length ? (
              <div className="space-y-4">
                {upcomingBookings.slice(0, 5).map((booking) => (
                  <div
                    key={booking.id}
                    className="flex items-center justify-between gap-4 rounded-md border p-3"
                    data-testid={`booking-item-${booking.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted">
                        <Calendar className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium">{booking.customer?.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {booking.service?.name} - {booking.bookingDate ? formatBookingDate(booking.bookingDate) : "No date"}
                        </p>
                      </div>
                    </div>
                    <Badge variant={getBookingStatusVariant(booking.status || "pending")}>
                      {booking.status || "pending"}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Calendar className="h-12 w-12 text-muted-foreground/50" />
                <p className="mt-4 text-sm text-muted-foreground">
                  No upcoming bookings
                </p>
                <Button className="mt-4" asChild>
                  <Link href="/bookings/new">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Booking
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              <Button variant="outline" className="justify-start" asChild>
                <Link href="/customers/new">
                  <Users className="mr-2 h-4 w-4" />
                  Add Customer
                </Link>
              </Button>
              <Button variant="outline" className="justify-start" asChild>
                <Link href="/bookings/new">
                  <Calendar className="mr-2 h-4 w-4" />
                  New Booking
                </Link>
              </Button>
              <Button variant="outline" className="justify-start" asChild>
                <Link href="/services/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Service
                </Link>
              </Button>
              <Button variant="outline" className="justify-start" asChild>
                <Link href="/analytics">
                  <TrendingUp className="mr-2 h-4 w-4" />
                  View Analytics
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
