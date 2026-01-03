import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Dialog, DialogContent, DialogDescription, DialogHeader, 
  DialogTitle, DialogTrigger, DialogFooter 
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Building2, Users, TrendingUp, Shield, Search, 
  Ban, CheckCircle2, Settings2, Activity, Clock,
  ChevronRight, AlertTriangle, Loader2
} from "lucide-react";
import { format } from "date-fns";

interface Tenant {
  id: string;
  name: string;
  slug: string | null;
  businessType: string;
  email: string | null;
  isActive: boolean;
  isSuspended: boolean;
  suspensionReason: string | null;
  subscriptionTier: string;
  createdAt: string;
  stats?: {
    userCount: number;
    customerCount: number;
  };
}

interface PlatformAnalytics {
  overview: {
    totalTenants: number;
    activeTenants: number;
    suspendedTenants: number;
    totalUsers: number;
    newTenantsLast30Days: number;
  };
  subscriptionBreakdown: Array<{
    tier: string;
    count: number;
  }>;
}

interface AuditLog {
  id: string;
  action: string;
  resource: string;
  resourceId: string | null;
  targetTenantId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  adminEmail: string | null;
  adminFirstName: string | null;
  adminLastName: string | null;
}

interface PlatformAdmin {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  role: string;
  isSuperAdmin: boolean;
  mustChangePassword: boolean;
}

