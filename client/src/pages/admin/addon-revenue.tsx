import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Briefcase, IndianRupee, TrendingUp, TrendingDown,
  Users, Percent, RefreshCcw, Globe, BarChart3,
  AlertTriangle, ArrowUpRight, ArrowDownRight
} from "lucide-react";
import { useState } from "react";

interface SubscriptionStats {
  free: number;
  basic: number;
  pro: number;
  total: number;
}

interface AddonStats {
  payroll: {
    enabled: number;
    trial: number;
    paid: number;
  };
  whatsapp: {
    enabled: number;
  };
}

interface MRRBreakdown {
  basePlans: number;
  payrollAddon: number;
  otherAddons: number;
  total: number;
}

interface AdoptionMetrics {
  payrollAdoptionPercent: number;
  avgEmployeesPerTenant: number;
  trialToPaidConversionPercent: number;
}

interface ChurnMetrics {
  payrollDisabledThisMonth: number;
  planDowngrades: number;
  upgradeFunnelDropoffs: number;
}

interface CountryRevenue {
  country: string;
  revenue: number;
  status: "live" | "coming_soon";
}

interface RevenueAnalyticsData {
  subscriptions: SubscriptionStats;
  addons: AddonStats;
  mrr: MRRBreakdown;
  adoption: AdoptionMetrics;
  churn: ChurnMetrics;
  countryRevenue: CountryRevenue[];
}

