import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, parseISO } from "date-fns";
import { DashboardLayout } from "@/components/dashboard-layout";
import { useTenant } from "@/contexts/tenant-context";
import { getServicesApiBase } from "@/lib/utils";
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
  FolderKanban,
  Plus,
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Users,
  DollarSign,
  CheckCircle,
  Clock,
  Pause,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Project {
  id: string;
  projectCode: string;
  name: string;
  description: string | null;
  clientName: string | null;
  startDate: string | null;
  endDate: string | null;
  status: "active" | "completed" | "on_hold" | "cancelled";
  budget: string | null;
  currency: string;
  isBillable: boolean;
  billingRate: string | null;
}

interface ProjectResponse {
  data: Project[];
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

function getPagination(response: ProjectResponse | undefined) {
  if (!response) return { page: 1, limit: 10, total: 0, totalPages: 0 };
  return response.pagination || response.meta || { page: 1, limit: 10, total: 0, totalPages: 0 };
}

const projectFormSchema = z.object({
  projectCode: z.string().min(1, "Project code is required"),
  name: z.string().min(1, "Project name is required"),
  description: z.string().optional(),
  clientName: z.string().optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  budget: z.string().optional(),
  isBillable: z.boolean().default(true),
  billingRate: z.string().optional(),
});

type ProjectFormValues = z.infer<typeof projectFormSchema>;

function getStatusBadge(status: string) {
  const baseClasses = "text-xs";
  
  switch (status) {
    case "active":
      return <Badge variant="outline" className={cn(baseClasses, "border-green-500 text-green-600 dark:text-green-400")}>Active</Badge>;
    case "completed":
      return <Badge variant="outline" className={cn(baseClasses, "border-blue-500 text-blue-600 dark:text-blue-400")}>Completed</Badge>;
    case "on_hold":
      return <Badge variant="outline" className={cn(baseClasses, "border-amber-500 text-amber-600 dark:text-amber-400")}>On Hold</Badge>;
    case "cancelled":
      return <Badge variant="outline" className={cn(baseClasses, "border-red-500 text-red-600 dark:text-red-400")}>Cancelled</Badge>;
    default:
      return <Badge variant="secondary" className={baseClasses}>{status}</Badge>;
  }
}

function formatCurrency(amount: string | number | null, currency: string = "INR") {
  if (!amount) return "-";
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

export default function HrProjects() {
  const { toast } = useToast();
  const { businessType } = useTenant();
  const [page, setPage] = useState(1);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [filters, setFilters] = useState({
    status: "all",
  });

  const apiBase = useMemo(() => getServicesApiBase(businessType), [businessType]);

  const { data: projectsData, isLoading } = useQuery<ProjectResponse>({
    queryKey: [`${apiBase}/projects`, page, filters],
  });

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      projectCode: "",
      name: "",
      description: "",
      clientName: "",
      budget: "",
      isBillable: true,
      billingRate: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: ProjectFormValues) => {
      return apiRequest("POST", `${apiBase}/projects`, {
        ...data,
        startDate: data.startDate ? format(data.startDate, "yyyy-MM-dd") : null,
        endDate: data.endDate ? format(data.endDate, "yyyy-MM-dd") : null,
        status: "active",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`${apiBase}/projects`] });
      toast({ title: "Project created successfully" });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  function onSubmit(data: ProjectFormValues) {
    createMutation.mutate(data);
  }

  const stats = {
    active: projectsData?.data.filter(p => p.status === "active").length || 0,
    completed: projectsData?.data.filter(p => p.status === "completed").length || 0,
    onHold: projectsData?.data.filter(p => p.status === "on_hold").length || 0,
    total: getPagination(projectsData).total,
  };

  return (
    <DashboardLayout title="Projects">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Project Management</h1>
          <p className="text-muted-foreground">Manage projects and track allocations</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-new-project">
              <Plus className="mr-2 h-4 w-4" /> New Project
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Project</DialogTitle>
              <DialogDescription>Add a new project to track work and allocations</DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="projectCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Project Code</FormLabel>
                        <FormControl>
                          <Input placeholder="PRJ-001" {...field} data-testid="input-project-code" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Project Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Project name" {...field} data-testid="input-project-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="clientName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Client Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Client name (optional)" {...field} data-testid="input-client-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Project description" {...field} data-testid="input-description" />
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
                                {field.value ? format(field.value, "MMM d, yyyy") : "Pick date"}
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
                                {field.value ? format(field.value, "MMM d, yyyy") : "Pick date"}
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
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="budget"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Budget</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="0" {...field} data-testid="input-budget" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="billingRate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Billing Rate (per hr)</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="0" {...field} data-testid="input-billing-rate" />
                        </FormControl>
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
                        <FormLabel>Billable Project</FormLabel>
                        <p className="text-sm text-muted-foreground">
                          Track billable hours for this project
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
                  <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-project">
                    {createMutation.isPending ? "Creating..." : "Create Project"}
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
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-active">{stats.active}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-completed">{stats.completed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">On Hold</CardTitle>
            <Pause className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-on-hold">{stats.onHold}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
            <FolderKanban className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-total">{stats.total}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <CardTitle>Projects</CardTitle>
            <Select
              value={filters.status}
              onValueChange={(value) => setFilters({ ...filters, status: value })}
            >
              <SelectTrigger className="w-32" data-testid="filter-status">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="on_hold">On Hold</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : projectsData?.data && projectsData.data.length > 0 ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Project Name</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Budget</TableHead>
                    <TableHead>Billable</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projectsData.data.map((project) => (
                    <TableRow key={project.id} data-testid={`row-project-${project.id}`}>
                      <TableCell className="font-mono text-sm">{project.projectCode}</TableCell>
                      <TableCell>
                        <div className="font-medium">{project.name}</div>
                        {project.description && (
                          <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {project.description}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>{project.clientName || "-"}</TableCell>
                      <TableCell>
                        {project.startDate ? (
                          <div className="text-sm">
                            {format(parseISO(project.startDate), "MMM d")}
                            {project.endDate && ` - ${format(parseISO(project.endDate), "MMM d, yyyy")}`}
                          </div>
                        ) : "-"}
                      </TableCell>
                      <TableCell>{formatCurrency(project.budget, project.currency)}</TableCell>
                      <TableCell>
                        {project.isBillable ? (
                          <Badge variant="secondary" className="text-xs">Billable</Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">Non-billable</span>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(project.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {getPagination(projectsData).totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Page {getPagination(projectsData).page} of {getPagination(projectsData).totalPages}
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
                      disabled={page >= getPagination(projectsData).totalPages}
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
              <FolderKanban className="h-12 w-12 text-muted-foreground/50" />
              <p className="mt-2 text-muted-foreground">No projects found</p>
              <p className="text-sm text-muted-foreground">Create a project to get started</p>
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
