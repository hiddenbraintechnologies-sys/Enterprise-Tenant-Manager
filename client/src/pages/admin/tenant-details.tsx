import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useAdmin, SuperAdminGuard } from "@/contexts/admin-context";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  Building2,
  Calendar,
  Globe,
  MapPin,
  CreditCard,
  User,
  PlayCircle,
  PauseCircle,
  Trash2,
  Users,
  AlertCircle,
  Mail,
  Phone,
  Clock,
} from "lucide-react";

interface TenantDetails {
  id: string;
  name: string;
  slug: string | null;
  businessType: string;
  country: string;
  region: string | null;
  status: "active" | "suspended" | "cancelled" | "deleted";
  subscriptionTier: string;
  email: string | null;
  phone: string | null;
  timezone: string | null;
  currency: string;
  createdAt: string;
  owner: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  } | null;
  userCount: number;
}

const getBusinessTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    clinic: "Healthcare / Clinic",
    salon: "Salon / Spa",
    pg: "PG / Hostel",
    coworking: "Coworking Space",
    general: "General Service",
    real_estate: "Real Estate",
    tourism: "Tourism / Travel",
    education: "Education / Coaching",
    logistics: "Logistics",
    legal: "Legal Services",
    furniture: "Furniture Manufacturing",
    gym: "Gym / Fitness",
  };
  return labels[type] || type;
};

const getCountryLabel = (code: string) => {
  const labels: Record<string, string> = {
    IN: "India",
    GB: "United Kingdom",
    AE: "UAE",
    MY: "Malaysia",
    SG: "Singapore",
    US: "United States",
  };
  return labels[code] || code;
};