function StatCard({ 
  title, 
  value, 
  description, 
  icon: Icon, 
  trend,
  trendValue 
}: { 
  title: string; 
  value: string | number; 
  description?: string;
  icon: React.ElementType;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
}) {
  return (
    <Card data-testid={`stat-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
        {trend && trendValue && (
          <div className={`flex items-center text-xs mt-2 ${
            trend === "up" ? "text-green-600" : 
            trend === "down" ? "text-red-600" : 
            "text-muted-foreground"
          }`}>
            {trend === "up" ? <ArrowUpRight className="h-3 w-3 mr-1" /> : 
             trend === "down" ? <ArrowDownRight className="h-3 w-3 mr-1" /> : null}
            {trendValue}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MRRTable({ mrr }: { mrr: MRRBreakdown }) {
  const rows = [
    { source: "Base Plans", amount: mrr.basePlans },
    { source: "Payroll Add-On", amount: mrr.payrollAddon },
    { source: "Other Add-Ons", amount: mrr.otherAddons },
  ];

  return (
    <Card data-testid="card-mrr-breakdown">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <IndianRupee className="h-5 w-5" />
          MRR Breakdown
        </CardTitle>
        <CardDescription>Monthly recurring revenue by source</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {rows.map((row) => (
            <div key={row.source} className="flex items-center justify-between">
              <span className="text-sm">{row.source}</span>
              <span className="font-medium">₹{row.amount.toLocaleString()}</span>
            </div>
          ))}
          <div className="border-t pt-4 flex items-center justify-between font-bold">
            <span>Total MRR</span>
            <span className="text-lg">₹{mrr.total.toLocaleString()}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CountryRevenueCard({ countries }: { countries: CountryRevenue[] }) {
  return (
    <Card data-testid="card-country-revenue">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5" />
          Country-wise Revenue
        </CardTitle>
        <CardDescription>Revenue breakdown by region</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {countries.map((country) => (
            <div key={country.country} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm">{country.country}</span>
                {country.status === "coming_soon" && (
                  <Badge variant="secondary" className="text-xs">Coming Soon</Badge>
                )}
              </div>
              {country.status === "live" ? (
                <span className="font-medium">₹{country.revenue.toLocaleString()}</span>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function AddonRevenuePage() {
  const [dateRange, setDateRange] = useState("30d");
  const [countryFilter, setCountryFilter] = useState("all");

  const { data, isLoading } = useQuery<RevenueAnalyticsData>({
    queryKey: ["/api/admin/analytics/addon-revenue", { dateRange, country: countryFilter }],
  });

  const mockData: RevenueAnalyticsData = {
    subscriptions: { free: 45, basic: 28, pro: 12, total: 85 },
    addons: {
      payroll: { enabled: 18, trial: 5, paid: 13 },
      whatsapp: { enabled: 8 }
    },
    mrr: { basePlans: 8500, payrollAddon: 3200, otherAddons: 800, total: 12500 },
    adoption: {
      payrollAdoptionPercent: 21,
      avgEmployeesPerTenant: 12,
      trialToPaidConversionPercent: 72
    },
    churn: {
      payrollDisabledThisMonth: 2,
      planDowngrades: 3,
      upgradeFunnelDropoffs: 8
    },
    countryRevenue: [
      { country: "India", revenue: 12500, status: "live" },
      { country: "UAE", revenue: 0, status: "coming_soon" },
      { country: "UK", revenue: 0, status: "coming_soon" }
    ]
  };

  const analytics = data || mockData;

  if (isLoading) {
    return (
      <DashboardLayout title="Add-On Revenue Analytics">
        <div className="p-6 space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-16" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Add-On Revenue Analytics">
      <div className="p-6 space-y-6" data-testid="page-addon-revenue">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="heading-analytics">
              <BarChart3 className="h-6 w-6" />
              Add-On Revenue Analytics
            </h1>
            <p className="text-muted-foreground mt-1">
              Monitor subscriptions, add-ons, and revenue metrics
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-32" data-testid="select-date-range">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
              </SelectContent>
            </Select>

            <Select value={countryFilter} onValueChange={setCountryFilter}>
              <SelectTrigger className="w-32" data-testid="select-country">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Countries</SelectItem>
                <SelectItem value="india">India</SelectItem>
                <SelectItem value="uae">UAE</SelectItem>
                <SelectItem value="uk">UK</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList data-testid="tabs-analytics">
            <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
            <TabsTrigger value="adoption" data-testid="tab-adoption">Adoption</TabsTrigger>
            <TabsTrigger value="churn" data-testid="tab-churn">Churn & Downgrades</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <StatCard
                title="Active Subscriptions"
                value={analytics.subscriptions.total}
                description={`Free: ${analytics.subscriptions.free} | Basic: ${analytics.subscriptions.basic} | Pro: ${analytics.subscriptions.pro}`}
                icon={Briefcase}
              />
              <StatCard
                title="Total MRR"
                value={`₹${analytics.mrr.total.toLocaleString()}`}
                description="Monthly recurring revenue"
                icon={IndianRupee}
                trend="up"
                trendValue="+12% from last month"
              />
              <StatCard
                title="Payroll Add-On"
                value={analytics.addons.payroll.enabled}
                description={`Trial: ${analytics.addons.payroll.trial} | Paid: ${analytics.addons.payroll.paid}`}
                icon={Users}
              />
              <StatCard
                title="WhatsApp Add-On"
                value={analytics.addons.whatsapp.enabled}
                description="Tenants with WhatsApp enabled"
                icon={TrendingUp}
              />
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <MRRTable mrr={analytics.mrr} />
              <CountryRevenueCard countries={analytics.countryRevenue} />
            </div>
          </TabsContent>

          <TabsContent value="adoption" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <StatCard
                title="Payroll Adoption"
                value={`${analytics.adoption.payrollAdoptionPercent}%`}
                description="Of paid tenants using payroll"
                icon={Percent}
              />
              <StatCard
                title="Avg Employees/Tenant"
                value={analytics.adoption.avgEmployeesPerTenant}
                description="Average employees per payroll tenant"
                icon={Users}
              />
              <StatCard
                title="Trial → Paid"
                value={`${analytics.adoption.trialToPaidConversionPercent}%`}
                description="Trial to paid conversion rate"
                icon={TrendingUp}
                trend="up"
                trendValue="+5% from last month"
              />
            </div>

            <Card data-testid="card-adoption-funnel">
              <CardHeader>
                <CardTitle>Add-On Adoption Funnel</CardTitle>
                <CardDescription>Track how tenants adopt add-ons</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>Viewed Pricing</span>
                    <Badge variant="secondary">100%</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Started Trial</span>
                    <Badge variant="secondary">45%</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Converted to Paid</span>
                    <Badge variant="secondary">{analytics.adoption.trialToPaidConversionPercent}%</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="churn" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <StatCard
                title="Payroll Disabled"
                value={analytics.churn.payrollDisabledThisMonth}
                description="This month"
                icon={TrendingDown}
                trend="down"
                trendValue="2 more than last month"
              />
              <StatCard
                title="Plan Downgrades"
                value={analytics.churn.planDowngrades}
                description="Pro → Basic or Basic → Free"
                icon={RefreshCcw}
              />
              <StatCard
                title="Upgrade Drop-offs"
                value={analytics.churn.upgradeFunnelDropoffs}
                description="Started but didn't complete upgrade"
                icon={AlertTriangle}
              />
            </div>

            <Card data-testid="card-churn-reasons">
              <CardHeader>
                <CardTitle>Churn Reasons</CardTitle>
                <CardDescription>Why tenants cancel or downgrade</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Too expensive</span>
                    <Badge variant="outline">35%</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">No longer needed</span>
                    <Badge variant="outline">28%</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Missing features</span>
                    <Badge variant="outline">22%</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Other</span>
                    <Badge variant="outline">15%</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
