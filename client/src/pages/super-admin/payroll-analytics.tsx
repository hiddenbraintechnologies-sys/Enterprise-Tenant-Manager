import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SuperAdminGuard } from "@/contexts/admin-context";
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  DollarSign, 
  AlertTriangle,
  Clock,
  ArrowUpRight,
  Building2,
  Globe,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";

interface PayrollSummary {
  totalMRR: number;
  activeCount: number;
  trialCount: number;
  paidCount: number;
  churnedCount: number;
  conversionRate: number;
  byCountry: Record<string, { mrr: number; count: number }>;
  byTier: Record<string, { mrr: number; count: number }>;
  byBasePlan: Record<string, { mrr: number; count: number }>;
}

interface PayrollTenant {
  tenantId: number;
  tenantName: string;
  country: string;
  subscriptionTier: string;
  payrollStatus: string;
  payrollTier: string;
  employeeCount: number;
  monthlyAmount: string;
  currency: string;
  trialEndsAt: string | null;
  activatedAt: string | null;
  cancelledAt: string | null;
}

interface TrialTenant {
  tenantId: number;
  tenantName: string;
  country: string;
  subscriptionTier: string;
  payrollTier: string;
  employeeCount: number;
  trialEndsAt: string;
  activatedAt: string;
}

interface GraceTenant {
  tenantId: number;
  tenantName: string;
  country: string;
  payrollTier: string;
  employeeCount: number;
  monthlyAmount: string;
  gracePeriodEndsAt: string;
}

