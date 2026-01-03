import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useAdmin, AdminGuard, PermissionGuard } from "@/contexts/admin-context";
import { useState } from "react";
import {
  MessageSquare,
  Search,
  Settings,
  Building2,
  CheckCircle,
  XCircle,
  Send,
  Users,
  BarChart3,
  RefreshCw,
  Zap,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface WhatsAppStats {
  totalMessages: number;
  messagesSentToday: number;
  activeConnections: number;
  failedDeliveries: number;
}

interface TenantWhatsAppConfig {
  id: string;
  tenantId: string;
  tenantName: string;
  isEnabled: boolean;
  phoneNumber: string | null;
  messagesThisMonth: number;
  lastMessageAt: string | null;
  status: "connected" | "disconnected" | "pending";
}

function WhatsAppContent() {
  const { isSuperAdmin, hasPermission } = useAdmin();
  const [searchQuery, setSearchQuery] = useState("");

  const { data: stats, isLoading: statsLoading } = useQuery<WhatsAppStats>({
    queryKey: ["/api/platform-admin/whatsapp/stats"],
    staleTime: 60 * 1000,
  });

  const { data: configsData, isLoading: configsLoading } = useQuery<{ configs: TenantWhatsAppConfig[] }>({
    queryKey: ["/api/platform-admin/whatsapp/configs"],
    staleTime: 30 * 1000,
  });

  const filteredConfigs = configsData?.configs?.filter(
    (config) =>
      config.tenantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      config.phoneNumber?.includes(searchQuery)
  ) || [];

  const getStatusBadge = (status: TenantWhatsAppConfig["status"]) => {
    switch (status) {
      case "connected":
        return <Badge variant="default" className="gap-1"><CheckCircle className="h-3 w-3" />Connected</Badge>;
      case "disconnected":
        return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />Disconnected</Badge>;
      case "pending":
        return <Badge variant="secondary" className="gap-1"><RefreshCw className="h-3 w-3" />Pending</Badge>;
    }
  };

  if (statsLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
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
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground" data-testid="text-whatsapp-title">
            WhatsApp Integration
          </h1>
          <p className="text-muted-foreground">
            Manage WhatsApp Business API connections for tenants
          </p>
        </div>
        {(isSuperAdmin || hasPermission("manage_features")) && (
          <Button data-testid="button-global-settings">
            <Settings className="h-4 w-4 mr-2" />
            Global Settings
          </Button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Messages</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-total-messages">
              {stats?.totalMessages?.toLocaleString() || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Sent Today</CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-sent-today">
              {stats?.messagesSentToday?.toLocaleString() || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Messages</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Connections</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-active-connections">
              {stats?.activeConnections || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Connected tenants</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Failed Deliveries</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-failed">
              {stats?.failedDeliveries || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Last 24 hours</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tenant WhatsApp Configurations</CardTitle>
          <CardDescription>Manage WhatsApp settings for each tenant</CardDescription>
          <div className="flex items-center gap-4 pt-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by tenant or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search-whatsapp"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {configsLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredConfigs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No WhatsApp configurations found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Phone Number</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Messages This Month</TableHead>
                  <TableHead>Last Message</TableHead>
                  <TableHead>Enabled</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredConfigs.map((config) => (
                  <TableRow key={config.id} data-testid={`row-whatsapp-${config.id}`}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        {config.tenantName}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {config.phoneNumber || "-"}
                    </TableCell>
                    <TableCell>{getStatusBadge(config.status)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <BarChart3 className="h-3 w-3 text-muted-foreground" />
                        {config.messagesThisMonth.toLocaleString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      {config.lastMessageAt ? (
                        new Date(config.lastMessageAt).toLocaleDateString()
                      ) : (
                        <span className="text-muted-foreground">Never</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={config.isEnabled}
                        disabled={!isSuperAdmin && !hasPermission("manage_features")}
                        data-testid={`switch-whatsapp-${config.id}`}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminWhatsApp() {
  return (
    <AdminGuard>
      <PermissionGuard permission="manage_features">
        <WhatsAppContent />
      </PermissionGuard>
    </AdminGuard>
  );
}
