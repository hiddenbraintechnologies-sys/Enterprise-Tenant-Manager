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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Plus,
  Search,
  Pencil,
  Package,
  AlertTriangle,
  ArrowDownCircle,
  ArrowUpCircle,
  History,
  Trash2,
} from "lucide-react";
import type { RawMaterial, RawMaterialCategory, RawMaterialStockMovement } from "@shared/schema";

const UNITS_OF_MEASURE = [
  { value: "pcs", label: "Pieces" },
  { value: "kg", label: "Kilograms" },
  { value: "g", label: "Grams" },
  { value: "sqft", label: "Square Feet" },
  { value: "sqm", label: "Square Meters" },
  { value: "meter", label: "Meters" },
  { value: "cm", label: "Centimeters" },
  { value: "liter", label: "Liters" },
  { value: "sheet", label: "Sheets" },
];

interface MaterialFormData {
  sku: string;
  name: string;
  description: string;
  categoryId: string;
  unitOfMeasure: string;
  unitCost: string;
  minStockLevel: string;
  maxStockLevel: string;
  reorderPoint: string;
  warehouseLocation: string;
  hsnCode: string;
  gstRate: string;
  enableBatchTracking: boolean;
  isActive: boolean;
}

const defaultFormData: MaterialFormData = {
  sku: "",
  name: "",
  description: "",
  categoryId: "",
  unitOfMeasure: "pcs",
  unitCost: "",
  minStockLevel: "0",
  maxStockLevel: "",
  reorderPoint: "0",
  warehouseLocation: "",
  hsnCode: "",
  gstRate: "18",
  enableBatchTracking: false,
  isActive: true,
};

interface StockMovementFormData {
  rawMaterialId: string;
  movementType: string;
  quantity: string;
  unitCost: string;
  batchNumber: string;
  lotNumber: string;
  notes: string;
}

