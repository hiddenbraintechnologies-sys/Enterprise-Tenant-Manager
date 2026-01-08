import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, subDays, parseISO, isAfter, isBefore } from "date-fns";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Clock,
  Calendar as CalendarIcon,
  LogIn,
  LogOut,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
  Users,
  CheckCircle,
  XCircle,
  MinusCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AttendanceRecord {
  id: string;
  employeeId: string;
  attendanceDate: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  status: "present" | "absent" | "half_day" | "on_leave" | "holiday" | "weekend";
  isLateArrival: boolean;
  isEarlyDeparture: boolean;
  workHours: string | null;
  overtimeHours: string | null;
  notes: string | null;
  isManualEntry: boolean;
  employee?: {
    firstName: string;
    lastName: string;
    employeeId: string;
    designation: string | null;
  };
}

interface AttendanceResponse {
  data: AttendanceRecord[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const attendanceFormSchema = z.object({
  employeeId: z.string().min(1, "Employee is required"),
  attendanceDate: z.date({ required_error: "Date is required" }),
  checkInTime: z.string().optional(),
  checkOutTime: z.string().optional(),
  status: z.enum(["present", "absent", "half_day", "on_leave", "holiday", "weekend"]),
  notes: z.string().optional(),
});

type AttendanceFormValues = z.infer<typeof attendanceFormSchema>;

function getStatusBadge(status: string, isLate: boolean, isEarly: boolean) {
  const baseClasses = "text-xs";
  
  switch (status) {
    case "present":
      if (isLate && isEarly) {
        return <Badge variant="outline" className={cn(baseClasses, "border-amber-500 text-amber-600 dark:text-amber-400")}>Late & Early</Badge>;
      }
      if (isLate) {
        return <Badge variant="outline" className={cn(baseClasses, "border-amber-500 text-amber-600 dark:text-amber-400")}>Late</Badge>;
      }
      if (isEarly) {
        return <Badge variant="outline" className={cn(baseClasses, "border-amber-500 text-amber-600 dark:text-amber-400")}>Early Out</Badge>;
      }
      return <Badge variant="outline" className={cn(baseClasses, "border-green-500 text-green-600 dark:text-green-400")}>Present</Badge>;
    case "absent":
      return <Badge variant="outline" className={cn(baseClasses, "border-red-500 text-red-600 dark:text-red-400")}>Absent</Badge>;
    case "half_day":
      return <Badge variant="outline" className={cn(baseClasses, "border-yellow-500 text-yellow-600 dark:text-yellow-400")}>Half Day</Badge>;
    case "on_leave":
      return <Badge variant="outline" className={cn(baseClasses, "border-blue-500 text-blue-600 dark:text-blue-400")}>On Leave</Badge>;
    case "holiday":
      return <Badge variant="outline" className={cn(baseClasses, "border-purple-500 text-purple-600 dark:text-purple-400")}>Holiday</Badge>;
    case "weekend":
      return <Badge variant="secondary" className={baseClasses}>Weekend</Badge>;
    default:
      return <Badge variant="secondary" className={baseClasses}>{status}</Badge>;
  }
}

export default function HrAttendance() {
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [filters, setFilters] = useState({
    employeeId: "",
    status: "all",
    startDate: format(subDays(new Date(), 30), "yyyy-MM-dd"),
    endDate: format(new Date(), "yyyy-MM-dd"),
  });

  const queryParams = new URLSearchParams({
    page: page.toString(),
    limit: "20",
    ...(filters.employeeId && { employeeId: filters.employeeId }),
    ...(filters.status !== "all" && { status: filters.status }),
    ...(filters.startDate && { startDate: filters.startDate }),
    ...(filters.endDate && { endDate: filters.endDate }),
  });

  const { data: attendanceData, isLoading } = useQuery<AttendanceResponse>({
    queryKey: ["/api/hr/attendance", page, filters],
  });

  const { data: employees } = useQuery<{ data: any[] }>({
    queryKey: ["/api/hr/employees", { limit: 100 }],
  });

  const form = useForm<AttendanceFormValues>({
    resolver: zodResolver(attendanceFormSchema),
    defaultValues: {
      employeeId: "",
      attendanceDate: new Date(),
      checkInTime: "",
      checkOutTime: "",
      status: "present",
      notes: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: AttendanceFormValues) => {
      return apiRequest("POST", "/api/hr/attendance", {
        ...data,
        attendanceDate: format(data.attendanceDate, "yyyy-MM-dd"),
        isManualEntry: true,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hr/attendance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/hr/dashboard"] });
      toast({ title: "Attendance recorded successfully" });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const checkInMutation = useMutation({
    mutationFn: async (employeeId: string) => {
      return apiRequest("POST", "/api/hr/attendance", {
        employeeId,
        attendanceDate: format(new Date(), "yyyy-MM-dd"),
        checkInTime: format(new Date(), "HH:mm:ss"),
        status: "present",
        isManualEntry: false,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hr/attendance"] });
      toast({ title: "Checked in successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const checkOutMutation = useMutation({
    mutationFn: async (attendanceId: string) => {
      return apiRequest("PATCH", `/api/hr/attendance/${attendanceId}`, {
        checkOutTime: format(new Date(), "HH:mm:ss"),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hr/attendance"] });
      toast({ title: "Checked out successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  function onSubmit(data: AttendanceFormValues) {
    createMutation.mutate(data);
  }

  const stats = {
    present: attendanceData?.data.filter(a => a.status === "present").length || 0,
    absent: attendanceData?.data.filter(a => a.status === "absent").length || 0,
    late: attendanceData?.data.filter(a => a.isLateArrival).length || 0,
    onLeave: attendanceData?.data.filter(a => a.status === "on_leave").length || 0,
  };

  return (
    <DashboardLayout title="Attendance Management">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Attendance Management</h1>
          <p className="text-muted-foreground">Track and manage employee attendance</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-record-attendance">
              <Clock className="mr-2 h-4 w-4" /> Record Attendance
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Record Attendance</DialogTitle>
              <DialogDescription>Manually record attendance for an employee</DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="employeeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Employee</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-employee">
                            <SelectValue placeholder="Select employee" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {employees?.data?.map((emp) => (
                            <SelectItem key={emp.id} value={emp.id}>
                              {emp.firstName} {emp.lastName} ({emp.employeeId})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="attendanceDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                              data-testid="button-select-date"
                            >
                              {field.value ? format(field.value, "PPP") : "Pick a date"}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date > new Date()}
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="checkInTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Check-in Time</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} data-testid="input-check-in-time" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="checkOutTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Check-out Time</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} data-testid="input-check-out-time" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-status">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="present">Present</SelectItem>
                          <SelectItem value="absent">Absent</SelectItem>
                          <SelectItem value="half_day">Half Day</SelectItem>
                          <SelectItem value="on_leave">On Leave</SelectItem>
                          <SelectItem value="holiday">Holiday</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Optional notes" data-testid="input-notes" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-attendance">
                    {createMutation.isPending ? "Recording..." : "Record Attendance"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Present Today</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-present">{stats.present}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Absent</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-absent">{stats.absent}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Late Arrivals</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-late">{stats.late}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">On Leave</CardTitle>
            <MinusCircle className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-on-leave">{stats.onLeave}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <CardTitle>Attendance Records</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                className="w-40"
                data-testid="input-start-date"
              />
              <span className="text-muted-foreground">to</span>
              <Input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                className="w-40"
                data-testid="input-end-date"
              />
              <Select
                value={filters.status}
                onValueChange={(value) => setFilters({ ...filters, status: value })}
              >
                <SelectTrigger className="w-32" data-testid="filter-status">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="present">Present</SelectItem>
                  <SelectItem value="absent">Absent</SelectItem>
                  <SelectItem value="half_day">Half Day</SelectItem>
                  <SelectItem value="on_leave">On Leave</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : attendanceData?.data && attendanceData.data.length > 0 ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Check-in</TableHead>
                    <TableHead>Check-out</TableHead>
                    <TableHead>Work Hours</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendanceData.data.map((record) => (
                    <TableRow key={record.id} data-testid={`row-attendance-${record.id}`}>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {record.employee?.firstName} {record.employee?.lastName}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {record.employee?.employeeId}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{format(parseISO(record.attendanceDate), "MMM d, yyyy")}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {record.checkInTime || "-"}
                          {record.isLateArrival && (
                            <AlertTriangle className="h-3 w-3 text-amber-500" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {record.checkOutTime || "-"}
                          {record.isEarlyDeparture && (
                            <AlertTriangle className="h-3 w-3 text-amber-500" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{record.workHours ? `${record.workHours} hrs` : "-"}</TableCell>
                      <TableCell>
                        {getStatusBadge(record.status, record.isLateArrival, record.isEarlyDeparture)}
                      </TableCell>
                      <TableCell>
                        {record.status === "present" && !record.checkOutTime && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => checkOutMutation.mutate(record.id)}
                            disabled={checkOutMutation.isPending}
                            data-testid={`button-checkout-${record.id}`}
                          >
                            <LogOut className="h-4 w-4 mr-1" /> Check Out
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {attendanceData.pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Page {attendanceData.pagination.page} of {attendanceData.pagination.totalPages}
                    {" "}({attendanceData.pagination.total} total records)
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      data-testid="button-prev-page"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => p + 1)}
                      disabled={page >= attendanceData.pagination.totalPages}
                      data-testid="button-next-page"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Clock className="h-12 w-12 text-muted-foreground/50" />
              <p className="mt-2 text-muted-foreground">No attendance records found</p>
              <p className="text-sm text-muted-foreground">Try adjusting your date range or filters</p>
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
