import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdmin, AdminGuard, PermissionGuard } from "@/contexts/admin-context";
import { useState } from "react";
import {
  DollarSign,
  Search,
  TrendingUp,
  CreditCard,
  Receipt,
  Calendar,
  Building2,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  Plus,
  X,
} from "lucide-react";
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
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface BillingStats {
  totalRevenue: number;
  monthlyRecurring: number;
  activeSubscriptions: number;
  pendingInvoices: number;
  revenueChange: number;
  revenueByBusinessType?: Record<string, number>;
  subscriptionsByBusinessType?: Record<string, number>;
}

interface Invoice {
  id: string;
  tenantId: string;
  tenantName: string;
  businessType?: string;
  amount?: number;
  totalAmount?: number;
  currency?: string;
  status: "paid" | "pending" | "overdue" | "cancelled";
  dueDate: string;
  createdAt: string;
}

interface Tenant {
  id: string;
  name: string;
  country?: string;
}

const CURRENCIES = [
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "INR", symbol: "₹", name: "Indian Rupee" },
  { code: "GBP", symbol: "£", name: "British Pound" },
  { code: "AED", symbol: "د.إ", name: "UAE Dirham" },
  { code: "MYR", symbol: "RM", name: "Malaysian Ringgit" },
  { code: "SGD", symbol: "S$", name: "Singapore Dollar" },
];

const BUSINESS_TYPES = [
  { value: "clinic", label: "Clinic" },
  { value: "salon", label: "Salon" },
  { value: "pg", label: "PG/Hostel" },
  { value: "coworking", label: "Coworking" },
  { value: "service", label: "Service" },
  { value: "real_estate", label: "Real Estate" },
  { value: "tourism", label: "Tourism" },
  { value: "education", label: "Education" },
  { value: "logistics", label: "Logistics" },
  { value: "legal", label: "Legal" },
];

const getBusinessTypeLabel = (type: string) => {
  return BUSINESS_TYPES.find((t) => t.value === type)?.label || type;
};

