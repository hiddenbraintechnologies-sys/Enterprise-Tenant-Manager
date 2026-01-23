import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useAdmin } from "@/contexts/admin-context";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Package,
  Globe,
  Shield,
  FileText,
  Plus,
  Search,
  Edit,
  Archive,
  CheckCircle,
  RotateCcw,
  Loader2,
  AlertCircle,
} from "lucide-react";

interface Addon {
  id: string;
  slug: string;
  name: string;
  shortDescription: string | null;
  fullDescription: string | null;
  category: string;
  status: "draft" | "review" | "published" | "deprecated" | "archived";
  iconUrl: string | null;
  trialDays: number;
  createdAt: string;
  updatedAt: string;
}

interface AddonCountryConfig {
  id: string;
  addonId: string;
  countryCode: string;
  isActive: boolean;
  status: string;
  currencyCode: string;
  monthlyPrice: string | null;
  yearlyPrice: string | null;
  perEmployeePrice: string | null;
  trialDays: number;
  trialEnabled: boolean;
  comingSoonMessage: string | null;
}

interface EligibilityRule {
  id: string;
  addonId: string;
  countryCode: string;
  planTier: string;
  canPurchase: boolean;
  trialEnabled: boolean;
  trialDays: number;
}

interface AuditLog {
  id: string;
  actorUserId: string;
  actorEmail: string | null;
  action: string;
  addonId: string | null;
  addonSlug: string | null;
  countryCode: string | null;
  previousValue: unknown;
  newValue: unknown;
  createdAt: string;
}

interface Summary {
  addons: {
    draft: number;
    published: number;
    archived: number;
    total: number;
  };
  activeCountries: string[];
  activeInstalls: number;
}

const CATEGORIES = [
  "analytics", "automation", "billing", "booking", "communication",
  "compliance", "crm", "healthcare", "integration", "inventory",
  "marketing", "payments", "reporting", "scheduling", "security", "utilities",
];

const COUNTRIES = [
  { code: "IN", name: "India", currency: "INR" },
  { code: "MY", name: "Malaysia", currency: "MYR" },
  { code: "UK", name: "United Kingdom", currency: "GBP" },
  { code: "AE", name: "UAE", currency: "AED" },
  { code: "SG", name: "Singapore", currency: "SGD" },
];

const PLAN_TIERS = ["free", "basic", "pro", "enterprise"];

function RolloutStatusCell({ isActive, status }: { isActive: boolean; status: string }) {
  if (isActive && status === "active") {
    return (
      <div className="flex items-center justify-center" data-testid="status-active">
        <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center">
          <CheckCircle className="w-4 h-4 text-green-600" />
        </div>
      </div>
    );
  }
  if (status === "coming_soon") {
    return (
      <div className="flex items-center justify-center" data-testid="status-coming-soon">
        <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center">
          <AlertCircle className="w-4 h-4 text-amber-600" />
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-center justify-center" data-testid="status-off">
      <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
        <Shield className="w-4 h-4 text-muted-foreground" />
      </div>
    </div>
  );
}

function EligibilityStatusCell({ canPurchase, trialEnabled }: { canPurchase: boolean; trialEnabled: boolean }) {
  if (!canPurchase) {
    return (
      <div className="flex items-center justify-center" data-testid="eligibility-blocked">
        <div className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center">
          <span className="text-red-600 text-xs font-bold">X</span>
        </div>
      </div>
    );
  }
  if (trialEnabled) {
    return (
      <div className="flex items-center justify-center" data-testid="eligibility-trial">
        <Badge variant="outline" className="text-xs px-1.5 py-0">Trial</Badge>
      </div>
    );
  }
  return (
    <div className="flex items-center justify-center" data-testid="eligibility-enabled">
      <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center">
        <CheckCircle className="w-4 h-4 text-green-600" />
      </div>
    </div>
  );
}

function getStatusBadge(status: string) {
  const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    draft: "secondary",
    review: "outline",
    published: "default",
    deprecated: "destructive",
    archived: "destructive",
  };
  return <Badge variant={variants[status] || "outline"} data-testid={`badge-status-${status}`}>{status}</Badge>;
}

