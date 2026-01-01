import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from "recharts";
import {
  Users,
  Calendar,
  DollarSign,
  TrendingUp,
  Package,
  Clock,
} from "lucide-react";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

interface AnalyticsData {
  totalRevenue: number;
  totalBookings: number;
  totalCustomers: number;
  totalServices: number;
  completedBookings: number;
  cancelledBookings: number;
  averageBookingValue: number;
  revenueByMonth: { month: string; revenue: number }[];
  bookingsByStatus: { status: string; count: number }[];
  topServices: { name: string; bookings: number; revenue: number }[];
  recentTrend: { date: string; bookings: number; revenue: number }[];
}

const COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

function StatCard({
  title,
  value,
  icon: Icon,
  subtext,
  loading,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  subtext?: string;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-20" />
            </div>
            <Skeleton className="h-10 w-10 rounded-md" />
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
            <p className="mt-1 text-2xl font-bold">{value}</p>
            {subtext && (
              <p className="mt-1 text-xs text-muted-foreground">{subtext}</p>
            )}
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Analytics() {
  const { data: analytics, isLoading } = useQuery<AnalyticsData>({
    queryKey: ["/api/analytics"],
  });

  const chartConfig = {
    revenue: {
      label: "Revenue",
      color: "hsl(var(--chart-1))",
    },
    bookings: {
      label: "Bookings",
      color: "hsl(var(--chart-2))",
    },
  };

  return (
    <DashboardLayout title="Analytics" breadcrumbs={[{ label: "Analytics" }]}>
      {/* Summary Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Revenue"
          value={analytics ? `₹${analytics.totalRevenue.toLocaleString()}` : "₹0"}
          icon={DollarSign}
          loading={isLoading}
        />
        <StatCard
          title="Total Bookings"
          value={analytics?.totalBookings ?? 0}
          icon={Calendar}
          subtext={`${analytics?.completedBookings ?? 0} completed`}
          loading={isLoading}
        />
        <StatCard
          title="Total Customers"
          value={analytics?.totalCustomers ?? 0}
          icon={Users}
          loading={isLoading}
        />
        <StatCard
          title="Avg Booking Value"
          value={analytics ? `₹${Math.round(analytics.averageBookingValue).toLocaleString()}` : "₹0"}
          icon={TrendingUp}
          loading={isLoading}
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* Revenue Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-medium">Revenue Trend</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : analytics?.revenueByMonth && analytics.revenueByMonth.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.revenueByMonth}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="month"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar
                      dataKey="revenue"
                      fill="hsl(var(--chart-1))"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <div className="flex h-64 items-center justify-center text-muted-foreground">
                No revenue data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Booking Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-medium">Booking Status</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : analytics?.bookingsByStatus && analytics.bookingsByStatus.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={analytics.bookingsByStatus}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="count"
                      nameKey="status"
                      label={({ status, count }) => `${status}: ${count}`}
                      labelLine={false}
                    >
                      {analytics.bookingsByStatus.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <div className="flex h-64 items-center justify-center text-muted-foreground">
                No booking data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Services */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-lg font-medium">Top Services</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-md" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          ) : analytics?.topServices && analytics.topServices.length > 0 ? (
            <div className="space-y-4">
              {analytics.topServices.map((service, index) => (
                <div
                  key={service.name}
                  className="flex items-center gap-4 rounded-md border p-4"
                  data-testid={`top-service-${index}`}
                >
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-md text-white"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  >
                    <Package className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{service.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {service.bookings} bookings
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">₹{service.revenue.toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">revenue</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Package className="h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-muted-foreground">No service data available</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Activity Trend */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-lg font-medium">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : analytics?.recentTrend && analytics.recentTrend.length > 0 ? (
            <ChartContainer config={chartConfig} className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={analytics.recentTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis
                    yAxisId="left"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Legend />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="bookings"
                    stroke="hsl(var(--chart-2))"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="revenue"
                    stroke="hsl(var(--chart-1))"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          ) : (
            <div className="flex h-64 items-center justify-center text-muted-foreground">
              No recent activity data
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
