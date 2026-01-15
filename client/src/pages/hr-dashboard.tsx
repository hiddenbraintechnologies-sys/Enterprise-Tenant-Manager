import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  UserCheck,
  Building2,
  Calendar,
  Clock,
  DollarSign,
  TrendingUp,
  Plus,
  ArrowRight,
  UserPlus,
  CalendarCheck,
  FileText,
  FolderKanban,
  Timer,
} from "lucide-react";
import { Link } from "wouter";
import { useTenant } from "@/contexts/tenant-context";

interface DashboardStats {
  totalEmployees: number;
  activeEmployees: number;
  todayPresent: number;
  todayAbsent: number;
  pendingLeaves: number;
  departmentCount: number;
}

function StatsCard({
  title,
  value,
  icon: Icon,
  trend,
  loading,
  color = "primary",
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  trend?: { value: number; label: string };
  loading?: boolean;
  color?: "primary" | "green" | "yellow" | "red";
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

  const colorClasses = {
    primary: "bg-primary/10 text-primary",
    green: "bg-green-500/10 text-green-600 dark:text-green-400",
    yellow: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
    red: "bg-red-500/10 text-red-600 dark:text-red-400",
  };

  return (
    <Card data-testid={`card-stat-${title.toLowerCase().replace(/\s+/g, "-")}`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="mt-1 text-3xl font-bold" data-testid={`text-stat-value-${title.toLowerCase().replace(/\s+/g, "-")}`}>{value}</p>
            {trend && (
              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <TrendingUp className="h-3 w-3 text-green-500" />
                <span className="text-green-500">{trend.value}%</span>
                <span>{trend.label}</span>
              </p>
            )}
          </div>
          <div className={`flex h-12 w-12 items-center justify-center rounded-md ${colorClasses[color]}`}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function getStatusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "active":
    case "approved":
      return "default";
    case "pending":
    case "draft":
      return "secondary";
    case "rejected":
    case "inactive":
    case "terminated":
      return "destructive";
    default:
      return "outline";
  }
}

export default function HrDashboard() {
  const { isFeatureEnabled } = useTenant();
  const hasItExtensions = isFeatureEnabled("hrms_it_extensions");
  
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/hr/dashboard"],
  });

  const { data: recentEmployees, isLoading: employeesLoading } = useQuery<{ data: any[]; total: number }>({
    queryKey: ["/api/hr/employees", { limit: 5 }],
  });

  const { data: pendingLeaves, isLoading: leavesLoading } = useQuery<{ data: any[]; total: number }>({
    queryKey: ["/api/hr/leaves", { status: "pending", limit: 5 }],
  });

  return (
    <DashboardLayout title="HR Dashboard" breadcrumbs={[{ label: "HR Management" }]}>
      
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <StatsCard
          title="Total Employees"
          value={stats?.totalEmployees ?? 0}
          icon={Users}
          loading={statsLoading}
        />
        <StatsCard
          title="Active Employees"
          value={stats?.activeEmployees ?? 0}
          icon={UserCheck}
          color="green"
          loading={statsLoading}
        />
        <StatsCard
          title="Departments"
          value={stats?.departmentCount ?? 0}
          icon={Building2}
          loading={statsLoading}
        />
        <StatsCard
          title="Present Today"
          value={stats?.todayPresent ?? 0}
          icon={CalendarCheck}
          color="green"
          loading={statsLoading}
        />
        <StatsCard
          title="Absent Today"
          value={stats?.todayAbsent ?? 0}
          icon={Calendar}
          color="red"
          loading={statsLoading}
        />
        <StatsCard
          title="Pending Leaves"
          value={stats?.pendingLeaves ?? 0}
          icon={FileText}
          color="yellow"
          loading={statsLoading}
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
            <CardTitle className="text-lg">Recent Employees</CardTitle>
            <Button asChild variant="ghost" size="sm" data-testid="button-view-all-employees">
              <Link href="/hr/employees">
                View All <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {employeesLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : recentEmployees?.data?.length ? (
              <div className="space-y-3">
                {recentEmployees.data.map((emp: any) => (
                  <div
                    key={emp.id}
                    className="flex items-center justify-between gap-4 rounded-md border p-3"
                    data-testid={`row-employee-${emp.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-medium">
                        {emp.firstName?.[0]}{emp.lastName?.[0]}
                      </div>
                      <div>
                        <p className="font-medium">{emp.firstName} {emp.lastName}</p>
                        <p className="text-sm text-muted-foreground">{emp.designation || "No designation"}</p>
                      </div>
                    </div>
                    <Badge variant={getStatusVariant(emp.status)}>{emp.status}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Users className="h-12 w-12 text-muted-foreground/50" />
                <p className="mt-2 text-muted-foreground">No employees yet</p>
                <Button asChild className="mt-4" size="sm" data-testid="button-add-first-employee">
                  <Link href="/hr/employees">
                    <Plus className="mr-1 h-4 w-4" /> Add Employee
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
            <CardTitle className="text-lg">Pending Leave Requests</CardTitle>
            <Button asChild variant="ghost" size="sm" data-testid="button-view-all-leaves">
              <Link href="/hr/leaves">
                View All <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {leavesLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : pendingLeaves?.data?.length ? (
              <div className="space-y-3">
                {pendingLeaves.data.map((leave: any) => (
                  <div
                    key={leave.id}
                    className="flex items-center justify-between gap-4 rounded-md border p-3"
                    data-testid={`row-leave-${leave.id}`}
                  >
                    <div>
                      <p className="font-medium">Employee #{leave.employeeId?.slice(0, 8)}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant="secondary">{leave.status}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Calendar className="h-12 w-12 text-muted-foreground/50" />
                <p className="mt-2 text-muted-foreground">No pending leave requests</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-8 flex flex-wrap gap-4">
        <Button asChild data-testid="button-manage-employees">
          <Link href="/hr/employees">
            <Users className="mr-2 h-4 w-4" /> Manage Employees
          </Link>
        </Button>
        <Button asChild variant="outline" data-testid="button-view-attendance">
          <Link href="/hr/attendance">
            <Clock className="mr-2 h-4 w-4" /> View Attendance
          </Link>
        </Button>
        <Button asChild variant="outline" data-testid="button-manage-leaves">
          <Link href="/hr/leaves">
            <Calendar className="mr-2 h-4 w-4" /> Manage Leaves
          </Link>
        </Button>
        <Button asChild variant="outline" data-testid="button-process-payroll">
          <Link href="/hr/payroll">
            <DollarSign className="mr-2 h-4 w-4" /> Process Payroll
          </Link>
        </Button>
        <Button asChild variant="outline" data-testid="button-pay-runs">
          <Link href="/hr/pay-runs">
            <DollarSign className="mr-2 h-4 w-4" /> Pay Runs
          </Link>
        </Button>
        {hasItExtensions && (
          <>
            <Button asChild variant="outline" data-testid="button-manage-projects">
              <Link href="/hr/projects">
                <FolderKanban className="mr-2 h-4 w-4" /> Projects
              </Link>
            </Button>
            <Button asChild variant="outline" data-testid="button-manage-timesheets">
              <Link href="/hr/timesheets">
                <Timer className="mr-2 h-4 w-4" /> Timesheets
              </Link>
            </Button>
            <Button asChild variant="outline" data-testid="button-manage-allocations">
              <Link href="/hr/allocations">
                <UserCheck className="mr-2 h-4 w-4" /> Allocations
              </Link>
            </Button>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