function CatalogTab() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingAddon, setEditingAddon] = useState<Addon | null>(null);

  const { data, isLoading, error } = useQuery<{ addons: Addon[]; pagination: { total: number } }>({
    queryKey: ["/api/super-admin/marketplace/addons", { search, status: statusFilter !== "all" ? statusFilter : undefined }],
  });

  const createMutation = useMutation({
    mutationFn: async (data: Partial<Addon>) => {
      return apiRequest("POST", "/api/super-admin/marketplace/addons", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/marketplace/addons"] });
      setShowCreateDialog(false);
      toast({ title: "Add-on created successfully" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to create add-on", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Addon> }) => {
      return apiRequest("PATCH", `/api/super-admin/marketplace/addons/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/marketplace/addons"] });
      setEditingAddon(null);
      toast({ title: "Add-on updated successfully" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to update add-on", description: err.message, variant: "destructive" });
    },
  });

  const publishMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("POST", `/api/super-admin/marketplace/addons/${id}/publish`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/marketplace/addons"] });
      toast({ title: "Add-on published successfully" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to publish add-on", description: err.message, variant: "destructive" });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("POST", `/api/super-admin/marketplace/addons/${id}/archive`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/marketplace/addons"] });
      toast({ title: "Add-on archived" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to archive add-on", description: err.message, variant: "destructive" });
    },
  });

  const restoreMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("POST", `/api/super-admin/marketplace/addons/${id}/restore`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/marketplace/addons"] });
      toast({ title: "Add-on restored to draft" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to restore add-on", description: err.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 text-destructive" data-testid="error-catalog">
        <AlertCircle className="h-5 w-5" />
        <span>Failed to load add-ons</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search add-ons..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            data-testid="input-search-addons"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]" data-testid="select-status-filter">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-addon">
              <Plus className="mr-2 h-4 w-4" />
              Create Add-on
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create New Add-on</DialogTitle>
              <DialogDescription>Add a new add-on to the marketplace catalog.</DialogDescription>
            </DialogHeader>
            <AddonForm
              onSubmit={(formData) => createMutation.mutate(formData)}
              isLoading={createMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Table data-testid="table-addons">
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Slug</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Trial Days</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data?.addons.map((addon) => (
            <TableRow key={addon.id} data-testid={`row-addon-${addon.slug}`}>
              <TableCell className="font-medium">{addon.name}</TableCell>
              <TableCell className="text-muted-foreground">{addon.slug}</TableCell>
              <TableCell>
                <Badge variant="outline">{addon.category}</Badge>
              </TableCell>
              <TableCell>{getStatusBadge(addon.status)}</TableCell>
              <TableCell>{addon.trialDays} days</TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setEditingAddon(addon)}
                    data-testid={`button-edit-${addon.slug}`}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  {addon.status === "draft" && (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => publishMutation.mutate(addon.id)}
                      disabled={publishMutation.isPending}
                      data-testid={`button-publish-${addon.slug}`}
                    >
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    </Button>
                  )}
                  {addon.status !== "archived" && (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => archiveMutation.mutate(addon.id)}
                      disabled={archiveMutation.isPending}
                      data-testid={`button-archive-${addon.slug}`}
                    >
                      <Archive className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                  {addon.status === "archived" && (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => restoreMutation.mutate(addon.id)}
                      disabled={restoreMutation.isPending}
                      data-testid={`button-restore-${addon.slug}`}
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
          {(!data?.addons || data.addons.length === 0) && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                No add-ons found. Create your first add-on to get started.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <Dialog open={!!editingAddon} onOpenChange={(open) => !open && setEditingAddon(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Add-on</DialogTitle>
            <DialogDescription>Update add-on details.</DialogDescription>
          </DialogHeader>
          {editingAddon && (
            <AddonForm
              initialData={editingAddon}
              onSubmit={(formData) => updateMutation.mutate({ id: editingAddon.id, data: formData })}
              isLoading={updateMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AddonForm({
  initialData,
  onSubmit,
  isLoading,
}: {
  initialData?: Partial<Addon>;
  onSubmit: (data: Partial<Addon>) => void;
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState({
    slug: initialData?.slug || "",
    name: initialData?.name || "",
    shortDescription: initialData?.shortDescription || "",
    category: initialData?.category || "utilities",
    trialDays: initialData?.trialDays || 7,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="slug">Slug (URL-friendly identifier)</Label>
        <Input
          id="slug"
          value={formData.slug}
          onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })}
          placeholder="e.g., hrms, payroll, whatsapp"
          disabled={!!initialData?.slug}
          data-testid="input-addon-slug"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="name">Display Name</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="e.g., HRMS, Payroll Management"
          data-testid="input-addon-name"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="shortDescription">Short Description</Label>
        <Textarea
          id="shortDescription"
          value={formData.shortDescription}
          onChange={(e) => setFormData({ ...formData, shortDescription: e.target.value })}
          placeholder="Brief description for marketplace listing..."
          rows={2}
          data-testid="input-addon-description"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="category">Category</Label>
        <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
          <SelectTrigger data-testid="select-addon-category">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="trialDays">Trial Days</Label>
        <Input
          id="trialDays"
          type="number"
          min={0}
          max={90}
          value={formData.trialDays}
          onChange={(e) => setFormData({ ...formData, trialDays: parseInt(e.target.value, 10) || 0 })}
          data-testid="input-addon-trial-days"
        />
      </div>
      <DialogFooter>
        <Button type="submit" disabled={isLoading || !formData.slug || !formData.name} data-testid="button-save-addon">
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {initialData ? "Save Changes" : "Create Add-on"}
        </Button>
      </DialogFooter>
    </form>
  );
}

interface AllCountryConfigsMap {
  [addonId: string]: { [countryCode: string]: AddonCountryConfig };
}

function CountryRolloutTab() {
  const { toast } = useToast();
  const [selectedCell, setSelectedCell] = useState<{ addonId: string; countryCode: string } | null>(null);

  const { data: addonsData, isLoading: addonsLoading } = useQuery<{ addons: Addon[] }>({
    queryKey: ["/api/super-admin/marketplace/addons"],
  });

  const allCountryConfigsQueries = (addonsData?.addons || []).map((addon) => ({
    addonId: addon.id,
    addonName: addon.name,
  }));

  const configsMap: AllCountryConfigsMap = {};

  const updateConfigMutation = useMutation({
    mutationFn: async ({ addonId, countryCode, data }: { addonId: string; countryCode: string; data: Partial<AddonCountryConfig> }) => {
      return apiRequest("PUT", `/api/super-admin/marketplace/addons/${addonId}/countries/${countryCode}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/marketplace/addons"] });
      setSelectedCell(null);
      toast({ title: "Country config updated" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to update config", description: err.message, variant: "destructive" });
    },
  });

  if (addonsLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  const publishedAddons = addonsData?.addons.filter((a) => a.status === "published") || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-lg font-semibold">Add-on Rollout Control</h3>
        <Badge variant="outline" className="ml-auto">
          Click any cell to configure
        </Badge>
      </div>

      <Card>
        <CardContent className="p-0 overflow-auto">
          <Table data-testid="table-country-rollout-matrix">
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold min-w-[150px] sticky left-0 bg-muted/50">Add-on</TableHead>
                {COUNTRIES.map((country) => (
                  <TableHead key={country.code} className="text-center min-w-[80px]">
                    <div className="flex flex-col items-center gap-0.5">
                      <span>{country.code}</span>
                      <span className="text-xs text-muted-foreground font-normal">{country.currency}</span>
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {publishedAddons.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={COUNTRIES.length + 1} className="text-center py-8 text-muted-foreground">
                    No published add-ons available
                  </TableCell>
                </TableRow>
              ) : (
                publishedAddons.map((addon) => (
                  <CountryRolloutMatrixRow
                    key={addon.id}
                    addon={addon}
                    onCellClick={(countryCode) => setSelectedCell({ addonId: addon.id, countryCode })}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded-full bg-green-500/20 flex items-center justify-center">
            <CheckCircle className="w-3 h-3 text-green-600" />
          </div>
          <span>Live</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded-full bg-amber-500/20 flex items-center justify-center">
            <AlertCircle className="w-3 h-3 text-amber-600" />
          </div>
          <span>Coming Soon</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded-full bg-muted flex items-center justify-center">
            <Shield className="w-3 h-3 text-muted-foreground" />
          </div>
          <span>Off</span>
        </div>
      </div>

      {selectedCell && (
        <CountryConfigDialog
          addonId={selectedCell.addonId}
          countryCode={selectedCell.countryCode}
          countryName={COUNTRIES.find((c) => c.code === selectedCell.countryCode)?.name || selectedCell.countryCode}
          defaultCurrency={COUNTRIES.find((c) => c.code === selectedCell.countryCode)?.currency || "USD"}
          existingConfig={undefined}
          onSave={(data) =>
            updateConfigMutation.mutate({
              addonId: selectedCell.addonId,
              countryCode: selectedCell.countryCode,
              data,
            })
          }
          isLoading={updateConfigMutation.isPending}
          isOpen={true}
          onOpenChange={(open) => !open && setSelectedCell(null)}
        />
      )}
    </div>
  );
}

function CountryRolloutMatrixRow({ addon, onCellClick }: { addon: Addon; onCellClick: (countryCode: string) => void }) {
  const { data: countryConfigs } = useQuery<AddonCountryConfig[]>({
    queryKey: ["/api/super-admin/marketplace/addons", addon.id, "countries"],
  });

  const configMap = new Map(countryConfigs?.map((c) => [c.countryCode, c]) || []);

  return (
    <TableRow data-testid={`row-addon-${addon.slug}`}>
      <TableCell className="font-medium sticky left-0 bg-background">{addon.name}</TableCell>
      {COUNTRIES.map((country) => {
        const config = configMap.get(country.code);
        return (
          <TableCell
            key={country.code}
            className="text-center cursor-pointer hover-elevate p-2"
            onClick={() => onCellClick(country.code)}
            data-testid={`cell-${addon.slug}-${country.code}`}
          >
            <RolloutStatusCell
              isActive={config?.isActive ?? false}
              status={config?.status || "disabled"}
            />
            {config?.monthlyPrice && (
              <div className="text-xs text-muted-foreground mt-0.5">
                {config.currencyCode} {config.monthlyPrice}
              </div>
            )}
          </TableCell>
        );
      })}
    </TableRow>
  );
}

function CountryConfigDialog({
  addonId,
  countryCode,
  countryName,
  defaultCurrency,
  existingConfig,
  onSave,
  isLoading,
  isOpen,
  onOpenChange,
}: {
  addonId: string;
  countryCode: string;
  countryName: string;
  defaultCurrency: string;
  existingConfig?: AddonCountryConfig;
  onSave: (data: Partial<AddonCountryConfig>) => void;
  isLoading: boolean;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = isOpen !== undefined;
  const dialogOpen = isControlled ? isOpen : internalOpen;
  const setDialogOpen = isControlled ? onOpenChange! : setInternalOpen;

  const [formData, setFormData] = useState({
    isActive: existingConfig?.isActive ?? false,
    status: existingConfig?.status ?? "coming_soon",
    currencyCode: existingConfig?.currencyCode ?? defaultCurrency,
    monthlyPrice: existingConfig?.monthlyPrice ?? "",
    yearlyPrice: existingConfig?.yearlyPrice ?? "",
    trialEnabled: existingConfig?.trialEnabled ?? true,
    trialDays: existingConfig?.trialDays ?? 7,
    comingSoonMessage: existingConfig?.comingSoonMessage ?? "",
  });

  const handleSave = () => {
    onSave(formData);
    setDialogOpen(false);
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      {!isControlled && (
        <DialogTrigger asChild>
          <Button size="sm" variant="outline" data-testid={`button-config-${countryCode}`}>
            Configure
          </Button>
        </DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Configure {countryName}</DialogTitle>
          <DialogDescription>Set pricing and availability for this country.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Active</Label>
            <Switch
              checked={formData.isActive}
              onCheckedChange={(v) => setFormData({ ...formData, isActive: v })}
            />
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="coming_soon">Coming Soon</SelectItem>
                <SelectItem value="disabled">Disabled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Monthly Price ({formData.currencyCode})</Label>
              <Input
                value={formData.monthlyPrice}
                onChange={(e) => setFormData({ ...formData, monthlyPrice: e.target.value })}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label>Yearly Price ({formData.currencyCode})</Label>
              <Input
                value={formData.yearlyPrice}
                onChange={(e) => setFormData({ ...formData, yearlyPrice: e.target.value })}
                placeholder="0.00"
              />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <Label>Trial Enabled</Label>
            <Switch
              checked={formData.trialEnabled}
              onCheckedChange={(v) => setFormData({ ...formData, trialEnabled: v })}
            />
          </div>
          {formData.trialEnabled && (
            <div className="space-y-2">
              <Label>Trial Days</Label>
              <Input
                type="number"
                min={0}
                max={90}
                value={formData.trialDays}
                onChange={(e) => setFormData({ ...formData, trialDays: parseInt(e.target.value, 10) || 0 })}
              />
            </div>
          )}
          {formData.status === "coming_soon" && (
            <div className="space-y-2">
              <Label>Coming Soon Message</Label>
              <Textarea
                value={formData.comingSoonMessage}
                onChange={(e) => setFormData({ ...formData, comingSoonMessage: e.target.value })}
                placeholder="This feature will be available soon..."
                rows={2}
              />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Configuration
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EligibilityTab() {
  const { toast } = useToast();
  const [selectedCountry, setSelectedCountry] = useState<string>("IN");

  const { data: addonsData, isLoading: addonsLoading } = useQuery<{ addons: Addon[] }>({
    queryKey: ["/api/super-admin/marketplace/addons"],
  });

  const updateEligibilityMutation = useMutation({
    mutationFn: async ({ addonId, countryCode, rules }: { addonId: string; countryCode: string; rules: Partial<EligibilityRule>[] }) => {
      return apiRequest("PUT", `/api/super-admin/marketplace/addons/${addonId}/eligibility/${countryCode}`, { rules });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/marketplace/addons"] });
      toast({ title: "Eligibility rules updated" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to update rules", description: err.message, variant: "destructive" });
    },
  });

  if (addonsLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  const publishedAddons = addonsData?.addons.filter((a) => a.status === "published") || [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4 mb-4">
        <h3 className="text-lg font-semibold">Plan Eligibility Matrix</h3>
        <div className="flex items-center gap-2 ml-auto">
          <Label className="whitespace-nowrap">Country:</Label>
          <Select value={selectedCountry} onValueChange={setSelectedCountry}>
            <SelectTrigger className="w-[150px]" data-testid="select-country-for-eligibility">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {COUNTRIES.map((c) => (
                <SelectItem key={c.code} value={c.code}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardContent className="p-0 overflow-auto">
          <Table data-testid="table-eligibility-matrix">
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold min-w-[150px] sticky left-0 bg-muted/50">Add-on</TableHead>
                {PLAN_TIERS.map((tier) => (
                  <TableHead key={tier} className="text-center min-w-[80px] capitalize">
                    {tier}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {publishedAddons.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={PLAN_TIERS.length + 1} className="text-center py-8 text-muted-foreground">
                    No published add-ons available
                  </TableCell>
                </TableRow>
              ) : (
                publishedAddons.map((addon) => (
                  <EligibilityMatrixRow
                    key={addon.id}
                    addon={addon}
                    countryCode={selectedCountry}
                    onUpdate={(rules) =>
                      updateEligibilityMutation.mutate({
                        addonId: addon.id,
                        countryCode: selectedCountry,
                        rules,
                      })
                    }
                    isUpdating={updateEligibilityMutation.isPending}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded-full bg-green-500/20 flex items-center justify-center">
            <CheckCircle className="w-3 h-3 text-green-600" />
          </div>
          <span>Can Purchase</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Badge variant="outline" className="text-xs px-1 py-0">Trial</Badge>
          <span>Trial Available</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded-full bg-red-500/20 flex items-center justify-center">
            <span className="text-red-600 text-[10px] font-bold">X</span>
          </div>
          <span>Blocked</span>
        </div>
      </div>
    </div>
  );
}

function EligibilityMatrixRow({
  addon,
  countryCode,
  onUpdate,
  isUpdating,
}: {
  addon: Addon;
  countryCode: string;
  onUpdate: (rules: Partial<EligibilityRule>[]) => void;
  isUpdating: boolean;
}) {
  const { data: eligibilityRules } = useQuery<EligibilityRule[]>({
    queryKey: ["/api/super-admin/marketplace/addons", addon.id, "eligibility", { countryCode }],
  });

  const rulesMap = new Map(eligibilityRules?.map((r) => [r.planTier, r]) || []);

  const handleCellClick = (planTier: string) => {
    const existing = rulesMap.get(planTier);
    let newCanPurchase = true;
    let newTrialEnabled = false;

    if (!existing?.canPurchase) {
      newCanPurchase = true;
      newTrialEnabled = true;
    } else if (existing?.trialEnabled) {
      newCanPurchase = true;
      newTrialEnabled = false;
    } else {
      newCanPurchase = false;
      newTrialEnabled = false;
    }

    const allRules = PLAN_TIERS.map((tier) => {
      const rule = rulesMap.get(tier);
      if (tier === planTier) {
        return {
          planTier: tier,
          canPurchase: newCanPurchase,
          trialEnabled: newTrialEnabled,
          trialDays: 7,
        };
      }
      return {
        planTier: tier,
        canPurchase: rule?.canPurchase ?? true,
        trialEnabled: rule?.trialEnabled ?? true,
        trialDays: rule?.trialDays ?? 7,
      };
    });

    onUpdate(allRules);
  };

  return (
    <TableRow data-testid={`row-eligibility-${addon.slug}`}>
      <TableCell className="font-medium sticky left-0 bg-background">{addon.name}</TableCell>
      {PLAN_TIERS.map((tier) => {
        const rule = rulesMap.get(tier);
        return (
          <TableCell
            key={tier}
            className="text-center cursor-pointer hover-elevate p-2"
            onClick={() => !isUpdating && handleCellClick(tier)}
            data-testid={`cell-${addon.slug}-${tier}`}
          >
            <EligibilityStatusCell
              canPurchase={rule?.canPurchase ?? true}
              trialEnabled={rule?.trialEnabled ?? false}
            />
          </TableCell>
        );
      })}
    </TableRow>
  );
}

function AuditLogsTab() {
  const [addonFilter, setAddonFilter] = useState<string>("all");
  const [page, setPage] = useState(1);

  const { data: addonsData } = useQuery<{ addons: Addon[] }>({
    queryKey: ["/api/super-admin/marketplace/addons"],
  });

  const { data, isLoading } = useQuery<{ logs: AuditLog[]; pagination: { total: number; totalPages: number } }>({
    queryKey: ["/api/super-admin/marketplace/audit-logs", { addonId: addonFilter !== "all" ? addonFilter : undefined, page }],
  });

  const formatAction = (action: string) => {
    return action.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Label className="whitespace-nowrap">Filter by Add-on:</Label>
        <Select value={addonFilter} onValueChange={setAddonFilter}>
          <SelectTrigger className="w-[200px]" data-testid="select-addon-filter-logs">
            <SelectValue placeholder="All Add-ons" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Add-ons</SelectItem>
            {addonsData?.addons.map((addon) => (
              <SelectItem key={addon.id} value={addon.id}>
                {addon.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <Table data-testid="table-audit-logs">
          <TableHeader>
            <TableRow>
              <TableHead>Timestamp</TableHead>
              <TableHead>Actor</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Add-on</TableHead>
              <TableHead>Country</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.logs.map((log) => (
              <TableRow key={log.id} data-testid={`row-log-${log.id}`}>
                <TableCell className="text-sm text-muted-foreground">
                  {new Date(log.createdAt).toLocaleString()}
                </TableCell>
                <TableCell>{log.actorEmail || log.actorUserId}</TableCell>
                <TableCell>
                  <Badge variant="outline">{formatAction(log.action)}</Badge>
                </TableCell>
                <TableCell>{log.addonSlug || "-"}</TableCell>
                <TableCell>{log.countryCode || "-"}</TableCell>
              </TableRow>
            ))}
            {(!data?.logs || data.logs.length === 0) && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  No audit logs found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}

      {data?.pagination && data.pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
            data-testid="button-prev-page"
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {data.pagination.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= data.pagination.totalPages}
            onClick={() => setPage(page + 1)}
            data-testid="button-next-page"
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}

export default function MarketplaceManagement() {
  const { admin, isSuperAdmin } = useAdmin();

  const { data: summary, isLoading: summaryLoading } = useQuery<Summary>({
    queryKey: ["/api/super-admin/marketplace/summary"],
  });

  if (!admin || !isSuperAdmin) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="unauthorized-message">
        <p className="text-muted-foreground">You need to be logged in as Super Admin to access this page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6" data-testid="page-marketplace-management">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Marketplace Management</h1>
          <p className="text-muted-foreground">Manage add-on catalog, country rollout, and eligibility rules</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card data-testid="card-summary-total">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Add-ons</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {summaryLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{summary?.addons.total || 0}</div>
            )}
          </CardContent>
        </Card>
        <Card data-testid="card-summary-published">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Published</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            {summaryLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold text-green-600">{summary?.addons.published || 0}</div>
            )}
          </CardContent>
        </Card>
        <Card data-testid="card-summary-countries">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Countries</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {summaryLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{summary?.activeCountries.length || 0}</div>
            )}
          </CardContent>
        </Card>
        <Card data-testid="card-summary-installs">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Installs</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {summaryLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{summary?.activeInstalls || 0}</div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Tabs defaultValue="catalog">
            <TabsList className="grid w-full grid-cols-4" data-testid="tabs-marketplace">
              <TabsTrigger value="catalog" data-testid="tab-catalog">
                <Package className="mr-2 h-4 w-4" />
                Catalog
              </TabsTrigger>
              <TabsTrigger value="countries" data-testid="tab-countries">
                <Globe className="mr-2 h-4 w-4" />
                Country Rollout
              </TabsTrigger>
              <TabsTrigger value="eligibility" data-testid="tab-eligibility">
                <Shield className="mr-2 h-4 w-4" />
                Eligibility
              </TabsTrigger>
              <TabsTrigger value="audit" data-testid="tab-audit">
                <FileText className="mr-2 h-4 w-4" />
                Audit Logs
              </TabsTrigger>
            </TabsList>

            <TabsContent value="catalog" className="mt-6">
              <CatalogTab />
            </TabsContent>

            <TabsContent value="countries" className="mt-6">
              <CountryRolloutTab />
            </TabsContent>

            <TabsContent value="eligibility" className="mt-6">
              <EligibilityTab />
            </TabsContent>

            <TabsContent value="audit" className="mt-6">
              <AuditLogsTab />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
