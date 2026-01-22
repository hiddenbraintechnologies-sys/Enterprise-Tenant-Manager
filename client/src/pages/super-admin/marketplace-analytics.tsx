import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdmin } from "@/contexts/admin-context";
import {
  BarChart3,
  TrendingUp,
  Users,
  DollarSign,
  Package,
  Globe,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";

interface OverviewData {
  topMetrics: {
    totalActiveSubscriptions: number;
    mtdRevenue: Record<string, number>;
    ytdRevenue: Record<string, number>;
    avgAddonPerTenant: string;
    trialConversionRate: string;
  };
  period: {
    mtdStart: string;
    ytdStart: string;
  };
}

interface AddonRevenue {
  addonId: string;
  name: string;
  slug: string;
  category: string;
  activeTenants: number;
}

interface CountryRevenue {
  country: string;
  countryCode: string;
  totalTenants: number;
  totalAddons: number;
}

interface FunnelData {
  viewed: number;
  trialStarted: number;
  paidActive: number;
  cancelled: number;
}

function formatCurrency(amount: number, currency: string): string {
  const symbols: Record<string, string> = {
    INR: "₹",
    MYR: "RM",
    GBP: "£",
    USD: "$",
    AED: "د.إ",
  };
  const symbol = symbols[currency] || currency + " ";
  return `${symbol}${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function RevenueCard({ title, revenue, icon: Icon, testId }: { title: string; revenue: Record<string, number>; icon: React.ComponentType<{ className?: string }>; testId: string }) {
  const entries = Object.entries(revenue || {});
  
  return (
    <Card data-testid={`card-${testId}`}>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
        <CardTitle className="text-sm font-medium" data-testid={`text-${testId}-title`}>{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <div className="text-2xl font-bold text-muted-foreground" data-testid={`text-${testId}-empty`}>-</div>
        ) : (
          <div className="space-y-1">
            {entries.map(([currency, amount]) => (
              <div key={currency} className="text-xl font-bold" data-testid={`text-${testId}-${currency}`}>
                {formatCurrency(amount, currency)}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MetricCard({ title, value, icon: Icon, trend, testId }: { title: string; value: string | number; icon: React.ComponentType<{ className?: string }>; trend?: "up" | "down"; testId: string }) {
  return (
    <Card data-testid={`card-${testId}`}>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
        <CardTitle className="text-sm font-medium" data-testid={`text-${testId}-title`}>{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold" data-testid={`text-${testId}-value`}>{value}</span>
          {trend && (
            trend === "up" 
              ? <ArrowUpRight className="h-4 w-4 text-green-500" data-testid={`icon-${testId}-trend-up`} />
              : <ArrowDownRight className="h-4 w-4 text-red-500" data-testid={`icon-${testId}-trend-down`} />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function AddonTable({ addons }: { addons: AddonRevenue[] }) {
  return (
    <Card data-testid="card-addon-revenue">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          <span data-testid="text-addon-table-title">Revenue by Add-on</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="table-addon-revenue">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 font-medium">Add-on</th>
                <th className="text-left py-2 font-medium">Category</th>
                <th className="text-right py-2 font-medium">Active Tenants</th>
              </tr>
            </thead>
            <tbody data-testid="table-addon-revenue-body">
              {addons.length === 0 ? (
                <tr data-testid="row-addon-empty">
                  <td colSpan={3} className="py-4 text-center text-muted-foreground">
                    No add-on data available
                  </td>
                </tr>
              ) : (
                addons.map((addon) => (
                  <tr key={addon.addonId} className="border-b last:border-0" data-testid={`row-addon-${addon.slug}`}>
                    <td className="py-2" data-testid={`text-addon-name-${addon.slug}`}>{addon.name}</td>
                    <td className="py-2">
                      <Badge variant="secondary" className="text-xs" data-testid={`badge-addon-category-${addon.slug}`}>
                        {addon.category}
                      </Badge>
                    </td>
                    <td className="py-2 text-right font-medium" data-testid={`text-addon-tenants-${addon.slug}`}>{addon.activeTenants}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function CountryTable({ countries }: { countries: CountryRevenue[] }) {
  return (
    <Card data-testid="card-country-revenue">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5" />
          <span data-testid="text-country-table-title">Revenue by Country</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="table-country-revenue">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 font-medium">Country</th>
                <th className="text-right py-2 font-medium">Tenants</th>
                <th className="text-right py-2 font-medium">Add-ons</th>
              </tr>
            </thead>
            <tbody data-testid="table-country-revenue-body">
              {countries.length === 0 ? (
                <tr data-testid="row-country-empty">
                  <td colSpan={3} className="py-4 text-center text-muted-foreground">
                    No country data available
                  </td>
                </tr>
              ) : (
                countries.map((country) => (
                  <tr key={country.countryCode} className="border-b last:border-0" data-testid={`row-country-${country.countryCode}`}>
                    <td className="py-2 flex items-center gap-2">
                      <Badge variant="outline" data-testid={`badge-country-code-${country.countryCode}`}>{country.countryCode}</Badge>
                      <span className="capitalize" data-testid={`text-country-name-${country.countryCode}`}>{country.country}</span>
                    </td>
                    <td className="py-2 text-right" data-testid={`text-country-tenants-${country.countryCode}`}>{country.totalTenants}</td>
                    <td className="py-2 text-right font-medium" data-testid={`text-country-addons-${country.countryCode}`}>{country.totalAddons}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function ConversionFunnel({ funnel }: { funnel: FunnelData }) {
  const stages = [
    { label: "Add-on Views", value: funnel.viewed, color: "bg-blue-100 dark:bg-blue-900", key: "viewed" },
    { label: "Trials Started", value: funnel.trialStarted, color: "bg-amber-100 dark:bg-amber-900", key: "trials" },
    { label: "Paid Active", value: funnel.paidActive, color: "bg-green-100 dark:bg-green-900", key: "paid" },
    { label: "Cancelled", value: funnel.cancelled, color: "bg-red-100 dark:bg-red-900", key: "cancelled" },
  ];

  const maxValue = Math.max(...stages.map(s => s.value), 1);

  return (
    <Card data-testid="card-conversion-funnel">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          <span data-testid="text-funnel-title">Conversion Funnel</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {stages.map((stage) => (
            <div key={stage.key} className="space-y-1" data-testid={`funnel-stage-${stage.key}`}>
              <div className="flex justify-between text-sm">
                <span data-testid={`text-funnel-label-${stage.key}`}>{stage.label}</span>
                <span className="font-medium" data-testid={`text-funnel-value-${stage.key}`}>{stage.value}</span>
              </div>
              <div className="h-3 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full ${stage.color} rounded-full transition-all`}
                  style={{ width: `${(stage.value / maxValue) * 100}%` }}
                  data-testid={`bar-funnel-${stage.key}`}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function MarketplaceAnalytics() {
  useAdmin();

  const { data: overview, isLoading: loadingOverview } = useQuery<{ success: boolean; data: OverviewData }>({
    queryKey: ["/api/admin/analytics/marketplace/overview"],
  });

  const { data: addonRevenue, isLoading: loadingAddons } = useQuery<{ success: boolean; data: AddonRevenue[] }>({
    queryKey: ["/api/admin/analytics/marketplace/by-addon"],
  });

  const { data: countryRevenue, isLoading: loadingCountries } = useQuery<{ success: boolean; data: CountryRevenue[] }>({
    queryKey: ["/api/admin/analytics/marketplace/by-country"],
  });

  const { data: funnelData, isLoading: loadingFunnel } = useQuery<{ success: boolean; data: FunnelData }>({
    queryKey: ["/api/admin/analytics/marketplace/funnel"],
  });

  const metrics = overview?.data?.topMetrics;

  return (
    <div className="p-6 space-y-6" data-testid="marketplace-analytics-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Marketplace Analytics</h1>
          <p className="text-muted-foreground" data-testid="text-page-subtitle">
            Revenue insights for marketplace add-ons
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4" data-testid="grid-overview-metrics">
        {loadingOverview ? (
          <>
            <Skeleton className="h-32" data-testid="skeleton-metric-1" />
            <Skeleton className="h-32" data-testid="skeleton-metric-2" />
            <Skeleton className="h-32" data-testid="skeleton-metric-3" />
            <Skeleton className="h-32" data-testid="skeleton-metric-4" />
          </>
        ) : (
          <>
            <MetricCard
              title="Active Subscriptions"
              value={metrics?.totalActiveSubscriptions || 0}
              icon={Users}
              testId="active-subscriptions"
            />
            <RevenueCard
              title="MTD Revenue"
              revenue={metrics?.mtdRevenue || {}}
              icon={DollarSign}
              testId="mtd-revenue"
            />
            <RevenueCard
              title="YTD Revenue"
              revenue={metrics?.ytdRevenue || {}}
              icon={TrendingUp}
              testId="ytd-revenue"
            />
            <MetricCard
              title="Avg Add-ons/Tenant"
              value={metrics?.avgAddonPerTenant || "0"}
              icon={Package}
              testId="avg-addons"
            />
          </>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2" data-testid="grid-detail-sections">
        <div className="space-y-6">
          {loadingAddons ? (
            <Skeleton className="h-64" data-testid="skeleton-addon-table" />
          ) : (
            <AddonTable addons={addonRevenue?.data || []} />
          )}
        </div>
        
        <div className="space-y-6">
          {loadingCountries ? (
            <Skeleton className="h-48" data-testid="skeleton-country-table" />
          ) : (
            <CountryTable countries={countryRevenue?.data || []} />
          )}
          
          {loadingFunnel ? (
            <Skeleton className="h-64" data-testid="skeleton-funnel" />
          ) : funnelData?.data ? (
            <ConversionFunnel funnel={funnelData.data} />
          ) : null}
        </div>
      </div>

      <Card data-testid="card-conversion-rate">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            <span data-testid="text-conversion-rate-title">Trial Conversion Rate</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="text-4xl font-bold" data-testid="text-conversion-rate-value">
              {metrics?.trialConversionRate || "0%"}
            </div>
            <div className="text-sm text-muted-foreground" data-testid="text-conversion-rate-description">
              Percentage of trials that converted to paid subscriptions
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
