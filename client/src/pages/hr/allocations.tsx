import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, parseISO } from "date-fns";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
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
  Users,
  Plus,
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Percent,
  FolderKanban,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Allocation {
  id: string;
  employeeId: string;
  projectId: string;
  allocationPercentage: number;
  startDate: string;
  endDate: string | null;
  isBillable: boolean;
  role: string | null;
  notes: string | null;
  employee?: {
    firstName: string;
    lastName: string;
    employeeId: string;
    designation: string | null;
  };
  project?: {
    projectCode: string;
    name: string;
  };
}

interface AllocationResponse {
  data: Allocation[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const allocationFormSchema = z.object({
  employeeId: z.string().min(1, "Employee is required"),
  projectId: z.string().min(1, "Project is required"),
  allocationPercentage: z.number().min(1).max(100),
  startDate: z.date({ required_error: "Start date is required" }),
  endDate: z.date().optional(),
  isBillable: z.boolean().default(true),
  role: z.string().optional(),
  notes: z.string().optional(),
});

type AllocationFormValues = z.infer<typeof allocationFormSchema>;

function getPercentageBadge(percentage: number) {
  const baseClasses = "text-xs";
  
  if (percentage === 100) {
    return <Badge variant="outline" className={cn(baseClasses, "border-green-500 text-green-600 dark:text-green-400")}>100%</Badge>;
  } else if (percentage >= 50) {
    return <Badge variant="outline" className={cn(baseClasses, "border-blue-500 text-blue-600 dark:text-blue-400")}>{percentage}%</Badge>;
  } else {
    return <Badge variant="secondary" className={baseClasses}>{percentage}%</Badge>;
  }
}

export default function HrAllocations() {
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: allocationsData, isLoading } = useQuery<AllocationResponse>({
    queryKey: ["/api/hr/allocations", page],
  });

  const { data: employees } = useQuery<{ data: any[] }>({
    queryKey: ["/api/hr/employees", { limit: 100 }],
  });

  const { data: projects } = useQuery<{ data: any[] }>({
    queryKey: ["/api/hr/projects", { limit: 100 }],
  });

  const form = useForm<AllocationFormValues>({
    resolver: zodResolver(allocationFormSchema),
    defaultValues: {
      employeeId: "",
      projectId: "",
      allocationPercentage: 100,
      isBillable: true,
      role: "",
      notes: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: AllocationFormValues) => {
      return apiRequest("POST", "/api/hr/allocations", {
        ...data,
        startDate: format(data.startDate, "yyyy-MM-dd"),
        endDate: data.endDate ? format(data.endDate, "yyyy-MM-dd") : null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hr/allocations"] });
      toast({ title: "Allocation created successfully" });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  function onSubmit(data: AllocationFormValues) {
    createMutation.mutate(data);
  }

  const allocationPercentage = form.watch("allocationPercentage");

  const stats = {
    totalAllocations: allocationsData?.pagination.total || 0,
    fullTimeAllocations: allocationsData?.data.filter(a => a.allocationPercentage === 100).length || 0,
    activeEmployees: new Set(allocationsData?.data.map(a => a.employeeId)).size || 0,
    activeProjects: new Set(allocationsData?.data.map(a => a.projectId)).size || 0,
  };

  return (
    <DashboardLayout title="Allocations">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Resource Allocations</h1>
          <p className="text-muted-foreground">Assign employees to projects</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-new-allocation">
              <Plus className="mr-2 h-4 w-4" /> New Allocation
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create Allocation</DialogTitle>
              <DialogDescription>Assign an employee to a project</DialogDescription>
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
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role on Project</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Developer, Designer, Lead" {...field} data-testid="input-role" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="allocationPercentage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Allocation Percentage: {allocationPercentage}%</FormLabel>
                      <FormControl>
                        <Slider
                          min={10}
                          max={100}
                          step={10}
                          value={[field.value]}
                          onValueChange={(values) => field.onChange(values[0])}
                          data-testid="slider-percentage"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Start Date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  "pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                                data-testid="button-start-date"
                              >
                                {field.value ? format(field.value, "MMM d") : "Start"}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar mode="single" selected={field.value} onSelect={field.onChange} />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="endDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>End Date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  "pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                                data-testid="button-end-date"
                              >
                                {field.value ? format(field.value, "MMM d") : "End"}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar mode="single" selected={field.value} onSelect={field.onChange} />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="isBillable"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Billable</FormLabel>
                        <p className="text-sm text-muted-foreground">
                          This allocation is billable to client
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
                  <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-allocation">
                    {createMutation.isPending ? "Creating..." : "Create Allocation"}
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
            <CardTitle className="text-sm font-medium">Total Allocations</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-total">{stats.totalAllocations}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Full-time (100%)</CardTitle>
            <Percent className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-fulltime">{stats.fullTimeAllocations}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Employees</CardTitle>
            <User className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-employees">{stats.activeEmployees}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
            <FolderKanban className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-projects">{stats.activeProjects}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Resource Allocations</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : allocationsData?.data && allocationsData.data.length > 0 ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Allocation</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Billable</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allocationsData.data.map((allocation) => (
                    <TableRow key={allocation.id} data-testid={`row-allocation-${allocation.id}`}>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {allocation.employee?.firstName} {allocation.employee?.lastName}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {allocation.employee?.designation || allocation.employee?.employeeId}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <span className="font-mono">{allocation.project?.projectCode}</span>
                          <span className="text-muted-foreground ml-1">- {allocation.project?.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>{allocation.role || "-"}</TableCell>
                      <TableCell>{getPercentageBadge(allocation.allocationPercentage)}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {format(parseISO(allocation.startDate), "MMM d, yyyy")}
                          {allocation.endDate && (
                            <span className="text-muted-foreground">
                              {" "}to {format(parseISO(allocation.endDate), "MMM d, yyyy")}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {allocation.isBillable ? (
                          <Badge variant="secondary" className="text-xs">Billable</Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">No</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {allocationsData.pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Page {allocationsData.pagination.page} of {allocationsData.pagination.totalPages}
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
                      disabled={page >= allocationsData.pagination.totalPages}
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
              <Users className="h-12 w-12 text-muted-foreground/50" />
              <p className="mt-2 text-muted-foreground">No allocations found</p>
              <p className="text-sm text-muted-foreground">Assign employees to projects to get started</p>
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
