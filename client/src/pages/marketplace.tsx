import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import {
  Search,
  Package,
  Star,
  Download,
  Check,
  AlertCircle,
  Zap,
  Crown,
  Clock,
  BarChart3,
  Settings,
  Power,
  PowerOff,
  RefreshCw,
  Trash2,
  ChevronRight,
  Filter,
} from "lucide-react";

interface AddonPricing {
  id: string;
  pricingType: "free" | "one_time" | "subscription" | "usage_based";
  price: string | null;
  currency: string;
  billingCycle: string | null;
  trialDays: number | null;
  displayName: string | null;
}

interface AddonVersion {
  id: string;
  semverMajor: number;
  semverMinor: number;
  semverPatch: number;
  releaseNotes: string | null;
}

interface Addon {
  id: string;
  name: string;
  slug: string;
  shortDescription: string | null;
  description: string | null;
  category: string;
  developerName: string | null;
  iconUrl: string | null;
  installCount: number;
  averageRating: string | null;
  reviewCount: number;
  featured: boolean;
  pricing: AddonPricing[];
  latestVersion: AddonVersion | null;
}

interface InstalledAddon {
  installation: {
    id: string;
    addonId: string;
    status: string;
    config: unknown;
    usageThisPeriod: Record<string, number>;
    installedAt: string;
    lastActiveAt: string | null;
  };
  addon: Addon;
  version: AddonVersion;
  pricing: AddonPricing | null;
}

const CATEGORIES = [
  { value: "all", label: "All Categories" },
  { value: "analytics", label: "Analytics" },
  { value: "communication", label: "Communication" },
  { value: "crm", label: "CRM" },
  { value: "finance", label: "Finance" },
  { value: "inventory", label: "Inventory" },
  { value: "marketing", label: "Marketing" },
  { value: "payments", label: "Payments" },
  { value: "productivity", label: "Productivity" },
  { value: "reporting", label: "Reporting" },
  { value: "scheduling", label: "Scheduling" },
  { value: "other", label: "Other" },
];

function formatPrice(pricing: AddonPricing[]): string {
  if (pricing.length === 0) return "Contact Sales";
  const firstPricing = pricing[0];
  if (firstPricing.pricingType === "free") return "Free";
  if (!firstPricing.price) return "Free";
  const price = parseFloat(firstPricing.price);
  const currency = firstPricing.currency === "USD" ? "$" : firstPricing.currency;
  if (firstPricing.pricingType === "subscription") {
    return `${currency}${price}/${firstPricing.billingCycle === "monthly" ? "mo" : "yr"}`;
  }
  if (firstPricing.pricingType === "one_time") {
    return `${currency}${price} once`;
  }
  return `${currency}${price}`;
}

function getPricingBadgeVariant(pricingType: string): "default" | "secondary" | "outline" {
  switch (pricingType) {
    case "free":
      return "secondary";
    case "subscription":
      return "default";
    default:
      return "outline";
  }
}

function AddonCardSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <Skeleton className="h-12 w-12 rounded-md" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-20" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="pb-3">
        <Skeleton className="h-12 w-full" />
      </CardContent>
      <CardFooter className="flex items-center justify-between gap-2 pt-0">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-9 w-20" />
      </CardFooter>
    </Card>
  );
}