function TenantDetailsContent() {
  const [, params] = useRoute("/super-admin/tenants/:tenantId");
  const tenantId = params?.tenantId;
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { isSuperAdmin } = useAdmin();

  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<"active" | "suspended" | "deleted">("active");
  const [statusReason, setStatusReason] = useState("");

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteReason, setDeleteReason] = useState("");

  const { data: tenant, isLoading, error } = useQuery<TenantDetails>({
    queryKey: ["/api/super-admin/tenants", tenantId],
    queryFn: async () => {
      const adminToken = localStorage.getItem("mybizstream_admin_token");
      const headers: Record<string, string> = {};
      if (adminToken) {
        headers.Authorization = `Bearer ${adminToken}`;
      }
      const res = await fetch(`/api/super-admin/tenants/${tenantId}`, {
        credentials: "include",
        headers,
      });
      if (!res.ok) {
        if (res.status === 404) throw new Error("Tenant not found");
        throw new Error("Failed to fetch tenant");
      }
      return res.json();
    },
    enabled: !!tenantId,
  });

  const changeStatusMutation = useMutation({
    mutationFn: async ({ status, reason }: { status: string; reason: string }) => {
      const response = await apiRequest("POST", `/api/platform-admin/tenants/${tenantId}/status`, {
        status,
        reason,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/tenants", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["/api/platform-admin/tenants"] });
      toast({
        title: "Status Updated",
        description: `Tenant status has been updated successfully.`,
      });
      setStatusDialogOpen(false);
      setStatusReason("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update status",
        variant: "destructive",
      });
    },
  });

  const deleteTenantMutation = useMutation({
    mutationFn: async (reason: string) => {
      const response = await apiRequest("DELETE", `/api/super-admin/tenants/${tenantId}`, {
        reason,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/platform-admin/tenants"] });
      toast({
        title: "Tenant Deleted",
        description: "Tenant has been soft-deleted. Data is retained for audit purposes.",
      });
      setDeleteDialogOpen(false);
      setLocation("/super-admin/tenants");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete tenant",
        variant: "destructive",
      });
    },
  });

  const handleStatusChange = (status: "active" | "suspended") => {
    setNewStatus(status);
    setStatusDialogOpen(true);
  };

  const handleDelete = () => {
    setDeleteDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge variant="default" className="bg-green-600">Active</Badge>;
      case "suspended":
        return <Badge variant="secondary" className="bg-yellow-500 text-black">Suspended</Badge>;
      case "cancelled":
        return <Badge variant="destructive">Cancelled</Badge>;
      case "deleted":
        return <Badge variant="destructive" className="bg-gray-600">Deleted</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (error || !tenant) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
            <h3 className="text-lg font-medium mb-2">Tenant Not Found</h3>
            <p className="text-muted-foreground mb-4">
              The tenant you're looking for doesn't exist or you don't have access.
            </p>
            <Button variant="outline" onClick={() => setLocation("/super-admin/tenants")}>
              Back to Tenants
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isDeleted = tenant.status === "deleted";

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/super-admin/tenants")} data-testid="button-back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex h-12 w-12 items-center justify-center rounded-md bg-primary/10">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground" data-testid="text-tenant-name">
              {tenant.name}
            </h1>
            <div className="flex items-center gap-2 text-muted-foreground">
              <span>{tenant.slug || tenant.id.slice(0, 8)}</span>
              {getStatusBadge(tenant.status)}
            </div>
          </div>
        </div>
        
        {isSuperAdmin && !isDeleted && (
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              onClick={() => setLocation(`/super-admin/tenants/${tenant.id}/users`)}
              data-testid="button-manage-users"
            >
              <Users className="h-4 w-4 mr-2" />
              Manage Users
            </Button>
            {tenant.status !== "active" && (
              <Button 
                variant="default" 
                onClick={() => handleStatusChange("active")}
                data-testid="button-activate"
              >
                <PlayCircle className="h-4 w-4 mr-2" />
                Activate
              </Button>
            )}
            {tenant.status === "active" && (
              <Button 
                variant="secondary" 
                onClick={() => handleStatusChange("suspended")}
                data-testid="button-suspend"
              >
                <PauseCircle className="h-4 w-4 mr-2" />
                Suspend
              </Button>
            )}
            <Button 
              variant="destructive" 
              onClick={handleDelete}
              data-testid="button-delete"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        )}
      </div>

      {tenant.status === "suspended" && (
        <div className="p-4 bg-yellow-500/10 border border-yellow-500/50 rounded-md flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-yellow-600" />
          <div>
            <p className="font-medium text-yellow-700">Tenant Suspended</p>
            <p className="text-sm text-yellow-600">Users cannot access this tenant until it is reactivated.</p>
          </div>
        </div>
      )}

      {isDeleted && (
        <div className="p-4 bg-destructive/10 border border-destructive/50 rounded-md flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-destructive" />
          <div>
            <p className="font-medium text-destructive">Tenant Deleted</p>
            <p className="text-sm text-destructive/80">This tenant has been soft-deleted. Data is retained for audit purposes.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Business Information</CardTitle>
            <CardDescription>Core tenant details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Business Type
              </span>
              <Badge variant="outline">{getBusinessTypeLabel(tenant.businessType)}</Badge>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Country
              </span>
              <span>{getCountryLabel(tenant.country)}</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Region
              </span>
              <span>{tenant.region || "Not specified"}</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Timezone
              </span>
              <span>{tenant.timezone || "Not specified"}</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Currency
              </span>
              <span>{tenant.currency}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Subscription & Status</CardTitle>
            <CardDescription>Plan and account information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Plan
              </span>
              <Badge variant="secondary" className="capitalize">{tenant.subscriptionTier}</Badge>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-2">
                <Users className="h-4 w-4" />
                Users
              </span>
              <span>{tenant.userCount} users</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Created
              </span>
              <span>{new Date(tenant.createdAt).toLocaleDateString()}</span>
            </div>
            {tenant.owner && (
              <>
                <Separator />
                <div className="space-y-2">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Primary Owner
                  </span>
                  <div className="pl-6 space-y-1">
                    <p className="font-medium">
                      {tenant.owner.firstName && tenant.owner.lastName 
                        ? `${tenant.owner.firstName} ${tenant.owner.lastName}`
                        : tenant.owner.email}
                    </p>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {tenant.owner.email}
                    </p>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
            <CardDescription>Tenant contact details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email
              </span>
              <span>{tenant.email || "Not provided"}</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Phone
              </span>
              <span>{tenant.phone || "Not provided"}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {newStatus === "active" ? "Activate" : "Suspend"} Tenant
            </DialogTitle>
            <DialogDescription>
              You are about to {newStatus === "active" ? "activate" : "suspend"} <strong>{tenant.name}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reason">Reason for status change</Label>
              <Textarea
                id="reason"
                placeholder="Enter the reason for this status change..."
                value={statusReason}
                onChange={(e) => setStatusReason(e.target.value)}
                rows={3}
                data-testid="textarea-status-reason"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant={newStatus === "suspended" ? "secondary" : "default"}
              onClick={() => changeStatusMutation.mutate({ status: newStatus, reason: statusReason })}
              disabled={!statusReason.trim() || changeStatusMutation.isPending}
              data-testid="button-confirm-status"
            >
              {changeStatusMutation.isPending ? "Updating..." : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Tenant</DialogTitle>
            <DialogDescription>
              You are about to delete <strong>{tenant.name}</strong>. This will permanently disable the tenant.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-3 bg-destructive/10 text-destructive rounded-md text-sm">
              <AlertCircle className="h-4 w-4 inline mr-2" />
              This will permanently disable the tenant. Data will be retained for audit purposes.
            </div>
            <div className="space-y-2">
              <Label htmlFor="delete-reason">Reason for deletion</Label>
              <Textarea
                id="delete-reason"
                placeholder="Enter the reason for deleting this tenant..."
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                rows={3}
                data-testid="textarea-delete-reason"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteTenantMutation.mutate(deleteReason)}
              disabled={!deleteReason.trim() || deleteTenantMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteTenantMutation.isPending ? "Deleting..." : "Delete Tenant"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function TenantDetails() {
  return (
    <SuperAdminGuard>
      <TenantDetailsContent />
    </SuperAdminGuard>
  );
}
