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
  FolderKanban,
  ListTodo,
  Clock,
  DollarSign,
  ArrowRight,
  FileText,
  CheckCircle2,
} from "lucide-react";
import { Link } from "wouter";
import { useCountry } from "@/contexts/country-context";

interface DashboardStats {
  totalProjects: number;
  activeProjects: number;
  totalTasks: number;
  pendingTasks: number;
  totalHoursLogged: number;
  unbilledHours: number;
  pendingInvoices: number;
  monthlyRevenue: number;
}

interface Project {
  id: string;
  name: string;
  code: string;
  status: string;
  customerId: string;
  billingModel: string;
  startDate: string;
  endDate: string | null;
  progress: number;
}

interface Timesheet {
  id: string;
  date: string;
  hours: string;
  description: string;
  projectId: string;
  status: string;
  isBillable: boolean;
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
      <Card data-testid="card-stats-loading">
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
    <Card data-testid={`card-stats-${title.toLowerCase().replace(/\s+/g, '-')}`}>
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

function getProjectStatusVariant(status: string) {
  switch (status) {
    case "active":
    case "in_progress":
      return "default";
    case "completed":
      return "outline";
    case "on_hold":
      return "secondary";
    case "cancelled":
    case "archived":
      return "destructive";
    default:
      return "outline";
  }
}

function getTimesheetStatusVariant(status: string) {
  switch (status) {
    case "draft":
      return "secondary";
    case "submitted":
      return "default";
    case "approved":
      return "outline";
    case "rejected":
      return "destructive";
    case "billed":
      return "outline";
    default:
      return "secondary";
  }
}

export default function SoftwareServicesDashboard() {
  const { formatCurrency } = useCountry();
  
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/services/software/dashboard/stats"],
  });

  const { data: projectsResponse, isLoading: projectsLoading } = useQuery<{ data: Project[]; meta: any }>({
    queryKey: ["/api/services/software/projects", { limit: 5 }],
  });

  const { data: timesheetsResponse, isLoading: timesheetsLoading } = useQuery<{ data: Timesheet[]; meta: any }>({
    queryKey: ["/api/services/software/timesheets/my", { limit: 5 }],
  });

  const projects = projectsResponse?.data || [];
  const timesheets = timesheetsResponse?.data || [];

  return (
    <DashboardLayout title="Software Services Dashboard" breadcrumbs={[{ label: "Dashboard" }]}>
      <div className="space-y-6">
        <WelcomeMessage businessType="software_services" />

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Active Projects"
            value={stats?.activeProjects ?? 0}
            icon={FolderKanban}
            trend={{ value: 12, label: "from last month" }}
            loading={statsLoading}
          />
          <StatsCard
            title="Open Tasks"
            value={stats?.pendingTasks ?? 0}
            icon={ListTodo}
            loading={statsLoading}
          />
          <StatsCard
            title="Unbilled Hours"
            value={stats?.unbilledHours ?? 0}
            icon={Clock}
            loading={statsLoading}
          />
          <StatsCard
            title="Monthly Revenue"
            value={formatCurrency(stats?.monthlyRevenue ?? 0)}
            icon={DollarSign}
            trend={{ value: 8, label: "from last month" }}
            loading={statsLoading}
          />
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card data-testid="card-recent-projects">
            <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
              <CardTitle className="text-lg font-semibold">Recent Projects</CardTitle>
              <Link href="/dashboard/software-services/projects">
                <Button variant="ghost" size="sm" data-testid="link-view-all-projects">
                  View All
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {projectsLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center justify-between gap-4">
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                      <Skeleton className="h-6 w-16" />
                    </div>
                  ))}
                </div>
              ) : projects.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <FolderKanban className="h-12 w-12 text-muted-foreground/50" />
                  <p className="mt-2 text-sm text-muted-foreground">No projects yet</p>
                  <Link href="/dashboard/software-services/projects">
                    <Button size="sm" className="mt-4" data-testid="button-new-project">
                      <Plus className="mr-1 h-4 w-4" />
                      Create Project
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {projects.map((project) => (
                    <div key={project.id} className="flex items-center justify-between gap-4">
                      <div>
                        <Link href={`/hr/projects`}>
                          <p className="font-medium hover:underline" data-testid={`link-project-${project.id}`}>
                            {project.name}
                          </p>
                        </Link>
                        <p className="text-sm text-muted-foreground">
                          {project.code} - {project.billingModel}
                        </p>
                      </div>
                      <Badge variant={getProjectStatusVariant(project.status)}>
                        {project.status.replace(/_/g, " ")}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card data-testid="card-recent-timesheets">
            <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
              <CardTitle className="text-lg font-semibold">My Recent Time</CardTitle>
              <Link href="/dashboard/software-services/timesheets">
                <Button variant="ghost" size="sm" data-testid="link-view-all-timesheets">
                  View All
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {timesheetsLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center justify-between gap-4">
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                      <Skeleton className="h-6 w-16" />
                    </div>
                  ))}
                </div>
              ) : timesheets.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Clock className="h-12 w-12 text-muted-foreground/50" />
                  <p className="mt-2 text-sm text-muted-foreground">No time logged yet</p>
                  <Link href="/dashboard/software-services/timesheets">
                    <Button size="sm" className="mt-4" data-testid="button-log-time">
                      <Plus className="mr-1 h-4 w-4" />
                      Log Time
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {timesheets.map((ts) => (
                    <div key={ts.id} className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-medium">{ts.description || "No description"}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>{ts.date}</span>
                          <span className="text-muted-foreground/50">|</span>
                          <span>{ts.hours}h</span>
                          {ts.isBillable && (
                            <>
                              <span className="text-muted-foreground/50">|</span>
                              <span className="text-green-600">Billable</span>
                            </>
                          )}
                        </div>
                      </div>
                      <Badge variant={getTimesheetStatusVariant(ts.status)}>
                        {ts.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="hover-elevate cursor-pointer" data-testid="card-quick-action-projects">
            <Link href="/dashboard/software-services/projects">
              <CardContent className="flex items-center gap-4 p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-md bg-blue-500/10 text-blue-500">
                  <FolderKanban className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-medium">Manage Projects</p>
                  <p className="text-sm text-muted-foreground">View and manage all projects</p>
                </div>
              </CardContent>
            </Link>
          </Card>

          <Card className="hover-elevate cursor-pointer" data-testid="card-quick-action-timesheets">
            <Link href="/dashboard/software-services/timesheets">
              <CardContent className="flex items-center gap-4 p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-md bg-green-500/10 text-green-500">
                  <Clock className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-medium">Timesheets</p>
                  <p className="text-sm text-muted-foreground">Log and manage time entries</p>
                </div>
              </CardContent>
            </Link>
          </Card>

          <Card className="hover-elevate cursor-pointer" data-testid="card-quick-action-invoices">
            <Link href="/dashboard/software-services/invoices">
              <CardContent className="flex items-center gap-4 p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-md bg-purple-500/10 text-purple-500">
                  <FileText className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-medium">Generate Invoices</p>
                  <p className="text-sm text-muted-foreground">Bill clients from timesheets</p>
                </div>
              </CardContent>
            </Link>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
