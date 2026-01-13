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
  Briefcase,
  Plus,
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Project {
  id: string;
  code: string | null;
  name: string;
  description: string | null;
  customerId: string | null;
  startDate: string | null;
  endDate: string | null;
  status: "draft" | "active" | "completed" | "on_hold" | "cancelled";
  billingModel: "time_and_materials" | "fixed_price" | "retainer" | "milestone";
  hourlyRate: string | null;
  fixedBudget: string | null;
  currency: string;
  estimatedHours: number | null;
}

interface ProjectResponse {
  data: Project[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const projectFormSchema = z.object({
  projectCode: z.string().min(1, "Engagement code is required"),
  name: z.string().min(1, "Engagement name is required"),
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
    case "draft":
      return <Badge variant="outline" className={cn(baseClasses, "border-gray-500 text-gray-600 dark:text-gray-400")}>Draft</Badge>;
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

export default function ConsultingProjects() {
  const [page, setPage] = useState(1);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { toast } = useToast();

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

  const { data: projectsData, isLoading } = useQuery<ProjectResponse>({
    queryKey: ["/api/services/consulting/projects", { page, limit: 10, status: statusFilter !== "all" ? statusFilter : undefined }],
  });

  const createProjectMutation = useMutation({
    mutationFn: async (data: ProjectFormValues) => {
      const payload = {
        ...data,
        code: data.projectCode,
        startDate: data.startDate ? format(data.startDate, "yyyy-MM-dd") : null,
        endDate: data.endDate ? format(data.endDate, "yyyy-MM-dd") : null,
        budget: data.budget ? parseFloat(data.budget) : null,
        hourlyRate: data.billingRate ? parseFloat(data.billingRate) : null,
      };
      return apiRequest("POST", "/api/services/consulting/projects", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services/consulting/projects"] });
      toast({
        title: "Engagement created",
        description: "The client engagement has been created successfully.",
      });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create engagement",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ProjectFormValues) => {
    createProjectMutation.mutate(data);
  };

  const projects = projectsData?.data ?? [];
  const pagination = projectsData?.meta;

  return (
    <DashboardLayout title="Engagements">
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">Client Engagements</h1>
            <p className="text-muted-foreground">Manage your consulting engagements</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-new-engagement">
                <Plus className="mr-2 h-4 w-4" />
                New Engagement
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Engagement</DialogTitle>
                <DialogDescription>
                  Add a new consulting engagement to track time and generate invoices.
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="projectCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Engagement Code</FormLabel>
                          <FormControl>
                            <Input placeholder="ENG-001" {...field} data-testid="input-engagement-code" />
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
                          <FormLabel>Engagement Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Engagement name" {...field} data-testid="input-engagement-name" />
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
                          <Input placeholder="Client company name" {...field} data-testid="input-client-name" />
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
                        <FormLabel>Scope Description</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Engagement scope and objectives..." {...field} data-testid="input-description" />
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
                                    "w-full pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                  )}
                                  data-testid="button-start-date"
                                >
                                  {field.value ? format(field.value, "PPP") : "Select date"}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                initialFocus
                              />
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
                                    "w-full pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                  )}
                                  data-testid="button-end-date"
                                >
                                  {field.value ? format(field.value, "PPP") : "Select date"}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                initialFocus
                              />
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
                          <FormLabel>Fee Estimate</FormLabel>
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
                          <FormLabel>Hourly Rate</FormLabel>
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
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Billable Engagement</FormLabel>
                          <div className="text-sm text-muted-foreground">
                            Time logged to this engagement can be invoiced to client
                          </div>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-billable"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createProjectMutation.isPending} data-testid="button-submit-engagement">
                      {createProjectMutation.isPending ? "Creating..." : "Create Engagement"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex items-center gap-4">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]" data-testid="select-status-filter">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="on_hold">On Hold</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Engagements
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-12 w-full" />
                  </div>
                ))}
              </div>
            ) : projects.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Briefcase className="h-12 w-12 text-muted-foreground/50" />
                <h3 className="mt-4 text-lg font-semibold">No engagements yet</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Create your first client engagement to start tracking time and billing.
                </p>
                <Button className="mt-4" onClick={() => setIsDialogOpen(true)} data-testid="button-create-first-engagement">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Engagement
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Engagement</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Timeline</TableHead>
                    <TableHead className="text-right">Fee</TableHead>
                    <TableHead className="text-right">Rate/hr</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projects.map((project) => (
                    <TableRow key={project.id} data-testid={`row-engagement-${project.id}`}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{project.name}</p>
                          <p className="text-sm text-muted-foreground">{project.code || "-"}</p>
                        </div>
                      </TableCell>
                      <TableCell>{project.customerId || "-"}</TableCell>
                      <TableCell>{getStatusBadge(project.status)}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {project.startDate ? format(parseISO(project.startDate), "MMM d, yyyy") : "-"}
                          {project.endDate && (
                            <>
                              <span className="text-muted-foreground"> - </span>
                              {format(parseISO(project.endDate), "MMM d, yyyy")}
                            </>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(project.fixedBudget, project.currency)}
                      </TableCell>
                      <TableCell className="text-right">
                        {project.hourlyRate ? formatCurrency(project.hourlyRate, project.currency) : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-between border-t pt-4 mt-4">
                <p className="text-sm text-muted-foreground">
                  Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
                  {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} engagements
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
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={page >= pagination.totalPages}
                    data-testid="button-next-page"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
