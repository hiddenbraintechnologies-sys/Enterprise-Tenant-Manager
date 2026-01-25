import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Calendar, Clock, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { format, parseISO } from "date-fns";

interface Desk {
  id: string;
  name: string | null;
  type: "hot" | "dedicated";
  status: "available" | "occupied" | "reserved" | "maintenance" | null;
  spaceId: string;
}

interface DeskBooking {
  id: string;
  tenantId: string;
  deskId: string;
  userId: string;
  startTime: string;
  endTime: string;
  status: "pending" | "confirmed" | "completed" | "cancelled" | null;
  createdAt: string | null;
}

interface UserInfo {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
}

function getStatusVariant(status: string | null) {
  switch (status) {
    case "confirmed":
      return "default";
    case "completed":
      return "secondary";
    case "cancelled":
      return "destructive";
    case "pending":
      return "outline";
    default:
      return "outline";
  }
}

export default function CoworkingBookings() {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newBooking, setNewBooking] = useState({
    deskId: "",
    startTime: "",
    endTime: "",
  });

  const { data: bookings, isLoading: bookingsLoading } = useQuery<DeskBooking[]>({
    queryKey: ["/api/coworking/bookings"],
  });

  const { data: desks, isLoading: desksLoading } = useQuery<Desk[]>({
    queryKey: ["/api/coworking/desks"],
  });

  const createBookingMutation = useMutation({
    mutationFn: async (bookingData: {
      deskId: string;
      startTime: string;
      endTime: string;
    }) => {
      return apiRequest("POST", "/api/coworking/bookings", bookingData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/coworking/bookings"] });
      setIsAddDialogOpen(false);
      setNewBooking({
        deskId: "",
        startTime: "",
        endTime: "",
      });
      toast({
        title: "Booking created",
        description: "The desk booking has been created successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create booking",
        variant: "destructive",
      });
    },
  });

  const handleAddBooking = () => {
    if (!newBooking.deskId || !newBooking.startTime || !newBooking.endTime) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    createBookingMutation.mutate({
      deskId: newBooking.deskId,
      startTime: new Date(newBooking.startTime).toISOString(),
      endTime: new Date(newBooking.endTime).toISOString(),
    });
  };

  const getDeskName = (deskId: string) => {
    const desk = desks?.find(d => d.id === deskId);
    return desk?.name || "Unknown Desk";
  };

  const availableDesks = desks?.filter(d => d.status === "available") || [];

  return (
    <DashboardLayout
      title="Desk Bookings"
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard/coworking" },
        { label: "Bookings" },
      ]}
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Bookings</h2>
            <p className="text-muted-foreground">
              Manage desk bookings and reservations
            </p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-book-desk">
                <Plus className="mr-2 h-4 w-4" />
                Book a Desk
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Book a Desk</DialogTitle>
                <DialogDescription>
                  Create a new desk booking.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="booking-desk">Desk *</Label>
                  <Select
                    value={newBooking.deskId}
                    onValueChange={(value) => setNewBooking({ ...newBooking, deskId: value })}
                  >
                    <SelectTrigger data-testid="select-booking-desk">
                      <SelectValue placeholder="Select a desk" />
                    </SelectTrigger>
                    <SelectContent>
                      {desksLoading ? (
                        <SelectItem value="loading" disabled>Loading...</SelectItem>
                      ) : availableDesks.length > 0 ? (
                        availableDesks.map((desk) => (
                          <SelectItem key={desk.id} value={desk.id}>
                            {desk.name || `Desk ${desk.id.slice(0, 8)}`} ({desk.type})
                          </SelectItem>
                        ))
                      ) : desks && desks.length > 0 ? (
                        desks.map((desk) => (
                          <SelectItem key={desk.id} value={desk.id}>
                            {desk.name || `Desk ${desk.id.slice(0, 8)}`} ({desk.type}) - {desk.status}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="none" disabled>No desks available. Create desks first.</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="booking-start">Start Time *</Label>
                    <Input
                      id="booking-start"
                      type="datetime-local"
                      data-testid="input-booking-start"
                      value={newBooking.startTime}
                      onChange={(e) => setNewBooking({ ...newBooking, startTime: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="booking-end">End Time *</Label>
                    <Input
                      id="booking-end"
                      type="datetime-local"
                      data-testid="input-booking-end"
                      value={newBooking.endTime}
                      onChange={(e) => setNewBooking({ ...newBooking, endTime: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleAddBooking}
                  disabled={createBookingMutation.isPending}
                  data-testid="button-save-booking"
                >
                  {createBookingMutation.isPending ? "Creating..." : "Create Booking"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              All Bookings
            </CardTitle>
          </CardHeader>
          <CardContent>
            {bookingsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : bookings && bookings.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Desk</TableHead>
                    <TableHead>Start</TableHead>
                    <TableHead>End</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bookings.map((booking) => (
                    <TableRow key={booking.id} data-testid={`booking-row-${booking.id}`}>
                      <TableCell className="font-medium">
                        {getDeskName(booking.deskId)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          {booking.startTime ? format(parseISO(booking.startTime), "PPp") : "-"}
                        </div>
                      </TableCell>
                      <TableCell>
                        {booking.endTime ? format(parseISO(booking.endTime), "PPp") : "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(booking.status)}>
                          {booking.status || "unknown"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {booking.createdAt ? format(parseISO(booking.createdAt), "PP") : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Calendar className="h-12 w-12 text-muted-foreground/50" />
                <h3 className="mt-4 text-lg font-semibold">No bookings yet</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Create your first desk booking to get started.
                </p>
                <Button
                  className="mt-4"
                  onClick={() => setIsAddDialogOpen(true)}
                  data-testid="button-book-first-desk"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Book a Desk
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
