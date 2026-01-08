import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Factory,
  Truck,
  FileText,
  AlertTriangle,
  Lightbulb,
  RefreshCw,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

interface AnalyticsOverview {
  dateRange: { startDate: string; endDate: string };
  production: {
    total: number;
    completed: number;
    inProgress: number;
    avgProductionTimeHours: number;
    wastagePercentage: number;
  };
  sales: {
    totalOrders: number;
    completedOrders: number;
    totalRevenue: number;
    revenueUsd: number;
    conversionRate: number;
    topProducts: any[];
  };
  payments: {
    totalInvoices: number;
    paidInvoices: number;
    overdueInvoices: number;
    partiallyPaidInvoices: number;
    totalReceivables: number;
    totalReceivablesUsd: number;
    avgPaymentDelayDays: number;
    paymentsReceived: number;
  };
  operations: {
    totalDeliveries: number;
    onTimeDeliveries: number;
    lateDeliveries: number;
    deliveryOnTimeRate: number;
    totalInstallations: number;
    completedInstallations: number;
    installationCompletionRate: number;
    avgInstallationRating: number;
  };
}

interface AiInsight {
  id: string;
  category: string;
  severity: string;
  title: string;
  description: string;
  metricValue: string | null;
  metricUnit: string | null;
  isRead: boolean;
  isDismissed: boolean;
  createdAt: string;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  loading,
  variant = "default",
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  trend?: { value: number; isPositive: boolean };
  loading?: boolean;
  variant?: "default" | "success" | "warning" | "danger";
}) {
  const variantStyles = {
    default: "bg-primary/10 text-primary",
    success: "bg-green-500/10 text-green-600 dark:text-green-400",
    warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    danger: "bg-red-500/10 text-red-600 dark:text-red-400",
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-16" />
            </div>
            <Skeleton className="h-12 w-12 rounded-md" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="mt-1 text-3xl font-bold" data-testid={`metric-${title.toLowerCase().replace(/\s+/g, '-')}`}>{value}</p>
            {subtitle && (
              <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
            )}
            {trend && (
              <p className="mt-1 flex items-center gap-1 text-xs">
                {trend.isPositive ? (
                  <ArrowUpRight className="h-3 w-3 text-green-500" />
                ) : (
                  <ArrowDownRight className="h-3 w-3 text-red-500" />
                )}
                <span className={trend.isPositive ? "text-green-500" : "text-red-500"}>
                  {trend.value}%
                </span>
                <span className="text-muted-foreground">vs last period</span>
              </p>
            )}
          </div>
          <div className={`flex h-12 w-12 items-center justify-center rounded-md ${variantStyles[variant]}`}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function InsightCard({ insight, onRead, onDismiss }: { insight: AiInsight; onRead: () => void; onDismiss: () => void }) {
  const severityStyles = {
    info: "border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/20",
    warning: "border-l-amber-500 bg-amber-50/50 dark:bg-amber-950/20",
    critical: "border-l-red-500 bg-red-50/50 dark:bg-red-950/20",
  };

  const severityBadge = {
    info: <Badge variant="secondary">Info</Badge>,
    warning: <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">Warning</Badge>,
    critical: <Badge variant="destructive">Critical</Badge>,
  };

  const categoryIcons: Record<string, React.ElementType> = {
    production: Factory,
    sales: DollarSign,
    payments: FileText,
    cashflow: TrendingUp,
    operations: Truck,
    customer: CheckCircle,
    inventory: BarChart3,
  };

  const CategoryIcon = categoryIcons[insight.category] || Lightbulb;

  return (
    <div 
      className={`relative border-l-4 rounded-r-md p-4 ${severityStyles[insight.severity as keyof typeof severityStyles] || severityStyles.info} ${insight.isRead ? 'opacity-70' : ''}`}
      data-testid={`insight-card-${insight.id}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5">
            <CategoryIcon className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              {severityBadge[insight.severity as keyof typeof severityBadge]}
              <Badge variant="outline">{insight.category}</Badge>
            </div>
            <h4 className="font-semibold">{insight.title}</h4>
            <p className="text-sm text-muted-foreground mt-1">{insight.description}</p>
            {insight.metricValue && (
              <p className="text-xs text-muted-foreground mt-2">
                Metric: {insight.metricValue} {insight.metricUnit}
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-2">
          {!insight.isRead && (
            <Button variant="ghost" size="sm" onClick={onRead} data-testid={`button-mark-read-${insight.id}`}>
              <CheckCircle className="h-4 w-4" />
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onDismiss} data-testid={`button-dismiss-${insight.id}`}>
            <XCircle className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function FurnitureAnalytics() {
  const { toast } = useToast();
  const [period, setPeriod] = useState("30d");
  const [activeTab, setActiveTab] = useState("overview");

  const { data: analytics, isLoading: analyticsLoading, refetch: refetchAnalytics } = useQuery<AnalyticsOverview>({
    queryKey: ["/api/furniture/analytics/overview", { period }],
  });

  const { data: insights, isLoading: insightsLoading, refetch: refetchInsights } = useQuery<AiInsight[]>({
    queryKey: ["/api/furniture/insights"],
  });

  const generateInsightsMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/furniture/insights/generate");
    },
    onSuccess: (data: any) => {
      toast({
        title: "Insights Generated",
        description: `Generated ${data.generated} new insights based on your data.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/furniture/insights"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to generate insights.",
        variant: "destructive",
      });
    },
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("PATCH", `/api/furniture/insights/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/furniture/insights"] });
    },
  });

  const dismissMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("PATCH", `/api/furniture/insights/${id}/dismiss`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/furniture/insights"] });
      toast({ title: "Insight dismissed" });
    },
  });

  const productionData = analytics ? [
    { name: "Completed", value: analytics.production.completed },
    { name: "In Progress", value: analytics.production.inProgress },
    { name: "Other", value: analytics.production.total - analytics.production.completed - analytics.production.inProgress },
  ].filter(item => item.value > 0) : [];

  const paymentsData = analytics ? [
    { name: "Paid", value: analytics.payments.paidInvoices },
    { name: "Overdue", value: analytics.payments.overdueInvoices },
    { name: "Partial", value: analytics.payments.partiallyPaidInvoices },
    { name: "Pending", value: analytics.payments.totalInvoices - analytics.payments.paidInvoices - analytics.payments.overdueInvoices - analytics.payments.partiallyPaidInvoices },
  ].filter(item => item.value > 0) : [];

  const unreadInsights = insights?.filter(i => !i.isRead && !i.isDismissed) || [];
  const criticalInsights = unreadInsights.filter(i => i.severity === "critical");

  return (
    <DashboardLayout 
      title="Analytics & Insights" 
      breadcrumbs={[
        { label: "Furniture", href: "/furniture" },
        { label: "Analytics" }
      ]}
    >
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Select value={period} onValueChange={setPeriod} data-testid="select-period">
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="1y">Last year</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => refetchAnalytics()} data-testid="button-refresh-analytics">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
          
          <div className="flex items-center gap-2">
            {criticalInsights.length > 0 && (
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="h-3 w-3" />
                {criticalInsights.length} Critical
              </Badge>
            )}
            <Button 
              onClick={() => generateInsightsMutation.mutate()} 
              disabled={generateInsightsMutation.isPending}
              data-testid="button-generate-insights"
            >
              {generateInsightsMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              Generate Insights
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
            <TabsTrigger value="production" data-testid="tab-production">Production</TabsTrigger>
            <TabsTrigger value="sales" data-testid="tab-sales">Sales & Revenue</TabsTrigger>
            <TabsTrigger value="operations" data-testid="tab-operations">Operations</TabsTrigger>
            <TabsTrigger value="insights" data-testid="tab-insights">
              AI Insights
              {unreadInsights.length > 0 && (
                <Badge variant="secondary" className="ml-2">{unreadInsights.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard
                title="Total Revenue"
                value={analytics ? `$${analytics.sales.revenueUsd.toLocaleString()}` : "$0"}
                icon={DollarSign}
                loading={analyticsLoading}
                variant="success"
              />
              <MetricCard
                title="Production Orders"
                value={analytics?.production.total || 0}
                subtitle={`${analytics?.production.completed || 0} completed`}
                icon={Factory}
                loading={analyticsLoading}
              />
              <MetricCard
                title="Outstanding Receivables"
                value={analytics ? `$${analytics.payments.totalReceivablesUsd.toLocaleString()}` : "$0"}
                subtitle={`${analytics?.payments.overdueInvoices || 0} overdue`}
                icon={FileText}
                loading={analyticsLoading}
                variant={analytics?.payments.overdueInvoices ? "warning" : "default"}
              />
              <MetricCard
                title="Delivery On-Time Rate"
                value={analytics ? `${analytics.operations.deliveryOnTimeRate}%` : "0%"}
                icon={Truck}
                loading={analyticsLoading}
                variant={analytics && analytics.operations.deliveryOnTimeRate < 80 ? "danger" : "success"}
              />
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Production Status</CardTitle>
                  <CardDescription>Distribution of production orders by status</CardDescription>
                </CardHeader>
                <CardContent>
                  {analyticsLoading ? (
                    <Skeleton className="h-[200px] w-full" />
                  ) : productionData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={productionData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          fill="#8884d8"
                          paddingAngle={2}
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {productionData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-[200px] items-center justify-center text-muted-foreground">
                      No production data available
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Invoice Status</CardTitle>
                  <CardDescription>Distribution of invoices by payment status</CardDescription>
                </CardHeader>
                <CardContent>
                  {analyticsLoading ? (
                    <Skeleton className="h-[200px] w-full" />
                  ) : paymentsData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={paymentsData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          fill="#8884d8"
                          paddingAngle={2}
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {paymentsData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-[200px] items-center justify-center text-muted-foreground">
                      No invoice data available
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
                  <CardTitle className="text-base">Avg Production Time</CardTitle>
                  <Clock className="h-5 w-5 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold" data-testid="metric-avg-production-time">
                    {analytics?.production.avgProductionTimeHours.toFixed(1) || 0}h
                  </div>
                  <p className="text-sm text-muted-foreground">per order</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
                  <CardTitle className="text-base">Wastage Rate</CardTitle>
                  <AlertTriangle className={`h-5 w-5 ${analytics && analytics.production.wastagePercentage > 10 ? 'text-amber-500' : 'text-muted-foreground'}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold" data-testid="metric-wastage-rate">
                    {analytics?.production.wastagePercentage.toFixed(1) || 0}%
                  </div>
                  <p className="text-sm text-muted-foreground">material waste</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
                  <CardTitle className="text-base">Installation Rating</CardTitle>
                  <CheckCircle className="h-5 w-5 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold" data-testid="metric-installation-rating">
                    {analytics?.operations.avgInstallationRating.toFixed(1) || 0}/5
                  </div>
                  <p className="text-sm text-muted-foreground">customer satisfaction</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="production" className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard
                title="Total Orders"
                value={analytics?.production.total || 0}
                icon={Factory}
                loading={analyticsLoading}
              />
              <MetricCard
                title="Completed"
                value={analytics?.production.completed || 0}
                icon={CheckCircle}
                loading={analyticsLoading}
                variant="success"
              />
              <MetricCard
                title="In Progress"
                value={analytics?.production.inProgress || 0}
                icon={Clock}
                loading={analyticsLoading}
              />
              <MetricCard
                title="Wastage Rate"
                value={`${analytics?.production.wastagePercentage.toFixed(1) || 0}%`}
                icon={AlertTriangle}
                loading={analyticsLoading}
                variant={analytics && analytics.production.wastagePercentage > 10 ? "warning" : "default"}
              />
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Production Efficiency</CardTitle>
                <CardDescription>Average production time and completion rate analysis</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Completion Rate</p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-4 rounded-full bg-muted overflow-hidden">
                        <div 
                          className="h-full bg-primary rounded-full"
                          style={{ 
                            width: `${analytics && analytics.production.total > 0 
                              ? (analytics.production.completed / analytics.production.total) * 100 
                              : 0}%` 
                          }}
                        />
                      </div>
                      <span className="text-sm font-medium">
                        {analytics && analytics.production.total > 0 
                          ? Math.round((analytics.production.completed / analytics.production.total) * 100)
                          : 0}%
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Average Production Time</p>
                    <p className="text-2xl font-bold">{analytics?.production.avgProductionTimeHours.toFixed(1) || 0} hours</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sales" className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard
                title="Total Revenue"
                value={`$${(analytics?.sales.revenueUsd || 0).toLocaleString()}`}
                icon={DollarSign}
                loading={analyticsLoading}
                variant="success"
              />
              <MetricCard
                title="Total Orders"
                value={analytics?.sales.totalOrders || 0}
                icon={BarChart3}
                loading={analyticsLoading}
              />
              <MetricCard
                title="Completed Orders"
                value={analytics?.sales.completedOrders || 0}
                icon={CheckCircle}
                loading={analyticsLoading}
                variant="success"
              />
              <MetricCard
                title="Conversion Rate"
                value={`${analytics?.sales.conversionRate.toFixed(1) || 0}%`}
                icon={TrendingUp}
                loading={analyticsLoading}
              />
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Payment Collection</CardTitle>
                  <CardDescription>Invoice and payment status summary</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Total Invoices</span>
                      <span className="font-medium">{analytics?.payments.totalInvoices || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-green-600 dark:text-green-400">Paid</span>
                      <span className="font-medium">{analytics?.payments.paidInvoices || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-amber-600 dark:text-amber-400">Overdue</span>
                      <span className="font-medium">{analytics?.payments.overdueInvoices || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-blue-600 dark:text-blue-400">Partial</span>
                      <span className="font-medium">{analytics?.payments.partiallyPaidInvoices || 0}</span>
                    </div>
                    <div className="border-t pt-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Total Receivables</span>
                        <span className="text-lg font-bold">${analytics?.payments.totalReceivablesUsd.toLocaleString() || 0}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Payments Received</CardTitle>
                  <CardDescription>Total payments collected in this period</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-green-600 dark:text-green-400" data-testid="metric-payments-received">
                    ${(analytics?.payments.paymentsReceived || 0).toLocaleString()}
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Average payment delay: {analytics?.payments.avgPaymentDelayDays || 0} days
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="operations" className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard
                title="Total Deliveries"
                value={analytics?.operations.totalDeliveries || 0}
                icon={Truck}
                loading={analyticsLoading}
              />
              <MetricCard
                title="On-Time Deliveries"
                value={analytics?.operations.onTimeDeliveries || 0}
                icon={CheckCircle}
                loading={analyticsLoading}
                variant="success"
              />
              <MetricCard
                title="Late Deliveries"
                value={analytics?.operations.lateDeliveries || 0}
                icon={Clock}
                loading={analyticsLoading}
                variant={analytics && analytics.operations.lateDeliveries > 0 ? "warning" : "default"}
              />
              <MetricCard
                title="On-Time Rate"
                value={`${analytics?.operations.deliveryOnTimeRate || 0}%`}
                icon={TrendingUp}
                loading={analyticsLoading}
                variant={analytics && analytics.operations.deliveryOnTimeRate < 80 ? "danger" : "success"}
              />
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Installation Summary</CardTitle>
                  <CardDescription>Installation completion and customer satisfaction</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Total Installations</span>
                      <span className="font-medium">{analytics?.operations.totalInstallations || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Completed</span>
                      <span className="font-medium">{analytics?.operations.completedInstallations || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Completion Rate</span>
                      <span className="font-medium">{analytics?.operations.installationCompletionRate || 0}%</span>
                    </div>
                    <div className="border-t pt-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Customer Rating</span>
                        <span className="text-lg font-bold">{analytics?.operations.avgInstallationRating || 0}/5</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Delivery Performance</CardTitle>
                  <CardDescription>On-time delivery tracking</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>On-Time Rate</span>
                        <span className="font-medium">{analytics?.operations.deliveryOnTimeRate || 0}%</span>
                      </div>
                      <div className="h-4 rounded-full bg-muted overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${
                            analytics && analytics.operations.deliveryOnTimeRate >= 80 
                              ? 'bg-green-500' 
                              : analytics && analytics.operations.deliveryOnTimeRate >= 60 
                                ? 'bg-amber-500' 
                                : 'bg-red-500'
                          }`}
                          style={{ width: `${analytics?.operations.deliveryOnTimeRate || 0}%` }}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <div className="text-center p-3 rounded-md bg-green-50 dark:bg-green-950/20">
                        <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                          {analytics?.operations.onTimeDeliveries || 0}
                        </p>
                        <p className="text-xs text-muted-foreground">On Time</p>
                      </div>
                      <div className="text-center p-3 rounded-md bg-red-50 dark:bg-red-950/20">
                        <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                          {analytics?.operations.lateDeliveries || 0}
                        </p>
                        <p className="text-xs text-muted-foreground">Late</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="insights" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
                <div>
                  <CardTitle>AI-Powered Business Insights</CardTitle>
                  <CardDescription>
                    Automated analysis of your business data to identify trends, risks, and opportunities
                  </CardDescription>
                </div>
                <Button 
                  onClick={() => generateInsightsMutation.mutate()} 
                  disabled={generateInsightsMutation.isPending}
                  data-testid="button-generate-insights-tab"
                >
                  {generateInsightsMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4 mr-2" />
                  )}
                  Analyze Now
                </Button>
              </CardHeader>
              <CardContent>
                {insightsLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                      <Skeleton key={i} className="h-24 w-full" />
                    ))}
                  </div>
                ) : unreadInsights.length > 0 ? (
                  <ScrollArea className="h-[500px] pr-4">
                    <div className="space-y-4">
                      {unreadInsights.map(insight => (
                        <InsightCard 
                          key={insight.id}
                          insight={insight}
                          onRead={() => markReadMutation.mutate(insight.id)}
                          onDismiss={() => dismissMutation.mutate(insight.id)}
                        />
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Lightbulb className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium">No new insights</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Click "Analyze Now" to generate new business insights based on your latest data.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
