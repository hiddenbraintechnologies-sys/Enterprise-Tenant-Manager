import { DashboardLayout } from "@/components/dashboard-layout";
import { NotificationPreferences } from "@/components/notification-preferences";
import { MyAddons } from "@/components/my-addons";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Building2, User, Bell, Shield, Palette, Users, Copy, RefreshCw, ExternalLink } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useTenant } from "@/contexts/tenant-context";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getBusinessTypeLabel } from "@shared/business-types";

interface PortalSettings {
  id: string;
  tenantId: string;
  portalToken: string;
  isEnabled: boolean;
  allowSelfRegistration: boolean;
  allowProfileEdit: boolean;
  allowInvoiceView: boolean;
  allowPayments: boolean;
  welcomeMessage: string | null;
  portalUrl: string;
}

export default function Settings() {
  const { user, tenant } = useAuth();
  const { theme, setTheme } = useTheme();
  const { businessType } = useTenant();
  const { toast } = useToast();

  const getInitials = (firstName?: string | null, lastName?: string | null) => {
    const first = firstName?.charAt(0) || "";
    const last = lastName?.charAt(0) || "";
    return (first + last).toUpperCase() || "U";
  };

  // Customer Portal settings
  const { data: portalSettings, isLoading: portalLoading } = useQuery<PortalSettings>({
    queryKey: ["/api/customer-portal/settings"],
    enabled: !!tenant,
  });

  const updatePortalMutation = useMutation({
    mutationFn: (data: Partial<PortalSettings>) =>
      apiRequest("PATCH", "/api/customer-portal/settings", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customer-portal/settings"] });
      toast({ title: "Settings updated", description: "Customer portal settings saved." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update portal settings.", variant: "destructive" });
    },
  });

  const regenerateTokenMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/customer-portal/regenerate-token"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customer-portal/settings"] });
      toast({ title: "Token regenerated", description: "A new portal link has been created." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to regenerate token.", variant: "destructive" });
    },
  });

  const copyPortalLink = () => {
    if (portalSettings?.portalUrl) {
      navigator.clipboard.writeText(portalSettings.portalUrl);
      toast({ title: "Copied!", description: "Portal link copied to clipboard." });
    }
  };

  return (
    <DashboardLayout title="Settings" breadcrumbs={[{ label: "Settings" }]}>
      <div className="space-y-6">
        {/* Profile Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="h-5 w-5" />
              <CardTitle className="text-lg font-medium">Profile</CardTitle>
            </div>
            <CardDescription>Your personal account information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-6">
              <Avatar className="h-20 w-20">
                <AvatarImage src={user?.profileImageUrl || undefined} alt={user?.firstName || "User"} />
                <AvatarFallback className="text-lg">
                  {getInitials(user?.firstName, user?.lastName)}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="text-lg font-medium" data-testid="text-profile-name">
                  {user?.firstName} {user?.lastName}
                </h3>
                <p className="text-sm text-muted-foreground" data-testid="text-profile-email">
                  {user?.email}
                </p>
              </div>
            </div>
            <Separator />
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  defaultValue={user?.firstName || ""}
                  placeholder="First name"
                  disabled
                  data-testid="input-first-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  defaultValue={user?.lastName || ""}
                  placeholder="Last name"
                  disabled
                  data-testid="input-last-name"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  defaultValue={user?.email || ""}
                  placeholder="Email"
                  disabled
                  data-testid="input-email"
                />
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Profile information is managed through your Replit account.
            </p>
          </CardContent>
        </Card>

        {/* My Add-ons */}
        <MyAddons />

        {/* Appearance Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              <CardTitle className="text-lg font-medium">Appearance</CardTitle>
            </div>
            <CardDescription>Customize how MyBizStream looks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="theme">Theme</Label>
                <p className="text-sm text-muted-foreground">
                  Choose your preferred color scheme
                </p>
              </div>
              <Select value={theme} onValueChange={setTheme}>
                <SelectTrigger className="w-40" data-testid="select-theme">
                  <SelectValue placeholder="Select theme" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Business Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              <CardTitle className="text-lg font-medium">Business</CardTitle>
            </div>
            <CardDescription>Configure your business settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="businessName">Business Name</Label>
                <Input
                  id="businessName"
                  defaultValue={tenant?.name || "My Business"}
                  placeholder="Business name"
                  data-testid="input-business-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="businessType">Business Type</Label>
                <Input
                  id="businessType"
                  value={getBusinessTypeLabel(tenant?.businessType || "service")}
                  disabled
                  className="bg-muted"
                  data-testid="input-business-type"
                />
                <p className="text-xs text-muted-foreground">
                  Business type cannot be changed after registration
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Select 
                  defaultValue="Asia/Kolkata"
                  disabled={businessType === "clinic"}
                >
                  <SelectTrigger data-testid="select-timezone">
                    <SelectValue placeholder="Select timezone" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Asia/Kolkata">Asia/Kolkata (IST)</SelectItem>
                    <SelectItem value="America/New_York">America/New York (EST)</SelectItem>
                    <SelectItem value="Europe/London">Europe/London (GMT)</SelectItem>
                    <SelectItem value="Asia/Dubai">Asia/Dubai (GST)</SelectItem>
                  </SelectContent>
                </Select>
                {businessType === "clinic" && (
                  <p className="text-xs text-muted-foreground">
                    Timezone is locked after registration for Clinic/Healthcare.
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Select 
                  defaultValue="INR"
                  disabled={businessType === "clinic"}
                >
                  <SelectTrigger data-testid="select-currency">
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INR">INR (₹)</SelectItem>
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="EUR">EUR (€)</SelectItem>
                    <SelectItem value="GBP">GBP (£)</SelectItem>
                  </SelectContent>
                </Select>
                {businessType === "clinic" && (
                  <p className="text-xs text-muted-foreground">
                    Currency is locked after registration for Clinic/Healthcare.
                  </p>
                )}
              </div>
            </div>
            <div className="flex justify-end pt-4">
              <Button data-testid="button-save-settings">Save Changes</Button>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <NotificationPreferences />

        {/* Security */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              <CardTitle className="text-lg font-medium">Security</CardTitle>
            </div>
            <CardDescription>Manage your account security</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Security settings are managed through your Replit account.
            </p>
          </CardContent>
        </Card>

        {/* Customer Portal */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                <CardTitle className="text-lg font-medium">Customer Portal</CardTitle>
              </div>
              {portalSettings && (
                <Switch
                  checked={portalSettings.isEnabled}
                  onCheckedChange={(checked) =>
                    updatePortalMutation.mutate({ isEnabled: checked })
                  }
                  disabled={updatePortalMutation.isPending}
                  data-testid="switch-portal-enabled"
                />
              )}
            </div>
            <CardDescription>
              Allow your customers to access a self-service portal for viewing invoices and managing their profile
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {portalLoading ? (
              <p className="text-sm text-muted-foreground">Loading portal settings...</p>
            ) : portalSettings ? (
              <>
                {/* Portal Link */}
                <div className="space-y-2">
                  <Label>Portal Link</Label>
                  <div className="flex gap-2">
                    <Input
                      readOnly
                      value={portalSettings.portalUrl}
                      className="flex-1 font-mono text-sm"
                      data-testid="input-portal-url"
                    />
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={copyPortalLink}
                      title="Copy link"
                      data-testid="button-copy-portal-link"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => regenerateTokenMutation.mutate()}
                      disabled={regenerateTokenMutation.isPending}
                      title="Generate new link"
                      data-testid="button-regenerate-token"
                    >
                      <RefreshCw className={`h-4 w-4 ${regenerateTokenMutation.isPending ? "animate-spin" : ""}`} />
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      asChild
                      title="Open portal"
                    >
                      <a href={portalSettings.portalUrl} target="_blank" rel="noopener noreferrer" data-testid="link-open-portal">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Share this link with customers so they can access their portal
                  </p>
                </div>

                <Separator />

                {/* Portal Permissions */}
                <div className="space-y-4">
                  <Label className="text-base">Customer Permissions</Label>
                  
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium">Self Registration</p>
                      <p className="text-xs text-muted-foreground">Allow customers to create accounts without an invite</p>
                    </div>
                    <Switch
                      checked={portalSettings.allowSelfRegistration}
                      onCheckedChange={(checked) =>
                        updatePortalMutation.mutate({ allowSelfRegistration: checked })
                      }
                      disabled={updatePortalMutation.isPending}
                      data-testid="switch-self-registration"
                    />
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium">Profile Editing</p>
                      <p className="text-xs text-muted-foreground">Allow customers to update their profile information</p>
                    </div>
                    <Switch
                      checked={portalSettings.allowProfileEdit}
                      onCheckedChange={(checked) =>
                        updatePortalMutation.mutate({ allowProfileEdit: checked })
                      }
                      disabled={updatePortalMutation.isPending}
                      data-testid="switch-profile-edit"
                    />
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium">View Invoices</p>
                      <p className="text-xs text-muted-foreground">Allow customers to view their invoices and payment history</p>
                    </div>
                    <Switch
                      checked={portalSettings.allowInvoiceView}
                      onCheckedChange={(checked) =>
                        updatePortalMutation.mutate({ allowInvoiceView: checked })
                      }
                      disabled={updatePortalMutation.isPending}
                      data-testid="switch-invoice-view"
                    />
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium">Online Payments</p>
                      <p className="text-xs text-muted-foreground">Allow customers to make payments through the portal</p>
                    </div>
                    <Switch
                      checked={portalSettings.allowPayments}
                      onCheckedChange={(checked) =>
                        updatePortalMutation.mutate({ allowPayments: checked })
                      }
                      disabled={updatePortalMutation.isPending}
                      data-testid="switch-payments"
                    />
                  </div>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Customer portal is not available for your plan.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
