import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
  RefreshCw,
  Calendar,
  Pause,
  Play,
  Trash2,
  Plus,
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

interface RecurringSchedule {
  id: string;
  tenantId: string;
  customerId: string;
  sourceInvoiceId?: string;
  name: string;
  description?: string;
  frequency: string;
  intervalCount: number;
  amount: string;
  currency: string;
  status: string;
  startDate: string;
  endDate?: string;
  nextExecutionDate?: string;
  autoGenerateInvoice: boolean;
  createdAt: string;
}

interface ReminderSchedule {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  daysFromDueDate: number;
  sendTimeHour: number;
  sendTimeMinute: number;
  channels: string[];
  isActive: boolean;
  appliesTo: string;
  createdAt: string;
}

interface UpcomingPayment {
  schedule: RecurringSchedule;
  nextDate: Date;
  daysUntil: number;
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
                  <SelectItem value="email" data-testid="option-channel-email">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Email
                    </div>
                  </SelectItem>
                  <SelectItem value="whatsapp" data-testid="option-channel-whatsapp">
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
                  <SelectItem value="invoice_issued" data-testid="option-type-issued">Invoice Issued</SelectItem>
                  <SelectItem value="payment_reminder" data-testid="option-type-reminder">Payment Reminder</SelectItem>
                  <SelectItem value="invoice_overdue" data-testid="option-type-overdue">Overdue Notice</SelectItem>
                  <SelectItem value="payment_received" data-testid="option-type-received">Payment Confirmation</SelectItem>
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
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel-notification">
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

function RecurringSchedulesTab() {
  const { toast } = useToast();

  const { data: schedules = [], isLoading } = useQuery<RecurringSchedule[]>({
    queryKey: ["/api/furniture/recurring-schedules"],
  });

  const { data: upcomingPayments = [] } = useQuery<UpcomingPayment[]>({
    queryKey: ["/api/furniture/upcoming-payments"],
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const response = await apiRequest("PATCH", `/api/furniture/recurring-schedules/${id}/status`, { status });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/furniture/recurring-schedules"] });
      toast({ title: "Schedule Updated", description: "Status has been changed" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
    },
  });

  const frequencyLabels: Record<string, string> = {
    daily: "Daily",
    weekly: "Weekly",
    biweekly: "Bi-weekly",
    monthly: "Monthly",
    quarterly: "Quarterly",
    yearly: "Yearly",
  };

  const statusColors: Record<string, string> = {
    active: "default",
    paused: "secondary",
    cancelled: "destructive",
    completed: "outline",
  };

  return (
    <div className="space-y-6">
      {upcomingPayments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Upcoming Payments
            </CardTitle>
            <CardDescription>Scheduled payments for the next 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcomingPayments.slice(0, 5).map((payment, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-md">
                  <div>
                    <div className="font-medium">{payment.schedule.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {payment.schedule.currency} {parseFloat(payment.schedule.amount).toFixed(2)} - {frequencyLabels[payment.schedule.frequency]}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">
                      {format(new Date(payment.nextDate), "MMM d, yyyy")}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {payment.daysUntil === 0 ? "Today" : `${payment.daysUntil} days`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Recurring Payment Schedules
          </CardTitle>
          <CardDescription>Manage subscription and recurring billing</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : schedules.length === 0 ? (
            <div className="p-12 text-center">
              <RefreshCw className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-medium">No recurring schedules</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Set up recurring billing from invoice actions
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Frequency</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Next Payment</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schedules.map((schedule) => (
                  <TableRow key={schedule.id} data-testid={`row-schedule-${schedule.id}`}>
                    <TableCell className="font-medium">{schedule.name}</TableCell>
                    <TableCell>{frequencyLabels[schedule.frequency] || schedule.frequency}</TableCell>
                    <TableCell>
                      {schedule.currency} {parseFloat(schedule.amount).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      {schedule.nextExecutionDate 
                        ? format(new Date(schedule.nextExecutionDate), "MMM d, yyyy")
                        : "N/A"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusColors[schedule.status] as any || "outline"}>
                        {schedule.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {schedule.status === "active" && (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => updateStatusMutation.mutate({ id: schedule.id, status: "paused" })}
                            disabled={updateStatusMutation.isPending}
                            data-testid={`button-pause-${schedule.id}`}
                          >
                            <Pause className="h-4 w-4" />
                          </Button>
                        )}
                        {schedule.status === "paused" && (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => updateStatusMutation.mutate({ id: schedule.id, status: "active" })}
                            disabled={updateStatusMutation.isPending}
                            data-testid={`button-resume-${schedule.id}`}
                          >
                            <Play className="h-4 w-4" />
                          </Button>
                        )}
                        {schedule.status !== "cancelled" && (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => updateStatusMutation.mutate({ id: schedule.id, status: "cancelled" })}
                            disabled={updateStatusMutation.isPending}
                            data-testid={`button-cancel-${schedule.id}`}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ReminderSchedulesTab() {
  const { toast } = useToast();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const { data: schedules = [], isLoading } = useQuery<ReminderSchedule[]>({
    queryKey: ["/api/furniture/reminder-schedules"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/furniture/reminder-schedules/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/furniture/reminder-schedules"] });
      toast({ title: "Deleted", description: "Reminder schedule removed" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const response = await apiRequest("PATCH", `/api/furniture/reminder-schedules/${id}`, { isActive });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/furniture/reminder-schedules"] });
      toast({ title: "Updated", description: "Schedule status changed" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
    },
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Automatic Reminders
            </CardTitle>
            <CardDescription>Configure when payment reminders are sent</CardDescription>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)} data-testid="button-add-reminder">
            <Plus className="h-4 w-4 mr-2" />
            Add Reminder
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : schedules.length === 0 ? (
            <div className="p-12 text-center">
              <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-medium">No reminder schedules</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Create automatic reminders for invoice payments
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Timing</TableHead>
                  <TableHead>Channels</TableHead>
                  <TableHead>Applies To</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schedules.map((schedule) => (
                  <TableRow key={schedule.id} data-testid={`row-reminder-${schedule.id}`}>
                    <TableCell className="font-medium">{schedule.name}</TableCell>
                    <TableCell>
                      {schedule.daysFromDueDate === 0
                        ? "On due date"
                        : schedule.daysFromDueDate > 0
                        ? `${schedule.daysFromDueDate} days after due`
                        : `${Math.abs(schedule.daysFromDueDate)} days before due`}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {schedule.channels.includes("email") && (
                          <Badge variant="outline"><Mail className="h-3 w-3" /></Badge>
                        )}
                        {schedule.channels.includes("whatsapp") && (
                          <Badge variant="outline"><MessageCircle className="h-3 w-3" /></Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="capitalize">{schedule.appliesTo.replace("_", " ")}</TableCell>
                    <TableCell>
                      <Switch
                        checked={schedule.isActive}
                        onCheckedChange={(checked) => updateMutation.mutate({ id: schedule.id, isActive: checked })}
                        data-testid={`switch-active-${schedule.id}`}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => deleteMutation.mutate(schedule.id)}
                        disabled={deleteMutation.isPending}
                        data-testid={`button-delete-${schedule.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <CreateReminderDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />
    </div>
  );
}

function CreateReminderDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [daysFromDueDate, setDaysFromDueDate] = useState("0");
  const [channels, setChannels] = useState<string[]>(["email"]);
  const [appliesTo, setAppliesTo] = useState("all");

  const createMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/furniture/reminder-schedules", {
        name,
        daysFromDueDate: parseInt(daysFromDueDate),
        channels,
        appliesTo,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/furniture/reminder-schedules"] });
      toast({ title: "Created", description: "Reminder schedule added" });
      onOpenChange(false);
      setName("");
      setDaysFromDueDate("0");
      setChannels(["email"]);
      setAppliesTo("all");
    },
    onError: (error: Error) => {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Reminder Schedule</DialogTitle>
          <DialogDescription>
            Set up automatic payment reminders for invoices
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., 3 Days Before Due"
              data-testid="input-reminder-name"
            />
          </div>

          <div className="space-y-2">
            <Label>Days from Due Date</Label>
            <Select value={daysFromDueDate} onValueChange={setDaysFromDueDate}>
              <SelectTrigger data-testid="select-days-from-due">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="-7">7 days before</SelectItem>
                <SelectItem value="-3">3 days before</SelectItem>
                <SelectItem value="-1">1 day before</SelectItem>
                <SelectItem value="0">On due date</SelectItem>
                <SelectItem value="1">1 day after</SelectItem>
                <SelectItem value="3">3 days after</SelectItem>
                <SelectItem value="7">7 days after</SelectItem>
                <SelectItem value="14">14 days after</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Channels</Label>
            <div className="flex gap-4">
              <Label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={channels.includes("email")}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setChannels([...channels, "email"]);
                    } else {
                      setChannels(channels.filter((c) => c !== "email"));
                    }
                  }}
                  className="rounded"
                />
                <Mail className="h-4 w-4" />
                Email
              </Label>
              <Label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={channels.includes("whatsapp")}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setChannels([...channels, "whatsapp"]);
                    } else {
                      setChannels(channels.filter((c) => c !== "whatsapp"));
                    }
                  }}
                  className="rounded"
                />
                <MessageCircle className="h-4 w-4" />
                WhatsApp
              </Label>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Applies To</Label>
            <Select value={appliesTo} onValueChange={setAppliesTo}>
              <SelectTrigger data-testid="select-applies-to">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Invoices</SelectItem>
                <SelectItem value="overdue_only">Overdue Only</SelectItem>
                <SelectItem value="upcoming_only">Upcoming Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => createMutation.mutate()}
            disabled={!name || channels.length === 0 || createMutation.isPending}
            data-testid="button-create-reminder"
          >
            {createMutation.isPending ? "Creating..." : "Create"}
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

  const [activeTab, setActiveTab] = useState("invoices");

  return (
    <DashboardLayout title="Furniture Invoices">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold" data-testid="text-page-title">Billing & Payments</h1>
            <p className="text-muted-foreground">Manage invoices, recurring billing, and payment reminders</p>
          </div>

          {activeTab === "invoices" && (
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
          )}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList>
            <TabsTrigger value="invoices" data-testid="tab-invoices">
              <FileText className="h-4 w-4 mr-2" />
              Invoices
            </TabsTrigger>
            <TabsTrigger value="recurring" data-testid="tab-recurring">
              <RefreshCw className="h-4 w-4 mr-2" />
              Recurring
            </TabsTrigger>
            <TabsTrigger value="reminders" data-testid="tab-reminders">
              <Bell className="h-4 w-4 mr-2" />
              Reminders
            </TabsTrigger>
          </TabsList>

          <TabsContent value="invoices" className="space-y-6 mt-6">
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
                              <DropdownMenuItem onClick={() => handleViewInvoice(invoice)} data-testid={`menu-view-${invoice.id}`}>
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleSendNotification(invoice)} data-testid={`menu-notify-${invoice.id}`}>
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
          </TabsContent>

          <TabsContent value="recurring" className="mt-6">
            <RecurringSchedulesTab />
          </TabsContent>

          <TabsContent value="reminders" className="mt-6">
            <ReminderSchedulesTab />
          </TabsContent>
        </Tabs>

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