function StatCard({
  title,
  value,
  description,
  icon: Icon,
  variant = "default",
}: {
  title: string;
  value: string | number;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  variant?: "default" | "warning" | "success" | "primary";
}) {
  const borderColor = {
    default: "",
    warning: "border-orange-500/50",
    success: "border-green-500/50",
    primary: "border-blue-500/50",
  }[variant];

  return (
    <Card className={borderColor}>
      <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold" data-testid={`stat-${title.toLowerCase().replace(/\s+/g, "-")}`}>
          {value}
        </div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

function PayrollAnalyticsContent() {
  const [countryFilter, setCountryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: summary, isLoading: summaryLoading } = useQuery<PayrollSummary>({
    queryKey: ["/api/admin/analytics/payroll/summary", { country: countryFilter !== "all" ? countryFilter : undefined }],
  });

  const { data: tenantsData, isLoading: tenantsLoading } = useQuery<{ data: PayrollTenant[]; total: number }>({
    queryKey: ["/api/admin/analytics/payroll/tenants", { 
      country: countryFilter !== "all" ? countryFilter : undefined,
      status: statusFilter !== "all" ? statusFilter : undefined,
    }],
  });

  const { data: trials, isLoading: trialsLoading } = useQuery<TrialTenant[]>({
    queryKey: ["/api/admin/analytics/payroll/trials", { daysToExpire: 14 }],
  });

  const { data: grace, isLoading: graceLoading } = useQuery<GraceTenant[]>({
    queryKey: ["/api/admin/analytics/payroll/grace"],
  });

  const formatCurrency = (amount: number | string, currency: string = "INR") => {
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: currency,
      maximumFractionDigits: 0,
    }).format(num);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Active</Badge>;
      case "trial":
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">Trial</Badge>;
      case "grace":
        return <Badge className="bg-orange-500/10 text-orange-600 border-orange-500/20">Grace</Badge>;
      case "cancelled":
        return <Badge variant="secondary">Cancelled</Badge>;
      case "expired":
        return <Badge variant="destructive">Expired</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const countries = summary?.byCountry ? Object.keys(summary.byCountry) : [];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">Payroll Analytics</h1>
          <p className="text-muted-foreground mt-1">
            Monitor payroll addon revenue, subscriptions, and tenant metrics
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={countryFilter} onValueChange={setCountryFilter}>
            <SelectTrigger className="w-40" data-testid="select-country-filter">
              <SelectValue placeholder="All Countries" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Countries</SelectItem>
              <SelectItem value="IN">India</SelectItem>
              <SelectItem value="MY">Malaysia</SelectItem>
              <SelectItem value="GB">United Kingdom</SelectItem>
              <SelectItem value="AE">UAE</SelectItem>
              <SelectItem value="US">United States</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {summaryLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <StatCard
            title="Total MRR"
            value={formatCurrency(summary?.totalMRR || 0)}
            description="Monthly recurring revenue"
            icon={DollarSign}
            variant="primary"
          />
          <StatCard
            title="Active Tenants"
            value={summary?.activeCount || 0}
            description={`${summary?.paidCount || 0} paid, ${summary?.trialCount || 0} trial`}
            icon={Building2}
            variant="success"
          />
          <StatCard
            title="Conversion Rate"
            value={`${(summary?.conversionRate || 0).toFixed(1)}%`}
            description="Trial to paid"
            icon={TrendingUp}
          />
          <StatCard
            title="In Trial"
            value={summary?.trialCount || 0}
            description="Active trials"
            icon={Clock}
          />
          <StatCard
            title="Churned"
            value={summary?.churnedCount || 0}
            description="Cancelled or expired"
            icon={AlertTriangle}
            variant="warning"
          />
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">By Country</CardTitle>
            <CardDescription>Revenue distribution by region</CardDescription>
          </CardHeader>
          <CardContent>
            {summaryLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {Object.entries(summary?.byCountry || {}).map(([country, data]) => (
                  <div key={country} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{country}</span>
                      <Badge variant="outline" className="text-xs">{data.count}</Badge>
                    </div>
                    <span className="font-semibold">{formatCurrency(data.mrr)}</span>
                  </div>
                ))}
                {Object.keys(summary?.byCountry || {}).length === 0 && (
                  <p className="text-muted-foreground text-center py-4">No data available</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">By Tier</CardTitle>
            <CardDescription>Revenue by employee tier</CardDescription>
          </CardHeader>
          <CardContent>
            {summaryLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {Object.entries(summary?.byTier || {}).map(([tier, data]) => (
                  <div key={tier} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium capitalize">{tier}</span>
                      <Badge variant="outline" className="text-xs">{data.count}</Badge>
                    </div>
                    <span className="font-semibold">{formatCurrency(data.mrr)}</span>
                  </div>
                ))}
                {Object.keys(summary?.byTier || {}).length === 0 && (
                  <p className="text-muted-foreground text-center py-4">No data available</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">By Base Plan</CardTitle>
            <CardDescription>Revenue by subscription tier</CardDescription>
          </CardHeader>
          <CardContent>
            {summaryLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {Object.entries(summary?.byBasePlan || {}).map(([plan, data]) => (
                  <div key={plan} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium capitalize">{plan}</span>
                      <Badge variant="outline" className="text-xs">{data.count}</Badge>
                    </div>
                    <span className="font-semibold">{formatCurrency(data.mrr)}</span>
                  </div>
                ))}
                {Object.keys(summary?.byBasePlan || {}).length === 0 && (
                  <p className="text-muted-foreground text-center py-4">No data available</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="tenants" className="space-y-4">
        <TabsList>
          <TabsTrigger value="tenants" data-testid="tab-tenants">All Tenants</TabsTrigger>
          <TabsTrigger value="trials" data-testid="tab-trials">
            Trials Expiring
            {trials && trials.length > 0 && (
              <Badge variant="secondary" className="ml-2">{trials.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="grace" data-testid="tab-grace">
            Grace Period
            {grace && grace.length > 0 && (
              <Badge variant="destructive" className="ml-2">{grace.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tenants">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Payroll Tenants</CardTitle>
                  <CardDescription>
                    {tenantsData?.total || 0} tenants with payroll addon
                  </CardDescription>
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-32" data-testid="select-status-filter">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="trial">Trial</SelectItem>
                    <SelectItem value="grace">Grace</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {tenantsLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tenant</TableHead>
                      <TableHead>Country</TableHead>
                      <TableHead>Base Plan</TableHead>
                      <TableHead>Payroll Tier</TableHead>
                      <TableHead>Employees</TableHead>
                      <TableHead>Monthly</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Activated</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tenantsData?.data.map((tenant) => (
                      <TableRow key={tenant.tenantId} data-testid={`row-tenant-${tenant.tenantId}`}>
                        <TableCell className="font-medium">{tenant.tenantName}</TableCell>
                        <TableCell>{tenant.country}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">{tenant.subscriptionTier}</Badge>
                        </TableCell>
                        <TableCell className="capitalize">{tenant.payrollTier}</TableCell>
                        <TableCell>{tenant.employeeCount}</TableCell>
                        <TableCell>{formatCurrency(tenant.monthlyAmount, tenant.currency)}</TableCell>
                        <TableCell>{getStatusBadge(tenant.payrollStatus)}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {tenant.activatedAt 
                            ? format(new Date(tenant.activatedAt), "MMM d, yyyy")
                            : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!tenantsData?.data || tenantsData.data.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                          No tenants found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trials">
          <Card>
            <CardHeader>
              <CardTitle>Trials Expiring Soon</CardTitle>
              <CardDescription>
                Tenants with trials ending in the next 14 days
              </CardDescription>
            </CardHeader>
            <CardContent>
              {trialsLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tenant</TableHead>
                      <TableHead>Country</TableHead>
                      <TableHead>Base Plan</TableHead>
                      <TableHead>Payroll Tier</TableHead>
                      <TableHead>Employees</TableHead>
                      <TableHead>Trial Ends</TableHead>
                      <TableHead>Time Left</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {trials?.map((tenant) => (
                      <TableRow key={tenant.tenantId} data-testid={`row-trial-${tenant.tenantId}`}>
                        <TableCell className="font-medium">{tenant.tenantName}</TableCell>
                        <TableCell>{tenant.country}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">{tenant.subscriptionTier}</Badge>
                        </TableCell>
                        <TableCell className="capitalize">{tenant.payrollTier}</TableCell>
                        <TableCell>{tenant.employeeCount}</TableCell>
                        <TableCell>{format(new Date(tenant.trialEndsAt), "MMM d, yyyy")}</TableCell>
                        <TableCell>
                          <Badge className="bg-orange-500/10 text-orange-600 border-orange-500/20">
                            {formatDistanceToNow(new Date(tenant.trialEndsAt), { addSuffix: true })}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!trials || trials.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          No trials expiring soon
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="grace">
          <Card>
            <CardHeader>
              <CardTitle>Grace Period Tenants</CardTitle>
              <CardDescription>
                Tenants in payment grace period - action required
              </CardDescription>
            </CardHeader>
            <CardContent>
              {graceLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tenant</TableHead>
                      <TableHead>Country</TableHead>
                      <TableHead>Payroll Tier</TableHead>
                      <TableHead>Employees</TableHead>
                      <TableHead>Monthly Amount</TableHead>
                      <TableHead>Grace Ends</TableHead>
                      <TableHead>Time Left</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {grace?.map((tenant) => (
                      <TableRow key={tenant.tenantId} data-testid={`row-grace-${tenant.tenantId}`}>
                        <TableCell className="font-medium">{tenant.tenantName}</TableCell>
                        <TableCell>{tenant.country}</TableCell>
                        <TableCell className="capitalize">{tenant.payrollTier}</TableCell>
                        <TableCell>{tenant.employeeCount}</TableCell>
                        <TableCell>{formatCurrency(tenant.monthlyAmount)}</TableCell>
                        <TableCell>{format(new Date(tenant.gracePeriodEndsAt), "MMM d, yyyy")}</TableCell>
                        <TableCell>
                          <Badge variant="destructive">
                            {formatDistanceToNow(new Date(tenant.gracePeriodEndsAt), { addSuffix: true })}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!grace || grace.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          No tenants in grace period
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function PayrollAnalyticsPage() {
  return (
    <SuperAdminGuard>
      <PayrollAnalyticsContent />
    </SuperAdminGuard>
  );
}
