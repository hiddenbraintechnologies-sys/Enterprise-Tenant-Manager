import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus,
  MapPin,
  Users,
  Pencil,
  Trash2,
  Building2,
  Wifi,
  Coffee,
  Monitor,
  Printer,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Space } from "@shared/schema";

const spaceFormSchema = z.object({
  name: z.string().min(1, "Space name is required").max(100),
  location: z.string().max(200).optional(),
  description: z.string().max(500).optional(),
  capacity: z.coerce.number().min(1, "Capacity must be at least 1").optional(),
  amenities: z.array(z.string()).default([]),
});

type SpaceFormValues = z.infer<typeof spaceFormSchema>;

const AMENITY_OPTIONS = [
  { id: "wifi", label: "WiFi", icon: Wifi },
  { id: "coffee", label: "Coffee/Tea", icon: Coffee },
  { id: "monitor", label: "External Monitor", icon: Monitor },
  { id: "printer", label: "Printer", icon: Printer },
  { id: "whiteboard", label: "Whiteboard", icon: Building2 },
  { id: "video_conf", label: "Video Conferencing", icon: Monitor },
  { id: "parking", label: "Parking", icon: MapPin },
  { id: "ac", label: "Air Conditioning", icon: Building2 },
];

function SpaceCard({
  space,
  onEdit,
  onDelete,
}: {
  space: Space;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const amenities = (space.amenities as string[]) || [];

  return (
    <Card data-testid={`card-space-${space.id}`}>
      <CardHeader className="flex flex-row items-start justify-between gap-4 pb-2">
        <div className="flex-1 min-w-0">
          <CardTitle className="text-lg truncate" data-testid={`text-space-name-${space.id}`}>
            {space.name}
          </CardTitle>
          {space.location && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">{space.location}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={onEdit}
            data-testid={`button-edit-space-${space.id}`}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onDelete}
            data-testid={`button-delete-space-${space.id}`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {space.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {space.description}
          </p>
        )}
        <div className="flex items-center justify-between gap-4">
          {space.capacity && (
            <div className="flex items-center gap-1 text-sm">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span data-testid={`text-space-capacity-${space.id}`}>
                {space.capacity} seats
              </span>
            </div>
          )}
          <Badge variant={space.isActive ? "default" : "secondary"}>
            {space.isActive ? "Active" : "Inactive"}
          </Badge>
        </div>
        {amenities.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {amenities.slice(0, 4).map((amenity) => (
              <Badge key={amenity} variant="outline" className="text-xs">
                {AMENITY_OPTIONS.find((a) => a.id === amenity)?.label || amenity}
              </Badge>
            ))}
            {amenities.length > 4 && (
              <Badge variant="outline" className="text-xs">
                +{amenities.length - 4} more
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SpaceFormDialog({
  open,
  onOpenChange,
  space,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  space?: Space;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const isEditing = !!space;

  const form = useForm<SpaceFormValues>({
    resolver: zodResolver(spaceFormSchema),
    defaultValues: {
      name: space?.name || "",
      location: space?.location || "",
      description: space?.description || "",
      capacity: space?.capacity || undefined,
      amenities: (space?.amenities as string[]) || [],
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: SpaceFormValues) =>
      apiRequest("POST", "/api/coworking/spaces", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/coworking/spaces"] });
      toast({ title: "Space created successfully" });
      onSuccess();
      form.reset();
    },
    onError: () => {
      toast({ title: "Failed to create space", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: SpaceFormValues) =>
      apiRequest("PATCH", `/api/coworking/spaces/${space?.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/coworking/spaces"] });
      toast({ title: "Space updated successfully" });
      onSuccess();
    },
    onError: () => {
      toast({ title: "Failed to update space", variant: "destructive" });
    },
  });

  const onSubmit = (data: SpaceFormValues) => {
    if (isEditing) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Space" : "Add New Space"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the details of your coworking space."
              : "Create a new space in your coworking facility."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Space Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Open Workspace A, Meeting Room 1"
                      data-testid="input-space-name"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Floor 2, Building A"
                      data-testid="input-space-location"
                      {...field}
                    />
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
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe the space, its features, etc."
                      className="resize-none"
                      data-testid="input-space-description"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="capacity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Capacity (seats)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      placeholder="e.g., 10"
                      data-testid="input-space-capacity"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="amenities"
              render={() => (
                <FormItem>
                  <FormLabel>Amenities</FormLabel>
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    {AMENITY_OPTIONS.map((amenity) => (
                      <FormField
                        key={amenity.id}
                        control={form.control}
                        name="amenities"
                        render={({ field }) => (
                          <FormItem className="flex items-center gap-2">
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(amenity.id)}
                                onCheckedChange={(checked) => {
                                  const current = field.value || [];
                                  if (checked) {
                                    field.onChange([...current, amenity.id]);
                                  } else {
                                    field.onChange(
                                      current.filter((v) => v !== amenity.id)
                                    );
                                  }
                                }}
                                data-testid={`checkbox-amenity-${amenity.id}`}
                              />
                            </FormControl>
                            <Label className="text-sm font-normal cursor-pointer">
                              {amenity.label}
                            </Label>
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                data-testid="button-save-space"
              >
                {isPending ? "Saving..." : isEditing ? "Update Space" : "Create Space"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function SpacesPage() {
  const { toast } = useToast();
  const [formOpen, setFormOpen] = useState(false);
  const [editingSpace, setEditingSpace] = useState<Space | undefined>();
  const [deleteSpace, setDeleteSpace] = useState<Space | undefined>();

  const { data: spaces, isLoading } = useQuery<Space[]>({
    queryKey: ["/api/coworking/spaces"],
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest("DELETE", `/api/coworking/spaces/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/coworking/spaces"] });
      queryClient.invalidateQueries({ queryKey: ["/api/coworking/desks"] });
      toast({ title: "Space deleted successfully" });
      setDeleteSpace(undefined);
    },
    onError: () => {
      toast({ title: "Failed to delete space", variant: "destructive" });
    },
  });

  const handleEdit = (space: Space) => {
    setEditingSpace(space);
    setFormOpen(true);
  };

  const handleDelete = (space: Space) => {
    setDeleteSpace(space);
  };

  const handleFormSuccess = () => {
    setFormOpen(false);
    setEditingSpace(undefined);
  };

  const handleFormOpenChange = (open: boolean) => {
    setFormOpen(open);
    if (!open) {
      setEditingSpace(undefined);
    }
  };

  return (
    <DashboardLayout
      title="Spaces"
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard/coworking" },
        { label: "Spaces" },
      ]}
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">Manage Spaces</h2>
            <p className="text-sm text-muted-foreground">
              Configure your coworking spaces where desks are located.
            </p>
          </div>
          <Button
            onClick={() => setFormOpen(true)}
            data-testid="button-add-space"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Space
          </Button>
        </div>

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <div className="flex justify-between">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-5 w-14" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : spaces && spaces.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {spaces.map((space) => (
              <SpaceCard
                key={space.id}
                space={space}
                onEdit={() => handleEdit(space)}
                onDelete={() => handleDelete(space)}
              />
            ))}
          </div>
        ) : (
          <Card className="py-12">
            <CardContent className="flex flex-col items-center justify-center text-center">
              <Building2 className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium">No Spaces Yet</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                Get started by adding your first coworking space. Spaces help you organize desks by location or area.
              </p>
              <Button
                className="mt-4"
                onClick={() => setFormOpen(true)}
                data-testid="button-add-first-space"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Your First Space
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <SpaceFormDialog
        open={formOpen}
        onOpenChange={handleFormOpenChange}
        space={editingSpace}
        onSuccess={handleFormSuccess}
      />

      <AlertDialog open={!!deleteSpace} onOpenChange={() => setDeleteSpace(undefined)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Space</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteSpace?.name}"? This will also delete all desks within this space. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteSpace && deleteMutation.mutate(deleteSpace.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete-space"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete Space"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
