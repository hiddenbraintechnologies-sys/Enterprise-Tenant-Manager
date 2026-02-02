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
import { useEmployeeAbilities } from "@/hooks/use-employee-abilities";
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
  Trash2,
  UserMinus,
  X,
  Loader2,
  UserPlus,
  FilterX,
  Upload,
  Download,
  FileWarning,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckedState } from "@radix-ui/react-checkbox";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

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
  const { abilities } = useEmployeeAbilities();
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [deleteEmployee, setDeleteEmployee] = useState<Employee | null>(null);
  const [deactivateEmployee, setDeactivateEmployee] = useState<Employee | null>(null);
  const [reactivateEmployee, setReactivateEmployee] = useState<Employee | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<"deactivate" | "delete" | null>(null);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    totalRows: number;
    successCount: number;
    errorCount: number;
    errors: Array<{
      rowNumber: number;
      employeeCode: string;
      email: string;
      errorCode: string;
      errorField: string;
      errorMessage: string;
      rawData: string;
    }>;
  } | null>(null);

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
      return apiRequest("POST", `/api/hr/employees/${id}/deactivate`, {});
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

  const reactivateMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("POST", `/api/hr/employees/${id}/reactivate`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hr/employees"] });
      queryClient.invalidateQueries({ queryKey: ["/api/hr/dashboard"] });
      toast({ title: "Employee reactivated" });
      setReactivateEmployee(null);
    },
    onError: (error: any) => {
      handleMutationError(error, "reactivate");
    },
  });

  const bulkDeactivateMutation = useMutation({
    mutationFn: async (employeeIds: string[]) => {
      return apiRequest("POST", "/api/hr/employees/bulk/deactivate", { employeeIds });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/hr/employees"] });
      queryClient.invalidateQueries({ queryKey: ["/api/hr/dashboard"] });
      const { successCount, errorCount } = data;
      if (errorCount === 0) {
        toast({ title: `${successCount} employee(s) deactivated` });
      } else {
        toast({ 
          title: `Completed with issues`,
          description: `${successCount} succeeded, ${errorCount} failed`,
          variant: successCount > 0 ? "default" : "destructive",
        });
      }
      setSelectedIds(new Set());
      setBulkAction(null);
    },
    onError: (error: any) => {
      handleMutationError(error, "bulk deactivate");
      setBulkAction(null);
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (employeeIds: string[]) => {
      return apiRequest("POST", "/api/hr/employees/bulk/delete", { employeeIds });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/hr/employees"] });
      queryClient.invalidateQueries({ queryKey: ["/api/hr/dashboard"] });
      const { successCount, errorCount } = data;
      if (errorCount === 0) {
        toast({ title: `${successCount} employee(s) deleted` });
      } else {
        toast({ 
          title: `Completed with issues`,
          description: `${successCount} deleted, ${errorCount} have dependencies (deactivate instead)`,
          variant: successCount > 0 ? "default" : "destructive",
        });
      }
      setSelectedIds(new Set());
      setBulkAction(null);
    },
    onError: (error: any) => {
      handleMutationError(error, "bulk delete");
      setBulkAction(null);
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
    if (target.closest('[data-menu-trigger]') || target.closest('[role="menu"]') || target.closest('[data-checkbox]')) {
      return;
    }
    navigate(`/hr/employees/${emp.id}`);
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    if (filteredEmployees) {
      setSelectedIds(new Set(filteredEmployees.map(e => e.id)));
    }
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const handleBulkDeactivate = () => {
    if (selectedIds.size === 0) return;
    bulkDeactivateMutation.mutate(Array.from(selectedIds));
  };

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;
    bulkDeleteMutation.mutate(Array.from(selectedIds));
  };

  // CSV Import mutation
  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/hr/employees/import", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Import failed");
      }
      return response.json();
    },
    onSuccess: (data) => {
      setImportResult(data);
      queryClient.invalidateQueries({ queryKey: ["/api/hr/employees"] });
      if (data.success) {
        toast({ title: `Successfully imported ${data.successCount} employee(s)` });
        setIsImportDialogOpen(false);
        setImportFile(null);
        setImportResult(null);
      } else {
        toast({ 
          title: `Imported ${data.successCount} of ${data.totalRows} employees`, 
          description: `${data.errorCount} row(s) had errors. Download the error report for details.`,
          variant: "destructive",
        });
      }
    },
    onError: (error: Error) => {
      toast({ title: "Import failed", description: error.message, variant: "destructive" });
    },
  });

  const handleImport = () => {
    if (importFile) {
      importMutation.mutate(importFile);
    }
  };

  const downloadTemplate = (type: "hr" | "payroll") => {
    window.open(`/api/hr/employees/import/template?type=${type}`, "_blank");
  };

  const downloadErrorReport = () => {
    if (!importResult?.errors?.length) return;
    
    // Helper to escape CSV fields (wrap in quotes, escape internal quotes)
    const escapeCSV = (val: string | number) => {
      const str = String(val);
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };
    
    const headers = "rowNumber,employeeCode,email,errorCode,errorField,errorMessage,rawData";
    const rows = importResult.errors.map(e => 
      [
        e.rowNumber,
        escapeCSV(e.employeeCode),
        escapeCSV(e.email),
        escapeCSV(e.errorCode),
        escapeCSV(e.errorField),
        escapeCSV(e.errorMessage),
        escapeCSV(e.rawData),
      ].join(",")
    );
    const csv = [headers, ...rows].join("\n");
    
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "employee_import_errors.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  // Count employees by status for chips
  // Active = active + probation; Inactive = exited + on_hold
  const statusCounts = employees?.data?.reduce((acc, emp) => {
    if (emp.status === "active" || emp.status === "probation") {
      acc.active++;
    } else if (emp.status === "exited" || emp.status === "on_hold") {
      acc.inactive++;
    }
    return acc;
  }, { active: 0, inactive: 0 }) || { active: 0, inactive: 0 };

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
          {/* Search */}
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
          
          {/* Status Toggle Chips */}
          <ToggleGroup 
            type="single" 
            value={statusFilter} 
            onValueChange={(v) => v && setStatusFilter(v)}
            className="justify-start"
          >
            <ToggleGroupItem value="all" aria-label="All employees" data-testid="toggle-status-all">
              All
            </ToggleGroupItem>
            <ToggleGroupItem value="active" aria-label="Active employees" data-testid="toggle-status-active">
              Active ({statusCounts.active})
            </ToggleGroupItem>
            <ToggleGroupItem value="inactive" aria-label="Inactive employees" data-testid="toggle-status-inactive">
              Inactive ({statusCounts.inactive})
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Import CSV Button */}
          <Button variant="outline" onClick={() => setIsImportDialogOpen(true)} data-testid="button-import-csv">
            <Upload className="mr-2 h-4 w-4" /> Import CSV
          </Button>
          
          {/* Add Employee Button */}
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
      </div>

      {/* Import CSV Dialog */}
      <Dialog open={isImportDialogOpen} onOpenChange={(open) => {
        setIsImportDialogOpen(open);
        if (!open) {
          setImportFile(null);
          setImportResult(null);
        }
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Import Employees from CSV</DialogTitle>
            <DialogDescription>
              Upload a CSV file to import employees in bulk.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Download Templates */}
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => downloadTemplate("hr")} data-testid="button-download-hr-template">
                <Download className="mr-2 h-4 w-4" /> HR Template
              </Button>
              <Button variant="outline" size="sm" onClick={() => downloadTemplate("payroll")} data-testid="button-download-payroll-template">
                <Download className="mr-2 h-4 w-4" /> Payroll Template
              </Button>
            </div>
            
            {/* File Upload */}
            <div className="border-2 border-dashed rounded-lg p-6 text-center">
              <input
                type="file"
                accept=".csv"
                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                className="hidden"
                id="csv-upload"
                data-testid="input-csv-file"
              />
              <label htmlFor="csv-upload" className="cursor-pointer">
                <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  {importFile ? importFile.name : "Click to upload CSV file"}
                </p>
              </label>
            </div>
            
            {/* Import Result */}
            {importResult && (
              <div className={`p-4 rounded-lg ${importResult.success ? "bg-green-50 dark:bg-green-950" : "bg-red-50 dark:bg-red-950"}`}>
                <div className="flex items-start gap-3">
                  {importResult.success ? (
                    <div className="text-green-600">
                      <p className="font-medium">Import successful!</p>
                      <p className="text-sm">{importResult.successCount} employee(s) imported.</p>
                    </div>
                  ) : (
                    <>
                      <FileWarning className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                      <div className="text-red-600 flex-1">
                        <p className="font-medium">Import completed with errors</p>
                        <p className="text-sm">
                          {importResult.successCount} of {importResult.totalRows} imported. 
                          {importResult.errorCount} row(s) failed.
                        </p>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="mt-2" 
                          onClick={downloadErrorReport}
                          data-testid="button-download-error-report"
                        >
                          <Download className="mr-2 h-4 w-4" /> Download Error Report
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsImportDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleImport} 
              disabled={!importFile || importMutation.isPending}
              data-testid="button-start-import"
            >
              {importMutation.isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Importing...</>
              ) : (
                "Import"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Actions Toolbar - Zoho-style (desktop) */}
      {filteredEmployees && filteredEmployees.length > 0 && (
        <div className="mb-4 hidden sm:flex items-center justify-between gap-3 px-4 py-2 bg-muted rounded-lg">
          <div className="flex items-center gap-3">
            <Checkbox 
              checked={
                selectedIds.size === 0 
                  ? false 
                  : selectedIds.size === filteredEmployees.length 
                    ? true 
                    : "indeterminate"
              }
              onCheckedChange={(checked: CheckedState) => {
                if (checked === true) {
                  setSelectedIds(new Set(filteredEmployees.map(e => e.id)));
                } else {
                  setSelectedIds(new Set());
                }
              }}
              data-testid="checkbox-select-all"
            />
            <span className="text-sm text-muted-foreground">
              {selectedIds.size === 0 
                ? "Select all" 
                : `${selectedIds.size} selected`}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            {selectedIds.size > 0 && abilities.canDeactivate && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleBulkDeactivate}
                disabled={bulkDeactivateMutation.isPending || bulkDeleteMutation.isPending}
                data-testid="button-bulk-deactivate"
              >
                {bulkDeactivateMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <UserMinus className="h-4 w-4 mr-2" />
                )}
                Deactivate
              </Button>
            )}
            {selectedIds.size > 0 && abilities.canDelete && (
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={() => setBulkAction("delete")}
                disabled={bulkDeactivateMutation.isPending || bulkDeleteMutation.isPending}
                data-testid="button-bulk-delete"
              >
                {bulkDeleteMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-2" />
                )}
                Delete
              </Button>
            )}
            {selectedIds.size > 0 && (
              <Button 
                variant="ghost" 
                size="icon"
                onClick={clearSelection} 
                data-testid="button-clear-selection"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Mobile sticky bottom action bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 sm:hidden z-50 bg-background border-t p-3 flex items-center justify-between gap-2 shadow-lg">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{selectedIds.size} selected</span>
            <Button variant="ghost" size="sm" onClick={clearSelection} data-testid="button-mobile-clear-selection">
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            {abilities.canDeactivate && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleBulkDeactivate}
                disabled={bulkDeactivateMutation.isPending || bulkDeleteMutation.isPending}
                data-testid="button-mobile-bulk-deactivate"
              >
                {bulkDeactivateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Deactivate"}
              </Button>
            )}
            {abilities.canDelete && (
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={() => setBulkAction("delete")}
                disabled={bulkDeactivateMutation.isPending || bulkDeleteMutation.isPending}
                data-testid="button-mobile-bulk-delete"
              >
                {bulkDeleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Shared Bulk Delete Confirmation Dialog */}
      <AlertDialog open={bulkAction === "delete"} onOpenChange={(open) => setBulkAction(open ? "delete" : null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.size} employee(s)?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. Employees with payroll, leaves, or attendance records will not be deleted. Consider deactivating instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} data-testid="button-confirm-bulk-delete">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
                className={`cursor-pointer relative group transition-all duration-150 ${
                  selectedIds.has(emp.id) 
                    ? "ring-2 ring-primary/50 border-primary bg-primary/5" 
                    : "hover:border-muted-foreground/30 hover:shadow-sm"
                }`}
                data-testid={`card-employee-${emp.id}`}
                onClick={(e) => handleCardClick(emp, e)}
              >
                <CardContent className="p-4">
                  {/* Checkbox overlay - top left */}
                  <div 
                    className="absolute top-3 left-3 z-10" 
                    data-checkbox 
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Checkbox 
                      checked={selectedIds.has(emp.id)}
                      onCheckedChange={() => toggleSelection(emp.id)}
                      data-testid={`checkbox-employee-${emp.id}`}
                    />
                  </div>
                  
                  {/* Kebab menu - visible on hover */}
                  {(() => {
                    const canView = abilities.canView;
                    const canEdit = abilities.canEdit;
                    const canDeactivate = abilities.canDeactivate && emp.status !== "exited";
                    const canDelete = abilities.canDelete;
                    const hasAnyAction = canView || canEdit || canDeactivate || canDelete;
                    if (!hasAnyAction) return null;
                    return (
                      <div 
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity" 
                        onClick={(e) => e.stopPropagation()}
                      >
                        <EmployeeActionsMenu
                          canView={canView}
                          canEdit={canEdit}
                          canDeactivate={canDeactivate}
                          canReactivate={abilities.canEdit && emp.status === "exited"}
                          canDelete={canDelete}
                          isAddonExpired={abilities.isAddonExpired}
                          onView={() => navigate(`/hr/employees/${emp.id}`)}
                          onEdit={() => openEditDialog(emp)}
                          onDeactivate={() => setDeactivateEmployee(emp)}
                          onReactivate={() => setReactivateEmployee(emp)}
                          onDelete={() => setDeleteEmployee(emp)}
                        />
                      </div>
                    );
                  })()}
                  
                  {/* Card content - improved visual hierarchy */}
                  <div className="flex items-start gap-3 pl-7">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-base flex-shrink-0">
                      {emp.firstName[0]}{emp.lastName[0]}
                    </div>
                    <div className="flex-1 min-w-0 pr-6">
                      {/* Row 1: Name + Status badge */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold truncate" data-testid={`text-employee-name-${emp.id}`}>
                          {emp.firstName} {emp.lastName}
                        </h3>
                        <Badge variant={getStatusVariant(emp.status)} className="text-xs">
                          {formatStatus(emp.status)}
                        </Badge>
                      </div>
                      
                      {/* Row 2: Designation • ID */}
                      <p className="text-sm text-muted-foreground mt-0.5 truncate">
                        {emp.designation || "No designation"} <span className="text-muted-foreground/50">•</span> {emp.employeeId}
                      </p>
                      
                      {/* Row 3: Email • Phone */}
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        {emp.email}
                        {emp.phone && (
                          <> <span className="text-muted-foreground/50">•</span> {emp.phone}</>
                        )}
                      </p>
                      
                      {/* Row 4: Joined date */}
                      <p className="text-xs text-muted-foreground/70 mt-1">
                        Joined {emp.joinDate && !isNaN(new Date(emp.joinDate).getTime()) 
                          ? new Date(emp.joinDate).toLocaleDateString() 
                          : "—"}
                      </p>
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
            {searchTerm || statusFilter !== "all" ? (
              <>
                <FilterX className="h-16 w-16 text-muted-foreground/50" />
                <h3 className="mt-4 text-lg font-semibold">No employees match your filters</h3>
                <p className="mt-2 text-muted-foreground text-center max-w-sm">
                  Try adjusting your search term or status filter to find employees.
                </p>
                <Button 
                  variant="outline" 
                  className="mt-6" 
                  onClick={() => { setSearchTerm(""); setStatusFilter("all"); }}
                  data-testid="button-clear-filters"
                >
                  <X className="mr-2 h-4 w-4" /> Clear Filters
                </Button>
              </>
            ) : (
              <>
                <UserPlus className="h-16 w-16 text-muted-foreground/50" />
                <h3 className="mt-4 text-lg font-semibold">No employees yet</h3>
                <p className="mt-2 text-muted-foreground text-center max-w-sm">
                  Start by adding your first employee to the directory.
                </p>
                <Button className="mt-6" onClick={() => setIsCreateDialogOpen(true)} data-testid="button-add-first-employee">
                  <Plus className="mr-2 h-4 w-4" /> Add Employee
                </Button>
              </>
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

      {/* Reactivate Confirmation */}
      <AlertDialog open={!!reactivateEmployee} onOpenChange={() => setReactivateEmployee(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reactivate Employee</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to reactivate {reactivateEmployee?.firstName} {reactivateEmployee?.lastName}? 
              This will restore their active status.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => reactivateEmployee && reactivateMutation.mutate(reactivateEmployee.id)}
              disabled={reactivateMutation.isPending}
              data-testid="button-confirm-reactivate"
            >
              {reactivateMutation.isPending ? "Reactivating..." : "Reactivate"}
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
