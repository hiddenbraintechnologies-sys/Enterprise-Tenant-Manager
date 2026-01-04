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
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Plus,
  Pencil,
  Trash2,
  Building,
  Settings,
  Package,
  Shield,
  Layers,
} from "lucide-react";

interface BusinessType {
  id: string;
  code: string;
  name: string;
  description: string | null;
  enabled: boolean;
  defaultModules: string[];
  defaultFeatures: string[];
  onboardingFlowId: string | null;
  compliancePacks: string[];
  displayOrder: number;
  icon: string | null;
  createdAt: string;
  updatedAt: string;
}

const businessTypeSchema = z.object({
  code: z.string().min(1, "Code is required").max(50).regex(/^[a-z_]+$/, "Code must be lowercase with underscores"),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  enabled: z.boolean().default(true),
  defaultModules: z.array(z.string()).default([]),
  defaultFeatures: z.array(z.string()).default([]),
  onboardingFlowId: z.string().nullable().optional(),
  compliancePacks: z.array(z.string()).default([]),
  displayOrder: z.number().int().min(0).default(0),
  icon: z.string().nullable().optional(),
});

type BusinessTypeFormData = z.infer<typeof businessTypeSchema>;

function BusinessTypeCard({ 
  businessType, 
  onEdit, 
  onDelete, 
  onToggle 
}: { 
  businessType: BusinessType;
  onEdit: (bt: BusinessType) => void;
  onDelete: (bt: BusinessType) => void;
  onToggle: (bt: BusinessType) => void;
}) {
  return (
    <Card data-testid={`card-business-type-${businessType.code}`}>
      <CardHeader className="flex flex-row items-start justify-between gap-4 pb-2">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-md bg-muted">
            <Building className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <CardTitle className="text-lg">{businessType.name}</CardTitle>
            <CardDescription className="font-mono text-xs">{businessType.code}</CardDescription>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            checked={businessType.enabled}
            onCheckedChange={() => onToggle(businessType)}
            data-testid={`switch-enable-${businessType.code}`}
          />
          <Badge variant={businessType.enabled ? "default" : "secondary"}>
            {businessType.enabled ? "Enabled" : "Disabled"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {businessType.description && (
          <p className="text-sm text-muted-foreground">{businessType.description}</p>
        )}
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Modules:</span>
            <span className="font-medium">{businessType.defaultModules?.length || 0}</span>
          </div>
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Features:</span>
            <span className="font-medium">{businessType.defaultFeatures?.length || 0}</span>
          </div>
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Compliance:</span>
            <span className="font-medium">{businessType.compliancePacks?.length || 0}</span>
          </div>
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Order:</span>
            <span className="font-medium">{businessType.displayOrder}</span>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => onEdit(businessType)}
            data-testid={`button-edit-${businessType.code}`}
          >
            <Pencil className="h-4 w-4 mr-1" /> Edit
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => onDelete(businessType)}
            data-testid={`button-delete-${businessType.code}`}
          >
            <Trash2 className="h-4 w-4 mr-1" /> Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function BusinessRegistryContent() {
  const { toast } = useToast();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingType, setEditingType] = useState<BusinessType | null>(null);
  const [deletingType, setDeletingType] = useState<BusinessType | null>(null);

  const { data: businessTypes, isLoading } = useQuery<BusinessType[]>({
    queryKey: ["/api/platform-admin/business-registry"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: BusinessTypeFormData) => {
      return apiRequest("POST", "/api/platform-admin/business-registry", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/platform-admin/business-registry"] });
      setIsAddOpen(false);
      toast({ title: "Business type created", description: "The business type has been added." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to create business type", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<BusinessTypeFormData> }) => {
      return apiRequest("PATCH", `/api/platform-admin/business-registry/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/platform-admin/business-registry"] });
      setEditingType(null);
      toast({ title: "Business type updated", description: "Changes have been saved." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update business type", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/platform-admin/business-registry/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/platform-admin/business-registry"] });
      setDeletingType(null);
      toast({ title: "Business type deleted", description: "The business type has been removed." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to delete business type", variant: "destructive" });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("PATCH", `/api/platform-admin/business-registry/${id}/toggle`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/platform-admin/business-registry"] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to toggle business type", variant: "destructive" });
    },
  });

  const form = useForm<BusinessTypeFormData>({
    resolver: zodResolver(businessTypeSchema),
    defaultValues: {
      code: "",
      name: "",
      description: "",
      enabled: true,
      defaultModules: [],
      defaultFeatures: [],
      onboardingFlowId: null,
      compliancePacks: [],
      displayOrder: 0,
      icon: null,
    },
  });

  const editForm = useForm<BusinessTypeFormData>({
    resolver: zodResolver(businessTypeSchema.omit({ code: true })),
  });

  const handleEdit = (bt: BusinessType) => {
    editForm.reset({
      name: bt.name,
      description: bt.description || "",
      enabled: bt.enabled,
      defaultModules: bt.defaultModules || [],
      defaultFeatures: bt.defaultFeatures || [],
      onboardingFlowId: bt.onboardingFlowId,
      compliancePacks: bt.compliancePacks || [],
      displayOrder: bt.displayOrder,
      icon: bt.icon,
    });
    setEditingType(bt);
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground" data-testid="text-business-registry-title">
            Business Type Registry
          </h1>
          <p className="text-muted-foreground">
            Manage the central registry of business types available on the platform.
          </p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-business-type">
              <Plus className="h-4 w-4 mr-2" /> Add Business Type
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Add Business Type</DialogTitle>
              <DialogDescription>
                Create a new business type for tenants to use.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Code</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., salon, gym, clinic" {...field} data-testid="input-code" />
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
                        <Input placeholder="e.g., Salon & Spa" {...field} data-testid="input-name" />
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
                        <Textarea placeholder="Brief description of this business type" {...field} data-testid="input-description" />
                      </FormControl>
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
                          min="0" 
                          {...field} 
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          data-testid="input-display-order" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="enabled"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between">
                      <div>
                        <FormLabel>Enabled</FormLabel>
                        <FormDescription>Available for new tenants</FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-enabled" />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-add">
                    {createMutation.isPending ? "Creating..." : "Create"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {businessTypes?.map((bt) => (
          <BusinessTypeCard
            key={bt.id}
            businessType={bt}
            onEdit={handleEdit}
            onDelete={setDeletingType}
            onToggle={(bt) => toggleMutation.mutate(bt.id)}
          />
        ))}
      </div>

      {businessTypes?.length === 0 && (
        <Card className="p-12 text-center">
          <Building className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No Business Types</h3>
          <p className="text-muted-foreground mb-4">
            Get started by adding your first business type.
          </p>
          <Button onClick={() => setIsAddOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Add Business Type
          </Button>
        </Card>
      )}

      <Dialog open={!!editingType} onOpenChange={(open) => !open && setEditingType(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Business Type</DialogTitle>
            <DialogDescription>
              Update {editingType?.name}. Code cannot be changed.
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit((data) => editingType && updateMutation.mutate({ id: editingType.id, data }))} className="space-y-4">
              <div className="p-3 rounded-md bg-muted">
                <span className="text-sm text-muted-foreground">Code: </span>
                <span className="font-mono">{editingType?.code}</span>
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
              <FormField
                control={editForm.control}
                name="displayOrder"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display Order</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="0" 
                        {...field} 
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        data-testid="input-edit-display-order" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditingType(null)}>
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

      <Dialog open={!!deletingType} onOpenChange={(open) => !open && setDeletingType(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Business Type</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{deletingType?.name}&quot;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingType(null)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => deletingType && deleteMutation.mutate(deletingType.id)}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function SuperAdminBusinessRegistry() {
  return (
    <SuperAdminGuard>
      <BusinessRegistryContent />
    </SuperAdminGuard>
  );
}
