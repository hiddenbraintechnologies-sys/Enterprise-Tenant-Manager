import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, parseISO, startOfWeek, endOfWeek, subWeeks } from "date-fns";
import { DashboardLayout } from "@/components/dashboard-layout";
import { useTenant } from "@/contexts/tenant-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
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
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Clock,
  Plus,
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  CheckCircle,
  XCircle,
  FileText,
  Timer,
  Check,
  X,
} from "lucide-react";
import { cn, getServicesApiBase } from "@/lib/utils";

interface Timesheet {
  id: string;
  employeeId: string;
  projectId: string;
  timesheetDate: string;
  hoursWorked: string;
  isBillable: boolean;
  description: string | null;
  taskDescription: string | null;
  status: "draft" | "submitted" | "approved" | "rejected";
  approvedBy: string | null;
  employee?: {
    firstName: string;
    lastName: string;
    employeeId: string;
  };
  project?: {
    projectCode: string;
    name: string;
  };
}

interface TimesheetResponse {
  data: Timesheet[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

function getPagination(response: TimesheetResponse | undefined) {
  if (!response) return { page: 1, limit: 10, total: 0, totalPages: 0 };
  return response.pagination || response.meta || { page: 1, limit: 10, total: 0, totalPages: 0 };
}

const timesheetFormSchema = z.object({
  employeeId: z.string().min(1, "Employee is required"),
  projectId: z.string().min(1, "Project is required"),
  timesheetDate: z.date({ required_error: "Date is required" }),
  hoursWorked: z.string().min(1, "Hours are required"),
  isBillable: z.boolean().default(true),
  description: z.string().optional(),
  taskDescription: z.string().optional(),
});

type TimesheetFormValues = z.infer<typeof timesheetFormSchema>;

function getStatusBadge(status: string) {
  const baseClasses = "text-xs";
  
  switch (status) {
    case "draft":
      return <Badge variant="secondary" className={baseClasses}>Draft</Badge>;
    case "submitted":
      return <Badge variant="outline" className={cn(baseClasses, "border-amber-500 text-amber-600 dark:text-amber-400")}>Submitted</Badge>;
    case "approved":
      return <Badge variant="outline" className={cn(baseClasses, "border-green-500 text-green-600 dark:text-green-400")}>Approved</Badge>;
    case "rejected":
      return <Badge variant="outline" className={cn(baseClasses, "border-red-500 text-red-600 dark:text-red-400")}>Rejected</Badge>;
    default:
      return <Badge variant="secondary" className={baseClasses}>{status}</Badge>;
  }
}

export default function HrTimesheets() {
  const { toast } = useToast();
  const { businessType } = useTenant();
  const [page, setPage] = useState(1);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [filters, setFilters] = useState({
    status: "all",
    startDate: format(startOfWeek(new Date()), "yyyy-MM-dd"),
    endDate: format(endOfWeek(new Date()), "yyyy-MM-dd"),
  });

  const apiBase = useMemo(() => getServicesApiBase(businessType), [businessType]);

  const { data: timesheetData, isLoading } = useQuery<TimesheetResponse>({
    queryKey: [`${apiBase}/timesheets`, page, filters],
  });

  const { data: employees } = useQuery<{ data: any[] }>({
    queryKey: ["/api/hr/employees", { limit: 100 }],
  });

  const { data: projects } = useQuery<{ data: any[] }>({
    queryKey: [`${apiBase}/projects`, { limit: 100, status: "active" }],
  });

  const form = useForm<TimesheetFormValues>({
    resolver: zodResolver(timesheetFormSchema),
    defaultValues: {
      employeeId: "",
      projectId: "",
      timesheetDate: new Date(),
      hoursWorked: "",
      isBillable: true,
      description: "",
      taskDescription: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: TimesheetFormValues) => {
      return apiRequest("POST", `${apiBase}/timesheets`, {
        ...data,
        timesheetDate: format(data.timesheetDate, "yyyy-MM-dd"),
        status: "draft",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`${apiBase}/timesheets`] });
      toast({ title: "Timesheet entry created successfully" });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (timesheetId: string) => {
      return apiRequest("PATCH", `${apiBase}/timesheets/${timesheetId}`, {
        status: "approved",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`${apiBase}/timesheets`] });
      toast({ title: "Timesheet approved" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (timesheetId: string) => {
      return apiRequest("PATCH", `${apiBase}/timesheets/${timesheetId}`, {
        status: "rejected",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`${apiBase}/timesheets`] });
      toast({ title: "Timesheet rejected" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  function onSubmit(data: TimesheetFormValues) {
    createMutation.mutate(data);
  }

  const stats = {
    draft: timesheetData?.data.filter(t => t.status === "draft").length || 0,
    submitted: timesheetData?.data.filter(t => t.status === "submitted").length || 0,
    approved: timesheetData?.data.filter(t => t.status === "approved").length || 0,
    totalHours: timesheetData?.data.reduce((sum, t) => sum + parseFloat(t.hoursWorked), 0) || 0,
  };

  return (
    <DashboardLayout title="Timesheets">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Timesheet Management</h1>
          <p className="text-muted-foreground">Track work hours and project time</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-log-time">
              <Plus className="mr-2 h-4 w-4" /> Log Time
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Log Time Entry</DialogTitle>
              <DialogDescription>Record hours worked on a project</DialogDescription>
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
                              {emp.firstName} {emp.lastName}
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
                  name="projectId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Project</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-project">
                            <SelectValue placeholder="Select project" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {projects?.data?.map((proj) => (
                            <SelectItem key={proj.id} value={proj.id}>
                              {proj.projectCode} - {proj.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="timesheetDate"
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
                                data-testid="button-date"
                              >
                                {field.value ? format(field.value, "MMM d") : "Pick date"}
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
                  <FormField
                    control={form.control}
                    name="hoursWorked"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hours</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.5" placeholder="8" {...field} data-testid="input-hours" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="taskDescription"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Task Description</FormLabel>
                      <FormControl>
                        <Textarea placeholder="What did you work on?" {...field} data-testid="input-task" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="isBillable"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Billable</FormLabel>
                        <p className="text-sm text-muted-foreground">
                          Mark as billable to client
                        </p>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-billable" />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-timesheet">
                    {createMutation.isPending ? "Logging..." : "Log Time"}
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
            <CardTitle className="text-sm font-medium">Draft</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-draft">{stats.draft}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Submitted</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-submitted">{stats.submitted}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-approved">{stats.approved}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
            <Timer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-total-hours">{stats.totalHours.toFixed(1)}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <CardTitle>Time Entries</CardTitle>
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
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
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
          ) : timesheetData?.data && timesheetData.data.length > 0 ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Hours</TableHead>
                    <TableHead>Task</TableHead>
                    <TableHead>Billable</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {timesheetData.data.map((entry) => (
                    <TableRow key={entry.id} data-testid={`row-timesheet-${entry.id}`}>
                      <TableCell>
                        <div className="font-medium">
                          {entry.employee?.firstName} {entry.employee?.lastName}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <span className="font-mono">{entry.project?.projectCode}</span>
                          <span className="text-muted-foreground ml-1">- {entry.project?.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>{format(parseISO(entry.timesheetDate), "MMM d, yyyy")}</TableCell>
                      <TableCell className="font-medium">{parseFloat(entry.hoursWorked).toFixed(1)} hrs</TableCell>
                      <TableCell>
                        <span className="max-w-[150px] truncate block text-sm">
                          {entry.taskDescription || "-"}
                        </span>
                      </TableCell>
                      <TableCell>
                        {entry.isBillable ? (
                          <Badge variant="secondary" className="text-xs">Billable</Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">No</span>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(entry.status)}</TableCell>
                      <TableCell>
                        {entry.status === "submitted" && (
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => approveMutation.mutate(entry.id)}
                              disabled={approveMutation.isPending}
                              data-testid={`button-approve-${entry.id}`}
                            >
                              <Check className="h-4 w-4 text-green-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => rejectMutation.mutate(entry.id)}
                              disabled={rejectMutation.isPending}
                              data-testid={`button-reject-${entry.id}`}
                            >
                              <X className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {getPagination(timesheetData).totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Page {getPagination(timesheetData).page} of {getPagination(timesheetData).totalPages}
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
                      disabled={page >= getPagination(timesheetData).totalPages}
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
              <p className="mt-2 text-muted-foreground">No time entries found</p>
              <p className="text-sm text-muted-foreground">Log your first time entry to get started</p>
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
