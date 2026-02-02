import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { EmployeeActionsMenu } from "@/components/hr/employee-actions-menu";
import { useEmployeePermissions } from "@/hooks/use-employee-permissions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Users,
  Plus,
  Search,
  Mail,
  Phone,
  Calendar,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface Employee {
  id: string;
  tenantId: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  departmentId: string | null;
  designation: string | null;
  joinDate: string;
  status: string;
  employmentType: string;
  createdAt: string;
}

interface EmployeesResponse {
  data: Employee[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const employeeFormSchema = z.object({
  employeeId: z.string().min(1, "Employee code is required"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().optional(),
  designation: z.string().optional(),
  departmentId: z.string().optional(),
  joinDate: z.string().min(1, "Joining date is required"),
  employmentType: z.enum(["full_time", "part_time", "contract", "intern"]),
});

type EmployeeFormValues = z.infer<typeof employeeFormSchema>;

function getStatusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "active":
      return "default";
    case "probation":
      return "secondary";
    case "on_hold":
    case "exited":
      return "destructive";
    default:
      return "outline";
  }
}

function formatStatus(status: string): string {
  switch (status) {
    case "active": return "Active";
    case "probation": return "Probation";
    case "on_hold": return "On Hold";
    case "exited": return "Exited";
    default: return status;
  }
}

export default function EmployeesPage() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [deleteEmployee, setDeleteEmployee] = useState<Employee | null>(null);
  const [deactivateEmployee, setDeactivateEmployee] = useState<Employee | null>(null);

