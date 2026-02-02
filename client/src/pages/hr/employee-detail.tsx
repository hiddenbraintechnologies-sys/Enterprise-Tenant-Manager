import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEmployeeAbilitiesForEmployee } from "@/hooks/use-employee-abilities";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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
import { EmployeeActionsMenu } from "@/components/hr/employee-actions-menu";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Mail,
  Phone,
  Calendar,
  Building2,
  MapPin,
  Pencil,
  Briefcase,
  CreditCard,
  User,
  AlertTriangle,
  Clock,
  DollarSign,
  Lock,
} from "lucide-react";
import { useEntitlements } from "@/hooks/use-entitlements";

interface Employee {
  id: string;
  tenantId: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  postalCode: string | null;
  departmentId: string | null;
  designation: string | null;
  employmentType: string;
  joinDate: string;
  probationEndDate: string | null;
  reportingManagerId: string | null;
  workLocation: string | null;
  status: string;
  profilePhotoUrl: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  bankName: string | null;
  bankAccountNumber: string | null;
  bankIfscCode: string | null;
  panNumber: string | null;
  aadharNumber: string | null;
  createdAt: string;
  department?: { name: string } | null;
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

function formatEmploymentType(type: string): string {
  switch (type) {
    case "full_time": return "Full Time";
    case "part_time": return "Part Time";
    case "contract": return "Contract";
    case "intern": return "Intern";
    default: return type;
  }
}

function formatWorkLocation(location: string | null): string {
  if (!location) return "Not specified";
  switch (location) {
    case "onsite": return "On-site";
    case "remote": return "Remote";
    case "hybrid": return "Hybrid";
    default: return location;
  }
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleDateString();
}

export default function EmployeeDetailPage() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const params = useParams<{ employeeId: string }>();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false);
  const [showReactivateDialog, setShowReactivateDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  // Check add-on entitlements for tab gating
  const { entitlements } = useEntitlements();
  const hrmsEntitled = entitlements?.hrms?.entitled || 
                       entitlements?.["hrms-india"]?.entitled ||
                       entitlements?.["hrms-malaysia"]?.entitled || false;
  const payrollEntitled = (entitlements?.payroll?.entitled ||
                          entitlements?.["payroll-india"]?.entitled ||
                          entitlements?.["payroll-malaysia"]?.entitled) && hrmsEntitled;

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

  const { data: employee, isLoading } = useQuery<Employee>({
    queryKey: [`/api/hr/employees/${params.employeeId}`],
    enabled: !!params.employeeId,
  });

  const { data: departments } = useQuery<any[]>({
    queryKey: ["/api/hr/departments"],
  });

  const updateMutation = useMutation({
    mutationFn: async (data: EmployeeFormValues) => {
      return apiRequest("PUT", `/api/hr/employees/${params.employeeId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/hr/employees/${params.employeeId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/hr/employees"] });
      toast({ title: "Employee updated" });
      setIsEditDialogOpen(false);
    },
    onError: (error: any) => {
      handleMutationError(error, "update");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", `/api/hr/employees/${params.employeeId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hr/employees"] });
      toast({ title: "Employee deleted" });
      navigate("/hr/employees");
    },
    onError: (error: any) => {
      handleMutationError(error, "delete");
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/hr/employees/${params.employeeId}/deactivate`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/hr/employees/${params.employeeId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/hr/employees"] });
      toast({ title: "Employee deactivated" });
      setShowDeactivateDialog(false);
    },
    onError: (error: any) => {
      handleMutationError(error, "deactivate");
    },
  });

  const reactivateMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/hr/employees/${params.employeeId}/reactivate`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/hr/employees/${params.employeeId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/hr/employees"] });
      toast({ title: "Employee reactivated" });
      setShowReactivateDialog(false);
    },
    onError: (error: any) => {
      handleMutationError(error, "reactivate");
    },
  });

  function handleMutationError(error: any, action: string) {
    let errorMessage = `Failed to ${action} employee. Please try again.`;
    try {
      if (error.message) {
        const parsed = JSON.parse(error.message);
        if (parsed.error) {
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

  const openEditDialog = () => {
    if (!employee) return;
    editForm.reset({
      employeeId: employee.employeeId,
      firstName: employee.firstName,
      lastName: employee.lastName,
      email: employee.email,
      phone: employee.phone || "",
      designation: employee.designation || "",
      departmentId: employee.departmentId || "",
      joinDate: employee.joinDate?.split("T")[0] || "",
      employmentType: employee.employmentType as any || "full_time",
    });
    setIsEditDialogOpen(true);
  };

  const onEditSubmit = (data: EmployeeFormValues) => {
    updateMutation.mutate(data);
  };

  const { abilities } = useEmployeeAbilitiesForEmployee(employee?.status);
  const { canEdit, canDeactivate, canDelete, canView } = abilities;

  if (isLoading) {
    return (
      <DashboardLayout 
        title="Employee Details" 
        breadcrumbs={[
          { label: "HR Management", href: "/hr" },
          { label: "Employees", href: "/hr/employees" },
          { label: "Loading..." },
        ]}
      >
        <div className="mx-auto max-w-6xl space-y-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </DashboardLayout>
    );
  }

  if (!employee) {
    return (
      <DashboardLayout 
        title="Employee Not Found" 
        breadcrumbs={[
          { label: "HR Management", href: "/hr" },
          { label: "Employees", href: "/hr/employees" },
          { label: "Not Found" },
        ]}
      >
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col items-center justify-center py-16 rounded-xl border bg-card">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">Employee Not Found</h3>
            <p className="mt-2 text-muted-foreground">The requested employee does not exist or has been removed.</p>
            <Button className="mt-6" onClick={() => navigate("/hr/employees")} data-testid="button-back-to-directory">
              Back to Directory
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const initials = `${employee.firstName[0] || ""}${employee.lastName[0] || ""}`.toUpperCase();

  return (
    <DashboardLayout 
      title={`${employee.firstName} ${employee.lastName}`}
      breadcrumbs={[
        { label: "HR Management", href: "/hr" },
        { label: "Employees", href: "/hr/employees" },
        { label: `${employee.firstName} ${employee.lastName}` },
      ]}
    >
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Sticky Header */}
        <div className="sticky top-0 z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 -mx-4 px-4 py-4 border-b">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xl">
                {initials}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl font-semibold leading-tight" data-testid="text-employee-name">
                    {employee.firstName} {employee.lastName}
                  </h1>
                  <Badge variant={getStatusVariant(employee.status)} data-testid="badge-employee-status">
                    {formatStatus(employee.status)}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">{employee.designation || "No designation"}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button onClick={openEditDialog} disabled={!canEdit} data-testid="button-edit-employee">
                <Pencil className="mr-2 h-4 w-4" /> Edit
              </Button>
              {(canEdit || canDeactivate || canDelete) && (
                <EmployeeActionsMenu
                  canView={false}
                  canEdit={canEdit}
                  canDeactivate={canDeactivate}
                  canReactivate={abilities.canEdit && employee?.status === "exited"}
                  canDelete={canDelete}
                  isAddonExpired={abilities.isAddonExpired}
                  onView={() => {}}
                  onEdit={openEditDialog}
                  onDeactivate={() => setShowDeactivateDialog(true)}
                  onReactivate={() => setShowReactivateDialog(true)}
                  onDelete={() => setShowDeleteDialog(true)}
                />
              )}
            </div>
          </div>
        </div>

        {/* Summary Strip */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border p-4 flex items-start gap-3">
            <div className="p-2 rounded-lg bg-muted">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Employee ID</div>
              <div className="font-medium mt-0.5" data-testid="text-employee-id">{employee.employeeId || "—"}</div>
            </div>
          </div>
          <div className="rounded-xl border p-4 flex items-start gap-3">
            <div className="p-2 rounded-lg bg-muted">
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Department</div>
              <div className="font-medium mt-0.5" data-testid="text-department">{employee.department?.name || "—"}</div>
            </div>
          </div>
          <div className="rounded-xl border p-4 flex items-start gap-3">
            <div className="p-2 rounded-lg bg-muted">
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Joined</div>
              <div className="font-medium mt-0.5" data-testid="text-join-date">{formatDate(employee.joinDate)}</div>
            </div>
          </div>
          <div className="rounded-xl border p-4 flex items-start gap-3">
            <div className="p-2 rounded-lg bg-muted">
              <Briefcase className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Employment Type</div>
              <div className="font-medium mt-0.5" data-testid="text-employment-type">{formatEmploymentType(employee.employmentType)}</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="profile" data-testid="tab-profile">
              <User className="mr-2 h-4 w-4" /> Profile
            </TabsTrigger>
            <TabsTrigger value="attendance" data-testid="tab-attendance">
              <Clock className="mr-2 h-4 w-4" /> Attendance
            </TabsTrigger>
            <TabsTrigger value="payroll" data-testid="tab-payroll">
              <DollarSign className="mr-2 h-4 w-4" /> Payroll
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="mt-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Personal Details */}
              <div className="rounded-xl border p-5">
                <h3 className="font-medium mb-4">Personal Details</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-3">
                    <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-muted-foreground w-24">Full Name</span>
                    <span className="font-medium">{employee.firstName} {employee.lastName}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-muted-foreground w-24">Email</span>
                    <span className="font-medium">{employee.email}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-muted-foreground w-24">Phone</span>
                    <span className="font-medium">{employee.phone || "—"}</span>
                  </div>
                  {employee.dateOfBirth && (
                    <div className="flex items-center gap-3">
                      <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="text-muted-foreground w-24">Date of Birth</span>
                      <span className="font-medium">{formatDate(employee.dateOfBirth)}</span>
                    </div>
                  )}
                  {employee.gender && (
                    <div className="flex items-center gap-3">
                      <span className="w-4" />
                      <span className="text-muted-foreground w-24">Gender</span>
                      <span className="font-medium capitalize">{employee.gender}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Employment Details */}
              <div className="rounded-xl border p-5">
                <h3 className="font-medium mb-4">Employment Details</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-3">
                    <Briefcase className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-muted-foreground w-24">Designation</span>
                    <span className="font-medium">{employee.designation || "—"}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-muted-foreground w-24">Department</span>
                    <span className="font-medium">{employee.department?.name || "—"}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-muted-foreground w-24">Join Date</span>
                    <span className="font-medium">{formatDate(employee.joinDate)}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-muted-foreground w-24">Work Location</span>
                    <span className="font-medium">{formatWorkLocation(employee.workLocation)}</span>
                  </div>
                  {employee.probationEndDate && (
                    <div className="flex items-center gap-3">
                      <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="text-muted-foreground w-24">Probation End</span>
                      <span className="font-medium">{formatDate(employee.probationEndDate)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Address */}
              {(employee.address || employee.city || employee.country) && (
                <div className="rounded-xl border p-5">
                  <h3 className="font-medium mb-4">Address</h3>
                  <div className="flex items-start gap-3 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                    <div>
                      {employee.address && <p>{employee.address}</p>}
                      {(employee.city || employee.state || employee.postalCode) && (
                        <p>{[employee.city, employee.state, employee.postalCode].filter(Boolean).join(", ")}</p>
                      )}
                      {employee.country && <p>{employee.country}</p>}
                    </div>
                  </div>
                </div>
              )}

              {/* Bank Details */}
              {(employee.bankName || employee.bankAccountNumber) && (
                <div className="rounded-xl border p-5">
                  <h3 className="font-medium mb-4">Bank Details</h3>
                  <div className="space-y-3 text-sm">
                    {employee.bankName && (
                      <div className="flex items-center gap-3">
                        <CreditCard className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span className="text-muted-foreground w-24">Bank</span>
                        <span className="font-medium">{employee.bankName}</span>
                      </div>
                    )}
                    {employee.bankAccountNumber && (
                      <div className="flex items-center gap-3">
                        <span className="w-4" />
                        <span className="text-muted-foreground w-24">Account</span>
                        <span className="font-medium">****{employee.bankAccountNumber.slice(-4)}</span>
                      </div>
                    )}
                    {employee.bankIfscCode && (
                      <div className="flex items-center gap-3">
                        <span className="w-4" />
                        <span className="text-muted-foreground w-24">IFSC</span>
                        <span className="font-medium">{employee.bankIfscCode}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Emergency Contact */}
              {(employee.emergencyContactName || employee.emergencyContactPhone) && (
                <div className="rounded-xl border p-5">
                  <h3 className="font-medium mb-4">Emergency Contact</h3>
                  <div className="space-y-3 text-sm">
                    {employee.emergencyContactName && (
                      <div className="flex items-center gap-3">
                        <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span className="text-muted-foreground w-24">Name</span>
                        <span className="font-medium">{employee.emergencyContactName}</span>
                      </div>
                    )}
                    {employee.emergencyContactPhone && (
                      <div className="flex items-center gap-3">
                        <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span className="text-muted-foreground w-24">Phone</span>
                        <span className="font-medium">{employee.emergencyContactPhone}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Attendance Tab */}
          <TabsContent value="attendance" className="mt-6">
            {hrmsEntitled ? (
              <div className="rounded-xl border p-5">
                <h3 className="font-medium mb-4">Attendance Records</h3>
                <div className="text-sm text-muted-foreground">
                  <p>No attendance records found for this employee.</p>
                  <p className="mt-2">Clock-in/out tracking will appear here once the employee starts recording attendance.</p>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border p-6">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-full border p-2">
                    <Lock className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold">Attendance is locked</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Attendance tracking requires the HRMS add-on. View clock-in/out history and attendance reports.
                    </p>
                    <Button className="mt-4" onClick={() => navigate("/marketplace")} data-testid="button-attendance-go-addons">
                      Go to Add-ons
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Payroll Tab */}
          <TabsContent value="payroll" className="mt-6">
            {payrollEntitled ? (
              <div className="rounded-xl border p-5">
                <h3 className="font-medium mb-4">Payroll Information</h3>
                <div className="text-sm text-muted-foreground">
                  <p>No payroll records found for this employee.</p>
                  <p className="mt-2">Salary details and payslips will appear here once the employee is added to a pay run.</p>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border p-6">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-full border p-2">
                    <Lock className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold">Payroll is locked</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {!hrmsEntitled 
                        ? "Payroll requires an active HRMS add-on. Install HRMS first, then add the Payroll add-on."
                        : "Payroll features require an active Payroll add-on. View salary details and payslips."}
                    </p>
                    <Button className="mt-4" onClick={() => navigate("/marketplace")} data-testid="button-payroll-go-addons">
                      Go to Add-ons
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Employee</DialogTitle>
            <DialogDescription>
              Update the employee information below.
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={editForm.control}
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
                  control={editForm.control}
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
                  control={editForm.control}
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
                  control={editForm.control}
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
                control={editForm.control}
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
                  control={editForm.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="+60123456789" data-testid="input-phone" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="joinDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Joining Date</FormLabel>
                      <FormControl>
                        <Input {...field} type="date" data-testid="input-join-date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={editForm.control}
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
              <FormField
                control={editForm.control}
                name="departmentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Department</FormLabel>
                    <Select value={field.value || ""} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger data-testid="select-department">
                          <SelectValue placeholder="Select department" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {departments?.map((dept) => (
                          <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateMutation.isPending} data-testid="button-save-employee">
                  {updateMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Deactivate Dialog */}
      <AlertDialog open={showDeactivateDialog} onOpenChange={setShowDeactivateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Employee</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate {employee.firstName} {employee.lastName}? 
              They will no longer be able to access the portal, but their records will be preserved for compliance purposes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deactivateMutation.mutate()}
              disabled={deactivateMutation.isPending}
              data-testid="button-confirm-deactivate"
            >
              {deactivateMutation.isPending ? "Deactivating..." : "Deactivate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reactivate Dialog */}
      <AlertDialog open={showReactivateDialog} onOpenChange={setShowReactivateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reactivate Employee</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to reactivate {employee.firstName} {employee.lastName}? 
              This will restore their active status.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => reactivateMutation.mutate()}
              disabled={reactivateMutation.isPending}
              data-testid="button-confirm-reactivate"
            >
              {reactivateMutation.isPending ? "Reactivating..." : "Reactivate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Employee Permanently</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete {employee.firstName} {employee.lastName}'s 
              record and all associated data. Are you sure you want to proceed?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deleteMutation.mutate()}
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
