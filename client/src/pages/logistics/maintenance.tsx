import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, Wrench, Calendar, AlertTriangle } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const maintenanceFormSchema = z.object({
  vehicleId: z.string().min(1, "Vehicle is required"),
  maintenanceType: z.string().min(1, "Maintenance type is required"),
  description: z.string().optional(),
  scheduledDate: z.string().min(1, "Scheduled date is required"),
  estimatedCost: z.coerce.number().min(0).optional(),
  priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
  status: z.enum(["scheduled", "in_progress", "completed", "cancelled"]).default("scheduled"),
});

type MaintenanceFormValues = z.infer<typeof maintenanceFormSchema>;

interface MaintenanceRecord {
  id: string;
  vehicleId: string;
  vehicleRegistration?: string;
  maintenanceType: string;
  description?: string;
  scheduledDate: string;
  completedDate?: string;
  estimatedCost?: number;
  actualCost?: number;
  priority: string;
  status: string;
  createdAt: string;
}

interface Vehicle {
  id: string;
  registrationNumber: string;
  make: string;
  model: string;
}

function PriorityBadge({ priority }: { priority: string }) {
  const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    low: "outline",
    medium: "secondary",
    high: "default",
    critical: "destructive",
  };
  return <Badge variant={variants[priority] || "outline"}>{priority}</Badge>;
}

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    scheduled: "secondary",
    in_progress: "default",
    completed: "outline",
    cancelled: "destructive",
  };
  return <Badge variant={variants[status] || "outline"}>{status.replace("_", " ")}</Badge>;
}

function MaintenanceCard({ record }: { record: MaintenanceRecord }) {
  return (
    <Card data-testid={`card-maintenance-${record.id}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg">{record.maintenanceType}</CardTitle>
          </div>
          <div className="flex gap-2">
            <PriorityBadge priority={record.priority} />
            <StatusBadge status={record.status} />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 text-sm">
          <p className="text-muted-foreground">
            Vehicle: {record.vehicleRegistration || record.vehicleId}
          </p>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>Scheduled: {new Date(record.scheduledDate).toLocaleDateString()}</span>
          </div>
          {record.estimatedCost && (
            <p className="text-muted-foreground">
              Est. Cost: ₹{record.estimatedCost.toLocaleString()}
            </p>
          )}
          {record.description && (
            <p className="text-muted-foreground text-xs mt-2">{record.description}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function MaintenanceFormDialog({
  open,
  onOpenChange,
  vehicles,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicles: Vehicle[];
}) {
  const { toast } = useToast();
  const form = useForm<MaintenanceFormValues>({
    resolver: zodResolver(maintenanceFormSchema),
    defaultValues: {
      vehicleId: "",
      maintenanceType: "",
      description: "",
      scheduledDate: "",
      priority: "medium",
      status: "scheduled",
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: MaintenanceFormValues) =>
      apiRequest("POST", "/api/logistics/maintenance", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/logistics/maintenance"] });
      toast({ title: "Maintenance scheduled successfully" });
      onOpenChange(false);
      form.reset();
    },
    onError: () => {
      toast({ title: "Failed to schedule maintenance", variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Schedule Maintenance</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
            <FormField
              control={form.control}
              name="vehicleId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vehicle</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-vehicle">
                        <SelectValue placeholder="Select vehicle" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {vehicles.map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          {v.registrationNumber} - {v.make} {v.model}
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
              name="maintenanceType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Maintenance Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-maintenance-type">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="oil_change">Oil Change</SelectItem>
                      <SelectItem value="tire_replacement">Tire Replacement</SelectItem>
                      <SelectItem value="brake_service">Brake Service</SelectItem>
                      <SelectItem value="engine_repair">Engine Repair</SelectItem>
                      <SelectItem value="general_service">General Service</SelectItem>
                      <SelectItem value="inspection">Inspection</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="scheduledDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Scheduled Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} data-testid="input-scheduled-date" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="priority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Priority</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-priority">
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="estimatedCost"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Estimated Cost (Optional)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="0" {...field} data-testid="input-estimated-cost" />
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
                    <Textarea placeholder="Additional details..." {...field} data-testid="input-description" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={createMutation.isPending} data-testid="button-submit-maintenance">
              {createMutation.isPending ? "Scheduling..." : "Schedule Maintenance"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function LogisticsMaintenance() {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: maintenance, isLoading } = useQuery<MaintenanceRecord[]>({
    queryKey: ["/api/logistics/maintenance"],
  });

  const { data: vehicles = [] } = useQuery<Vehicle[]>({
    queryKey: ["/api/logistics/vehicles"],
  });

  const filteredMaintenance = maintenance?.filter((m) =>
    m.maintenanceType.toLowerCase().includes(search.toLowerCase()) ||
    m.vehicleRegistration?.toLowerCase().includes(search.toLowerCase())
  );

  const upcomingMaintenance = filteredMaintenance?.filter(
    (m) => m.status === "scheduled" && new Date(m.scheduledDate) >= new Date()
  );

  const overdueMaintenance = filteredMaintenance?.filter(
    (m) => m.status === "scheduled" && new Date(m.scheduledDate) < new Date()
  );

  return (
    <DashboardLayout title="Maintenance">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search maintenance..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
              data-testid="input-search-maintenance"
            />
          </div>
          <Button onClick={() => setDialogOpen(true)} data-testid="button-add-maintenance">
            <Plus className="mr-2 h-4 w-4" />
            Schedule Maintenance
          </Button>
        </div>

        {overdueMaintenance && overdueMaintenance.length > 0 && (
          <Card className="border-destructive">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Overdue Maintenance ({overdueMaintenance.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {overdueMaintenance.map((record) => (
                  <MaintenanceCard key={record.id} record={record} />
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-6 w-32 mb-4" />
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-24" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredMaintenance && filteredMaintenance.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredMaintenance.map((record) => (
              <MaintenanceCard key={record.id} record={record} />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Wrench className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No maintenance records</h3>
              <p className="text-muted-foreground mb-4">
                {search ? "Try a different search term" : "Schedule your first maintenance to get started"}
              </p>
              {!search && (
                <Button onClick={() => setDialogOpen(true)} data-testid="button-add-first-maintenance">
                  <Plus className="mr-2 h-4 w-4" />
                  Schedule Maintenance
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
      <MaintenanceFormDialog open={dialogOpen} onOpenChange={setDialogOpen} vehicles={vehicles} />
    </DashboardLayout>
  );
}
