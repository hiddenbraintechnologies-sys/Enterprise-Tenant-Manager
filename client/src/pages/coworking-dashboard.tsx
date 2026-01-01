import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
import { WelcomeMessage } from "@/components/welcome-message";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Monitor,
  Calendar,
  Users,
  Building2,
  Plus,
  Clock,
  ArrowRight,
} from "lucide-react";
import { Link } from "wouter";
import { format, parseISO } from "date-fns";
import type { DeskBooking, Desk, Space } from "@shared/schema";

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

export default function CoworkingDashboard() {
  const { data: desks, isLoading: desksLoading } = useQuery<Desk[]>({
    queryKey: ["/api/coworking/desks"],
  });

  const { data: bookings, isLoading: bookingsLoading } = useQuery<DeskBooking[]>({
    queryKey: ["/api/coworking/bookings"],
  });

  const availableDesks = desks?.filter(d => d.status === "available").length ?? 0;
  const totalDesks = desks?.length ?? 0;
  const activeBookings = bookings?.filter(b => b.status === "confirmed").length ?? 0;

  return (
    <DashboardLayout title="Coworking Dashboard" breadcrumbs={[{ label: "Dashboard" }]}>
      <WelcomeMessage businessType="coworking" />
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Available Desks"
          value={availableDesks}
          icon={Monitor}
          loading={desksLoading}
        />
        <StatsCard
          title="Total Desks"
          value={totalDesks}
          icon={Building2}
          loading={desksLoading}
        />
        <StatsCard
          title="Active Bookings"
          value={activeBookings}
          icon={Calendar}
          loading={bookingsLoading}
        />
        <StatsCard
          title="Today's Check-ins"
          value={0}
          icon={Users}
          loading={false}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <CardTitle className="text-lg">Recent Bookings</CardTitle>
            <Button variant="outline" size="sm" asChild>
              <Link href="/coworking/bookings">
                View All
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {bookingsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : bookings && bookings.length > 0 ? (
              <div className="space-y-3">
                {bookings.slice(0, 5).map((booking) => (
                  <div
                    key={booking.id}
                    data-testid={`booking-item-${booking.id}`}
                    className="flex items-center justify-between rounded-md border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted">
                        <Monitor className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium">Desk {booking.deskId.slice(0, 8)}</p>
                        <p className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {format(parseISO(String(booking.startTime)), "MMM d, h:mm a")}
                        </p>
                      </div>
                    </div>
                    <Badge variant={getBookingStatusVariant(booking.status || "pending")}>
                      {booking.status}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Calendar className="mb-2 h-10 w-10 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No bookings yet</p>
                <Button className="mt-4" size="sm" asChild>
                  <Link href="/coworking/book">
                    <Plus className="mr-1 h-4 w-4" />
                    Book a Desk
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <CardTitle className="text-lg">Desk Availability</CardTitle>
            <Button variant="outline" size="sm" asChild>
              <Link href="/coworking/desks">
                Manage Desks
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {desksLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : desks && desks.length > 0 ? (
              <div className="space-y-3">
                {desks.slice(0, 5).map((desk) => (
                  <div
                    key={desk.id}
                    data-testid={`desk-item-${desk.id}`}
                    className="flex items-center justify-between rounded-md border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <Monitor className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{desk.name || `Desk ${desk.id.slice(0, 8)}`}</p>
                        <p className="text-xs text-muted-foreground capitalize">{desk.type} desk</p>
                      </div>
                    </div>
                    <Badge variant={desk.status === "available" ? "default" : "secondary"}>
                      {desk.status}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Building2 className="mb-2 h-10 w-10 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No desks configured</p>
                <Button className="mt-4" size="sm" asChild>
                  <Link href="/coworking/spaces">
                    <Plus className="mr-1 h-4 w-4" />
                    Add Space
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
