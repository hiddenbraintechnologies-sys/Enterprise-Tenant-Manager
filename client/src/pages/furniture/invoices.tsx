import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { usePagination, type PaginationResponse } from "@/hooks/use-pagination";
import { DataTablePagination } from "@/components/data-table-pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Search,
  Eye,
  FileText,
  Send,
  Mail,
  MessageCircle,
  MoreHorizontal,
  Download,
  Bell,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { format } from "date-fns";

interface FurnitureInvoice {
  id: string;
  tenantId: string;
  invoiceNumber: string;
  invoiceType: string;
  status: string;
  salesOrderId?: string;
  customerId: string;
  invoiceDate: string;
  dueDate?: string;
  currency: string;
  subtotal: string;
  taxAmount: string;
  totalAmount: string;
  paidAmount: string;
  billingName?: string;
  billingEmail?: string;
  billingPhone?: string;
  createdAt: string;
}

interface NotificationLog {
  id: string;
  channel: string;
  eventType: string;
  recipient: string;
  subject?: string;
  status: string;
  sentAt?: string;
  createdAt: string;
  errorMessage?: string;
}

const STATUS_BADGES: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
  draft: { variant: "secondary", label: "Draft" },
  issued: { variant: "default", label: "Issued" },
  partially_paid: { variant: "outline", label: "Partially Paid" },
  paid: { variant: "outline", label: "Paid" },
  overdue: { variant: "destructive", label: "Overdue" },
  cancelled: { variant: "destructive", label: "Cancelled" },
  refunded: { variant: "secondary", label: "Refunded" },
};

const NOTIFICATION_STATUS_ICONS: Record<string, typeof CheckCircle> = {
  sent: CheckCircle,
  delivered: CheckCircle,
  pending: Clock,
  retrying: Clock,
  failed: XCircle,
};