export default function PlatformAdminDashboard() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [suspensionReason, setSuspensionReason] = useState("");

  const { data: adminProfile, isLoading: loadingProfile } = useQuery<PlatformAdmin>({
    queryKey: ["/api/platform/me"],
  });

  const { data: analytics, isLoading: loadingAnalytics } = useQuery<PlatformAnalytics>({
    queryKey: ["/api/platform/analytics"],
  });

  const { data: tenantsData, isLoading: loadingTenants } = useQuery<{
    tenants: Tenant[];
    pagination: { page: number; limit: number; total: number };
  }>({
    queryKey: ["/api/platform/tenants", statusFilter],
    queryFn: () => fetch(`/api/platform/tenants?status=${statusFilter}`).then(r => r.json()),
  });

  const { data: auditLogs, isLoading: loadingLogs } = useQuery<AuditLog[]>({
    queryKey: ["/api/platform/audit-logs"],
  });

  const suspendMutation = useMutation({
    mutationFn: async ({ tenantId, reason }: { tenantId: string; reason: string }) => {
      return apiRequest("POST", `/api/platform/tenants/${tenantId}/suspend`, { reason });
    },
    onSuccess: () => {
      toast({ title: "Tenant suspended", description: "The tenant has been suspended successfully." });
      queryClient.invalidateQueries({ queryKey: ["/api/platform/tenants"] });
      queryClient.invalidateQueries({ queryKey: ["/api/platform/analytics"] });
      setSuspendDialogOpen(false);
      setSuspensionReason("");
      setSelectedTenant(null);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to suspend tenant", variant: "destructive" });
    },
  });

  const unsuspendMutation = useMutation({
    mutationFn: async (tenantId: string) => {
      return apiRequest("POST", `/api/platform/tenants/${tenantId}/unsuspend`);
    },
    onSuccess: () => {
      toast({ title: "Tenant restored", description: "The tenant has been restored successfully." });
      queryClient.invalidateQueries({ queryKey: ["/api/platform/tenants"] });
      queryClient.invalidateQueries({ queryKey: ["/api/platform/analytics"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to restore tenant", variant: "destructive" });
    },
  });

  const filteredTenants = tenantsData?.tenants.filter(tenant =>
    tenant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tenant.email?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  if (loadingProfile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="flex h-14 items-center justify-between gap-4 px-6">
          <div className="flex items-center gap-3">
            <Shield className="h-6 w-6 text-primary" />
            <h1 className="text-lg font-semibold">Platform Admin</h1>
            {adminProfile?.isSuperAdmin && (
              <Badge variant="default">Super Admin</Badge>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              {adminProfile?.firstName} {adminProfile?.lastName}
            </span>
            {adminProfile?.mustChangePassword && (
              <Badge variant="destructive">Password Change Required</Badge>
            )}
          </div>
        </div>
      </header>

      <main className="p-6 space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Tenants</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-tenants">
                {loadingAnalytics ? "..." : analytics?.overview.totalTenants || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                +{analytics?.overview.newTenantsLast30Days || 0} in last 30 days
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Tenants</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-active-tenants">
                {loadingAnalytics ? "..." : analytics?.overview.activeTenants || 0}
              </div>
              <p className="text-xs text-muted-foreground">Currently operating</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Suspended</CardTitle>
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-suspended-tenants">
                {loadingAnalytics ? "..." : analytics?.overview.suspendedTenants || 0}
              </div>
              <p className="text-xs text-muted-foreground">Requires attention</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-users">
                {loadingAnalytics ? "..." : analytics?.overview.totalUsers || 0}
              </div>
              <p className="text-xs text-muted-foreground">Across all tenants</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="tenants" className="space-y-4">
          <TabsList>
            <TabsTrigger value="tenants" data-testid="tab-tenants">
              <Building2 className="h-4 w-4 mr-2" />
              Tenants
            </TabsTrigger>
            <TabsTrigger value="audit" data-testid="tab-audit">
              <Activity className="h-4 w-4 mr-2" />
              Audit Log
            </TabsTrigger>
            <TabsTrigger value="analytics" data-testid="tab-analytics">
              <TrendingUp className="h-4 w-4 mr-2" />
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tenants" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Tenant Management</CardTitle>
                <CardDescription>View and manage all tenants on the platform</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search tenants..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                      data-testid="input-search-tenants"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[150px]" data-testid="select-status-filter">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <ScrollArea className="h-[400px]">
                  {loadingTenants ? (
                    <div className="flex items-center justify-center h-32">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : filteredTenants.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No tenants found
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredTenants.map((tenant) => (
                        <div
                          key={tenant.id}
                          className="flex items-center justify-between gap-4 p-4 rounded-md border hover-elevate"
                          data-testid={`row-tenant-${tenant.id}`}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium truncate">{tenant.name}</p>
                              {tenant.isSuspended && (
                                <Badge variant="destructive">Suspended</Badge>
                              )}
                              {!tenant.isActive && !tenant.isSuspended && (
                                <Badge variant="secondary">Inactive</Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                              <span>{tenant.email || "No email"}</span>
                              <span className="text-xs">|</span>
                              <Badge variant="outline" className="text-xs">
                                {tenant.businessType}
                              </Badge>
                              <span className="text-xs">|</span>
                              <span className="text-xs">{tenant.subscriptionTier}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {tenant.isSuspended ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => unsuspendMutation.mutate(tenant.id)}
                                disabled={unsuspendMutation.isPending}
                                data-testid={`button-unsuspend-${tenant.id}`}
                              >
                                {unsuspendMutation.isPending ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <CheckCircle2 className="h-4 w-4 mr-1" />
                                )}
                                Restore
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedTenant(tenant);
                                  setSuspendDialogOpen(true);
                                }}
                                data-testid={`button-suspend-${tenant.id}`}
                              >
                                <Ban className="h-4 w-4 mr-1" />
                                Suspend
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" data-testid={`button-view-${tenant.id}`}>
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="audit" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Platform Audit Log</CardTitle>
                <CardDescription>Track all administrative actions on the platform</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  {loadingLogs ? (
                    <div className="flex items-center justify-center h-32">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : !auditLogs || auditLogs.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No audit logs yet
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {auditLogs.map((log) => (
                        <div
                          key={log.id}
                          className="flex items-start gap-4 p-3 rounded-md border"
                          data-testid={`row-audit-${log.id}`}
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">{log.action}</Badge>
                              <span className="font-medium">{log.resource}</span>
                              {log.resourceId && (
                                <span className="text-muted-foreground text-sm">
                                  #{log.resourceId.slice(0, 8)}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              By {log.adminFirstName} {log.adminLastName} ({log.adminEmail})
                            </p>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            {format(new Date(log.createdAt), "MMM d, yyyy HH:mm")}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Subscription Distribution</CardTitle>
                <CardDescription>Breakdown of tenants by subscription tier</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingAnalytics ? (
                  <div className="flex items-center justify-center h-32">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    {analytics?.subscriptionBreakdown.map((item) => (
                      <div key={item.tier} className="flex items-center gap-4">
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium capitalize">{item.tier || "Free"}</span>
                            <span className="text-sm text-muted-foreground">{item.count}</span>
                          </div>
                          <div className="h-2 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full"
                              style={{
                                width: `${((item.count / (analytics?.overview.totalTenants || 1)) * 100).toFixed(0)}%`,
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <Dialog open={suspendDialogOpen} onOpenChange={setSuspendDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suspend Tenant</DialogTitle>
            <DialogDescription>
              This will prevent the tenant and all their users from accessing the platform.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Tenant</Label>
              <p className="text-sm font-medium">{selectedTenant?.name}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reason">Suspension Reason</Label>
              <Textarea
                id="reason"
                placeholder="Enter the reason for suspension..."
                value={suspensionReason}
                onChange={(e) => setSuspensionReason(e.target.value)}
                data-testid="input-suspension-reason"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setSuspendDialogOpen(false);
                setSuspensionReason("");
                setSelectedTenant(null);
              }}
              data-testid="button-cancel-suspend"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (selectedTenant) {
                  suspendMutation.mutate({
                    tenantId: selectedTenant.id,
                    reason: suspensionReason,
                  });
                }
              }}
              disabled={suspendMutation.isPending}
              data-testid="button-confirm-suspend"
            >
              {suspendMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Ban className="h-4 w-4 mr-2" />
              )}
              Suspend Tenant
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
