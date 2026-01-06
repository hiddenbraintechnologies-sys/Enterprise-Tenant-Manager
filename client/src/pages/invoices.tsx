import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { CURRENCY_CONFIGS, formatCurrency, getCurrencySymbol, convertCurrency } from "@/lib/currency-service";
import { 
  Plus, 
  FileText, 
  Send, 
  Eye, 
  Trash2, 
  DollarSign, 
  Calendar, 
  User, 
  ArrowRightLeft,
  RefreshCw,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle
} from "lucide-react";
import type { Invoice, Customer, ExchangeRate } from "@shared/schema";

interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: string;
  totalPrice: string;
}

interface InvoiceWithItems extends Invoice {
  items?: InvoiceItem[];
}

export default function InvoicesPage() {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceWithItems | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  
  const [customerId, setCustomerId] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<InvoiceItem[]>([{ description: "", quantity: 1, unitPrice: "0", totalPrice: "0" }]);
  const [convertedAmount, setConvertedAmount] = useState<{ amount: number; rate: number; toCurrency: string } | null>(null);

  const currencies = Object.keys(CURRENCY_CONFIGS);

  const { data: invoices, isLoading } = useQuery<Invoice[]>({
    queryKey: ["/api/invoices"],
  });

  const { data: customers } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const { data: exchangeRates } = useQuery<ExchangeRate[]>({
    queryKey: ["/api/exchange-rates/active"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/invoices", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      toast({ title: "Invoice created successfully" });
      resetForm();
      setIsCreateDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create invoice", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/invoices/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      toast({ title: "Invoice deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete invoice", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setCustomerId("");
    setCurrency("INR");
    setDueDate("");
    setNotes("");
    setItems([{ description: "", quantity: 1, unitPrice: "0", totalPrice: "0" }]);
    setConvertedAmount(null);
  };

  const calculateItemTotal = (quantity: number, unitPrice: string): string => {
    return (quantity * parseFloat(unitPrice || "0")).toFixed(2);
  };

  const updateItem = (index: number, field: keyof InvoiceItem, value: string | number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    if (field === "quantity" || field === "unitPrice") {
      newItems[index].totalPrice = calculateItemTotal(
        field === "quantity" ? (value as number) : newItems[index].quantity,
        field === "unitPrice" ? (value as string) : newItems[index].unitPrice
      );
    }
    
    setItems(newItems);
  };

  const addItem = () => {
    setItems([...items, { description: "", quantity: 1, unitPrice: "0", totalPrice: "0" }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + parseFloat(item.totalPrice || "0"), 0);
    const taxRate = 0.18;
    const taxAmount = subtotal * taxRate;
    const totalAmount = subtotal + taxAmount;
    return { subtotal, taxAmount, totalAmount };
  };

  const handleCurrencyConversion = async () => {
    const { totalAmount } = calculateTotals();
    if (currency !== "USD") {
      const result = await convertCurrency(totalAmount, currency, "USD");
      if (result) {
        setConvertedAmount({ amount: result.convertedAmount, rate: result.rate, toCurrency: "USD" });
      }
    } else {
      setConvertedAmount(null);
    }
  };

  const handleSubmit = () => {
    if (!customerId) {
      toast({ title: "Please select a customer", variant: "destructive" });
      return;
    }

    if (items.every(item => !item.description)) {
      toast({ title: "Please add at least one item", variant: "destructive" });
      return;
    }

    const { subtotal, taxAmount, totalAmount } = calculateTotals();

    createMutation.mutate({
      customerId,
      currency,
      baseCurrency: "USD",
      subtotal: subtotal.toFixed(2),
      taxAmount: taxAmount.toFixed(2),
      totalAmount: totalAmount.toFixed(2),
      dueDate: dueDate || null,
      notes: notes || null,
      items: items.filter(item => item.description),
    });
  };

  const viewInvoice = async (invoice: Invoice) => {
    try {
      const response = await fetch(`/api/invoices/${invoice.id}`);
      if (response.ok) {
        const data = await response.json();
        setSelectedInvoice(data);
        setIsViewDialogOpen(true);
      }
    } catch (error) {
      toast({ title: "Failed to load invoice details", variant: "destructive" });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof CheckCircle }> = {
      paid: { variant: "default", icon: CheckCircle },
      pending: { variant: "secondary", icon: Clock },
      partial: { variant: "outline", icon: AlertCircle },
      overdue: { variant: "destructive", icon: AlertCircle },
      cancelled: { variant: "destructive", icon: XCircle },
      draft: { variant: "outline", icon: FileText },
    };
    const config = variants[status] || variants.pending;
    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const { subtotal, taxAmount, totalAmount } = calculateTotals();

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-invoices-title">Invoices</h1>
          <p className="text-muted-foreground">Manage invoices with multi-currency support</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-invoice">
              <Plus className="h-4 w-4 mr-2" />
              Create Invoice
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Invoice</DialogTitle>
              <DialogDescription>
                Create an invoice with multi-currency support
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Customer</Label>
                  <Select value={customerId} onValueChange={setCustomerId}>
                    <SelectTrigger data-testid="select-customer">
                      <SelectValue placeholder="Select customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers?.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.name} - {customer.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Currency</Label>
                  <Select value={currency} onValueChange={(val) => { setCurrency(val); setConvertedAmount(null); }}>
                    <SelectTrigger data-testid="select-currency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {currencies.map((code) => (
                        <SelectItem key={code} value={code}>
                          {getCurrencySymbol(code)} {code} - {CURRENCY_CONFIGS[code].name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Due Date</Label>
                <Input 
                  type="date" 
                  value={dueDate} 
                  onChange={(e) => setDueDate(e.target.value)}
                  data-testid="input-due-date"
                />
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">Invoice Items</Label>
                  <Button variant="outline" size="sm" onClick={addItem} data-testid="button-add-item">
                    <Plus className="h-4 w-4 mr-1" />
                    Add Item
                  </Button>
                </div>

                {items.map((item, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-5">
                      <Label className="text-xs">Description</Label>
                      <Input
                        value={item.description}
                        onChange={(e) => updateItem(index, "description", e.target.value)}
                        placeholder="Item description"
                        data-testid={`input-item-description-${index}`}
                      />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs">Qty</Label>
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, "quantity", parseInt(e.target.value) || 1)}
                        data-testid={`input-item-quantity-${index}`}
                      />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs">Unit Price</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={item.unitPrice}
                        onChange={(e) => updateItem(index, "unitPrice", e.target.value)}
                        data-testid={`input-item-price-${index}`}
                      />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs">Total</Label>
                      <Input
                        value={formatCurrency(item.totalPrice, currency)}
                        disabled
                        className="bg-muted"
                      />
                    </div>
                    <div className="col-span-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => removeItem(index)}
                        disabled={items.length === 1}
                        data-testid={`button-remove-item-${index}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <Separator />

              <Card>
                <CardContent className="pt-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Subtotal</span>
                      <span>{formatCurrency(subtotal, currency)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Tax (18%)</span>
                      <span>{formatCurrency(taxAmount, currency)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-bold">
                      <span>Total</span>
                      <span data-testid="text-invoice-total">{formatCurrency(totalAmount, currency)}</span>
                    </div>
                    
                    {currency !== "USD" && (
                      <div className="pt-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={handleCurrencyConversion}
                          className="w-full"
                          data-testid="button-convert-currency"
                        >
                          <ArrowRightLeft className="h-4 w-4 mr-2" />
                          Convert to USD
                        </Button>
                        {convertedAmount && (
                          <div className="mt-2 p-2 bg-muted rounded-md text-sm">
                            <div className="flex justify-between">
                              <span>USD Equivalent:</span>
                              <span className="font-medium">{formatCurrency(convertedAmount.amount, "USD")}</span>
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              Rate: 1 {currency} = {convertedAmount.rate.toFixed(6)} USD
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea 
                  value={notes} 
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional notes for the invoice"
                  data-testid="input-invoice-notes"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={createMutation.isPending} data-testid="button-submit-invoice">
                {createMutation.isPending ? "Creating..." : "Create Invoice"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            All Invoices
          </CardTitle>
          <CardDescription>
            {invoices?.length || 0} invoices total
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!invoices || invoices.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No invoices yet</h3>
              <p className="text-muted-foreground mb-4">Create your first invoice to get started</p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Invoice
              </Button>
            </div>
          ) : (
            <ScrollArea className="h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Currency</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((invoice) => (
                    <TableRow key={invoice.id} data-testid={`row-invoice-${invoice.id}`}>
                      <TableCell className="font-mono text-sm">
                        {invoice.invoiceNumber}
                      </TableCell>
                      <TableCell>
                        {customers?.find(c => c.id === invoice.customerId)?.name || "Unknown"}
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(invoice.totalAmount, invoice.currency)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {getCurrencySymbol(invoice.currency)} {invoice.currency}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(invoice.status || "draft")}
                      </TableCell>
                      <TableCell>
                        {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : "-"}
                      </TableCell>
                      <TableCell>
                        {new Date(invoice.createdAt!).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => viewInvoice(invoice)}
                            data-testid={`button-view-invoice-${invoice.id}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => deleteMutation.mutate(invoice.id)}
                            data-testid={`button-delete-invoice-${invoice.id}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Invoice Details</DialogTitle>
            <DialogDescription>
              Invoice #{selectedInvoice?.invoiceNumber}
            </DialogDescription>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <div className="mt-1">{getStatusBadge(selectedInvoice.status || "draft")}</div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Currency</Label>
                  <div className="mt-1">
                    <Badge variant="outline">
                      {getCurrencySymbol(selectedInvoice.currency)} {selectedInvoice.currency}
                    </Badge>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <Label className="text-sm font-medium">Items</Label>
                <Table className="mt-2">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Unit Price</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedInvoice.items?.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{item.description}</TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(item.unitPrice, selectedInvoice.currency)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(item.totalPrice, selectedInvoice.currency)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <Card>
                <CardContent className="pt-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Subtotal</span>
                      <span>{formatCurrency(selectedInvoice.subtotal, selectedInvoice.currency)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Tax</span>
                      <span>{formatCurrency(selectedInvoice.taxAmount || "0", selectedInvoice.currency)}</span>
                    </div>
                    {selectedInvoice.discountAmount && parseFloat(selectedInvoice.discountAmount) > 0 && (
                      <div className="flex justify-between text-sm text-green-600">
                        <span>Discount</span>
                        <span>-{formatCurrency(selectedInvoice.discountAmount, selectedInvoice.currency)}</span>
                      </div>
                    )}
                    <Separator />
                    <div className="flex justify-between font-bold">
                      <span>Total</span>
                      <span>{formatCurrency(selectedInvoice.totalAmount, selectedInvoice.currency)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Paid</span>
                      <span>{formatCurrency(selectedInvoice.paidAmount || "0", selectedInvoice.currency)}</span>
                    </div>
                    {parseFloat(selectedInvoice.totalAmount) - parseFloat(selectedInvoice.paidAmount || "0") > 0 && (
                      <div className="flex justify-between text-sm font-medium text-destructive">
                        <span>Balance Due</span>
                        <span>
                          {formatCurrency(
                            parseFloat(selectedInvoice.totalAmount) - parseFloat(selectedInvoice.paidAmount || "0"),
                            selectedInvoice.currency
                          )}
                        </span>
                      </div>
                    )}
                  </div>

                  {selectedInvoice.baseCurrency && selectedInvoice.baseCurrency !== selectedInvoice.currency && (
                    <div className="mt-4 p-2 bg-muted rounded-md text-xs">
                      <div className="flex justify-between">
                        <span>Base Amount ({selectedInvoice.baseCurrency}):</span>
                        <span>{formatCurrency(selectedInvoice.baseAmount || "0", selectedInvoice.baseCurrency)}</span>
                      </div>
                      <div className="text-muted-foreground mt-1">
                        Exchange Rate: 1 {selectedInvoice.currency} = {selectedInvoice.exchangeRate} {selectedInvoice.baseCurrency}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {selectedInvoice.notes && (
                <div>
                  <Label className="text-sm font-medium">Notes</Label>
                  <p className="mt-1 text-sm text-muted-foreground">{selectedInvoice.notes}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
