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
import { Plus, Search, Calendar, Users, Phone, Mail } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const bookingFormSchema = z.object({
  packageId: z.string().min(1, "Package is required"),
  customerName: z.string().min(1, "Customer name is required"),
  customerPhone: z.string().min(1, "Phone is required"),
  customerEmail: z.string().email().optional().or(z.literal("")),
  travelDate: z.string().min(1, "Travel date is required"),
  numberOfTravelers: z.coerce.number().min(1, "At least 1 traveler required"),
  totalAmount: z.coerce.number().min(0),
  paidAmount: z.coerce.number().min(0).default(0),
  status: z.enum(["pending", "confirmed", "cancelled", "completed"]).default("pending"),
});

type BookingFormValues = z.infer<typeof bookingFormSchema>;

interface TourBooking {
  id: string;
  packageId: string;
  packageName?: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  travelDate: string;
  numberOfTravelers: number;
  totalAmount: number;
  paidAmount: number;
  status: string;
  createdAt: string;
}

interface TourPackage {
  id: string;
  name: string;
  price: number;
}

function BookingStatusBadge({ status }: { status: string }) {
  const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    pending: "secondary",
    confirmed: "default",
    cancelled: "destructive",
    completed: "outline",
  };
  return <Badge variant={variants[status] || "outline"}>{status}</Badge>;
}

function BookingCard({ booking }: { booking: TourBooking }) {
  const balanceDue = booking.totalAmount - booking.paidAmount;
  
  return (
    <Card data-testid={`card-booking-${booking.id}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg">{booking.customerName}</CardTitle>
          <BookingStatusBadge status={booking.status} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 text-sm">
          <p className="font-medium text-muted-foreground">{booking.packageName || "Tour Package"}</p>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>{new Date(booking.travelDate).toLocaleDateString()}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>{booking.numberOfTravelers} travelers</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Phone className="h-4 w-4" />
            <span>{booking.customerPhone}</span>
          </div>
          <div className="pt-2 border-t mt-2">
            <div className="flex justify-between">
              <span>Total:</span>
              <span className="font-semibold">₹{booking.totalAmount.toLocaleString()}</span>
            </div>
            {balanceDue > 0 && (
              <div className="flex justify-between text-destructive">
                <span>Balance Due:</span>
                <span>₹{balanceDue.toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function BookingFormDialog({
  open,
  onOpenChange,
  packages,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  packages: TourPackage[];
}) {
  const { toast } = useToast();
  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      packageId: "",
      customerName: "",
      customerPhone: "",
      customerEmail: "",
      travelDate: "",
      numberOfTravelers: 1,
      totalAmount: 0,
      paidAmount: 0,
      status: "pending",
    },
  });

  const selectedPackage = packages.find(p => p.id === form.watch("packageId"));
  const travelers = form.watch("numberOfTravelers") || 1;

  const createMutation = useMutation({
    mutationFn: (data: BookingFormValues) =>
      apiRequest("POST", "/api/tourism/bookings", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tourism/bookings"] });
      toast({ title: "Booking created successfully" });
      onOpenChange(false);
      form.reset();
    },
    onError: () => {
      toast({ title: "Failed to create booking", variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Booking</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
            <FormField
              control={form.control}
              name="packageId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tour Package</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-package">
                        <SelectValue placeholder="Select package" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {packages.map((pkg) => (
                        <SelectItem key={pkg.id} value={pkg.id}>
                          {pkg.name} - ₹{pkg.price.toLocaleString()}
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
              name="customerName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Customer Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Full name" {...field} data-testid="input-customer-name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="customerPhone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone</FormLabel>
                  <FormControl>
                    <Input placeholder="+91 9876543210" {...field} data-testid="input-phone" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="customerEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email (Optional)</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="email@example.com" {...field} data-testid="input-email" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="travelDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Travel Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} data-testid="input-travel-date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="numberOfTravelers"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Travelers</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} {...field} data-testid="input-travelers" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            {selectedPackage && (
              <div className="p-3 bg-muted rounded-md">
                <p className="text-sm">
                  Estimated Total: <span className="font-semibold">₹{(selectedPackage.price * travelers).toLocaleString()}</span>
                </p>
              </div>
            )}
            <FormField
              control={form.control}
              name="totalAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Total Amount (₹)</FormLabel>
                  <FormControl>
                    <Input type="number" min={0} {...field} data-testid="input-total-amount" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="paidAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Paid Amount (₹)</FormLabel>
                  <FormControl>
                    <Input type="number" min={0} {...field} data-testid="input-paid-amount" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={createMutation.isPending} data-testid="button-submit-booking">
              {createMutation.isPending ? "Creating..." : "Create Booking"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function TourismBookings() {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: bookings, isLoading } = useQuery<TourBooking[]>({
    queryKey: ["/api/tourism/bookings"],
  });

  const { data: packages = [] } = useQuery<TourPackage[]>({
    queryKey: ["/api/tourism/packages"],
  });

  const filteredBookings = bookings?.filter((b) =>
    b.customerName.toLowerCase().includes(search.toLowerCase()) ||
    b.customerPhone.includes(search)
  );

  return (
    <DashboardLayout title="Tour Bookings">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search bookings..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
              data-testid="input-search-bookings"
            />
          </div>
          <Button onClick={() => setDialogOpen(true)} data-testid="button-add-booking">
            <Plus className="mr-2 h-4 w-4" />
            New Booking
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
        ) : filteredBookings && filteredBookings.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredBookings.map((booking) => (
              <BookingCard key={booking.id} booking={booking} />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No bookings found</h3>
              <p className="text-muted-foreground mb-4">
                {search ? "Try a different search term" : "Create your first booking to get started"}
              </p>
              {!search && (
                <Button onClick={() => setDialogOpen(true)} data-testid="button-add-first-booking">
                  <Plus className="mr-2 h-4 w-4" />
                  New Booking
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
      <BookingFormDialog open={dialogOpen} onOpenChange={setDialogOpen} packages={packages} />
    </DashboardLayout>
  );
}
