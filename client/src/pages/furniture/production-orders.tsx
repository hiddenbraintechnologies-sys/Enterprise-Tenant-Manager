import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Hammer,
  Play,
  Pause,
  CheckCircle,
  Eye,
  Clock,
  Calendar,
  User,
} from "lucide-react";
import type { ProductionOrder, ProductionStage, FurnitureProduct, BillOfMaterials, FurnitureSalesOrder } from "@shared/schema";

const ORDER_STATUSES = [
  { value: "draft", label: "Draft" },
  { value: "pending", label: "Pending" },
  { value: "in_progress", label: "In Progress" },
  { value: "on_hold", label: "On Hold" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const PRIORITIES = [
  { value: "low", label: "Low" },
  { value: "normal", label: "Normal" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

const DEFAULT_STAGES = [
  { name: "Cutting", sortOrder: 1 },
  { name: "Assembly", sortOrder: 2 },
  { name: "Finishing", sortOrder: 3 },
  { name: "Quality Check", sortOrder: 4 },
  { name: "Ready for Dispatch", sortOrder: 5 },
];

interface OrderFormData {
  productId: string;
  bomId: string;
  salesOrderId: string;
  quantity: string;
  priority: string;
  scheduledStartDate: string;
  scheduledEndDate: string;
  notes: string;
}

const defaultOrderForm: OrderFormData = {
  productId: "",
  bomId: "",
  salesOrderId: "",
  quantity: "1",
  priority: "normal",
  scheduledStartDate: "",
  scheduledEndDate: "",
  notes: "",
};

function getStatusVariant(status: string) {
  switch (status) {
    case "in_progress":
      return "default";
    case "completed":
      return "outline";
    case "pending":
    case "draft":
      return "secondary";
    case "on_hold":
    case "cancelled":
      return "destructive";
    default:
      return "outline";
  }
}

function OrderDialog({
  order,
  products,
  boms,
  salesOrders,
  open,
  onOpenChange,
  onSave,
  isSaving,
}: {
  order: ProductionOrder | null;
  products: FurnitureProduct[];
  boms: BillOfMaterials[];
  salesOrders: FurnitureSalesOrder[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: OrderFormData) => void;
  isSaving: boolean;
}) {
  const [formData, setFormData] = useState<OrderFormData>(
    order
      ? {
          productId: order.productId || "",
          bomId: order.bomId || "",
          salesOrderId: order.salesOrderId || "",
          quantity: String(order.quantity || 1),
          priority: order.priority || "normal",
          scheduledStartDate: order.scheduledStartDate
            ? new Date(order.scheduledStartDate).toISOString().split("T")[0]
            : "",
          scheduledEndDate: order.scheduledEndDate
            ? new Date(order.scheduledEndDate).toISOString().split("T")[0]
            : "",
          notes: order.notes || "",
        }
      : defaultOrderForm
  );

  const filteredBoms = boms.filter((b) => b.productId === formData.productId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>{order ? "Edit Production Order" : "Create Production Order"}</DialogTitle>
          <DialogDescription>
            {order ? "Update production order details" : "Create a new production order"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Product *</Label>
            <Select
              value={formData.productId}
              onValueChange={(v) => setFormData({ ...formData, productId: v, bomId: "" })}
              disabled={!!order}
            >
              <SelectTrigger data-testid="select-order-product">
                <SelectValue placeholder="Select product" />
              </SelectTrigger>
              <SelectContent>
                {products.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} ({p.sku})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Bill of Materials</Label>
              <Select
                value={formData.bomId}
                onValueChange={(v) => setFormData({ ...formData, bomId: v })}
                disabled={!formData.productId}
              >
                <SelectTrigger data-testid="select-order-bom">
                  <SelectValue placeholder="Select BOM" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No BOM</SelectItem>
                  {filteredBoms.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name} (v{b.version})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Linked Sales Order</Label>
              <Select
                value={formData.salesOrderId}
                onValueChange={(v) => setFormData({ ...formData, salesOrderId: v })}
              >
                <SelectTrigger data-testid="select-order-sales">
                  <SelectValue placeholder="Link to sales order" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No Link</SelectItem>
                  {salesOrders.map((so) => (
                    <SelectItem key={so.id} value={so.id}>
                      {so.orderNumber}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Quantity *</Label>
              <Input
                type="number"
                placeholder="10"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                required
                data-testid="input-order-quantity"
              />
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select
                value={formData.priority}
                onValueChange={(v) => setFormData({ ...formData, priority: v })}
              >
                <SelectTrigger data-testid="select-order-priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input
                type="date"
                value={formData.scheduledStartDate}
                onChange={(e) => setFormData({ ...formData, scheduledStartDate: e.target.value })}
                data-testid="input-start-date"
              />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input
                type="date"
                value={formData.scheduledEndDate}
                onChange={(e) => setFormData({ ...formData, scheduledEndDate: e.target.value })}
                data-testid="input-end-date"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              placeholder="Additional notes..."
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

function StagesView({
  order,
  onClose,
}: {
  order: ProductionOrder;
  onClose: () => void;
}) {
  const { toast } = useToast();

  const { data: stages = [], isLoading } = useQuery<ProductionStage[]>({
    queryKey: ["/api/furniture/production-orders", order.id, "stages"],
  });

  const updateStageMutation = useMutation({
    mutationFn: async ({ stageId, status }: { stageId: string; status: string }) => {
      return apiRequest("PATCH", `/api/furniture/production-orders/${order.id}/stages/${stageId}`, {
        status,
        ...(status === "in_progress" ? { actualStartTime: new Date() } : {}),
        ...(status === "completed" ? { actualEndTime: new Date() } : {}),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/furniture/production-orders", order.id, "stages"],
      });
      queryClient.invalidateQueries({ queryKey: ["/api/furniture/production-orders"] });
      toast({ title: "Stage updated" });
    },
    onError: () => {
      toast({ title: "Failed to update stage", variant: "destructive" });
    },
  });

  const sortedStages = [...stages].sort((a, b) => (a.stageOrder || 0) - (b.stageOrder || 0));

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Hammer className="h-5 w-5" />
            Production Stages - {order.orderNumber}
          </DialogTitle>
          <DialogDescription>
            Track and update production stage progress
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : sortedStages.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No stages defined for this order
            </div>
          ) : (
            <div className="space-y-3">
              {sortedStages.map((stage, index) => (
                <Card key={stage.id} data-testid={`card-stage-${stage.id}`}>
                  <CardContent className="flex items-center gap-4 p-4">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{stage.customStageName || stage.stageType}</p>
                      {stage.assignedToId && (
                        <p className="flex items-center gap-1 text-sm text-muted-foreground">
                          <User className="h-3 w-3" />
                          Assigned
                        </p>
                      )}
                      {stage.actualStartTime && (
                        <p className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          Started: {new Date(stage.actualStartTime).toLocaleString()}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={getStatusVariant(stage.status || "pending")}>
                        {(stage.status || "pending").replace("_", " ")}
                      </Badge>
                      {(stage.status === "pending" || !stage.status) && (
                        <Button
                          size="sm"
                          onClick={() =>
                            updateStageMutation.mutate({ stageId: stage.id, status: "in_progress" })
                          }
                          disabled={updateStageMutation.isPending}
                          data-testid={`button-start-stage-${stage.id}`}
                        >
                          <Play className="mr-1 h-4 w-4" />
                          Start
                        </Button>
                      )}
                      {stage.status === "in_progress" && (
                        <Button
                          size="sm"
                          onClick={() =>
                            updateStageMutation.mutate({ stageId: stage.id, status: "completed" })
                          }
                          disabled={updateStageMutation.isPending}
                          data-testid={`button-complete-stage-${stage.id}`}
                        >
                          <CheckCircle className="mr-1 h-4 w-4" />
                          Complete
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function FurnitureProductionOrders() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [showOrderDialog, setShowOrderDialog] = useState(false);
  const [editingOrder, setEditingOrder] = useState<ProductionOrder | null>(null);
  const [viewingStages, setViewingStages] = useState<ProductionOrder | null>(null);

  const { data: orders = [], isLoading } = useQuery<ProductionOrder[]>({
    queryKey: ["/api/furniture/production-orders"],
  });

  const { data: products = [] } = useQuery<FurnitureProduct[]>({
    queryKey: ["/api/furniture/products"],
  });

  const { data: boms = [] } = useQuery<BillOfMaterials[]>({
    queryKey: ["/api/furniture/bom"],
  });

  const { data: salesOrders = [] } = useQuery<FurnitureSalesOrder[]>({
    queryKey: ["/api/furniture/sales-orders"],
  });

  const createOrderMutation = useMutation({
    mutationFn: async (data: OrderFormData) => {
      return apiRequest("POST", "/api/furniture/production-orders", {
        ...data,
        quantity: parseInt(data.quantity) || 1,
        bomId: data.bomId || null,
        salesOrderId: data.salesOrderId || null,
        scheduledStartDate: data.scheduledStartDate ? new Date(data.scheduledStartDate) : null,
        scheduledEndDate: data.scheduledEndDate ? new Date(data.scheduledEndDate) : null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/furniture/production-orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/furniture/dashboard/stats"] });
      setShowOrderDialog(false);
      toast({ title: "Production order created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create production order", variant: "destructive" });
    },
  });

  const updateOrderMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<OrderFormData> }) => {
      return apiRequest("PATCH", `/api/furniture/production-orders/${id}`, {
        ...data,
        quantity: data.quantity ? parseInt(data.quantity) : undefined,
        bomId: data.bomId || null,
        salesOrderId: data.salesOrderId || null,
        scheduledStartDate: data.scheduledStartDate ? new Date(data.scheduledStartDate) : undefined,
        scheduledEndDate: data.scheduledEndDate ? new Date(data.scheduledEndDate) : undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/furniture/production-orders"] });
      setShowOrderDialog(false);
      setEditingOrder(null);
      toast({ title: "Production order updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update production order", variant: "destructive" });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return apiRequest("PATCH", `/api/furniture/production-orders/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/furniture/production-orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/furniture/dashboard/stats"] });
      toast({ title: "Order status updated" });
    },
    onError: () => {
      toast({ title: "Failed to update status", variant: "destructive" });
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
    const matchesPriority = priorityFilter === "all" || order.priority === priorityFilter;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const getProductName = (productId: string) => {
    return products.find((p) => p.id === productId)?.name || "-";
  };

  const getPriorityVariant = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "destructive";
      case "high":
        return "default";
      case "normal":
        return "secondary";
      default:
        return "outline";
    }
  };

  return (
    <DashboardLayout
      title="Production Orders"
      breadcrumbs={[
        { label: "Furniture", href: "/dashboard/furniture" },
        { label: "Production Orders" },
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
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[130px]" data-testid="select-filter-priority">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                {PRIORITIES.map((p) => (
                  <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
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
                <Hammer className="h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">No production orders</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Create a production order to start manufacturing
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Schedule</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[150px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => (
                    <TableRow key={order.id} data-testid={`row-order-${order.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
                            <Hammer className="h-5 w-5 text-primary" />
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
                      <TableCell>{getProductName(order.productId)}</TableCell>
                      <TableCell className="text-right font-mono">{order.quantity}</TableCell>
                      <TableCell>
                        <Badge variant={getPriorityVariant(order.priority)}>
                          {order.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {order.scheduledStartDate || order.scheduledEndDate ? (
                          <div className="flex items-center gap-1 text-sm">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            <span>
                              {order.scheduledStartDate
                                ? new Date(order.scheduledStartDate).toLocaleDateString()
                                : "?"}
                              {" - "}
                              {order.scheduledEndDate
                                ? new Date(order.scheduledEndDate).toLocaleDateString()
                                : "?"}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(order.status)}>
                          {order.status.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setViewingStages(order)}
                            data-testid={`button-view-stages-${order.id}`}
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
                          {order.status === "pending" && (
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() =>
                                updateStatusMutation.mutate({
                                  id: order.id,
                                  status: "in_progress",
                                })
                              }
                              disabled={updateStatusMutation.isPending}
                              data-testid={`button-start-order-${order.id}`}
                            >
                              <Play className="h-4 w-4" />
                            </Button>
                          )}
                          {order.status === "in_progress" && (
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() =>
                                updateStatusMutation.mutate({
                                  id: order.id,
                                  status: "completed",
                                })
                              }
                              disabled={updateStatusMutation.isPending}
                              data-testid={`button-complete-order-${order.id}`}
                            >
                              <CheckCircle className="h-4 w-4" />
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

      <OrderDialog
        order={editingOrder}
        products={products}
        boms={boms}
        salesOrders={salesOrders}
        open={showOrderDialog}
        onOpenChange={(open) => {
          setShowOrderDialog(open);
          if (!open) setEditingOrder(null);
        }}
        onSave={handleSaveOrder}
        isSaving={createOrderMutation.isPending || updateOrderMutation.isPending}
      />

      {viewingStages && (
        <StagesView order={viewingStages} onClose={() => setViewingStages(null)} />
      )}
    </DashboardLayout>
  );
}
