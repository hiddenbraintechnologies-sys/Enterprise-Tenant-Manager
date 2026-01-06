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
} from "lucide-react";
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
      const token = localStorage.getItem("bizflow_admin_token");
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
    ? `Invoice ${invoice.invoiceNumber || invoice.id} from BizFlow - ${formatCurrency(invoice.totalAmount || invoice.amount, invoice.currency)} Due`
    : "Invoice from BizFlow";

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
BizFlow Team
support@bizflow.app` : "";

  const [emailData, setEmailData] = useState<EmailData>({
    to: invoice?.tenantEmail || "",
    cc: "",
    bcc: "",
    subject: defaultSubject,
    message: defaultMessage,
  });

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

function BillingContent() {
  const { isSuperAdmin, hasPermission } = useAdmin();
  const { toast } = useToast();
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
