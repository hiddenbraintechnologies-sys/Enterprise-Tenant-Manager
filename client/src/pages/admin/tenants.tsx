import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdmin, AdminGuard, PermissionGuard } from "@/contexts/admin-context";
import { useLocation } from "wouter";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Building2,
  Search,
  Plus,
  MoreVertical,
  Users,
  Calendar,
  CheckCircle,
  XCircle,
  AlertCircle,
  Filter,
  Globe,
  MapPin,
  Briefcase,
  PauseCircle,
  PlayCircle,
  Ban,
  Trash2,
  MinusCircle,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { TenantWipeModal } from "@/components/admin/tenant-wipe-modal";

interface Tenant {
  id: string;
  name: string;
  slug: string | null;
  businessType: "clinic" | "salon" | "pg" | "coworking" | "service" | "real_estate" | "tourism" | "education" | "logistics" | "legal";
  country: "india" | "uae" | "uk" | "malaysia" | "singapore" | "other";
  region: "asia_pacific" | "middle_east" | "europe";
  status: "active" | "suspended" | "cancelled" | "deleted" | "deleting";
  email: string | null;
  phone: string | null;
  subscriptionTier: string;
  maxUsers: number;
  isActive: boolean;
  createdAt: string;
  userCount?: number;
  deletedAt?: string | null;
}

interface TenantsResponse {
  tenants: Tenant[];
  total: number;
  filters: Record<string, string | undefined>;
}

interface ActiveCountry {
  code: string;
  name: string;
  region: string;
  currency: string;
  timezone: string;
}

// Static list used only for filters (showing all possible countries)
const ALL_COUNTRIES = [
  { value: "india", label: "India", flag: "IN" },
  { value: "uae", label: "UAE", flag: "AE" },
  { value: "uk", label: "UK", flag: "GB" },
  { value: "malaysia", label: "Malaysia", flag: "MY" },
  { value: "singapore", label: "Singapore", flag: "SG" },
  { value: "us", label: "United States", flag: "US" },
];

const REGIONS = [
  { value: "asia_pacific", label: "Asia Pacific" },
  { value: "middle_east", label: "Middle East" },
  { value: "europe", label: "Europe" },
];

const BUSINESS_TYPES = [
  { value: "clinic", label: "Clinic", icon: "medical" },
  { value: "salon", label: "Salon", icon: "scissors" },
  { value: "pg", label: "PG/Hostel", icon: "home" },
  { value: "coworking", label: "Coworking", icon: "building" },
  { value: "service", label: "Service", icon: "briefcase" },
  { value: "real_estate", label: "Real Estate", icon: "building2" },
  { value: "tourism", label: "Tourism", icon: "plane" },
  { value: "education", label: "Education", icon: "graduation" },
  { value: "logistics", label: "Logistics", icon: "truck" },
  { value: "legal", label: "Legal", icon: "scale" },
  { value: "software_services", label: "Software Services", icon: "code" },
  { value: "consulting", label: "Consulting", icon: "users" },
];

const STATUSES = [
  { value: "active", label: "Active" },
  { value: "suspended", label: "Suspended" },
  { value: "cancelled", label: "Cancelled" },
  { value: "deleted", label: "Deleted" },
];

// Normalize any "DELETING" status to "deleted" for UI consistency
const normalizeStatus = (status: string): Tenant["status"] => {
  if (status === "deleting" || status === "DELETING") {
    return "deleted";
  }
  return status as Tenant["status"];
};

