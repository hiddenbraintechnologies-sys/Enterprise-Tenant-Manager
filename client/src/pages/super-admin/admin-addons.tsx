import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { 
  Plus, Edit2, Trash2, Users, Calculator, DollarSign, 
  TrendingUp, CheckCircle, XCircle, Loader2, Save, RefreshCw,
  Package, Archive, Search, Eye, Globe, Star
} from "lucide-react";
import { cn } from "@/lib/utils";
import { apiRequest, getQueryFn, queryClient } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PayrollTier {
  id: string;
  countryCode: string;
  tierName: string;
  minEmployees: number;
  maxEmployees: number | null;
  monthlyPrice: string;
  yearlyPrice: string;
  isActive: boolean;
  createdAt: string;
}

interface AddonStats {
  stats: {
    totalTiers: number;
    activeTiers: number;
    totalSubscriptions: number;
    activeSubscriptions: number;
    totalRevenue: number;
    monthlyRevenue: number;
    yearlyRevenue: number;
    byCountry: Record<string, {
      subscriptions: number;
      revenue: number;
    }>;
  };
}

interface TiersResponse {
  tiers: PayrollTier[];
}

interface MarketplaceAddon {
  id: string;
  slug: string;
  name: string;
  shortDescription: string | null;
  fullDescription: string | null;
  category: string;
  status: "draft" | "published" | "archived";
  supportedCountries: string[];
  supportedBusinessTypes: string[];
  tags: string[];
  featured: boolean;
  featuredOrder: number | null;
  developerName: string | null;
  iconUrl: string | null;
  installCount: number;
  averageRating: string;
  reviewCount: number;
  createdAt: string;
  updatedAt: string | null;
  publishedAt: string | null;
  pricing: AddonPricing[];
  activeInstalls: number;
  totalInstalls: number;
}

interface AddonPricing {
  id: string;
  addonId: string;
  name: string;
  pricingType: string;
  price: string;
  currency: string;
  billingPeriod: string | null;
  trialDays: number | null;
  features: string[];
  isDefault: boolean;
  isActive: boolean;
}

