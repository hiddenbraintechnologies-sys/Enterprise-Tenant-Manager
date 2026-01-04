import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { SuperAdminGuard } from "@/contexts/admin-context";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Plus,
  Pencil,
  Trash2,
  Package,
  Cpu,
  Layers,
  AlertTriangle,
} from "lucide-react";

interface Module {
  id: string;
  code: string;
  name: string;
  description: string | null;
  category: "core" | "optional";
  requiresAi: boolean;
  enabled: boolean;
  displayOrder: number;
  icon: string | null;
  createdAt: string;
  updatedAt: string;
}

const moduleSchema = z.object({
  code: z.string().min(1, "Code is required").max(50).regex(/^[a-z_]+$/, "Code must be lowercase with underscores"),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  category: z.enum(["core", "optional"]).default("optional"),
  requiresAi: z.boolean().default(false),
  enabled: z.boolean().default(true),
  displayOrder: z.number().int().min(0).default(0),
  icon: z.string().nullable().optional(),
});

type ModuleFormData = z.infer<typeof moduleSchema>;

function ModuleCard({ 
  module, 
  onEdit, 
  onDelete, 
  onToggle 
}: { 
  module: Module;
  onEdit: (m: Module) => void;
  onDelete: (m: Module) => void;
  onToggle: (m: Module) => void;
}) {
  return (
    <Card data-testid={`card-module-${module.code}`}>
      <CardHeader className="flex flex-row items-start justify-between gap-4 pb-2">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-md bg-muted">
            <Package className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <CardTitle className="text-lg">{module.name}</CardTitle>
            <CardDescription className="font-mono text-xs">{module.code}</CardDescription>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            checked={module.enabled}
            onCheckedChange={() => onToggle(module)}
            data-testid={`switch-enable-${module.code}`}
          />
          <Badge variant={module.enabled ? "default" : "secondary"}>
            {module.enabled ? "Enabled" : "Disabled"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {module.description && (
          <p className="text-sm text-muted-foreground">{module.description}</p>
        )}
        
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={module.category === "core" ? "default" : "outline"}>
            {module.category === "core" ? "Core" : "Optional"}
          </Badge>
          {module.requiresAi && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <Cpu className="h-3 w-3" />
              Requires AI
            </Badge>
          )}
          <Badge variant="outline" className="flex items-center gap-1">
            <Layers className="h-3 w-3" />
            Order: {module.displayOrder}
          </Badge>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => onEdit(module)}
            data-testid={`button-edit-${module.code}`}
          >
            <Pencil className="h-4 w-4 mr-1" /> Edit
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => onDelete(module)}
            data-testid={`button-delete-${module.code}`}
          >
            <Trash2 className="h-4 w-4 mr-1" /> Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ModuleRegistryContent() {
  const { toast } = useToast();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<Module | null>(null);
  const [deletingModule, setDeletingModule] = useState<Module | null>(null);

  const { data: modules, isLoading } = useQuery<Module[]>({
    queryKey: ["/api/platform-admin/module-registry"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: ModuleFormData) => {
      return apiRequest("POST", "/api/platform-admin/module-registry", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/platform-admin/module-registry"] });
      setIsAddOpen(false);
      toast({ title: "Module created", description: "The module has been added to the registry." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to create module", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ModuleFormData> }) => {
      return apiRequest("PATCH", `/api/platform-admin/module-registry/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/platform-admin/module-registry"] });
      setEditingModule(null);
      toast({ title: "Module updated", description: "Changes have been saved." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update module", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/platform-admin/module-registry/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/platform-admin/module-registry"] });
      setDeletingModule(null);
      toast({ title: "Module deleted", description: "The module has been removed from the registry." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to delete module", variant: "destructive" });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("PATCH", `/api/platform-admin/module-registry/${id}/toggle`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/platform-admin/module-registry"] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to toggle module", variant: "destructive" });
    },
  });

  const form = useForm<ModuleFormData>({
    resolver: zodResolver(moduleSchema),
    defaultValues: {
      code: "",
      name: "",
      description: "",
      category: "optional",
      requiresAi: false,
      enabled: true,
      displayOrder: 0,
      icon: null,
    },
  });

  const editForm = useForm<ModuleFormData>({
    resolver: zodResolver(moduleSchema.omit({ code: true })),
    defaultValues: {
      name: "",
      description: "",
      category: "optional",
      requiresAi: false,
      enabled: true,
      displayOrder: 0,
      icon: null,
    },
  });

  const handleAdd = (data: ModuleFormData) => {
    createMutation.mutate(data);
  };

  const handleEdit = (data: ModuleFormData) => {
    if (editingModule) {
      const { code, ...updateData } = data;
      updateMutation.mutate({ id: editingModule.id, data: updateData });
    }
  };

  const handleDelete = () => {
    if (deletingModule) {
      deleteMutation.mutate(deletingModule.id);
    }
  };

  const openEditDialog = (module: Module) => {
    setEditingModule(module);
    editForm.reset({
      name: module.name,
      description: module.description || "",
      category: module.category,
      requiresAi: module.requiresAi,
      enabled: module.enabled,
      displayOrder: module.displayOrder,
      icon: module.icon,
    });
  };

  const coreModules = modules?.filter(m => m.category === "core") || [];
  const optionalModules = modules?.filter(m => m.category === "optional") || [];

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Module Registry</h1>
          <p className="text-muted-foreground">Manage platform modules that can be assigned to business types</p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-module">
              <Plus className="h-4 w-4 mr-2" /> Add Module
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Add New Module</DialogTitle>
              <DialogDescription>
                Create a new module that can be assigned to business types.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleAdd)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Code</FormLabel>
                      <FormControl>
                        <Input placeholder="inventory_management" {...field} data-testid="input-code" />
                      </FormControl>
                      <FormDescription>Unique identifier (lowercase, underscores only)</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Inventory Management" {...field} data-testid="input-name" />
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
                        <Textarea placeholder="Track and manage inventory..." {...field} data-testid="input-description" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-category">
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="core">Core</SelectItem>
                            <SelectItem value="optional">Optional</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="displayOrder"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Display Order</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min={0} 
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                            data-testid="input-display-order"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="requiresAi"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel>Requires AI</FormLabel>
                          <FormDescription className="text-xs">
                            Needs AI capabilities
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-requires-ai"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="enabled"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel>Enabled</FormLabel>
                          <FormDescription className="text-xs">
                            Available for use
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-enabled"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-add">
                    {createMutation.isPending ? "Creating..." : "Create Module"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {coreModules.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Package className="h-5 w-5" />
            Core Modules ({coreModules.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {coreModules.map((module) => (
              <ModuleCard
                key={module.id}
                module={module}
                onEdit={openEditDialog}
                onDelete={setDeletingModule}
                onToggle={(m) => toggleMutation.mutate(m.id)}
              />
            ))}
          </div>
        </div>
      )}

      {optionalModules.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Layers className="h-5 w-5" />
            Optional Modules ({optionalModules.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {optionalModules.map((module) => (
              <ModuleCard
                key={module.id}
                module={module}
                onEdit={openEditDialog}
                onDelete={setDeletingModule}
                onToggle={(m) => toggleMutation.mutate(m.id)}
              />
            ))}
          </div>
        </div>
      )}

      {!modules?.length && (
        <Card className="p-12 text-center">
          <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No modules configured</h3>
          <p className="text-muted-foreground mb-4">
            Get started by adding your first module to the registry.
          </p>
          <Button onClick={() => setIsAddOpen(true)} data-testid="button-add-first-module">
            <Plus className="h-4 w-4 mr-2" /> Add First Module
          </Button>
        </Card>
      )}

      <Dialog open={!!editingModule} onOpenChange={(open) => !open && setEditingModule(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Module</DialogTitle>
            <DialogDescription>
              Update module details. Code cannot be changed after creation.
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(handleEdit)} className="space-y-4">
              <div className="p-3 bg-muted rounded-md">
                <span className="text-sm text-muted-foreground">Code: </span>
                <span className="font-mono">{editingModule?.code}</span>
              </div>
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-edit-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea {...field} value={field.value || ""} data-testid="input-edit-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-edit-category">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="core">Core</SelectItem>
                          <SelectItem value="optional">Optional</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="displayOrder"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Display Order</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min={0} 
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          data-testid="input-edit-display-order"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="requiresAi"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Requires AI</FormLabel>
                        <FormDescription className="text-xs">
                          Needs AI capabilities
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-edit-requires-ai"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="enabled"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Enabled</FormLabel>
                        <FormDescription className="text-xs">
                          Available for use
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-edit-enabled"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditingModule(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateMutation.isPending} data-testid="button-submit-edit">
                  {updateMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deletingModule} onOpenChange={(open) => !open && setDeletingModule(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete Module
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deletingModule?.name}</strong>? 
              This action cannot be undone. Any business types using this module will need to be updated.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingModule(null)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDelete} 
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete Module"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function SuperAdminModuleRegistry() {
  return (
    <SuperAdminGuard>
      <ModuleRegistryContent />
    </SuperAdminGuard>
  );
}
