import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart3,
  TrendingUp,
  Package,
  ShoppingCart,
  IndianRupee,
  Truck,
  Hammer,
  AlertTriangle,
  Download,
} from "lucide-react";

interface DashboardStats {
  totalProducts: number;
  totalSalesOrders: number;
  totalRevenue: string;
  pendingDeliveries: number;
  activeProductionOrders: number;
  lowStockMaterials: number;
}

function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  description,
}: {
  title: string;
  value: string | number;
  icon: typeof TrendingUp;
  trend?: string;
  description?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {(trend || description) && (
          <p className="text-xs text-muted-foreground">
            {trend && <span className="text-green-600">{trend}</span>}
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function SalesReport({ period }: { period: string }) {
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/furniture/dashboard/stats"],
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Revenue"
          value={`${parseFloat(stats?.totalRevenue || "0").toLocaleString()}`}
          icon={IndianRupee}
          description="From all sales orders"
        />
        <StatCard
          title="Total Orders"
          value={stats?.totalSalesOrders || 0}
          icon={ShoppingCart}
          description="Sales orders created"
        />
        <StatCard
          title="Avg Order Value"
          value={
            stats?.totalSalesOrders && stats.totalSalesOrders > 0
              ? Math.round(
                  parseFloat(stats.totalRevenue || "0") / stats.totalSalesOrders
                ).toLocaleString()
              : "0"
          }
          icon={TrendingUp}
          description="Per order"
        />
        <StatCard
          title="Products Sold"
          value={stats?.totalProducts || 0}
          icon={Package}
          description="Active products"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sales Trends</CardTitle>
          <CardDescription>Revenue and order volume over time</CardDescription>
        </CardHeader>
        <CardContent className="flex h-[300px] items-center justify-center">
          <div className="text-center text-muted-foreground">
            <BarChart3 className="mx-auto h-12 w-12" />
            <p className="mt-2">Chart visualization would appear here</p>
            <p className="text-sm">Integrate with recharts for full chart support</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top Selling Products</CardTitle>
            <CardDescription>Best performers this {period}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">Premium Wooden Dining Table</span>
                <span className="font-medium">42 units</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Modern Office Chair</span>
                <span className="font-medium">38 units</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">King Size Bed Frame</span>
                <span className="font-medium">25 units</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">TV Unit with Storage</span>
                <span className="font-medium">22 units</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Modular Kitchen Cabinet</span>
                <span className="font-medium">18 units</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Order Type Distribution</CardTitle>
            <CardDescription>By order type this {period}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">Retail Orders</span>
                <span className="font-medium">65%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Wholesale Orders</span>
                <span className="font-medium">25%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">B2B Orders</span>
                <span className="font-medium">10%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ProductionReport({ period }: { period: string }) {
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/furniture/dashboard/stats"],
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Active Production"
          value={stats?.activeProductionOrders || 0}
          icon={Hammer}
          description="Orders in progress"
        />
        <StatCard
          title="Completed This {period}"
          value={12}
          icon={Package}
          description="Production completed"
        />
        <StatCard
          title="Avg Production Time"
          value="4.2 days"
          icon={TrendingUp}
          description="Per order"
        />
        <StatCard
          title="Production Efficiency"
          value="87%"
          icon={BarChart3}
          description="On-time completion rate"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Production Status Distribution</CardTitle>
          <CardDescription>Current production orders by status</CardDescription>
        </CardHeader>
        <CardContent className="flex h-[300px] items-center justify-center">
          <div className="text-center text-muted-foreground">
            <BarChart3 className="mx-auto h-12 w-12" />
            <p className="mt-2">Production status chart would appear here</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Stage Completion Rates</CardTitle>
            <CardDescription>Time spent in each production stage</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">Cutting</span>
                <span className="font-medium">Avg 0.5 days</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Assembly</span>
                <span className="font-medium">Avg 1.5 days</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Finishing</span>
                <span className="font-medium">Avg 1.2 days</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Quality Check</span>
                <span className="font-medium">Avg 0.5 days</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Ready for Dispatch</span>
                <span className="font-medium">Avg 0.3 days</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Wastage Report</CardTitle>
            <CardDescription>Material wastage by category</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">Wood</span>
                <span className="font-medium">4.2%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Metal</span>
                <span className="font-medium">2.1%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Fabric</span>
                <span className="font-medium">6.8%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Glass</span>
                <span className="font-medium">1.5%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function InventoryReport({ period }: { period: string }) {
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/furniture/dashboard/stats"],
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Products"
          value={stats?.totalProducts || 0}
          icon={Package}
          description="In catalog"
        />
        <StatCard
          title="Low Stock Items"
          value={stats?.lowStockMaterials || 0}
          icon={AlertTriangle}
          description="Need reorder"
        />
        <StatCard
          title="Stock Value"
          value="24,50,000"
          icon={IndianRupee}
          description="Total inventory value"
        />
        <StatCard
          title="Stock Turnover"
          value="3.2x"
          icon={TrendingUp}
          description="This {period}"
        />
      </div>

      <Card className="border-destructive/50 bg-destructive/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Low Stock Alerts
          </CardTitle>
          <CardDescription>Materials that need immediate attention</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Teak Wood Planks</p>
                <p className="text-sm text-muted-foreground">Current: 15 sqft | Min: 50 sqft</p>
              </div>
              <Button size="sm" variant="outline">
                Reorder
              </Button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Upholstery Foam</p>
                <p className="text-sm text-muted-foreground">Current: 8 sheets | Min: 20 sheets</p>
              </div>
              <Button size="sm" variant="outline">
                Reorder
              </Button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Metal Hinges (Large)</p>
                <p className="text-sm text-muted-foreground">Current: 25 pcs | Min: 100 pcs</p>
              </div>
              <Button size="sm" variant="outline">
                Reorder
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Stock Movement</CardTitle>
            <CardDescription>This {period}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">Stock In</span>
                <span className="font-medium text-green-600">+2,450 units</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Stock Out (Production)</span>
                <span className="font-medium text-red-600">-1,820 units</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Adjustments</span>
                <span className="font-medium text-yellow-600">-45 units</span>
              </div>
              <div className="flex items-center justify-between border-t pt-2">
                <span className="text-sm font-medium">Net Change</span>
                <span className="font-bold text-green-600">+585 units</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Material Categories</CardTitle>
            <CardDescription>Stock by category</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">Wood & Timber</span>
                <span className="font-medium">1,250 units</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Metal & Hardware</span>
                <span className="font-medium">3,450 units</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Fabric & Upholstery</span>
                <span className="font-medium">820 units</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Glass & Mirror</span>
                <span className="font-medium">180 units</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Finishing Materials</span>
                <span className="font-medium">450 units</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function DeliveryReport({ period }: { period: string }) {
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/furniture/dashboard/stats"],
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Pending Deliveries"
          value={stats?.pendingDeliveries || 0}
          icon={Truck}
          description="Scheduled"
        />
        <StatCard
          title="Completed This {period}"
          value={28}
          icon={Package}
          description="Successfully delivered"
        />
        <StatCard
          title="On-Time Rate"
          value="94%"
          icon={TrendingUp}
          description="Delivery performance"
        />
        <StatCard
          title="Avg Installation Rating"
          value="4.7/5"
          icon={BarChart3}
          description="Customer feedback"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Delivery Performance</CardTitle>
          <CardDescription>Deliveries over time</CardDescription>
        </CardHeader>
        <CardContent className="flex h-[300px] items-center justify-center">
          <div className="text-center text-muted-foreground">
            <BarChart3 className="mx-auto h-12 w-12" />
            <p className="mt-2">Delivery performance chart would appear here</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Delivery Status</CardTitle>
            <CardDescription>Current status breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">Scheduled</span>
                <span className="font-medium">12</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Dispatched</span>
                <span className="font-medium">5</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">In Transit</span>
                <span className="font-medium">3</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Delivered (This Week)</span>
                <span className="font-medium">28</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Failed/Returned</span>
                <span className="font-medium text-destructive">2</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Installation Feedback</CardTitle>
            <CardDescription>Recent customer ratings</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">5 Stars</span>
                <span className="font-medium">68%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">4 Stars</span>
                <span className="font-medium">22%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">3 Stars</span>
                <span className="font-medium">7%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">2 Stars or Below</span>
                <span className="font-medium text-destructive">3%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function FurnitureReports() {
  const [activeTab, setActiveTab] = useState("sales");
  const [period, setPeriod] = useState("month");

  return (
    <DashboardLayout
      title="Reports & Analytics"
      breadcrumbs={[
        { label: "Furniture", href: "/dashboard/furniture" },
        { label: "Reports" },
      ]}
    >
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <TabsList>
                <TabsTrigger value="sales" data-testid="tab-sales">
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  Sales
                </TabsTrigger>
                <TabsTrigger value="production" data-testid="tab-production">
                  <Hammer className="mr-2 h-4 w-4" />
                  Production
                </TabsTrigger>
                <TabsTrigger value="inventory" data-testid="tab-inventory">
                  <Package className="mr-2 h-4 w-4" />
                  Inventory
                </TabsTrigger>
                <TabsTrigger value="delivery" data-testid="tab-delivery">
                  <Truck className="mr-2 h-4 w-4" />
                  Delivery
                </TabsTrigger>
              </TabsList>

              <div className="flex items-center gap-2">
                <Select value={period} onValueChange={setPeriod}>
                  <SelectTrigger className="w-[150px]" data-testid="select-period">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="week">This Week</SelectItem>
                    <SelectItem value="month">This Month</SelectItem>
                    <SelectItem value="quarter">This Quarter</SelectItem>
                    <SelectItem value="year">This Year</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" data-testid="button-export">
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
              </div>
            </div>

            <TabsContent value="sales" className="mt-6">
              <SalesReport period={period} />
            </TabsContent>

            <TabsContent value="production" className="mt-6">
              <ProductionReport period={period} />
            </TabsContent>

            <TabsContent value="inventory" className="mt-6">
              <InventoryReport period={period} />
            </TabsContent>

            <TabsContent value="delivery" className="mt-6">
              <DeliveryReport period={period} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </DashboardLayout>
  );
}
