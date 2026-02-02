import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Users, Shield, Plus, MoreVertical, Mail, Pencil, Trash2, Loader2 } from "lucide-react";
import { insertTenantStaffSchema, insertTenantRoleSchema, type TenantRole, type TenantStaff } from "@shared/schema";

type TenantStaffMember = TenantStaff & {
  role: { id: string; name: string } | null;
};

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

export default function StaffRolesSettings() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("staff");
  const [staffDialogOpen, setStaffDialogOpen] = useState(false);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<TenantStaffMember | null>(null);
  const [editingRole, setEditingRole] = useState<TenantRoleWithPermissions | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  const { data: staffList = [], isLoading: staffLoading } = useQuery<TenantStaffMember[]>({
    queryKey: ["/api/settings/staff"],
  });

  const { data: roles = [], isLoading: rolesLoading } = useQuery<TenantRoleWithPermissions[]>({
    queryKey: ["/api/settings/roles"],
  });

  const { data: permissionGroups = {} } = useQuery<PermissionGroups>({
    queryKey: ["/api/settings/roles/permission-groups"],
  });

  const staffForm = useForm<z.infer<typeof staffFormSchema>>({
    resolver: zodResolver(staffFormSchema),
    defaultValues: {
      fullName: "",
      email: "",
      aliasName: "",
      phone: "",
      jobTitle: "",
      tenantRoleId: "",
    },
  });

  const roleForm = useForm<z.infer<typeof roleFormSchema>>({
    resolver: zodResolver(roleFormSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  const createStaffMutation = useMutation({
    mutationFn: (data: z.infer<typeof staffFormSchema>) =>
      apiRequest("POST", "/api/settings/staff", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/staff"] });
      setStaffDialogOpen(false);
      staffForm.reset();
      toast({ title: "Staff member added" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateStaffMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<z.infer<typeof staffFormSchema>> }) =>
      apiRequest("PUT", `/api/settings/staff/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/staff"] });
      setStaffDialogOpen(false);
      setEditingStaff(null);
      staffForm.reset();
      toast({ title: "Staff member updated" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteStaffMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest("DELETE", `/api/settings/staff/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/staff"] });
      toast({ title: "Staff member removed" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const inviteStaffMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest("POST", `/api/settings/staff/${id}/invite`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/staff"] });
      toast({ title: "Invite sent" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const createRoleMutation = useMutation({
    mutationFn: (data: z.infer<typeof roleFormSchema> & { permissions: string[] }) =>
      apiRequest("POST", "/api/settings/roles", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/roles"] });
      setRoleDialogOpen(false);
      roleForm.reset();
      setSelectedPermissions([]);
      toast({ title: "Role created" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<z.infer<typeof roleFormSchema>> & { permissions?: string[] } }) =>
      apiRequest("PUT", `/api/settings/roles/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/roles"] });
      setRoleDialogOpen(false);
      setEditingRole(null);
      roleForm.reset();
      setSelectedPermissions([]);
      toast({ title: "Role updated" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteRoleMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest("DELETE", `/api/settings/roles/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/roles"] });
      toast({ title: "Role deleted" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleAddStaff = () => {
    setEditingStaff(null);
    staffForm.reset();
    setStaffDialogOpen(true);
  };

  const handleEditStaff = (member: TenantStaffMember) => {
    setEditingStaff(member);
    staffForm.reset({
      fullName: member.fullName,
      email: member.email,
      aliasName: member.aliasName || "",
      phone: member.phone || "",
      jobTitle: member.jobTitle || "",
      tenantRoleId: member.tenantRoleId || "",
    });
    setStaffDialogOpen(true);
  };

  const handleAddRole = () => {
    setEditingRole(null);
    roleForm.reset();
    setSelectedPermissions([]);
    setRoleDialogOpen(true);
  };

  const handleEditRole = (role: TenantRole) => {
    setEditingRole(role);
    roleForm.reset({
      name: role.name,
      description: role.description || "",
    });
    setSelectedPermissions(role.permissions);
    setRoleDialogOpen(true);
  };

  const onSubmitStaff = (data: z.infer<typeof staffFormSchema>) => {
    if (editingStaff) {
      updateStaffMutation.mutate({ id: editingStaff.id, data });
    } else {
      createStaffMutation.mutate(data);
    }
  };

  const onSubmitRole = (data: z.infer<typeof roleFormSchema>) => {
    if (editingRole) {
      updateRoleMutation.mutate({ id: editingRole.id, data: { ...data, permissions: selectedPermissions } });
    } else {
      createRoleMutation.mutate({ ...data, permissions: selectedPermissions });
    }
  };

  const togglePermission = (permission: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(permission) ? prev.filter((p) => p !== permission) : [...prev, permission]
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge variant="default" className="bg-green-600">Active</Badge>;
      case "inactive":
        return <Badge variant="secondary">Inactive</Badge>;
      case "pending_invite":
        return <Badge variant="outline">Pending Invite</Badge>;
      case "suspended":
        return <Badge variant="destructive">Suspended</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold" data-testid="text-page-title">Users & Roles</h1>
        <p className="text-muted-foreground">Manage team members and their access permissions</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="staff" className="gap-2" data-testid="tab-staff">
            <Users className="h-4 w-4" />
            Staff
          </TabsTrigger>
          <TabsTrigger value="roles" className="gap-2" data-testid="tab-roles">
            <Shield className="h-4 w-4" />
            Roles
          </TabsTrigger>
        </TabsList>

        <TabsContent value="staff">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <div>
                <CardTitle>Team Members</CardTitle>
                <CardDescription>Add and manage staff members who can access your business</CardDescription>
              </div>
              <Button onClick={handleAddStaff} data-testid="button-add-staff">
                <Plus className="h-4 w-4 mr-2" />
                Add Staff
              </Button>
            </CardHeader>
            <CardContent>
              {staffLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : staffList.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No staff members yet. Add your first team member to get started.
                </div>
              ) : (
                <div className="space-y-4">
                  {staffList.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-4 border rounded-md"
                      data-testid={`row-staff-${member.id}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-medium">
                            {member.fullName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                          </span>
                        </div>
                        <div>
                          <div className="font-medium">{member.fullName}</div>
                          <div className="text-sm text-muted-foreground">{member.email}</div>
                          {member.aliasName && (
                            <div className="text-xs text-muted-foreground">Display name: {member.aliasName}</div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {member.role && <Badge variant="outline">{member.role.name}</Badge>}
                        {getStatusBadge(member.status)}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" data-testid={`button-staff-actions-${member.id}`}>
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditStaff(member)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            {member.status !== "active" && !member.userId && (
                              <DropdownMenuItem onClick={() => inviteStaffMutation.mutate(member.id)}>
                                <Mail className="h-4 w-4 mr-2" />
                                Send Invite
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => deleteStaffMutation.mutate(member.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Remove
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="roles">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <div>
                <CardTitle>Roles & Permissions</CardTitle>
                <CardDescription>Define what each role can access and modify</CardDescription>
              </div>
              <Button onClick={handleAddRole} data-testid="button-add-role">
                <Plus className="h-4 w-4 mr-2" />
                Create Role
              </Button>
            </CardHeader>
            <CardContent>
              {rolesLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : roles.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No roles defined yet. Default roles will be created when you add your first staff member.
                </div>
              ) : (
                <div className="space-y-4">
                  {roles.map((role) => (
                    <div
                      key={role.id}
                      className="flex items-center justify-between p-4 border rounded-md"
                      data-testid={`row-role-${role.id}`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{role.name}</span>
                          {role.isDefault && <Badge variant="secondary">Default</Badge>}
                          {role.isSystem && <Badge variant="outline">System</Badge>}
                        </div>
                        {role.description && (
                          <div className="text-sm text-muted-foreground">{role.description}</div>
                        )}
                        <div className="text-xs text-muted-foreground mt-1">
                          {role.permissions.length} permissions
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {!role.isSystem && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" data-testid={`button-role-actions-${role.id}`}>
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEditRole(role)}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => deleteRoleMutation.mutate(role.id)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                        {role.isSystem && (
                          <Button variant="ghost" size="sm" onClick={() => handleEditRole(role)}>
                            View Permissions
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={staffDialogOpen} onOpenChange={setStaffDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingStaff ? "Edit Staff Member" : "Add Staff Member"}</DialogTitle>
            <DialogDescription>
              {editingStaff ? "Update staff member details" : "Add a new team member to your business"}
            </DialogDescription>
          </DialogHeader>
          <Form {...staffForm}>
            <form onSubmit={staffForm.handleSubmit(onSubmitStaff)} className="space-y-4">
              <FormField
                control={staffForm.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="John Doe" data-testid="input-staff-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={staffForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input {...field} type="email" placeholder="john@example.com" data-testid="input-staff-email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={staffForm.control}
                name="aliasName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display Name (optional)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Dr. John" data-testid="input-staff-alias" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={staffForm.control}
                name="jobTitle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Job Title (optional)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Senior Consultant" data-testid="input-staff-title" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={staffForm.control}
                name="tenantRoleId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-staff-role">
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {roles.map((role) => (
                          <SelectItem key={role.id} value={role.id}>
                            {role.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setStaffDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createStaffMutation.isPending || updateStaffMutation.isPending}
                  data-testid="button-submit-staff"
                >
                  {(createStaffMutation.isPending || updateStaffMutation.isPending) && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  {editingStaff ? "Update" : "Add"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRole ? (editingRole.isSystem ? "View Role" : "Edit Role") : "Create Role"}</DialogTitle>
            <DialogDescription>
              {editingRole?.isSystem
                ? "System roles cannot be modified"
                : editingRole
                ? "Update role name and permissions"
                : "Create a new role with specific permissions"}
            </DialogDescription>
          </DialogHeader>
          <Form {...roleForm}>
            <form onSubmit={roleForm.handleSubmit(onSubmitRole)} className="space-y-4">
              <FormField
                control={roleForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role Name</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Manager"
                        disabled={editingRole?.isSystem}
                        data-testid="input-role-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={roleForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (optional)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Role description"
                        disabled={editingRole?.isSystem}
                        data-testid="input-role-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-4">
                <Label>Permissions</Label>
                {Object.entries(permissionGroups).map(([group, permissions]) => (
                  <div key={group} className="space-y-2">
                    <h4 className="font-medium text-sm">{group}</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {permissions.map((permission) => (
                        <label
                          key={permission}
                          className="flex items-center gap-2 text-sm cursor-pointer"
                        >
                          <Checkbox
                            checked={selectedPermissions.includes(permission)}
                            onCheckedChange={() => togglePermission(permission)}
                            disabled={editingRole?.isSystem}
                            data-testid={`checkbox-permission-${permission}`}
                          />
                          <span>{permission.replace(/_/g, " ").toLowerCase()}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {!editingRole?.isSystem && (
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setRoleDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createRoleMutation.isPending || updateRoleMutation.isPending}
                    data-testid="button-submit-role"
                  >
                    {(createRoleMutation.isPending || updateRoleMutation.isPending) && (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    )}
                    {editingRole ? "Update" : "Create"}
                  </Button>
                </DialogFooter>
              )}
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
