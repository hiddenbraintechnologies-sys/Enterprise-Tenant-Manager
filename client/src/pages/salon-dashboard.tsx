import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
import { WelcomeMessage } from "@/components/welcome-message";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Users,
  Calendar,
  Scissors,
  DollarSign,
  Plus,
  ArrowRight,
} from "lucide-react";
import { Link } from "wouter";
import { useCountry } from "@/contexts/country-context";

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

export default function SalonDashboard() {
  const { formatCurrency } = useCountry();
  const { data: stats, isLoading } = useQuery<{
    totalClients: number;
    todayAppointments: number;
    activeServices: number;
    monthlyRevenue: number;
  }>({
    queryKey: ["/api/salon/stats"],
  });

  return (
    <DashboardLayout title="Salon Dashboard" breadcrumbs={[{ label: "Dashboard" }]}>
      <WelcomeMessage businessType="salon" />
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Clients"
          value={stats?.totalClients ?? 0}
          icon={Users}
          loading={isLoading}
        />
        <StatsCard
          title="Today's Appointments"
          value={stats?.todayAppointments ?? 0}
          icon={Calendar}
          loading={isLoading}
        />
        <StatsCard
          title="Active Services"
          value={stats?.activeServices ?? 0}
          icon={Scissors}
          loading={isLoading}
        />
        <StatsCard
          title="Monthly Revenue"
          value={formatCurrency(stats?.monthlyRevenue ?? 0)}
          icon={DollarSign}
          loading={isLoading}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <CardTitle className="text-lg">Today's Appointments</CardTitle>
            <Button variant="outline" size="sm" asChild>
              <Link href="/bookings">
                View All
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Calendar className="h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-sm text-muted-foreground">
                No appointments scheduled for today
              </p>
              <Button className="mt-4" asChild data-testid="button-book-appointment">
                <Link href="/bookings?action=new">
                  <Plus className="mr-2 h-4 w-4" />
                  Book Appointment
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <CardTitle className="text-lg">Popular Services</CardTitle>
            <Button variant="outline" size="sm" asChild>
              <Link href="/services">
                Manage
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Scissors className="h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-sm text-muted-foreground">
                No services added yet
              </p>
              <Button className="mt-4" asChild data-testid="button-add-service">
                <Link href="/services?action=new">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Service
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
