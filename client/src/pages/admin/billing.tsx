import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdmin, AdminGuard, PermissionGuard } from "@/contexts/admin-context";
import { useState, useEffect } from "react";
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
  Eye,
  Send,
  MoreHorizontal,
  CheckCircle,
  XCircle,
  Download,
  MessageCircle,
  Mail,
  Copy,
  Users,
  Package,
  Edit,
  Pencil,
  Power,
  PowerOff,
  Archive,
  Loader2,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SiWhatsapp } from "react-icons/si";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
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
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatPrice } from "@/lib/formatPrice";

import {
  FEATURE_CATALOG,
  LIMIT_CATALOG,
  COUNTRIES as PLAN_COUNTRIES,
  CURRENCIES as PLAN_CURRENCIES,
  PLAN_TIERS,
  FEATURE_GROUPS,
  FREE_PLAN_RESTRICTED_FEATURES,
  formatLimitValue,
  type FeatureCatalogItem,
  type LimitCatalogItem,
} from "@shared/billing/feature-catalog";

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
  tenantEmail?: string;
  invoiceNumber?: string;
  businessType?: string;
  planName?: string;
  amount?: number;
  subtotal?: number;
  taxName?: string;
  taxRate?: number;
  taxAmount?: number;
  totalAmount?: number;
  amountPaid?: number;
  amountDue?: number;
  currency?: string;
  country?: string;
  notes?: string;
  status: "paid" | "pending" | "overdue" | "cancelled";
  dueDate: string;
  paidAt?: string;
  createdAt: string;
}

interface Tenant {
  id: string;
  name: string;
  country?: string;
}

interface BillingCycleConfig {
  price: number;
  enabled: boolean;
  badge?: string;
}

interface BillingCyclesMap {
  monthly?: BillingCycleConfig;
  quarterly?: BillingCycleConfig;
  half_yearly?: BillingCycleConfig;
  yearly?: BillingCycleConfig;
}

