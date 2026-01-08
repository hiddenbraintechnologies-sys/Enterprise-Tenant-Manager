import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Plus,
  Search,
  Pencil,
  ShoppingCart,
  Eye,
  IndianRupee,
  User,
  FileText,
} from "lucide-react";
import type { FurnitureSalesOrder, FurnitureSalesOrderItem, FurnitureProduct, Customer } from "@shared/schema";

const ORDER_TYPES = [
  { value: "retail", label: "Retail" },
  { value: "wholesale", label: "Wholesale" },
  { value: "b2b", label: "B2B" },
];

const ORDER_STATUSES = [
  { value: "draft", label: "Draft" },
  { value: "confirmed", label: "Confirmed" },
  { value: "in_production", label: "In Production" },
  { value: "ready", label: "Ready" },
  { value: "dispatched", label: "Dispatched" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
];

interface OrderFormData {
  customerId: string;
  orderType: string;
  deliveryAddress: string;
  notes: string;
}

function getStatusVariant(status: string) {
  switch (status) {
    case "confirmed":
    case "in_production":
      return "default";
    case "ready":
    case "dispatched":
    case "delivered":
      return "outline";
    case "draft":
      return "secondary";
    case "cancelled":
      return "destructive";
    default:
      return "outline";
  }
}

function OrderDialog({
  order,
  customers,
  open,
  onOpenChange,
  onSave,
  isSaving,
}: {
  order: FurnitureSalesOrder | null;
  customers: Customer[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: OrderFormData) => void;
  isSaving: boolean;
}) {
  const [formData, setFormData] = useState<OrderFormData>({
    customerId: order?.customerId || "",
    orderType: order?.orderType || "retail",
    deliveryAddress: order?.deliveryAddress || "",
    notes: order?.notes || "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{order ? "Edit Sales Order" : "Create Sales Order"}</DialogTitle>
          <DialogDescription>
            {order ? "Update order details" : "Create a new sales order"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Customer *</Label>
              <Select
                value={formData.customerId}
                onValueChange={(v) => setFormData({ ...formData, customerId: v })}
              >
                <SelectTrigger data-testid="select-order-customer">
                  <SelectValue placeholder="Select customer" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Order Type</Label>
              <Select
                value={formData.orderType}
                onValueChange={(v) => setFormData({ ...formData, orderType: v })}
              >
                <SelectTrigger data-testid="select-order-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ORDER_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Delivery Address</Label>
            <Textarea
              placeholder="Delivery address..."
              value={formData.deliveryAddress}
              onChange={(e) => setFormData({ ...formData, deliveryAddress: e.target.value })}
              data-testid="input-delivery-address"
            />
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              placeholder="Order notes..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              data-testid="input-order-notes"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving} data-testid="button-save-order">
              {isSaving ? "Saving..." : order ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function OrderDetailView({
  order,
  products,
  customers,
  onClose,
}: {
  order: FurnitureSalesOrder;
  products: FurnitureProduct[];
  customers: Customer[];
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [showItemDialog, setShowItemDialog] = useState(false);

  const { data: items = [], isLoading } = useQuery<FurnitureSalesOrderItem[]>({
    queryKey: ["/api/furniture/sales-orders", order.id, "items"],
  });

  const addItemMutation = useMutation({
    mutationFn: async (data: { productId: string; quantity: number; unitPrice: string; description: string }) => {
      return apiRequest("POST", `/api/furniture/sales-orders/${order.id}/items`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/furniture/sales-orders", order.id, "items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/furniture/sales-orders"] });
      setShowItemDialog(false);
      toast({ title: "Item added successfully" });
    },
    onError: () => {
      toast({ title: "Failed to add item", variant: "destructive" });
    },
  });

  const getProductName = (productId: string | null) => {
    if (!productId) return "-";
    return products.find((p) => p.id === productId)?.name || "-";
  };

  const customer = customers.find((c) => c.id === order.customerId);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            {order.orderNumber}
            <Badge variant={getStatusVariant(order.status || "draft")}>
              {order.status}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            {customer?.name || "Unknown Customer"} | {order.orderType} order
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Subtotal</p>
                <p className="text-lg font-bold">
                  {parseFloat(order.subtotal || "0").toLocaleString()}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Tax</p>
                <p className="text-lg font-bold">
                  {parseFloat(order.taxAmount || "0").toLocaleString()}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-lg font-bold">
                  {parseFloat(order.totalAmount || "0").toLocaleString()}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Order Items ({items.length})</h3>
            <Button size="sm" onClick={() => setShowItemDialog(true)} data-testid="button-add-item">
              <Plus className="mr-2 h-4 w-4" />
              Add Item
            </Button>
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No items added yet
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Unit Price</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => {
                  const total = (item.quantity || 0) * parseFloat(item.unitPrice || "0");
                  return (
                    <TableRow key={item.id} data-testid={`row-item-${item.id}`}>
                      <TableCell>{getProductName(item.productId)}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{item.description}</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right font-mono">
                        {parseFloat(item.unitPrice || "0").toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {total.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>

        <Dialog open={showItemDialog} onOpenChange={setShowItemDialog}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>Add Item</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                addItemMutation.mutate({
                  productId: formData.get("productId") as string,
                  quantity: parseInt(formData.get("quantity") as string) || 1,
                  unitPrice: formData.get("unitPrice") as string,
                  description: formData.get("description") as string,
                });
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label>Product</Label>
                <Select name="productId">
                  <SelectTrigger>
                    <SelectValue placeholder="Select product" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Description *</Label>
                <Input name="description" required placeholder="Item description" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Quantity *</Label>
                  <Input name="quantity" type="number" defaultValue="1" required />
                </div>
                <div className="space-y-2">
                  <Label>Unit Price *</Label>
                  <Input name="unitPrice" type="number" required placeholder="25000" />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowItemDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={addItemMutation.isPending}>
                  {addItemMutation.isPending ? "Adding..." : "Add"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}

export default function FurnitureSalesOrders() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [showOrderDialog, setShowOrderDialog] = useState(false);
  const [editingOrder, setEditingOrder] = useState<FurnitureSalesOrder | null>(null);
  const [viewingOrder, setViewingOrder] = useState<FurnitureSalesOrder | null>(null);

  const pagination = usePagination({ initialLimit: 20 });

  const { data: ordersResponse, isLoading } = useQuery<PaginationResponse<FurnitureSalesOrder>>({
    queryKey: ["/api/furniture/sales-orders", pagination.queryParams],
  });

  const orders = ordersResponse?.data ?? [];
  const paginationInfo = ordersResponse?.pagination;

  const { data: customersResponse } = useQuery<PaginationResponse<Customer>>({
    queryKey: ["/api/customers", { limit: "1000" }],
  });
  const customers = customersResponse?.data ?? [];

  const { data: productsResponse } = useQuery<PaginationResponse<FurnitureProduct>>({
    queryKey: ["/api/furniture/products", { limit: "1000" }],
  });
  const products = productsResponse?.data ?? [];

  const createOrderMutation = useMutation({
    mutationFn: async (data: OrderFormData) => {
      return apiRequest("POST", "/api/furniture/sales-orders", {
        ...data,
        customerId: data.customerId || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/furniture/sales-orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/furniture/dashboard/stats"] });
      setShowOrderDialog(false);
      toast({ title: "Sales order created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create sales order", variant: "destructive" });
    },
  });

  const updateOrderMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<OrderFormData> }) => {
      return apiRequest("PATCH", `/api/furniture/sales-orders/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/furniture/sales-orders"] });
      setShowOrderDialog(false);
      setEditingOrder(null);
      toast({ title: "Sales order updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update sales order", variant: "destructive" });
    },
  });

  const handleSaveOrder = (data: OrderFormData) => {
    if (editingOrder) {
      updateOrderMutation.mutate({ id: editingOrder.id, data });
    } else {
      createOrderMutation.mutate(data);
    }
  };

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      !searchQuery ||
      order.orderNumber?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    const matchesType = typeFilter === "all" || order.orderType === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const getCustomerName = (customerId: string | null) => {
    if (!customerId) return "-";
    const customer = customers.find((c) => c.id === customerId);
    return customer?.name || "-";
  };

  return (
    <DashboardLayout
      title="Sales Orders"
      breadcrumbs={[
        { label: "Furniture", href: "/dashboard/furniture" },
        { label: "Sales Orders" },
      ]}
    >
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 flex-wrap items-center gap-3">
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search orders..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search-orders"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]" data-testid="select-filter-status">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {ORDER_STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[130px]" data-testid="select-filter-type">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {ORDER_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={() => {
              setEditingOrder(null);
              setShowOrderDialog(true);
            }}
            data-testid="button-create-order"
          >
            <Plus className="mr-2 h-4 w-4" />
            New Order
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="space-y-4 p-6">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <ShoppingCart className="h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">No sales orders</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Create a sales order to start selling
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => (
                    <TableRow key={order.id} data-testid={`row-order-${order.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
                            <FileText className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{order.orderNumber}</p>
                            <p className="text-xs text-muted-foreground">
                              {order.createdAt
                                ? new Date(order.createdAt).toLocaleDateString()
                                : "-"}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3 text-muted-foreground" />
                          {getCustomerName(order.customerId)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{order.orderType}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        <div className="flex items-center justify-end gap-1">
                          <IndianRupee className="h-3 w-3" />
                          {parseFloat(order.totalAmount || "0").toLocaleString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(order.status || "draft")}>
                          {order.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setViewingOrder(order)}
                            data-testid={`button-view-order-${order.id}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              setEditingOrder(order);
                              setShowOrderDialog(true);
                            }}
                            data-testid={`button-edit-order-${order.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            {paginationInfo && (
              <DataTablePagination
                page={paginationInfo.page}
                totalPages={paginationInfo.totalPages}
                total={paginationInfo.total}
                limit={paginationInfo.limit}
                hasNext={paginationInfo.hasNext}
                hasPrev={paginationInfo.hasPrev}
                onPageChange={pagination.setPage}
                onLimitChange={pagination.setLimit}
              />
            )}
          </CardContent>
        </Card>
      </div>

      <OrderDialog
        order={editingOrder}
        customers={customers}
        open={showOrderDialog}
        onOpenChange={(open) => {
          setShowOrderDialog(open);
          if (!open) setEditingOrder(null);
        }}
        onSave={handleSaveOrder}
        isSaving={createOrderMutation.isPending || updateOrderMutation.isPending}
      />

      {viewingOrder && (
        <OrderDetailView
          order={viewingOrder}
          products={products}
          customers={customers}
          onClose={() => setViewingOrder(null)}
        />
      )}
    </DashboardLayout>
  );
}
