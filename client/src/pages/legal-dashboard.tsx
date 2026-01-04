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
  TrendingUp,
  Plus,
  Briefcase,
  FileText,
  Scale,
  DollarSign,
  ArrowRight,
  Clock,
  Shield,
} from "lucide-react";
import { Link } from "wouter";

interface DashboardStats {
  totalClients: number;
  activeCases: number;
  upcomingAppointments: number;
  pendingInvoices: number;
  monthlyRevenue: number;
  casesWonRate: number;
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

function getCaseStatusVariant(status: string) {
  switch (status) {
    case "active":
    case "in_progress":
      return "default";
    case "won":
    case "closed":
      return "outline";
    case "pending":
    case "on_hold":
      return "secondary";
    case "lost":
      return "destructive";
    default:
      return "outline";
  }
}

function getConfidentialityBadge(level: string) {
  switch (level) {
    case "highly_restricted":
      return { variant: "destructive" as const, label: "Highly Restricted" };
    case "privileged":
      return { variant: "destructive" as const, label: "Privileged" };
    case "confidential":
      return { variant: "secondary" as const, label: "Confidential" };
    case "internal":
      return { variant: "outline" as const, label: "Internal" };
    default:
      return { variant: "outline" as const, label: "Public" };
  }
}

export default function LegalDashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/legal/dashboard/stats"],
  });

  const { data: activeCases, isLoading: casesLoading } = useQuery<{ data: any[]; pagination: any }>({
    queryKey: ["/api/legal/cases", { status: "active", limit: 5 }],
  });

  const { data: upcomingAppointments, isLoading: appointmentsLoading } = useQuery<{ data: any[]; pagination: any }>({
    queryKey: ["/api/legal/appointments", { limit: 4 }],
  });

  return (
    <DashboardLayout title="Legal Practice Dashboard" breadcrumbs={[{ label: "Dashboard" }]}>
      <WelcomeMessage businessType="legal" />
      
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <StatsCard
          title="Total Clients"
          value={stats?.totalClients ?? 0}
          icon={Users}
          loading={statsLoading}
        />
        <StatsCard
          title="Active Cases"
          value={stats?.activeCases ?? 0}
          icon={Briefcase}
          loading={statsLoading}
        />
        <StatsCard
          title="Upcoming Appointments"
          value={stats?.upcomingAppointments ?? 0}
          icon={Calendar}
          loading={statsLoading}
        />
        <StatsCard
          title="Pending Invoices"
          value={stats?.pendingInvoices ?? 0}
          icon={FileText}
          loading={statsLoading}
        />
        <StatsCard
          title="Monthly Revenue"
          value={stats?.monthlyRevenue ? `₹${stats.monthlyRevenue.toLocaleString()}` : "₹0"}
          icon={DollarSign}
          loading={statsLoading}
          trend={{ value: 15, label: "vs last month" }}
        />
        <StatsCard
          title="Cases Won Rate"
          value={stats?.casesWonRate ? `${stats.casesWonRate}%` : "0%"}
          icon={Scale}
          loading={statsLoading}
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
            <CardTitle className="text-base font-semibold">Active Cases</CardTitle>
            <Link href="/cases/new">
              <Button size="sm" data-testid="button-create-case">
                <Plus className="mr-2 h-4 w-4" />
                New Case
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {casesLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : activeCases?.data?.length ? (
              <div className="space-y-4">
                {activeCases.data.slice(0, 5).map((caseItem: any) => (
                  <div
                    key={caseItem.id}
                    className="flex items-center justify-between rounded-lg border p-4"
                    data-testid={`card-case-${caseItem.id}`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{caseItem.caseNumber}</p>
                        {caseItem.isAttorneyClientPrivileged && (
                          <Shield className="h-4 w-4 text-amber-500" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {caseItem.title} - {caseItem.caseType}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={getCaseStatusVariant(caseItem.status)}>
                        {caseItem.status.replace("_", " ")}
                      </Badge>
                      <Link href={`/cases/${caseItem.id}`}>
                        <Button size="icon" variant="ghost" data-testid={`button-view-case-${caseItem.id}`}>
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-8 text-center text-muted-foreground">
                No active cases. Create a new case to get started.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
            <CardTitle className="text-base font-semibold">Upcoming Appointments</CardTitle>
            <Link href="/appointments/new">
              <Button size="sm" data-testid="button-schedule-appointment">
                <Plus className="mr-2 h-4 w-4" />
                Schedule
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {appointmentsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : upcomingAppointments?.data?.length ? (
              <div className="space-y-4">
                {upcomingAppointments.data.slice(0, 4).map((appointment: any) => (
                  <div
                    key={appointment.id}
                    className="flex items-center justify-between rounded-lg border p-4"
                    data-testid={`card-appointment-${appointment.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
                        <Calendar className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{appointment.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {appointment.scheduledDate} at {appointment.startTime}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline">{appointment.appointmentType}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-8 text-center text-muted-foreground">
                No upcoming appointments scheduled.
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
              <Link href="/clients/new">
                <Button variant="outline" data-testid="button-add-client">
                  <Users className="mr-2 h-4 w-4" />
                  Add Client
                </Button>
              </Link>
              <Link href="/cases/new">
                <Button variant="outline" data-testid="button-open-case">
                  <Briefcase className="mr-2 h-4 w-4" />
                  Open Case
                </Button>
              </Link>
              <Link href="/appointments/new">
                <Button variant="outline" data-testid="button-book-appointment">
                  <Calendar className="mr-2 h-4 w-4" />
                  Book Appointment
                </Button>
              </Link>
              <Link href="/documents/new">
                <Button variant="outline" data-testid="button-upload-document">
                  <FileText className="mr-2 h-4 w-4" />
                  Upload Document
                </Button>
              </Link>
              <Link href="/billing/new">
                <Button variant="outline" data-testid="button-create-invoice">
                  <DollarSign className="mr-2 h-4 w-4" />
                  Create Invoice
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
