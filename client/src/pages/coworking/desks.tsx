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
import { Plus, Monitor, Edit, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

interface Space {
  id: string;
  name: string;
  type: string;
  capacity: number | null;
  status: string | null;
}

interface Desk {
  id: string;
  tenantId: string;
  spaceId: string;
  name: string | null;
  type: "hot" | "dedicated";
  status: "available" | "occupied" | "reserved" | "maintenance" | null;
  pricePerHour: string | null;
  pricePerDay: string | null;
  pricePerMonth: string | null;
  assignedTo: string | null;
  features: string[] | null;
}

function getStatusVariant(status: string | null) {
  switch (status) {
    case "available":
      return "default";
    case "occupied":
      return "secondary";
    case "reserved":
      return "outline";
    case "maintenance":
      return "destructive";
    default:
      return "outline";
  }
}

export default function CoworkingDesks() {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newDesk, setNewDesk] = useState({
    name: "",
    spaceId: "",
    type: "hot" as "hot" | "dedicated",
    status: "available",
    pricePerDay: "",
  });

  const { data: desks, isLoading: desksLoading } = useQuery<Desk[]>({
    queryKey: ["/api/coworking/desks"],
  });

  const { data: spaces, isLoading: spacesLoading } = useQuery<Space[]>({
    queryKey: ["/api/coworking/spaces"],
  });

  const createDeskMutation = useMutation({
    mutationFn: async (deskData: {
      name: string;
      spaceId: string;
      type: "hot" | "dedicated";
      status: string;
      pricePerDay?: string;
    }) => {
      return apiRequest("POST", "/api/coworking/desks", deskData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/coworking/desks"] });
      setIsAddDialogOpen(false);
      setNewDesk({
        name: "",
        spaceId: "",
        type: "hot",
        status: "available",
        pricePerDay: "",
      });
      toast({
        title: "Desk created",
        description: "The desk has been added successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create desk",
        variant: "destructive",
      });
    },
  });

  const handleAddDesk = () => {
    if (!newDesk.name || !newDesk.spaceId) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    createDeskMutation.mutate({
      name: newDesk.name,
      spaceId: newDesk.spaceId,
      type: newDesk.type,
      status: newDesk.status,
      pricePerDay: newDesk.pricePerDay || undefined,
    });
  };

  const getSpaceName = (spaceId: string) => {
    const space = spaces?.find(s => s.id === spaceId);
    return space?.name || "Unknown Space";
  };

  return (
    <DashboardLayout
      title="Desks Management"
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard/coworking" },
        { label: "Desks" },
      ]}
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Desks</h2>
            <p className="text-muted-foreground">
              Manage your coworking desks and their availability
            </p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-desk">
                <Plus className="mr-2 h-4 w-4" />
                Add Desk
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Desk</DialogTitle>
                <DialogDescription>
                  Create a new desk for your coworking space.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="desk-name">Desk Name *</Label>
                  <Input
                    id="desk-name"
                    data-testid="input-desk-name"
                    placeholder="e.g., Desk A1"
                    value={newDesk.name}
                    onChange={(e) => setNewDesk({ ...newDesk, name: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="desk-space">Space *</Label>
                  <Select
                    value={newDesk.spaceId}
                    onValueChange={(value) => setNewDesk({ ...newDesk, spaceId: value })}
                  >
                    <SelectTrigger data-testid="select-desk-space">
                      <SelectValue placeholder="Select a space" />
                    </SelectTrigger>
                    <SelectContent>
                      {spacesLoading ? (
                        <SelectItem value="loading" disabled>Loading...</SelectItem>
                      ) : spaces && spaces.length > 0 ? (
                        spaces.map((space) => (
                          <SelectItem key={space.id} value={space.id}>
                            {space.name}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="none" disabled>No spaces available. Create a space first.</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="desk-type">Desk Type</Label>
                  <Select
                    value={newDesk.type}
                    onValueChange={(value: "hot" | "dedicated") => setNewDesk({ ...newDesk, type: value })}
                  >
                    <SelectTrigger data-testid="select-desk-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hot">Hot Desk</SelectItem>
                      <SelectItem value="dedicated">Dedicated Desk</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="desk-status">Status</Label>
                  <Select
                    value={newDesk.status}
                    onValueChange={(value) => setNewDesk({ ...newDesk, status: value })}
                  >
                    <SelectTrigger data-testid="select-desk-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="available">Available</SelectItem>
                      <SelectItem value="occupied">Occupied</SelectItem>
                      <SelectItem value="reserved">Reserved</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="desk-price">Price per Day</Label>
                  <Input
                    id="desk-price"
                    type="number"
                    data-testid="input-desk-price"
                    placeholder="e.g., 25.00"
                    value={newDesk.pricePerDay}
                    onChange={(e) => setNewDesk({ ...newDesk, pricePerDay: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleAddDesk}
                  disabled={createDeskMutation.isPending}
                  data-testid="button-save-desk"
                >
                  {createDeskMutation.isPending ? "Creating..." : "Create Desk"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Monitor className="h-5 w-5" />
              All Desks
            </CardTitle>
          </CardHeader>
          <CardContent>
            {desksLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : desks && desks.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Space</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Price/Day</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {desks.map((desk) => (
                    <TableRow key={desk.id} data-testid={`desk-row-${desk.id}`}>
                      <TableCell className="font-medium">{desk.name || "-"}</TableCell>
                      <TableCell>{getSpaceName(desk.spaceId)}</TableCell>
                      <TableCell className="capitalize">{desk.type}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(desk.status)}>
                          {desk.status || "unknown"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {desk.pricePerDay ? `$${desk.pricePerDay}` : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" data-testid={`button-edit-desk-${desk.id}`}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" data-testid={`button-delete-desk-${desk.id}`}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Monitor className="h-12 w-12 text-muted-foreground/50" />
                <h3 className="mt-4 text-lg font-semibold">No desks configured</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Get started by adding your first desk.
                </p>
                <Button
                  className="mt-4"
                  onClick={() => setIsAddDialogOpen(true)}
                  data-testid="button-add-first-desk"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Your First Desk
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