function MaterialDialog({
  material,
  categories,
  open,
  onOpenChange,
  onSave,
  isSaving,
}: {
  material: RawMaterial | null;
  categories: RawMaterialCategory[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: MaterialFormData) => void;
  isSaving: boolean;
}) {
  const [formData, setFormData] = useState<MaterialFormData>(
    material
      ? {
          sku: material.sku || "",
          name: material.name || "",
          description: material.description || "",
          categoryId: material.categoryId || "",
          unitOfMeasure: material.unitOfMeasure || "pcs",
          unitCost: material.unitCost || "",
          minStockLevel: material.minStockLevel || "0",
          maxStockLevel: material.maxStockLevel || "",
          reorderPoint: material.reorderPoint || "0",
          warehouseLocation: material.warehouseLocation || "",
          hsnCode: material.hsnCode || "",
          gstRate: material.gstRate || "18",
          enableBatchTracking: material.enableBatchTracking || false,
          isActive: material.isActive ?? true,
        }
      : defaultFormData
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{material ? "Edit Raw Material" : "Add Raw Material"}</DialogTitle>
          <DialogDescription>
            {material ? "Update material details" : "Add a new raw material to inventory"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>SKU *</Label>
              <Input
                placeholder="RM-001"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                required
                disabled={!!material}
                data-testid="input-material-sku"
              />
            </div>
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                placeholder="Teak Wood Plank"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                data-testid="input-material-name"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              placeholder="Material description..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              data-testid="input-material-description"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={formData.categoryId}
                onValueChange={(v) => setFormData({ ...formData, categoryId: v })}
              >
                <SelectTrigger data-testid="select-category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No Category</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Unit of Measure *</Label>
              <Select
                value={formData.unitOfMeasure}
                onValueChange={(v) => setFormData({ ...formData, unitOfMeasure: v })}
              >
                <SelectTrigger data-testid="select-unit">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UNITS_OF_MEASURE.map((u) => (
                    <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Unit Cost *</Label>
              <Input
                type="number"
                placeholder="500"
                value={formData.unitCost}
                onChange={(e) => setFormData({ ...formData, unitCost: e.target.value })}
                required
                data-testid="input-unit-cost"
              />
            </div>
            <div className="space-y-2">
              <Label>Warehouse Location</Label>
              <Input
                placeholder="A-01-05"
                value={formData.warehouseLocation}
                onChange={(e) => setFormData({ ...formData, warehouseLocation: e.target.value })}
                data-testid="input-warehouse-location"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Min Stock</Label>
              <Input
                type="number"
                placeholder="10"
                value={formData.minStockLevel}
                onChange={(e) => setFormData({ ...formData, minStockLevel: e.target.value })}
                data-testid="input-min-stock"
              />
            </div>
            <div className="space-y-2">
              <Label>Max Stock</Label>
              <Input
                type="number"
                placeholder="1000"
                value={formData.maxStockLevel}
                onChange={(e) => setFormData({ ...formData, maxStockLevel: e.target.value })}
                data-testid="input-max-stock"
              />
            </div>
            <div className="space-y-2">
              <Label>Reorder Point</Label>
              <Input
                type="number"
                placeholder="20"
                value={formData.reorderPoint}
                onChange={(e) => setFormData({ ...formData, reorderPoint: e.target.value })}
                data-testid="input-reorder-point"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>HSN Code</Label>
              <Input
                placeholder="4403"
                value={formData.hsnCode}
                onChange={(e) => setFormData({ ...formData, hsnCode: e.target.value })}
                data-testid="input-hsn-code"
              />
            </div>
            <div className="space-y-2">
              <Label>GST Rate (%)</Label>
              <Input
                type="number"
                placeholder="18"
                value={formData.gstRate}
                onChange={(e) => setFormData({ ...formData, gstRate: e.target.value })}
                data-testid="input-gst-rate"
              />
            </div>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Switch
                checked={formData.enableBatchTracking}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, enableBatchTracking: checked })
                }
                data-testid="switch-batch-tracking"
              />
              <Label>Enable Batch Tracking</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                data-testid="switch-active"
              />
              <Label>Active</Label>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving} data-testid="button-save-material">
              {isSaving ? "Saving..." : material ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function StockMovementDialog({
  materials,
  open,
  onOpenChange,
  onSave,
  isSaving,
}: {
  materials: RawMaterial[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: StockMovementFormData) => void;
  isSaving: boolean;
}) {
  const [formData, setFormData] = useState<StockMovementFormData>({
    rawMaterialId: "",
    movementType: "in",
    quantity: "",
    unitCost: "",
    batchNumber: "",
    lotNumber: "",
    notes: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const selectedMaterial = materials.find((m) => m.id === formData.rawMaterialId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Record Stock Movement</DialogTitle>
          <DialogDescription>Record stock in, out, or adjustment</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Raw Material *</Label>
            <Select
              value={formData.rawMaterialId}
              onValueChange={(v) => setFormData({ ...formData, rawMaterialId: v })}
            >
              <SelectTrigger data-testid="select-movement-material">
                <SelectValue placeholder="Select material" />
              </SelectTrigger>
              <SelectContent>
                {materials.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name} ({m.sku})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedMaterial && (
              <p className="text-sm text-muted-foreground">
                Current Stock: {selectedMaterial.currentStock} {selectedMaterial.unitOfMeasure}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Movement Type *</Label>
              <Select
                value={formData.movementType}
                onValueChange={(v) => setFormData({ ...formData, movementType: v })}
              >
                <SelectTrigger data-testid="select-movement-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="in">Stock In</SelectItem>
                  <SelectItem value="out">Stock Out</SelectItem>
                  <SelectItem value="adjustment">Adjustment</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Quantity *</Label>
              <Input
                type="number"
                placeholder="100"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                required
                data-testid="input-movement-quantity"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Unit Cost</Label>
              <Input
                type="number"
                placeholder="500"
                value={formData.unitCost}
                onChange={(e) => setFormData({ ...formData, unitCost: e.target.value })}
                data-testid="input-movement-cost"
              />
            </div>
            <div className="space-y-2">
              <Label>Batch Number</Label>
              <Input
                placeholder="BATCH-001"
                value={formData.batchNumber}
                onChange={(e) => setFormData({ ...formData, batchNumber: e.target.value })}
                data-testid="input-batch-number"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              placeholder="Additional notes..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              data-testid="input-movement-notes"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving} data-testid="button-save-movement">
              {isSaving ? "Recording..." : "Record Movement"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function FurnitureRawMaterials() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [showLowStock, setShowLowStock] = useState(false);
  const [showMaterialDialog, setShowMaterialDialog] = useState(false);
  const [showMovementDialog, setShowMovementDialog] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<RawMaterial | null>(null);
  const [activeTab, setActiveTab] = useState("materials");

  const pagination = usePagination({ initialLimit: 20 });

  const { data: materialsResponse, isLoading: loadingMaterials } = useQuery<PaginationResponse<RawMaterial>>({
    queryKey: ["/api/furniture/raw-materials", pagination.queryParams],
  });

  const materials = materialsResponse?.data ?? [];
  const paginationInfo = materialsResponse?.pagination;

  const { data: categories = [] } = useQuery<RawMaterialCategory[]>({
    queryKey: ["/api/furniture/raw-material-categories"],
  });

  const { data: lowStockMaterials = [] } = useQuery<RawMaterial[]>({
    queryKey: ["/api/furniture/raw-materials/low-stock"],
  });

  const { data: movements = [], isLoading: loadingMovements } = useQuery<RawMaterialStockMovement[]>({
    queryKey: ["/api/furniture/stock-movements"],
    enabled: activeTab === "movements",
  });

  const createMaterialMutation = useMutation({
    mutationFn: async (data: MaterialFormData) => {
      return apiRequest("POST", "/api/furniture/raw-materials", {
        ...data,
        categoryId: data.categoryId || null,
        maxStockLevel: data.maxStockLevel || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/furniture/raw-materials"] });
      queryClient.invalidateQueries({ queryKey: ["/api/furniture/dashboard/stats"] });
      setShowMaterialDialog(false);
      toast({ title: "Raw material created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create raw material", variant: "destructive" });
    },
  });

  const updateMaterialMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: MaterialFormData }) => {
      return apiRequest("PATCH", `/api/furniture/raw-materials/${id}`, {
        ...data,
        categoryId: data.categoryId || null,
        maxStockLevel: data.maxStockLevel || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/furniture/raw-materials"] });
      setShowMaterialDialog(false);
      setEditingMaterial(null);
      toast({ title: "Raw material updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update raw material", variant: "destructive" });
    },
  });

  const createMovementMutation = useMutation({
    mutationFn: async (data: StockMovementFormData) => {
      return apiRequest("POST", "/api/furniture/stock-movements", {
        ...data,
        quantity: data.quantity,
        unitCost: data.unitCost || null,
        batchNumber: data.batchNumber || null,
        lotNumber: data.lotNumber || null,
        notes: data.notes || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/furniture/raw-materials"] });
      queryClient.invalidateQueries({ queryKey: ["/api/furniture/stock-movements"] });
      queryClient.invalidateQueries({ queryKey: ["/api/furniture/raw-materials/low-stock"] });
      queryClient.invalidateQueries({ queryKey: ["/api/furniture/dashboard/stats"] });
      setShowMovementDialog(false);
      toast({ title: "Stock movement recorded successfully" });
    },
    onError: () => {
      toast({ title: "Failed to record stock movement", variant: "destructive" });
    },
  });

  const handleSaveMaterial = (data: MaterialFormData) => {
    if (editingMaterial) {
      updateMaterialMutation.mutate({ id: editingMaterial.id, data });
    } else {
      createMaterialMutation.mutate(data);
    }
  };

  const displayMaterials = showLowStock ? lowStockMaterials : materials;
  const filteredMaterials = displayMaterials.filter((material) => {
    const matchesSearch =
      !searchQuery ||
      material.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      material.sku.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      categoryFilter === "all" || material.categoryId === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const getCategoryName = (categoryId: string | null) => {
    if (!categoryId) return "-";
    return categories.find((c) => c.id === categoryId)?.name || "-";
  };

  const getMaterialName = (materialId: string) => {
    return materials.find((m) => m.id === materialId)?.name || "-";
  };

  return (
    <DashboardLayout
      title="Raw Materials & Inventory"
      breadcrumbs={[
        { label: "Furniture", href: "/dashboard/furniture" },
        { label: "Raw Materials" },
      ]}
    >
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <TabsList>
            <TabsTrigger value="materials" data-testid="tab-materials">
              <Package className="mr-2 h-4 w-4" />
              Materials
            </TabsTrigger>
            <TabsTrigger value="movements" data-testid="tab-movements">
              <History className="mr-2 h-4 w-4" />
              Stock Movements
            </TabsTrigger>
          </TabsList>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowMovementDialog(true)}
              data-testid="button-record-movement"
            >
              <ArrowDownCircle className="mr-2 h-4 w-4" />
              Stock In/Out
            </Button>
            <Button
              onClick={() => {
                setEditingMaterial(null);
                setShowMaterialDialog(true);
              }}
              data-testid="button-add-material"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Material
            </Button>
          </div>
        </div>

        <TabsContent value="materials" className="space-y-6">
          {lowStockMaterials.length > 0 && (
            <Card className="border-destructive/50 bg-destructive/5">
              <CardContent className="flex items-center gap-4 p-4">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                <div className="flex-1">
                  <p className="font-medium text-destructive">
                    {lowStockMaterials.length} materials below minimum stock level
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Review and reorder to prevent production delays
                  </p>
                </div>
                <Button
                  variant={showLowStock ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowLowStock(!showLowStock)}
                  data-testid="button-toggle-low-stock"
                >
                  {showLowStock ? "Show All" : "Show Low Stock"}
                </Button>
              </CardContent>
            </Card>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search materials..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search-materials"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[180px]" data-testid="select-filter-category">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardContent className="p-0">
              {loadingMaterials ? (
                <div className="space-y-4 p-6">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : filteredMaterials.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Package className="h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-semibold">No materials found</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Get started by adding your first raw material
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Material</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead className="text-right">Unit Cost</TableHead>
                      <TableHead className="text-right">Current Stock</TableHead>
                      <TableHead className="text-right">Min Level</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[80px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMaterials.map((material) => {
                      const isLowStock =
                        parseFloat(material.currentStock || "0") <=
                        parseFloat(material.minStockLevel || "0");
                      return (
                        <TableRow key={material.id} data-testid={`row-material-${material.id}`}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
                                <Package className="h-5 w-5 text-primary" />
                              </div>
                              <div>
                                <p className="font-medium">{material.name}</p>
                                <p className="text-xs text-muted-foreground">{material.sku}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{getCategoryName(material.categoryId)}</TableCell>
                          <TableCell className="uppercase">{material.unitOfMeasure}</TableCell>
                          <TableCell className="text-right font-mono text-sm">
                            {parseFloat(material.unitCost).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <span className={isLowStock ? "font-medium text-destructive" : ""}>
                              {parseFloat(material.currentStock || "0").toLocaleString()}
                            </span>
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {parseFloat(material.minStockLevel || "0").toLocaleString()}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {material.warehouseLocation || "-"}
                          </TableCell>
                          <TableCell>
                            {isLowStock ? (
                              <Badge variant="destructive">Low Stock</Badge>
                            ) : (
                              <Badge variant={material.isActive ? "default" : "secondary"}>
                                {material.isActive ? "Active" : "Inactive"}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                setEditingMaterial(material);
                                setShowMaterialDialog(true);
                              }}
                              data-testid={`button-edit-material-${material.id}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
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
        </TabsContent>

        <TabsContent value="movements" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Stock Movement History</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loadingMovements ? (
                <div className="space-y-4 p-6">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : movements.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <History className="h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-semibold">No movements recorded</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Stock movements will appear here once recorded
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Material</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                      <TableHead className="text-right">Balance After</TableHead>
                      <TableHead>Batch</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movements.map((movement) => (
                      <TableRow key={movement.id} data-testid={`row-movement-${movement.id}`}>
                        <TableCell className="text-sm">
                          {movement.createdAt
                            ? new Date(movement.createdAt).toLocaleDateString()
                            : "-"}
                        </TableCell>
                        <TableCell>{getMaterialName(movement.rawMaterialId)}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              movement.movementType === "in"
                                ? "default"
                                : movement.movementType === "out"
                                ? "secondary"
                                : "outline"
                            }
                          >
                            <span className="flex items-center gap-1">
                              {movement.movementType === "in" ? (
                                <ArrowDownCircle className="h-3 w-3" />
                              ) : movement.movementType === "out" ? (
                                <ArrowUpCircle className="h-3 w-3" />
                              ) : null}
                              {movement.movementType.toUpperCase()}
                            </span>
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {movement.movementType === "out" ? "-" : "+"}
                          {parseFloat(movement.quantity).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {parseFloat(movement.balanceAfter).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {movement.batchNumber || "-"}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate text-muted-foreground">
                          {movement.notes || "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <MaterialDialog
        material={editingMaterial}
        categories={categories}
        open={showMaterialDialog}
        onOpenChange={(open) => {
          setShowMaterialDialog(open);
          if (!open) setEditingMaterial(null);
        }}
        onSave={handleSaveMaterial}
        isSaving={createMaterialMutation.isPending || updateMaterialMutation.isPending}
      />

      <StockMovementDialog
        materials={materials}
        open={showMovementDialog}
        onOpenChange={setShowMovementDialog}
        onSave={(data) => createMovementMutation.mutate(data)}
        isSaving={createMovementMutation.isPending}
      />
    </DashboardLayout>
  );
}
