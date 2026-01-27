import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCountry } from "@/contexts/country-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar } from "@/components/ui/calendar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Search,
  CalendarIcon,
  Clock,
  Check,
  X,
  Calendar as CalendarIconOutline,
  UserPlus,
  AlertCircle,
  MoreHorizontal,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link } from "wouter";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Booking, Customer, Service, BookingWithDetails } from "@shared/schema";
import { format, parseISO, isToday, isTomorrow } from "date-fns";
import { cn } from "@/lib/utils";

const bookingFormSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  serviceId: z.string().min(1, "Service is required"),
  bookingDate: z.date({ required_error: "Date is required" }),
  startTime: z.string().min(1, "Start time is required"),
  notes: z.string().optional(),
});

type BookingFormValues = z.infer<typeof bookingFormSchema>;

const timeSlots = Array.from({ length: 24 }, (_, i) => {
  const hour = i.toString().padStart(2, "0");
  return [`${hour}:00`, `${hour}:30`];
}).flat();

function getStatusVariant(status: string) {
  switch (status) {
    case "confirmed":
      return "default";
    case "completed":
      return "secondary";
    case "cancelled":
      return "destructive";
    default:
      return "outline";
  }
}

function getPaymentStatusVariant(status: string) {
  switch (status) {
    case "paid":
      return "default";
    case "partial":
      return "secondary";
    case "refunded":
      return "destructive";
    default:
      return "outline";
  }
}

