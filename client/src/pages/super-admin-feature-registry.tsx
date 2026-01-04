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
  Flag,
  Globe,
  Building,
  Users,
  Layers,
  AlertTriangle,
  ToggleLeft,
} from "lucide-react";

interface Feature {
  id: string;
  code: string;
  name: string;
  description: string | null;
  scope: "global" | "business" | "tenant";
  defaultEnabled: boolean;
  enabled: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

const featureSchema = z.object({
  code: z.string().min(1, "Code is required").max(50).regex(/^[a-z_]+$/, "Code must be lowercase with underscores"),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  scope: z.enum(["global", "business", "tenant"]).default("tenant"),
  defaultEnabled: z.boolean().default(false),
  enabled: z.boolean().default(true),
  displayOrder: z.number().int().min(0).default(0),
});

type FeatureFormData = z.infer<typeof featureSchema>;

const scopeIcons = {
  global: Globe,
  business: Building,
  tenant: Users,
};

const scopeLabels = {
  global: "Global",
  business: "Business",
  tenant: "Tenant",
};

const scopeDescriptions = {
  global: "Applies to all tenants and businesses",
  business: "Can be customized per business type",
  tenant: "Can be customized per tenant",
};

function FeatureCard({ 
  feature, 
  onEdit, 
  onDelete, 
  onToggle 
}: { 
  feature: Feature;
  onEdit: (f: Feature) => void;
  onDelete: (f: Feature) => void;
  onToggle: (f: Feature) => void;
}) {
  const ScopeIcon = scopeIcons[feature.scope];
  
  return (
    <Card data-testid={`card-feature-${feature.code}`}>
      <CardHeader className="flex flex-row items-start justify-between gap-4 pb-2">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-md bg-muted">
            <Flag className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <CardTitle className="text-lg">{feature.name}</CardTitle>
            <CardDescription className="font-mono text-xs">{feature.code}</CardDescription>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            checked={feature.enabled}
            onCheckedChange={() => onToggle(feature)}
            data-testid={`switch-enable-${feature.code}`}
          />
          <Badge variant={feature.enabled ? "default" : "secondary"}>
            {feature.enabled ? "Active" : "Inactive"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {feature.description && (
          <p className="text-sm text-muted-foreground">{feature.description}</p>
        )}
        
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="flex items-center gap-1">
            <ScopeIcon className="h-3 w-3" />
            {scopeLabels[feature.scope]}
          </Badge>
          <Badge variant={feature.defaultEnabled ? "default" : "secondary"} className="flex items-center gap-1">
            <ToggleLeft className="h-3 w-3" />
            Default: {feature.defaultEnabled ? "On" : "Off"}
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1">
            <Layers className="h-3 w-3" />
            Order: {feature.displayOrder}
          </Badge>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => onEdit(feature)}
            data-testid={`button-edit-${feature.code}`}
          >
            <Pencil className="h-4 w-4 mr-1" /> Edit
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => onDelete(feature)}
            data-testid={`button-delete-${feature.code}`}
          >
            <Trash2 className="h-4 w-4 mr-1" /> Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function FeatureRegistryContent() {
  const { toast } = useToast();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingFeature, setEditingFeature] = useState<Feature | null>(null);
  const [deletingFeature, setDeletingFeature] = useState<Feature | null>(null);

  const { data: features, isLoading } = useQuery<Feature[]>({
    queryKey: ["/api/platform-admin/feature-registry"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: FeatureFormData) => {
      return apiRequest("POST", "/api/platform-admin/feature-registry", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/platform-admin/feature-registry"] });
      setIsAddOpen(false);
      form.reset();
      toast({ title: "Feature created", description: "The feature flag has been added." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to create feature", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<FeatureFormData> }) => {
      return apiRequest("PATCH", `/api/platform-admin/feature-registry/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/platform-admin/feature-registry"] });
      setEditingFeature(null);
      toast({ title: "Feature updated", description: "Changes have been saved." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update feature", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/platform-admin/feature-registry/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/platform-admin/feature-registry"] });
      setDeletingFeature(null);
      toast({ title: "Feature deleted", description: "The feature flag has been removed." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to delete feature", variant: "destructive" });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("PATCH", `/api/platform-admin/feature-registry/${id}/toggle`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/platform-admin/feature-registry"] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to toggle feature", variant: "destructive" });
    },
  });

  const form = useForm<FeatureFormData>({
    resolver: zodResolver(featureSchema),
    defaultValues: {
      code: "",
      name: "",
      description: "",
      scope: "tenant",
      defaultEnabled: false,
      enabled: true,
      displayOrder: 0,
    },
  });

  const editForm = useForm<FeatureFormData>({
    resolver: zodResolver(featureSchema.omit({ code: true })),
    defaultValues: {
      name: "",
      description: "",
      scope: "tenant",
      defaultEnabled: false,
      enabled: true,
      displayOrder: 0,
    },
  });

  const handleAdd = (data: FeatureFormData) => {
    createMutation.mutate(data);
  };

  const handleEdit = (data: FeatureFormData) => {
    if (editingFeature) {
      const { code, ...updateData } = data;
      updateMutation.mutate({ id: editingFeature.id, data: updateData });
    }
  };

  const handleDelete = () => {
    if (deletingFeature) {
      deleteMutation.mutate(deletingFeature.id);
    }
  };

  const openEditDialog = (feature: Feature) => {
    setEditingFeature(feature);
    editForm.reset({
      name: feature.name,
      description: feature.description || "",
      scope: feature.scope,
      defaultEnabled: feature.defaultEnabled,
      enabled: feature.enabled,
      displayOrder: feature.displayOrder,
    });
  };

  const globalFeatures = features?.filter(f => f.scope === "global") || [];
  const businessFeatures = features?.filter(f => f.scope === "business") || [];
  const tenantFeatures = features?.filter(f => f.scope === "tenant") || [];

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
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Feature Registry</h1>
          <p className="text-muted-foreground">Manage feature flags with runtime evaluation - no redeploy required</p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-feature">
              <Plus className="h-4 w-4 mr-2" /> Add Feature
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Add New Feature Flag</DialogTitle>
              <DialogDescription>
                Create a feature flag that can be toggled at runtime.
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
                        <Input placeholder="dark_mode" {...field} data-testid="input-code" />
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
                        <Input placeholder="Dark Mode" {...field} data-testid="input-name" />
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
                        <Textarea placeholder="Enable dark mode UI..." {...field} data-testid="input-description" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="scope"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Scope</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-scope">
                              <SelectValue placeholder="Select scope" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="global">Global</SelectItem>
                            <SelectItem value="business">Business</SelectItem>
                            <SelectItem value="tenant">Tenant</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription className="text-xs">{scopeDescriptions[field.value]}</FormDescription>
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
                    name="defaultEnabled"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel>Default</FormLabel>
                          <FormDescription className="text-xs">
                            On by default
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-default-enabled"
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
                          <FormLabel>Active</FormLabel>
                          <FormDescription className="text-xs">
                            Feature is active
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
                    {createMutation.isPending ? "Creating..." : "Create Feature"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {globalFeatures.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Global Features ({globalFeatures.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {globalFeatures.map((feature) => (
              <FeatureCard
                key={feature.id}
                feature={feature}
                onEdit={openEditDialog}
                onDelete={setDeletingFeature}
                onToggle={(f) => toggleMutation.mutate(f.id)}
              />
            ))}
          </div>
        </div>
      )}

      {businessFeatures.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Building className="h-5 w-5" />
            Business Features ({businessFeatures.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {businessFeatures.map((feature) => (
              <FeatureCard
                key={feature.id}
                feature={feature}
                onEdit={openEditDialog}
                onDelete={setDeletingFeature}
                onToggle={(f) => toggleMutation.mutate(f.id)}
              />
            ))}
          </div>
        </div>
      )}

      {tenantFeatures.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Users className="h-5 w-5" />
            Tenant Features ({tenantFeatures.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tenantFeatures.map((feature) => (
              <FeatureCard
                key={feature.id}
                feature={feature}
                onEdit={openEditDialog}
                onDelete={setDeletingFeature}
                onToggle={(f) => toggleMutation.mutate(f.id)}
              />
            ))}
          </div>
        </div>
      )}

      {!features?.length && (
        <Card className="p-12 text-center">
          <Flag className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No features configured</h3>
          <p className="text-muted-foreground mb-4">
            Get started by adding your first feature flag.
          </p>
          <Button onClick={() => setIsAddOpen(true)} data-testid="button-add-first-feature">
            <Plus className="h-4 w-4 mr-2" /> Add First Feature
          </Button>
        </Card>
      )}

      <Dialog open={!!editingFeature} onOpenChange={(open) => !open && setEditingFeature(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Feature</DialogTitle>
            <DialogDescription>
              Update feature details. Code cannot be changed after creation.
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(handleEdit)} className="space-y-4">
              <div className="p-3 bg-muted rounded-md">
                <span className="text-sm text-muted-foreground">Code: </span>
                <span className="font-mono">{editingFeature?.code}</span>
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
                  name="scope"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Scope</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-edit-scope">
                            <SelectValue placeholder="Select scope" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="global">Global</SelectItem>
                          <SelectItem value="business">Business</SelectItem>
                          <SelectItem value="tenant">Tenant</SelectItem>
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
                  name="defaultEnabled"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Default</FormLabel>
                        <FormDescription className="text-xs">
                          On by default
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-edit-default-enabled"
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
                        <FormLabel>Active</FormLabel>
                        <FormDescription className="text-xs">
                          Feature is active
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
                <Button type="button" variant="outline" onClick={() => setEditingFeature(null)}>
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

      <Dialog open={!!deletingFeature} onOpenChange={(open) => !open && setDeletingFeature(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete Feature
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deletingFeature?.name}</strong>? 
              This will also remove all overrides for this feature. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingFeature(null)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDelete} 
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete Feature"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function SuperAdminFeatureRegistry() {
  return (
    <SuperAdminGuard>
      <FeatureRegistryContent />
    </SuperAdminGuard>
  );
}