function TenantsContent() {
  const { isSuperAdmin, hasPermission } = useAdmin();
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [countryFilter, setCountryFilter] = useState<string>("all");
  const [regionFilter, setRegionFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [businessTypeFilter, setBusinessTypeFilter] = useState<string>("all");
  const { toast } = useToast();

  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [newStatus, setNewStatus] = useState<"active" | "suspended" | "cancelled">("active");
  const [statusReason, setStatusReason] = useState("");
  
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editSubscriptionTier, setEditSubscriptionTier] = useState("");
  const [editMaxUsers, setEditMaxUsers] = useState("");

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingTenant, setDeletingTenant] = useState<Tenant | null>(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [deleteMode, setDeleteMode] = useState<"soft" | "wipe">("soft");
  const [wipeDialogOpen, setWipeDialogOpen] = useState(false);

  // Bulk selection state
  const [selectedTenantIds, setSelectedTenantIds] = useState<Set<string>>(new Set());
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [bulkDeleteReason, setBulkDeleteReason] = useState("");

  // Add tenant dialog state
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addName, setAddName] = useState("");
  const [addBusinessType, setAddBusinessType] = useState("");
  const [addCountry, setAddCountry] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addPhone, setAddPhone] = useState("");
  const [addSubscriptionTier, setAddSubscriptionTier] = useState("free");
  const [addMaxUsers, setAddMaxUsers] = useState("5");

  const buildQueryUrl = () => {
    const params = new URLSearchParams();
    if (countryFilter !== "all") params.set("country", countryFilter);
    if (regionFilter !== "all") params.set("region", regionFilter);
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (businessTypeFilter !== "all") params.set("businessType", businessTypeFilter);
    if (searchQuery) params.set("search", searchQuery);
    const queryString = params.toString();
    return queryString ? `/api/platform-admin/tenants?${queryString}` : "/api/platform-admin/tenants";
  };

  const { data, isLoading } = useQuery<TenantsResponse>({
    queryKey: [buildQueryUrl()],
    staleTime: 30 * 1000,
  });

  // Fetch active countries for the Add Tenant form
  const { data: activeCountries, isLoading: loadingActiveCountries } = useQuery<ActiveCountry[]>({
    queryKey: ["/api/platform-admin/countries"],
    staleTime: 60 * 1000,
  });

  const changeStatusMutation = useMutation({
    mutationFn: async ({ tenantId, status, reason }: { tenantId: string; status: string; reason: string }) => {
      const response = await apiRequest("POST", `/api/platform-admin/tenants/${tenantId}/status`, {
        status,
        reason,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (query) => {
        const key = query.queryKey[0];
        return typeof key === 'string' && key.startsWith('/api/platform-admin/tenants');
      }});
      toast({
        title: "Status Updated",
        description: `Tenant status has been changed to ${newStatus}.`,
      });
      setStatusDialogOpen(false);
      setSelectedTenant(null);
      setStatusReason("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update tenant status",
        variant: "destructive",
      });
    },
  });

  const handleStatusChange = (tenant: Tenant, status: "active" | "suspended" | "cancelled") => {
    setSelectedTenant(tenant);
    setNewStatus(status);
    setStatusDialogOpen(true);
  };

  const confirmStatusChange = () => {
    if (!selectedTenant || !statusReason.trim()) return;
    changeStatusMutation.mutate({
      tenantId: selectedTenant.id,
      status: newStatus,
      reason: statusReason,
    });
  };

  const updateTenantMutation = useMutation({
    mutationFn: async ({ tenantId, data }: { tenantId: string; data: Record<string, unknown> }) => {
      const response = await apiRequest("PATCH", `/api/platform-admin/tenants/${tenantId}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (query) => {
        const key = query.queryKey[0];
        return typeof key === 'string' && key.startsWith('/api/platform-admin/tenants');
      }});
      toast({
        title: "Tenant Updated",
        description: "Tenant details have been saved successfully.",
      });
      setEditDialogOpen(false);
      setEditingTenant(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update tenant",
        variant: "destructive",
      });
    },
  });

  const handleEditTenant = (tenant: Tenant) => {
    setEditingTenant(tenant);
    setEditName(tenant.name);
    setEditEmail(tenant.email || "");
    setEditPhone(tenant.phone || "");
    setEditSubscriptionTier(tenant.subscriptionTier);
    setEditMaxUsers(String(tenant.maxUsers));
    setEditDialogOpen(true);
  };

  const deleteTenantMutation = useMutation({
    mutationFn: async ({ tenantId, reason }: { tenantId: string; reason: string }) => {
      const response = await apiRequest("DELETE", `/api/super-admin/tenants/${tenantId}`, { reason });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (query) => {
        const key = query.queryKey[0];
        return typeof key === 'string' && key.startsWith('/api/platform-admin/tenants');
      }});
      toast({
        title: "Tenant Deleted",
        description: "Tenant has been soft-deleted. Data is retained for audit purposes.",
      });
      setDeleteDialogOpen(false);
      setDeletingTenant(null);
      setDeleteReason("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete tenant",
        variant: "destructive",
      });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (tenantIds: string[]) => {
      const response = await apiRequest("POST", "/api/super-admin/tenants/bulk-delete", { tenantIds });
      return response.json();
    },
    onSuccess: (data: { deletedCount: number }) => {
      queryClient.invalidateQueries({ predicate: (query) => {
        const key = query.queryKey[0];
        return typeof key === 'string' && key.startsWith('/api/platform-admin/tenants');
      }});
      toast({
        title: "Tenants Deleted",
        description: `${data.deletedCount} tenant(s) deleted successfully.`,
      });
      setBulkDeleteDialogOpen(false);
      setSelectedTenantIds(new Set());
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete tenants",
        variant: "destructive",
      });
    },
  });

  const createTenantMutation = useMutation({
    mutationFn: async (data: { name: string; businessType: string; country: string; email: string; phone: string; subscriptionTier: string; maxUsers: string }) => {
      const response = await apiRequest("POST", "/api/super-admin/tenants", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (query) => {
        const key = query.queryKey[0];
        return typeof key === 'string' && key.startsWith('/api/platform-admin/tenants');
      }});
      toast({
        title: "Tenant Created",
        description: "New tenant has been created successfully.",
      });
      setAddDialogOpen(false);
      resetAddForm();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create tenant",
        variant: "destructive",
      });
    },
  });

  const resetAddForm = () => {
    setAddName("");
    setAddBusinessType("");
    setAddCountry("");
    setAddEmail("");
    setAddPhone("");
    setAddSubscriptionTier("free");
    setAddMaxUsers("5");
  };

  const handleAddTenant = () => {
    resetAddForm();
    setAddDialogOpen(true);
  };

  const confirmAddTenant = () => {
    if (!addName.trim() || !addBusinessType || !addCountry) return;
    createTenantMutation.mutate({
      name: addName,
      businessType: addBusinessType,
      country: addCountry,
      email: addEmail,
      phone: addPhone,
      subscriptionTier: addSubscriptionTier,
      maxUsers: addMaxUsers,
    });
  };

  const handleDeleteTenant = (tenant: Tenant) => {
    setDeletingTenant(tenant);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteTenant = () => {
    if (!deletingTenant || !deleteReason.trim()) return;
    deleteTenantMutation.mutate({
      tenantId: deletingTenant.id,
      reason: deleteReason,
    });
  };

  const confirmEditTenant = () => {
    if (!editingTenant || !editName.trim()) return;
    updateTenantMutation.mutate({
      tenantId: editingTenant.id,
      data: {
        name: editName,
        email: editEmail || null,
        phone: editPhone || null,
        subscriptionTier: editSubscriptionTier,
        maxUsers: parseInt(editMaxUsers) || 5,
      },
    });
  };

  const getStatusBadge = (status: Tenant["status"]) => {
    // Normalize DELETING to deleted
    const normalizedStatus = normalizeStatus(status);
    switch (normalizedStatus) {
      case "active":
        return <Badge variant="default" className="gap-1"><CheckCircle className="h-3 w-3" />Active</Badge>;
      case "suspended":
        return <Badge variant="secondary" className="gap-1"><PauseCircle className="h-3 w-3" />Suspended</Badge>;
      case "cancelled":
        return <Badge variant="destructive" className="gap-1"><Ban className="h-3 w-3" />Cancelled</Badge>;
      case "deleted":
      case "deleting":
        return <Badge variant="outline" className="gap-1 text-muted-foreground"><MinusCircle className="h-3 w-3" />Deleted</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const tenants = data?.tenants || [];

  // Bulk selection helpers
  const selectableTenants = tenants.filter(t => normalizeStatus(t.status) !== "deleted");
  const allSelectableSelected = selectableTenants.length > 0 && 
    selectableTenants.every(t => selectedTenantIds.has(t.id));
  const someSelected = selectedTenantIds.size > 0;

  const toggleSelectAll = () => {
    if (allSelectableSelected) {
      setSelectedTenantIds(new Set());
    } else {
      setSelectedTenantIds(new Set(selectableTenants.map(t => t.id)));
    }
  };

  const toggleSelectTenant = (tenantId: string) => {
    const newSet = new Set(selectedTenantIds);
    if (newSet.has(tenantId)) {
      newSet.delete(tenantId);
    } else {
      newSet.add(tenantId);
    }
    setSelectedTenantIds(newSet);
  };

  const handleBulkDelete = () => {
    if (selectedTenantIds.size === 0) return;
    setBulkDeleteDialogOpen(true);
  };

  const confirmBulkDelete = () => {
    bulkDeleteMutation.mutate(Array.from(selectedTenantIds));
  };

  const getCountryLabel = (country: string) => {
    return ALL_COUNTRIES.find((c) => c.value === country)?.label || country;
  };

  const getRegionLabel = (region: string) => {
    return REGIONS.find((r) => r.value === region)?.label || region;
  };

  const getBusinessTypeLabel = (type: string) => {
    return BUSINESS_TYPES.find((t) => t.value === type)?.label || type;
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-9 w-32" />
        </div>
        <Card>
          <CardContent className="p-6">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 py-4 border-b last:border-0">
                <Skeleton className="h-10 w-10 rounded" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-6 w-20" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground" data-testid="text-tenants-title">
            Global Tenant Registry
          </h1>
          <p className="text-muted-foreground">
            Manage all businesses across regions and countries
          </p>
        </div>
        {isSuperAdmin && (
          <Button onClick={handleAddTenant} data-testid="button-add-tenant">
            <Plus className="h-4 w-4 mr-2" />
            Add Tenant
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">Filters</CardTitle>
          <div className="flex items-center gap-3 flex-wrap pt-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tenants..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search-tenants"
              />
            </div>
            <Select value={countryFilter} onValueChange={setCountryFilter}>
              <SelectTrigger className="w-[140px]" data-testid="select-country-filter">
                <Globe className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Country" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Countries</SelectItem>
                {ALL_COUNTRIES.map((country) => (
                  <SelectItem key={country.value} value={country.value}>
                    {country.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={regionFilter} onValueChange={setRegionFilter}>
              <SelectTrigger className="w-[150px]" data-testid="select-region-filter">
                <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Region" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Regions</SelectItem>
                {REGIONS.map((region) => (
                  <SelectItem key={region.value} value={region.value}>
                    {region.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]" data-testid="select-status-filter">
                <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {STATUSES.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={businessTypeFilter} onValueChange={setBusinessTypeFilter}>
              <SelectTrigger className="w-[150px]" data-testid="select-business-type-filter">
                <Briefcase className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Business Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {BUSINESS_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2 pt-2">
            <Badge variant="outline">{data?.total || 0} tenants</Badge>
            {(countryFilter !== "all" || regionFilter !== "all" || statusFilter !== "all" || businessTypeFilter !== "all") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setCountryFilter("all");
                  setRegionFilter("all");
                  setStatusFilter("all");
                  setBusinessTypeFilter("all");
                }}
                data-testid="button-clear-filters"
              >
                Clear Filters
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* Bulk action toolbar - visible when tenants are selected */}
          {isSuperAdmin && someSelected && (
            <div className="flex items-center justify-between p-3 mb-4 bg-muted rounded-md">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">
                  {selectedTenantIds.size} tenant{selectedTenantIds.size !== 1 ? 's' : ''} selected
                </span>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBulkDelete}
                data-testid="button-bulk-delete"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Selected
              </Button>
            </div>
          )}
          
          {tenants.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No tenants found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  {isSuperAdmin && (
                    <TableHead className="w-12">
                      <Checkbox
                        checked={allSelectableSelected}
                        onCheckedChange={toggleSelectAll}
                        data-testid="checkbox-select-all"
                      />
                    </TableHead>
                  )}
                  <TableHead>Tenant</TableHead>
                  <TableHead>Business Type</TableHead>
                  <TableHead>Country / Region</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tenants.map((tenant) => {
                  const isDeleted = normalizeStatus(tenant.status) === "deleted";
                  return (
                    <TableRow 
                      key={tenant.id} 
                      data-testid={`row-tenant-${tenant.id}`}
                      className={isDeleted ? "opacity-50" : ""}
                    >
                      {isSuperAdmin && (
                        <TableCell>
                          <Checkbox
                            checked={selectedTenantIds.has(tenant.id)}
                            onCheckedChange={() => toggleSelectTenant(tenant.id)}
                            disabled={isDeleted}
                            data-testid={`checkbox-tenant-${tenant.id}`}
                          />
                        </TableCell>
                      )}
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className={`flex h-10 w-10 items-center justify-center rounded-md ${isDeleted ? "bg-muted" : "bg-primary/10"}`}>
                            <Building2 className={`h-5 w-5 ${isDeleted ? "text-muted-foreground" : "text-primary"}`} />
                          </div>
                          <div>
                            <p className="font-medium">{tenant.name}</p>
                            <p className="text-xs text-muted-foreground">{tenant.slug || tenant.id.slice(0, 8)}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{getBusinessTypeLabel(tenant.businessType)}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          <span className="text-sm">{getCountryLabel(tenant.country)}</span>
                          <span className="text-xs text-muted-foreground">{getRegionLabel(tenant.region)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="capitalize">{tenant.subscriptionTier}</Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(tenant.status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-muted-foreground text-sm">
                          <Calendar className="h-3 w-3" />
                          {new Date(tenant.createdAt).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        {isDeleted ? (
                          <Button variant="ghost" size="icon" disabled>
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        ) : (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" data-testid={`button-tenant-menu-${tenant.id}`}>
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setLocation(`/super-admin/tenants/${tenant.id}`)}>
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setLocation(`/super-admin/tenants/${tenant.id}/users`)}>
                                <Users className="h-4 w-4 mr-2" />
                                Manage Users
                              </DropdownMenuItem>
                              {isSuperAdmin && (
                                <>
                                  <DropdownMenuItem onClick={() => handleEditTenant(tenant)}>Edit Tenant</DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  {tenant.status !== "active" && (
                                    <DropdownMenuItem onClick={() => handleStatusChange(tenant, "active")}>
                                      <PlayCircle className="h-4 w-4 mr-2 text-green-600" />
                                      Activate
                                    </DropdownMenuItem>
                                  )}
                                  {tenant.status === "active" && (
                                    <DropdownMenuItem onClick={() => handleStatusChange(tenant, "suspended")}>
                                      <PauseCircle className="h-4 w-4 mr-2 text-yellow-600" />
                                      Suspend
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem 
                                    onClick={() => handleDeleteTenant(tenant)}
                                    className="text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete Tenant
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {newStatus === "active" ? "Activate" : newStatus === "suspended" ? "Suspend" : "Cancel"} Tenant
            </DialogTitle>
            <DialogDescription>
              {selectedTenant && (
                <>
                  You are about to change the status of <strong>{selectedTenant.name}</strong> from{" "}
                  <Badge variant="outline" className="mx-1">{selectedTenant.status}</Badge> to{" "}
                  <Badge variant={newStatus === "cancelled" ? "destructive" : "default"} className="mx-1">
                    {newStatus}
                  </Badge>
                </>
              )}
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
            {newStatus === "cancelled" && (
              <div className="p-3 bg-destructive/10 text-destructive rounded-md text-sm">
                <AlertCircle className="h-4 w-4 inline mr-2" />
                Cancelling a tenant will disable all access for their users. This action should be used carefully.
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant={newStatus === "cancelled" ? "destructive" : "default"}
              onClick={confirmStatusChange}
              disabled={!statusReason.trim() || changeStatusMutation.isPending}
              data-testid="button-confirm-status-change"
            >
              {changeStatusMutation.isPending ? "Updating..." : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Tenant</DialogTitle>
            <DialogDescription>
              Update tenant information for {editingTenant?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Business Name</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Enter business name"
                data-testid="input-edit-tenant-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                placeholder="Enter email address"
                data-testid="input-edit-tenant-email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-phone">Phone</Label>
              <Input
                id="edit-phone"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                placeholder="Enter phone number"
                data-testid="input-edit-tenant-phone"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-tier">Subscription Tier</Label>
                <Select value={editSubscriptionTier} onValueChange={setEditSubscriptionTier}>
                  <SelectTrigger id="edit-tier" data-testid="select-edit-tenant-tier">
                    <SelectValue placeholder="Select tier" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="pro">Pro</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-max-users">Max Users</Label>
                <Input
                  id="edit-max-users"
                  type="number"
                  min="1"
                  value={editMaxUsers}
                  onChange={(e) => setEditMaxUsers(e.target.value)}
                  data-testid="input-edit-tenant-max-users"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={confirmEditTenant}
              disabled={!editName.trim() || updateTenantMutation.isPending}
              data-testid="button-confirm-edit-tenant"
            >
              {updateTenantMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={(open) => {
        setDeleteDialogOpen(open);
        if (!open) {
          setDeleteMode("soft");
          setDeleteReason("");
        }
      }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Delete Tenant</DialogTitle>
            <DialogDescription>
              {deletingTenant && (
                <>Choose how to delete <strong>{deletingTenant.name}</strong>.</>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-3">
              <Label>Deletion Type</Label>
              <div 
                className={`p-4 border rounded-md cursor-pointer transition-colors ${deleteMode === "soft" ? "border-primary bg-primary/5" : "border-border hover-elevate"}`}
                onClick={() => setDeleteMode("soft")}
                data-testid="option-soft-delete"
              >
                <div className="flex items-start gap-3">
                  <div className={`w-4 h-4 mt-0.5 rounded-full border-2 flex items-center justify-center ${deleteMode === "soft" ? "border-primary" : "border-muted-foreground"}`}>
                    {deleteMode === "soft" && <div className="w-2 h-2 rounded-full bg-primary" />}
                  </div>
                  <div>
                    <p className="font-medium">Soft Delete (Recommended)</p>
                    <p className="text-sm text-muted-foreground">Disable tenant access. All data is retained for audit and can be restored if needed.</p>
                  </div>
                </div>
              </div>
              <div 
                className={`p-4 border rounded-md cursor-pointer transition-colors ${deleteMode === "wipe" ? "border-destructive bg-destructive/5" : "border-border hover-elevate"}`}
                onClick={() => setDeleteMode("wipe")}
                data-testid="option-wipe-delete"
              >
                <div className="flex items-start gap-3">
                  <div className={`w-4 h-4 mt-0.5 rounded-full border-2 flex items-center justify-center ${deleteMode === "wipe" ? "border-destructive" : "border-muted-foreground"}`}>
                    {deleteMode === "wipe" && <div className="w-2 h-2 rounded-full bg-destructive" />}
                  </div>
                  <div>
                    <p className="font-medium text-destructive">Wipe All Data</p>
                    <p className="text-sm text-muted-foreground">Permanently delete all tenant data including users, bookings, invoices, and settings. This cannot be undone.</p>
                  </div>
                </div>
              </div>
            </div>
            
            {deleteMode === "wipe" && (
              <div className="p-3 bg-destructive/10 text-destructive rounded-md text-sm">
                <AlertCircle className="h-4 w-4 inline mr-2" />
                <strong>Warning:</strong> This will permanently delete all data for this tenant. This action cannot be undone.
              </div>
            )}
            
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
              onClick={() => {
                if (deleteMode === "wipe" && deletingTenant) {
                  setDeleteDialogOpen(false);
                  setWipeDialogOpen(true);
                } else {
                  confirmDeleteTenant();
                }
              }}
              disabled={!deleteReason.trim() || deleteTenantMutation.isPending}
              data-testid="button-confirm-delete-tenant"
            >
              {deleteTenantMutation.isPending ? "Deleting..." : deleteMode === "wipe" ? "Continue to Wipe" : "Delete Tenant"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Confirmation Dialog */}
      <Dialog open={bulkDeleteDialogOpen} onOpenChange={(open) => {
        setBulkDeleteDialogOpen(open);
        if (!open) {
          setBulkDeleteReason("");
        }
      }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Delete Selected Tenants</DialogTitle>
            <DialogDescription>
              You are about to delete <strong>{selectedTenantIds.size}</strong> tenant{selectedTenantIds.size !== 1 ? 's' : ''}. 
              This will soft-delete and disable the selected tenants.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-3 bg-destructive/10 text-destructive rounded-md text-sm">
              <AlertCircle className="h-4 w-4 inline mr-2" />
              Selected tenants will be soft-deleted. Data is retained for audit purposes.
            </div>
            <div className="space-y-2">
              <Label htmlFor="bulk-delete-reason">Reason for deletion</Label>
              <Textarea
                id="bulk-delete-reason"
                placeholder="Enter the reason for deleting these tenants..."
                value={bulkDeleteReason}
                onChange={(e) => setBulkDeleteReason(e.target.value)}
                rows={3}
                data-testid="textarea-bulk-delete-reason"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmBulkDelete}
              disabled={!bulkDeleteReason.trim() || bulkDeleteMutation.isPending}
              data-testid="button-confirm-bulk-delete"
            >
              {bulkDeleteMutation.isPending ? "Deleting..." : `Delete ${selectedTenantIds.size} Tenant${selectedTenantIds.size !== 1 ? 's' : ''}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Tenant Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add New Tenant</DialogTitle>
            <DialogDescription>
              Create a new business tenant on the platform.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="add-name">Business Name *</Label>
              <Input
                id="add-name"
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                placeholder="Enter business name"
                data-testid="input-add-tenant-name"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="add-business-type">Business Type *</Label>
                <Select value={addBusinessType} onValueChange={setAddBusinessType}>
                  <SelectTrigger id="add-business-type" data-testid="select-add-business-type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {BUSINESS_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-country">Country *</Label>
                <Select value={addCountry} onValueChange={setAddCountry} disabled={loadingActiveCountries}>
                  <SelectTrigger id="add-country" data-testid="select-add-country">
                    <SelectValue placeholder={loadingActiveCountries ? "Loading..." : "Select country"} />
                  </SelectTrigger>
                  <SelectContent>
                    {activeCountries?.map((country) => (
                      <SelectItem key={country.code} value={country.code.toLowerCase()}>
                        {country.name}
                      </SelectItem>
                    ))}
                    {(!activeCountries || activeCountries.length === 0) && !loadingActiveCountries && (
                      <SelectItem value="" disabled>No active countries</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-email">Email</Label>
              <Input
                id="add-email"
                type="email"
                value={addEmail}
                onChange={(e) => setAddEmail(e.target.value)}
                placeholder="contact@business.com"
                data-testid="input-add-tenant-email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-phone">Phone</Label>
              <Input
                id="add-phone"
                value={addPhone}
                onChange={(e) => setAddPhone(e.target.value)}
                placeholder="+1 234 567 8900"
                data-testid="input-add-tenant-phone"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="add-tier">Subscription Tier</Label>
                <Select value={addSubscriptionTier} onValueChange={setAddSubscriptionTier}>
                  <SelectTrigger id="add-tier" data-testid="select-add-tenant-tier">
                    <SelectValue placeholder="Select tier" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="pro">Pro</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-max-users">Max Users</Label>
                <Input
                  id="add-max-users"
                  type="number"
                  min="1"
                  value={addMaxUsers}
                  onChange={(e) => setAddMaxUsers(e.target.value)}
                  data-testid="input-add-tenant-max-users"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={confirmAddTenant}
              disabled={!addName.trim() || !addBusinessType || !addCountry || createTenantMutation.isPending}
              data-testid="button-confirm-add-tenant"
            >
              {createTenantMutation.isPending ? "Creating..." : "Create Tenant"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tenant Wipe Modal */}
      {deletingTenant && (
        <TenantWipeModal
          open={wipeDialogOpen}
          onOpenChange={(open) => {
            setWipeDialogOpen(open);
            if (!open) {
              setDeletingTenant(null);
              setDeleteReason("");
              setDeleteMode("soft");
            }
          }}
          tenantId={deletingTenant.id}
          tenantName={deletingTenant.name}
        />
      )}
    </div>
  );
}

export default function AdminTenants() {
  return (
    <AdminGuard>
      <PermissionGuard permission="read_tenants">
        <TenantsContent />
      </PermissionGuard>
    </AdminGuard>
  );
}
