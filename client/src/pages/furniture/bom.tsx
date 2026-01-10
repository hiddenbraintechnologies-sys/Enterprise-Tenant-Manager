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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Plus,
  Search,
  Pencil,
  ClipboardList,
  Layers,
  Package,
  Trash2,
  Copy,
  Eye,
  Archive,
} from "lucide-react";
import type { BillOfMaterials, BomComponent, FurnitureProduct, RawMaterial } from "@shared/schema";

interface BomFormData {
  productId: string;
  name: string;
  description: string;
  laborCost: string;
  overheadCost: string;
  yieldQuantity: string;
  isPrimary: boolean;
  isActive: boolean;
}

const defaultBomForm: BomFormData = {
  productId: "",
  name: "",
  description: "",
  laborCost: "0",
  overheadCost: "0",
  yieldQuantity: "1",
  isPrimary: false,
  isActive: true,
};

interface ComponentFormData {
  rawMaterialId: string;
  quantity: string;
  unitOfMeasure: string;
  wastePercentage: string;
  notes: string;
}

function BomDialog({
  bom,
  products,
  open,
  onOpenChange,
  onSave,
  isSaving,
}: {
  bom: BillOfMaterials | null;
  products: FurnitureProduct[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: BomFormData) => void;
  isSaving: boolean;
}) {
  const [formData, setFormData] = useState<BomFormData>(
    bom
      ? {
          productId: bom.productId || "",
          name: bom.name || "",
          description: bom.description || "",
          laborCost: bom.laborCost || "0",
          overheadCost: bom.overheadCost || "0",
          yieldQuantity: String(bom.yieldQuantity || 1),
          isPrimary: bom.isPrimary || false,
          isActive: bom.isActive ?? true,
        }
      : defaultBomForm
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{bom ? "Edit BOM" : "Create Bill of Materials"}</DialogTitle>
          <DialogDescription>
            {bom
              ? "Update BOM details. Components can be managed separately."
              : "Create a new BOM for a product"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Product *</Label>
            <Select
              value={formData.productId}
              onValueChange={(v) => setFormData({ ...formData, productId: v })}
              disabled={!!bom}
            >
              <SelectTrigger data-testid="select-bom-product">
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

          <div className="space-y-2">
            <Label>BOM Name *</Label>
            <Input
              placeholder="Standard Assembly v1"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              data-testid="input-bom-name"
            />
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              placeholder="BOM description..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              data-testid="input-bom-description"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Labor Cost</Label>
              <Input
                type="number"
                placeholder="500"
                value={formData.laborCost}
                onChange={(e) => setFormData({ ...formData, laborCost: e.target.value })}
                data-testid="input-labor-cost"
              />
            </div>
            <div className="space-y-2">
              <Label>Overhead Cost</Label>
              <Input
                type="number"
                placeholder="200"
                value={formData.overheadCost}
                onChange={(e) => setFormData({ ...formData, overheadCost: e.target.value })}
                data-testid="input-overhead-cost"
              />
            </div>
            <div className="space-y-2">
              <Label>Yield Qty</Label>
              <Input
                type="number"
                placeholder="1"
                value={formData.yieldQuantity}
                onChange={(e) => setFormData({ ...formData, yieldQuantity: e.target.value })}
                data-testid="input-yield-qty"
              />
            </div>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Switch
                checked={formData.isPrimary}
                onCheckedChange={(checked) => setFormData({ ...formData, isPrimary: checked })}
                data-testid="switch-primary"
              />
              <Label>Primary BOM</Label>
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
            <Button type="submit" disabled={isSaving} data-testid="button-save-bom">
              {isSaving ? "Saving..." : bom ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ComponentDialog({
  bomId,
  component,
  materials,
  open,
  onOpenChange,
  onSave,
  isSaving,
}: {
  bomId: string;
  component: BomComponent | null;
  materials: RawMaterial[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: ComponentFormData) => void;
  isSaving: boolean;
}) {
  const [formData, setFormData] = useState<ComponentFormData>(
    component
      ? {
          rawMaterialId: component.rawMaterialId || "",
          quantity: component.quantity || "",
          unitOfMeasure: component.unitOfMeasure || "pcs",
          wastePercentage: component.wastePercentage || "0",
          notes: component.notes || "",
        }
      : {
          rawMaterialId: "",
          quantity: "",
          unitOfMeasure: "pcs",
          wastePercentage: "0",
          notes: "",
        }
  );

  const selectedMaterial = materials.find((m) => m.id === formData.rawMaterialId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>{component ? "Edit Component" : "Add Component"}</DialogTitle>
          <DialogDescription>
            {component ? "Update component details" : "Add a raw material to this BOM"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Raw Material *</Label>
            <Select
              value={formData.rawMaterialId}
              onValueChange={(v) => {
                const mat = materials.find((m) => m.id === v);
                setFormData({
                  ...formData,
                  rawMaterialId: v,
                  unitOfMeasure: mat?.unitOfMeasure || "pcs",
                });
              }}
            >
              <SelectTrigger data-testid="select-component-material">
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
                Stock: {selectedMaterial.currentStock} {selectedMaterial.unitOfMeasure} | Cost:{" "}
                {parseFloat(selectedMaterial.unitCost).toLocaleString()}
              </p>
            )}
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
                data-testid="input-component-qty"
              />
            </div>
            <div className="space-y-2">
              <Label>Wastage %</Label>
              <Input
                type="number"
                placeholder="5"
                value={formData.wastePercentage}
                onChange={(e) => setFormData({ ...formData, wastePercentage: e.target.value })}
                data-testid="input-wastage"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              placeholder="Additional notes..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              data-testid="input-component-notes"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving} data-testid="button-save-component">
              {isSaving ? "Saving..." : component ? "Update" : "Add"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function BomDetailView({
  bom,
  materials,
  onClose,
}: {
  bom: BillOfMaterials;
  materials: RawMaterial[];
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [showComponentDialog, setShowComponentDialog] = useState(false);
  const [editingComponent, setEditingComponent] = useState<BomComponent | null>(null);

  const { data: components = [], isLoading } = useQuery<BomComponent[]>({
    queryKey: ["/api/furniture/bom", bom.id, "components"],
  });

  const createComponentMutation = useMutation({
    mutationFn: async (data: ComponentFormData) => {
      return apiRequest("POST", `/api/furniture/bom/${bom.id}/components`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/furniture/bom", bom.id, "components"] });
      queryClient.invalidateQueries({ queryKey: ["/api/furniture/bom"] });
      setShowComponentDialog(false);
      toast({ title: "Component added successfully" });
    },
    onError: () => {
      toast({ title: "Failed to add component", variant: "destructive" });
    },
  });

  const updateComponentMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ComponentFormData }) => {
      return apiRequest("PATCH", `/api/furniture/bom/${bom.id}/components/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/furniture/bom", bom.id, "components"] });
      queryClient.invalidateQueries({ queryKey: ["/api/furniture/bom"] });
      setShowComponentDialog(false);
      setEditingComponent(null);
      toast({ title: "Component updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update component", variant: "destructive" });
    },
  });

  const deleteComponentMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/furniture/bom/${bom.id}/components/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/furniture/bom", bom.id, "components"] });
      queryClient.invalidateQueries({ queryKey: ["/api/furniture/bom"] });
      toast({ title: "Component removed" });
    },
    onError: () => {
      toast({ title: "Failed to remove component", variant: "destructive" });
    },
  });

  const getMaterialName = (materialId: string) => {
    return materials.find((m) => m.id === materialId)?.name || "-";
  };

  const handleSaveComponent = (data: ComponentFormData) => {
    if (editingComponent) {
      updateComponentMutation.mutate({ id: editingComponent.id, data });
    } else {
      createComponentMutation.mutate(data);
    }
  };

  const totalMaterialCost = components.reduce((sum, comp) => {
    const material = materials.find((m) => m.id === comp.rawMaterialId);
    const qty = parseFloat(comp.quantity || "0");
    const cost = parseFloat(material?.unitCost || "0");
    const wastage = parseFloat(comp.wastePercentage || "0") / 100;
    return sum + qty * cost * (1 + wastage);
  }, 0);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            {bom.name}
          </DialogTitle>
          <DialogDescription>
            Version {bom.version} | {bom.isPrimary && <Badge className="ml-2">Primary</Badge>}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Material Cost</p>
                <p className="text-lg font-bold">{totalMaterialCost.toLocaleString()}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Labor Cost</p>
                <p className="text-lg font-bold">
                  {parseFloat(bom.laborCost || "0").toLocaleString()}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Overhead</p>
                <p className="text-lg font-bold">
                  {parseFloat(bom.overheadCost || "0").toLocaleString()}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Total Cost</p>
                <p className="text-lg font-bold">
                  {(
                    totalMaterialCost +
                    parseFloat(bom.laborCost || "0") +
                    parseFloat(bom.overheadCost || "0")
                  ).toLocaleString()}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Components ({components.length})</h3>
            <Button
              size="sm"
              onClick={() => {
                setEditingComponent(null);
                setShowComponentDialog(true);
              }}
              data-testid="button-add-component"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Component
            </Button>
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : components.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No components added yet. Add raw materials to this BOM.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Material</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Wastage %</TableHead>
                  <TableHead className="text-right">Effective Qty</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {components.map((comp) => {
                  const material = materials.find((m) => m.id === comp.rawMaterialId);
                  const qty = parseFloat(comp.quantity || "0");
                  const wastage = parseFloat(comp.wastePercentage || "0") / 100;
                  const effectiveQty = qty * (1 + wastage);
                  const cost = effectiveQty * parseFloat(material?.unitCost || "0");

                  return (
                    <TableRow key={comp.id} data-testid={`row-component-${comp.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-muted-foreground" />
                          {getMaterialName(comp.rawMaterialId)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {qty} {comp.unitOfMeasure}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {comp.wastePercentage || 0}%
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {effectiveQty.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {cost.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              setEditingComponent(comp);
                              setShowComponentDialog(true);
                            }}
                            data-testid={`button-edit-component-${comp.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => deleteComponentMutation.mutate(comp.id)}
                            disabled={deleteComponentMutation.isPending}
                            data-testid={`button-delete-component-${comp.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
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

        <ComponentDialog
          bomId={bom.id}
          component={editingComponent}
          materials={materials}
          open={showComponentDialog}
          onOpenChange={(open) => {
            setShowComponentDialog(open);
            if (!open) setEditingComponent(null);
          }}
          onSave={handleSaveComponent}
          isSaving={createComponentMutation.isPending || updateComponentMutation.isPending}
        />
      </DialogContent>
    </Dialog>
  );
}

export default function FurnitureBom() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [productFilter, setProductFilter] = useState<string>("all");
  const [showBomDialog, setShowBomDialog] = useState(false);
  const [editingBom, setEditingBom] = useState<BillOfMaterials | null>(null);
  const [viewingBom, setViewingBom] = useState<BillOfMaterials | null>(null);

  const pagination = usePagination({ initialLimit: 20 });

  const { data: bomsResponse, isLoading } = useQuery<PaginationResponse<BillOfMaterials>>({
    queryKey: ["/api/furniture/bom", pagination.queryParams],
  });

  const boms = bomsResponse?.data ?? [];
  const paginationInfo = bomsResponse?.pagination;

  const { data: productsResponse } = useQuery<PaginationResponse<FurnitureProduct>>({
    queryKey: ["/api/furniture/products", { limit: "1000" }],
  });
  const products = productsResponse?.data ?? [];

  const { data: materialsResponse } = useQuery<PaginationResponse<RawMaterial>>({
    queryKey: ["/api/furniture/raw-materials", { limit: "1000" }],
  });
  const materials = materialsResponse?.data ?? [];

  const createBomMutation = useMutation({
    mutationFn: async (data: BomFormData) => {
      return apiRequest("POST", "/api/furniture/bom", {
        ...data,
        yieldQuantity: parseInt(data.yieldQuantity) || 1,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/furniture/bom"] });
      setShowBomDialog(false);
      toast({ title: "BOM created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create BOM", variant: "destructive" });
    },
  });

  const updateBomMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: BomFormData }) => {
      return apiRequest("PATCH", `/api/furniture/bom/${id}`, {
        ...data,
        yieldQuantity: parseInt(data.yieldQuantity) || 1,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/furniture/bom"] });
      setShowBomDialog(false);
      setEditingBom(null);
      toast({ title: "BOM updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update BOM", variant: "destructive" });
    },
  });

  const archiveBomMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/furniture/bom/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/furniture/bom"] });
      toast({ title: "BOM archived successfully" });
    },
    onError: () => {
      toast({ title: "Failed to archive BOM", variant: "destructive" });
    },
  });

  const handleSaveBom = (data: BomFormData) => {
    if (editingBom) {
      updateBomMutation.mutate({ id: editingBom.id, data });
    } else {
      createBomMutation.mutate(data);
    }
  };

  const filteredBoms = boms.filter((bom) => {
    const matchesSearch =
      !searchQuery || bom.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesProduct = productFilter === "all" || bom.productId === productFilter;
    return matchesSearch && matchesProduct;
  });

  const getProductName = (productId: string) => {
    return products.find((p) => p.id === productId)?.name || "-";
  };

  return (
    <DashboardLayout
      title="Bill of Materials"
      breadcrumbs={[
        { label: "Furniture", href: "/dashboard/furniture" },
        { label: "BOM" },
      ]}
    >
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 flex-wrap items-center gap-3">
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search BOMs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search-bom"
              />
            </div>
            <Select value={productFilter} onValueChange={setProductFilter}>
              <SelectTrigger className="w-[200px]" data-testid="select-filter-product">
                <SelectValue placeholder="All Products" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Products</SelectItem>
                {products.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={() => {
              setEditingBom(null);
              setShowBomDialog(true);
            }}
            data-testid="button-create-bom"
          >
            <Plus className="mr-2 h-4 w-4" />
            Create BOM
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
            ) : filteredBoms.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <ClipboardList className="h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">No BOMs found</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Create a Bill of Materials to define production requirements
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>BOM</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead className="text-right">Total Cost</TableHead>
                    <TableHead className="text-right">Yield</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[120px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBoms.map((bom) => (
                    <TableRow key={bom.id} data-testid={`row-bom-${bom.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
                            <Layers className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{bom.name}</p>
                            {bom.isPrimary && (
                              <Badge variant="secondary" className="text-xs">
                                Primary
                              </Badge>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{getProductName(bom.productId)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">v{bom.version}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {parseFloat(bom.totalCost || "0").toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">{bom.yieldQuantity}</TableCell>
                      <TableCell>
                        <Badge variant={bom.isActive ? "default" : "secondary"}>
                          {bom.isActive ? "Active" : "Archived"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setViewingBom(bom)}
                            data-testid={`button-view-bom-${bom.id}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              setEditingBom(bom);
                              setShowBomDialog(true);
                            }}
                            data-testid={`button-edit-bom-${bom.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => archiveBomMutation.mutate(bom.id)}
                            disabled={archiveBomMutation.isPending}
                            data-testid={`button-archive-bom-${bom.id}`}
                          >
                            <Archive className="h-4 w-4" />
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

      <BomDialog
        bom={editingBom}
        products={products}
        open={showBomDialog}
        onOpenChange={(open) => {
          setShowBomDialog(open);
          if (!open) setEditingBom(null);
        }}
        onSave={handleSaveBom}
        isSaving={createBomMutation.isPending || updateBomMutation.isPending}
      />

      {viewingBom && (
        <BomDetailView
          bom={viewingBom}
          materials={materials}
          onClose={() => setViewingBom(null)}
        />
      )}
    </DashboardLayout>
  );
}
