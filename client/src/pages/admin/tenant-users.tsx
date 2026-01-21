import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation, Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdmin, SuperAdminGuard } from "@/contexts/admin-context";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  Users,
  Search,
  MoreVertical,
  Lock,
  Unlock,
  Key,
  UserMinus,
  Shield,
  CheckCircle,
  XCircle,
  AlertCircle,
  Calendar,
  Mail,
  Building2,
  Trash2,
} from "lucide-react";
import { UserDeleteModal } from "@/components/admin/user-delete-modal";

interface TenantUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  isActive: boolean;
  isLocked: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

interface Tenant {
  id: string;
  name: string;
  slug: string | null;
  businessType: string;
  status: "active" | "suspended" | "cancelled";
}

interface TenantUsersResponse {
  users: TenantUser[];
  total: number;
  tenant: Tenant;
}

const ROLES = [
  { value: "owner", label: "Owner" },
  { value: "admin", label: "Admin" },
  { value: "manager", label: "Manager" },
  { value: "staff", label: "Staff" },
];

function TenantUsersContent() {
  const [, params] = useRoute("/super-admin/tenants/:tenantId/users");
  const tenantId = params?.tenantId;
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { isSuperAdmin } = useAdmin();

  const [searchQuery, setSearchQuery] = useState("");
  const [lockDialogOpen, setLockDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<TenantUser | null>(null);
  const [lockAction, setLockAction] = useState<"lock" | "unlock">("lock");
  const [lockReason, setLockReason] = useState("");

  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
  const [resetReason, setResetReason] = useState("");

  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [removeReason, setRemoveReason] = useState("");

  const [changeRoleDialogOpen, setChangeRoleDialogOpen] = useState(false);
  const [newRole, setNewRole] = useState("");
  
  const [deleteUserDialogOpen, setDeleteUserDialogOpen] = useState(false);
  const [deleteUserData, setDeleteUserData] = useState<{ userId: string; email: string } | null>(null);

  const { data, isLoading, error } = useQuery<TenantUsersResponse>({
    queryKey: ["/api/super-admin/tenants", tenantId, "users"],
    queryFn: async () => {
      const res = await fetch(`/api/super-admin/tenants/${tenantId}/users`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch users");
      return res.json();
    },
    enabled: !!tenantId,
  });

  const lockMutation = useMutation({
    mutationFn: async ({ userId, action }: { userId: string; action: "lock" | "unlock" }) => {
      const endpoint = action === "lock" 
        ? `/api/super-admin/users/${userId}/lock`
        : `/api/super-admin/users/${userId}/unlock`;
      const response = await apiRequest("POST", endpoint, { reason: lockReason, tenantId });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/tenants", tenantId, "users"] });
      toast({
        title: lockAction === "lock" ? "User Locked" : "User Unlocked",
        description: `User has been ${lockAction === "lock" ? "locked" : "unlocked"} successfully.`,
      });
      setLockDialogOpen(false);
      setSelectedUser(null);
      setLockReason("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || `Failed to ${lockAction} user`,
        variant: "destructive",
      });
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await apiRequest("POST", `/api/super-admin/users/${userId}/reset-password`, { 
        reason: resetReason,
        tenantId,
      });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/tenants", tenantId, "users"] });
      toast({
        title: "Password Reset",
        description: `Temporary password: ${data.temporaryPassword}. User will be required to change it on next login.`,
      });
      setResetPasswordDialogOpen(false);
      setSelectedUser(null);
      setResetReason("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reset password",
        variant: "destructive",
      });
    },
  });

  const removeUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await apiRequest("DELETE", `/api/super-admin/tenants/${tenantId}/users/${userId}`, { 
        reason: removeReason,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/tenants", tenantId, "users"] });
      toast({
        title: "User Removed",
        description: "User has been removed from this tenant.",
      });
      setRemoveDialogOpen(false);
      setSelectedUser(null);
      setRemoveReason("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove user",
        variant: "destructive",
      });
    },
  });

  const changeRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const response = await apiRequest("POST", `/api/super-admin/users/${userId}/change-role`, { 
        role,
        tenantId,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/tenants", tenantId, "users"] });
      toast({
        title: "Role Changed",
        description: "User role has been updated successfully.",
      });
      setChangeRoleDialogOpen(false);
      setSelectedUser(null);
      setNewRole("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to change role",
        variant: "destructive",
      });
    },
  });

  const handleLockUser = (user: TenantUser, action: "lock" | "unlock") => {
    setSelectedUser(user);
    setLockAction(action);
    setLockDialogOpen(true);
  };

  const handleResetPassword = (user: TenantUser) => {
    setSelectedUser(user);
    setResetPasswordDialogOpen(true);
  };

  const handleRemoveUser = (user: TenantUser) => {
    setSelectedUser(user);
    setRemoveDialogOpen(true);
  };

  const handleChangeRole = (user: TenantUser) => {
    setSelectedUser(user);
    setNewRole(user.role);
    setChangeRoleDialogOpen(true);
  };

  const getStatusBadge = (user: TenantUser) => {
    if (user.isLocked) {
      return <Badge variant="destructive" className="gap-1"><Lock className="h-3 w-3" />Locked</Badge>;
    }
    if (!user.isActive) {
      return <Badge variant="secondary" className="gap-1"><XCircle className="h-3 w-3" />Inactive</Badge>;
    }
    return <Badge variant="default" className="gap-1"><CheckCircle className="h-3 w-3" />Active</Badge>;
  };

  const filteredUsers = data?.users?.filter((user) => {
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    return (
      user.email.toLowerCase().includes(search) ||
      user.firstName?.toLowerCase().includes(search) ||
      user.lastName?.toLowerCase().includes(search)
    );
  }) || [];

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <Card>
          <CardContent className="p-6">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 py-4 border-b last:border-0">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-6 w-20" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
            <h3 className="text-lg font-medium mb-2">Failed to Load Users</h3>
            <p className="text-muted-foreground mb-4">
              Could not load users for this tenant.
            </p>
            <Button variant="outline" onClick={() => setLocation("/super-admin/tenants")}>
              Back to Tenants
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const tenant = data.tenant;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/super-admin/tenants")} data-testid="button-back">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2" data-testid="text-tenant-users-title">
            <Users className="h-6 w-6" />
            Manage Users
          </h1>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Building2 className="h-4 w-4" />
            <span>{tenant.name}</span>
            <Badge variant={tenant.status === "active" ? "default" : tenant.status === "suspended" ? "secondary" : "destructive"}>
              {tenant.status}
            </Badge>
          </div>
        </div>
      </div>

      {tenant.status === "suspended" && (
        <div className="p-4 bg-yellow-500/10 border border-yellow-500/50 rounded-md flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-yellow-600" />
          <div>
            <p className="font-medium text-yellow-700">Tenant Suspended</p>
            <p className="text-sm text-yellow-600">Users cannot log in while the tenant is suspended.</p>
          </div>
        </div>
      )}

      {tenant.status === "cancelled" && (
        <div className="p-4 bg-destructive/10 border border-destructive/50 rounded-md flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-destructive" />
          <div>
            <p className="font-medium text-destructive">Tenant Cancelled</p>
            <p className="text-sm text-destructive/80">This tenant has been cancelled. Users cannot access the platform.</p>
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <CardTitle>Tenant Users</CardTitle>
              <CardDescription>{data.total} users in this tenant</CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search-users"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No users found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                          <span className="text-sm font-medium text-primary">
                            {(user.firstName?.[0] || user.email[0]).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium">
                            {user.firstName && user.lastName
                              ? `${user.firstName} ${user.lastName}`
                              : user.email.split("@")[0]}
                          </p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        <Shield className="h-3 w-3 mr-1" />
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>{getStatusBadge(user)}</TableCell>
                    <TableCell>
                      {user.lastLoginAt ? (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {new Date(user.lastLoginAt).toLocaleDateString()}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">Never</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {new Date(user.createdAt).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" data-testid={`button-user-menu-${user.id}`}>
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {user.isLocked ? (
                            <DropdownMenuItem onClick={() => handleLockUser(user, "unlock")}>
                              <Unlock className="h-4 w-4 mr-2" />
                              Unlock User
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => handleLockUser(user, "lock")}>
                              <Lock className="h-4 w-4 mr-2" />
                              Lock User
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => handleResetPassword(user)}>
                            <Key className="h-4 w-4 mr-2" />
                            Reset Password
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleChangeRole(user)}>
                            <Shield className="h-4 w-4 mr-2" />
                            Change Role
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {user.role !== "owner" && (
                            <DropdownMenuItem 
                              onClick={() => handleRemoveUser(user)}
                              className="text-destructive"
                            >
                              <UserMinus className="h-4 w-4 mr-2" />
                              Remove from Tenant
                            </DropdownMenuItem>
                          )}
                          {user.role === "owner" && (
                            <DropdownMenuItem disabled className="text-muted-foreground">
                              <AlertCircle className="h-4 w-4 mr-2" />
                              Cannot remove owner
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => {
                              setDeleteUserData({ userId: user.id, email: user.email });
                              setDeleteUserDialogOpen(true);
                            }}
                            className="text-destructive"
                            data-testid={`button-delete-user-${user.id}`}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete User
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={lockDialogOpen} onOpenChange={setLockDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{lockAction === "lock" ? "Lock User" : "Unlock User"}</DialogTitle>
            <DialogDescription>
              {selectedUser && (
                <>
                  You are about to {lockAction} <strong>{selectedUser.email}</strong>.
                  {lockAction === "lock" && " They will not be able to log in until unlocked."}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="lock-reason">Reason</Label>
              <Textarea
                id="lock-reason"
                placeholder={`Enter the reason for ${lockAction}ing this user...`}
                value={lockReason}
                onChange={(e) => setLockReason(e.target.value)}
                rows={3}
                data-testid="textarea-lock-reason"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLockDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant={lockAction === "lock" ? "destructive" : "default"}
              onClick={() => selectedUser && lockMutation.mutate({ userId: selectedUser.id, action: lockAction })}
              disabled={!lockReason.trim() || lockMutation.isPending}
              data-testid="button-confirm-lock"
            >
              {lockMutation.isPending ? "Processing..." : lockAction === "lock" ? "Lock User" : "Unlock User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={resetPasswordDialogOpen} onOpenChange={setResetPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              {selectedUser && (
                <>
                  Generate a temporary password for <strong>{selectedUser.email}</strong>.
                  They will be required to change it on their next login.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reset-reason">Reason</Label>
              <Textarea
                id="reset-reason"
                placeholder="Enter the reason for resetting this password..."
                value={resetReason}
                onChange={(e) => setResetReason(e.target.value)}
                rows={3}
                data-testid="textarea-reset-reason"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetPasswordDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => selectedUser && resetPasswordMutation.mutate(selectedUser.id)}
              disabled={!resetReason.trim() || resetPasswordMutation.isPending}
              data-testid="button-confirm-reset"
            >
              {resetPasswordMutation.isPending ? "Resetting..." : "Reset Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove User from Tenant</DialogTitle>
            <DialogDescription>
              {selectedUser && (
                <>
                  You are about to remove <strong>{selectedUser.email}</strong> from this tenant.
                  They will lose access to all tenant resources.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-3 bg-destructive/10 text-destructive rounded-md text-sm">
              <AlertCircle className="h-4 w-4 inline mr-2" />
              This action cannot be undone. The user will need to be re-invited to regain access.
            </div>
            <div className="space-y-2">
              <Label htmlFor="remove-reason">Reason</Label>
              <Textarea
                id="remove-reason"
                placeholder="Enter the reason for removing this user..."
                value={removeReason}
                onChange={(e) => setRemoveReason(e.target.value)}
                rows={3}
                data-testid="textarea-remove-reason"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => selectedUser && removeUserMutation.mutate(selectedUser.id)}
              disabled={!removeReason.trim() || removeUserMutation.isPending}
              data-testid="button-confirm-remove"
            >
              {removeUserMutation.isPending ? "Removing..." : "Remove User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={changeRoleDialogOpen} onOpenChange={setChangeRoleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change User Role</DialogTitle>
            <DialogDescription>
              {selectedUser && (
                <>
                  Update the role for <strong>{selectedUser.email}</strong>.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-role">New Role</Label>
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger data-testid="select-new-role">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((role) => (
                    <SelectItem 
                      key={role.value} 
                      value={role.value}
                      disabled={role.value === "owner" && selectedUser?.role !== "owner"}
                    >
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedUser?.role === "owner" && newRole !== "owner" && (
              <div className="p-3 bg-yellow-500/10 text-yellow-700 rounded-md text-sm">
                <AlertCircle className="h-4 w-4 inline mr-2" />
                Warning: Changing owner role will require a new owner to be assigned.
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChangeRoleDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => selectedUser && changeRoleMutation.mutate({ userId: selectedUser.id, role: newRole })}
              disabled={!newRole || newRole === selectedUser?.role || changeRoleMutation.isPending}
              data-testid="button-confirm-role"
            >
              {changeRoleMutation.isPending ? "Updating..." : "Change Role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {deleteUserData && tenantId && (
        <UserDeleteModal
          open={deleteUserDialogOpen}
          onOpenChange={(open) => {
            setDeleteUserDialogOpen(open);
            if (!open) setDeleteUserData(null);
          }}
          userId={deleteUserData.userId}
          userEmail={deleteUserData.email}
          tenantId={tenantId}
        />
      )}
    </div>
  );
}

export default function TenantUsers() {
  return (
    <SuperAdminGuard>
      <TenantUsersContent />
    </SuperAdminGuard>
  );
}
