import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  ArrowLeft, 
  Calendar,
  Clock,
  User,
  LogOut,
  CheckCircle2,
  XCircle,
  MinusCircle
} from "lucide-react";

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  designation: string;
}

interface AttendanceRecord {
  id: string;
  attendanceDate: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  status: string;
  workHours: string | null;
  overtimeHours: string | null;
  isLateArrival: boolean;
  notes: string | null;
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: any }> = {
  present: { label: "Present", variant: "default", icon: CheckCircle2 },
  absent: { label: "Absent", variant: "destructive", icon: XCircle },
  half_day: { label: "Half Day", variant: "secondary", icon: MinusCircle },
  on_leave: { label: "On Leave", variant: "outline", icon: Calendar },
  holiday: { label: "Holiday", variant: "secondary", icon: Calendar },
  weekend: { label: "Weekend", variant: "outline", icon: Calendar },
};

export default function EmployeeAttendance() {
  const [, setLocation] = useLocation();
  const [employee, setEmployee] = useState<Employee | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("employee_portal_user");
    if (stored) {
      setEmployee(JSON.parse(stored));
    } else {
      setLocation("/employee/login");
    }
  }, [setLocation]);

  const { data: attendance, isLoading } = useQuery<AttendanceRecord[]>({
    queryKey: ["/api/employee-portal/attendance"],
    enabled: !!employee,
  });

  const handleLogout = async () => {
    try {
      await fetch("/api/employee-portal/logout", {
        method: "POST",
        credentials: "include",
      });
      localStorage.removeItem("employee_portal_user");
      setLocation("/employee/login");
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  if (!employee) {
    return null;
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { 
      weekday: "short", 
      year: "numeric", 
      month: "short", 
      day: "numeric" 
    });
  };

  const formatTime = (timeStr: string | null) => {
    if (!timeStr) return "-";
    return timeStr.substring(0, 5);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium" data-testid="text-employee-name">
                {employee.firstName} {employee.lastName}
              </p>
              <p className="text-sm text-muted-foreground">{employee.designation}</p>
            </div>
          </div>
          <Button variant="ghost" onClick={handleLogout} data-testid="button-logout">
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" onClick={() => setLocation("/employee/payslips")} data-testid="button-back">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Payslips
          </Button>
        </div>

        <div className="mb-6">
          <h1 className="text-2xl font-bold" data-testid="text-page-title">My Attendance</h1>
          <p className="text-muted-foreground">View your attendance records for the last 2 months</p>
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : attendance && attendance.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Check In</TableHead>
                    <TableHead>Check Out</TableHead>
                    <TableHead>Work Hours</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendance.map((record) => {
                    const status = statusConfig[record.status] || statusConfig.present;
                    const StatusIcon = status.icon;
                    return (
                      <TableRow key={record.id} data-testid={`row-attendance-${record.id}`}>
                        <TableCell className="font-medium">
                          {formatDate(record.attendanceDate)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={status.variant} className="flex items-center gap-1 w-fit">
                            <StatusIcon className="h-3 w-3" />
                            {status.label}
                          </Badge>
                          {record.isLateArrival && (
                            <Badge variant="outline" className="ml-1 text-xs">Late</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            {formatTime(record.checkInTime)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            {formatTime(record.checkOutTime)}
                          </div>
                        </TableCell>
                        <TableCell>
                          {record.workHours ? `${parseFloat(record.workHours).toFixed(1)}h` : "-"}
                          {record.overtimeHours && parseFloat(record.overtimeHours) > 0 && (
                            <span className="text-muted-foreground text-xs ml-1">
                              (+{parseFloat(record.overtimeHours).toFixed(1)}h OT)
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {record.notes || "-"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="flex flex-col items-center justify-center py-12">
                <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                <CardTitle className="text-xl mb-2">No Attendance Records</CardTitle>
                <CardDescription>Your attendance records will appear here.</CardDescription>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
