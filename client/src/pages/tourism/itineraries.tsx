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
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, MapPin, Clock, Calendar } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const itineraryFormSchema = z.object({
  name: z.string().min(1, "Itinerary name is required"),
  destination: z.string().min(1, "Destination is required"),
  duration: z.coerce.number().min(1, "Duration is required"),
  description: z.string().optional(),
  dayWisePlan: z.string().optional(),
});

type ItineraryFormValues = z.infer<typeof itineraryFormSchema>;

interface Itinerary {
  id: string;
  name: string;
  destination: string;
  duration: number;
  description?: string;
  dayWisePlan?: string;
  createdAt: string;
}

function ItineraryCard({ itinerary }: { itinerary: Itinerary }) {
  return (
    <Card data-testid={`card-itinerary-${itinerary.id}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">{itinerary.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span>{itinerary.destination}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>{itinerary.duration} days</span>
          </div>
          {itinerary.description && (
            <p className="text-muted-foreground text-xs mt-2 line-clamp-2">{itinerary.description}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ItineraryFormDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const form = useForm<ItineraryFormValues>({
    resolver: zodResolver(itineraryFormSchema),
    defaultValues: {
      name: "",
      destination: "",
      duration: 1,
      description: "",
      dayWisePlan: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: ItineraryFormValues) =>
      apiRequest("POST", "/api/tourism/itineraries", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tourism/itineraries"] });
      toast({ title: "Itinerary created successfully" });
      onOpenChange(false);
      form.reset();
    },
    onError: () => {
      toast({ title: "Failed to create itinerary", variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Itinerary</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Itinerary Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Rajasthan Heritage Tour" {...field} data-testid="input-name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="destination"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Destination</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Jaipur, Udaipur, Jodhpur" {...field} data-testid="input-destination" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="duration"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Duration (Days)</FormLabel>
                  <FormControl>
                    <Input type="number" min={1} {...field} data-testid="input-duration" />
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
                    <Textarea placeholder="Brief overview of the itinerary..." {...field} data-testid="input-description" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="dayWisePlan"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Day-wise Plan</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Day 1: Arrival and local sightseeing&#10;Day 2: City tour&#10;Day 3: Departure" 
                      className="min-h-[120px]"
                      {...field} 
                      data-testid="input-day-plan" 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={createMutation.isPending} data-testid="button-submit-itinerary">
              {createMutation.isPending ? "Creating..." : "Create Itinerary"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function TourismItineraries() {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: itineraries, isLoading } = useQuery<Itinerary[]>({
    queryKey: ["/api/tourism/itineraries"],
  });

  const filteredItineraries = itineraries?.filter((i) =>
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    i.destination.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout title="Itineraries">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search itineraries..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
              data-testid="input-search-itineraries"
            />
          </div>
          <Button onClick={() => setDialogOpen(true)} data-testid="button-add-itinerary">
            <Plus className="mr-2 h-4 w-4" />
            Create Itinerary
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
        ) : filteredItineraries && filteredItineraries.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredItineraries.map((itinerary) => (
              <ItineraryCard key={itinerary.id} itinerary={itinerary} />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <MapPin className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No itineraries found</h3>
              <p className="text-muted-foreground mb-4">
                {search ? "Try a different search term" : "Create your first itinerary to get started"}
              </p>
              {!search && (
                <Button onClick={() => setDialogOpen(true)} data-testid="button-add-first-itinerary">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Itinerary
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
      <ItineraryFormDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </DashboardLayout>
  );
}
