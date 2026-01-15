import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  DollarSign,
  Play,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  CheckCircle,
  Clock,
  CreditCard,
  Users,
  Calculator,
  Eye,
  Check,
  Banknote,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PayRun {
  id: string;
  month: number;
  year: number;
  status: "draft" | "approved" | "paid" | "cancelled";
  totalEmployees: number;
  totalGross: string;
  totalDeductions: string;
  totalNet: string;
  generatedAt: string | null;
  approvedAt: string | null;
  paidAt: string | null;
  createdBy: string | null;
  approvedBy: string | null;
}

interface PayRunItem {
  id: string;
  employeeId: string;
  earningsJson: Record<string, number>;
  deductionsJson: Record<string, number>;
  gross: string;
  totalDeductions: string;
  net: string;
  attendanceDays: number;
  unpaidLeaveDays: number;
  overtimeHours: string;
  notes: string | null;
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface PayRunResponse {
  data: PayRun[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

function getStatusBadge(status: string) {
  const baseClasses = "text-xs";
  
  switch (status) {
    case "draft":
      return <Badge variant="secondary" className={baseClasses}>Draft</Badge>;
    case "approved":
      return <Badge variant="outline" className={cn(baseClasses, "border-blue-500 text-blue-600 dark:text-blue-400")}>Approved</Badge>;
    case "paid":
      return <Badge variant="outline" className={cn(baseClasses, "border-green-500 text-green-600 dark:text-green-400")}>Paid</Badge>;
    case "cancelled":
      return <Badge variant="outline" className={cn(baseClasses, "border-red-500 text-red-600 dark:text-red-400")}>Cancelled</Badge>;
    default:
      return <Badge variant="secondary" className={baseClasses}>{status}</Badge>;
  }
}

function formatCurrency(amount: string | number) {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(num);
}

export default function PayRuns() {
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState((new Date().getMonth() + 1).toString());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [viewPayRunId, setViewPayRunId] = useState<string | null>(null);
  const [approvePayRunId, setApprovePayRunId] = useState<string | null>(null);
  const [markPaidPayRunId, setMarkPaidPayRunId] = useState<string | null>(null);

  const { data: payRunsData, isLoading } = useQuery<PayRunResponse>({
    queryKey: ["/api/hr/payroll/pay-runs", page],
  });

  const { data: payRunItems, isLoading: itemsLoading } = useQuery<{ payRun: PayRun; items: PayRunItem[] }>({
    queryKey: ["/api/hr/payroll/pay-runs", viewPayRunId, "items"],
    enabled: !!viewPayRunId,
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/hr/payroll/pay-runs/generate", {
        month: parseInt(selectedMonth),
        year: parseInt(selectedYear),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hr/payroll/pay-runs"] });
      toast({ title: "Pay run generated successfully" });
      setGenerateDialogOpen(false);
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to generate pay run", 
        variant: "destructive" 
      });
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (payRunId: string) => {
      return apiRequest("POST", `/api/hr/payroll/pay-runs/${payRunId}/approve`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hr/payroll/pay-runs"] });
      toast({ title: "Pay run approved successfully" });
      setApprovePayRunId(null);
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to approve pay run", 
        variant: "destructive" 
      });
    },
  });

