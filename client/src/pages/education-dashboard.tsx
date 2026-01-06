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
  BookOpen,
  GraduationCap,
  ClipboardCheck,
  DollarSign,
  ArrowRight,
  FileText,
} from "lucide-react";
import { Link } from "wouter";
import { useCountry } from "@/contexts/country-context";

interface DashboardStats {
  totalStudents: number;
  activeCourses: number;
  activeBatches: number;
  pendingFees: number;
  upcomingExams: number;
  todayAttendance: number;
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
    case "active":
      return "default";
    case "enrolled":
      return "default";
    case "completed":
      return "outline";
    case "pending":
      return "secondary";
    case "overdue":
      return "destructive";
    default:
      return "outline";
  }
}

export default function EducationDashboard() {
  const { formatCurrency } = useCountry();
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/education/dashboard/stats"],
  });

  const { data: recentStudents, isLoading: studentsLoading } = useQuery<{ data: any[]; pagination: any }>({
    queryKey: ["/api/education/students", { limit: 5 }],
  });

  const { data: upcomingExams, isLoading: examsLoading } = useQuery<{ data: any[]; pagination: any }>({
    queryKey: ["/api/education/exams", { limit: 4 }],
  });

  return (
    <DashboardLayout title="Education Dashboard" breadcrumbs={[{ label: "Dashboard" }]}>
      <WelcomeMessage businessType="education" />
      
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <StatsCard
          title="Total Students"
          value={stats?.totalStudents ?? 0}
          icon={Users}
          loading={statsLoading}
        />
        <StatsCard
          title="Active Courses"
          value={stats?.activeCourses ?? 0}
          icon={BookOpen}
          loading={statsLoading}
        />
        <StatsCard
          title="Active Batches"
          value={stats?.activeBatches ?? 0}
          icon={GraduationCap}
          loading={statsLoading}
        />
        <StatsCard
          title="Pending Fees"
          value={formatCurrency(stats?.pendingFees ?? 0)}
          icon={DollarSign}
          loading={statsLoading}
        />
        <StatsCard
          title="Upcoming Exams"
          value={stats?.upcomingExams ?? 0}
          icon={FileText}
          loading={statsLoading}
        />
        <StatsCard
          title="Today's Attendance"
          value={stats?.todayAttendance ? `${stats.todayAttendance}%` : "0%"}
          icon={ClipboardCheck}
          loading={statsLoading}
          trend={{ value: 5, label: "vs yesterday" }}
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
            <CardTitle className="text-base font-semibold">Recent Students</CardTitle>
            <Link href="/students/new">
              <Button size="sm" data-testid="button-add-student">
                <Plus className="mr-2 h-4 w-4" />
                Add Student
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {studentsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : recentStudents?.data?.length ? (
              <div className="space-y-4">
                {recentStudents.data.slice(0, 5).map((student: any) => (
                  <div
                    key={student.id}
                    className="flex items-center justify-between rounded-lg border p-4"
                    data-testid={`card-student-${student.id}`}
                  >
                    <div>
                      <p className="font-medium">{student.firstName} {student.lastName}</p>
                      <p className="text-sm text-muted-foreground">
                        {student.studentId} - {student.grade || "N/A"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={getStatusVariant(student.status)}>
                        {student.status}
                      </Badge>
                      <Link href={`/students/${student.id}`}>
                        <Button size="icon" variant="ghost" data-testid={`button-view-student-${student.id}`}>
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-8 text-center text-muted-foreground">
                No students yet. Add your first student to get started.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
            <CardTitle className="text-base font-semibold">Upcoming Exams</CardTitle>
            <Link href="/exams/new">
              <Button size="sm" data-testid="button-schedule-exam">
                <Plus className="mr-2 h-4 w-4" />
                Schedule Exam
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {examsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : upcomingExams?.data?.length ? (
              <div className="space-y-4">
                {upcomingExams.data.slice(0, 4).map((exam: any) => (
                  <div
                    key={exam.id}
                    className="flex items-center justify-between rounded-lg border p-4"
                    data-testid={`card-exam-${exam.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
                        <FileText className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{exam.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {exam.examDate} - {exam.maxMarks} marks
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline">{exam.examType}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-8 text-center text-muted-foreground">
                No upcoming exams scheduled.
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
              <Link href="/students/new">
                <Button variant="outline" data-testid="button-enroll-student">
                  <Users className="mr-2 h-4 w-4" />
                  Enroll Student
                </Button>
              </Link>
              <Link href="/attendance">
                <Button variant="outline" data-testid="button-mark-attendance">
                  <ClipboardCheck className="mr-2 h-4 w-4" />
                  Mark Attendance
                </Button>
              </Link>
              <Link href="/fees/new">
                <Button variant="outline" data-testid="button-collect-fees">
                  <DollarSign className="mr-2 h-4 w-4" />
                  Collect Fees
                </Button>
              </Link>
              <Link href="/courses/new">
                <Button variant="outline" data-testid="button-add-course">
                  <BookOpen className="mr-2 h-4 w-4" />
                  Add Course
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
