import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  CreditCard,
  Globe,
  Package,
  Users,
  Plus,
  Edit,
  Trash2,
  Check,
  X,
  DollarSign,
} from "lucide-react";

interface PricingPlan {
  id: string;
  code: string;
  name: string;
  description: string | null;
  tier: string;
  billingCycle: string;
  basePrice: string;
  maxUsers: number;
  maxCustomers: number;
  features: Record<string, unknown>;
  isActive: boolean;
  sortOrder: number;
}

interface ModuleAccess {
  moduleId: string;
  access: "included" | "addon" | "unavailable";
}

interface CountryPricing {
  id: string;
  country: string;
  currency: string;
  taxName: string;
  taxRate: string;
  primaryGateway: string;
  fallbackGateway: string | null;
  exchangeRate: string;
  isActive: boolean;
}

function TierBadge({ tier }: { tier: string }) {
  const variants: Record<string, string> = {
    free: "bg-gray-100 text-gray-800",
    starter: "bg-blue-100 text-blue-800",
    pro: "bg-purple-100 text-purple-800",
    enterprise: "bg-amber-100 text-amber-800",
  };

  return (
    <Badge className={variants[tier] || variants.free} data-testid={`badge-tier-${tier}`}>
      {tier.charAt(0).toUpperCase() + tier.slice(1)}
    </Badge>
  );
}

function AccessBadge({ access }: { access: string }) {
  if (access === "included") {
    return <Badge variant="default" className="bg-green-600"><Check className="w-3 h-3" /></Badge>;
  }
  if (access === "addon") {
    return <Badge variant="secondary"><DollarSign className="w-3 h-3" /></Badge>;
  }
  return <Badge variant="outline"><X className="w-3 h-3" /></Badge>;
}

