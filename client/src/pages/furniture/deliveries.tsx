import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { usePagination, type PaginationResponse } from "@/hooks/use-pagination";
import { DataTablePagination } from "@/components/data-table-pagination";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Truck,
  Wrench,
  MapPin,
  Phone,
  Calendar,
  User,
} from "lucide-react";
import type { DeliveryOrder, InstallationOrder, FurnitureSalesOrder } from "@shared/schema";

const DELIVERY_STATUSES = [
  { value: "pending", label: "Pending" },
  { value: "scheduled", label: "Scheduled" },
  { value: "dispatched", label: "Dispatched" },
  { value: "delivered", label: "Delivered" },
  { value: "failed", label: "Failed" },
];

const INSTALLATION_STATUSES = [
  { value: "pending", label: "Pending" },
  { value: "scheduled", label: "Scheduled" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

interface DeliveryFormData {
  salesOrderId: string;
  deliveryAddress: string;
  deliveryContact: string;
  deliveryPhone: string;
  scheduledDate: string;
  scheduledTimeSlot: string;
  vehicleNumber: string;
  notes: string;
}

interface InstallationFormData {
  deliveryOrderId: string;
  customerId: string;
  scheduledDate: string;
  scheduledTimeSlot: string;
  notes: string;
}

function getDeliveryStatusVariant(status: string) {
  switch (status) {
    case "delivered":
      return "default";
    case "dispatched":
      return "outline";
    case "scheduled":
      return "secondary";
    case "failed":
      return "destructive";
    default:
      return "outline";
  }
}

function getInstallStatusVariant(status: string) {
  switch (status) {
    case "completed":
      return "default";
    case "in_progress":
      return "outline";
    case "scheduled":
      return "secondary";
    case "cancelled":
      return "destructive";
    default:
      return "outline";
  }
}

function DeliveryDialog({
  delivery,
  salesOrders,
  open,
  onOpenChange,
  onSave,
  isSaving,
}: {
  delivery: DeliveryOrder | null;
  salesOrders: FurnitureSalesOrder[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: DeliveryFormData) => void;
  isSaving: boolean;
}) {
  const [formData, setFormData] = useState<DeliveryFormData>({
    salesOrderId: delivery?.salesOrderId || "",
    deliveryAddress: delivery?.deliveryAddress || "",
    deliveryContact: delivery?.deliveryContact || "",
    deliveryPhone: delivery?.deliveryPhone || "",
    scheduledDate: delivery?.scheduledDate
      ? new Date(delivery.scheduledDate).toISOString().split("T")[0]
      : "",
    scheduledTimeSlot: delivery?.scheduledTimeSlot || "",
    vehicleNumber: delivery?.vehicleNumber || "",
    notes: delivery?.notes || "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{delivery ? "Edit Delivery" : "Schedule Delivery"}</DialogTitle>
          <DialogDescription>
            {delivery ? "Update delivery details" : "Schedule a new delivery"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Sales Order</Label>
            <Select
              value={formData.salesOrderId}
              onValueChange={(v) => setFormData({ ...formData, salesOrderId: v })}
            >
              <SelectTrigger data-testid="select-delivery-order">
                <SelectValue placeholder="Select sales order" />
              </SelectTrigger>
              <SelectContent>
                {salesOrders.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.orderNumber}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Delivery Address *</Label>
            <Textarea
              required
              placeholder="Full delivery address..."
              value={formData.deliveryAddress}
              onChange={(e) => setFormData({ ...formData, deliveryAddress: e.target.value })}
              data-testid="input-delivery-address"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Contact Name</Label>
              <Input
                placeholder="Contact person..."
                value={formData.deliveryContact}
                onChange={(e) => setFormData({ ...formData, deliveryContact: e.target.value })}
                data-testid="input-delivery-contact"
              />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                placeholder="Phone number..."
                value={formData.deliveryPhone}
                onChange={(e) => setFormData({ ...formData, deliveryPhone: e.target.value })}
                data-testid="input-delivery-phone"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Scheduled Date</Label>
              <Input
                type="date"
                value={formData.scheduledDate}
                onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
                data-testid="input-scheduled-date"
              />
            </div>
            <div className="space-y-2">
              <Label>Time Slot</Label>
              <Select
                value={formData.scheduledTimeSlot}
                onValueChange={(v) => setFormData({ ...formData, scheduledTimeSlot: v })}
              >
                <SelectTrigger data-testid="select-time-slot">
                  <SelectValue placeholder="Select time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="morning">Morning (9AM-12PM)</SelectItem>
                  <SelectItem value="afternoon">Afternoon (12PM-4PM)</SelectItem>
                  <SelectItem value="evening">Evening (4PM-7PM)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Vehicle Number</Label>
            <Input
              placeholder="Vehicle number..."
              value={formData.vehicleNumber}
              onChange={(e) => setFormData({ ...formData, vehicleNumber: e.target.value })}
              data-testid="input-vehicle-number"
            />
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              placeholder="Delivery notes..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              data-testid="input-delivery-notes"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving} data-testid="button-save-delivery">
              {isSaving ? "Saving..." : delivery ? "Update" : "Schedule"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function InstallationDialog({
  installation,
  deliveries,
  open,
  onOpenChange,
  onSave,
  isSaving,
}: {
  installation: InstallationOrder | null;
  deliveries: DeliveryOrder[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: InstallationFormData) => void;
  isSaving: boolean;
}) {
  const [formData, setFormData] = useState<InstallationFormData>({
    deliveryOrderId: installation?.deliveryOrderId || "",
    customerId: installation?.customerId || "",
    scheduledDate: installation?.scheduledDate
      ? new Date(installation.scheduledDate).toISOString().split("T")[0]
      : "",
    scheduledTimeSlot: installation?.scheduledTimeSlot || "",
    notes: installation?.notes || "",
  });

  const handleSelectDelivery = (deliveryId: string) => {
    const delivery = deliveries.find(d => d.id === deliveryId);
    setFormData({
      ...formData,
      deliveryOrderId: deliveryId,
      customerId: delivery?.customerId || "",
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>{installation ? "Edit Installation" : "Schedule Installation"}</DialogTitle>
          <DialogDescription>
            {installation ? "Update installation details" : "Schedule a new installation after delivery"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Delivery Order *</Label>
            <Select
              value={formData.deliveryOrderId}
              onValueChange={handleSelectDelivery}
            >
              <SelectTrigger data-testid="select-install-delivery">
                <SelectValue placeholder="Select a delivered order" />
              </SelectTrigger>
              <SelectContent>
                {deliveries.filter(d => d.deliveryStatus === "delivered").map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.deliveryNumber}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Scheduled Date</Label>
              <Input
                type="date"
                value={formData.scheduledDate}
                onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
                data-testid="input-install-date"
              />
            </div>
            <div className="space-y-2">
              <Label>Time Slot</Label>
              <Select
                value={formData.scheduledTimeSlot}
                onValueChange={(v) => setFormData({ ...formData, scheduledTimeSlot: v })}
              >
                <SelectTrigger data-testid="select-install-time">
                  <SelectValue placeholder="Select time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="morning">Morning (9AM-12PM)</SelectItem>
                  <SelectItem value="afternoon">Afternoon (12PM-4PM)</SelectItem>
                  <SelectItem value="evening">Evening (4PM-7PM)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              placeholder="Installation notes..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              data-testid="input-install-notes"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving} data-testid="button-save-installation">
              {isSaving ? "Saving..." : installation ? "Update" : "Schedule"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function FurnitureDeliveries() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("deliveries");
  const [searchInput, setSearchInput] = useState("");
  const [showDeliveryDialog, setShowDeliveryDialog] = useState(false);
  const [showInstallDialog, setShowInstallDialog] = useState(false);
  const [editingDelivery, setEditingDelivery] = useState<DeliveryOrder | null>(null);
  const [editingInstall, setEditingInstall] = useState<InstallationOrder | null>(null);

  const deliveryPagination = usePagination({ initialLimit: 20 });
  const installPagination = usePagination({ initialLimit: 20 });

  // Debounced search - update server filter after 300ms delay
  useEffect(() => {
    const timer = setTimeout(() => {
      if (activeTab === "deliveries") {
        deliveryPagination.setFilter("search", searchInput || undefined);
      } else {
        installPagination.setFilter("search", searchInput || undefined);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput, activeTab]);

  // Clear search when switching tabs to prevent stale filters
  const handleTabChange = (newTab: string) => {
    setSearchInput("");
    deliveryPagination.clearFilters();
    installPagination.clearFilters();
    setActiveTab(newTab);
  };

  const { data: deliveriesResponse, isLoading: loadingDeliveries } = useQuery<PaginationResponse<DeliveryOrder>>({
    queryKey: ["/api/furniture/deliveries", deliveryPagination.queryParams],
  });

  const deliveries = deliveriesResponse?.data ?? [];
  const deliveryPaginationInfo = deliveriesResponse?.pagination;

  const { data: installationsResponse, isLoading: loadingInstalls } = useQuery<PaginationResponse<InstallationOrder>>({
    queryKey: ["/api/furniture/installations", installPagination.queryParams],
    enabled: activeTab === "installations",
  });

  const installations = installationsResponse?.data ?? [];
  const installPaginationInfo = installationsResponse?.pagination;

  const { data: salesOrdersResponse } = useQuery<PaginationResponse<FurnitureSalesOrder>>({
    queryKey: ["/api/furniture/sales-orders", { limit: "1000" }],
  });
  const salesOrders = salesOrdersResponse?.data ?? [];

  const createDeliveryMutation = useMutation({
    mutationFn: async (data: DeliveryFormData) => {
      return apiRequest("POST", "/api/furniture/deliveries", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/furniture/deliveries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/furniture/dashboard/stats"] });
      setShowDeliveryDialog(false);
      toast({ title: "Delivery scheduled successfully" });
    },
    onError: () => {
      toast({ title: "Failed to schedule delivery", variant: "destructive" });
    },
  });

  const updateDeliveryMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<DeliveryFormData> }) => {
      return apiRequest("PATCH", `/api/furniture/deliveries/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/furniture/deliveries"] });
      setShowDeliveryDialog(false);
      setEditingDelivery(null);
      toast({ title: "Delivery updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update delivery", variant: "destructive" });
    },
  });

  const createInstallMutation = useMutation({
    mutationFn: async (data: InstallationFormData) => {
      return apiRequest("POST", "/api/furniture/installations", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/furniture/installations"] });
      setShowInstallDialog(false);
      toast({ title: "Installation scheduled successfully" });
    },
    onError: () => {
      toast({ title: "Failed to schedule installation", variant: "destructive" });
    },
  });

  const updateInstallMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InstallationFormData> }) => {
      return apiRequest("PATCH", `/api/furniture/installations/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/furniture/installations"] });
      setShowInstallDialog(false);
      setEditingInstall(null);
      toast({ title: "Installation updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update installation", variant: "destructive" });
    },
  });

  const handleSaveDelivery = (data: DeliveryFormData) => {
    if (editingDelivery) {
      updateDeliveryMutation.mutate({ id: editingDelivery.id, data });
    } else {
      createDeliveryMutation.mutate(data);
    }
  };

  const handleSaveInstall = (data: InstallationFormData) => {
    if (editingInstall) {
      updateInstallMutation.mutate({ id: editingInstall.id, data });
    } else {
      createInstallMutation.mutate(data);
    }
  };

  // Server-side filtering - no client-side filtering needed

  const getOrderNumber = (salesOrderId: string | null) => {
    if (!salesOrderId) return "-";
    return salesOrders.find((o) => o.id === salesOrderId)?.orderNumber || "-";
  };

  return (
    <DashboardLayout
      title="Deliveries & Installations"
      breadcrumbs={[
        { label: "Furniture", href: "/dashboard/furniture" },
        { label: "Deliveries & Installations" },
      ]}
    >
      <div className="space-y-6">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <TabsList>
              <TabsTrigger value="deliveries" data-testid="tab-deliveries">
                <Truck className="mr-2 h-4 w-4" />
                Deliveries ({deliveries.length})
              </TabsTrigger>
              <TabsTrigger value="installations" data-testid="tab-installations">
                <Wrench className="mr-2 h-4 w-4" />
                Installations ({installations.length})
              </TabsTrigger>
            </TabsList>

            <Button
              onClick={() => {
                if (activeTab === "deliveries") {
                  setEditingDelivery(null);
                  setShowDeliveryDialog(true);
                } else {
                  setEditingInstall(null);
                  setShowInstallDialog(true);
                }
              }}
              data-testid="button-create-new"
            >
              <Plus className="mr-2 h-4 w-4" />
              {activeTab === "deliveries" ? "Schedule Delivery" : "Schedule Installation"}
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={activeTab === "deliveries" ? "Search deliveries..." : "Search installations..."}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-9"
                data-testid="input-search"
              />
            </div>
            <Select 
              value={(activeTab === "deliveries" ? deliveryPagination.filters.status : installPagination.filters.status) || "all"} 
              onValueChange={(v) => {
                if (activeTab === "deliveries") {
                  deliveryPagination.setFilter("status", v === "all" ? undefined : v);
                } else {
                  installPagination.setFilter("status", v === "all" ? undefined : v);
                }
              }}
            >
              <SelectTrigger className="w-[150px]" data-testid="select-filter-status">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {(activeTab === "deliveries" ? DELIVERY_STATUSES : INSTALLATION_STATUSES).map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <TabsContent value="deliveries">
            <Card>
              <CardContent className="p-0">
                {loadingDeliveries ? (
                  <div className="space-y-4 p-6">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : deliveries.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Truck className="h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-4 text-lg font-semibold">No deliveries</h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Schedule a delivery for completed orders
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Delivery</TableHead>
                        <TableHead>Order</TableHead>
                        <TableHead>Address</TableHead>
                        <TableHead>Scheduled</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-[80px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {deliveries.map((delivery) => (
                        <TableRow key={delivery.id} data-testid={`row-delivery-${delivery.id}`}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
                                <Truck className="h-5 w-5 text-primary" />
                              </div>
                              <div>
                                <p className="font-medium">{delivery.deliveryNumber}</p>
                                {delivery.vehicleNumber && (
                                  <p className="text-xs text-muted-foreground">
                                    {delivery.vehicleNumber}
                                  </p>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{getOrderNumber(delivery.salesOrderId)}</TableCell>
                          <TableCell>
                            <div className="flex items-start gap-1">
                              <MapPin className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
                              <span className="max-w-[200px] truncate">{delivery.deliveryAddress}</span>
                            </div>
                            {delivery.deliveryPhone && (
                              <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                                <Phone className="h-3 w-3" />
                                {delivery.deliveryPhone}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3 text-muted-foreground" />
                              {delivery.scheduledDate
                                ? new Date(delivery.scheduledDate).toLocaleDateString()
                                : "-"}
                            </div>
                            {delivery.scheduledTimeSlot && (
                              <p className="text-xs text-muted-foreground">{delivery.scheduledTimeSlot}</p>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant={getDeliveryStatusVariant(delivery.deliveryStatus || "pending")}>
                              {delivery.deliveryStatus}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                setEditingDelivery(delivery);
                                setShowDeliveryDialog(true);
                              }}
                              data-testid={`button-edit-delivery-${delivery.id}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
                {deliveryPaginationInfo && (
                  <DataTablePagination
                    page={deliveryPaginationInfo.page}
                    totalPages={deliveryPaginationInfo.totalPages}
                    total={deliveryPaginationInfo.total}
                    limit={deliveryPaginationInfo.limit}
                    hasNext={deliveryPaginationInfo.hasNext}
                    hasPrev={deliveryPaginationInfo.hasPrev}
                    onPageChange={deliveryPagination.setPage}
                    onLimitChange={deliveryPagination.setLimit}
                    isFiltered={deliveryPagination.hasActiveFilters}
                    onClearFilters={() => {
                      deliveryPagination.clearFilters();
                      installPagination.clearFilters();
                      setSearchInput("");
                    }}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="installations">
            <Card>
              <CardContent className="p-0">
                {loadingInstalls ? (
                  <div className="space-y-4 p-6">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : installations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Wrench className="h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-4 text-lg font-semibold">No installations</h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Schedule installations for delivered orders
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Installation</TableHead>
                        <TableHead>Order</TableHead>
                        <TableHead>Scheduled</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-[80px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {installations.map((install) => (
                        <TableRow key={install.id} data-testid={`row-install-${install.id}`}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
                                <Wrench className="h-5 w-5 text-primary" />
                              </div>
                              <div>
                                <p className="font-medium">{install.installationNumber}</p>
                                {install.installerId && (
                                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <User className="h-3 w-3" />
                                    Assigned
                                  </p>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {install.deliveryOrderId 
                              ? deliveries.find(d => d.id === install.deliveryOrderId)?.salesOrderId 
                                ? getOrderNumber(deliveries.find(d => d.id === install.deliveryOrderId)?.salesOrderId || null) 
                                : "-"
                              : "-"}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3 text-muted-foreground" />
                              {install.scheduledDate
                                ? new Date(install.scheduledDate).toLocaleDateString()
                                : "-"}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={getInstallStatusVariant(install.installationStatus || "pending")}>
                              {install.installationStatus}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                setEditingInstall(install);
                                setShowInstallDialog(true);
                              }}
                              data-testid={`button-edit-install-${install.id}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
                {installPaginationInfo && (
                  <DataTablePagination
                    page={installPaginationInfo.page}
                    totalPages={installPaginationInfo.totalPages}
                    total={installPaginationInfo.total}
                    limit={installPaginationInfo.limit}
                    hasNext={installPaginationInfo.hasNext}
                    hasPrev={installPaginationInfo.hasPrev}
                    onPageChange={installPagination.setPage}
                    onLimitChange={installPagination.setLimit}
                    isFiltered={installPagination.hasActiveFilters}
                    onClearFilters={() => {
                      deliveryPagination.clearFilters();
                      installPagination.clearFilters();
                      setSearchInput("");
                    }}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <DeliveryDialog
        delivery={editingDelivery}
        salesOrders={salesOrders}
        open={showDeliveryDialog}
        onOpenChange={(open) => {
          setShowDeliveryDialog(open);
          if (!open) setEditingDelivery(null);
        }}
        onSave={handleSaveDelivery}
        isSaving={createDeliveryMutation.isPending || updateDeliveryMutation.isPending}
      />

      <InstallationDialog
        installation={editingInstall}
        deliveries={deliveries}
        open={showInstallDialog}
        onOpenChange={(open) => {
          setShowInstallDialog(open);
          if (!open) setEditingInstall(null);
        }}
        onSave={handleSaveInstall}
        isSaving={createInstallMutation.isPending || updateInstallMutation.isPending}
      />
    </DashboardLayout>
  );
}