function BookingDialog({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const { formatCurrency } = useCountry();
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  const { data: customers, isLoading: customersLoading, isError: customersError } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const { data: services, isLoading: servicesLoading, isError: servicesError } = useQuery<Service[]>({
    queryKey: ["/api/services"],
  });

  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      customerId: "",
      serviceId: "",
      startTime: "09:00",
      notes: "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: BookingFormValues) => {
      const selectedService = services?.find((s) => s.id === data.serviceId);
      const startMinutes = parseInt(data.startTime.split(":")[0]) * 60 + parseInt(data.startTime.split(":")[1]);
      const endMinutes = startMinutes + (selectedService?.duration ?? 60);
      const endHour = Math.floor(endMinutes / 60).toString().padStart(2, "0");
      const endMin = (endMinutes % 60).toString().padStart(2, "0");

      return apiRequest("POST", "/api/bookings", {
        ...data,
        bookingDate: format(data.bookingDate, "yyyy-MM-dd"),
        endTime: `${endHour}:${endMin}`,
        amount: selectedService?.price,
        status: "pending",
        paymentStatus: "pending",
      });
    },
    onSuccess: () => {
      toast({
        title: "Booking created",
        description: "The booking has been scheduled.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bookings/upcoming"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      onSuccess();
      onOpenChange(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: BookingFormValues) => {
    mutation.mutate(data);
  };

  const isDataLoading = customersLoading || servicesLoading;
  const hasNoCustomers = !customersLoading && (!customers || customers.length === 0);
  const hasNoServices = !servicesLoading && (!services || services.filter(s => s.isActive).length === 0);
  const cannotCreateBooking = hasNoCustomers || hasNoServices || customersError || servicesError;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New Booking</DialogTitle>
          <DialogDescription>
            Create a new booking for a customer.
          </DialogDescription>
        </DialogHeader>
        
        {/* Combined error when BOTH customers AND services fail to load */}
        {customersError && servicesError && (
          <Alert variant="destructive" data-testid="alert-both-errors">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex flex-col gap-3">
              <span data-testid="text-both-errors">
                Unable to load customers and services. Please try again or add them manually.
              </span>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" asChild className="w-fit" data-testid="button-add-customer-both-error">
                  <Link href="/customers" onClick={() => onOpenChange(false)}>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Add Customer
                  </Link>
                </Button>
                <Button variant="outline" size="sm" asChild className="w-fit" data-testid="button-add-service-both-error">
                  <Link href="/services" onClick={() => onOpenChange(false)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Service
                  </Link>
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Error loading customers only */}
        {customersError && !servicesError && (
          <Alert variant="destructive" data-testid="alert-customers-error">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex flex-col gap-3">
              <span data-testid="text-customers-error">
                Unable to load customers. Please try again or add a new customer.
              </span>
              <Button variant="outline" size="sm" asChild className="w-fit" data-testid="button-add-customer-error">
                <Link href="/customers" onClick={() => onOpenChange(false)}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Add Customer
                </Link>
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Error loading services only */}
        {!customersError && servicesError && (
          <Alert variant="destructive" data-testid="alert-services-error">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex flex-col gap-3">
              <span data-testid="text-services-error">
                Unable to load services. Please try again or add a new service.
              </span>
              <Button variant="outline" size="sm" asChild className="w-fit" data-testid="button-add-service-error">
                <Link href="/services" onClick={() => onOpenChange(false)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Service
                </Link>
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Combined alert when both customers AND services are missing (no error, just empty) */}
        {!customersError && !servicesError && hasNoCustomers && hasNoServices && (
          <Alert variant="default" className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950" data-testid="alert-no-data">
            <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <AlertDescription className="flex flex-col gap-3">
              <span className="text-amber-800 dark:text-amber-200" data-testid="text-no-data">
                No customers or services available. Please add them before creating a booking.
              </span>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" asChild className="w-fit" data-testid="button-add-customer-combined">
                  <Link href="/customers" onClick={() => onOpenChange(false)}>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Add Customer
                  </Link>
                </Button>
                <Button variant="outline" size="sm" asChild className="w-fit" data-testid="button-add-service-combined">
                  <Link href="/services" onClick={() => onOpenChange(false)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Service
                  </Link>
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}
        
        {/* Only customers missing (services available) */}
        {!customersError && !servicesError && hasNoCustomers && !hasNoServices && (
          <Alert variant="default" className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950" data-testid="alert-no-customers">
            <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <AlertDescription className="flex flex-col gap-3">
              <span className="text-amber-800 dark:text-amber-200" data-testid="text-no-customers">
                No customers available. Please add a customer before creating a booking.
              </span>
              <Button variant="outline" size="sm" asChild className="w-fit" data-testid="button-add-customer">
                <Link href="/customers" onClick={() => onOpenChange(false)}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Add Customer
                </Link>
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Only services missing (customers available) */}
        {!customersError && !servicesError && !hasNoCustomers && hasNoServices && (
          <Alert variant="default" className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950" data-testid="alert-no-services">
            <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <AlertDescription className="flex flex-col gap-3">
              <span className="text-amber-800 dark:text-amber-200" data-testid="text-no-services">
                No services available. Please add a service before creating a booking.
              </span>
              <Button variant="outline" size="sm" asChild className="w-fit" data-testid="button-add-service">
                <Link href="/services" onClick={() => onOpenChange(false)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Service
                </Link>
              </Button>
            </AlertDescription>
          </Alert>
        )}
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="customerId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Customer</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={hasNoCustomers || customersLoading || customersError}>
                    <FormControl>
                      <SelectTrigger data-testid="select-booking-customer">
                        <SelectValue placeholder={
                          customersLoading ? "Loading customers..." : 
                          customersError ? "Error loading customers" :
                          hasNoCustomers ? "No customers available" : 
                          "Select customer"
                        } />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {customers?.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.name}
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
              name="serviceId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Service</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={hasNoServices || servicesLoading || servicesError}>
                    <FormControl>
                      <SelectTrigger data-testid="select-booking-service">
                        <SelectValue placeholder={
                          servicesLoading ? "Loading services..." : 
                          servicesError ? "Error loading services" :
                          hasNoServices ? "No services available" : 
                          "Select service"
                        } />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {services?.filter((s) => s.isActive).map((service) => (
                        <SelectItem key={service.id} value={service.id}>
                          {service.name} - {formatCurrency(Number(service.price))}
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
              name="bookingDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Date</FormLabel>
                  <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                          data-testid="button-booking-date"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {field.value ? format(field.value, "PPP") : "Pick a date"}
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={(date) => {
                          field.onChange(date);
                          setDatePickerOpen(false);
                        }}
                        disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="startTime"
              render={({ field }) => {
                const selectedDate = form.watch("bookingDate");
                const isToday = selectedDate && format(selectedDate, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");
                const currentHour = new Date().getHours();
                const currentMinute = new Date().getMinutes();
                
                const availableTimeSlots = timeSlots.filter((t) => {
                  const [hourStr, minStr] = t.split(":");
                  const hour = parseInt(hourStr);
                  const min = parseInt(minStr);
                  
                  if (hour < 6 || hour >= 22) return false;
                  
                  if (isToday) {
                    if (hour < currentHour) return false;
                    if (hour === currentHour && min <= currentMinute) return false;
                  }
                  
                  return true;
                });
                
                return (
                  <FormItem>
                    <FormLabel>Start Time</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-booking-time">
                          <SelectValue placeholder="Select time" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="max-h-60">
                        {availableTimeSlots.length > 0 ? (
                          availableTimeSlots.map((time) => (
                            <SelectItem key={time} value={time}>
                              {time}
                            </SelectItem>
                          ))
                        ) : (
                          <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                            No available time slots for today
                          </div>
                        )}
                      </SelectContent>
                    </Select>
                    {isToday && <p className="text-xs text-muted-foreground">Only future time slots are shown</p>}
                    <FormMessage />
                  </FormItem>
                );
              }}
            />
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Additional notes..." {...field} data-testid="input-booking-notes" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending || cannotCreateBooking || isDataLoading} data-testid="button-save-booking">
                {mutation.isPending ? "Creating..." : isDataLoading ? "Loading..." : "Create Booking"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function Bookings() {
  const [, setLocation] = useLocation();
  const searchParams = useSearch();
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { toast } = useToast();
  const { formatCurrency } = useCountry();

  // Auto-open dialog if action=new is in query params
  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    if (params.get("action") === "new") {
      setDialogOpen(true);
      // Clear the query parameter after opening
      setLocation("/bookings", { replace: true });
    }
  }, [searchParams, setLocation]);

  const { data: bookings, isLoading } = useQuery<BookingWithDetails[]>({
    queryKey: ["/api/bookings"],
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return apiRequest("PATCH", `/api/bookings/${id}`, { status });
    },
    onSuccess: () => {
      toast({ title: "Booking updated" });
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bookings/upcoming"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const filteredBookings = bookings?.filter((booking) => {
    const matchesSearch =
      booking.customer?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking.service?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || booking.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const formatDate = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isToday(date)) return "Today";
    if (isTomorrow(date)) return "Tomorrow";
    return format(date, "MMM d, yyyy");
  };

  return (
    <DashboardLayout title="Bookings" breadcrumbs={[{ label: "Bookings" }]}>
      <Card>
        <CardHeader className="flex flex-col gap-4 space-y-0 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 flex-wrap items-center gap-4">
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search bookings..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search-bookings"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40" data-testid="select-status-filter">
                <SelectValue placeholder="Filter status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => setDialogOpen(true)} data-testid="button-add-booking">
            <Plus className="mr-2 h-4 w-4" />
            New Booking
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-4 rounded-md border p-4">
                  <Skeleton className="h-12 w-12 rounded-md" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-6 w-20" />
                </div>
              ))}
            </div>
          ) : filteredBookings && filteredBookings.length > 0 ? (
            <>
              {/* Mobile Card View */}
              <div className="space-y-3 md:hidden">
                {filteredBookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="rounded-md border p-4"
                    data-testid={`booking-card-${booking.id}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="flex h-10 w-10 flex-col items-center justify-center rounded-md bg-muted shrink-0">
                          <span className="text-[10px] font-medium text-muted-foreground">
                            {format(parseISO(booking.bookingDate), "MMM")}
                          </span>
                          <span className="text-sm font-bold leading-none">
                            {format(parseISO(booking.bookingDate), "d")}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate">{booking.customer?.name || "No customer"}</p>
                          <p className="text-sm text-muted-foreground truncate">{booking.service?.name || "No service"}</p>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" data-testid={`button-actions-${booking.id}`}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {booking.status === "pending" && (
                            <>
                              <DropdownMenuItem
                                onClick={() => updateStatusMutation.mutate({ id: booking.id, status: "confirmed" })}
                              >
                                <Check className="mr-2 h-4 w-4 text-green-600" />
                                Confirm
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => updateStatusMutation.mutate({ id: booking.id, status: "cancelled" })}
                                className="text-destructive"
                              >
                                <X className="mr-2 h-4 w-4" />
                                Cancel
                              </DropdownMenuItem>
                            </>
                          )}
                          {booking.status === "confirmed" && (
                            <DropdownMenuItem
                              onClick={() => updateStatusMutation.mutate({ id: booking.id, status: "completed" })}
                            >
                              <Check className="mr-2 h-4 w-4 text-green-600" />
                              Complete
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground text-xs">Time</span>
                        <p className="font-medium">{booking.startTime?.slice(0, 5)} - {booking.endTime?.slice(0, 5)}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-xs">Amount</span>
                        <p className="font-medium">{formatCurrency(Number(booking.amount || 0))}</p>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <Badge variant={getStatusVariant(booking.status || "pending")}>
                        {booking.status}
                      </Badge>
                      <Badge variant={getPaymentStatusVariant(booking.paymentStatus || "pending")}>
                        {booking.paymentStatus}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
              {/* Desktop Table View */}
              <div className="hidden overflow-x-auto md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBookings.map((booking) => (
                    <TableRow key={booking.id} data-testid={`booking-row-${booking.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 flex-col items-center justify-center rounded-md bg-muted">
                            <span className="text-[10px] font-medium text-muted-foreground">
                              {format(parseISO(booking.bookingDate), "MMM")}
                            </span>
                            <span className="text-sm font-bold leading-none">
                              {format(parseISO(booking.bookingDate), "d")}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium">{formatDate(booking.bookingDate)}</p>
                            <p className="text-sm text-muted-foreground">
                              {booking.startTime?.slice(0, 5)} - {booking.endTime?.slice(0, 5)}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{booking.customer?.name || "-"}</TableCell>
                      <TableCell>{booking.service?.name || "-"}</TableCell>
                      <TableCell>{formatCurrency(Number(booking.amount || 0))}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(booking.status || "pending")}>
                          {booking.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getPaymentStatusVariant(booking.paymentStatus || "pending")}>
                          {booking.paymentStatus}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {booking.status === "pending" && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() =>
                                  updateStatusMutation.mutate({
                                    id: booking.id,
                                    status: "confirmed",
                                  })
                                }
                                data-testid={`button-confirm-${booking.id}`}
                              >
                                <Check className="h-4 w-4 text-green-600" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() =>
                                  updateStatusMutation.mutate({
                                    id: booking.id,
                                    status: "cancelled",
                                  })
                                }
                                data-testid={`button-cancel-${booking.id}`}
                              >
                                <X className="h-4 w-4 text-red-600" />
                              </Button>
                            </>
                          )}
                          {booking.status === "confirmed" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                updateStatusMutation.mutate({
                                  id: booking.id,
                                  status: "completed",
                                })
                              }
                              data-testid={`button-complete-${booking.id}`}
                            >
                              <Check className="h-4 w-4 text-green-600" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <CalendarIconOutline className="h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-muted-foreground">
                {searchQuery || statusFilter !== "all"
                  ? "No bookings found"
                  : "No bookings yet"}
              </p>
              {!searchQuery && statusFilter === "all" && (
                <Button className="mt-4" onClick={() => setDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Your First Booking
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <BookingDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={() => {}}
      />
    </DashboardLayout>
  );
}
