import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useAdmin, SuperAdminGuard } from "@/contexts/admin-context";
import { useState, useEffect } from "react";
import {
  UserCog,
  Search,
  Plus,
  MoreVertical,
  Shield,
  Crown,
  Mail,
  Calendar,
  CheckCircle,
  XCircle,
  Key,
  Eye,
  EyeOff,
  Loader2,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface PlatformAdmin {
  id: string;
  name: string;
  email: string;
  role: "SUPER_ADMIN" | "PLATFORM_ADMIN" | "MANAGER" | "SUPPORT_TEAM";
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  permissions?: string[];
  countryAssignments?: string[];
}

interface CreateAdminFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

interface EditAdminDialogProps {
  admin: PlatformAdmin | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ManagePermissionsDialogProps {
  admin: PlatformAdmin | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const AVAILABLE_PERMISSIONS = [
  { code: "tenants:read", label: "View Tenants", description: "Can view tenant list and details" },
  { code: "tenants:write", label: "Manage Tenants", description: "Can create, update, delete tenants" },
  { code: "users:read", label: "View Users", description: "Can view user list and details" },
  { code: "users:write", label: "Manage Users", description: "Can create, update, delete users" },
  { code: "billing:read", label: "View Billing", description: "Can view billing and invoices" },
  { code: "billing:write", label: "Manage Billing", description: "Can update billing settings" },
  { code: "support:read", label: "View Support Tickets", description: "Can view support tickets" },
  { code: "support:write", label: "Manage Support", description: "Can respond to support tickets" },
  { code: "audit:read", label: "View Audit Logs", description: "Can access audit logs" },
  { code: "settings:read", label: "View Settings", description: "Can view system settings" },
  { code: "settings:write", label: "Manage Settings", description: "Can modify system settings" },
];

function ManagePermissionsDialog({ admin, open, onOpenChange }: ManagePermissionsDialogProps) {
  const { toast } = useToast();
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  const { data: permissionsData, isLoading } = useQuery<{ permissions: string[] }>({
    queryKey: ["/api/platform-admin/admins", admin?.id, "permissions"],
    enabled: !!admin?.id && open,
  });

  useEffect(() => {
    if (permissionsData?.permissions) {
      setSelectedPermissions(permissionsData.permissions);
    }
  }, [permissionsData]);

  const updatePermissionsMutation = useMutation({
    mutationFn: async (permissions: string[]) => {
      return apiRequest("POST", `/api/platform-admin/admins/${admin?.id}/permissions/bulk`, { permissionCodes: permissions });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/platform-admin/admins", admin?.id, "permissions"] });
      toast({ title: "Permissions updated successfully" });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({ 
        title: "Failed to update permissions", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const handleTogglePermission = (code: string) => {
    setSelectedPermissions(prev => 
      prev.includes(code) 
        ? prev.filter(p => p !== code)
        : [...prev, code]
    );
  };

  const handleSave = () => {
    updatePermissionsMutation.mutate(selectedPermissions);
  };

  if (!admin) return null;

  const isSuperAdmin = admin.role === "SUPER_ADMIN";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Manage Permissions</DialogTitle>
          <DialogDescription>
            Configure permissions for {admin.name}
          </DialogDescription>
        </DialogHeader>
        
        {isSuperAdmin ? (
          <div className="py-6 text-center">
            <Crown className="h-12 w-12 mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">
              Super Admins have full access to all platform features.
              No additional permissions need to be configured.
            </p>
          </div>
        ) : isLoading ? (
          <div className="py-6 space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : (
          <div className="space-y-3 max-h-[400px] overflow-y-auto py-2">
            {AVAILABLE_PERMISSIONS.map((perm) => (
              <div
                key={perm.code}
                className="flex items-center justify-between gap-4 p-3 rounded-md border"
              >
                <div className="flex-1">
                  <p className="font-medium text-sm">{perm.label}</p>
                  <p className="text-xs text-muted-foreground">{perm.description}</p>
                </div>
                <Switch
                  checked={selectedPermissions.includes(perm.code)}
                  onCheckedChange={() => handleTogglePermission(perm.code)}
                  data-testid={`switch-permission-${perm.code}`}
                />
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={updatePermissionsMutation.isPending}
          >
            Cancel
          </Button>
          {!isSuperAdmin && (
            <Button
              onClick={handleSave}
              disabled={updatePermissionsMutation.isPending || isLoading}
              data-testid="button-save-permissions"
            >
              {updatePermissionsMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Permissions"
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

type AdminRole = "SUPER_ADMIN" | "PLATFORM_ADMIN" | "MANAGER" | "SUPPORT_TEAM";

function EditAdminDialog({ admin, open, onOpenChange }: EditAdminDialogProps) {
  const { toast } = useToast();
  const [name, setName] = useState(admin?.name || "");
  const [role, setRole] = useState<AdminRole>(admin?.role || "PLATFORM_ADMIN");
  const [countryAssignments, setCountryAssignments] = useState<string[]>(admin?.countryAssignments || []);
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isActive, setIsActive] = useState(admin?.isActive ?? true);

  // Fetch available regions
  const { data: regionsData } = useQuery<{ id: string; countryCode: string; countryName: string }[]>({
    queryKey: ["/api/region-configs"],
  });

  // Reset form when admin changes
  useEffect(() => {
    if (admin) {
      setName(admin.name);
      setRole(admin.role);
      setCountryAssignments(admin.countryAssignments || []);
      setIsActive(admin.isActive);
      setNewPassword("");
    }
  }, [admin]);

  const updateMutation = useMutation({
    mutationFn: async (data: { name?: string; role?: string; password?: string; isActive?: boolean; countryAssignments?: string[] }) => {
      return apiRequest("PATCH", `/api/platform-admin/admins/${admin?.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/platform-admin/admins"] });
      toast({ title: "Admin updated successfully" });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({ 
        title: "Failed to update admin", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const updates: { name?: string; role?: string; password?: string; isActive?: boolean; countryAssignments?: string[] } = {};
    
    if (name !== admin?.name) updates.name = name;
    if (role !== admin?.role) updates.role = role;
    if (isActive !== admin?.isActive) updates.isActive = isActive;
    
    // Include country assignments for MANAGER and SUPPORT_TEAM roles
    if (role === "MANAGER" || role === "SUPPORT_TEAM") {
      updates.countryAssignments = countryAssignments;
    }
    if (newPassword) {
      if (newPassword.length < 8) {
        toast({ title: "Password must be at least 8 characters", variant: "destructive" });
        return;
      }
      if (!/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
        toast({ title: "Password must contain uppercase, lowercase, and number", variant: "destructive" });
        return;
      }
      updates.password = newPassword;
    }
    
    if (Object.keys(updates).length === 0) {
      toast({ title: "No changes to save" });
      return;
    }
    
    updateMutation.mutate(updates);
  };

  if (!admin) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Admin</DialogTitle>
          <DialogDescription>
            Update {admin.name}'s account settings
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Name</Label>
            <Input
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={updateMutation.isPending}
              data-testid="input-edit-admin-name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-email">Email</Label>
            <Input
              id="edit-email"
              value={admin.email}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">Email cannot be changed</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-role">Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as AdminRole)}>
              <SelectTrigger data-testid="select-edit-admin-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                <SelectItem value="PLATFORM_ADMIN">Platform Admin</SelectItem>
                <SelectItem value="MANAGER">Manager</SelectItem>
                <SelectItem value="SUPPORT_TEAM">Support Team</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {role === "SUPER_ADMIN" && "Full access to all features"}
              {role === "PLATFORM_ADMIN" && "Access based on assigned permissions"}
              {role === "MANAGER" && "Operations access for assigned regions"}
              {role === "SUPPORT_TEAM" && "Support tickets for assigned regions"}
            </p>
          </div>

          {(role === "MANAGER" || role === "SUPPORT_TEAM") && (
            <div className="space-y-2">
              <Label>Assigned Regions</Label>
              <div className="flex flex-wrap gap-2 min-h-9 p-2 border rounded-md">
                {regionsData?.map((region) => (
                  <Badge
                    key={region.countryCode}
                    variant={countryAssignments.includes(region.countryCode) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => {
                      if (countryAssignments.includes(region.countryCode)) {
                        setCountryAssignments(countryAssignments.filter(c => c !== region.countryCode));
                      } else {
                        setCountryAssignments([...countryAssignments, region.countryCode]);
                      }
                    }}
                    data-testid={`badge-region-${region.countryCode}`}
                  >
                    {region.countryCode}
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Click to toggle region access. {countryAssignments.length} region{countryAssignments.length !== 1 ? "s" : ""} selected.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="edit-password">New Password (optional)</Label>
            <div className="relative">
              <Input
                id="edit-password"
                type={showPassword ? "text" : "password"}
                placeholder="Leave blank to keep current"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={updateMutation.isPending}
                className="pr-10"
                data-testid="input-edit-admin-password"
              />
              <button
                type="button"
                className="absolute right-0 top-0 h-full px-3 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Must be 8+ characters with uppercase, lowercase, and number
            </p>
          </div>

          <div className="flex items-center justify-between gap-2">
            <div className="space-y-0.5">
              <Label htmlFor="edit-active">Active Status</Label>
              <p className="text-xs text-muted-foreground">
                {isActive ? "Admin can log in" : "Admin is blocked from logging in"}
              </p>
            </div>
            <Switch
              id="edit-active"
              checked={isActive}
              onCheckedChange={setIsActive}
              data-testid="switch-edit-admin-active"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={updateMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={updateMutation.isPending}
              data-testid="button-submit-edit-admin"
            >
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CreateAdminForm({ onSuccess, onCancel }: CreateAdminFormProps) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<AdminRole>("PLATFORM_ADMIN");
  const [countryAssignments, setCountryAssignments] = useState<string[]>([]);
  const [forcePasswordReset, setForcePasswordReset] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch available regions
  const { data: regionsData } = useQuery<{ id: string; countryCode: string; countryName: string }[]>({
    queryKey: ["/api/region-configs"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: {
      name: string;
      email: string;
      password: string;
      role: string;
      forcePasswordReset: boolean;
      countryAssignments?: string[];
    }) => {
      return apiRequest("POST", "/api/platform-admin/admins", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/platform-admin/admins"] });
      toast({ title: "Admin created successfully" });
      onSuccess();
    },
    onError: (error: Error) => {
      toast({ 
        title: "Failed to create admin", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!name.trim()) {
      newErrors.name = "Name is required";
    }
    
    if (!email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Invalid email format";
    }
    
    if (!password) {
      newErrors.password = "Password is required";
    } else if (password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    } else if (!/[A-Z]/.test(password)) {
      newErrors.password = "Password must contain an uppercase letter";
    } else if (!/[a-z]/.test(password)) {
      newErrors.password = "Password must contain a lowercase letter";
    } else if (!/[0-9]/.test(password)) {
      newErrors.password = "Password must contain a number";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      toast({
        title: "Please fix the form errors",
        description: "Check the highlighted fields above",
        variant: "destructive",
      });
      return;
    }
    
    const data: {
      name: string;
      email: string;
      password: string;
      role: string;
      forcePasswordReset: boolean;
      countryAssignments?: string[];
    } = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
      role,
      forcePasswordReset,
    };
    
    // Include country assignments for MANAGER and SUPPORT_TEAM roles
    if (role === "MANAGER" || role === "SUPPORT_TEAM") {
      data.countryAssignments = countryAssignments;
    }
    
    createMutation.mutate(data);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="admin-name">Name</Label>
        <Input
          id="admin-name"
          placeholder="Enter admin name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={createMutation.isPending}
          data-testid="input-admin-name"
        />
        {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="admin-email">Email</Label>
        <Input
          id="admin-email"
          type="email"
          placeholder="admin@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={createMutation.isPending}
          data-testid="input-admin-email-create"
        />
        {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="admin-password">Password</Label>
        <div className="relative">
          <Input
            id="admin-password"
            type={showPassword ? "text" : "password"}
            placeholder="Enter password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={createMutation.isPending}
            className="pr-10"
            data-testid="input-admin-password-create"
          />
          <button
            type="button"
            className="absolute right-0 top-0 h-full px-3 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setShowPassword(!showPassword)}
            tabIndex={-1}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
        <p className="text-xs text-muted-foreground">
          Must be 8+ characters with uppercase, lowercase, and number
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="admin-role">Role</Label>
        <Select value={role} onValueChange={(v) => setRole(v as AdminRole)}>
          <SelectTrigger data-testid="select-admin-role">
            <SelectValue placeholder="Select role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
            <SelectItem value="PLATFORM_ADMIN">Platform Admin</SelectItem>
            <SelectItem value="MANAGER">Manager</SelectItem>
            <SelectItem value="SUPPORT_TEAM">Support Team</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          {role === "SUPER_ADMIN" && "Full access to all features"}
          {role === "PLATFORM_ADMIN" && "Access based on assigned permissions"}
          {role === "MANAGER" && "Operations access for assigned regions"}
          {role === "SUPPORT_TEAM" && "Support tickets for assigned regions"}
        </p>
      </div>

      {(role === "MANAGER" || role === "SUPPORT_TEAM") && (
        <div className="space-y-2">
          <Label>Assigned Regions</Label>
          <div className="flex flex-wrap gap-2 min-h-9 p-2 border rounded-md">
            {regionsData?.map((region) => (
              <Badge
                key={region.countryCode}
                variant={countryAssignments.includes(region.countryCode) ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => {
                  if (countryAssignments.includes(region.countryCode)) {
                    setCountryAssignments(countryAssignments.filter(c => c !== region.countryCode));
                  } else {
                    setCountryAssignments([...countryAssignments, region.countryCode]);
                  }
                }}
                data-testid={`badge-create-region-${region.countryCode}`}
              >
                {region.countryCode}
              </Badge>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Click to toggle region access. {countryAssignments.length} region{countryAssignments.length !== 1 ? "s" : ""} selected.
          </p>
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        <div className="space-y-0.5">
          <Label htmlFor="force-reset">Force Password Reset</Label>
          <p className="text-xs text-muted-foreground">
            Require password change on first login
          </p>
        </div>
        <Switch
          id="force-reset"
          checked={forcePasswordReset}
          onCheckedChange={setForcePasswordReset}
          data-testid="switch-force-password-reset"
        />
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={createMutation.isPending}
          data-testid="button-cancel-create"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={createMutation.isPending}
          data-testid="button-submit-create-admin"
        >
          {createMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Creating...
            </>
          ) : (
            "Create Admin"
          )}
        </Button>
      </div>
    </form>
  );
}

function PlatformAdminsContent() {
  const { admin: currentAdmin } = useAdmin();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<PlatformAdmin | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [permissionsAdmin, setPermissionsAdmin] = useState<PlatformAdmin | null>(null);
  const [isPermissionsDialogOpen, setIsPermissionsDialogOpen] = useState(false);

  const { data, isLoading } = useQuery<{ admins: PlatformAdmin[]; total: number }>({
    queryKey: ["/api/platform-admin/admins"],
    staleTime: 30 * 1000,
  });

  const filteredAdmins = data?.admins?.filter(
    (admin) =>
      admin.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      admin.email.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      return apiRequest("PATCH", `/api/platform-admin/admins/${id}`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/platform-admin/admins"] });
      toast({ title: "Admin status updated" });
    },
    onError: () => {
      toast({ title: "Failed to update admin", variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-9 w-32" />
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

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground" data-testid="text-admins-title">
            Platform Admins
          </h1>
          <p className="text-muted-foreground">
            Manage administrators with access to the platform
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-admin">
              <Plus className="h-4 w-4 mr-2" />
              Add Admin
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create Platform Admin</DialogTitle>
              <DialogDescription>
                Add a new administrator to the platform
              </DialogDescription>
            </DialogHeader>
            <CreateAdminForm 
              onSuccess={() => setIsCreateDialogOpen(false)}
              onCancel={() => setIsCreateDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search admins..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search-admins"
              />
            </div>
            <Badge variant="outline">{data?.total || 0} admins</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {filteredAdmins.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <UserCog className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No admins found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Admin</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAdmins.map((admin) => (
                  <TableRow key={admin.id} data-testid={`row-admin-${admin.id}`}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                          {admin.role === "SUPER_ADMIN" ? (
                            <Crown className="h-5 w-5 text-primary" />
                          ) : (
                            <Shield className="h-5 w-5 text-primary" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{admin.name}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {admin.email}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={admin.role === "SUPER_ADMIN" ? "default" : admin.role === "PLATFORM_ADMIN" ? "secondary" : "outline"}>
                        {admin.role === "SUPER_ADMIN" && "Super Admin"}
                        {admin.role === "PLATFORM_ADMIN" && "Platform Admin"}
                        {admin.role === "MANAGER" && "Manager"}
                        {admin.role === "SUPPORT_TEAM" && "Support Team"}
                      </Badge>
                      {(admin.role === "MANAGER" || admin.role === "SUPPORT_TEAM") && admin.countryAssignments && admin.countryAssignments.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {admin.countryAssignments.length} region{admin.countryAssignments.length !== 1 ? "s" : ""}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      {admin.isActive ? (
                        <Badge variant="default" className="gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="gap-1">
                          <XCircle className="h-3 w-3" />
                          Inactive
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {admin.lastLoginAt ? (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {new Date(admin.lastLoginAt).toLocaleDateString()}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Never</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {new Date(admin.createdAt).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            disabled={admin.id === currentAdmin?.id}
                            data-testid={`button-admin-menu-${admin.id}`}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setEditingAdmin(admin);
                              setIsEditDialogOpen(true);
                            }}
                            data-testid={`button-edit-admin-${admin.id}`}
                          >
                            <UserCog className="h-4 w-4 mr-2" />
                            Edit Admin
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setPermissionsAdmin(admin);
                              setIsPermissionsDialogOpen(true);
                            }}
                            data-testid={`button-manage-permissions-${admin.id}`}
                          >
                            <Key className="h-4 w-4 mr-2" />
                            Manage Permissions
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => toggleStatusMutation.mutate({
                              id: admin.id,
                              isActive: !admin.isActive,
                            })}
                          >
                            {admin.isActive ? (
                              <>
                                <XCircle className="h-4 w-4 mr-2" />
                                Deactivate
                              </>
                            ) : (
                              <>
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Activate
                              </>
                            )}
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

      <EditAdminDialog
        admin={editingAdmin}
        open={isEditDialogOpen}
        onOpenChange={(open) => {
          setIsEditDialogOpen(open);
          if (!open) setEditingAdmin(null);
        }}
      />

      <ManagePermissionsDialog
        admin={permissionsAdmin}
        open={isPermissionsDialogOpen}
        onOpenChange={(open) => {
          setIsPermissionsDialogOpen(open);
          if (!open) setPermissionsAdmin(null);
        }}
      />
    </div>
  );
}

export default function AdminPlatformAdmins() {
  return (
    <SuperAdminGuard>
      <PlatformAdminsContent />
    </SuperAdminGuard>
  );
}