function PlansTab() {
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newPlan, setNewPlan] = useState({
    code: "",
    name: "",
    description: "",
    tier: "starter",
    basePrice: "0",
    maxUsers: 5,
    maxCustomers: 100,
  });

  const { data, isLoading } = useQuery<{ plans: Array<PricingPlan & { moduleAccess: ModuleAccess[] }> }>({
    queryKey: ["/api/subscriptions/plans"],
  });

  const createMutation = useMutation({
    mutationFn: async (plan: typeof newPlan) => {
      return apiRequest("POST", "/api/subscriptions/admin/plans", plan);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscriptions/plans"] });
      setIsCreateOpen(false);
      setNewPlan({ code: "", name: "", description: "", tier: "starter", basePrice: "0", maxUsers: 5, maxCustomers: 100 });
      toast({ title: "Plan created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create plan", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (planId: string) => {
      return apiRequest("DELETE", `/api/subscriptions/admin/plans/${planId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscriptions/plans"] });
      toast({ title: "Plan deactivated" });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold">Subscription Plans</h2>
          <p className="text-sm text-muted-foreground">Manage pricing tiers and features</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-plan">
              <Plus className="w-4 h-4 mr-2" /> Create Plan
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Plan</DialogTitle>
              <DialogDescription>Add a new subscription plan</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Code</Label>
                  <Input
                    value={newPlan.code}
                    onChange={(e) => setNewPlan({ ...newPlan, code: e.target.value })}
                    placeholder="plan_pro"
                    data-testid="input-plan-code"
                  />
                </div>
                <div>
                  <Label>Name</Label>
                  <Input
                    value={newPlan.name}
                    onChange={(e) => setNewPlan({ ...newPlan, name: e.target.value })}
                    placeholder="Professional Plan"
                    data-testid="input-plan-name"
                  />
                </div>
              </div>
              <div>
                <Label>Description</Label>
                <Input
                  value={newPlan.description}
                  onChange={(e) => setNewPlan({ ...newPlan, description: e.target.value })}
                  placeholder="Best for growing businesses"
                  data-testid="input-plan-description"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Tier</Label>
                  <Select value={newPlan.tier} onValueChange={(v) => setNewPlan({ ...newPlan, tier: v })}>
                    <SelectTrigger data-testid="select-plan-tier">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="free">Free</SelectItem>
                      <SelectItem value="starter">Starter</SelectItem>
                      <SelectItem value="pro">Pro</SelectItem>
                      <SelectItem value="enterprise">Enterprise</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Base Price (USD)</Label>
                  <Input
                    type="number"
                    value={newPlan.basePrice}
                    onChange={(e) => setNewPlan({ ...newPlan, basePrice: e.target.value })}
                    data-testid="input-plan-price"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Max Users</Label>
                  <Input
                    type="number"
                    value={newPlan.maxUsers}
                    onChange={(e) => setNewPlan({ ...newPlan, maxUsers: parseInt(e.target.value) || 0 })}
                    data-testid="input-plan-max-users"
                  />
                </div>
                <div>
                  <Label>Max Customers</Label>
                  <Input
                    type="number"
                    value={newPlan.maxCustomers}
                    onChange={(e) => setNewPlan({ ...newPlan, maxCustomers: parseInt(e.target.value) || 0 })}
                    data-testid="input-plan-max-customers"
                  />
                </div>
              </div>
              <Button onClick={() => createMutation.mutate(newPlan)} disabled={createMutation.isPending} className="w-full" data-testid="button-submit-plan">
                {createMutation.isPending ? "Creating..." : "Create Plan"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-center py-8">Loading plans...</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {data?.plans.map((plan) => (
            <Card key={plan.id} data-testid={`card-plan-${plan.code}`}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{plan.name}</CardTitle>
                    <CardDescription>{plan.description}</CardDescription>
                  </div>
                  <TierBadge tier={plan.tier} />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-3xl font-bold">
                  ${plan.basePrice}
                  <span className="text-sm font-normal text-muted-foreground">/month</span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Max Users</span>
                    <span>{plan.maxUsers === -1 ? "Unlimited" : plan.maxUsers}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Max Customers</span>
                    <span>{plan.maxCustomers === -1 ? "Unlimited" : plan.maxCustomers}</span>
                  </div>
                </div>
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground mb-2">Module Access</p>
                  <div className="flex flex-wrap gap-1">
                    {plan.moduleAccess?.slice(0, 6).map((ma) => (
                      <div key={ma.moduleId} className="flex items-center gap-1" title={ma.moduleId}>
                        <AccessBadge access={ma.access} />
                      </div>
                    ))}
                    {(plan.moduleAccess?.length || 0) > 6 && (
                      <Badge variant="outline">+{(plan.moduleAccess?.length || 0) - 6}</Badge>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" className="flex-1" data-testid={`button-edit-plan-${plan.code}`}>
                    <Edit className="w-3 h-3 mr-1" /> Edit
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => deleteMutation.mutate(plan.id)}
                    data-testid={`button-delete-plan-${plan.code}`}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function CountryPricingTab() {
  const { toast } = useToast();

  const { data, isLoading } = useQuery<{ configs: CountryPricing[] }>({
    queryKey: ["/api/subscriptions/admin/country-pricing"],
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold">Country Pricing</h2>
          <p className="text-sm text-muted-foreground">Configure local currency pricing and tax rates</p>
        </div>
        <Button data-testid="button-add-country">
          <Plus className="w-4 h-4 mr-2" /> Add Country
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-8">Loading country pricing...</div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Country</TableHead>
              <TableHead>Currency</TableHead>
              <TableHead>Tax</TableHead>
              <TableHead>Exchange Rate</TableHead>
              <TableHead>Gateway</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.configs.map((config) => (
              <TableRow key={config.id} data-testid={`row-country-${config.country}`}>
                <TableCell className="font-medium capitalize">{config.country.replace("_", " ")}</TableCell>
                <TableCell>{config.currency}</TableCell>
                <TableCell>{config.taxName} ({config.taxRate}%)</TableCell>
                <TableCell>{config.exchangeRate}</TableCell>
                <TableCell className="capitalize">{config.primaryGateway}</TableCell>
                <TableCell>
                  <Badge variant={config.isActive ? "default" : "secondary"}>
                    {config.isActive ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm" data-testid={`button-edit-country-${config.country}`}>
                    <Edit className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {(!data?.configs || data.configs.length === 0) && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  No country pricing configured. Add your first country to get started.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

function OverviewTab() {
  const { data: plansData } = useQuery<{ plans: PricingPlan[] }>({
    queryKey: ["/api/subscriptions/plans"],
  });

  const { data: countryData } = useQuery<{ configs: CountryPricing[] }>({
    queryKey: ["/api/subscriptions/admin/country-pricing"],
  });

  const activePlans = plansData?.plans.filter(p => p.isActive).length || 0;
  const activeCountries = countryData?.configs.filter(c => c.isActive).length || 0;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Plans</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-active-plans">{activePlans}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Countries</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-countries">{activeCountries}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Modules</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-modules">12</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tiers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-tiers">4</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Module Access Matrix</CardTitle>
          <CardDescription>Feature availability by subscription tier</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Module</TableHead>
                <TableHead className="text-center">Free</TableHead>
                <TableHead className="text-center">Starter</TableHead>
                <TableHead className="text-center">Pro</TableHead>
                <TableHead className="text-center">Enterprise</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[
                { name: "Furniture", free: "unavailable", starter: "addon", pro: "included", enterprise: "included" },
                { name: "HRMS", free: "unavailable", starter: "included", pro: "included", enterprise: "included" },
                { name: "Legal", free: "unavailable", starter: "addon", pro: "included", enterprise: "included" },
                { name: "Education", free: "unavailable", starter: "addon", pro: "included", enterprise: "included" },
                { name: "Tourism", free: "unavailable", starter: "addon", pro: "included", enterprise: "included" },
                { name: "Logistics", free: "unavailable", starter: "addon", pro: "included", enterprise: "included" },
                { name: "Real Estate", free: "unavailable", starter: "addon", pro: "included", enterprise: "included" },
                { name: "PG/Hostel", free: "included", starter: "included", pro: "included", enterprise: "included" },
                { name: "Coworking", free: "included", starter: "included", pro: "included", enterprise: "included" },
                { name: "Clinic", free: "unavailable", starter: "unavailable", pro: "addon", enterprise: "included" },
                { name: "Salon", free: "included", starter: "included", pro: "included", enterprise: "included" },
                { name: "Gym", free: "included", starter: "included", pro: "included", enterprise: "included" },
              ].map((module) => (
                <TableRow key={module.name}>
                  <TableCell className="font-medium">{module.name}</TableCell>
                  <TableCell className="text-center"><AccessBadge access={module.free} /></TableCell>
                  <TableCell className="text-center"><AccessBadge access={module.starter} /></TableCell>
                  <TableCell className="text-center"><AccessBadge access={module.pro} /></TableCell>
                  <TableCell className="text-center"><AccessBadge access={module.enterprise} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export default function SubscriptionManagement() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-page-title">Subscription Management</h1>
        <p className="text-muted-foreground">Manage subscription plans, pricing, and module access</p>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
          <TabsTrigger value="plans" data-testid="tab-plans">Plans</TabsTrigger>
          <TabsTrigger value="countries" data-testid="tab-countries">Country Pricing</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="mt-6">
          <OverviewTab />
        </TabsContent>
        <TabsContent value="plans" className="mt-6">
          <PlansTab />
        </TabsContent>
        <TabsContent value="countries" className="mt-6">
          <CountryPricingTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
