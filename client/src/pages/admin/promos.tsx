import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle,
  DialogFooter 
} from "@/components/ui/dialog";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Plus, Pencil, Archive, Tag, Percent, IndianRupee, Calendar } from "lucide-react";
import { format } from "date-fns";

interface Promo {
  id: string;
  code: string;
  name: string;
  description?: string;
  appliesTo: "plan" | "addon" | "bundle" | "any";
  targetIds: string[];
  discountType: "flat" | "percent";
  discountValue: number;
  maxDiscountAmount?: number;
  minAmount?: number;
  startAt?: string;
  endAt?: string;
  usageLimitTotal?: number;
  usageLimitPerTenant: number;
  usageCount: number;
  allowStacking: boolean;
  isActive: boolean;
  createdAt: string;
  archivedAt?: string;
}

interface PromoFormData {
  code: string;
  name: string;
  description: string;
  appliesTo: "plan" | "addon" | "bundle" | "any";
  discountType: "flat" | "percent";
  discountValue: number;
  maxDiscountAmount?: number;
  minAmount?: number;
  startAt?: string;
  endAt?: string;
  usageLimitTotal?: number;
  usageLimitPerTenant: number;
  allowStacking: boolean;
  isActive: boolean;
}

const defaultFormData: PromoFormData = {
  code: "",
  name: "",
  description: "",
  appliesTo: "any",
  discountType: "percent",
  discountValue: 10,
  usageLimitPerTenant: 1,
  allowStacking: false,
  isActive: true
};

