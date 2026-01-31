import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
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
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  DollarSign,
  Plus,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  CheckCircle,
  Clock,
  AlertCircle,
  CreditCard,
  Users,
  Calculator,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PayrollComplianceBanner } from "@/components/hrms/PayrollComplianceBanner";

interface PayrollRecord {
  id: string;
  employeeId: string;
  payrollMonth: number;
  payrollYear: number;
  workingDays: number;
  presentDays: number;
  leaveDays: string;
  basicSalary: string;
  hra: string;
  allowances: string;
  deductions: string;
  grossSalary: string;
  netSalary: string;
  currency: string;
  status: "draft" | "processing" | "processed" | "paid" | "failed";
  paidAt: string | null;
  paymentReference: string | null;
  payslipUrl: string | null;
  employee?: {
    firstName: string;
    lastName: string;
    employeeId: string;
    designation: string | null;
  };
}

interface PayrollResponse {
  data: PayrollRecord[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const payrollFormSchema = z.object({
  employeeId: z.string().min(1, "Employee is required"),
  payrollMonth: z.coerce.number().min(1).max(12),
  payrollYear: z.coerce.number().min(2020).max(2030),
  workingDays: z.coerce.number().min(0).max(31),
  presentDays: z.coerce.number().min(0).max(31),
  basicSalary: z.string().min(1, "Basic salary is required"),
  hra: z.string().optional(),
  allowances: z.string().optional(),
  deductions: z.string().optional(),
});

type PayrollFormValues = z.infer<typeof payrollFormSchema>;

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

function getStatusBadge(status: string) {
  const baseClasses = "text-xs";
  
  switch (status) {
    case "draft":
      return <Badge variant="secondary" className={baseClasses}>Draft</Badge>;
    case "processing":
      return <Badge variant="outline" className={cn(baseClasses, "border-amber-500 text-amber-600 dark:text-amber-400")}>Processing</Badge>;
    case "processed":
      return <Badge variant="outline" className={cn(baseClasses, "border-blue-500 text-blue-600 dark:text-blue-400")}>Processed</Badge>;
    case "paid":
      return <Badge variant="outline" className={cn(baseClasses, "border-green-500 text-green-600 dark:text-green-400")}>Paid</Badge>;
    case "failed":
      return <Badge variant="outline" className={cn(baseClasses, "border-red-500 text-red-600 dark:text-red-400")}>Failed</Badge>;
    default:
      return <Badge variant="secondary" className={baseClasses}>{status}</Badge>;
  }
}

function formatCurrency(amount: string | number, currency: string = "INR") {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

export default function HrPayroll() {
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  
  const [filters, setFilters] = useState({
    status: "all",
    month: currentMonth.toString(),
    year: currentYear.toString(),
  });

  const { data: payrollData, isLoading } = useQuery<PayrollResponse>({
    queryKey: ["/api/hr/payroll", page, filters],
  });

  const { data: employees } = useQuery<{ data: any[] }>({
    queryKey: ["/api/hr/employees", { limit: 100 }],
  });

  const form = useForm<PayrollFormValues>({
    resolver: zodResolver(payrollFormSchema),
    defaultValues: {
      employeeId: "",
      payrollMonth: currentMonth,
      payrollYear: currentYear,
      workingDays: 22,
      presentDays: 22,
      basicSalary: "",
      hra: "0",
      allowances: "0",
      deductions: "0",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: PayrollFormValues) => {
      const basicSalary = parseFloat(data.basicSalary);
      const hra = parseFloat(data.hra || "0");
      const allowances = parseFloat(data.allowances || "0");
      const deductions = parseFloat(data.deductions || "0");
      const grossSalary = basicSalary + hra + allowances;
      const netSalary = grossSalary - deductions;

      return apiRequest("POST", "/api/hr/payroll", {
        ...data,
        grossSalary: grossSalary.toString(),
        netSalary: netSalary.toString(),
        status: "draft",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hr/payroll"] });
      toast({ title: "Payroll record created successfully" });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const processMutation = useMutation({
    mutationFn: async (payrollId: string) => {
      return apiRequest("PATCH", `/api/hr/payroll/${payrollId}`, {
        status: "processed",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hr/payroll"] });
      toast({ title: "Payroll processed successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const markPaidMutation = useMutation({
    mutationFn: async (payrollId: string) => {
      return apiRequest("PATCH", `/api/hr/payroll/${payrollId}`, {
        status: "paid",
        paidAt: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hr/payroll"] });
      toast({ title: "Payroll marked as paid" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  function onSubmit(data: PayrollFormValues) {
    createMutation.mutate(data);
  }

  const basicSalary = parseFloat(form.watch("basicSalary") || "0");
  const hra = parseFloat(form.watch("hra") || "0");
  const allowances = parseFloat(form.watch("allowances") || "0");
  const deductions = parseFloat(form.watch("deductions") || "0");
  const grossSalary = basicSalary + hra + allowances;
  const netSalary = grossSalary - deductions;

  const stats = {
    draft: payrollData?.data.filter(p => p.status === "draft").length || 0,
    processed: payrollData?.data.filter(p => p.status === "processed").length || 0,
    paid: payrollData?.data.filter(p => p.status === "paid").length || 0,
    totalPayout: payrollData?.data.reduce((sum, p) => sum + parseFloat(p.netSalary), 0) || 0,
  };

  return (
    <DashboardLayout title="Payroll Management">
      <PayrollComplianceBanner />
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Payroll Management</h1>
          <p className="text-muted-foreground">Process salaries and generate payslips</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-payroll">
              <Plus className="mr-2 h-4 w-4" /> Create Payroll
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Payroll Entry</DialogTitle>
              <DialogDescription>Generate payroll for an employee</DialogDescription>
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
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="payrollMonth"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Month</FormLabel>
                        <Select onValueChange={(v) => field.onChange(parseInt(v))} value={field.value?.toString()}>
                          <FormControl>
                            <SelectTrigger data-testid="select-month">
                              <SelectValue placeholder="Month" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {MONTHS.map((month, idx) => (
                              <SelectItem key={month} value={(idx + 1).toString()}>
                                {month}
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
                    name="payrollYear"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Year</FormLabel>
                        <Select onValueChange={(v) => field.onChange(parseInt(v))} value={field.value?.toString()}>
                          <FormControl>
                            <SelectTrigger data-testid="select-year">
                              <SelectValue placeholder="Year" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {[2024, 2025, 2026].map((year) => (
                              <SelectItem key={year} value={year.toString()}>
                                {year}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="workingDays"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Working Days</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} data-testid="input-working-days" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="presentDays"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Present Days</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} data-testid="input-present-days" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="basicSalary"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Basic Salary</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="0" {...field} data-testid="input-basic-salary" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="hra"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>HRA</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="0" {...field} data-testid="input-hra" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="allowances"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Allowances</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="0" {...field} data-testid="input-allowances" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="deductions"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Deductions</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="0" {...field} data-testid="input-deductions" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                {basicSalary > 0 && (
                  <div className="rounded-md bg-muted p-3 space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Gross Salary:</span>
                      <span className="font-medium">{formatCurrency(grossSalary)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Net Salary:</span>
                      <span className="font-semibold text-green-600 dark:text-green-400">{formatCurrency(netSalary)}</span>
                    </div>
                  </div>
                )}
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-payroll">
                    {createMutation.isPending ? "Creating..." : "Create Payroll"}
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
            <CardTitle className="text-sm font-medium">Processed</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-processed">{stats.processed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paid</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-paid">{stats.paid}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Payout</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-total-payout">
              {formatCurrency(stats.totalPayout)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <CardTitle>Payroll Records</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={filters.month}
                onValueChange={(value) => setFilters({ ...filters, month: value })}
              >
                <SelectTrigger className="w-32" data-testid="filter-month">
                  <SelectValue placeholder="Month" />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((month, idx) => (
                    <SelectItem key={month} value={(idx + 1).toString()}>
                      {month}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={filters.year}
                onValueChange={(value) => setFilters({ ...filters, year: value })}
              >
                <SelectTrigger className="w-24" data-testid="filter-year">
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                  {[2024, 2025, 2026].map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                  <SelectItem value="processed">Processed</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
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
          ) : payrollData?.data && payrollData.data.length > 0 ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Working/Present</TableHead>
                    <TableHead>Gross</TableHead>
                    <TableHead>Net</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payrollData.data.map((payroll) => (
                    <TableRow key={payroll.id} data-testid={`row-payroll-${payroll.id}`}>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {payroll.employee?.firstName} {payroll.employee?.lastName}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {payroll.employee?.employeeId}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {MONTHS[payroll.payrollMonth - 1]} {payroll.payrollYear}
                      </TableCell>
                      <TableCell>
                        {payroll.presentDays}/{payroll.workingDays} days
                      </TableCell>
                      <TableCell>{formatCurrency(payroll.grossSalary, payroll.currency)}</TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(payroll.netSalary, payroll.currency)}
                      </TableCell>
                      <TableCell>{getStatusBadge(payroll.status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {payroll.status === "draft" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => processMutation.mutate(payroll.id)}
                              disabled={processMutation.isPending}
                              data-testid={`button-process-${payroll.id}`}
                            >
                              <Calculator className="h-4 w-4 mr-1" /> Process
                            </Button>
                          )}
                          {payroll.status === "processed" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => markPaidMutation.mutate(payroll.id)}
                              disabled={markPaidMutation.isPending}
                              data-testid={`button-mark-paid-${payroll.id}`}
                            >
                              <CreditCard className="h-4 w-4 mr-1" /> Mark Paid
                            </Button>
                          )}
                          {payroll.payslipUrl && (
                            <Button variant="ghost" size="icon" data-testid={`button-download-${payroll.id}`}>
                              <Download className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {(payrollData.totalPages || 1) > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Page {payrollData.page || 1} of {payrollData.totalPages || 1}
                    {" "}({payrollData.total || 0} total records)
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
                      disabled={page >= (payrollData.totalPages || 1)}
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
              <DollarSign className="h-12 w-12 text-muted-foreground/50" />
              <p className="mt-2 text-muted-foreground">No payroll records found</p>
              <p className="text-sm text-muted-foreground">Create a payroll entry to get started</p>
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