function AddonCard({
  addon,
  isInstalled,
  onInstall,
  isInstalling,
}: {
  addon: Addon;
  isInstalled: boolean;
  onInstall: (addon: Addon) => void;
  isInstalling: boolean;
}) {
  const pricingType = addon.pricing[0]?.pricingType || "free";

  return (
    <Card className="flex flex-col">
      <CardHeader className="flex-row items-start gap-3 pb-3 space-y-0">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          {addon.iconUrl ? (
            <img src={addon.iconUrl} alt={addon.name} className="h-8 w-8 rounded" />
          ) : (
            <Package className="h-6 w-6" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <CardTitle className="text-base font-semibold truncate" data-testid={`text-addon-name-${addon.id}`}>
            {addon.name}
          </CardTitle>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <Badge variant={getPricingBadgeVariant(pricingType)} className="text-xs">
              {formatPrice(addon.pricing)}
            </Badge>
            {addon.featured && (
              <Badge variant="outline" className="gap-1 text-xs">
                <Crown className="h-3 w-3" />
                Featured
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 pb-3">
        <p className="text-sm text-muted-foreground line-clamp-2">
          {addon.shortDescription || addon.description || "No description available"}
        </p>
      </CardContent>
      <CardFooter className="flex items-center justify-between gap-2 pt-0">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {addon.averageRating && (
            <span className="flex items-center gap-1">
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
              {parseFloat(addon.averageRating).toFixed(1)}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Download className="h-3 w-3" />
            {addon.installCount}
          </span>
        </div>
        {isInstalled ? (
          <Badge variant="secondary" className="gap-1">
            <Check className="h-3 w-3" />
            Installed
          </Badge>
        ) : (
          <Button
            size="sm"
            onClick={() => onInstall(addon)}
            disabled={isInstalling}
            data-testid={`button-install-${addon.id}`}
          >
            {isInstalling ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Zap className="mr-1 h-4 w-4" />
                Install
              </>
            )}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

function InstalledAddonCard({
  installed,
  onDisable,
  onEnable,
  onUninstall,
  isPending,
}: {
  installed: InstalledAddon;
  onDisable: (addonId: string) => void;
  onEnable: (addonId: string) => void;
  onUninstall: (addonId: string) => void;
  isPending: boolean;
}) {
  const { addon, installation, version, pricing } = installed;
  const usage = installation.usageThisPeriod as Record<string, number>;
  const usageEntries = Object.entries(usage || {});

  return (
    <Card>
      <CardHeader className="flex-row items-start gap-3 pb-3 space-y-0">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          {addon.iconUrl ? (
            <img src={addon.iconUrl} alt={addon.name} className="h-8 w-8 rounded" />
          ) : (
            <Package className="h-6 w-6" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base font-semibold truncate" data-testid={`text-installed-addon-${addon.id}`}>
              {addon.name}
            </CardTitle>
            <Badge
              variant={installation.status === "active" ? "default" : "secondary"}
              className="text-xs"
            >
              {installation.status}
            </Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            v{version.semverMajor}.{version.semverMinor}.{version.semverPatch}
            {pricing && ` • ${formatPrice([pricing])}`}
          </p>
        </div>
      </CardHeader>

      {usageEntries.length > 0 && (
        <CardContent className="pb-3">
          <div className="rounded-md border p-3">
            <div className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <BarChart3 className="h-3 w-3" />
              Usage This Period
            </div>
            <div className="grid grid-cols-2 gap-2">
              {usageEntries.slice(0, 4).map(([key, value]) => (
                <div key={key} className="text-sm">
                  <span className="text-muted-foreground capitalize">{key.replace(/_/g, " ")}:</span>{" "}
                  <span className="font-medium">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      )}

      <CardFooter className="flex items-center justify-between gap-2 pt-0">
        <p className="text-xs text-muted-foreground">
          <Clock className="mr-1 inline h-3 w-3" />
          Installed {new Date(installation.installedAt).toLocaleDateString()}
        </p>
        <div className="flex items-center gap-1">
          {installation.status === "active" ? (
            <Button
              size="icon"
              variant="ghost"
              onClick={() => onDisable(addon.id)}
              disabled={isPending}
              title="Disable"
              data-testid={`button-disable-${addon.id}`}
            >
              <PowerOff className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              size="icon"
              variant="ghost"
              onClick={() => onEnable(addon.id)}
              disabled={isPending}
              title="Enable"
              data-testid={`button-enable-${addon.id}`}
            >
              <Power className="h-4 w-4" />
            </Button>
          )}
          <Button
            size="icon"
            variant="ghost"
            onClick={() => onUninstall(addon.id)}
            disabled={isPending}
            title="Uninstall"
            data-testid={`button-uninstall-${addon.id}`}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}

export default function Marketplace() {
  const { tenant } = useAuth();
  const tenantId = tenant?.id;
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [selectedAddon, setSelectedAddon] = useState<Addon | null>(null);
  const [selectedPricingId, setSelectedPricingId] = useState<string>("");
  const [installDialogOpen, setInstallDialogOpen] = useState(false);

  const { data: marketplaceData, isLoading: marketplaceLoading } = useQuery<{ addons: Addon[] }>({
    queryKey: ["/api/addons/marketplace", searchQuery, category],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.append("search", searchQuery);
      if (category && category !== "all") params.append("category", category);
      const url = `/api/addons/marketplace${params.toString() ? `?${params}` : ""}`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch marketplace");
      return res.json();
    },
  });

  const { data: installedData, isLoading: installedLoading } = useQuery<{ installedAddons: InstalledAddon[] }>({
    queryKey: ["/api/addons/tenant", tenantId, "addons"],
    queryFn: async () => {
      if (!tenantId) return { installedAddons: [] };
      const res = await fetch(`/api/addons/tenant/${tenantId}/addons`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch installed addons");
      return res.json();
    },
    enabled: !!tenantId,
  });

  const installedAddonIds = new Set(installedData?.installedAddons?.map((i) => i.addon.id) || []);

  const handleCloseInstallDialog = () => {
    setInstallDialogOpen(false);
    setSelectedAddon(null);
    setSelectedPricingId("");
  };

  const installMutation = useMutation({
    mutationFn: async ({ addonId, pricingId }: { addonId: string; pricingId?: string }) => {
      return apiRequest("POST", `/api/addons/tenant/${tenantId}/addons`, { addonId, pricingId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/addons/tenant", tenantId, "addons"] });
      toast({ title: "Add-on installed successfully" });
      handleCloseInstallDialog();
    },
    onError: (error: any) => {
      toast({ title: "Installation failed", description: error.message, variant: "destructive" });
    },
  });

  const disableMutation = useMutation({
    mutationFn: async (addonId: string) => {
      return apiRequest("POST", `/api/addons/tenant/${tenantId}/addons/${addonId}/disable`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/addons/tenant", tenantId, "addons"] });
      toast({ title: "Add-on disabled" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to disable", description: error.message, variant: "destructive" });
    },
  });

  const enableMutation = useMutation({
    mutationFn: async (addonId: string) => {
      return apiRequest("POST", `/api/addons/tenant/${tenantId}/addons/${addonId}/enable`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/addons/tenant", tenantId, "addons"] });
      toast({ title: "Add-on enabled" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to enable", description: error.message, variant: "destructive" });
    },
  });

  const uninstallMutation = useMutation({
    mutationFn: async (addonId: string) => {
      return apiRequest("DELETE", `/api/addons/tenant/${tenantId}/addons/${addonId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/addons/tenant", tenantId, "addons"] });
      toast({ title: "Add-on uninstalled" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to uninstall", description: error.message, variant: "destructive" });
    },
  });

  const handleInstallClick = (addon: Addon) => {
    setSelectedAddon(addon);
    if (addon.pricing.length > 0) {
      setSelectedPricingId(addon.pricing[0].id);
    }
    setInstallDialogOpen(true);
  };

  const handleConfirmInstall = () => {
    if (!selectedAddon) return;
    installMutation.mutate({
      addonId: selectedAddon.id,
      pricingId: selectedPricingId || undefined,
    });
  };

  const filteredAddons = marketplaceData?.addons?.filter((addon) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        addon.name.toLowerCase().includes(query) ||
        addon.shortDescription?.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const isPending =
    disableMutation.isPending || enableMutation.isPending || uninstallMutation.isPending;

  return (
    <DashboardLayout title="Add-on Marketplace" breadcrumbs={[{ label: "Marketplace" }]}>
      <Tabs defaultValue="browse" className="space-y-6">
        <TabsList>
          <TabsTrigger value="browse" data-testid="tab-browse">
            Browse Add-ons
          </TabsTrigger>
          <TabsTrigger value="installed" data-testid="tab-installed">
            Installed ({installedData?.installedAddons?.length || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="browse" className="space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search add-ons..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search-addons"
              />
            </div>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-[180px]" data-testid="select-category">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {marketplaceLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <AddonCardSkeleton key={i} />
              ))}
            </div>
          ) : filteredAddons && filteredAddons.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredAddons.map((addon) => (
                <AddonCard
                  key={addon.id}
                  addon={addon}
                  isInstalled={installedAddonIds.has(addon.id)}
                  onInstall={handleInstallClick}
                  isInstalling={installMutation.isPending && selectedAddon?.id === addon.id}
                />
              ))}
            </div>
          ) : (
            <Card data-testid="card-empty-browse">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Package className="h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-medium" data-testid="text-empty-browse-title">No add-ons found</h3>
                <p className="mt-2 text-sm text-muted-foreground" data-testid="text-empty-browse-message">
                  {searchQuery
                    ? "Try adjusting your search or filters"
                    : "Check back later for new add-ons"}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="installed" className="space-y-6">
          {installedLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <AddonCardSkeleton key={i} />
              ))}
            </div>
          ) : installedData?.installedAddons && installedData.installedAddons.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {installedData.installedAddons.map((installed) => (
                <InstalledAddonCard
                  key={installed.installation.id}
                  installed={installed}
                  onDisable={disableMutation.mutate}
                  onEnable={enableMutation.mutate}
                  onUninstall={uninstallMutation.mutate}
                  isPending={isPending}
                />
              ))}
            </div>
          ) : (
            <Card data-testid="card-empty-installed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Package className="h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-medium" data-testid="text-empty-installed-title">No add-ons installed</h3>
                <p className="mt-2 text-sm text-muted-foreground" data-testid="text-empty-installed-message">
                  Browse the marketplace to find add-ons for your business
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={installDialogOpen} onOpenChange={(open) => !open && handleCloseInstallDialog()}>
        <DialogContent data-testid="dialog-install-addon">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Install {selectedAddon?.name}
            </DialogTitle>
            <DialogDescription>
              {selectedAddon?.shortDescription || "Add this extension to your business"}
            </DialogDescription>
          </DialogHeader>

          {selectedAddon && (
            <div className="space-y-4">
              {selectedAddon.pricing.length > 1 && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Select Plan</label>
                  <Select value={selectedPricingId} onValueChange={setSelectedPricingId}>
                    <SelectTrigger data-testid="select-pricing">
                      <SelectValue placeholder="Select a plan" />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedAddon.pricing.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.displayName || p.pricingType} - {formatPrice([p])}
                          {p.trialDays && ` (${p.trialDays} day trial)`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {selectedAddon.pricing[0]?.pricingType !== "free" && (
                <div className="rounded-md border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950" data-testid="text-billing-info">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="mt-0.5 h-4 w-4 text-amber-600 dark:text-amber-400" />
                    <div className="text-sm">
                      <p className="font-medium text-amber-800 dark:text-amber-200">
                        Billing Information
                      </p>
                      <p className="text-amber-700 dark:text-amber-300">
                        You will be charged {formatPrice(selectedAddon.pricing)} for this add-on.
                        {selectedAddon.pricing[0]?.trialDays &&
                          ` Includes a ${selectedAddon.pricing[0].trialDays}-day free trial.`}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={handleCloseInstallDialog}
              data-testid="button-cancel-install"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmInstall}
              disabled={installMutation.isPending}
              data-testid="button-confirm-install"
            >
              {installMutation.isPending ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Zap className="mr-2 h-4 w-4" />
              )}
              Install Add-on
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
