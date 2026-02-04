import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { DashboardLayout } from "@/components/dashboard-layout";
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
import type { Booking, Customer, Service, BookingWithDetails } from "@shared/schema";
import { format, parseISO, isToday, isTomorrow } from "date-fns";
import { useCountry } from "@/contexts/country-context";
import { useAuth, DASHBOARD_ROUTES } from "@/hooks/use-auth";

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

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { formatCurrency } = useCountry();
  const { user, tenant, role, isLoading: authLoading } = useAuth();
  
  // Smart routing based on role and business type
  // Implements role-based internal routing per spec:
  // Owner/Admin → /dashboard/overview (module-specific dashboard)
  // Manager → /dashboard/operations (same as overview for now)
  // Staff → /dashboard (generic work view - stay here)
  // Accountant → /dashboard (billing-focused - stay here)
  // Unknown/missing → /dashboard (safe fallback)
  useEffect(() => {
    if (authLoading) return;
    
    // Safety: If no user or tenant, stay on generic dashboard (safe fallback)
    if (!user || !tenant) return;
    
    const businessType = tenant.businessType || "service";
    const moduleRoute = DASHBOARD_ROUTES[businessType] || "/dashboard/service";
    const normalizedRole = (role || "").toLowerCase();
    
    // Route based on role
    switch (normalizedRole) {
      case "owner":
      case "admin":
        // Owners and Admins see the full module-specific overview dashboard
        setLocation(moduleRoute);
        break;
      case "manager":
        // Managers see operations view (module-specific for now)
        setLocation(moduleRoute);
        break;
      case "staff":
      case "accountant":
        // Staff and Accountant stay on generic dashboard (their work/billing view)
        // No redirect - they see this page
        break;
      default:
        // Unknown role or no role - stay on safe generic dashboard
        // This prevents blank pages for edge cases
        break;
    }
  }, [authLoading, user, tenant, role, setLocation]);
  
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: upcomingBookings, isLoading: bookingsLoading } = useQuery<BookingWithDetails[]>({
    queryKey: ["/api/bookings/upcoming"],
  });

  return (
    <DashboardLayout title="Dashboard" breadcrumbs={[{ label: "Dashboard" }]}>
      {/* Stats Grid */}
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
          value={stats ? formatCurrency(stats.monthlyRevenue) : formatCurrency(0)}
          icon={DollarSign}
          trend={stats?.revenueGrowth ? { value: stats.revenueGrowth, label: "vs last month" } : undefined}
          loading={statsLoading}
        />
      </div>

      {/* Quick Actions */}
      <div className="mt-8">
        <h2 className="mb-4 text-lg font-medium">Quick Actions</h2>
        <div className="flex flex-wrap gap-4">
          <Button asChild data-testid="button-new-booking">
            <Link href="/bookings/new">
              <Plus className="mr-2 h-4 w-4" />
              New Booking
            </Link>
          </Button>
          <Button variant="outline" asChild data-testid="button-add-customer">
            <Link href="/customers/new">
              <Users className="mr-2 h-4 w-4" />
              Add Customer
            </Link>
          </Button>
          <Button variant="outline" asChild data-testid="button-add-service">
            <Link href="/services/new">
              <Plus className="mr-2 h-4 w-4" />
              Add Service
            </Link>
          </Button>
        </div>
      </div>

      {/* Upcoming Bookings */}
      <div className="mt-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-4">
            <CardTitle className="text-lg font-medium">Upcoming Bookings</CardTitle>
            <Button variant="ghost" size="sm" asChild>
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
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                    <Skeleton className="h-6 w-20" />
                  </div>
                ))}
              </div>
            ) : upcomingBookings && upcomingBookings.length > 0 ? (
              <div className="space-y-4">
                {upcomingBookings.slice(0, 5).map((booking) => (
                  <div
                    key={booking.id}
                    className="flex items-center gap-4 rounded-md border p-4"
                    data-testid={`booking-item-${booking.id}`}
                  >
                    <div className="flex h-12 w-12 flex-col items-center justify-center rounded-md bg-primary/10 text-primary">
                      <span className="text-xs font-medium">
                        {format(parseISO(booking.bookingDate), "MMM")}
                      </span>
                      <span className="text-lg font-bold leading-none">
                        {format(parseISO(booking.bookingDate), "d")}
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{booking.customer?.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {booking.service?.name} • {booking.startTime?.slice(0, 5)} - {booking.endTime?.slice(0, 5)}
                      </p>
                    </div>
                    <Badge variant={getBookingStatusVariant(booking.status || "pending")}>
                      {booking.status}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Calendar className="h-12 w-12 text-muted-foreground/50" />
                <p className="mt-4 text-sm text-muted-foreground">No upcoming bookings</p>
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
      </div>
    </DashboardLayout>
  );
}