function NotificationDialog({
  invoice,
  open,
  onOpenChange,
}: {
  invoice: FurnitureInvoice | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const [channel, setChannel] = useState<"email" | "whatsapp">("email");
  const [eventType, setEventType] = useState("invoice_issued");

  const { data: notificationLogs, isLoading: logsLoading } = useQuery<NotificationLog[]>({
    queryKey: ["/api/furniture/invoices", invoice?.id, "notifications"],
    enabled: !!invoice?.id && open,
  });

  const sendNotificationMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(
        "POST",
        `/api/furniture/invoices/${invoice?.id}/notify?channel=${channel}`,
        { eventType }
      );
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Notification Sent",
        description: data.message || "Notification sent successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/furniture/invoices", invoice?.id, "notifications"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Send",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSend = () => {
    sendNotificationMutation.mutate();
  };

  if (!invoice) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Send Notification - {invoice.invoiceNumber}
          </DialogTitle>
          <DialogDescription>
            Send invoice notification to {invoice.billingName || "customer"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Channel</Label>
              <Select value={channel} onValueChange={(v) => setChannel(v as "email" | "whatsapp")}>
                <SelectTrigger data-testid="select-notification-channel">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Email
                    </div>
                  </SelectItem>
                  <SelectItem value="whatsapp">
                    <div className="flex items-center gap-2">
                      <MessageCircle className="h-4 w-4" />
                      WhatsApp
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Notification Type</Label>
              <Select value={eventType} onValueChange={setEventType}>
                <SelectTrigger data-testid="select-notification-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="invoice_issued">Invoice Issued</SelectItem>
                  <SelectItem value="payment_reminder">Payment Reminder</SelectItem>
                  <SelectItem value="invoice_overdue">Overdue Notice</SelectItem>
                  <SelectItem value="payment_received">Payment Confirmation</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-md bg-muted p-3">
            <div className="text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Recipient:</span>
                <span>{channel === "email" ? invoice.billingEmail : invoice.billingPhone || "N/A"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount:</span>
                <span>{invoice.currency} {parseFloat(invoice.totalAmount).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Due Date:</span>
                <span>{invoice.dueDate ? format(new Date(invoice.dueDate), "MMM d, yyyy") : "N/A"}</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notification History</Label>
            <div className="border rounded-md max-h-48 overflow-y-auto">
              {logsLoading ? (
                <div className="p-4">
                  <Skeleton className="h-8 w-full" />
                </div>
              ) : notificationLogs && notificationLogs.length > 0 ? (
                <Table>
                  <TableBody>
                    {notificationLogs.map((log) => {
                      const StatusIcon = NOTIFICATION_STATUS_ICONS[log.status] || AlertCircle;
                      return (
                        <TableRow key={log.id}>
                          <TableCell className="py-2">
                            <div className="flex items-center gap-2">
                              {log.channel === "email" ? (
                                <Mail className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <MessageCircle className="h-4 w-4 text-muted-foreground" />
                              )}
                              <span className="text-sm">{log.eventType.replace(/_/g, " ")}</span>
                            </div>
                          </TableCell>
                          <TableCell className="py-2">
                            <div className="flex items-center gap-1">
                              <StatusIcon className={`h-4 w-4 ${
                                log.status === "sent" || log.status === "delivered" 
                                  ? "text-green-500" 
                                  : log.status === "failed" 
                                    ? "text-red-500" 
                                    : "text-yellow-500"
                              }`} />
                              <span className="text-sm capitalize">{log.status}</span>
                            </div>
                          </TableCell>
                          <TableCell className="py-2 text-sm text-muted-foreground">
                            {format(new Date(log.createdAt), "MMM d, h:mm a")}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  No notifications sent yet
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSend} 
            disabled={sendNotificationMutation.isPending}
            data-testid="button-send-notification"
          >
            <Send className="h-4 w-4 mr-2" />
            {sendNotificationMutation.isPending ? "Sending..." : "Send Notification"}
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
}: {
  invoice: FurnitureInvoice | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();

  const downloadPdf = async () => {
    if (!invoice) return;
    try {
      const response = await fetch(`/api/furniture/invoices/${invoice.id}/pdf`, {
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("token")}`,
        },
      });
      
      if (!response.ok) throw new Error("Failed to download PDF");
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `invoice-${invoice.invoiceNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({ title: "PDF downloaded successfully" });
    } catch (error) {
      toast({
        title: "Download failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  if (!invoice) return null;

  const statusBadge = STATUS_BADGES[invoice.status] || { variant: "outline" as const, label: invoice.status };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Invoice {invoice.invoiceNumber}</span>
            <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm font-medium">Invoice Details</CardTitle>
              </CardHeader>
              <CardContent className="py-2 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Date:</span>
                  <span>{format(new Date(invoice.invoiceDate), "MMM d, yyyy")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Due Date:</span>
                  <span>{invoice.dueDate ? format(new Date(invoice.dueDate), "MMM d, yyyy") : "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type:</span>
                  <span className="capitalize">{invoice.invoiceType.replace(/_/g, " ")}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm font-medium">Amount</CardTitle>
              </CardHeader>
              <CardContent className="py-2 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span>{invoice.currency} {parseFloat(invoice.subtotal).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax:</span>
                  <span>{invoice.currency} {parseFloat(invoice.taxAmount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span>Total:</span>
                  <span>{invoice.currency} {parseFloat(invoice.totalAmount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-green-600">
                  <span>Paid:</span>
                  <span>{invoice.currency} {parseFloat(invoice.paidAmount).toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm font-medium">Customer</CardTitle>
            </CardHeader>
            <CardContent className="py-2 space-y-1 text-sm">
              <div>{invoice.billingName || "N/A"}</div>
              <div className="text-muted-foreground">{invoice.billingEmail}</div>
              <div className="text-muted-foreground">{invoice.billingPhone}</div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button variant="outline" onClick={downloadPdf} data-testid="button-download-pdf">
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function FurnitureInvoicesPage() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedInvoice, setSelectedInvoice] = useState<FurnitureInvoice | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [notificationDialogOpen, setNotificationDialogOpen] = useState(false);

  const pagination = usePagination();

  const { data: invoicesData, isLoading } = useQuery<PaginationResponse<FurnitureInvoice>>({
    queryKey: [
      "/api/furniture/invoices",
      { 
        page: pagination.page, 
        limit: pagination.limit,
        search: pagination.filters.search,
        status: pagination.filters.status,
      }
    ],
  });

  const sendBulkRemindersMutation = useMutation({
    mutationFn: async (channel: "email" | "whatsapp") => {
      const response = await apiRequest("POST", `/api/furniture/invoices/bulk-reminders?channel=${channel}`);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Reminders Sent",
        description: data.message,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleViewInvoice = (invoice: FurnitureInvoice) => {
    setSelectedInvoice(invoice);
    setDetailDialogOpen(true);
  };

  const handleSendNotification = (invoice: FurnitureInvoice) => {
    setSelectedInvoice(invoice);
    setNotificationDialogOpen(true);
  };

  const invoices = invoicesData?.data || [];

  return (
    <DashboardLayout title="Furniture Invoices">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold" data-testid="text-page-title">Furniture Invoices</h1>
            <p className="text-muted-foreground">Manage invoices and send notifications</p>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" data-testid="button-bulk-reminders">
                <Bell className="h-4 w-4 mr-2" />
                Send Overdue Reminders
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem 
                onClick={() => sendBulkRemindersMutation.mutate("email")}
                disabled={sendBulkRemindersMutation.isPending}
              >
                <Mail className="h-4 w-4 mr-2" />
                Send via Email
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => sendBulkRemindersMutation.mutate("whatsapp")}
                disabled={sendBulkRemindersMutation.isPending}
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                Send via WhatsApp
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search invoices..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                pagination.setFilter("search", e.target.value);
              }}
              className="pl-9"
              data-testid="input-search-invoices"
            />
          </div>

          <Select 
            value={statusFilter} 
            onValueChange={(v) => {
              setStatusFilter(v);
              pagination.setFilter("status", v === "all" ? "" : v);
            }}
          >
            <SelectTrigger className="w-[150px]" data-testid="select-status-filter">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="issued">Issued</SelectItem>
              <SelectItem value="partially_paid">Partially Paid</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : invoices.length === 0 ? (
              <div className="p-12 text-center">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-medium">No invoices found</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Invoices will appear here once created from sales orders
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((invoice) => {
                    const statusBadge = STATUS_BADGES[invoice.status] || { variant: "outline" as const, label: invoice.status };
                    return (
                      <TableRow key={invoice.id} data-testid={`row-invoice-${invoice.id}`}>
                        <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                        <TableCell>{invoice.billingName || "N/A"}</TableCell>
                        <TableCell>{format(new Date(invoice.invoiceDate), "MMM d, yyyy")}</TableCell>
                        <TableCell>
                          {invoice.dueDate ? format(new Date(invoice.dueDate), "MMM d, yyyy") : "N/A"}
                        </TableCell>
                        <TableCell>
                          {invoice.currency} {parseFloat(invoice.totalAmount).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" data-testid={`button-actions-${invoice.id}`}>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleViewInvoice(invoice)}>
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleSendNotification(invoice)}>
                                <Send className="h-4 w-4 mr-2" />
                                Send Notification
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {invoicesData && invoicesData.pagination.total > 0 && (
          <DataTablePagination
            page={pagination.page}
            limit={pagination.limit}
            total={invoicesData.pagination.total}
            totalPages={invoicesData.pagination.totalPages}
            hasNext={invoicesData.pagination.hasNext}
            hasPrev={invoicesData.pagination.hasPrev}
            onPageChange={pagination.setPage}
            onLimitChange={pagination.setLimit}
          />
        )}

        <InvoiceDetailDialog
          invoice={selectedInvoice}
          open={detailDialogOpen}
          onOpenChange={setDetailDialogOpen}
        />

        <NotificationDialog
          invoice={selectedInvoice}
          open={notificationDialogOpen}
          onOpenChange={setNotificationDialogOpen}
        />
      </div>
    </DashboardLayout>
  );
}
