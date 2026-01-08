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
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Plus,
  Search,
  Pencil,
  Archive,
  Armchair,
  Box,
  Package,
  History,
  Filter,
} from "lucide-react";
import type { FurnitureProduct, BillOfMaterials } from "@shared/schema";

const PRODUCT_TYPES = [
  { value: "ready_made", label: "Ready Made" },
  { value: "made_to_order", label: "Made to Order" },
  { value: "semi_finished", label: "Semi-Finished" },
];

const MATERIAL_TYPES = [
  { value: "wood", label: "Wood" },
  { value: "metal", label: "Metal" },
  { value: "glass", label: "Glass" },
  { value: "fabric", label: "Fabric" },
  { value: "leather", label: "Leather" },
  { value: "plastic", label: "Plastic" },
  { value: "mixed", label: "Mixed" },
];

const TAX_CATEGORIES = [
  { value: "standard", label: "Standard (18%)" },
  { value: "reduced", label: "Reduced (12%)" },
  { value: "exempt", label: "Exempt (0%)" },
];

interface ProductFormData {
  sku: string;
  name: string;
  description: string;
  productType: string;
  materialType: string;
  dimensionLength: string;
  dimensionWidth: string;
  dimensionHeight: string;
  weight: string;
  finish: string;
  color: string;
  costPrice: string;
  sellingPrice: string;
  wholesalePrice: string;
  hsnCode: string;
  gstRate: string;
  taxCategory: string;
  minStockLevel: string;
  reorderPoint: string;
  allowCustomDimensions: boolean;
  manufacturingLeadTime: string;
  defaultBomId: string;
  isActive: boolean;
}

const defaultFormData: ProductFormData = {
  sku: "",
  name: "",
  description: "",
  productType: "ready_made",
  materialType: "wood",
  dimensionLength: "",
  dimensionWidth: "",
  dimensionHeight: "",
  weight: "",
  finish: "",
  color: "",
  costPrice: "",
  sellingPrice: "",
  wholesalePrice: "",
  hsnCode: "",
  gstRate: "18",
  taxCategory: "standard",
  minStockLevel: "0",
  reorderPoint: "5",
  allowCustomDimensions: false,
  manufacturingLeadTime: "",
  defaultBomId: "",
  isActive: true,
};

