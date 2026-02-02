import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  Mail,
  Phone,
  Calendar,
  Building2,
  MapPin,
  Pencil,
  MoreVertical,
  UserX,
  Trash2,
  Briefcase,
  CreditCard,
  FileText,
} from "lucide-react";

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

export default function EmployeeDetailPage() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const params = useParams<{ employeeId: string }>();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

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
      return apiRequest("PUT", `/api/hr/employees/${params.employeeId}`, { status: "exited" });
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
        <div className="space-y-6">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-32 w-full" />
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
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <h3 className="text-lg font-semibold">Employee Not Found</h3>
            <p className="mt-2 text-muted-foreground">The requested employee does not exist or has been removed.</p>
            <Button className="mt-6" onClick={() => navigate("/hr/employees")}>
              Back to Directory
            </Button>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout 
      title={`${employee.firstName} ${employee.lastName}`}
      breadcrumbs={[
        { label: "HR Management", href: "/hr" },
        { label: "Employees", href: "/hr/employees" },
        { label: `${employee.firstName} ${employee.lastName}` },
      ]}
    >
      {/* Header with actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-2xl">
            {employee.firstName[0]}{employee.lastName[0]}
          </div>
          <div>
            <h2 className="text-xl font-semibold" data-testid="text-employee-name">
              {employee.firstName} {employee.lastName}
            </h2>
            <p className="text-muted-foreground">{employee.designation || "No designation"}</p>
            <Badge variant={getStatusVariant(employee.status)} className="mt-1">
              {formatStatus(employee.status)}
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={openEditDialog} data-testid="button-edit-employee">
            <Pencil className="mr-2 h-4 w-4" /> Edit
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" data-testid="button-more-actions">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {employee.status !== "exited" && (
                <DropdownMenuItem 
                  onClick={() => setShowDeactivateDialog(true)}
                  data-testid="menu-deactivate"
                >
                  <UserX className="mr-2 h-4 w-4" /> Deactivate
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => setShowDeleteDialog(true)}
                className="text-destructive focus:text-destructive"
                data-testid="menu-delete"
              >
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Basic Information */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center gap-3">
              <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="text-muted-foreground">Employee ID:</span>
              <span className="font-medium">{employee.employeeId}</span>
            </div>
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="text-muted-foreground">Email:</span>
              <span className="font-medium">{employee.email}</span>
            </div>
            {employee.phone && (
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-muted-foreground">Phone:</span>
                <span className="font-medium">{employee.phone}</span>
              </div>
            )}
            {employee.dateOfBirth && (
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-muted-foreground">Date of Birth:</span>
                <span className="font-medium">{new Date(employee.dateOfBirth).toLocaleDateString()}</span>
              </div>
            )}
            {employee.gender && (
              <div className="flex items-center gap-3">
                <span className="w-4" />
                <span className="text-muted-foreground">Gender:</span>
                <span className="font-medium capitalize">{employee.gender}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Employment Details */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">Employment Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center gap-3">
              <Briefcase className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="text-muted-foreground">Type:</span>
              <span className="font-medium">{formatEmploymentType(employee.employmentType)}</span>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="text-muted-foreground">Join Date:</span>
              <span className="font-medium">{new Date(employee.joinDate).toLocaleDateString()}</span>
            </div>
            {employee.department && (
              <div className="flex items-center gap-3">
                <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-muted-foreground">Department:</span>
                <span className="font-medium">{employee.department.name}</span>
              </div>
            )}
            <div className="flex items-center gap-3">
              <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="text-muted-foreground">Work Location:</span>
              <span className="font-medium">{formatWorkLocation(employee.workLocation)}</span>
            </div>
            {employee.probationEndDate && (
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-muted-foreground">Probation End:</span>
                <span className="font-medium">{new Date(employee.probationEndDate).toLocaleDateString()}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Address */}
        {(employee.address || employee.city || employee.state || employee.country) && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium">Address</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              <div className="flex items-start gap-3">
                <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div>
                  {employee.address && <p>{employee.address}</p>}
                  <p>
                    {[employee.city, employee.state, employee.postalCode].filter(Boolean).join(", ")}
                  </p>
                  {employee.country && <p>{employee.country}</p>}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Bank Details */}
        {(employee.bankName || employee.bankAccountNumber) && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium">Bank Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {employee.bankName && (
                <div className="flex items-center gap-3">
                  <CreditCard className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-muted-foreground">Bank:</span>
                  <span className="font-medium">{employee.bankName}</span>
                </div>
              )}
              {employee.bankAccountNumber && (
                <div className="flex items-center gap-3">
                  <span className="w-4" />
                  <span className="text-muted-foreground">Account:</span>
                  <span className="font-medium">****{employee.bankAccountNumber.slice(-4)}</span>
                </div>
              )}
              {employee.bankIfscCode && (
                <div className="flex items-center gap-3">
                  <span className="w-4" />
                  <span className="text-muted-foreground">IFSC:</span>
                  <span className="font-medium">{employee.bankIfscCode}</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Emergency Contact */}
        {(employee.emergencyContactName || employee.emergencyContactPhone) && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium">Emergency Contact</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {employee.emergencyContactName && (
                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground">Name:</span>
                  <span className="font-medium">{employee.emergencyContactName}</span>
                </div>
              )}
              {employee.emergencyContactPhone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-muted-foreground">Phone:</span>
                  <span className="font-medium">{employee.emergencyContactPhone}</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}
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
                        <Input {...field} placeholder="+1234567890" data-testid="input-phone" />
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
                        <Input {...field} type="date" data-testid="input-joining-date" />
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
              {departments && departments.length > 0 && (
                <FormField
                  control={editForm.control}
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
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateMutation.isPending} data-testid="button-submit-employee">
                  {updateMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Deactivate Confirmation */}
      <AlertDialog open={showDeactivateDialog} onOpenChange={setShowDeactivateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Employee</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate {employee.firstName} {employee.lastName}? 
              This will mark them as exited and they will no longer appear in active employee lists.
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

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Employee</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete {employee.firstName} {employee.lastName}? 
              This action cannot be undone and will remove all associated records.
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