  const markPaidMutation = useMutation({
    mutationFn: async (payRunId: string) => {
      return apiRequest("POST", `/api/hr/payroll/pay-runs/${payRunId}/mark-paid`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hr/payroll/pay-runs"] });
      toast({ title: "Pay run marked as paid" });
      setMarkPaidPayRunId(null);
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to mark pay run as paid", 
        variant: "destructive" 
      });
    },
  });

  const meta = payRunsData?.meta || { page: 1, limit: 20, total: 0, totalPages: 0 };

  const stats = {
    totalPayRuns: meta.total,
    draft: payRunsData?.data.filter(p => p.status === "draft").length || 0,
    approved: payRunsData?.data.filter(p => p.status === "approved").length || 0,
    paid: payRunsData?.data.filter(p => p.status === "paid").length || 0,
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  return (
    <DashboardLayout title="Pay Runs">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Pay Runs</h1>
          <p className="text-muted-foreground">Generate and manage monthly payroll runs</p>
        </div>
        <Dialog open={generateDialogOpen} onOpenChange={setGenerateDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-generate-pay-run">
              <Play className="mr-2 h-4 w-4" /> Generate Pay Run
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Generate Pay Run</DialogTitle>
              <DialogDescription>Select the month and year to generate payroll for all active employees</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Month</label>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger data-testid="select-month">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((month, i) => (
                      <SelectItem key={i} value={(i + 1).toString()}>
                        {month}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Year</label>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger data-testid="select-year">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button 
                onClick={() => generateMutation.mutate()} 
                disabled={generateMutation.isPending}
                data-testid="button-confirm-generate"
              >
                {generateMutation.isPending ? "Generating..." : "Generate"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pay Runs</CardTitle>
            <Calculator className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPayRuns}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Draft</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.draft}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.approved}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paid</CardTitle>
            <Banknote className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.paid}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pay Run History</CardTitle>
          <CardDescription>View and manage all payroll runs</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : payRunsData?.data?.length ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Period</TableHead>
                    <TableHead>Employees</TableHead>
                    <TableHead>Gross</TableHead>
                    <TableHead>Deductions</TableHead>
                    <TableHead>Net Payout</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payRunsData.data.map((payRun) => (
                    <TableRow key={payRun.id}>
                      <TableCell className="font-medium">
                        {MONTHS[payRun.month - 1]} {payRun.year}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          {payRun.totalEmployees}
                        </div>
                      </TableCell>
                      <TableCell>{formatCurrency(payRun.totalGross)}</TableCell>
                      <TableCell>{formatCurrency(payRun.totalDeductions)}</TableCell>
                      <TableCell className="font-medium">{formatCurrency(payRun.totalNet)}</TableCell>
                      <TableCell>{getStatusBadge(payRun.status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setViewPayRunId(payRun.id)}
                            data-testid={`button-view-${payRun.id}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {payRun.status === "draft" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setApprovePayRunId(payRun.id)}
                              data-testid={`button-approve-${payRun.id}`}
                            >
                              <Check className="h-4 w-4 text-blue-600" />
                            </Button>
                          )}
                          {payRun.status === "approved" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setMarkPaidPayRunId(payRun.id)}
                              data-testid={`button-mark-paid-${payRun.id}`}
                            >
                              <Banknote className="h-4 w-4 text-green-600" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {meta.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Page {meta.page} of {meta.totalPages}
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
                      disabled={page >= meta.totalPages}
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
              <p className="mt-2 text-muted-foreground">No pay runs found</p>
              <p className="text-sm text-muted-foreground">Generate your first pay run to get started</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!viewPayRunId} onOpenChange={(open) => !open && setViewPayRunId(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Pay Run Details - {payRunItems?.payRun && `${MONTHS[payRunItems.payRun.month - 1]} ${payRunItems.payRun.year}`}
            </DialogTitle>
            <DialogDescription>
              View employee-wise payroll breakdown
            </DialogDescription>
          </DialogHeader>
          
          {itemsLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : payRunItems?.items?.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Employee ID</TableHead>
                  <TableHead>Gross</TableHead>
                  <TableHead>Deductions</TableHead>
                  <TableHead>Net Pay</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payRunItems.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      {item.firstName} {item.lastName}
                    </TableCell>
                    <TableCell className="font-mono text-sm">{item.employeeCode}</TableCell>
                    <TableCell>{formatCurrency(item.gross)}</TableCell>
                    <TableCell>{formatCurrency(item.totalDeductions)}</TableCell>
                    <TableCell className="font-medium">{formatCurrency(item.net)}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => window.open(`/api/hr/payroll/payslips/${item.id}/pdf`, "_blank")}
                        data-testid={`button-download-payslip-${item.id}`}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center text-muted-foreground py-4">No items in this pay run</p>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!approvePayRunId} onOpenChange={(open) => !open && setApprovePayRunId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve Pay Run?</AlertDialogTitle>
            <AlertDialogDescription>
              This will approve the pay run for processing. Make sure all details are correct before approving.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => approvePayRunId && approveMutation.mutate(approvePayRunId)}
              disabled={approveMutation.isPending}
            >
              {approveMutation.isPending ? "Approving..." : "Approve"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!markPaidPayRunId} onOpenChange={(open) => !open && setMarkPaidPayRunId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark as Paid?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark the pay run as paid. Make sure all payments have been processed before confirming.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => markPaidPayRunId && markPaidMutation.mutate(markPaidPayRunId)}
              disabled={markPaidMutation.isPending}
            >
              {markPaidMutation.isPending ? "Processing..." : "Mark as Paid"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