function ProductDialog({
  product,
  open,
  onOpenChange,
  onSave,
  isSaving,
}: {
  product: FurnitureProduct | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: ProductFormData) => void;
  isSaving: boolean;
}) {
  const [formData, setFormData] = useState<ProductFormData>(
    product
      ? {
          sku: product.sku || "",
          name: product.name || "",
          description: product.description || "",
          productType: product.productType || "ready_made",
          materialType: product.materialType || "wood",
          dimensionLength: product.dimensionLength || "",
          dimensionWidth: product.dimensionWidth || "",
          dimensionHeight: product.dimensionHeight || "",
          weight: product.weight || "",
          finish: product.finish || "",
          color: product.color || "",
          costPrice: product.costPrice || "",
          sellingPrice: product.sellingPrice || "",
          wholesalePrice: product.wholesalePrice || "",
          hsnCode: product.hsnCode || "",
          gstRate: product.gstRate || "18",
          taxCategory: product.taxCategory || "standard",
          minStockLevel: String(product.minStockLevel || 0),
          reorderPoint: String(product.reorderPoint || 5),
          allowCustomDimensions: product.allowCustomDimensions || false,
          manufacturingLeadTime: String(product.manufacturingLeadTime || ""),
          defaultBomId: product.defaultBomId || "",
          isActive: product.isActive ?? true,
        }
      : defaultFormData
  );

  const { data: boms } = useQuery<BillOfMaterials[]>({
    queryKey: ["/api/furniture/bom"],
    enabled: open,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>{product ? "Edit Product" : "Add Product"}</DialogTitle>
          <DialogDescription>
            {product ? "Update product details" : "Add a new furniture product to your catalog"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>SKU *</Label>
              <Input
                placeholder="FP-001"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                required
                disabled={!!product}
                data-testid="input-product-sku"
              />
            </div>
            <div className="space-y-2">
              <Label>Product Name *</Label>
              <Input
                placeholder="Wooden Dining Table"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                data-testid="input-product-name"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              placeholder="Detailed product description..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              data-testid="input-product-description"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Product Type *</Label>
              <Select
                value={formData.productType}
                onValueChange={(v) => setFormData({ ...formData, productType: v })}
              >
                <SelectTrigger data-testid="select-product-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRODUCT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Material Type *</Label>
              <Select
                value={formData.materialType}
                onValueChange={(v) => setFormData({ ...formData, materialType: v })}
              >
                <SelectTrigger data-testid="select-material-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MATERIAL_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Dimensions (L x W x H in cm)</Label>
            <div className="grid grid-cols-3 gap-2">
              <Input
                type="number"
                placeholder="Length"
                value={formData.dimensionLength}
                onChange={(e) => setFormData({ ...formData, dimensionLength: e.target.value })}
                data-testid="input-dimension-length"
              />
              <Input
                type="number"
                placeholder="Width"
                value={formData.dimensionWidth}
                onChange={(e) => setFormData({ ...formData, dimensionWidth: e.target.value })}
                data-testid="input-dimension-width"
              />
              <Input
                type="number"
                placeholder="Height"
                value={formData.dimensionHeight}
                onChange={(e) => setFormData({ ...formData, dimensionHeight: e.target.value })}
                data-testid="input-dimension-height"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Weight (kg)</Label>
              <Input
                type="number"
                placeholder="25.5"
                value={formData.weight}
                onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                data-testid="input-weight"
              />
            </div>
            <div className="space-y-2">
              <Label>Finish</Label>
              <Input
                placeholder="Matte, Glossy..."
                value={formData.finish}
                onChange={(e) => setFormData({ ...formData, finish: e.target.value })}
                data-testid="input-finish"
              />
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <Input
                placeholder="Walnut Brown"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                data-testid="input-color"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Cost Price *</Label>
              <Input
                type="number"
                placeholder="15000"
                value={formData.costPrice}
                onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
                required
                data-testid="input-cost-price"
              />
            </div>
            <div className="space-y-2">
              <Label>Selling Price *</Label>
              <Input
                type="number"
                placeholder="25000"
                value={formData.sellingPrice}
                onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })}
                required
                data-testid="input-selling-price"
              />
            </div>
            <div className="space-y-2">
              <Label>Wholesale Price</Label>
              <Input
                type="number"
                placeholder="20000"
                value={formData.wholesalePrice}
                onChange={(e) => setFormData({ ...formData, wholesalePrice: e.target.value })}
                data-testid="input-wholesale-price"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>HSN Code</Label>
              <Input
                placeholder="9403"
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
            <div className="space-y-2">
              <Label>Tax Category</Label>
              <Select
                value={formData.taxCategory}
                onValueChange={(v) => setFormData({ ...formData, taxCategory: v })}
              >
                <SelectTrigger data-testid="select-tax-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TAX_CATEGORIES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Min Stock Level</Label>
              <Input
                type="number"
                placeholder="5"
                value={formData.minStockLevel}
                onChange={(e) => setFormData({ ...formData, minStockLevel: e.target.value })}
                data-testid="input-min-stock"
              />
            </div>
            <div className="space-y-2">
              <Label>Reorder Point</Label>
              <Input
                type="number"
                placeholder="10"
                value={formData.reorderPoint}
                onChange={(e) => setFormData({ ...formData, reorderPoint: e.target.value })}
                data-testid="input-reorder-point"
              />
            </div>
            <div className="space-y-2">
              <Label>Lead Time (days)</Label>
              <Input
                type="number"
                placeholder="7"
                value={formData.manufacturingLeadTime}
                onChange={(e) => setFormData({ ...formData, manufacturingLeadTime: e.target.value })}
                data-testid="input-lead-time"
              />
            </div>
          </div>

          {formData.productType !== "ready_made" && (
            <div className="space-y-2">
              <Label>Default BOM</Label>
              <Select
                value={formData.defaultBomId}
                onValueChange={(v) => setFormData({ ...formData, defaultBomId: v })}
              >
                <SelectTrigger data-testid="select-default-bom">
                  <SelectValue placeholder="Select BOM (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No BOM</SelectItem>
                  {boms?.map((bom) => (
                    <SelectItem key={bom.id} value={bom.id}>
                      {bom.name} - v{bom.version}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Switch
                checked={formData.allowCustomDimensions}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, allowCustomDimensions: checked })
                }
                data-testid="switch-custom-dimensions"
              />
              <Label>Allow Custom Dimensions</Label>
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
            <Button type="submit" disabled={isSaving} data-testid="button-save-product">
              {isSaving ? "Saving..." : product ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function FurnitureProducts() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [materialFilter, setMaterialFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showDialog, setShowDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState<FurnitureProduct | null>(null);

  const { data: products = [], isLoading } = useQuery<FurnitureProduct[]>({
    queryKey: ["/api/furniture/products"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: ProductFormData) => {
      return apiRequest("POST", "/api/furniture/products", {
        ...data,
        minStockLevel: parseInt(data.minStockLevel) || 0,
        reorderPoint: parseInt(data.reorderPoint) || 5,
        manufacturingLeadTime: data.manufacturingLeadTime ? parseInt(data.manufacturingLeadTime) : null,
        defaultBomId: data.defaultBomId || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/furniture/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/furniture/dashboard/stats"] });
      setShowDialog(false);
      toast({ title: "Product created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create product", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ProductFormData }) => {
      return apiRequest("PATCH", `/api/furniture/products/${id}`, {
        ...data,
        minStockLevel: parseInt(data.minStockLevel) || 0,
        reorderPoint: parseInt(data.reorderPoint) || 5,
        manufacturingLeadTime: data.manufacturingLeadTime ? parseInt(data.manufacturingLeadTime) : null,
        defaultBomId: data.defaultBomId || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/furniture/products"] });
      setShowDialog(false);
      setEditingProduct(null);
      toast({ title: "Product updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update product", variant: "destructive" });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/furniture/products/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/furniture/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/furniture/dashboard/stats"] });
      toast({ title: "Product archived successfully" });
    },
    onError: () => {
      toast({ title: "Failed to archive product", variant: "destructive" });
    },
  });

  const handleSave = (data: ProductFormData) => {
    if (editingProduct) {
      updateMutation.mutate({ id: editingProduct.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      !searchQuery ||
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === "all" || product.productType === typeFilter;
    const matchesMaterial = materialFilter === "all" || product.materialType === materialFilter;
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && product.isActive) ||
      (statusFilter === "inactive" && !product.isActive);
    return matchesSearch && matchesType && matchesMaterial && matchesStatus;
  });

  const getProductTypeLabel = (type: string) => {
    return PRODUCT_TYPES.find((t) => t.value === type)?.label || type;
  };

  const getMaterialTypeLabel = (type: string) => {
    return MATERIAL_TYPES.find((t) => t.value === type)?.label || type;
  };

  return (
    <DashboardLayout
      title="Products"
      breadcrumbs={[
        { label: "Furniture", href: "/dashboard/furniture" },
        { label: "Products" },
      ]}
    >
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 flex-wrap items-center gap-3">
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search-products"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[140px]" data-testid="select-filter-type">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {PRODUCT_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={materialFilter} onValueChange={setMaterialFilter}>
              <SelectTrigger className="w-[140px]" data-testid="select-filter-material">
                <SelectValue placeholder="Material" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Materials</SelectItem>
                {MATERIAL_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[130px]" data-testid="select-filter-status">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={() => {
              setEditingProduct(null);
              setShowDialog(true);
            }}
            data-testid="button-add-product"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Product
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="space-y-4 p-6">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Armchair className="h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">No products found</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {searchQuery || typeFilter !== "all" || materialFilter !== "all"
                    ? "Try adjusting your search or filters"
                    : "Get started by adding your first product"}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Material</TableHead>
                    <TableHead>Dimensions</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((product) => (
                    <TableRow key={product.id} data-testid={`row-product-${product.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
                            <Armchair className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{product.name}</p>
                            <p className="text-xs text-muted-foreground">{product.sku}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">
                          {getProductTypeLabel(product.productType)}
                        </Badge>
                      </TableCell>
                      <TableCell>{getMaterialTypeLabel(product.materialType)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {product.dimensionLength && product.dimensionWidth && product.dimensionHeight
                          ? `${product.dimensionLength} x ${product.dimensionWidth} x ${product.dimensionHeight}`
                          : "-"}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {parseFloat(product.costPrice).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {parseFloat(product.sellingPrice).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-muted-foreground" />
                          <span
                            className={
                              (product.currentStock ?? 0) <= (product.minStockLevel ?? 0)
                                ? "text-destructive"
                                : ""
                            }
                          >
                            {product.currentStock ?? 0}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={product.isActive ? "default" : "secondary"}>
                          {product.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              setEditingProduct(product);
                              setShowDialog(true);
                            }}
                            data-testid={`button-edit-product-${product.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => archiveMutation.mutate(product.id)}
                            disabled={archiveMutation.isPending}
                            data-testid={`button-archive-product-${product.id}`}
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
          </CardContent>
        </Card>
      </div>

      <ProductDialog
        product={editingProduct}
        open={showDialog}
        onOpenChange={(open) => {
          setShowDialog(open);
          if (!open) setEditingProduct(null);
        }}
        onSave={handleSave}
        isSaving={createMutation.isPending || updateMutation.isPending}
      />
    </DashboardLayout>
  );
}
