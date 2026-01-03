import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Dialog, DialogContent, DialogDescription, DialogHeader, 
  DialogTitle, DialogFooter 
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { 
  Building2, Users, TrendingUp, Shield, Search, 
  Ban, CheckCircle2, Activity, Clock,
  AlertTriangle, Loader2, LogOut, Plus, Pencil, Trash2, ShieldCheck, UserCog
} from "lucide-react";
import { format } from "date-fns";
import { Checkbox } from "@/components/ui/checkbox";

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

interface PlatformUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  createdAt: string;
  updatedAt: string | null;
  isPlatformAdmin: boolean;
  platformAdmin: {
    id: string;
    role: string;
    status: string;
  } | null;
}

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  platformAdmin: {
    id: string;
    role: string;
    mustChangePassword: boolean;
  };
}

const TOKEN_KEY = "platform_admin_token";

function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

function setStoredToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

function clearStoredToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function platformFetch(url: string, options: RequestInit = {}) {
  const token = getStoredToken();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };
  
  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }
  
  const response = await fetch(url, { ...options, headers });
  
  if (response.status === 401) {
    clearStoredToken();
    throw new Error("Session expired");
  }
  
  return response;
}

function LoginForm({ onSuccess }: { onSuccess: () => void }) {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  const loginMutation = useMutation({
    mutationFn: async (credentials: { email: string; password: string }) => {
      const response = await fetch("/api/platform/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Login failed");
      }
      
      return response.json() as Promise<LoginResponse>;
    },
    onSuccess: (data) => {
      setStoredToken(data.accessToken);
      toast({ title: "Welcome back!", description: `Logged in as ${data.user.firstName}` });
      onSuccess();
    },
    onError: (error: Error) => {
      toast({ title: "Login failed", description: error.message, variant: "destructive" });
    },
  });
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate({ email, password });
  };
  
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Shield className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-2xl">Platform Admin</CardTitle>
          <CardDescription>Sign in to access the admin dashboard</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="superadmin@bizflow.app"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                data-testid="input-email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                data-testid="input-password"
              />
            </div>
            <Button 
              type="submit" 
              className="w-full" 
              disabled={loginMutation.isPending}
              data-testid="button-login"
            >
              {loginMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function PlatformAdminDashboard() {
  const { toast } = useToast();
  const [isAuthenticated, setIsAuthenticated] = useState(!!getStoredToken());
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [suspensionReason, setSuspensionReason] = useState("");
  
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [createUserDialogOpen, setCreateUserDialogOpen] = useState(false);
  const [editUserDialogOpen, setEditUserDialogOpen] = useState(false);
  const [deleteUserDialogOpen, setDeleteUserDialogOpen] = useState(false);
  const [promoteAdminDialogOpen, setPromoteAdminDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<PlatformUser | null>(null);
  const [newUserData, setNewUserData] = useState({
    email: "",
    firstName: "",
    lastName: "",
    password: "",
    makePlatformAdmin: false,
    platformRole: "platform_admin" as "super_admin" | "platform_admin",
  });
  const [editUserData, setEditUserData] = useState({
    firstName: "",
    lastName: "",
    password: "",
  });
  const [promoteAdminData, setPromoteAdminData] = useState({
    role: "platform_admin" as "super_admin" | "platform_admin",
  });

  const { data: adminProfile, isLoading: loadingProfile, error: profileError } = useQuery<PlatformAdmin>({
    queryKey: ["/api/platform/me"],
    queryFn: async () => {
      const response = await platformFetch("/api/platform/me");
      if (!response.ok) throw new Error("Failed to fetch profile");
      return response.json();
    },
    enabled: isAuthenticated,
    retry: false,
  });

  const { data: analytics, isLoading: loadingAnalytics } = useQuery<PlatformAnalytics>({
    queryKey: ["/api/platform/analytics"],
    queryFn: async () => {
      const response = await platformFetch("/api/platform/analytics");
      if (!response.ok) throw new Error("Failed to fetch analytics");
      return response.json();
    },
    enabled: isAuthenticated && !!adminProfile,
  });

  const { data: tenantsData, isLoading: loadingTenants } = useQuery<{
    tenants: Tenant[];
    pagination: { page: number; limit: number; total: number };
  }>({
    queryKey: ["/api/platform/tenants", statusFilter],
    queryFn: async () => {
      const url = statusFilter === "all" 
        ? "/api/platform/tenants" 
        : `/api/platform/tenants?status=${statusFilter}`;
      const response = await platformFetch(url);
      if (!response.ok) throw new Error("Failed to fetch tenants");
      return response.json();
    },
    enabled: isAuthenticated && !!adminProfile,
  });

  const { data: auditLogs, isLoading: loadingLogs } = useQuery<AuditLog[]>({
    queryKey: ["/api/platform/audit-logs"],
    queryFn: async () => {
      const response = await platformFetch("/api/platform/audit-logs");
      if (!response.ok) throw new Error("Failed to fetch logs");
      return response.json();
    },
    enabled: isAuthenticated && !!adminProfile,
  });

  const { data: usersData, isLoading: loadingUsers } = useQuery<{
    users: PlatformUser[];
    pagination: { page: number; limit: number; total: number };
  }>({
    queryKey: ["/api/platform/users"],
    queryFn: async () => {
      const response = await platformFetch("/api/platform/users");
      if (!response.ok) throw new Error("Failed to fetch users");
      return response.json();
    },
    enabled: isAuthenticated && !!adminProfile && adminProfile.isSuperAdmin,
  });

  const suspendMutation = useMutation({
    mutationFn: async ({ tenantId, reason }: { tenantId: string; reason: string }) => {
      const response = await platformFetch(`/api/platform/tenants/${tenantId}/suspend`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      });
      if (!response.ok) throw new Error("Failed to suspend tenant");
      return response.json();
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
      const response = await platformFetch(`/api/platform/tenants/${tenantId}/unsuspend`, {
        method: "POST",
      });
      if (!response.ok) throw new Error("Failed to unsuspend tenant");
      return response.json();
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

  const createUserMutation = useMutation({
    mutationFn: async (data: typeof newUserData) => {
      const response = await platformFetch("/api/platform/users", {
        method: "POST",
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create user");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "User created", description: "The user has been created successfully." });
      queryClient.invalidateQueries({ queryKey: ["/api/platform/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/platform/analytics"] });
      setCreateUserDialogOpen(false);
      setNewUserData({ email: "", firstName: "", lastName: "", password: "", makePlatformAdmin: false, platformRole: "platform_admin" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, data }: { userId: string; data: typeof editUserData }) => {
      const response = await platformFetch(`/api/platform/users/${userId}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update user");
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "User updated", description: "The user has been updated successfully." });
      queryClient.invalidateQueries({ queryKey: ["/api/platform/users"] });
      setEditUserDialogOpen(false);
      setSelectedUser(null);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update user", variant: "destructive" });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await platformFetch(`/api/platform/users/${userId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete user");
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "User deleted", description: "The user has been deleted successfully." });
      queryClient.invalidateQueries({ queryKey: ["/api/platform/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/platform/analytics"] });
      setDeleteUserDialogOpen(false);
      setSelectedUser(null);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete user", variant: "destructive" });
    },
  });

  const promoteToAdminMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const response = await platformFetch("/api/platform/admins", {
        method: "POST",
        body: JSON.stringify({ userId, role }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to promote user");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "User promoted", description: "The user is now a platform admin." });
      queryClient.invalidateQueries({ queryKey: ["/api/platform/users"] });
      setPromoteAdminDialogOpen(false);
      setSelectedUser(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const removeAdminMutation = useMutation({
    mutationFn: async (adminId: string) => {
      const response = await platformFetch(`/api/platform/admins/${adminId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to remove admin");
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Admin removed", description: "The user is no longer a platform admin." });
      queryClient.invalidateQueries({ queryKey: ["/api/platform/users"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to remove admin", variant: "destructive" });
    },
  });

  useEffect(() => {
    if (profileError) {
      clearStoredToken();
      setIsAuthenticated(false);
    }
  }, [profileError]);

  const handleLogout = () => {
    clearStoredToken();
    setIsAuthenticated(false);
    queryClient.clear();
    toast({ title: "Logged out", description: "You have been logged out successfully." });
  };

  const filteredTenants = (tenantsData?.tenants || []).filter(tenant =>
    tenant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tenant.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredUsers = (usersData?.users || []).filter(user =>
    user.email.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
    user.firstName?.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
    user.lastName?.toLowerCase().includes(userSearchQuery.toLowerCase())
  );

  if (!isAuthenticated) {
    return <LoginForm onSuccess={() => setIsAuthenticated(true)} />;
  }

  if (loadingProfile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!adminProfile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <Shield className="h-16 w-16 text-muted-foreground" />
        <h1 className="text-2xl font-semibold">Access Denied</h1>
        <p className="text-muted-foreground text-center max-w-md">
          You must be logged in as a platform administrator to access this page.
        </p>
        <Button variant="outline" onClick={() => setIsAuthenticated(false)}>
          Return to Login
        </Button>
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
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleLogout}
              data-testid="button-logout"
            >
              <LogOut className="h-4 w-4" />
            </Button>
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
                {analytics?.overview.newTenantsLast30Days || 0} new in last 30 days
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Tenants</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-active-tenants">
                {loadingAnalytics ? "..." : analytics?.overview.activeTenants || 0}
              </div>
              <p className="text-xs text-muted-foreground">Currently operational</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Suspended</CardTitle>
              <Ban className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-suspended-tenants">
                {loadingAnalytics ? "..." : analytics?.overview.suspendedTenants || 0}
              </div>
              <p className="text-xs text-muted-foreground">Require attention</p>
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
            {adminProfile?.isSuperAdmin && (
              <TabsTrigger value="users" data-testid="tab-users">
                <Users className="h-4 w-4 mr-2" />
                Users
              </TabsTrigger>
            )}
            <TabsTrigger value="audit" data-testid="tab-audit">
              <Activity className="h-4 w-4 mr-2" />
              Audit Logs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tenants" className="space-y-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search tenants..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                  data-testid="input-search-tenants"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]" data-testid="select-status-filter">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tenants</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Card>
              <CardContent className="p-0">
                <ScrollArea className="h-[500px]">
                  {loadingTenants ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : filteredTenants.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                      <Building2 className="h-12 w-12 mb-2" />
                      <p>No tenants found</p>
                    </div>
                  ) : (
                    <div className="divide-y">
                      {filteredTenants.map((tenant) => (
                        <div
                          key={tenant.id}
                          className="flex items-center justify-between gap-4 p-4 hover-elevate"
                          data-testid={`tenant-row-${tenant.id}`}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-medium truncate">{tenant.name}</h3>
                              <Badge variant="outline">{tenant.businessType}</Badge>
                              <Badge variant={tenant.subscriptionTier === "enterprise" ? "default" : "secondary"}>
                                {tenant.subscriptionTier}
                              </Badge>
                              {tenant.isSuspended && (
                                <Badge variant="destructive">Suspended</Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground truncate">
                              {tenant.email || "No email"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Created {format(new Date(tenant.createdAt), "MMM d, yyyy")}
                            </p>
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
                                <CheckCircle2 className="h-4 w-4 mr-1" />
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
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {adminProfile?.isSuperAdmin && (
            <TabsContent value="users" className="space-y-4">
              <div className="flex flex-wrap items-center gap-4">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search users..."
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    className="pl-9"
                    data-testid="input-search-users"
                  />
                </div>
                <Button onClick={() => setCreateUserDialogOpen(true)} data-testid="button-create-user">
                  <Plus className="h-4 w-4 mr-2" />
                  Create User
                </Button>
              </div>

              <Card>
                <CardContent className="p-0">
                  <ScrollArea className="h-[500px]">
                    {loadingUsers ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : filteredUsers.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                        <Users className="h-12 w-12 mb-2" />
                        <p>No users found</p>
                      </div>
                    ) : (
                      <div className="divide-y">
                        {filteredUsers.map((user) => (
                          <div
                            key={user.id}
                            className="flex items-center justify-between gap-4 p-4 hover-elevate"
                            data-testid={`user-row-${user.id}`}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="font-medium truncate">
                                  {user.firstName} {user.lastName}
                                </h3>
                                {user.isPlatformAdmin && (
                                  <Badge variant={user.platformAdmin?.role === "super_admin" ? "default" : "secondary"}>
                                    <ShieldCheck className="h-3 w-3 mr-1" />
                                    {user.platformAdmin?.role === "super_admin" ? "Super Admin" : "Platform Admin"}
                                  </Badge>
                                )}
                                {user.platformAdmin?.status === "suspended" && (
                                  <Badge variant="destructive">Suspended</Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                              <p className="text-xs text-muted-foreground">
                                Created {format(new Date(user.createdAt), "MMM d, yyyy")}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setSelectedUser(user);
                                  setEditUserData({
                                    firstName: user.firstName || "",
                                    lastName: user.lastName || "",
                                    password: "",
                                  });
                                  setEditUserDialogOpen(true);
                                }}
                                data-testid={`button-edit-user-${user.id}`}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              {!user.isPlatformAdmin && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    setSelectedUser(user);
                                    setPromoteAdminDialogOpen(true);
                                  }}
                                  data-testid={`button-promote-user-${user.id}`}
                                >
                                  <UserCog className="h-4 w-4" />
                                </Button>
                              )}
                              {user.isPlatformAdmin && user.platformAdmin && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removeAdminMutation.mutate(user.platformAdmin!.id)}
                                  disabled={removeAdminMutation.isPending}
                                  data-testid={`button-demote-user-${user.id}`}
                                >
                                  <Shield className="h-4 w-4 text-muted-foreground" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setSelectedUser(user);
                                  setDeleteUserDialogOpen(true);
                                }}
                                data-testid={`button-delete-user-${user.id}`}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
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
          )}

          <TabsContent value="audit" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Recent Activity
                </CardTitle>
                <CardDescription>Platform administration audit trail</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[500px]">
                  {loadingLogs ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : !auditLogs || auditLogs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                      <Activity className="h-12 w-12 mb-2" />
                      <p>No audit logs yet</p>
                    </div>
                  ) : (
                    <div className="divide-y">
                      {auditLogs.map((log) => (
                        <div key={log.id} className="p-4" data-testid={`audit-log-${log.id}`}>
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge variant="outline">{log.action}</Badge>
                                <span className="text-sm font-medium">{log.resource}</span>
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">
                                by {log.adminFirstName} {log.adminLastName} ({log.adminEmail})
                              </p>
                            </div>
                            <div className="flex items-center text-xs text-muted-foreground">
                              <Clock className="h-3 w-3 mr-1" />
                              {format(new Date(log.createdAt), "MMM d, yyyy HH:mm")}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <Dialog open={suspendDialogOpen} onOpenChange={setSuspendDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Suspend Tenant
            </DialogTitle>
            <DialogDescription>
              This will immediately block all users of {selectedTenant?.name} from accessing the platform.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
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
            <Button variant="outline" onClick={() => setSuspendDialogOpen(false)}>
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
              disabled={suspendMutation.isPending || !suspensionReason.trim()}
              data-testid="button-confirm-suspend"
            >
              {suspendMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Suspending...
                </>
              ) : (
                "Suspend Tenant"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={createUserDialogOpen} onOpenChange={setCreateUserDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Create New User
            </DialogTitle>
            <DialogDescription>
              Add a new user to the platform. You can optionally make them a platform admin.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={newUserData.firstName}
                  onChange={(e) => setNewUserData({ ...newUserData, firstName: e.target.value })}
                  data-testid="input-new-user-firstname"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={newUserData.lastName}
                  onChange={(e) => setNewUserData({ ...newUserData, lastName: e.target.value })}
                  data-testid="input-new-user-lastname"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={newUserData.email}
                onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                data-testid="input-new-user-email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={newUserData.password}
                onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })}
                data-testid="input-new-user-password"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="makePlatformAdmin"
                checked={newUserData.makePlatformAdmin}
                onCheckedChange={(checked) => setNewUserData({ ...newUserData, makePlatformAdmin: checked as boolean })}
                data-testid="checkbox-make-admin"
              />
              <Label htmlFor="makePlatformAdmin">Make Platform Admin</Label>
            </div>
            {newUserData.makePlatformAdmin && (
              <div className="space-y-2">
                <Label htmlFor="platformRole">Admin Role</Label>
                <Select
                  value={newUserData.platformRole}
                  onValueChange={(value: "super_admin" | "platform_admin") => setNewUserData({ ...newUserData, platformRole: value })}
                >
                  <SelectTrigger data-testid="select-new-user-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="platform_admin">Platform Admin</SelectItem>
                    <SelectItem value="super_admin">Super Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateUserDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createUserMutation.mutate(newUserData)}
              disabled={createUserMutation.isPending || !newUserData.email || !newUserData.password || !newUserData.firstName || !newUserData.lastName}
              data-testid="button-confirm-create-user"
            >
              {createUserMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create User"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editUserDialogOpen} onOpenChange={setEditUserDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5" />
              Edit User
            </DialogTitle>
            <DialogDescription>
              Update user details for {selectedUser?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="editFirstName">First Name</Label>
                <Input
                  id="editFirstName"
                  value={editUserData.firstName}
                  onChange={(e) => setEditUserData({ ...editUserData, firstName: e.target.value })}
                  data-testid="input-edit-user-firstname"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editLastName">Last Name</Label>
                <Input
                  id="editLastName"
                  value={editUserData.lastName}
                  onChange={(e) => setEditUserData({ ...editUserData, lastName: e.target.value })}
                  data-testid="input-edit-user-lastname"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="editPassword">New Password (leave empty to keep current)</Label>
              <Input
                id="editPassword"
                type="password"
                value={editUserData.password}
                onChange={(e) => setEditUserData({ ...editUserData, password: e.target.value })}
                data-testid="input-edit-user-password"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUserDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (selectedUser) {
                  const data: Record<string, string> = {};
                  if (editUserData.firstName) data.firstName = editUserData.firstName;
                  if (editUserData.lastName) data.lastName = editUserData.lastName;
                  if (editUserData.password) data.password = editUserData.password;
                  updateUserMutation.mutate({ userId: selectedUser.id, data: data as typeof editUserData });
                }
              }}
              disabled={updateUserMutation.isPending}
              data-testid="button-confirm-edit-user"
            >
              {updateUserMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteUserDialogOpen} onOpenChange={setDeleteUserDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete User
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedUser?.email}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteUserDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (selectedUser) {
                  deleteUserMutation.mutate(selectedUser.id);
                }
              }}
              disabled={deleteUserMutation.isPending}
              data-testid="button-confirm-delete-user"
            >
              {deleteUserMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete User"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={promoteAdminDialogOpen} onOpenChange={setPromoteAdminDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" />
              Promote to Platform Admin
            </DialogTitle>
            <DialogDescription>
              Make {selectedUser?.email} a platform administrator.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="adminRole">Admin Role</Label>
              <Select
                value={promoteAdminData.role}
                onValueChange={(value: "super_admin" | "platform_admin") => setPromoteAdminData({ role: value })}
              >
                <SelectTrigger data-testid="select-promote-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="platform_admin">Platform Admin</SelectItem>
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPromoteAdminDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (selectedUser) {
                  promoteToAdminMutation.mutate({ userId: selectedUser.id, role: promoteAdminData.role });
                }
              }}
              disabled={promoteToAdminMutation.isPending}
              data-testid="button-confirm-promote"
            >
              {promoteToAdminMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Promoting...
                </>
              ) : (
                "Promote to Admin"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
