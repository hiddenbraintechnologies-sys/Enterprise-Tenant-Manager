import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
import { WelcomeMessage } from "@/components/welcome-message";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Armchair,
  Package,
  ClipboardList,
  Hammer,
  Truck,
  Wrench,
  TrendingUp,
  Plus,
  ArrowRight,
  ShoppingCart,
} from "lucide-react";
import { Link } from "wouter";

interface DashboardStats {
  totalProducts: number;
  activeProductionOrders: number;
  pendingDeliveries: number;
  lowStockMaterials: number;
  pendingSalesOrders: number;
  pendingInstallations: number;
}

function StatsCard({
  title,
  value,
  icon: Icon,
  trend,
  loading,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  trend?: { value: number; label: string };
  loading?: boolean;
}) {
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
            <p className="mt-1 text-3xl font-bold">{value}</p>
            {trend && (
              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <TrendingUp className="h-3 w-3 text-green-500" />
                <span className="text-green-500">{trend.value}%</span>
                <span>{trend.label}</span>
              </p>
            )}
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function getStatusVariant(status: string) {
  switch (status) {
    case "in_progress":
    case "active":
      return "default";
    case "completed":
    case "delivered":
      return "outline";
    case "pending":
    case "draft":
      return "secondary";
    case "on_hold":
    case "cancelled":
      return "destructive";
    default:
      return "outline";
  }
}

export default function FurnitureDashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/furniture/dashboard/stats"],
  });

  const { data: productionOrders, isLoading: ordersLoading } = useQuery<{ data: any[]; pagination: any }>({
    queryKey: ["/api/furniture/production-orders", { status: "in_progress", limit: 5 }],
  });

  const { data: salesOrders, isLoading: salesLoading } = useQuery<{ data: any[]; pagination: any }>({
    queryKey: ["/api/furniture/sales-orders", { status: "pending", limit: 4 }],
  });

  return (
    <DashboardLayout title="Furniture Manufacturing Dashboard" breadcrumbs={[{ label: "Dashboard" }]}>
      <WelcomeMessage businessType="furniture_manufacturing" />
      
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <StatsCard
          title="Total Products"
          value={stats?.totalProducts ?? 0}
          icon={Armchair}
          loading={statsLoading}
        />
        <StatsCard
          title="Active Production"
          value={stats?.activeProductionOrders ?? 0}
          icon={Hammer}
          loading={statsLoading}
        />
        <StatsCard
          title="Pending Deliveries"
          value={stats?.pendingDeliveries ?? 0}
          icon={Truck}
          loading={statsLoading}
        />
        <StatsCard
          title="Low Stock Materials"
          value={stats?.lowStockMaterials ?? 0}
          icon={Package}
          loading={statsLoading}
        />
        <StatsCard
          title="Pending Sales Orders"
          value={stats?.pendingSalesOrders ?? 0}
          icon={ShoppingCart}
          loading={statsLoading}
          trend={{ value: 8, label: "this week" }}
        />
        <StatsCard
          title="Pending Installations"
          value={stats?.pendingInstallations ?? 0}
          icon={Wrench}
          loading={statsLoading}
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
            <CardTitle className="text-base font-semibold">Active Production Orders</CardTitle>
            <Link href="/furniture/production-orders/new">
              <Button size="sm" data-testid="button-create-production-order">
                <Plus className="mr-2 h-4 w-4" />
                New Order
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {ordersLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : productionOrders?.data?.length ? (
              <div className="space-y-4">
                {productionOrders.data.slice(0, 5).map((order: any) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between rounded-lg border p-4"
                    data-testid={`card-production-order-${order.id}`}
                  >
                    <div>
                      <p className="font-medium">{order.orderNumber}</p>
                      <p className="text-sm text-muted-foreground">
                        Qty: {order.quantity} - Priority: {order.priority}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={getStatusVariant(order.status)}>
                        {order.status.replace("_", " ")}
                      </Badge>
                      <Link href={`/furniture/production-orders/${order.id}`}>
                        <Button size="icon" variant="ghost" data-testid={`button-view-production-${order.id}`}>
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-8 text-center text-muted-foreground">
                No active production orders. Create a new order to get started.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
            <CardTitle className="text-base font-semibold">Pending Sales Orders</CardTitle>
            <Link href="/furniture/sales-orders/new">
              <Button size="sm" data-testid="button-create-sales-order">
                <Plus className="mr-2 h-4 w-4" />
                New Sale
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {salesLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : salesOrders?.data?.length ? (
              <div className="space-y-4">
                {salesOrders.data.slice(0, 4).map((order: any) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between rounded-lg border p-4"
                    data-testid={`card-sales-order-${order.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
                        <ShoppingCart className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{order.orderNumber}</p>
                        <p className="text-sm text-muted-foreground">
                          {order.orderType} - {order.currency} {order.totalAmount}
                        </p>
                      </div>
                    </div>
                    <Badge variant={getStatusVariant(order.status)}>{order.status}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-8 text-center text-muted-foreground">
                No pending sales orders. Create your first sale.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
            <CardTitle className="text-base font-semibold">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Link href="/furniture/products/new">
                <Button variant="outline" data-testid="button-add-product">
                  <Armchair className="mr-2 h-4 w-4" />
                  Add Product
                </Button>
              </Link>
              <Link href="/furniture/raw-materials/new">
                <Button variant="outline" data-testid="button-add-material">
                  <Package className="mr-2 h-4 w-4" />
                  Add Raw Material
                </Button>
              </Link>
              <Link href="/furniture/bom/new">
                <Button variant="outline" data-testid="button-create-bom">
                  <ClipboardList className="mr-2 h-4 w-4" />
                  Create BOM
                </Button>
              </Link>
              <Link href="/furniture/production-orders/new">
                <Button variant="outline" data-testid="button-start-production">
                  <Hammer className="mr-2 h-4 w-4" />
                  Start Production
                </Button>
              </Link>
              <Link href="/furniture/deliveries/new">
                <Button variant="outline" data-testid="button-schedule-delivery">
                  <Truck className="mr-2 h-4 w-4" />
                  Schedule Delivery
                </Button>
              </Link>
              <Link href="/furniture/installations/new">
                <Button variant="outline" data-testid="button-schedule-installation">
                  <Wrench className="mr-2 h-4 w-4" />
                  Schedule Installation
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
