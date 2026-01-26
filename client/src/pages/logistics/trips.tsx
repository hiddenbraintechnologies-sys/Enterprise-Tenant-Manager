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
import { Plus, Search, MapPin, Clock, Navigation } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const tripFormSchema = z.object({
  tripType: z.string().min(1, "Trip type is required"),
  originAddress: z.string().min(1, "Origin address is required"),
  originCity: z.string().min(1, "Origin city is required"),
  destinationAddress: z.string().min(1, "Destination address is required"),
  destinationCity: z.string().min(1, "Destination city is required"),
  scheduledStartTime: z.string().min(1, "Scheduled start time is required"),
  estimatedDistance: z.coerce.number().min(0).optional(),
  distanceUnit: z.string().default("km"),
  status: z.enum(["scheduled", "in_progress", "completed", "cancelled"]).default("scheduled"),
});

type TripFormValues = z.infer<typeof tripFormSchema>;

interface Trip {
  id: string;
  tripNumber: string;
  tripType: string;
  originAddress: string;
  originCity: string;
  destinationAddress: string;
  destinationCity: string;
  scheduledStartTime: string;
  actualStartTime?: string;
  actualEndTime?: string;
  estimatedDistance?: number;
  distanceUnit?: string;
  status: string;
  createdAt: string;
}

function TripStatusBadge({ status }: { status: string }) {
  const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    scheduled: "secondary",
    in_progress: "default",
    completed: "outline",
    cancelled: "destructive",
  };
  return <Badge variant={variants[status] || "outline"}>{status.replace("_", " ")}</Badge>;
}

function TripCard({ trip }: { trip: Trip }) {
  return (
    <Card data-testid={`card-trip-${trip.id}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <Navigation className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg">{trip.tripNumber}</CardTitle>
          </div>
          <TripStatusBadge status={trip.status} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 text-sm">
          <div className="flex items-start gap-2">
            <MapPin className="h-4 w-4 text-green-500 mt-0.5" />
            <div>
              <p className="font-medium">{trip.originCity}</p>
              <p className="text-muted-foreground text-xs">{trip.originAddress}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <MapPin className="h-4 w-4 text-red-500 mt-0.5" />
            <div>
              <p className="font-medium">{trip.destinationCity}</p>
              <p className="text-muted-foreground text-xs">{trip.destinationAddress}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>{new Date(trip.scheduledStartTime).toLocaleString()}</span>
          </div>
          {trip.estimatedDistance && (
            <p className="text-muted-foreground">
              Distance: {trip.estimatedDistance} {trip.distanceUnit || "km"}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function TripFormDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const form = useForm<TripFormValues>({
    resolver: zodResolver(tripFormSchema),
    defaultValues: {
      tripType: "",
      originAddress: "",
      originCity: "",
      destinationAddress: "",
      destinationCity: "",
      scheduledStartTime: "",
      distanceUnit: "km",
      status: "scheduled",
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: TripFormValues) =>
      apiRequest("POST", "/api/logistics/trips", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/logistics/trips"] });
      toast({ title: "Trip created successfully" });
      onOpenChange(false);
      form.reset();
    },
    onError: () => {
      toast({ title: "Failed to create trip", variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Trip</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
            <FormField
              control={form.control}
              name="tripType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Trip Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-trip-type">
                        <SelectValue placeholder="Select trip type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="delivery">Delivery</SelectItem>
                      <SelectItem value="pickup">Pickup</SelectItem>
                      <SelectItem value="transfer">Transfer</SelectItem>
                      <SelectItem value="return">Return</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-4">
              <h4 className="font-medium">Origin</h4>
              <FormField
                control={form.control}
                name="originCity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Mumbai" {...field} data-testid="input-origin-city" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="originAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Input placeholder="Full address" {...field} data-testid="input-origin-address" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-4">
              <h4 className="font-medium">Destination</h4>
              <FormField
                control={form.control}
                name="destinationCity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Pune" {...field} data-testid="input-destination-city" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="destinationAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Input placeholder="Full address" {...field} data-testid="input-destination-address" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="scheduledStartTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Scheduled Start</FormLabel>
                  <FormControl>
                    <Input type="datetime-local" {...field} data-testid="input-scheduled-start" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="estimatedDistance"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Distance (Optional)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="0" {...field} data-testid="input-distance" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="distanceUnit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-distance-unit">
                          <SelectValue placeholder="Unit" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="km">km</SelectItem>
                        <SelectItem value="mi">miles</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Button type="submit" className="w-full" disabled={createMutation.isPending} data-testid="button-submit-trip">
              {createMutation.isPending ? "Creating..." : "Create Trip"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function LogisticsTrips() {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: trips, isLoading } = useQuery<Trip[]>({
    queryKey: ["/api/logistics/trips"],
  });

  const filteredTrips = trips?.filter((t) =>
    t.tripNumber.toLowerCase().includes(search.toLowerCase()) ||
    t.originCity.toLowerCase().includes(search.toLowerCase()) ||
    t.destinationCity.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout title="Trips">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search trips..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
              data-testid="input-search-trips"
            />
          </div>
          <Button onClick={() => setDialogOpen(true)} data-testid="button-add-trip">
            <Plus className="mr-2 h-4 w-4" />
            New Trip
          </Button>
        </div>

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
        ) : filteredTrips && filteredTrips.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredTrips.map((trip) => (
              <TripCard key={trip.id} trip={trip} />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Navigation className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No trips found</h3>
              <p className="text-muted-foreground mb-4">
                {search ? "Try a different search term" : "Create your first trip to get started"}
              </p>
              {!search && (
                <Button onClick={() => setDialogOpen(true)} data-testid="button-add-first-trip">
                  <Plus className="mr-2 h-4 w-4" />
                  New Trip
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
      <TripFormDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </DashboardLayout>
  );
}
