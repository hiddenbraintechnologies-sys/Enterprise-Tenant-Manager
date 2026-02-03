import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, Shield, Plus, MoreHorizontal, UserPlus, Copy, Trash2, Loader2, Eye, Clock, Monitor, Globe } from "lucide-react";
import { insertTenantStaffSchema, insertTenantRoleSchema, type TenantRole, type TenantStaff } from "@shared/schema";
import { useImpersonation } from "@/contexts/impersonation-context";
import { ScrollArea } from "@/components/ui/scroll-area";

type TenantStaffMember = TenantStaff & {
  role: { id: string; name: string } | null;
};

type LoginHistoryEntry = {
  id: string;
  loginAt: string;
  logoutAt: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  authProvider: string;
  isImpersonated: boolean;
  impersonatedByStaffId: string | null;
  impersonatedByStaffName: string | null;
};

function parseUserAgent(ua: string | null): { browser: string; os: string } {
  if (!ua) return { browser: "Unknown", os: "Unknown" };
  
  let browser = "Unknown";
  let os = "Unknown";
  
  if (ua.includes("Chrome")) browser = "Chrome";
  else if (ua.includes("Firefox")) browser = "Firefox";
  else if (ua.includes("Safari")) browser = "Safari";
  else if (ua.includes("Edge")) browser = "Edge";
  else if (ua.includes("Opera")) browser = "Opera";
  
  if (ua.includes("Windows")) os = "Windows";
  else if (ua.includes("Mac OS")) os = "macOS";
  else if (ua.includes("Linux")) os = "Linux";
  else if (ua.includes("Android")) os = "Android";
  else if (ua.includes("iOS") || ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";
  
  return { browser, os };
}

type TenantRoleWithPermissions = TenantRole & {
  permissions: string[];
};

type PermissionGroups = Record<string, string[]>;

const staffFormSchema = insertTenantStaffSchema
  .pick({ fullName: true, email: true, aliasName: true, phone: true, jobTitle: true, tenantRoleId: true })
  .extend({
    fullName: z.string().min(1, "Name is required"),
    email: z.string().email("Valid email is required"),
    aliasName: z.string().optional().nullable(),
    phone: z.string().optional().nullable(),
    jobTitle: z.string().optional().nullable(),
    tenantRoleId: z.string().optional().nullable(),
  });

const roleFormSchema = insertTenantRoleSchema
  .pick({ name: true, description: true })
  .extend({
    name: z.string().min(1, "Role name is required"),
    description: z.string().optional().nullable(),
  });

function StatusBadge({ status }: { status: string }) {
  if (status === "active") return <Badge data-testid="badge-status-active">Active</Badge>;
  if (status === "inactive") return <Badge variant="secondary" data-testid="badge-status-inactive">Inactive</Badge>;
  if (status === "pending_invite") return <Badge variant="outline" data-testid="badge-status-invited">Invited</Badge>;
  return <Badge variant="secondary" data-testid="badge-status-other">{status}</Badge>;
}

export default function StaffRolesSettings() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("users");

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="users" className="gap-2" data-testid="tab-users">
            <Users className="h-4 w-4" />
            Users
          </TabsTrigger>
          <TabsTrigger value="roles" className="gap-2" data-testid="tab-roles">
            <Shield className="h-4 w-4" />
            Roles
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <UsersTab />
        </TabsContent>

        <TabsContent value="roles">
          <RolesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function UsersTab() {
  const { toast } = useToast();
  const { startImpersonation } = useImpersonation();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive" | "pending_invite">("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [isInviteMode, setIsInviteMode] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<TenantStaffMember | null>(null);
  const [changeRoleDialogOpen, setChangeRoleDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [newRoleId, setNewRoleId] = useState<string>("");
  const [loginHistoryOpen, setLoginHistoryOpen] = useState(false);
  const [loginHistoryStaff, setLoginHistoryStaff] = useState<TenantStaffMember | null>(null);

  const { data: staffList = [], isLoading } = useQuery<TenantStaffMember[]>({
    queryKey: ["/api/settings/staff"],
  });

  const { data: roles = [] } = useQuery<TenantRoleWithPermissions[]>({
    queryKey: ["/api/settings/roles"],
  });

  const { data: loginHistoryData, isLoading: loginHistoryLoading } = useQuery<{
    entries: LoginHistoryEntry[];
    total: number;
  }>({
    queryKey: ["/api/settings/staff", loginHistoryStaff?.id, "login-history"],
    enabled: !!loginHistoryStaff?.id,
  });

  const handleViewLoginHistory = (staff: TenantStaffMember) => {
    setLoginHistoryStaff(staff);
    setLoginHistoryOpen(true);
  };

  const form = useForm<z.infer<typeof staffFormSchema>>({
    resolver: zodResolver(staffFormSchema),
    defaultValues: {
      fullName: "",
      email: "",
      aliasName: null,
      phone: null,
      jobTitle: null,
      tenantRoleId: null,
    },
  });

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return staffList.filter(r => {
      const matchesQ = !q ||
        r.fullName.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q) ||
        (r.aliasName ?? "").toLowerCase().includes(q);
      const matchesStatus = statusFilter === "all" || r.status === statusFilter;
      const matchesRole = roleFilter === "all" || r.tenantRoleId === roleFilter;
      return matchesQ && matchesStatus && matchesRole;
    });
  }, [staffList, searchQuery, statusFilter, roleFilter]);

  const selectedIds = Object.entries(selected).filter(([, v]) => v).map(([k]) => k);
  const allVisibleSelected = filtered.length > 0 && filtered.every(r => selected[r.id]);

  const createMutation = useMutation({
    mutationFn: async (data: z.infer<typeof staffFormSchema> & { status?: string }) => {
      const response = await apiRequest("POST", "/api/settings/staff", data);
      const staffData = await response.json();
      return { staffData, sendInvite: data.status === "pending_invite" };
    },
    onSuccess: async ({ staffData, sendInvite }) => {
      if (sendInvite && staffData?.id) {
        try {
          await apiRequest("POST", `/api/settings/staff/${staffData.id}/invite`);
          toast({ title: "User created and invite sent" });
        } catch (err) {
          toast({ title: "User created but invite failed", variant: "destructive" });
        }
      } else {
        toast({ title: "User added successfully" });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/settings/staff"] });
      setDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<z.infer<typeof staffFormSchema>> }) =>
      apiRequest("PUT", `/api/settings/staff/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/staff"] });
      setDialogOpen(false);
      setEditingUser(null);
      form.reset();
      toast({ title: "User updated successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/settings/staff/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/staff"] });
      toast({ title: "User removed" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const inviteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/settings/staff/${id}/invite`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/staff"] });
      toast({ title: "Invite sent" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => apiRequest("PUT", `/api/settings/staff/${id}`, { status: "inactive" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/staff"] });
      toast({ title: "User deactivated" });
    },
  });

  const activateMutation = useMutation({
    mutationFn: (id: string) => apiRequest("PUT", `/api/settings/staff/${id}`, { status: "active" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/staff"] });
      toast({ title: "User activated" });
    },
  });

  const handleOpenAdd = (invite: boolean = false) => {
    setEditingUser(null);
    setIsInviteMode(invite);
    form.reset({ fullName: "", email: "", aliasName: null, phone: null, jobTitle: null, tenantRoleId: null });
    setDialogOpen(true);
  };

  const handleOpenEdit = (user: TenantStaffMember) => {
    setEditingUser(user);
    form.reset({
      fullName: user.fullName,
      email: user.email,
      aliasName: user.aliasName,
      phone: user.phone,
      jobTitle: user.jobTitle,
      tenantRoleId: user.tenantRoleId,
    });
    setDialogOpen(true);
  };

  const handleChangeRole = (userId: string) => {
    setSelectedUserId(userId);
    const user = staffList.find(u => u.id === userId);
    setNewRoleId(user?.tenantRoleId || "");
    setChangeRoleDialogOpen(true);
  };

  const handleViewAsUser = async (staffId: string) => {
    try {
      await startImpersonation(staffId);
      toast({
        title: "Impersonation started",
        description: "You are now viewing the application as this user.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to start impersonation",
        variant: "destructive",
      });
    }
  };

  const handleSaveRoleChange = () => {
    if (selectedUserId && newRoleId) {
      updateMutation.mutate({ id: selectedUserId, data: { tenantRoleId: newRoleId } });
      setChangeRoleDialogOpen(false);
    }
  };

  const onSubmit = (data: z.infer<typeof staffFormSchema>) => {
    if (editingUser) {
      updateMutation.mutate({ id: editingUser.id, data });
    } else {
      createMutation.mutate({ ...data, status: isInviteMode ? "pending_invite" : "active" } as any);
    }
  };

  const handleBulkDeactivate = () => {
    selectedIds.forEach(id => deactivateMutation.mutate(id));
    setSelected({});
  };

  const handleBulkRemove = () => {
    selectedIds.forEach(id => deleteMutation.mutate(id));
    setSelected({});
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold" data-testid="text-users-title">Users</h1>
          <p className="text-sm text-muted-foreground">Manage users who can access your account</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => handleOpenAdd(false)} data-testid="button-add-user">
            <Plus className="mr-2 h-4 w-4" />
            Add User
          </Button>
          <Button onClick={() => handleOpenAdd(true)} data-testid="button-invite-user">
            <UserPlus className="mr-2 h-4 w-4" />
            Invite User
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="w-full sm:w-[220px]">
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, email, or alias..."
            data-testid="input-search-users"
          />
        </div>

        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-[150px]" data-testid="filter-role">
            <SelectValue placeholder="All Roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            {roles.map((role) => (
              <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <ToggleGroup
          type="single"
          value={statusFilter}
          onValueChange={(v) => v && setStatusFilter(v as any)}
          className="justify-start"
        >
          <ToggleGroupItem value="all" data-testid="filter-all">All</ToggleGroupItem>
          <ToggleGroupItem value="active" data-testid="filter-active">Active</ToggleGroupItem>
          <ToggleGroupItem value="inactive" data-testid="filter-inactive">Inactive</ToggleGroupItem>
          <ToggleGroupItem value="pending_invite" data-testid="filter-invited">Invited</ToggleGroupItem>
        </ToggleGroup>

        {selectedIds.length > 0 && (
          <div className="ml-auto flex items-center gap-2">
            <span className="text-sm text-muted-foreground" data-testid="text-selected-count">{selectedIds.length} selected</span>
            <Button variant="outline" onClick={handleBulkDeactivate} data-testid="button-bulk-deactivate">
              Deactivate
            </Button>
            <Button variant="destructive" onClick={handleBulkRemove} data-testid="button-bulk-remove">
              Remove
            </Button>
          </div>
        )}
      </div>

      <div className="rounded-md border">
        {isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[44px]">
                  <Checkbox
                    checked={allVisibleSelected}
                    onCheckedChange={(v) => {
                      const next = { ...selected };
                      filtered.forEach(r => (next[r.id] = Boolean(v)));
                      setSelected(next);
                    }}
                    data-testid="checkbox-select-all"
                  />
                </TableHead>
                <TableHead>User</TableHead>
                <TableHead>Display name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((row) => (
                <TableRow key={row.id} data-testid={`row-user-${row.id}`}>
                  <TableCell>
                    <Checkbox
                      checked={Boolean(selected[row.id])}
                      onCheckedChange={(v) => setSelected(prev => ({ ...prev, [row.id]: Boolean(v) }))}
                      data-testid={`checkbox-user-${row.id}`}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                        {row.fullName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-medium" data-testid={`text-user-name-${row.id}`}>{row.fullName}</span>
                        <span className="text-sm text-muted-foreground" data-testid={`text-user-email-${row.id}`}>{row.email}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm" data-testid={`text-user-alias-${row.id}`}>
                      {row.aliasName?.trim() ? row.aliasName : "—"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm" data-testid={`text-user-role-${row.id}`}>{row.role?.name || "—"}</span>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={row.status || "active"} />
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" data-testid={`button-user-actions-${row.id}`}>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleOpenEdit(row)}>Edit</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleChangeRole(row.id)}>Change role</DropdownMenuItem>
                        {row.status === "active" && (
                          <DropdownMenuItem onClick={() => handleViewAsUser(row.id)} data-testid={`button-view-as-${row.id}`}>
                            <Eye className="h-4 w-4 mr-2" />
                            View as user
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => handleViewLoginHistory(row)} data-testid={`button-login-history-${row.id}`}>
                          <Clock className="h-4 w-4 mr-2" />
                          Login history
                        </DropdownMenuItem>
                        {row.status === "active" && (
                          <DropdownMenuItem onClick={() => deactivateMutation.mutate(row.id)}>Deactivate</DropdownMenuItem>
                        )}
                        {row.status === "inactive" && (
                          <DropdownMenuItem onClick={() => activateMutation.mutate(row.id)}>Activate</DropdownMenuItem>
                        )}
                        {row.status === "pending_invite" && (
                          <DropdownMenuItem onClick={() => inviteMutation.mutate(row.id)}>Resend invite</DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => deleteMutation.mutate(row.id)}
                        >
                          Remove
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                    No users found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle data-testid="dialog-title-user">
              {editingUser ? "Edit User" : isInviteMode ? "Invite User" : "Add User"}
            </DialogTitle>
            <DialogDescription>
              {editingUser 
                ? "Update user details" 
                : isInviteMode 
                  ? "Send an invitation to join your account" 
                  : "Add a new team member without sending an invite"}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="John Doe" data-testid="input-user-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input {...field} type="email" placeholder="john@example.com" data-testid="input-user-email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="aliasName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display Name (shown to customers/patients)</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} placeholder="Dr. John" data-testid="input-user-alias" />
                    </FormControl>
                    <FormDescription>This name appears on bookings, invoices, and messages.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="jobTitle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Job Title</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} placeholder="Senior Consultant" data-testid="input-user-title" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="tenantRoleId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger data-testid="select-user-role">
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {roles.map((role) => (
                          <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-submit-user">
                  {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {editingUser ? "Update" : isInviteMode ? "Send Invite" : "Add User"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={changeRoleDialogOpen} onOpenChange={setChangeRoleDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Change Role</DialogTitle>
            <DialogDescription>Select a new role for this user</DialogDescription>
          </DialogHeader>
          <Select value={newRoleId} onValueChange={setNewRoleId}>
            <SelectTrigger data-testid="select-change-role">
              <SelectValue placeholder="Select a role" />
            </SelectTrigger>
            <SelectContent>
              {roles.map((role) => (
                <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChangeRoleDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveRoleChange} disabled={!newRoleId} data-testid="button-save-role-change">
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={loginHistoryOpen} onOpenChange={setLoginHistoryOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Login History</DialogTitle>
            <DialogDescription>
              {loginHistoryStaff?.aliasName || loginHistoryStaff?.fullName} ({loginHistoryStaff?.email})
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[400px]">
            {loginHistoryLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : !loginHistoryData?.entries?.length ? (
              <div className="text-center py-8 text-muted-foreground">
                No login history available.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>IP Address</TableHead>
                    <TableHead>Device</TableHead>
                    <TableHead>Auth Method</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loginHistoryData.entries.map((entry) => {
                    const { browser, os } = parseUserAgent(entry.userAgent);
                    return (
                      <TableRow key={entry.id} data-testid={`login-history-row-${entry.id}`}>
                        <TableCell className="whitespace-nowrap">
                          {new Date(entry.loginAt).toLocaleString()}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {entry.ipAddress || "—"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Monitor className="h-3 w-3 text-muted-foreground" />
                            <span>{browser}</span>
                            <span className="text-muted-foreground">·</span>
                            <span>{os}</span>
                          </div>
                        </TableCell>
                        <TableCell className="uppercase text-xs">
                          {entry.authProvider}
                        </TableCell>
                        <TableCell>
                          {entry.isImpersonated ? (
                            <Badge variant="outline" className="text-amber-600 border-amber-300">
                              Impersonated by {entry.impersonatedByStaffName || "Admin"}
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Normal</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </ScrollArea>
          {loginHistoryData && loginHistoryData.total > 20 && (
            <div className="text-sm text-muted-foreground text-center pt-2">
              Showing {loginHistoryData.entries.length} of {loginHistoryData.total} entries
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RolesTab() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<Record<string, boolean>>({});
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [isCloning, setIsCloning] = useState(false);

  const { data: roles = [], isLoading } = useQuery<TenantRoleWithPermissions[]>({
    queryKey: ["/api/settings/roles"],
  });

  const { data: permissionGroups = {} } = useQuery<PermissionGroups>({
    queryKey: ["/api/settings/roles/permission-groups"],
  });

  const form = useForm<z.infer<typeof roleFormSchema>>({
    resolver: zodResolver(roleFormSchema),
    defaultValues: { name: "", description: null },
  });

  const selectedRole = roles.find(r => r.id === selectedRoleId);

  const filteredRoles = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return roles;
    return roles.filter(r => r.name.toLowerCase().includes(q));
  }, [roles, searchQuery]);

  const createMutation = useMutation({
    mutationFn: (data: z.infer<typeof roleFormSchema> & { permissions: string[] }) =>
      apiRequest("POST", "/api/settings/roles", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/roles"] });
      setCreateDialogOpen(false);
      form.reset();
      setIsCloning(false);
      toast({ title: "Role created" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { permissions: string[] } }) =>
      apiRequest("PUT", `/api/settings/roles/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/roles"] });
      toast({ title: "Role updated" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/settings/roles/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/roles"] });
      setSelectedRoleId(null);
      toast({ title: "Role deleted" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleSelectRole = (roleId: string) => {
    const role = roles.find(r => r.id === roleId);
    setSelectedRoleId(roleId);
    if (role) {
      const perms: Record<string, boolean> = {};
      role.permissions.forEach(p => (perms[p] = true));
      setSelectedPermissions(perms);
    }
  };

  const handleCreateNew = () => {
    setIsCloning(false);
    form.reset({ name: "", description: null });
    setSelectedPermissions({});
    setCreateDialogOpen(true);
  };

  const handleClone = () => {
    if (!selectedRole) return;
    setIsCloning(true);
    form.reset({ name: `${selectedRole.name} (Copy)`, description: selectedRole.description });
    const perms: Record<string, boolean> = {};
    selectedRole.permissions.forEach(p => (perms[p] = true));
    setSelectedPermissions(perms);
    setCreateDialogOpen(true);
  };

  const handleSave = () => {
    if (!selectedRoleId) return;
    const permissions = Object.entries(selectedPermissions).filter(([, v]) => v).map(([k]) => k);
    updateMutation.mutate({ id: selectedRoleId, data: { permissions } });
  };

  const handleDelete = () => {
    if (selectedRoleId) {
      deleteMutation.mutate(selectedRoleId);
    }
  };

  const onSubmitCreate = (data: z.infer<typeof roleFormSchema>) => {
    const permissions = Object.entries(selectedPermissions).filter(([, v]) => v).map(([k]) => k);
    createMutation.mutate({ ...data, permissions });
  };

  const togglePermission = (key: string, checked: boolean) => {
    setSelectedPermissions(prev => ({ ...prev, [key]: checked }));
  };

  const formatPermissionLabel = (permission: string) => {
    return permission.replace(/_/g, " ").replace(/:/g, " - ");
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="rounded-md border p-4">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="font-semibold">Roles</div>
            <Button size="sm" onClick={handleCreateNew} data-testid="button-new-role">
              <Plus className="mr-1 h-3 w-3" />
              New role
            </Button>
          </div>

          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search roles..."
            className="mb-3"
            data-testid="input-search-roles"
          />

          <div className="space-y-1">
            {filteredRoles.map(r => (
              <button
                key={r.id}
                onClick={() => handleSelectRole(r.id)}
                className={`w-full rounded-md px-3 py-2 text-left transition-colors ${
                  r.id === selectedRoleId ? "bg-muted" : "hover:bg-muted/60"
                }`}
                data-testid={`button-select-role-${r.id}`}
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium">{r.name}</span>
                  {r.isSystem && <Badge variant="outline" className="text-xs">System</Badge>}
                </div>
                {r.description && (
                  <div className="text-xs text-muted-foreground line-clamp-1">{r.description}</div>
                )}
              </button>
            ))}
            {filteredRoles.length === 0 && (
              <div className="py-4 text-center text-sm text-muted-foreground">No roles found.</div>
            )}
          </div>
        </div>

        <div className="rounded-md border">
          {selectedRole ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
                <div>
                  <div className="text-lg font-semibold" data-testid="text-selected-role-name">{selectedRole.name}</div>
                  <div className="text-sm text-muted-foreground">Configure what this role can access</div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleClone} data-testid="button-clone-role">
                    <Copy className="mr-2 h-4 w-4" />
                    Clone
                  </Button>
                  {!selectedRole.isSystem && (
                    <Button variant="destructive" onClick={handleDelete} data-testid="button-delete-role">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </Button>
                  )}
                  {!selectedRole.isSystem && (
                    <Button onClick={handleSave} disabled={updateMutation.isPending} data-testid="button-save-role">
                      {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Save
                    </Button>
                  )}
                </div>
              </div>

              <div className="p-4">
                <div className="grid gap-4 lg:grid-cols-2">
                  {Object.entries(permissionGroups).map(([group, permissions]) => (
                    <div key={group} className="rounded-md border p-4">
                      <div className="font-semibold mb-2">{group}</div>
                      <Separator className="mb-3" />
                      <div className="space-y-3">
                        {permissions.map(p => (
                          <label key={p} className="flex items-start gap-3 cursor-pointer">
                            <Checkbox
                              checked={Boolean(selectedPermissions[p])}
                              onCheckedChange={(v) => togglePermission(p, Boolean(v))}
                              disabled={selectedRole.isSystem ?? false}
                              data-testid={`checkbox-perm-${p}`}
                            />
                            <span className="text-sm">{formatPermissionLabel(p)}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center py-20 text-muted-foreground">
              Select a role to view and edit permissions
            </div>
          )}
        </div>
      </div>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isCloning ? "Clone Role" : "Create Role"}</DialogTitle>
            <DialogDescription>
              {isCloning ? "Create a copy of this role with a new name" : "Create a new role with specific permissions"}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmitCreate)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Manager" data-testid="input-role-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} placeholder="Role description" data-testid="input-role-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-4 lg:grid-cols-2">
                {Object.entries(permissionGroups).map(([group, permissions]) => (
                  <div key={group} className="rounded-md border p-4">
                    <div className="font-semibold mb-2">{group}</div>
                    <Separator className="mb-3" />
                    <div className="space-y-3">
                      {permissions.map(p => (
                        <label key={p} className="flex items-start gap-3 cursor-pointer">
                          <Checkbox
                            checked={Boolean(selectedPermissions[p])}
                            onCheckedChange={(v) => togglePermission(p, Boolean(v))}
                            data-testid={`checkbox-create-perm-${p}`}
                          />
                          <span className="text-sm">{formatPermissionLabel(p)}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-role">
                  {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {isCloning ? "Clone" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