interface PricingPlan {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  tier: "free" | "starter" | "basic" | "pro" | "enterprise";
  countryCode?: string;
  currencyCode?: string;
  billingCycle?: string;
  basePrice: string;
  billingCycles?: BillingCyclesMap;
  maxUsers?: number;
  maxCustomers?: number;
  features?: string[];
  featureFlags?: Record<string, boolean>;
  limits?: Record<string, number>;
  isActive?: boolean;
  isPublic?: boolean;
  sortOrder?: number;
  archivedAt?: string | null;
  localPrices?: Array<{ country: string; localPrice: string }>;
}

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
                  {PLAN_CURRENCIES.map((curr) => (
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

function InvoiceDetailDialog({ 
  invoice, 
  open, 
  onOpenChange,
  onSend,
  isSending,
  isSuperAdmin,
}: { 
  invoice: Invoice | null;
  open: boolean; 
  onOpenChange: (open: boolean) => void;
  onSend: () => void;
  isSending: boolean;
  isSuperAdmin: boolean;
}) {
  const { toast } = useToast();
  
  const formatCurrency = (amount: string | number | undefined | null, currencyCode?: string) => {
    if (amount === undefined || amount === null || amount === "") return "-";
    const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;
    if (isNaN(numAmount)) return "-";
    const code = currencyCode || "USD";
    return new Intl.NumberFormat(code === "INR" ? "en-IN" : "en-US", {
      style: "currency",
      currency: code,
      minimumFractionDigits: 2,
    }).format(numAmount);
  };

  const handleDownloadPdf = async () => {
    if (!invoice) return;
    try {
      const token = localStorage.getItem("mybizstream_admin_token");
      const response = await fetch(`/api/platform-admin/billing/invoices/${invoice.id}/pdf`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!response.ok) throw new Error("Failed to generate PDF");
      
      const html = await response.text();
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
        // Add print button and auto-trigger print
        setTimeout(() => {
          printWindow.print();
        }, 500);
      }
      toast({ title: "Invoice opened. Use browser print (Ctrl+P) to save as PDF." });
    } catch (error) {
      toast({ title: "Failed to download PDF", variant: "destructive" });
    }
  };

  const handleShareWhatsApp = () => {
    if (!invoice) return;
    const amount = formatCurrency(invoice.totalAmount || invoice.amount, invoice.currency);
    const dueDate = new Date(invoice.dueDate).toLocaleDateString();
    const message = encodeURIComponent(
      `Invoice: ${invoice.invoiceNumber || invoice.id}\n` +
      `Amount: ${amount}\n` +
      `Due Date: ${dueDate}\n` +
      `Status: ${invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}`
    );
    window.open(`https://wa.me/?text=${message}`, "_blank");
  };

  if (!invoice) return null;

  const businessTypeLabels: Record<string, string> = {
    clinic: "Healthcare / Clinic",
    salon: "Salon & Beauty",
    pg: "PG / Hostel",
    coworking: "Coworking / Gym",
    service: "General Services",
    real_estate: "Real Estate",
    tourism: "Tourism & Travel",
    education: "Education / Coaching",
    logistics: "Logistics",
    legal: "Legal Services"
  };

  const countryLabels: Record<string, string> = {
    india: "India", uk: "United Kingdom", uae: "UAE", 
    malaysia: "Malaysia", singapore: "Singapore", other: "Other"
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[650px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="flex items-center">
              <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="logoGradDialog" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style={{stopColor: "#3B82F6", stopOpacity: 1}} />
                    <stop offset="100%" style={{stopColor: "#1D4ED8", stopOpacity: 1}} />
                  </linearGradient>
                </defs>
                <rect x="0" y="1" width="32" height="30" rx="6" fill="url(#logoGradDialog)"/>
                <path d="M8 11h16M8 16h12M8 21h14" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
              </svg>
            </div>
            <div>
              <span className="text-lg">Invoice Details</span>
              <p className="text-sm font-normal text-muted-foreground">{invoice.invoiceNumber || invoice.id}</p>
            </div>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground text-xs uppercase tracking-wide">Bill To</Label>
              <p className="font-semibold text-base">{invoice.tenantName}</p>
              {invoice.tenantEmail && <p className="text-sm text-muted-foreground">{invoice.tenantEmail}</p>}
            </div>
            <div className="text-right">
              <Label className="text-muted-foreground text-xs uppercase tracking-wide">Status</Label>
              <div className="mt-1">
                <Badge variant={invoice.status === "paid" ? "default" : invoice.status === "overdue" ? "destructive" : "secondary"}>
                  {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                </Badge>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <Label className="text-muted-foreground text-xs uppercase tracking-wide">Country</Label>
              <p className="font-medium">{countryLabels[invoice.country || ""] || invoice.country || "-"}</p>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs uppercase tracking-wide">Currency</Label>
              <p className="font-medium">{invoice.currency || "USD"}</p>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs uppercase tracking-wide">Business Type</Label>
              <p className="font-medium">{businessTypeLabels[invoice.businessType || ""] || invoice.businessType || "Service"}</p>
            </div>
          </div>

          <div className="border-t pt-4">
            <Label className="text-primary text-xs uppercase tracking-wide font-semibold mb-2 block">Services Availed</Label>
            <div className="bg-muted/30 rounded-lg p-3 mb-3">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium">{invoice.planName || "Pro"} Plan Subscription</p>
                  <p className="text-xs text-muted-foreground">{businessTypeLabels[invoice.businessType || ""] || "Business Services"}</p>
                </div>
                <span className="font-mono">{formatCurrency(invoice.subtotal, invoice.currency)}</span>
              </div>
            </div>
          </div>

          <div className="bg-muted/20 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-mono">{formatCurrency(invoice.subtotal, invoice.currency)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {invoice.taxName || "Tax"} ({invoice.taxRate || 0}%)
              </span>
              <span className="font-mono">{formatCurrency(invoice.taxAmount, invoice.currency)}</span>
            </div>
            <div className="flex justify-between font-bold text-base border-t pt-2 mt-2">
              <span>Total</span>
              <span className="font-mono">{formatCurrency(invoice.totalAmount || invoice.amount, invoice.currency)}</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 bg-muted/10 rounded-lg p-4 text-sm">
            <div>
              <Label className="text-muted-foreground text-xs uppercase">Amount Paid</Label>
              <p className="font-semibold text-green-600 dark:text-green-400">{formatCurrency(invoice.amountPaid, invoice.currency)}</p>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs uppercase">Amount Due</Label>
              <p className="font-semibold text-red-600 dark:text-red-400">{formatCurrency(invoice.amountDue, invoice.currency)}</p>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs uppercase">Due Date</Label>
              <p className="font-medium">{new Date(invoice.dueDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <Label className="text-muted-foreground text-xs uppercase">Created</Label>
              <p className="font-medium">{new Date(invoice.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</p>
            </div>
            {invoice.paidAt && (
              <div>
                <Label className="text-muted-foreground text-xs uppercase">Paid On</Label>
                <p className="font-medium text-green-600 dark:text-green-400">{new Date(invoice.paidAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</p>
              </div>
            )}
          </div>

          {invoice.notes && (
            <div className="bg-amber-50 dark:bg-amber-950/30 border-l-4 border-amber-400 p-3 rounded-r-lg">
              <Label className="text-amber-700 dark:text-amber-400 text-xs uppercase font-semibold">Notes</Label>
              <p className="text-sm text-amber-800 dark:text-amber-300 mt-1">{invoice.notes}</p>
            </div>
          )}
        </div>
        <DialogFooter className="flex-wrap gap-2">
          <div className="flex gap-2 flex-1">
            <Button variant="outline" size="icon" onClick={handleDownloadPdf} data-testid="button-download-pdf">
              <Download className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={handleShareWhatsApp} data-testid="button-share-whatsapp">
              <SiWhatsapp className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-close-invoice-detail">
              Close
            </Button>
            {isSuperAdmin && invoice.status === "pending" && (
              <Button onClick={onSend} disabled={isSending} data-testid="button-send-invoice">
                <Send className="h-4 w-4 mr-2" />
                {isSending ? "Sending..." : "Send Invoice"}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface EmailData {
  to: string;
  cc: string;
  bcc: string;
  subject: string;
  message: string;
}

function SendEmailDialog({
  invoice,
  open,
  onOpenChange,
  onSend,
  isSending,
}: {
  invoice: Invoice | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSend: (emailData: EmailData) => void;
  isSending: boolean;
}) {
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  
  const formatCurrency = (amount: string | number | undefined | null, currencyCode?: string) => {
    if (amount === undefined || amount === null || amount === "") return "-";
    const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;
    if (isNaN(numAmount)) return "-";
    const code = currencyCode || "USD";
    return new Intl.NumberFormat(code === "INR" ? "en-IN" : "en-US", {
      style: "currency",
      currency: code,
      minimumFractionDigits: 2,
    }).format(numAmount);
  };

  const defaultSubject = invoice 
    ? `Invoice ${invoice.invoiceNumber || invoice.id} from MyBizStream - ${formatCurrency(invoice.totalAmount || invoice.amount, invoice.currency)} Due`
    : "Invoice from MyBizStream";

  const defaultMessage = invoice ? `Dear ${invoice.tenantName},

Please find attached your invoice details:

Invoice Number: ${invoice.invoiceNumber || invoice.id}
Amount Due: ${formatCurrency(invoice.amountDue || invoice.totalAmount || invoice.amount, invoice.currency)}
Due Date: ${new Date(invoice.dueDate).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}

Invoice Breakdown:
- Subtotal: ${formatCurrency(invoice.subtotal, invoice.currency)}
- ${invoice.taxName || "Tax"} (${invoice.taxRate || 0}%): ${formatCurrency(invoice.taxAmount, invoice.currency)}
- Total: ${formatCurrency(invoice.totalAmount || invoice.amount, invoice.currency)}

Please ensure payment is made by the due date to avoid any service interruption.

Payment Methods:
- Bank Transfer
- Credit/Debit Card
- UPI (for India)

If you have any questions regarding this invoice, please don't hesitate to contact us.

Thank you for your business!

Best regards,
MyBizStream Team
support@mybizstream.app` : "";

  const [emailData, setEmailData] = useState<EmailData>({
    to: "",
    cc: "",
    bcc: "",
    subject: "",
    message: "",
  });

  useEffect(() => {
    if (open && invoice) {
      setEmailData({
        to: invoice.tenantEmail || "",
        cc: "",
        bcc: "",
        subject: defaultSubject,
        message: defaultMessage,
      });
      setShowCc(false);
      setShowBcc(false);
    }
  }, [open, invoice]);

  const handleSend = () => {
    onSend(emailData);
  };

  if (!invoice) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            Compose Invoice Email
          </DialogTitle>
          <DialogDescription>
            Send invoice {invoice.invoiceNumber || invoice.id} to {invoice.tenantName}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Label className="w-16 text-right text-sm font-medium">To:</Label>
              <div className="flex-1 flex gap-2">
                <Input
                  value={emailData.to}
                  onChange={(e) => setEmailData({ ...emailData, to: e.target.value })}
                  placeholder="recipient@example.com"
                  className="flex-1"
                  data-testid="input-email-to"
                />
                <div className="flex gap-1">
                  {!showCc && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setShowCc(true)}
                      className="text-xs text-muted-foreground"
                    >
                      Cc
                    </Button>
                  )}
                  {!showBcc && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setShowBcc(true)}
                      className="text-xs text-muted-foreground"
                    >
                      Bcc
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {showCc && (
              <div className="flex items-center gap-2">
                <Label className="w-16 text-right text-sm font-medium">Cc:</Label>
                <div className="flex-1 flex gap-2">
                  <Input
                    value={emailData.cc}
                    onChange={(e) => setEmailData({ ...emailData, cc: e.target.value })}
                    placeholder="cc@example.com (comma-separated for multiple)"
                    className="flex-1"
                    data-testid="input-email-cc"
                  />
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => { setShowCc(false); setEmailData({ ...emailData, cc: "" }); }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {showBcc && (
              <div className="flex items-center gap-2">
                <Label className="w-16 text-right text-sm font-medium">Bcc:</Label>
                <div className="flex-1 flex gap-2">
                  <Input
                    value={emailData.bcc}
                    onChange={(e) => setEmailData({ ...emailData, bcc: e.target.value })}
                    placeholder="bcc@example.com (comma-separated for multiple)"
                    className="flex-1"
                    data-testid="input-email-bcc"
                  />
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => { setShowBcc(false); setEmailData({ ...emailData, bcc: "" }); }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="border-t pt-4">
            <div className="flex items-center gap-2 mb-3">
              <Label className="w-16 text-right text-sm font-medium">Subject:</Label>
              <Input
                value={emailData.subject}
                onChange={(e) => setEmailData({ ...emailData, subject: e.target.value })}
                placeholder="Email subject"
                className="flex-1"
                data-testid="input-email-subject"
              />
            </div>
          </div>

          <div className="border-t pt-4">
            <Label className="text-sm font-medium mb-2 block">Message:</Label>
            <Textarea
              value={emailData.message}
              onChange={(e) => setEmailData({ ...emailData, message: e.target.value })}
              placeholder="Email message..."
              className="min-h-[280px] font-mono text-sm"
              data-testid="textarea-email-message"
            />
          </div>

          <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300 mb-2">
              <Download className="h-4 w-4" />
              <span className="font-medium">Attachment</span>
            </div>
            <div className="flex items-center gap-3 bg-white dark:bg-blue-900/30 rounded-md p-2 border border-blue-100 dark:border-blue-800">
              <div className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">PDF</div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">Invoice_{invoice.invoiceNumber || invoice.id.slice(0, 8)}.pdf</p>
                <p className="text-xs text-muted-foreground">Invoice document will be attached automatically</p>
              </div>
              <Receipt className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>

          <div className="bg-muted/30 rounded-lg p-3 border">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <Receipt className="h-4 w-4" />
              <span className="font-medium">Invoice Summary</span>
            </div>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Invoice:</span>
                <p className="font-mono">{invoice.invoiceNumber || invoice.id.slice(0, 8)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Amount:</span>
                <p className="font-semibold">{formatCurrency(invoice.totalAmount || invoice.amount, invoice.currency)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Due:</span>
                <p>{new Date(invoice.dueDate).toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel-email">
            Cancel
          </Button>
          <Button 
            onClick={handleSend} 
            disabled={isSending || !emailData.to.trim()}
            data-testid="button-send-email"
          >
            <Send className="h-4 w-4 mr-2" />
            {isSending ? "Sending..." : "Send Email"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function getDefaultFeatureFlags(): Record<string, boolean> {
  const flags: Record<string, boolean> = {};
  FEATURE_CATALOG.forEach(f => { flags[f.key] = false; });
  return flags;
}

function getDefaultLimits(): Record<string, number> {
  const limits: Record<string, number> = {};
  LIMIT_CATALOG.forEach(l => { limits[l.key] = l.defaultValue; });
  return limits;
}

interface PlanBuilderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan?: PricingPlan | null;
}

function PlanBuilderDialog({ open, onOpenChange, plan }: PlanBuilderDialogProps) {
  const { toast } = useToast();
  const isEditing = !!plan;
  
  const getDefaultBillingCycles = (): BillingCyclesMap => ({
    monthly: { price: 0, enabled: true },
    yearly: { price: 0, enabled: false },
  });

  const [formData, setFormData] = useState(() => ({
    code: "",
    name: "",
    description: "",
    tier: "basic",
    countryCode: "IN",
    currencyCode: "INR",
    billingCycle: "monthly" as "monthly" | "yearly",
    basePrice: "0",
    billingCycles: getDefaultBillingCycles(),
    isPublic: true,
    sortOrder: 100,
    featureFlags: getDefaultFeatureFlags(),
    limits: getDefaultLimits(),
  }));

  useEffect(() => {
    if (plan) {
      const defaultFlags = getDefaultFeatureFlags();
      const defaultLimits = getDefaultLimits();
      const defaultCycles = getDefaultBillingCycles();
      const planCycles = plan.billingCycles || {};
      const mergedCycles: BillingCyclesMap = {
        monthly: planCycles.monthly || defaultCycles.monthly,
        yearly: planCycles.yearly || defaultCycles.yearly,
      };
      if (!mergedCycles.monthly?.enabled && parseFloat(plan.basePrice) > 0) {
        mergedCycles.monthly = { price: parseFloat(plan.basePrice), enabled: true };
      }
      setFormData({
        code: plan.code,
        name: plan.name,
        description: plan.description || "",
        tier: plan.tier,
        countryCode: plan.countryCode || "IN",
        currencyCode: plan.currencyCode || "INR",
        billingCycle: (plan.billingCycle as "monthly" | "yearly") || "monthly",
        basePrice: plan.basePrice,
        billingCycles: mergedCycles,
        isPublic: plan.isPublic ?? true,
        sortOrder: plan.sortOrder ?? 100,
        featureFlags: { ...defaultFlags, ...(plan.featureFlags || {}) },
        limits: { ...defaultLimits, ...(plan.limits || {}) },
      });
    } else {
      setFormData({
        code: "",
        name: "",
        description: "",
        tier: "basic",
        countryCode: "IN",
        currencyCode: "INR",
        billingCycle: "monthly",
        basePrice: "0",
        billingCycles: getDefaultBillingCycles(),
        isPublic: true,
        sortOrder: 100,
        featureFlags: getDefaultFeatureFlags(),
        limits: getDefaultLimits(),
      });
    }
  }, [plan, open]);

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return apiRequest("POST", "/api/admin/billing/plans", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/billing/plans"] });
      toast({ title: "Plan created successfully" });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create plan", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<typeof formData>) => {
      return apiRequest("PATCH", `/api/admin/billing/plans/${plan?.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/billing/plans"] });
      toast({ title: "Plan updated successfully" });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update plan", description: error.message, variant: "destructive" });
    },
  });

  const handleSubmit = () => {
    if (!formData.code || !formData.name || !formData.basePrice) {
      toast({ title: "Please fill required fields", variant: "destructive" });
      return;
    }
    if (isEditing) {
      const { code, ...updateData } = formData;
      updateMutation.mutate(updateData);
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleCountryChange = (countryCode: string) => {
    const country = PLAN_COUNTRIES.find(c => c.code === countryCode);
    setFormData(prev => ({
      ...prev,
      countryCode,
      currencyCode: country?.currency || prev.currencyCode,
    }));
  };

  const toggleFeature = (key: string) => {
    setFormData(prev => ({
      ...prev,
      featureFlags: {
        ...prev.featureFlags,
        [key]: !prev.featureFlags[key],
      },
    }));
  };

  const setLimit = (key: string, value: number) => {
    setFormData(prev => ({
      ...prev,
      limits: {
        ...prev.limits,
        [key]: value,
      },
    }));
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Plan" : "Create Plan"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Update plan details and features" : "Create a new pricing plan"}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="code">Code *</Label>
                <Input
                  id="code"
                  placeholder="e.g., india_basic"
                  value={formData.code}
                  onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                  disabled={isEditing}
                  data-testid="input-plan-code"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., Basic Plan"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  data-testid="input-plan-name"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Plan description..."
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                data-testid="input-plan-description"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Tier *</Label>
                <Select value={formData.tier} onValueChange={(v) => setFormData(prev => ({ ...prev, tier: v }))}>
                  <SelectTrigger data-testid="select-plan-tier">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PLAN_TIERS.map(tier => (
                      <SelectItem key={tier.value} value={tier.value}>{tier.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Country *</Label>
                <Select value={formData.countryCode} onValueChange={handleCountryChange} disabled={isEditing}>
                  <SelectTrigger data-testid="select-plan-country">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PLAN_COUNTRIES.map(c => (
                      <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Currency *</Label>
                <Select value={formData.currencyCode} onValueChange={(v) => setFormData(prev => ({ ...prev, currencyCode: v }))} disabled={isEditing}>
                  <SelectTrigger data-testid="select-plan-currency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PLAN_CURRENCIES.map(c => (
                      <SelectItem key={c.code} value={c.code}>{c.code} ({c.symbol})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Billing Cycle</Label>
                <Select value={formData.billingCycle} onValueChange={(v) => setFormData(prev => ({ ...prev, billingCycle: v as "monthly" | "yearly" }))}>
                  <SelectTrigger data-testid="select-plan-cycle">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="basePrice">Base Price *</Label>
                <Input
                  id="basePrice"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.basePrice}
                  onChange={(e) => setFormData(prev => ({ ...prev, basePrice: e.target.value }))}
                  data-testid="input-plan-price"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sortOrder">Sort Order</Label>
                <Input
                  id="sortOrder"
                  type="number"
                  value={formData.sortOrder}
                  onChange={(e) => setFormData(prev => ({ ...prev, sortOrder: parseInt(e.target.value) || 0 }))}
                  data-testid="input-plan-sort"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="isPublic"
                checked={formData.isPublic}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isPublic: checked }))}
                data-testid="switch-plan-public"
              />
              <Label htmlFor="isPublic">Visible to tenants</Label>
            </div>

            <div className="space-y-3 border rounded-lg p-4 bg-muted/30">
              <Label className="text-base font-medium">Billing Cycles</Label>
              <p className="text-sm text-muted-foreground">Configure pricing for each billing cycle</p>
              
              <div className="space-y-4">
                <div className="flex items-start gap-4 p-3 border rounded-md bg-background">
                  <div className="flex items-center space-x-2 pt-1">
                    <Switch
                      id="cycle-monthly"
                      checked={formData.billingCycles.monthly?.enabled ?? true}
                      onCheckedChange={(checked) => setFormData(prev => ({
                        ...prev,
                        billingCycles: {
                          ...prev.billingCycles,
                          monthly: { ...prev.billingCycles.monthly!, enabled: checked },
                        },
                      }))}
                      data-testid="switch-cycle-monthly"
                    />
                  </div>
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="cycle-monthly" className="font-medium">Monthly</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs text-muted-foreground">Price</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={formData.billingCycles.monthly?.price ?? 0}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            billingCycles: {
                              ...prev.billingCycles,
                              monthly: { ...prev.billingCycles.monthly!, price: parseFloat(e.target.value) || 0 },
                            },
                            basePrice: e.target.value,
                          }))}
                          disabled={!formData.billingCycles.monthly?.enabled}
                          data-testid="input-cycle-monthly-price"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Badge (optional)</Label>
                        <Input
                          placeholder="e.g., Popular"
                          value={formData.billingCycles.monthly?.badge ?? ""}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            billingCycles: {
                              ...prev.billingCycles,
                              monthly: { ...prev.billingCycles.monthly!, badge: e.target.value || undefined },
                            },
                          }))}
                          disabled={!formData.billingCycles.monthly?.enabled}
                          data-testid="input-cycle-monthly-badge"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-3 border rounded-md bg-background">
                  <div className="flex items-center space-x-2 pt-1">
                    <Switch
                      id="cycle-yearly"
                      checked={formData.billingCycles.yearly?.enabled ?? false}
                      onCheckedChange={(checked) => setFormData(prev => ({
                        ...prev,
                        billingCycles: {
                          ...prev.billingCycles,
                          yearly: { ...prev.billingCycles.yearly!, enabled: checked },
                        },
                      }))}
                      data-testid="switch-cycle-yearly"
                    />
                  </div>
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="cycle-yearly" className="font-medium">Yearly</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs text-muted-foreground">Price</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={formData.billingCycles.yearly?.price ?? 0}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            billingCycles: {
                              ...prev.billingCycles,
                              yearly: { ...prev.billingCycles.yearly!, price: parseFloat(e.target.value) || 0 },
                            },
                          }))}
                          disabled={!formData.billingCycles.yearly?.enabled}
                          data-testid="input-cycle-yearly-price"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Badge (optional)</Label>
                        <Input
                          placeholder="e.g., 2 months free"
                          value={formData.billingCycles.yearly?.badge ?? ""}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            billingCycles: {
                              ...prev.billingCycles,
                              yearly: { ...prev.billingCycles.yearly!, badge: e.target.value || undefined },
                            },
                          }))}
                          disabled={!formData.billingCycles.yearly?.enabled}
                          data-testid="input-cycle-yearly-badge"
                        />
                      </div>
                    </div>
                    {formData.billingCycles.yearly?.enabled && (formData.billingCycles.monthly?.price ?? 0) > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {(() => {
                          const monthlyTotal = (formData.billingCycles.monthly?.price ?? 0) * 12;
                          const yearlyPrice = formData.billingCycles.yearly?.price ?? 0;
                          const savings = monthlyTotal - yearlyPrice;
                          const percent = monthlyTotal > 0 ? Math.round((savings / monthlyTotal) * 100) : 0;
                          return savings > 0 ? `Saves ${percent}% (${formData.currencyCode} ${savings.toFixed(2)}/year)` : "";
                        })()}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <Label>Features</Label>
              {(Object.keys(FEATURE_GROUPS) as Array<keyof typeof FEATURE_GROUPS>).map(groupKey => {
                const groupFeatures = FEATURE_CATALOG.filter(f => f.group === groupKey);
                if (groupFeatures.length === 0) return null;
                return (
                  <div key={groupKey} className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">{FEATURE_GROUPS[groupKey]}</p>
                    <div className="grid grid-cols-2 gap-2 pl-2">
                      {groupFeatures.map(feature => {
                        const isRestricted = formData.tier === "free" && FREE_PLAN_RESTRICTED_FEATURES.includes(feature.key);
                        return (
                          <div key={feature.key} className="flex items-center space-x-2">
                            <Checkbox
                              id={`feature-${feature.key}`}
                              checked={!!formData.featureFlags[feature.key]}
                              onCheckedChange={() => !isRestricted && toggleFeature(feature.key)}
                              disabled={isRestricted}
                              data-testid={`checkbox-feature-${feature.key}`}
                            />
                            <Label 
                              htmlFor={`feature-${feature.key}`} 
                              className={`text-sm font-normal cursor-pointer ${isRestricted ? "text-muted-foreground" : ""}`}
                              title={feature.description}
                            >
                              {feature.label}
                              {isRestricted && <span className="text-xs text-destructive ml-1">(Not available on Free)</span>}
                            </Label>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <Label>Limits</Label>
                <p className="text-xs text-muted-foreground">Use -1 for Unlimited, 0 for Not Available</p>
              </div>
              <div className="grid grid-cols-3 gap-4">
                {LIMIT_CATALOG.map(limit => (
                  <div key={limit.key} className="space-y-1">
                    <Label htmlFor={`limit-${limit.key}`} className="text-xs">{limit.label}</Label>
                    <Input
                      id={`limit-${limit.key}`}
                      type="number"
                      min="-1"
                      value={formData.limits[limit.key] ?? limit.defaultValue}
                      onChange={(e) => setLimit(limit.key, parseInt(e.target.value) || 0)}
                      data-testid={`input-limit-${limit.key}`}
                    />
                    <p className="text-xs text-muted-foreground">{limit.description}</p>
                    {(formData.limits[limit.key] ?? limit.defaultValue) !== 0 && (
                      <p className="text-xs font-medium">{formatLimitValue(formData.limits[limit.key] ?? limit.defaultValue)}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-md border p-3 bg-muted/50">
              <Label className="text-sm font-medium">Live Preview</Label>
              <div className="mt-2 space-y-1 text-sm">
                <p><span className="text-muted-foreground">Enabled:</span> {Object.entries(formData.featureFlags).filter(([_, v]) => v).map(([k]) => FEATURE_CATALOG.find(f => f.key === k)?.label || k).join(", ") || "None"}</p>
                <p><span className="text-muted-foreground">Limits:</span> {Object.entries(formData.limits).map(([k, v]) => `${LIMIT_CATALOG.find(l => l.key === k)?.label || k}: ${formatLimitValue(v)}`).join(", ")}</p>
              </div>
            </div>
          </div>
        </ScrollArea>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel-plan">
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isPending} data-testid="button-save-plan">
            {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isEditing ? "Update Plan" : "Create Plan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PlansManagement() {
  const { isSuperAdmin, hasPermission } = useAdmin();
  const { toast } = useToast();
  const canManagePlans = isSuperAdmin || hasPermission("MANAGE_PLANS_PRICING");
  const [showPlanBuilder, setShowPlanBuilder] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PricingPlan | null>(null);

  const { data: plansData, isLoading } = useQuery<{ plans: PricingPlan[] }>({
    queryKey: ["/api/admin/billing/plans"],
    staleTime: 60 * 1000,
  });

  const activateMutation = useMutation({
    mutationFn: async (planId: string) => {
      return apiRequest("POST", `/api/admin/billing/plans/${planId}/activate`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/billing/plans"] });
      toast({ title: "Plan activated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to activate plan", description: error.message, variant: "destructive" });
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: async (planId: string) => {
      return apiRequest("POST", `/api/admin/billing/plans/${planId}/deactivate`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/billing/plans"] });
      toast({ title: "Plan deactivated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to deactivate plan", description: error.message, variant: "destructive" });
    },
  });

  const getTierBadge = (tier: string) => {
    switch (tier) {
      case "free":
        return <Badge variant="secondary">Free</Badge>;
      case "starter":
        return <Badge variant="outline">Starter</Badge>;
      case "pro":
        return <Badge variant="default">Pro</Badge>;
      case "enterprise":
        return <Badge className="bg-purple-500 hover:bg-purple-600">Enterprise</Badge>;
      default:
        return <Badge variant="outline">{tier}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  return (
    <>
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4 pb-4 flex-wrap">
        <div>
          <CardTitle>Pricing Plans</CardTitle>
          <CardDescription>
            {canManagePlans 
              ? "Manage pricing plans, create, edit, or archive plans" 
              : "View available pricing plans"}
          </CardDescription>
        </div>
        {canManagePlans && (
          <Button onClick={() => { setEditingPlan(null); setShowPlanBuilder(true); }} data-testid="button-create-plan">
            <Plus className="h-4 w-4 mr-2" />
            Create Plan
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {plansData?.plans?.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No pricing plans found</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead>Base Price</TableHead>
                <TableHead>Limits</TableHead>
                <TableHead>Status</TableHead>
                {canManagePlans && <TableHead className="w-[100px]">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {plansData?.plans?.map((plan) => (
                <TableRow key={plan.id} data-testid={`row-plan-${plan.id}`}>
                  <TableCell className="font-mono text-sm">{plan.code}</TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{plan.name}</p>
                      {plan.description && (
                        <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                          {plan.description}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{getTierBadge(plan.tier)}</TableCell>
                  <TableCell className="font-medium">{formatPrice(plan.basePrice, plan.currencyCode || "INR")}</TableCell>
                  <TableCell>
                    <div className="text-xs text-muted-foreground">
                      <div>{plan.maxUsers || "Unlimited"} users</div>
                      <div>{plan.maxCustomers || "Unlimited"} customers</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {plan.isActive ? (
                      <Badge variant="default" className="bg-green-500 hover:bg-green-600">Active</Badge>
                    ) : (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                  </TableCell>
                  {canManagePlans && (
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" data-testid={`button-plan-actions-${plan.id}`}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem 
                            onClick={() => { setEditingPlan(plan); setShowPlanBuilder(true); }}
                            data-testid={`menu-edit-plan-${plan.id}`}
                          >
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          {plan.isActive ? (
                            <DropdownMenuItem 
                              onClick={() => deactivateMutation.mutate(plan.id)}
                              disabled={deactivateMutation.isPending}
                              data-testid={`menu-deactivate-plan-${plan.id}`}
                            >
                              <PowerOff className="h-4 w-4 mr-2" />
                              Deactivate
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem 
                              onClick={() => activateMutation.mutate(plan.id)}
                              disabled={activateMutation.isPending}
                              data-testid={`menu-activate-plan-${plan.id}`}
                            >
                              <Power className="h-4 w-4 mr-2" />
                              Activate
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
    <PlanBuilderDialog
      open={showPlanBuilder}
      onOpenChange={(open) => {
        setShowPlanBuilder(open);
        if (!open) setEditingPlan(null);
      }}
      plan={editingPlan}
    />
    </>
  );
}

interface BillingOffer {
  id: string;
  name: string;
  description?: string | null;
  countryCode?: string | null;
  planCode?: string | null;
  offerType: "PERCENT" | "FLAT";
  value: string;
  billingCycle?: string | null;
  couponCode?: string | null;
  validFrom?: string | null;
  validTo?: string | null;
  maxRedemptions?: number | null;
  perTenantLimit?: number | null;
  redemptionCount?: number | null;
  isActive?: boolean;
  createdAt?: string;
}

function OffersManagement() {
  const { isSuperAdmin, hasPermission } = useAdmin();
  const { toast } = useToast();
  const canManageOffers = isSuperAdmin || hasPermission("MANAGE_PLANS_PRICING");
  const [showOfferDialog, setShowOfferDialog] = useState(false);
  const [editingOffer, setEditingOffer] = useState<BillingOffer | null>(null);

  const { data: offersData, isLoading } = useQuery<{ offers: BillingOffer[] }>({
    queryKey: ["/api/admin/billing/offers"],
    staleTime: 60 * 1000,
  });

  const toggleMutation = useMutation({
    mutationFn: async (offerId: string) => {
      return apiRequest("POST", `/api/admin/billing/offers/${offerId}/toggle`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/billing/offers"] });
      toast({ title: "Offer status updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update offer", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (offerId: string) => {
      return apiRequest("DELETE", `/api/admin/billing/offers/${offerId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/billing/offers"] });
      toast({ title: "Offer deleted" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete offer", description: error.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 pb-4 flex-wrap">
          <div>
            <CardTitle>Billing Offers</CardTitle>
            <CardDescription>
              {canManageOffers 
                ? "Manage discounts, coupons, and promotional offers" 
                : "View available offers"}
            </CardDescription>
          </div>
          {canManageOffers && (
            <Button onClick={() => { setEditingOffer(null); setShowOfferDialog(true); }} data-testid="button-create-offer">
              <Plus className="h-4 w-4 mr-2" />
              Create Offer
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {offersData?.offers?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No offers found</p>
              {canManageOffers && (
                <p className="text-sm mt-2">Create an offer to get started</p>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Coupon</TableHead>
                  <TableHead>Validity</TableHead>
                  <TableHead>Redemptions</TableHead>
                  <TableHead>Status</TableHead>
                  {canManageOffers && <TableHead className="w-[100px]">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {offersData?.offers?.map((offer) => (
                  <TableRow key={offer.id} data-testid={`row-offer-${offer.id}`}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{offer.name}</p>
                        {offer.description && (
                          <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {offer.description}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{offer.offerType}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      {offer.offerType === "PERCENT" ? `${offer.value}%` : `₹${offer.value}`}
                    </TableCell>
                    <TableCell>
                      {offer.couponCode ? (
                        <Badge variant="secondary" className="font-mono">{offer.couponCode}</Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">Auto</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {offer.validFrom || offer.validTo ? (
                        <div className="text-xs">
                          {offer.validFrom && <div>From: {new Date(offer.validFrom).toLocaleDateString()}</div>}
                          {offer.validTo && <div>To: {new Date(offer.validTo).toLocaleDateString()}</div>}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Always</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {offer.redemptionCount || 0}
                        {offer.maxRedemptions && ` / ${offer.maxRedemptions}`}
                      </span>
                    </TableCell>
                    <TableCell>
                      {offer.isActive ? (
                        <Badge variant="default" className="bg-green-500">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </TableCell>
                    {canManageOffers && (
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" data-testid={`button-offer-actions-${offer.id}`}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem 
                              onClick={() => { setEditingOffer(offer); setShowOfferDialog(true); }}
                              data-testid={`menu-edit-offer-${offer.id}`}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => toggleMutation.mutate(offer.id)}
                              disabled={toggleMutation.isPending}
                              data-testid={`menu-toggle-offer-${offer.id}`}
                            >
                              {offer.isActive ? (
                                <>
                                  <PowerOff className="h-4 w-4 mr-2" />
                                  Deactivate
                                </>
                              ) : (
                                <>
                                  <Power className="h-4 w-4 mr-2" />
                                  Activate
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => {
                                if (confirm("Are you sure you want to delete this offer?")) {
                                  deleteMutation.mutate(offer.id);
                                }
                              }}
                              disabled={deleteMutation.isPending}
                              className="text-destructive"
                              data-testid={`menu-delete-offer-${offer.id}`}
                            >
                              <X className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      <OfferBuilderDialog
        open={showOfferDialog}
        onOpenChange={(open) => {
          setShowOfferDialog(open);
          if (!open) setEditingOffer(null);
        }}
        offer={editingOffer}
      />
    </>
  );
}

interface OfferBuilderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  offer?: BillingOffer | null;
}

function OfferBuilderDialog({ open, onOpenChange, offer }: OfferBuilderDialogProps) {
  const { toast } = useToast();
  const isEditing = !!offer;
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    countryCode: "",
    planCode: "",
    offerType: "PERCENT" as "PERCENT" | "FLAT",
    value: "10",
    billingCycle: "",
    couponCode: "",
    validFrom: "",
    validTo: "",
    maxRedemptions: "",
    perTenantLimit: "1",
    isActive: true,
  });

  useEffect(() => {
    if (offer) {
      setFormData({
        name: offer.name,
        description: offer.description || "",
        countryCode: offer.countryCode || "",
        planCode: offer.planCode || "",
        offerType: offer.offerType,
        value: offer.value,
        billingCycle: offer.billingCycle || "",
        couponCode: offer.couponCode || "",
        validFrom: offer.validFrom ? new Date(offer.validFrom).toISOString().split("T")[0] : "",
        validTo: offer.validTo ? new Date(offer.validTo).toISOString().split("T")[0] : "",
        maxRedemptions: offer.maxRedemptions?.toString() || "",
        perTenantLimit: offer.perTenantLimit?.toString() || "1",
        isActive: offer.isActive ?? true,
      });
    } else {
      setFormData({
        name: "",
        description: "",
        countryCode: "",
        planCode: "",
        offerType: "PERCENT",
        value: "10",
        billingCycle: "",
        couponCode: "",
        validFrom: "",
        validTo: "",
        maxRedemptions: "",
        perTenantLimit: "1",
        isActive: true,
      });
    }
  }, [offer, open]);

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return apiRequest("POST", "/api/admin/billing/offers", {
        name: data.name,
        description: data.description || null,
        offerType: data.offerType,
        value: parseFloat(data.value) || 0,
        countryCode: data.countryCode || null,
        planCode: data.planCode || null,
        billingCycle: data.billingCycle || null,
        couponCode: data.couponCode || null,
        validFrom: data.validFrom || null,
        validTo: data.validTo || null,
        maxRedemptions: data.maxRedemptions ? parseInt(data.maxRedemptions) : null,
        perTenantLimit: data.perTenantLimit ? parseInt(data.perTenantLimit) : 1,
        isActive: data.isActive,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/billing/offers"] });
      toast({ title: "Offer created successfully" });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create offer", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return apiRequest("PATCH", `/api/admin/billing/offers/${offer?.id}`, {
        name: data.name,
        description: data.description || null,
        offerType: data.offerType,
        value: parseFloat(data.value) || 0,
        countryCode: data.countryCode || null,
        planCode: data.planCode || null,
        billingCycle: data.billingCycle || null,
        couponCode: data.couponCode || null,
        validFrom: data.validFrom || null,
        validTo: data.validTo || null,
        maxRedemptions: data.maxRedemptions ? parseInt(data.maxRedemptions) : null,
        perTenantLimit: data.perTenantLimit ? parseInt(data.perTenantLimit) : 1,
        isActive: data.isActive,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/billing/offers"] });
      toast({ title: "Offer updated successfully" });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update offer", description: error.message, variant: "destructive" });
    },
  });

  const handleSubmit = () => {
    if (!formData.name || !formData.value) {
      toast({ title: "Please fill required fields", variant: "destructive" });
      return;
    }
    if (isEditing) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Offer" : "Create Offer"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Update offer details" : "Create a new discount or promotional offer"}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="offer-name">Name *</Label>
              <Input
                id="offer-name"
                placeholder="e.g., Yearly Discount"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                data-testid="input-offer-name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="offer-description">Description</Label>
              <Textarea
                id="offer-description"
                placeholder="Offer description..."
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                data-testid="input-offer-description"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Offer Type *</Label>
                <Select value={formData.offerType} onValueChange={(v) => setFormData(prev => ({ ...prev, offerType: v as "PERCENT" | "FLAT" }))}>
                  <SelectTrigger data-testid="select-offer-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PERCENT">Percentage</SelectItem>
                    <SelectItem value="FLAT">Flat Amount</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="offer-value">Value *</Label>
                <Input
                  id="offer-value"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.value}
                  onChange={(e) => setFormData(prev => ({ ...prev, value: e.target.value }))}
                  data-testid="input-offer-value"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Billing Cycle</Label>
                <Select value={formData.billingCycle} onValueChange={(v) => setFormData(prev => ({ ...prev, billingCycle: v === "all" ? "" : v }))}>
                  <SelectTrigger data-testid="select-offer-cycle">
                    <SelectValue placeholder="All cycles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Cycles</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="half_yearly">Half-Yearly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="offer-coupon">Coupon Code</Label>
                <Input
                  id="offer-coupon"
                  placeholder="e.g., SAVE20"
                  value={formData.couponCode}
                  onChange={(e) => setFormData(prev => ({ ...prev, couponCode: e.target.value.toUpperCase() }))}
                  data-testid="input-offer-coupon"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="offer-valid-from">Valid From</Label>
                <Input
                  id="offer-valid-from"
                  type="date"
                  value={formData.validFrom}
                  onChange={(e) => setFormData(prev => ({ ...prev, validFrom: e.target.value }))}
                  data-testid="input-offer-valid-from"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="offer-valid-to">Valid To</Label>
                <Input
                  id="offer-valid-to"
                  type="date"
                  value={formData.validTo}
                  onChange={(e) => setFormData(prev => ({ ...prev, validTo: e.target.value }))}
                  data-testid="input-offer-valid-to"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="offer-max-redemptions">Max Redemptions</Label>
                <Input
                  id="offer-max-redemptions"
                  type="number"
                  min="0"
                  placeholder="Unlimited"
                  value={formData.maxRedemptions}
                  onChange={(e) => setFormData(prev => ({ ...prev, maxRedemptions: e.target.value }))}
                  data-testid="input-offer-max-redemptions"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="offer-per-tenant">Per Tenant Limit</Label>
                <Input
                  id="offer-per-tenant"
                  type="number"
                  min="1"
                  value={formData.perTenantLimit}
                  onChange={(e) => setFormData(prev => ({ ...prev, perTenantLimit: e.target.value }))}
                  data-testid="input-offer-per-tenant"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="offer-active"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
                data-testid="switch-offer-active"
              />
              <Label htmlFor="offer-active">Active</Label>
            </div>
          </div>
        </ScrollArea>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel-offer">
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isPending} data-testid="button-save-offer">
            {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isEditing ? "Update Offer" : "Create Offer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BillingContent() {
  const { isSuperAdmin, hasPermission } = useAdmin();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("invoices");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [businessTypeFilter, setBusinessTypeFilter] = useState<string>("all");
  const [displayCurrency, setDisplayCurrency] = useState<string>("USD");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showEmailDialog, setShowEmailDialog] = useState(false);

  const sendInvoiceMutation = useMutation({
    mutationFn: async ({ invoiceId, emailData }: { invoiceId: string; emailData: EmailData }) => {
      return apiRequest("POST", `/api/platform-admin/billing/invoices/${invoiceId}/send`, emailData);
    },
    onSuccess: () => {
      toast({ title: "Invoice email sent successfully" });
      setShowEmailDialog(false);
      setShowDetailDialog(false);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to send invoice email", description: error.message, variant: "destructive" });
    },
  });

  const markPaidMutation = useMutation({
    mutationFn: async (invoiceId: string) => {
      return apiRequest("POST", `/api/platform-admin/billing/invoices/${invoiceId}/mark-paid`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/platform-admin/billing/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/platform-admin/billing/stats"] });
      toast({ title: "Invoice marked as paid" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to mark invoice as paid", description: error.message, variant: "destructive" });
    },
  });

  const handleViewInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setShowDetailDialog(true);
  };

  const handleOpenEmailDialog = () => {
    setShowEmailDialog(true);
  };

  const handleSendEmail = (emailData: EmailData) => {
    if (selectedInvoice) {
      sendInvoiceMutation.mutate({ invoiceId: selectedInvoice.id, emailData });
    }
  };

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
    const currency = PLAN_CURRENCIES.find(c => c.code === code);
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
              {PLAN_CURRENCIES.map((curr) => (
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

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="invoices" data-testid="tab-invoices">
            <Receipt className="h-4 w-4 mr-2" />
            Invoices
          </TabsTrigger>
          <TabsTrigger value="plans" data-testid="tab-plans">
            <Package className="h-4 w-4 mr-2" />
            Pricing Plans
          </TabsTrigger>
          <TabsTrigger value="offers" data-testid="tab-offers">
            <DollarSign className="h-4 w-4 mr-2" />
            Offers
          </TabsTrigger>
        </TabsList>

        <TabsContent value="invoices">
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
                  <TableHead className="w-[80px]">Actions</TableHead>
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
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" data-testid={`button-invoice-actions-${invoice.id}`}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleViewInvoice(invoice)} data-testid={`menu-view-invoice-${invoice.id}`}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          {isSuperAdmin && invoice.status === "pending" && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => {
                                  setSelectedInvoice(invoice);
                                  setShowEmailDialog(true);
                                }}
                                data-testid={`menu-send-invoice-${invoice.id}`}
                              >
                                <Mail className="h-4 w-4 mr-2" />
                                Send Invoice
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => markPaidMutation.mutate(invoice.id)}
                                data-testid={`menu-mark-paid-${invoice.id}`}
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Mark as Paid
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="plans">
          <PlansManagement />
        </TabsContent>

        <TabsContent value="offers">
          <OffersManagement />
        </TabsContent>
      </Tabs>

      <CreateInvoiceDialog open={showCreateDialog} onOpenChange={setShowCreateDialog} />
      <InvoiceDetailDialog 
        invoice={selectedInvoice} 
        open={showDetailDialog} 
        onOpenChange={setShowDetailDialog}
        onSend={handleOpenEmailDialog}
        isSending={sendInvoiceMutation.isPending}
        isSuperAdmin={isSuperAdmin}
      />
      <SendEmailDialog
        invoice={selectedInvoice}
        open={showEmailDialog}
        onOpenChange={setShowEmailDialog}
        onSend={handleSendEmail}
        isSending={sendInvoiceMutation.isPending}
      />
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