  const createForm = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeFormSchema),
    defaultValues: {
      employeeId: "",
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      designation: "",
      departmentId: "",
      joinDate: new Date().toISOString().split("T")[0],
      employmentType: "full_time",
    },
  });

  const editForm = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeFormSchema),
    defaultValues: {
      employeeId: "",
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      designation: "",
      departmentId: "",
      joinDate: "",
      employmentType: "full_time",
    },
  });

  const { data: employees, isLoading } = useQuery<EmployeesResponse>({
    queryKey: ["/api/hr/employees", { page, limit: 10, status: statusFilter !== "all" ? statusFilter : undefined }],
  });

  const { data: departments } = useQuery<any[]>({
    queryKey: ["/api/hr/departments"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: EmployeeFormValues) => {
      return apiRequest("POST", "/api/hr/employees", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hr/employees"] });
      queryClient.invalidateQueries({ queryKey: ["/api/hr/dashboard"] });
      toast({ title: "Employee created successfully" });
      setIsCreateDialogOpen(false);
      createForm.reset();
    },
    onError: (error: any) => {
      handleMutationError(error, "create");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: EmployeeFormValues }) => {
      return apiRequest("PUT", `/api/hr/employees/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hr/employees"] });
      queryClient.invalidateQueries({ queryKey: ["/api/hr/dashboard"] });
      toast({ title: "Employee updated" });
      setIsEditDialogOpen(false);
      setEditingEmployee(null);
      editForm.reset();
    },
    onError: (error: any) => {
      handleMutationError(error, "update");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/hr/employees/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hr/employees"] });
      queryClient.invalidateQueries({ queryKey: ["/api/hr/dashboard"] });
      toast({ title: "Employee deleted" });
      setDeleteEmployee(null);
    },
    onError: (error: any) => {
      handleMutationError(error, "delete");
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("PUT", `/api/hr/employees/${id}`, { status: "exited" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hr/employees"] });
      queryClient.invalidateQueries({ queryKey: ["/api/hr/dashboard"] });
      toast({ title: "Employee deactivated" });
      setDeactivateEmployee(null);
    },
    onError: (error: any) => {
      handleMutationError(error, "deactivate");
    },
  });

  function handleMutationError(error: any, action: string) {
    let errorMessage = `Failed to ${action} employee. Please try again.`;
    try {
      if (error.message) {
        const parsed = JSON.parse(error.message);
        if (parsed.details && Array.isArray(parsed.details)) {
          const fieldErrors = parsed.details.map((d: any) => {
            const field = d.path?.[0] || "Field";
            const fieldName = field === "employeeId" ? "Employee Code" : 
                             field === "joinDate" ? "Joining Date" :
                             field.charAt(0).toUpperCase() + field.slice(1).replace(/([A-Z])/g, ' $1');
            return `${fieldName}: ${d.message}`;
          });
          errorMessage = fieldErrors.join(", ");
        } else if (parsed.error) {
          errorMessage = parsed.error;
        }
      }
    } catch {
      if (error.message && !error.message.includes("{")) {
        errorMessage = error.message;
      }
    }
    toast({ 
      title: `Failed to ${action} employee`, 
      description: errorMessage, 
      variant: "destructive" 
    });
  }

  const openEditDialog = (emp: Employee) => {
    setEditingEmployee(emp);
    editForm.reset({
      employeeId: emp.employeeId,
      firstName: emp.firstName,
      lastName: emp.lastName,
      email: emp.email,
      phone: emp.phone || "",
      designation: emp.designation || "",
      departmentId: emp.departmentId || "",
      joinDate: emp.joinDate?.split("T")[0] || "",
      employmentType: emp.employmentType as any || "full_time",
    });
    setIsEditDialogOpen(true);
  };

  const onCreateSubmit = (data: EmployeeFormValues) => {
    createMutation.mutate(data);
  };

  const onEditSubmit = (data: EmployeeFormValues) => {
    if (!editingEmployee) return;
    updateMutation.mutate({ id: editingEmployee.id, data });
  };

  const handleCardClick = (emp: Employee, e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('[data-menu-trigger]') || target.closest('[role="menu"]')) {
      return;
    }
    navigate(`/hr/employees/${emp.id}`);
  };

  const filteredEmployees = employees?.data?.filter((emp) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      emp.firstName.toLowerCase().includes(search) ||
      emp.lastName.toLowerCase().includes(search) ||
      emp.email.toLowerCase().includes(search) ||
      emp.employeeId.toLowerCase().includes(search)
    );
  });

  const renderEmployeeForm = (
    form: ReturnType<typeof useForm<EmployeeFormValues>>,
    onSubmit: (data: EmployeeFormValues) => void,
    isPending: boolean,
    submitLabel: string
  ) => (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="employeeId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Employee Code</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="EMP001" data-testid="input-employee-code" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="employmentType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Employment Type</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger data-testid="select-employment-type">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="full_time">Full Time</SelectItem>
                    <SelectItem value="part_time">Part Time</SelectItem>
                    <SelectItem value="contract">Contract</SelectItem>
                    <SelectItem value="intern">Intern</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>First Name</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="John" data-testid="input-first-name" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="lastName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Last Name</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Doe" data-testid="input-last-name" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input {...field} type="email" placeholder="john.doe@company.com" data-testid="input-email" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="+1234567890" data-testid="input-phone" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="joinDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Joining Date</FormLabel>
                <FormControl>
                  <Input {...field} type="date" data-testid="input-joining-date" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="designation"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Designation</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Software Engineer" data-testid="input-designation" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {departments && departments.length > 0 && (
          <FormField
            control={form.control}
            name="departmentId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Department</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger data-testid="select-department">
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {departments.map((dept: any) => (
                      <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={() => {
            setIsCreateDialogOpen(false);
            setIsEditDialogOpen(false);
          }}>
            Cancel
          </Button>
          <Button type="submit" disabled={isPending} data-testid="button-submit-employee">
            {isPending ? "Saving..." : submitLabel}
          </Button>
        </div>
      </form>
    </Form>
  );

  return (
    <DashboardLayout 
      title="Employee Directory" 
      breadcrumbs={[
        { label: "HR Management", href: "/hr" },
        { label: "Employees" },
      ]}
    >
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search employees..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 w-full sm:w-64"
              data-testid="input-search-employees"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-40" data-testid="select-status-filter">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="probation">Probation</SelectItem>
              <SelectItem value="on_hold">On Hold</SelectItem>
              <SelectItem value="exited">Exited</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-employee">
              <Plus className="mr-2 h-4 w-4" /> Add Employee
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Add New Employee</DialogTitle>
              <DialogDescription>
                Enter the employee details below.
              </DialogDescription>
            </DialogHeader>
            {renderEmployeeForm(createForm, onCreateSubmit, createMutation.isPending, "Create Employee")}
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-24 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredEmployees?.length ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredEmployees.map((emp) => (
              <Card 
                key={emp.id} 
                className="hover-elevate cursor-pointer relative" 
                data-testid={`card-employee-${emp.id}`}
                onClick={(e) => handleCardClick(emp, e)}
              >
                <CardContent className="p-6">
                  <div className="absolute top-2 right-2" onClick={(e) => e.stopPropagation()}>
                    <EmployeeActionsMenu
                      canView={true}
                      canEdit={true}
                      canDeactivate={emp.status !== "exited"}
                      canDelete={true}
                      onView={() => navigate(`/hr/employees/${emp.id}`)}
                      onEdit={() => openEditDialog(emp)}
                      onDeactivate={() => setDeactivateEmployee(emp)}
                      onDelete={() => setDeleteEmployee(emp)}
                    />
                  </div>
                  <div className="flex items-start gap-4 pr-8">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-lg flex-shrink-0">
                      {emp.firstName[0]}{emp.lastName[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-semibold truncate" data-testid={`text-employee-name-${emp.id}`}>
                          {emp.firstName} {emp.lastName}
                        </h3>
                      </div>
                      <Badge variant={getStatusVariant(emp.status)} className="mt-1">
                        {formatStatus(emp.status)}
                      </Badge>
                      <p className="text-sm text-muted-foreground mt-1 truncate">{emp.designation || "No designation"}</p>
                      <p className="text-xs text-muted-foreground mt-1">{emp.employeeId}</p>
                    </div>
                  </div>
                  <div className="mt-4 space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">{emp.email}</span>
                    </div>
                    {emp.phone && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="h-4 w-4 flex-shrink-0" />
                        <span>{emp.phone}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4 flex-shrink-0" />
                      <span>Joined {emp.joinDate && !isNaN(new Date(emp.joinDate).getTime()) ? new Date(emp.joinDate).toLocaleDateString() : "—"}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          {employees && employees.totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                data-testid="button-prev-page"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {employees.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= employees.totalPages}
                data-testid="button-next-page"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Users className="h-16 w-16 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold">No Employees Found</h3>
            <p className="mt-2 text-muted-foreground text-center max-w-sm">
              {searchTerm ? "No employees match your search." : "Start by adding your first employee to the directory."}
            </p>
            {!searchTerm && (
              <Button className="mt-6" onClick={() => setIsCreateDialogOpen(true)} data-testid="button-add-first-employee">
                <Plus className="mr-2 h-4 w-4" /> Add First Employee
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Employee</DialogTitle>
            <DialogDescription>
              Update the employee information below.
            </DialogDescription>
          </DialogHeader>
          {renderEmployeeForm(editForm, onEditSubmit, updateMutation.isPending, "Save Changes")}
        </DialogContent>
      </Dialog>

      {/* Deactivate Confirmation */}
      <AlertDialog open={!!deactivateEmployee} onOpenChange={() => setDeactivateEmployee(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Employee</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate {deactivateEmployee?.firstName} {deactivateEmployee?.lastName}? 
              This will mark them as exited and they will no longer appear in active employee lists.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deactivateEmployee && deactivateMutation.mutate(deactivateEmployee.id)}
              disabled={deactivateMutation.isPending}
              data-testid="button-confirm-deactivate"
            >
              {deactivateMutation.isPending ? "Deactivating..." : "Deactivate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteEmployee} onOpenChange={() => setDeleteEmployee(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Employee</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete {deleteEmployee?.firstName} {deleteEmployee?.lastName}? 
              This action cannot be undone and will remove all associated records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteEmployee && deleteMutation.mutate(deleteEmployee.id)}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete Permanently"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
