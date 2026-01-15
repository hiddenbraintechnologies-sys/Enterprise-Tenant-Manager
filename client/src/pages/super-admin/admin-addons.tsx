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
import { useToast } from "@/hooks/use-toast";
import { 
  Plus, Edit2, Trash2, Users, Calculator, DollarSign, 
  TrendingUp, CheckCircle, XCircle, Loader2, Save, RefreshCw
} from "lucide-react";
import { cn } from "@/lib/utils";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
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

export default function AdminAddons() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingTier, setEditingTier] = useState<PayrollTier | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<string>("all");

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

  const createTierMutation = useMutation({
    mutationFn: async (data: typeof newTier) => {
      const response = await apiRequest("POST", "/api/admin/addons/payroll/tiers", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/addons/payroll/tiers"] });
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
      queryClient.invalidateQueries({ queryKey: ["/api/admin/addons/payroll/tiers"] });
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
      queryClient.invalidateQueries({ queryKey: ["/api/admin/addons/payroll/tiers"] });
      toast({ title: "Tier deleted", description: "The payroll tier has been deleted successfully." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

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

  const handleCreateTier = () => {
    createTierMutation.mutate(newTier);
  };

  const handleUpdateTier = () => {
    if (!editingTier) return;
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

      <Tabs defaultValue="tiers" className="space-y-4">
        <TabsList>
          <TabsTrigger value="tiers" data-testid="tab-tiers">Payroll Tiers</TabsTrigger>
          <TabsTrigger value="subscriptions" data-testid="tab-subscriptions">Subscriptions</TabsTrigger>
        </TabsList>

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
    </div>
  );
}
