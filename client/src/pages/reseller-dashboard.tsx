import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Building2, 
  Users, 
  DollarSign, 
  HeadphonesIcon,
  Plus,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Mail,
  Phone,
  Globe,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  AlertCircle,
  CheckCircle2,
  Clock,
  Loader2,
  MoreVertical,
  ExternalLink,
} from "lucide-react";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

const createTenantSchema = z.object({
  name: z.string().min(2, "Business name must be at least 2 characters"),
  businessType: z.string().min(1, "Please select a business type"),
  email: z.string().email("Please enter a valid email").optional().or(z.literal("")),
  phone: z.string().optional(),
  country: z.string().optional(),
  currency: z.string().optional(),
  timezone: z.string().optional(),
});

type CreateTenantForm = z.infer<typeof createTenantSchema>;

const businessTypes = [
  { value: "service", label: "General Service" },
  { value: "salon", label: "Salon / Spa" },
  { value: "clinic", label: "Clinic / Healthcare" },
  { value: "pg", label: "PG / Hostel" },
  { value: "education", label: "Coaching / Education" },
  { value: "coworking", label: "Co-working Space" },
  { value: "real_estate", label: "Real Estate" },
  { value: "tourism", label: "Tourism / Travel" },
  { value: "logistics", label: "Logistics" },
  { value: "legal", label: "Legal Services" },
];

interface ResellerProfile {
  id: string;
  tenantId: string;
  status: string;
  brandName: string;
  brandTagline?: string;
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  customDomain?: string;
  subdomainPrefix?: string;
  maxChildTenants?: number;
  allowedBusinessTypes?: string[];
  supportEmail?: string;
  supportPhone?: string;
}

interface ChildTenant {
  id: string;
  name: string;
  slug: string;
  businessType: string;
  status?: string;
  createdAt: string;
  subscriptionTier?: string;
}

interface RevenueRecord {
  id: string;
  periodStart: string;
  periodEnd: string;
  totalRevenue: string;
  resellerShare: string;
  status: string;
  calculatedAt: string;
}

interface RevenueAgreement {
  id: string;
  agreementName: string;
  revenueShareType: string;
  baseSharePercentage?: string;
  tieredRates?: { minRevenue: number; maxRevenue: number; percentage: number }[];
  fixedAmount?: string;
  billingCadence: string;
  isActive: boolean;
}

