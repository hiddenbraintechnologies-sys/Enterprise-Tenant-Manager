import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { 
  Loader2, 
  Building2, 
  User, 
  FileText, 
  LogOut, 
  Mail, 
  Phone, 
  MapPin,
  Calendar,
  IndianRupee
} from "lucide-react";
import { format } from "date-fns";
import { queryClient } from "@/lib/queryClient";

interface PortalProfile {
  account: {
    id: string;
    email: string;
    lastLoginAt: string | null;
  };
  customer: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    address: string | null;
  };
  business: {
    name: string;
    logoUrl: string | null;
  };
  settings?: {
    allowProfileEdit: boolean;
    allowInvoiceView: boolean;
    allowPayments: boolean;
  };
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  status: string;
  currency: string;
  totalAmount: string;
  dueDate: string | null;
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  draft: "secondary",
  sent: "outline",
  partial: "default",
  paid: "default",
  overdue: "destructive",
  cancelled: "secondary",
};

export default function PortalDashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({ name: "", phone: "", address: "" });

  const portalToken = localStorage.getItem("portalToken");

  useEffect(() => {
    if (!portalToken) {
      setLocation("/");
    }
  }, [portalToken, setLocation]);

  const { data: profile, isLoading: profileLoading } = useQuery<PortalProfile>({
    queryKey: ["/api/portal/me"],
    queryFn: async () => {
      const res = await fetch("/api/portal/me", {
        headers: { Authorization: `Bearer ${portalToken}` },
      });
      if (!res.ok) {
        if (res.status === 401) {
          localStorage.removeItem("portalToken");
          setLocation("/");
        }
        throw new Error("Failed to fetch profile");
      }
      return res.json();
    },
    enabled: !!portalToken,
  });

  const { data: invoices, isLoading: invoicesLoading } = useQuery<Invoice[]>({
    queryKey: ["/api/portal/invoices"],
    queryFn: async () => {
      const res = await fetch("/api/portal/invoices", {
        headers: { Authorization: `Bearer ${portalToken}` },
      });
      if (!res.ok) {
        if (res.status === 403) return [];
        throw new Error("Failed to fetch invoices");
      }
      return res.json();
    },
    enabled: !!portalToken && !!profile?.settings?.allowInvoiceView,
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: { name: string; phone: string; address: string }) => {
      const res = await fetch("/api/portal/me", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${portalToken}`,
        },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to update profile");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Profile updated" });
      setEditMode(false);
      queryClient.invalidateQueries({ queryKey: ["/api/portal/me"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleLogout = async () => {
    try {
      await fetch("/api/portal/logout", {
        method: "POST",
        headers: { Authorization: `Bearer ${portalToken}` },
      });
    } catch {
    } finally {
      localStorage.removeItem("portalToken");
      localStorage.removeItem("portalBaseToken");
      setLocation("/");
    }
  };

  const handleEditClick = () => {
    if (profile && profile.settings?.allowProfileEdit) {
      setFormData({
        name: profile.customer.name || "",
        phone: profile.customer.phone || "",
        address: profile.customer.address || "",
      });
      setEditMode(true);
    }
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate(formData);
  };

  if (profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {profile.business.logoUrl ? (
              <img
                src={profile.business.logoUrl}
                alt={profile.business.name}
                className="h-8 object-contain"
              />
            ) : (
              <Building2 className="h-8 w-8 text-primary" />
            )}
            <span className="font-semibold text-lg hidden sm:inline">
              {profile.business.name}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground hidden sm:inline">
              {profile.customer.name}
            </span>
            <Button variant="ghost" size="sm" onClick={handleLogout} data-testid="button-logout">
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList>
            <TabsTrigger value="profile" data-testid="tab-profile">
              <User className="h-4 w-4 mr-2" />
              Profile
            </TabsTrigger>
            {profile.settings?.allowInvoiceView && (
              <TabsTrigger value="invoices" data-testid="tab-invoices">
                <FileText className="h-4 w-4 mr-2" />
                Invoices
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-4">
                <div>
                  <CardTitle>Your Profile</CardTitle>
                  <CardDescription>View and update your account information</CardDescription>
                </div>
                {!editMode && profile.settings?.allowProfileEdit && (
                  <Button variant="outline" onClick={handleEditClick} data-testid="button-edit-profile">
                    Edit
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {editMode ? (
                  <form onSubmit={handleSaveProfile} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Name</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        data-testid="input-profile-name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        value={profile.customer.email || ""}
                        disabled
                        className="bg-muted"
                      />
                      <p className="text-xs text-muted-foreground">Email cannot be changed</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        data-testid="input-profile-phone"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="address">Address</Label>
                      <Input
                        id="address"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        data-testid="input-profile-address"
                      />
                    </div>
                    <div className="flex gap-2 pt-4">
                      <Button type="submit" disabled={updateProfileMutation.isPending} data-testid="button-save-profile">
                        {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
                      </Button>
                      <Button type="button" variant="outline" onClick={() => setEditMode(false)}>
                        Cancel
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <User className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium" data-testid="text-profile-name">{profile.customer.name}</p>
                        <p className="text-sm text-muted-foreground">Name</p>
                      </div>
                    </div>
                    <Separator />
                    <div className="flex items-center gap-3">
                      <Mail className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium" data-testid="text-profile-email">{profile.customer.email || "-"}</p>
                        <p className="text-sm text-muted-foreground">Email</p>
                      </div>
                    </div>
                    <Separator />
                    <div className="flex items-center gap-3">
                      <Phone className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium" data-testid="text-profile-phone">{profile.customer.phone || "-"}</p>
                        <p className="text-sm text-muted-foreground">Phone</p>
                      </div>
                    </div>
                    <Separator />
                    <div className="flex items-center gap-3">
                      <MapPin className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium" data-testid="text-profile-address">{profile.customer.address || "-"}</p>
                        <p className="text-sm text-muted-foreground">Address</p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="invoices" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Your Invoices</CardTitle>
                <CardDescription>View your billing history and payment status</CardDescription>
              </CardHeader>
              <CardContent>
                {invoicesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : invoices && invoices.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Invoice</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Due Date</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {invoices.map((invoice) => (
                          <TableRow key={invoice.id} data-testid={`invoice-row-${invoice.id}`}>
                            <TableCell className="font-medium">
                              {invoice.invoiceNumber}
                            </TableCell>
                            <TableCell>
                              {format(new Date(invoice.createdAt), "MMM d, yyyy")}
                            </TableCell>
                            <TableCell>
                              {invoice.dueDate
                                ? format(new Date(invoice.dueDate), "MMM d, yyyy")
                                : "-"}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                {invoice.currency === "INR" && <IndianRupee className="h-3 w-3" />}
                                {parseFloat(invoice.totalAmount).toLocaleString()}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={STATUS_COLORS[invoice.status] as any}>
                                {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <FileText className="h-12 w-12 text-muted-foreground/50" />
                    <p className="mt-4 text-muted-foreground">No invoices yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
