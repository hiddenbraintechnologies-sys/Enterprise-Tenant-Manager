import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Clock, IndianRupee, Edit, Trash2, Package } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Service } from "@shared/schema";

const serviceFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  duration: z.coerce.number().min(5, "Duration must be at least 5 minutes"),
  price: z.coerce.number().min(0, "Price must be positive"),
  category: z.string().optional(),
  isActive: z.boolean().default(true),
});

type ServiceFormValues = z.infer<typeof serviceFormSchema>;

const categories = [
  "General",
  "Premium",
  "Package",
  "Consultation",
  "Membership",
  "Other",
];

function ServiceDialog({
  service,
  open,
  onOpenChange,
  onSuccess,
}: {
  service?: Service;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const isEditing = !!service;

  const form = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceFormSchema),
    defaultValues: {
      name: service?.name ?? "",
      description: service?.description ?? "",
      duration: service?.duration ?? 60,
      price: service?.price ? Number(service.price) : 0,
      category: service?.category ?? "General",
      isActive: service?.isActive ?? true,
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: ServiceFormValues) => {
      const payload = {
        ...data,
        price: String(data.price),
      };
      if (isEditing) {
        return apiRequest("PATCH", `/api/services/${service.id}`, payload);
      }
      return apiRequest("POST", "/api/services", payload);
    },
    onSuccess: () => {
      toast({
        title: isEditing ? "Service updated" : "Service created",
        description: isEditing ? "The service has been updated." : "The service has been added.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      onSuccess();
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ServiceFormValues) => {
    mutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Service" : "Add New Service"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Update service information." : "Enter the service details below."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Service Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Haircut" {...field} data-testid="input-service-name" />
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
                    <Textarea placeholder="Service description..." {...field} data-testid="input-service-description" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="duration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duration (minutes)</FormLabel>
                    <FormControl>
                      <Input type="number" min={5} {...field} data-testid="input-service-duration" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price (₹)</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} step="0.01" {...field} data-testid="input-service-price" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-service-category">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-md border p-4">
                  <div>
                    <FormLabel className="text-base">Active</FormLabel>
                    <p className="text-sm text-muted-foreground">
                      Make this service available for booking
                    </p>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      data-testid="switch-service-active"
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending} data-testid="button-save-service">
                {mutation.isPending ? "Saving..." : isEditing ? "Update" : "Add Service"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function ServiceCard({
  service,
  onEdit,
  onDelete,
}: {
  service: Service;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <Card className="group" data-testid={`service-card-${service.id}`}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-medium">{service.name}</h3>
              {!service.isActive && (
                <Badge variant="secondary" className="text-xs">Inactive</Badge>
              )}
            </div>
            {service.description && (
              <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                {service.description}
              </p>
            )}
            <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
              <span className="flex items-center gap-1 text-muted-foreground">
                <Clock className="h-4 w-4" />
                {service.duration} min
              </span>
              <span className="flex items-center gap-1 font-medium">
                <IndianRupee className="h-4 w-4" />
                {Number(service.price).toLocaleString()}
              </span>
              {service.category && (
                <Badge variant="outline">{service.category}</Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <Button
              variant="ghost"
              size="icon"
              onClick={onEdit}
              data-testid={`button-edit-service-${service.id}`}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onDelete}
              data-testid={`button-delete-service-${service.id}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Services() {
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | undefined>();
  const { toast } = useToast();

  const { data: services, isLoading } = useQuery<Service[]>({
    queryKey: ["/api/services"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/services/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Service deleted" });
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const filteredServices = services?.filter((service) =>
    service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    service.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleEdit = (service: Service) => {
    setEditingService(service);
    setDialogOpen(true);
  };

  const handleAdd = () => {
    setEditingService(undefined);
    setDialogOpen(true);
  };

  return (
    <DashboardLayout title="Services" breadcrumbs={[{ label: "Services" }]}>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search services..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search-services"
          />
        </div>
        <Button onClick={handleAdd} data-testid="button-add-service">
          <Plus className="mr-2 h-4 w-4" />
          Add Service
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="mt-2 h-4 w-full" />
                <div className="mt-4 flex gap-4">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-16" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredServices && filteredServices.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredServices.map((service) => (
            <ServiceCard
              key={service.id}
              service={service}
              onEdit={() => handleEdit(service)}
              onDelete={() => deleteMutation.mutate(service.id)}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Package className="h-12 w-12 text-muted-foreground/50" />
            <p className="mt-4 text-muted-foreground">
              {searchQuery ? "No services found" : "No services yet"}
            </p>
            {!searchQuery && (
              <Button className="mt-4" onClick={handleAdd}>
                <Plus className="mr-2 h-4 w-4" />
                Add Your First Service
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      <ServiceDialog
        service={editingService}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={() => setEditingService(undefined)}
      />
    </DashboardLayout>
  );
}