interface MarketplaceResponse {
  addons: MarketplaceAddon[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface MarketplaceStats {
  addonsByStatus: { status: string; count: number }[];
  addonsByCategory: { category: string; count: number }[];
  installStats: { status: string; count: number }[];
  topAddons: { addonId: string; name: string; slug: string; installCount: number }[];
}

const ADDON_CATEGORIES = [
  { value: "analytics", label: "Analytics" },
  { value: "automation", label: "Automation" },
  { value: "billing", label: "Billing" },
  { value: "booking", label: "Booking" },
  { value: "communication", label: "Communication" },
  { value: "compliance", label: "Compliance" },
  { value: "crm", label: "CRM" },
  { value: "healthcare", label: "Healthcare" },
  { value: "integration", label: "Integration" },
  { value: "inventory", label: "Inventory" },
  { value: "marketing", label: "Marketing" },
  { value: "payments", label: "Payments" },
  { value: "reporting", label: "Reporting" },
  { value: "scheduling", label: "Scheduling" },
  { value: "security", label: "Security" },
  { value: "utilities", label: "Utilities" },
];

export default function AdminAddons() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [editingTier, setEditingTier] = useState<PayrollTier | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<string>("all");
  
  // Marketplace state
  const [activeTab, setActiveTab] = useState("marketplace");
  const [marketplaceSearch, setMarketplaceSearch] = useState("");
  const [marketplaceCategory, setMarketplaceCategory] = useState("all");
  const [marketplaceStatus, setMarketplaceStatus] = useState("all");
  const [marketplacePage, setMarketplacePage] = useState(1);
  const [isAddAddonOpen, setIsAddAddonOpen] = useState(false);
  const [editingAddon, setEditingAddon] = useState<MarketplaceAddon | null>(null);
  const [viewingAddon, setViewingAddon] = useState<MarketplaceAddon | null>(null);
  
  const [newAddon, setNewAddon] = useState({
    slug: "",
    name: "",
    shortDescription: "",
    fullDescription: "",
    category: "utilities" as string,
    supportedCountries: [] as string[],
    tags: [] as string[],
    featured: false,
    status: "draft" as "draft" | "published" | "archived",
  });

  const [newTier, setNewTier] = useState<{
    countryCode: string;
    tierName: string;
    minEmployees: number;
    maxEmployees: number | null;
    monthlyPrice: string;
    yearlyPrice: string;
    isActive: boolean;
  }>({
    countryCode: "IN",
    tierName: "",
    minEmployees: 1,
    maxEmployees: 25,
    monthlyPrice: "0",
    yearlyPrice: "0",
    isActive: true,
  });

  const { data: tiersData, isLoading: isLoadingTiers, refetch: refetchTiers } = useQuery<TiersResponse>({
    queryKey: ["/api/admin/addons/payroll/tiers"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const { data: statsData, isLoading: isLoadingStats } = useQuery<AddonStats>({
    queryKey: ["/api/admin/addons/payroll/stats"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  // Marketplace queries
  const marketplaceQueryKey = [
    "/api/admin/addons/marketplace/addons",
    { search: marketplaceSearch, category: marketplaceCategory, status: marketplaceStatus, page: marketplacePage }
  ];

  const { data: marketplaceData, isLoading: isLoadingMarketplace, refetch: refetchMarketplace } = useQuery<MarketplaceResponse>({
    queryKey: marketplaceQueryKey,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (marketplaceSearch) params.set("search", marketplaceSearch);
      if (marketplaceCategory !== "all") params.set("category", marketplaceCategory);
      if (marketplaceStatus !== "all") params.set("status", marketplaceStatus);
      params.set("page", marketplacePage.toString());
      params.set("limit", "20");
      const response = await fetch(`/api/admin/addons/marketplace/addons?${params}`, {
        credentials: "include",
        headers: { "Authorization": `Bearer ${localStorage.getItem("jwt_token")}` },
      });
      if (!response.ok) throw new Error("Failed to fetch add-ons");
      return response.json();
    },
  });

  const { data: marketplaceStats } = useQuery<MarketplaceStats>({
    queryKey: ["/api/admin/addons/marketplace/stats"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const createTierMutation = useMutation({
    mutationFn: async (data: typeof newTier) => {
      const response = await apiRequest("POST", "/api/admin/addons/payroll/tiers", data);
      return response.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/addons/payroll/tiers"] });
      toast({ title: "Tier created", description: "The payroll tier has been created successfully." });
      setIsAddDialogOpen(false);
      resetNewTier();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateTierMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<PayrollTier> }) => {
      const response = await apiRequest("PATCH", `/api/admin/addons/payroll/tiers/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/addons/payroll/tiers"] });
      toast({ title: "Tier updated", description: "The payroll tier has been updated successfully." });
      setEditingTier(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteTierMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/admin/addons/payroll/tiers/${id}`);
      return response.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/addons/payroll/tiers"] });
      toast({ title: "Tier deleted", description: "The payroll tier has been deleted successfully." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Marketplace mutations
  const createAddonMutation = useMutation({
    mutationFn: async (data: typeof newAddon) => {
      const response = await apiRequest("POST", "/api/admin/addons/marketplace/addons", data);
      return response.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/addons/marketplace/addons"] });
      qc.invalidateQueries({ queryKey: ["/api/admin/addons/marketplace/stats"] });
      toast({ title: "Add-on created", description: "The add-on has been created successfully." });
      setIsAddAddonOpen(false);
      resetNewAddon();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateAddonMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<MarketplaceAddon> }) => {
      const response = await apiRequest("PATCH", `/api/admin/addons/marketplace/addons/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/addons/marketplace/addons"] });
      qc.invalidateQueries({ queryKey: ["/api/admin/addons/marketplace/stats"] });
      toast({ title: "Add-on updated", description: "The add-on has been updated successfully." });
      setEditingAddon(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const archiveAddonMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("POST", `/api/admin/addons/marketplace/addons/${id}/archive`, {});
      return response.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/addons/marketplace/addons"] });
      qc.invalidateQueries({ queryKey: ["/api/admin/addons/marketplace/stats"] });
      toast({ title: "Add-on archived", description: "The add-on has been archived." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteAddonMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/admin/addons/marketplace/addons/${id}`);
      return response.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/addons/marketplace/addons"] });
      qc.invalidateQueries({ queryKey: ["/api/admin/addons/marketplace/stats"] });
      toast({ title: "Add-on deleted", description: "The add-on has been deleted." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const resetNewAddon = () => {
    setNewAddon({
      slug: "",
      name: "",
      shortDescription: "",
      fullDescription: "",
      category: "utilities",
      supportedCountries: [],
      tags: [],
      featured: false,
      status: "draft",
    });
  };

  const resetNewTier = () => {
    setNewTier({
      countryCode: "IN",
      tierName: "",
      minEmployees: 1,
      maxEmployees: 25,
      monthlyPrice: "0",
      yearlyPrice: "0",
      isActive: true,
    });
  };

  const validatePricing = (monthly: string, yearly: string): string | null => {
    const monthlyNum = parseFloat(monthly);
    const yearlyNum = parseFloat(yearly);
    if (isNaN(monthlyNum) || monthlyNum < 0) {
      return "Monthly price must be a non-negative number";
    }
    if (isNaN(yearlyNum) || yearlyNum < 0) {
      return "Yearly price must be a non-negative number";
    }
    return null;
  };

  const handleCreateTier = () => {
    const validationError = validatePricing(newTier.monthlyPrice, newTier.yearlyPrice);
    if (validationError) {
      toast({ title: "Validation Error", description: validationError, variant: "destructive" });
      return;
    }
    if (!newTier.tierName.trim()) {
      toast({ title: "Validation Error", description: "Tier name is required", variant: "destructive" });
      return;
    }
    createTierMutation.mutate(newTier);
  };

  const handleUpdateTier = () => {
    if (!editingTier) return;
    const validationError = validatePricing(editingTier.monthlyPrice, editingTier.yearlyPrice);
    if (validationError) {
      toast({ title: "Validation Error", description: validationError, variant: "destructive" });
      return;
    }
    updateTierMutation.mutate({
      id: editingTier.id,
      data: {
        tierName: editingTier.tierName,
        minEmployees: editingTier.minEmployees,
        maxEmployees: editingTier.maxEmployees,
        monthlyPrice: editingTier.monthlyPrice,
        yearlyPrice: editingTier.yearlyPrice,
        isActive: editingTier.isActive,
      },
    });
  };

  const handleToggleActive = (tier: PayrollTier) => {
    updateTierMutation.mutate({
      id: tier.id,
      data: { isActive: !tier.isActive },
    });
  };

  const filteredTiers = tiersData?.tiers?.filter(
    tier => selectedCountry === "all" || tier.countryCode === selectedCountry
  ) || [];

  const stats = statsData?.stats;
  const isLoading = isLoadingTiers || isLoadingStats;

  const getCountryName = (code: string) => {
    const names: Record<string, string> = {
      IN: "India",
      MY: "Malaysia",
      UK: "United Kingdom",
      US: "United States",
      AE: "UAE",
    };
    return names[code] || code;
  };

  const getCurrencySymbol = (code: string) => {
    const symbols: Record<string, string> = {
      IN: "₹",
      MY: "RM",
      UK: "£",
      US: "$",
      AE: "د.إ",
    };
    return symbols[code] || "$";
  };

  if (isLoading) {
    return (
      <div className="container py-8 space-y-6" data-testid="admin-addons-loading">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="container py-8 space-y-6" data-testid="admin-addons-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Add-ons Management</h1>
          <p className="text-muted-foreground">Manage payroll tiers and pricing for all countries</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => refetchTiers()} data-testid="button-refresh">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => setIsAddDialogOpen(true)} data-testid="button-add-tier">
            <Plus className="h-4 w-4 mr-2" />
            Add Tier
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card data-testid="stat-total-tiers">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-4">
            <CardTitle className="text-sm font-medium">Total Tiers</CardTitle>
            <Calculator className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalTiers || 0}</div>
            <p className="text-xs text-muted-foreground">{stats?.activeTiers || 0} active</p>
          </CardContent>
        </Card>

        <Card data-testid="stat-subscriptions">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-4">
            <CardTitle className="text-sm font-medium">Subscriptions</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalSubscriptions || 0}</div>
            <p className="text-xs text-muted-foreground">{stats?.activeSubscriptions || 0} active</p>
          </CardContent>
        </Card>

        <Card data-testid="stat-monthly-revenue">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-4">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{(stats?.monthlyRevenue || 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">From monthly plans</p>
          </CardContent>
        </Card>

        <Card data-testid="stat-total-revenue">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-4">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{(stats?.totalRevenue || 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="marketplace" data-testid="tab-marketplace">Marketplace</TabsTrigger>
          <TabsTrigger value="tiers" data-testid="tab-tiers">Payroll Tiers</TabsTrigger>
          <TabsTrigger value="subscriptions" data-testid="tab-subscriptions">Subscriptions</TabsTrigger>
        </TabsList>

        <TabsContent value="marketplace" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <Card data-testid="stat-total-addons">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-4">
                <CardTitle className="text-sm font-medium">Total Add-ons</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{marketplaceStats?.addonsByStatus?.reduce((a, b) => a + b.count, 0) || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {marketplaceStats?.addonsByStatus?.find(s => s.status === "published")?.count || 0} published
                </p>
              </CardContent>
            </Card>

            <Card data-testid="stat-installs">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-4">
                <CardTitle className="text-sm font-medium">Total Installs</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{marketplaceStats?.installStats?.reduce((a, b) => a + b.count, 0) || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {marketplaceStats?.installStats?.find(s => s.status === "active")?.count || 0} active
                </p>
              </CardContent>
            </Card>

            <Card data-testid="stat-categories">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-4">
                <CardTitle className="text-sm font-medium">Categories</CardTitle>
                <Globe className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{marketplaceStats?.addonsByCategory?.length || 0}</div>
                <p className="text-xs text-muted-foreground">With published add-ons</p>
              </CardContent>
            </Card>

            <Card data-testid="stat-top-addon">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-4">
                <CardTitle className="text-sm font-medium">Top Add-on</CardTitle>
                <Star className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-lg font-bold truncate">
                  {marketplaceStats?.topAddons?.[0]?.name || "N/A"}
                </div>
                <p className="text-xs text-muted-foreground">
                  {marketplaceStats?.topAddons?.[0]?.installCount || 0} installs
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <CardTitle>Marketplace Add-ons</CardTitle>
                  <CardDescription>Manage all add-ons in the marketplace</CardDescription>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search add-ons..."
                      value={marketplaceSearch}
                      onChange={(e) => {
                        setMarketplaceSearch(e.target.value);
                        setMarketplacePage(1);
                      }}
                      className="pl-8 w-[200px]"
                      data-testid="input-marketplace-search"
                    />
                  </div>
                  <Select value={marketplaceCategory} onValueChange={(v) => { setMarketplaceCategory(v); setMarketplacePage(1); }}>
                    <SelectTrigger className="w-[140px]" data-testid="select-marketplace-category">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {ADDON_CATEGORIES.map(cat => (
                        <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={marketplaceStatus} onValueChange={(v) => { setMarketplaceStatus(v); setMarketplacePage(1); }}>
                    <SelectTrigger className="w-[120px]" data-testid="select-marketplace-status">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" onClick={() => refetchMarketplace()} data-testid="button-refresh-marketplace">
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                  <Button onClick={() => setIsAddAddonOpen(true)} data-testid="button-add-addon">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Add-on
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingMarketplace ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-16" />)}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Countries</TableHead>
                      <TableHead>Installs</TableHead>
                      <TableHead>Featured</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {marketplaceData?.addons?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          No add-ons found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      marketplaceData?.addons?.map((addon) => (
                        <TableRow key={addon.id} data-testid={`addon-row-${addon.id}`}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{addon.name}</p>
                              <p className="text-xs text-muted-foreground">{addon.slug}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{addon.category}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={addon.status === "published" ? "default" : addon.status === "draft" ? "secondary" : "outline"}
                            >
                              {addon.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {addon.supportedCountries?.length > 0 ? (
                              <span className="text-xs">{addon.supportedCountries.join(", ")}</span>
                            ) : (
                              <Badge variant="outline">Global</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <span>{addon.activeInstalls} / {addon.totalInstalls}</span>
                          </TableCell>
                          <TableCell>
                            <Switch
                              checked={addon.featured}
                              onCheckedChange={(checked) => 
                                updateAddonMutation.mutate({ id: addon.id, data: { featured: checked } })
                              }
                              data-testid={`switch-featured-${addon.id}`}
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setViewingAddon(addon)}
                                data-testid={`button-view-${addon.id}`}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setEditingAddon(addon)}
                                data-testid={`button-edit-addon-${addon.id}`}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              {addon.status !== "archived" && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => archiveAddonMutation.mutate(addon.id)}
                                  data-testid={`button-archive-${addon.id}`}
                                >
                                  <Archive className="h-4 w-4 text-muted-foreground" />
                                </Button>
                              )}
                              {addon.status === "draft" && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => deleteAddonMutation.mutate(addon.id)}
                                  data-testid={`button-delete-addon-${addon.id}`}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}

              {marketplaceData?.pagination && marketplaceData.pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Showing {((marketplaceData.pagination.page - 1) * marketplaceData.pagination.limit) + 1} to{" "}
                    {Math.min(marketplaceData.pagination.page * marketplaceData.pagination.limit, marketplaceData.pagination.total)} of{" "}
                    {marketplaceData.pagination.total} add-ons
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={marketplacePage === 1}
                      onClick={() => setMarketplacePage(p => p - 1)}
                    >
                      Previous
                    </Button>
                    <span className="text-sm">
                      Page {marketplacePage} of {marketplaceData.pagination.totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={marketplacePage >= marketplaceData.pagination.totalPages}
                      onClick={() => setMarketplacePage(p => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tiers" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <CardTitle>Payroll Tiers</CardTitle>
                  <CardDescription>Manage pricing tiers for the payroll add-on</CardDescription>
                </div>
                <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                  <SelectTrigger className="w-[180px]" data-testid="select-country-filter">
                    <SelectValue placeholder="Filter by country" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Countries</SelectItem>
                    <SelectItem value="IN">India</SelectItem>
                    <SelectItem value="MY">Malaysia</SelectItem>
                    <SelectItem value="UK">United Kingdom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Country</TableHead>
                    <TableHead>Tier Name</TableHead>
                    <TableHead>Employees</TableHead>
                    <TableHead>Monthly</TableHead>
                    <TableHead>Yearly</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTiers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        No tiers found. Create your first tier.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTiers.map((tier) => (
                      <TableRow key={tier.id} data-testid={`tier-row-${tier.id}`}>
                        <TableCell>
                          <Badge variant="outline">{getCountryName(tier.countryCode)}</Badge>
                        </TableCell>
                        <TableCell className="font-medium">{tier.tierName}</TableCell>
                        <TableCell>
                          {tier.minEmployees}-{tier.maxEmployees === null ? "∞" : tier.maxEmployees}
                        </TableCell>
                        <TableCell>
                          {getCurrencySymbol(tier.countryCode)}{parseFloat(tier.monthlyPrice).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          {getCurrencySymbol(tier.countryCode)}{parseFloat(tier.yearlyPrice).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={tier.isActive}
                            onCheckedChange={() => handleToggleActive(tier)}
                            data-testid={`switch-active-${tier.id}`}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setEditingTier(tier)}
                              data-testid={`button-edit-${tier.id}`}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteTierMutation.mutate(tier.id)}
                              data-testid={`button-delete-${tier.id}`}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subscriptions">
          <Card>
            <CardHeader>
              <CardTitle>Payroll Subscriptions</CardTitle>
              <CardDescription>View all tenant payroll subscriptions</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-center py-8">
                Subscriptions list coming soon...
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Payroll Tier</DialogTitle>
            <DialogDescription>Create a new pricing tier for the payroll add-on</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="country">Country</Label>
              <Select value={newTier.countryCode} onValueChange={(v) => setNewTier({ ...newTier, countryCode: v })}>
                <SelectTrigger className="col-span-3" data-testid="select-new-country">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="IN">India</SelectItem>
                  <SelectItem value="MY">Malaysia</SelectItem>
                  <SelectItem value="UK">United Kingdom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="tierName">Tier Name</Label>
              <Input
                id="tierName"
                value={newTier.tierName}
                onChange={(e) => setNewTier({ ...newTier, tierName: e.target.value })}
                className="col-span-3"
                placeholder="e.g., Tier A - Small"
                data-testid="input-tier-name"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label>Employees</Label>
              <div className="col-span-3 flex items-center gap-2">
                <Input
                  type="number"
                  value={newTier.minEmployees}
                  onChange={(e) => setNewTier({ ...newTier, minEmployees: parseInt(e.target.value) || 0 })}
                  placeholder="Min"
                  data-testid="input-min-employees"
                />
                <span>to</span>
                <Input
                  type="number"
                  value={newTier.maxEmployees || ""}
                  onChange={(e) => setNewTier({ ...newTier, maxEmployees: e.target.value ? parseInt(e.target.value) : null })}
                  placeholder="Max (empty = unlimited)"
                  data-testid="input-max-employees"
                />
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="monthlyPrice">Monthly Price</Label>
              <Input
                id="monthlyPrice"
                type="number"
                value={newTier.monthlyPrice}
                onChange={(e) => setNewTier({ ...newTier, monthlyPrice: e.target.value })}
                className="col-span-3"
                data-testid="input-monthly-price"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="yearlyPrice">Yearly Price</Label>
              <Input
                id="yearlyPrice"
                type="number"
                value={newTier.yearlyPrice}
                onChange={(e) => setNewTier({ ...newTier, yearlyPrice: e.target.value })}
                className="col-span-3"
                data-testid="input-yearly-price"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="isActive">Active</Label>
              <Switch
                id="isActive"
                checked={newTier.isActive}
                onCheckedChange={(checked) => setNewTier({ ...newTier, isActive: checked })}
                data-testid="switch-new-active"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateTier} disabled={createTierMutation.isPending}>
              {createTierMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Tier
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingTier} onOpenChange={(open) => !open && setEditingTier(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Payroll Tier</DialogTitle>
            <DialogDescription>Update the pricing tier details</DialogDescription>
          </DialogHeader>
          {editingTier && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label>Country</Label>
                <Badge variant="outline" className="col-span-3 w-fit">
                  {getCountryName(editingTier.countryCode)}
                </Badge>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-tierName">Tier Name</Label>
                <Input
                  id="edit-tierName"
                  value={editingTier.tierName}
                  onChange={(e) => setEditingTier({ ...editingTier, tierName: e.target.value })}
                  className="col-span-3"
                  data-testid="input-edit-tier-name"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label>Employees</Label>
                <div className="col-span-3 flex items-center gap-2">
                  <Input
                    type="number"
                    value={editingTier.minEmployees}
                    onChange={(e) => setEditingTier({ ...editingTier, minEmployees: parseInt(e.target.value) || 0 })}
                    placeholder="Min"
                    data-testid="input-edit-min-employees"
                  />
                  <span>to</span>
                  <Input
                    type="number"
                    value={editingTier.maxEmployees || ""}
                    onChange={(e) => setEditingTier({ ...editingTier, maxEmployees: e.target.value ? parseInt(e.target.value) : null })}
                    placeholder="Max"
                    data-testid="input-edit-max-employees"
                  />
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-monthlyPrice">Monthly Price</Label>
                <Input
                  id="edit-monthlyPrice"
                  type="number"
                  value={editingTier.monthlyPrice}
                  onChange={(e) => setEditingTier({ ...editingTier, monthlyPrice: e.target.value })}
                  className="col-span-3"
                  data-testid="input-edit-monthly-price"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-yearlyPrice">Yearly Price</Label>
                <Input
                  id="edit-yearlyPrice"
                  type="number"
                  value={editingTier.yearlyPrice}
                  onChange={(e) => setEditingTier({ ...editingTier, yearlyPrice: e.target.value })}
                  className="col-span-3"
                  data-testid="input-edit-yearly-price"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-isActive">Active</Label>
                <Switch
                  id="edit-isActive"
                  checked={editingTier.isActive}
                  onCheckedChange={(checked) => setEditingTier({ ...editingTier, isActive: checked })}
                  data-testid="switch-edit-active"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingTier(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateTier} disabled={updateTierMutation.isPending}>
              {updateTierMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Add-on Dialog */}
      <Dialog open={isAddAddonOpen} onOpenChange={setIsAddAddonOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Add-on</DialogTitle>
            <DialogDescription>Create a new add-on for the marketplace</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="addon-slug">Slug</Label>
              <Input
                id="addon-slug"
                value={newAddon.slug}
                onChange={(e) => setNewAddon({ ...newAddon, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })}
                className="col-span-3"
                placeholder="my-addon-name"
                data-testid="input-addon-slug"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="addon-name">Name</Label>
              <Input
                id="addon-name"
                value={newAddon.name}
                onChange={(e) => setNewAddon({ ...newAddon, name: e.target.value })}
                className="col-span-3"
                placeholder="My Add-on Name"
                data-testid="input-addon-name"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="addon-category">Category</Label>
              <Select value={newAddon.category} onValueChange={(v) => setNewAddon({ ...newAddon, category: v })}>
                <SelectTrigger className="col-span-3" data-testid="select-addon-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ADDON_CATEGORIES.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="addon-short-desc">Short Description</Label>
              <Input
                id="addon-short-desc"
                value={newAddon.shortDescription}
                onChange={(e) => setNewAddon({ ...newAddon, shortDescription: e.target.value })}
                className="col-span-3"
                placeholder="Brief description (max 500 chars)"
                data-testid="input-addon-short-desc"
              />
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="addon-full-desc" className="pt-2">Full Description</Label>
              <Textarea
                id="addon-full-desc"
                value={newAddon.fullDescription}
                onChange={(e) => setNewAddon({ ...newAddon, fullDescription: e.target.value })}
                className="col-span-3 min-h-[100px]"
                placeholder="Detailed description with features..."
                data-testid="input-addon-full-desc"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="addon-countries">Countries</Label>
              <Input
                id="addon-countries"
                value={newAddon.supportedCountries.join(", ")}
                onChange={(e) => setNewAddon({ 
                  ...newAddon, 
                  supportedCountries: e.target.value.split(",").map(s => s.trim().toUpperCase()).filter(Boolean)
                })}
                className="col-span-3"
                placeholder="IN, MY, UK (empty = global)"
                data-testid="input-addon-countries"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="addon-tags">Tags</Label>
              <Input
                id="addon-tags"
                value={newAddon.tags.join(", ")}
                onChange={(e) => setNewAddon({ 
                  ...newAddon, 
                  tags: e.target.value.split(",").map(s => s.trim().toLowerCase()).filter(Boolean)
                })}
                className="col-span-3"
                placeholder="tag1, tag2, tag3"
                data-testid="input-addon-tags"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="addon-status">Status</Label>
              <Select value={newAddon.status} onValueChange={(v: "draft" | "published" | "archived") => setNewAddon({ ...newAddon, status: v })}>
                <SelectTrigger className="col-span-3" data-testid="select-addon-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="addon-featured">Featured</Label>
              <Switch
                id="addon-featured"
                checked={newAddon.featured}
                onCheckedChange={(checked) => setNewAddon({ ...newAddon, featured: checked })}
                data-testid="switch-addon-featured"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddAddonOpen(false)}>Cancel</Button>
            <Button 
              onClick={() => createAddonMutation.mutate(newAddon)} 
              disabled={createAddonMutation.isPending || !newAddon.slug || !newAddon.name}
            >
              {createAddonMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Add-on
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Add-on Dialog */}
      <Dialog open={!!editingAddon} onOpenChange={(open) => !open && setEditingAddon(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Add-on</DialogTitle>
            <DialogDescription>Update add-on details</DialogDescription>
          </DialogHeader>
          {editingAddon && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label>Slug</Label>
                <Badge variant="outline" className="col-span-3 w-fit">{editingAddon.slug}</Badge>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-addon-name">Name</Label>
                <Input
                  id="edit-addon-name"
                  value={editingAddon.name}
                  onChange={(e) => setEditingAddon({ ...editingAddon, name: e.target.value })}
                  className="col-span-3"
                  data-testid="input-edit-addon-name"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-addon-category">Category</Label>
                <Select 
                  value={editingAddon.category} 
                  onValueChange={(v) => setEditingAddon({ ...editingAddon, category: v })}
                >
                  <SelectTrigger className="col-span-3" data-testid="select-edit-addon-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ADDON_CATEGORIES.map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-addon-short-desc">Short Description</Label>
                <Input
                  id="edit-addon-short-desc"
                  value={editingAddon.shortDescription || ""}
                  onChange={(e) => setEditingAddon({ ...editingAddon, shortDescription: e.target.value })}
                  className="col-span-3"
                  data-testid="input-edit-addon-short-desc"
                />
              </div>
              <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="edit-addon-full-desc" className="pt-2">Full Description</Label>
                <Textarea
                  id="edit-addon-full-desc"
                  value={editingAddon.fullDescription || ""}
                  onChange={(e) => setEditingAddon({ ...editingAddon, fullDescription: e.target.value })}
                  className="col-span-3 min-h-[100px]"
                  data-testid="input-edit-addon-full-desc"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-addon-countries">Countries</Label>
                <Input
                  id="edit-addon-countries"
                  value={editingAddon.supportedCountries?.join(", ") || ""}
                  onChange={(e) => setEditingAddon({ 
                    ...editingAddon, 
                    supportedCountries: e.target.value.split(",").map(s => s.trim().toUpperCase()).filter(Boolean)
                  })}
                  className="col-span-3"
                  placeholder="IN, MY, UK (empty = global)"
                  data-testid="input-edit-addon-countries"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-addon-tags">Tags</Label>
                <Input
                  id="edit-addon-tags"
                  value={editingAddon.tags?.join(", ") || ""}
                  onChange={(e) => setEditingAddon({ 
                    ...editingAddon, 
                    tags: e.target.value.split(",").map(s => s.trim().toLowerCase()).filter(Boolean)
                  })}
                  className="col-span-3"
                  data-testid="input-edit-addon-tags"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-addon-status">Status</Label>
                <Select 
                  value={editingAddon.status} 
                  onValueChange={(v: "draft" | "published" | "archived") => setEditingAddon({ ...editingAddon, status: v })}
                >
                  <SelectTrigger className="col-span-3" data-testid="select-edit-addon-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-addon-featured">Featured</Label>
                <Switch
                  id="edit-addon-featured"
                  checked={editingAddon.featured}
                  onCheckedChange={(checked) => setEditingAddon({ ...editingAddon, featured: checked })}
                  data-testid="switch-edit-addon-featured"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingAddon(null)}>Cancel</Button>
            <Button 
              onClick={() => editingAddon && updateAddonMutation.mutate({ 
                id: editingAddon.id, 
                data: {
                  name: editingAddon.name,
                  category: editingAddon.category,
                  shortDescription: editingAddon.shortDescription,
                  fullDescription: editingAddon.fullDescription,
                  supportedCountries: editingAddon.supportedCountries,
                  tags: editingAddon.tags,
                  status: editingAddon.status,
                  featured: editingAddon.featured,
                }
              })} 
              disabled={updateAddonMutation.isPending}
            >
              {updateAddonMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Add-on Dialog */}
      <Dialog open={!!viewingAddon} onOpenChange={(open) => !open && setViewingAddon(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{viewingAddon?.name}</DialogTitle>
            <DialogDescription>{viewingAddon?.slug}</DialogDescription>
          </DialogHeader>
          {viewingAddon && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant={viewingAddon.status === "published" ? "default" : "secondary"}>
                  {viewingAddon.status}
                </Badge>
                <Badge variant="outline">{viewingAddon.category}</Badge>
                {viewingAddon.featured && <Badge>Featured</Badge>}
                {viewingAddon.supportedCountries?.length > 0 ? (
                  viewingAddon.supportedCountries.map(c => (
                    <Badge key={c} variant="outline">{c}</Badge>
                  ))
                ) : (
                  <Badge variant="outline">Global</Badge>
                )}
              </div>

              <div>
                <h4 className="font-medium mb-1">Short Description</h4>
                <p className="text-sm text-muted-foreground">{viewingAddon.shortDescription || "No description"}</p>
              </div>

              <div>
                <h4 className="font-medium mb-1">Full Description</h4>
                <pre className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted p-3 rounded-md">
                  {viewingAddon.fullDescription || "No description"}
                </pre>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-1">Installs</h4>
                  <p className="text-sm">{viewingAddon.activeInstalls} active / {viewingAddon.totalInstalls} total</p>
                </div>
                <div>
                  <h4 className="font-medium mb-1">Rating</h4>
                  <p className="text-sm">{viewingAddon.averageRating} ({viewingAddon.reviewCount} reviews)</p>
                </div>
              </div>

              {viewingAddon.pricing?.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Pricing Tiers</h4>
                  <div className="space-y-2">
                    {viewingAddon.pricing.map(price => (
                      <div key={price.id} className="flex items-center justify-between p-2 bg-muted rounded-md">
                        <div>
                          <p className="font-medium">{price.name}</p>
                          <p className="text-xs text-muted-foreground">{price.pricingType}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">{price.currency} {price.price}</p>
                          {price.trialDays && <p className="text-xs text-muted-foreground">{price.trialDays} day trial</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {viewingAddon.tags?.length > 0 && (
                <div>
                  <h4 className="font-medium mb-1">Tags</h4>
                  <div className="flex flex-wrap gap-1">
                    {viewingAddon.tags.map(tag => (
                      <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewingAddon(null)}>Close</Button>
            <Button onClick={() => { setEditingAddon(viewingAddon); setViewingAddon(null); }}>
              <Edit2 className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