export default function AdminPromos() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState<Promo | null>(null);
  const [formData, setFormData] = useState<PromoFormData>(defaultFormData);

  const { data, isLoading } = useQuery<{ promos: Promo[]; pagination: any }>({
    queryKey: ["/api/admin/billing/promos"]
  });

  const createMutation = useMutation({
    mutationFn: async (data: PromoFormData) => {
      const res = await apiRequest("POST", "/api/admin/billing/promos", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/billing/promos"] });
      setIsDialogOpen(false);
      resetForm();
      toast({ title: "Promo created successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create promo", description: error.message, variant: "destructive" });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<PromoFormData> }) => {
      const res = await apiRequest("PATCH", `/api/admin/billing/promos/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/billing/promos"] });
      setIsDialogOpen(false);
      resetForm();
      toast({ title: "Promo updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update promo", description: error.message, variant: "destructive" });
    }
  });

  const archiveMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/admin/billing/promos/${id}/archive`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/billing/promos"] });
      toast({ title: "Promo archived" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to archive promo", description: error.message, variant: "destructive" });
    }
  });

  const resetForm = () => {
    setFormData(defaultFormData);
    setEditingPromo(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (promo: Promo) => {
    setEditingPromo(promo);
    setFormData({
      code: promo.code,
      name: promo.name,
      description: promo.description || "",
      appliesTo: promo.appliesTo,
      discountType: promo.discountType,
      discountValue: promo.discountValue,
      maxDiscountAmount: promo.maxDiscountAmount,
      minAmount: promo.minAmount,
      startAt: promo.startAt ? promo.startAt.slice(0, 16) : undefined,
      endAt: promo.endAt ? promo.endAt.slice(0, 16) : undefined,
      usageLimitTotal: promo.usageLimitTotal,
      usageLimitPerTenant: promo.usageLimitPerTenant,
      allowStacking: promo.allowStacking,
      isActive: promo.isActive
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingPromo) {
      updateMutation.mutate({ id: editingPromo.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const formatDiscount = (promo: Promo) => {
    if (promo.discountType === "percent") {
      return `${promo.discountValue}%`;
    }
    return `₹${promo.discountValue / 100}`;
  };

  const getAppliesToBadge = (appliesTo: string) => {
    const variants: Record<string, { label: string; className: string }> = {
      plan: { label: "Plans", className: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200" },
      addon: { label: "Add-ons", className: "bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200" },
      bundle: { label: "Bundles", className: "bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200" },
      any: { label: "All", className: "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200" }
    };
    const v = variants[appliesTo] || variants.any;
    return <Badge className={v.className}>{v.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Promo Codes</h1>
          <p className="text-muted-foreground">Manage promotional codes and discounts</p>
        </div>
        <Button onClick={openCreateDialog} data-testid="button-create-promo">
          <Plus className="h-4 w-4 mr-2" />
          Create Promo
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5" />
            Active Promos
          </CardTitle>
          <CardDescription>
            View and manage all promotional codes
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : data?.promos && data.promos.length > 0 ? (
            <Table data-testid="table-promos">
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead>Applies To</TableHead>
                  <TableHead>Usage</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.promos.map((promo) => (
                  <TableRow key={promo.id} data-testid={`row-promo-${promo.id}`}>
                    <TableCell className="font-mono font-medium" data-testid={`text-code-${promo.id}`}>
                      {promo.code}
                    </TableCell>
                    <TableCell data-testid={`text-name-${promo.id}`}>{promo.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {promo.discountType === "percent" ? (
                          <Percent className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <IndianRupee className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span data-testid={`text-discount-${promo.id}`}>{formatDiscount(promo)}</span>
                      </div>
                    </TableCell>
                    <TableCell>{getAppliesToBadge(promo.appliesTo)}</TableCell>
                    <TableCell data-testid={`text-usage-${promo.id}`}>
                      {promo.usageCount}/{promo.usageLimitTotal || "∞"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={promo.isActive ? "default" : "secondary"}>
                        {promo.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => openEditDialog(promo)}
                          data-testid={`button-edit-${promo.id}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => archiveMutation.mutate(promo.id)}
                          disabled={archiveMutation.isPending}
                          data-testid={`button-archive-${promo.id}`}
                        >
                          <Archive className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Tag className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No promo codes yet</p>
              <Button onClick={openCreateDialog} variant="ghost">
                Create your first promo code
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPromo ? "Edit Promo Code" : "Create Promo Code"}
            </DialogTitle>
            <DialogDescription>
              {editingPromo ? "Update the promo code details" : "Create a new promotional discount code"}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="code">Promo Code</Label>
                <Input
                  id="code"
                  placeholder="SAVE20"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  required
                  data-testid="input-code"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Display Name</Label>
                <Input
                  id="name"
                  placeholder="20% Off First Month"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  data-testid="input-name"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                placeholder="Describe the promotion..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                data-testid="input-description"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Discount Type</Label>
                <Select
                  value={formData.discountType}
                  onValueChange={(v: "flat" | "percent") => setFormData({ ...formData, discountType: v })}
                >
                  <SelectTrigger data-testid="select-discount-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent" data-testid="option-percent">Percentage (%)</SelectItem>
                    <SelectItem value="flat" data-testid="option-flat">Flat Amount (₹)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="discountValue">
                  Discount Value {formData.discountType === "percent" ? "(%)" : "(₹ in paise)"}
                </Label>
                <Input
                  id="discountValue"
                  type="number"
                  min={1}
                  max={formData.discountType === "percent" ? 100 : undefined}
                  value={formData.discountValue}
                  onChange={(e) => setFormData({ ...formData, discountValue: parseInt(e.target.value) || 0 })}
                  required
                  data-testid="input-discount-value"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Applies To</Label>
                <Select
                  value={formData.appliesTo}
                  onValueChange={(v: "plan" | "addon" | "bundle" | "any") => setFormData({ ...formData, appliesTo: v })}
                >
                  <SelectTrigger data-testid="select-applies-to">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any" data-testid="option-any">Any Purchase</SelectItem>
                    <SelectItem value="plan" data-testid="option-plan">Plans Only</SelectItem>
                    <SelectItem value="addon" data-testid="option-addon">Add-ons Only</SelectItem>
                    <SelectItem value="bundle" data-testid="option-bundle">Plan + Add-on Bundle</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxDiscount">Max Discount Amount (optional, in paise)</Label>
                <Input
                  id="maxDiscount"
                  type="number"
                  placeholder="e.g., 50000 = ₹500"
                  value={formData.maxDiscountAmount || ""}
                  onChange={(e) => setFormData({ ...formData, maxDiscountAmount: e.target.value ? parseInt(e.target.value) : undefined })}
                  data-testid="input-max-discount"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startAt">Start Date (optional)</Label>
                <Input
                  id="startAt"
                  type="datetime-local"
                  value={formData.startAt || ""}
                  onChange={(e) => setFormData({ ...formData, startAt: e.target.value || undefined })}
                  data-testid="input-start-at"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endAt">End Date (optional)</Label>
                <Input
                  id="endAt"
                  type="datetime-local"
                  value={formData.endAt || ""}
                  onChange={(e) => setFormData({ ...formData, endAt: e.target.value || undefined })}
                  data-testid="input-end-at"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="usageLimitTotal">Total Usage Limit (optional)</Label>
                <Input
                  id="usageLimitTotal"
                  type="number"
                  placeholder="Leave empty for unlimited"
                  value={formData.usageLimitTotal || ""}
                  onChange={(e) => setFormData({ ...formData, usageLimitTotal: e.target.value ? parseInt(e.target.value) : undefined })}
                  data-testid="input-usage-limit-total"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="usageLimitPerTenant">Per-Tenant Limit</Label>
                <Input
                  id="usageLimitPerTenant"
                  type="number"
                  min={1}
                  value={formData.usageLimitPerTenant}
                  onChange={(e) => setFormData({ ...formData, usageLimitPerTenant: parseInt(e.target.value) || 1 })}
                  required
                  data-testid="input-usage-limit-tenant"
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <Label>Active</Label>
                <p className="text-sm text-muted-foreground">Enable this promo code for use</p>
              </div>
              <Switch
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                data-testid="switch-is-active"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} data-testid="button-cancel">
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createMutation.isPending || updateMutation.isPending}
                data-testid="button-submit"
              >
                {editingPromo ? "Update Promo" : "Create Promo"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