function CreateInvoiceDialog({ 
  open, 
  onOpenChange 
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const [tenantId, setTenantId] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");

  const { data: tenantsData } = useQuery<{ tenants: Tenant[] }>({
    queryKey: ["/api/platform-admin/tenants"],
    enabled: open,
  });

  const createInvoiceMutation = useMutation({
    mutationFn: async (data: { 
      tenantId: string; 
      amount: number; 
      currency: string; 
      description: string; 
      dueDate: string;
    }) => {
      return apiRequest("POST", "/api/platform-admin/billing/invoices", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/platform-admin/billing/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/platform-admin/billing/stats"] });
      toast({ title: "Invoice created successfully" });
      onOpenChange(false);
      setTenantId("");
      setAmount("");
      setCurrency("USD");
      setDescription("");
      setDueDate("");
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create invoice", description: error.message, variant: "destructive" });
    },
  });

  const handleSubmit = () => {
    if (!tenantId || !amount || !dueDate) {
      toast({ title: "Please fill all required fields", variant: "destructive" });
      return;
    }
    createInvoiceMutation.mutate({
      tenantId,
      amount: parseFloat(amount),
      currency,
      description,
      dueDate,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Invoice</DialogTitle>
          <DialogDescription>
            Create a new invoice for a tenant
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="tenant">Tenant *</Label>
            <Select value={tenantId} onValueChange={setTenantId}>
              <SelectTrigger data-testid="select-invoice-tenant">
                <SelectValue placeholder="Select tenant" />
              </SelectTrigger>
              <SelectContent>
                {tenantsData?.tenants?.map((tenant) => (
                  <SelectItem key={tenant.id} value={tenant.id}>
                    {tenant.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                data-testid="input-invoice-amount"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger data-testid="select-invoice-currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((curr) => (
                    <SelectItem key={curr.code} value={curr.code}>
                      {curr.symbol} {curr.code} - {curr.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="dueDate">Due Date *</Label>
            <Input
              id="dueDate"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              min={new Date().toISOString().split("T")[0]}
              data-testid="input-invoice-due-date"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Invoice description or notes..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              data-testid="input-invoice-description"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel-invoice">
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={createInvoiceMutation.isPending}
            data-testid="button-submit-invoice"
          >
            {createInvoiceMutation.isPending ? "Creating..." : "Create Invoice"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BillingContent() {
  const { isSuperAdmin, hasPermission } = useAdmin();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [businessTypeFilter, setBusinessTypeFilter] = useState<string>("all");
  const [displayCurrency, setDisplayCurrency] = useState<string>("USD");
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const { data: stats, isLoading: statsLoading } = useQuery<BillingStats>({
    queryKey: ["/api/platform-admin/billing/stats"],
    staleTime: 60 * 1000,
  });

  const invoicesQueryUrl = statusFilter === "all" 
    ? "/api/platform-admin/billing/invoices" 
    : `/api/platform-admin/billing/invoices?status=${statusFilter}`;
  
  const { data: invoicesData, isLoading: invoicesLoading } = useQuery<{ invoices: Invoice[]; total: number }>({
    queryKey: [invoicesQueryUrl],
    staleTime: 30 * 1000,
  });

  const getStatusBadge = (status: Invoice["status"]) => {
    switch (status) {
      case "paid":
        return <Badge variant="default">Paid</Badge>;
      case "pending":
        return <Badge variant="secondary">Pending</Badge>;
      case "overdue":
        return <Badge variant="destructive">Overdue</Badge>;
      case "cancelled":
        return <Badge variant="outline">Cancelled</Badge>;
    }
  };

  const formatCurrency = (amount: number, currencyCode?: string) => {
    const code = currencyCode || displayCurrency;
    const currency = CURRENCIES.find(c => c.code === code);
    return new Intl.NumberFormat(code === "INR" ? "en-IN" : "en-US", {
      style: "currency",
      currency: code,
      minimumFractionDigits: 2,
    }).format(amount);
  };

  if (statsLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground" data-testid="text-billing-title">
            Billing
          </h1>
          <p className="text-muted-foreground">
            Manage subscriptions, invoices, and revenue
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={displayCurrency} onValueChange={setDisplayCurrency}>
            <SelectTrigger className="w-[140px]" data-testid="select-display-currency">
              <DollarSign className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CURRENCIES.map((curr) => (
                <SelectItem key={curr.code} value={curr.code}>
                  {curr.symbol} {curr.code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {(isSuperAdmin || hasPermission("manage_billing")) && (
            <Button onClick={() => setShowCreateDialog(true)} data-testid="button-create-invoice">
              <Receipt className="h-4 w-4 mr-2" />
              Create Invoice
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-total-revenue">
              {formatCurrency(stats?.totalRevenue || 0)}
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              {stats?.revenueChange && stats.revenueChange >= 0 ? (
                <>
                  <ArrowUpRight className="h-3 w-3 text-green-500" />
                  <span className="text-green-500">+{stats.revenueChange}%</span>
                </>
              ) : (
                <>
                  <ArrowDownRight className="h-3 w-3 text-red-500" />
                  <span className="text-red-500">{stats?.revenueChange}%</span>
                </>
              )}
              <span>from last month</span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Monthly Recurring</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-mrr">
              {formatCurrency(stats?.monthlyRecurring || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">MRR</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Subscriptions</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-subscriptions">
              {stats?.activeSubscriptions || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Paying tenants</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Invoices</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-pending">
              {stats?.pendingInvoices || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Awaiting payment</p>
          </CardContent>
        </Card>
      </div>

      {stats?.revenueByBusinessType && Object.keys(stats.revenueByBusinessType).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Revenue by Business Type</CardTitle>
            <CardDescription>Monthly revenue breakdown across business verticals</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Object.entries(stats.revenueByBusinessType).map(([type, revenue]) => (
                <div
                  key={type}
                  className="flex items-center justify-between p-4 rounded-lg bg-muted/50"
                  data-testid={`revenue-${type}`}
                >
                  <div>
                    <p className="text-sm font-medium">{getBusinessTypeLabel(type)}</p>
                    <p className="text-xs text-muted-foreground">
                      {stats.subscriptionsByBusinessType?.[type] || 0} subscriptions
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold">{formatCurrency(revenue)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Recent Invoices</CardTitle>
          <CardDescription>View and manage billing invoices</CardDescription>
          <div className="flex items-center gap-4 pt-4 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search invoices..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search-invoices"
              />
            </div>
            <Select value={businessTypeFilter} onValueChange={setBusinessTypeFilter}>
              <SelectTrigger className="w-[150px]" data-testid="select-business-type-filter">
                <Building2 className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Business Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {BUSINESS_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]" data-testid="select-status-filter">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {invoicesLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : invoicesData?.invoices?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No invoices found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice ID</TableHead>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Business Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoicesData?.invoices
                  ?.filter(invoice => businessTypeFilter === "all" || invoice.businessType === businessTypeFilter)
                  .map((invoice) => (
                  <TableRow key={invoice.id} data-testid={`row-invoice-${invoice.id}`}>
                    <TableCell className="font-mono text-sm">{invoice.id.slice(0, 8)}...</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        {invoice.tenantName}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {getBusinessTypeLabel(invoice.businessType || "service")}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(invoice.totalAmount || invoice.amount || 0, invoice.currency)}
                    </TableCell>
                    <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {new Date(invoice.dueDate).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {new Date(invoice.createdAt).toLocaleDateString()}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <CreateInvoiceDialog open={showCreateDialog} onOpenChange={setShowCreateDialog} />
    </div>
  );
}

export default function AdminBilling() {
  return (
    <AdminGuard>
      <PermissionGuard permission="view_billing">
        <BillingContent />
      </PermissionGuard>
    </AdminGuard>
  );
}