export default function ResellerDashboard() {
  const { toast } = useToast();
  const [createTenantOpen, setCreateTenantOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  const { data: authUser } = useQuery<{ tenant?: { id: string } }>({
    queryKey: ["/api/auth"],
  });

  const resellerId = authUser?.tenant?.id;

  const { data: profile, isLoading: profileLoading } = useQuery<ResellerProfile>({
    queryKey: ["/api/resellers/profiles", resellerId],
    enabled: !!resellerId,
  });

  const { data: childTenants = [], isLoading: tenantsLoading } = useQuery<ChildTenant[]>({
    queryKey: ["/api/resellers", resellerId, "tenants"],
    enabled: !!resellerId,
  });

  const { data: revenueRecords = [], isLoading: revenueLoading } = useQuery<RevenueRecord[]>({
    queryKey: ["/api/resellers", resellerId, "revenue-records"],
    enabled: !!resellerId,
  });

  const { data: revenueAgreement } = useQuery<RevenueAgreement>({
    queryKey: ["/api/resellers", resellerId, "revenue-agreements", "active"],
    enabled: !!resellerId,
  });

  const createTenantForm = useForm<CreateTenantForm>({
    resolver: zodResolver(createTenantSchema),
    defaultValues: {
      name: "",
      businessType: "",
      email: "",
      phone: "",
      country: "",
      currency: "USD",
      timezone: "UTC",
    },
  });

  const createTenantMutation = useMutation({
    mutationFn: async (data: CreateTenantForm) => {
      return apiRequest("POST", `/api/resellers/${resellerId}/tenants`, data);
    },
    onSuccess: () => {
      toast({ title: "Tenant created successfully" });
      setCreateTenantOpen(false);
      createTenantForm.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/resellers", resellerId, "tenants"] });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create tenant", description: error.message, variant: "destructive" });
    },
  });

  const totalRevenue = revenueRecords.reduce((sum, r) => sum + parseFloat(r.totalRevenue || "0"), 0);
  const totalShare = revenueRecords.reduce((sum, r) => sum + parseFloat(r.resellerShare || "0"), 0);
  const activeTenants = childTenants.filter(t => t.status !== "suspended").length;

  const currentMonthRevenue = revenueRecords.find(r => {
    const periodStart = new Date(r.periodStart);
    const now = new Date();
    return periodStart.getMonth() === now.getMonth() && periodStart.getFullYear() === now.getFullYear();
  });

  const lastMonthRevenue = revenueRecords.find(r => {
    const periodStart = new Date(r.periodStart);
    const lastMonth = subMonths(new Date(), 1);
    return periodStart.getMonth() === lastMonth.getMonth() && periodStart.getFullYear() === lastMonth.getFullYear();
  });

  const revenueGrowth = lastMonthRevenue && currentMonthRevenue
    ? ((parseFloat(currentMonthRevenue.resellerShare) - parseFloat(lastMonthRevenue.resellerShare)) / parseFloat(lastMonthRevenue.resellerShare)) * 100
    : 0;

  if (!resellerId) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-destructive" />
              Access Denied
            </CardTitle>
            <CardDescription>
              You need to be logged in with a reseller account to access this dashboard.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (profileLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <header className="border-b bg-background">
        <div className="flex items-center justify-between gap-4 px-6 py-4">
          <div>
            <h1 className="text-2xl font-semibold" data-testid="text-dashboard-title">
              {profile?.brandName || "Reseller"} Dashboard
            </h1>
            <p className="text-sm text-muted-foreground">
              Manage your tenants, revenue, and support
            </p>
          </div>
          <div className="flex items-center gap-2">
            {profile?.customDomain && (
              <Badge variant="outline" className="gap-1">
                <Globe className="w-3 h-3" />
                {profile.customDomain}
              </Badge>
            )}
            <Badge variant={profile?.status === "active" ? "default" : "secondary"}>
              {profile?.status || "pending"}
            </Badge>
          </div>
        </div>
      </header>

      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4 max-w-lg">
              <TabsTrigger value="overview" data-testid="tab-overview">
                <BarChart3 className="w-4 h-4 mr-2" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="tenants" data-testid="tab-tenants">
                <Building2 className="w-4 h-4 mr-2" />
                Tenants
              </TabsTrigger>
              <TabsTrigger value="revenue" data-testid="tab-revenue">
                <DollarSign className="w-4 h-4 mr-2" />
                Revenue
              </TabsTrigger>
              <TabsTrigger value="support" data-testid="tab-support">
                <HeadphonesIcon className="w-4 h-4 mr-2" />
                Support
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-6 space-y-6">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                    <CardTitle className="text-sm font-medium">Total Tenants</CardTitle>
                    <Building2 className="w-4 h-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="text-total-tenants">{childTenants.length}</div>
                    <p className="text-xs text-muted-foreground">
                      {activeTenants} active
                      {profile?.maxChildTenants && ` / ${profile.maxChildTenants} max`}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                    <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
                    <DollarSign className="w-4 h-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="text-monthly-revenue">
                      ${parseFloat(currentMonthRevenue?.resellerShare || "0").toLocaleString()}
                    </div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      {revenueGrowth >= 0 ? (
                        <>
                          <ArrowUpRight className="w-3 h-3 text-green-500" />
                          <span className="text-green-500">+{revenueGrowth.toFixed(1)}%</span>
                        </>
                      ) : (
                        <>
                          <ArrowDownRight className="w-3 h-3 text-red-500" />
                          <span className="text-red-500">{revenueGrowth.toFixed(1)}%</span>
                        </>
                      )}
                      vs last month
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                    <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
                    <TrendingUp className="w-4 h-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="text-total-earnings">
                      ${totalShare.toLocaleString()}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      From ${totalRevenue.toLocaleString()} total revenue
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                    <CardTitle className="text-sm font-medium">Revenue Share</CardTitle>
                    <BarChart3 className="w-4 h-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="text-revenue-share">
                      {revenueAgreement?.baseSharePercentage || "0"}%
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {revenueAgreement?.revenueShareType || "percentage"} model
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Recent Tenants</CardTitle>
                    <CardDescription>Latest businesses onboarded</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {tenantsLoading ? (
                      <div className="flex justify-center py-4">
                        <Loader2 className="w-5 h-5 animate-spin" />
                      </div>
                    ) : childTenants.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Building2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p>No tenants yet</p>
                        <Button 
                          variant="ghost" 
                          onClick={() => setCreateTenantOpen(true)}
                          data-testid="button-create-first-tenant"
                        >
                          Create your first tenant
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {childTenants.slice(0, 5).map((tenant) => (
                          <div 
                            key={tenant.id} 
                            className="flex items-center justify-between p-3 rounded-md bg-muted/50"
                            data-testid={`card-tenant-${tenant.id}`}
                          >
                            <div>
                              <p className="font-medium">{tenant.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {businessTypes.find(b => b.value === tenant.businessType)?.label || tenant.businessType}
                              </p>
                            </div>
                            <Badge variant="outline">
                              {format(new Date(tenant.createdAt), "MMM d")}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Revenue History</CardTitle>
                    <CardDescription>Monthly earnings breakdown</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {revenueLoading ? (
                      <div className="flex justify-center py-4">
                        <Loader2 className="w-5 h-5 animate-spin" />
                      </div>
                    ) : revenueRecords.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <DollarSign className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p>No revenue records yet</p>
                        <p className="text-sm">Revenue will appear once tenants are active</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {revenueRecords.slice(0, 5).map((record) => (
                          <div 
                            key={record.id} 
                            className="flex items-center justify-between p-3 rounded-md bg-muted/50"
                            data-testid={`card-revenue-${record.id}`}
                          >
                            <div>
                              <p className="font-medium">
                                {format(new Date(record.periodStart), "MMMM yyyy")}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Total: ${parseFloat(record.totalRevenue).toLocaleString()}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-green-600">
                                +${parseFloat(record.resellerShare).toLocaleString()}
                              </p>
                              <Badge variant="outline">
                                {record.status}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="tenants" className="mt-6 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Manage Tenants</h2>
                  <p className="text-sm text-muted-foreground">
                    Create and manage businesses under your reseller account
                  </p>
                </div>
                <Dialog open={createTenantOpen} onOpenChange={setCreateTenantOpen}>
                  <DialogTrigger asChild>
                    <Button data-testid="button-create-tenant">
                      <Plus className="w-4 h-4 mr-2" />
                      Create Tenant
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Create New Tenant</DialogTitle>
                      <DialogDescription>
                        Add a new business to your reseller network
                      </DialogDescription>
                    </DialogHeader>
                    <Form {...createTenantForm}>
                      <form 
                        onSubmit={createTenantForm.handleSubmit((data) => createTenantMutation.mutate(data))}
                        className="space-y-4"
                      >
                        <FormField
                          control={createTenantForm.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Business Name</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="Acme Salon" 
                                  {...field} 
                                  data-testid="input-tenant-name"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={createTenantForm.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Contact Email</FormLabel>
                              <FormControl>
                                <Input 
                                  type="email"
                                  placeholder="contact@business.com" 
                                  {...field} 
                                  data-testid="input-tenant-email"
                                />
                              </FormControl>
                              <FormDescription>
                                Primary contact email for the business
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={createTenantForm.control}
                          name="businessType"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Business Type</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-business-type">
                                    <SelectValue placeholder="Select type" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {businessTypes
                                    .filter(bt => !profile?.allowedBusinessTypes?.length || profile.allowedBusinessTypes.includes(bt.value))
                                    .map((bt) => (
                                      <SelectItem key={bt.value} value={bt.value}>
                                        {bt.label}
                                      </SelectItem>
                                    ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={createTenantForm.control}
                          name="phone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Contact Phone</FormLabel>
                              <FormControl>
                                <Input 
                                  type="tel"
                                  placeholder="+1 555 123 4567" 
                                  {...field} 
                                  data-testid="input-tenant-phone"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={createTenantForm.control}
                          name="country"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Country</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-country">
                                    <SelectValue placeholder="Select country" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="US">United States</SelectItem>
                                  <SelectItem value="IN">India</SelectItem>
                                  <SelectItem value="GB">United Kingdom</SelectItem>
                                  <SelectItem value="SG">Singapore</SelectItem>
                                  <SelectItem value="AE">United Arab Emirates</SelectItem>
                                  <SelectItem value="AU">Australia</SelectItem>
                                  <SelectItem value="CA">Canada</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="flex justify-end gap-2 pt-4">
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => setCreateTenantOpen(false)}
                          >
                            Cancel
                          </Button>
                          <Button 
                            type="submit" 
                            disabled={createTenantMutation.isPending}
                            data-testid="button-submit-create-tenant"
                          >
                            {createTenantMutation.isPending && (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            )}
                            Create Tenant
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>

              {tenantsLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin" />
                </div>
              ) : childTenants.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Building2 className="w-12 h-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium">No tenants yet</h3>
                    <p className="text-muted-foreground text-center max-w-sm mt-1">
                      Start building your reseller network by creating your first tenant business.
                    </p>
                    <Button 
                      className="mt-4" 
                      onClick={() => setCreateTenantOpen(true)}
                      data-testid="button-create-tenant-empty"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Create First Tenant
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {childTenants.map((tenant) => (
                    <Card key={tenant.id} data-testid={`card-tenant-detail-${tenant.id}`}>
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <CardTitle className="text-base">{tenant.name}</CardTitle>
                            <CardDescription>{tenant.slug}</CardDescription>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" data-testid={`button-tenant-menu-${tenant.id}`}>
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>
                                <ExternalLink className="w-4 h-4 mr-2" />
                                Open Dashboard
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Users className="w-4 h-4 mr-2" />
                                Manage Users
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive">
                                Suspend Tenant
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center gap-2 text-sm">
                          <Badge variant="secondary">
                            {businessTypes.find(b => b.value === tenant.businessType)?.label || tenant.businessType}
                          </Badge>
                          <Badge variant={tenant.status === "suspended" ? "destructive" : "outline"}>
                            {tenant.status || "active"}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="w-4 h-4" />
                          Created {format(new Date(tenant.createdAt), "MMM d, yyyy")}
                        </div>
                        {tenant.subscriptionTier && (
                          <Badge variant="default" className="bg-primary/10 text-primary border-primary/20">
                            {tenant.subscriptionTier}
                          </Badge>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="revenue" className="mt-6 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Revenue Reports</h2>
                  <p className="text-sm text-muted-foreground">
                    Track your earnings and revenue share
                  </p>
                </div>
              </div>

              {revenueAgreement && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Revenue Agreement</CardTitle>
                    <CardDescription>{revenueAgreement.agreementName}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-3">
                      <div>
                        <p className="text-sm text-muted-foreground">Share Type</p>
                        <p className="font-medium capitalize">{revenueAgreement.revenueShareType}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Share Rate</p>
                        <p className="font-medium">
                          {revenueAgreement.revenueShareType === "percentage" 
                            ? `${revenueAgreement.baseSharePercentage}%`
                            : revenueAgreement.revenueShareType === "fixed"
                            ? `$${revenueAgreement.fixedAmount}`
                            : "Tiered"}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Billing Cycle</p>
                        <p className="font-medium capitalize">{revenueAgreement.billingCadence}</p>
                      </div>
                    </div>
                    {revenueAgreement.revenueShareType === "tiered" && revenueAgreement.tieredRates && (
                      <div className="mt-4 pt-4 border-t">
                        <p className="text-sm font-medium mb-2">Tiered Rates</p>
                        <div className="space-y-2">
                          {revenueAgreement.tieredRates.map((tier, idx) => (
                            <div key={idx} className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">
                                ${tier.minRevenue.toLocaleString()} - ${tier.maxRevenue.toLocaleString()}
                              </span>
                              <Badge variant="outline">{tier.percentage}%</Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {revenueLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin" />
                </div>
              ) : revenueRecords.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <DollarSign className="w-12 h-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium">No revenue records</h3>
                    <p className="text-muted-foreground text-center max-w-sm mt-1">
                      Revenue records will appear once your tenants generate revenue.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Revenue History</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {revenueRecords.map((record) => (
                        <div 
                          key={record.id} 
                          className="flex items-center justify-between p-4 border rounded-lg"
                          data-testid={`row-revenue-${record.id}`}
                        >
                          <div className="space-y-1">
                            <p className="font-medium">
                              {format(new Date(record.periodStart), "MMMM yyyy")}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(record.periodStart), "MMM d")} - {format(new Date(record.periodEnd), "MMM d, yyyy")}
                            </p>
                          </div>
                          <div className="text-center">
                            <p className="text-sm text-muted-foreground">Total Revenue</p>
                            <p className="font-medium">${parseFloat(record.totalRevenue).toLocaleString()}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-sm text-muted-foreground">Your Share</p>
                            <p className="font-semibold text-green-600">
                              +${parseFloat(record.resellerShare).toLocaleString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge 
                              variant={record.status === "paid" ? "default" : record.status === "pending" ? "secondary" : "outline"}
                            >
                              {record.status === "paid" && <CheckCircle2 className="w-3 h-3 mr-1" />}
                              {record.status === "pending" && <Clock className="w-3 h-3 mr-1" />}
                              {record.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="support" className="mt-6 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Support Controls</h2>
                  <p className="text-sm text-muted-foreground">
                    Configure support options for your tenants
                  </p>
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Support Contact Information</CardTitle>
                    <CardDescription>
                      How your tenants can reach you for support
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-3 p-3 rounded-md bg-muted/50">
                      <Mail className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Support Email</p>
                        <p className="font-medium">{profile?.supportEmail || "Not configured"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-md bg-muted/50">
                      <Phone className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Support Phone</p>
                        <p className="font-medium">{profile?.supportPhone || "Not configured"}</p>
                      </div>
                    </div>
                    <Button variant="outline" className="w-full" data-testid="button-update-support-info">
                      Update Support Information
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Tenant Support Overview</CardTitle>
                    <CardDescription>
                      Quick view of tenant support status
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 rounded-md bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900">
                        <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                          <CheckCircle2 className="w-5 h-5" />
                          <span className="text-2xl font-bold">{activeTenants}</span>
                        </div>
                        <p className="text-sm text-green-600 dark:text-green-500 mt-1">Active Tenants</p>
                      </div>
                      <div className="p-4 rounded-md bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-900">
                        <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400">
                          <AlertCircle className="w-5 h-5" />
                          <span className="text-2xl font-bold">
                            {childTenants.filter(t => t.status === "suspended").length}
                          </span>
                        </div>
                        <p className="text-sm text-yellow-600 dark:text-yellow-500 mt-1">Suspended</p>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <p className="text-sm font-medium">Quick Actions</p>
                      <div className="grid grid-cols-2 gap-2">
                        <Button variant="outline" size="sm" data-testid="button-view-tickets">
                          View Support Tickets
                        </Button>
                        <Button variant="outline" size="sm" data-testid="button-send-announcement">
                          Send Announcement
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="md:col-span-2">
                  <CardHeader>
                    <CardTitle className="text-base">Recent Support Activity</CardTitle>
                    <CardDescription>
                      Latest interactions with your tenants
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8 text-muted-foreground">
                      <HeadphonesIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No recent support activity</p>
                      <p className="text-sm">Support tickets and interactions will appear here</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </ScrollArea>
    </div>
  );
}
