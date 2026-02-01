import { useState, useMemo } from "react";
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
import { Building2, User, Bell, Shield, Palette, Users, Copy, RefreshCw, ExternalLink, ChevronRight, ChevronDown, Save, RotateCcw, Mail } from "lucide-react";
import { Link } from "wouter";
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
import { ImageUploader } from "@/components/branding/image-uploader";
import { TenantBranding, DEFAULT_BRANDING } from "@/contexts/branding-context";
import { Textarea } from "@/components/ui/textarea";

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
  
  // Branding section state
  const [brandingFormData, setBrandingFormData] = useState<Partial<TenantBranding>>({});
  const [brandingHasChanges, setBrandingHasChanges] = useState(false);
  const [advancedBrandingExpanded, setAdvancedBrandingExpanded] = useState(false);

  const getInitials = (firstName?: string | null, lastName?: string | null) => {
    const first = firstName?.charAt(0) || "";
    const last = lastName?.charAt(0) || "";
    return (first + last).toUpperCase() || "U";
  };

  // Tenant branding query
  const { data: brandingResponse, isLoading: brandingLoading } = useQuery<{ branding: TenantBranding; features: Record<string, boolean> }>({
    queryKey: ["/api/tenant/branding"],
    enabled: !!tenant,
  });
  
  const branding = brandingResponse?.branding;
  
  // Stable cache-buster for logo preview
  const logoCacheBuster = useMemo(() => Date.now(), [branding?.logoUrl]);

  // Update branding mutation
  const updateBrandingMutation = useMutation({
    mutationFn: (data: Partial<TenantBranding>) =>
      apiRequest("PUT", "/api/tenant/branding", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tenant/branding"] });
      setBrandingHasChanges(false);
      toast({ title: "Branding updated", description: "Your branding settings have been saved." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update branding.", variant: "destructive" });
    },
  });

  const handleBrandingChange = (field: keyof TenantBranding, value: string | null) => {
    setBrandingFormData(prev => ({ ...prev, [field]: value }));
    setBrandingHasChanges(true);
  };

  const handleBrandingSave = () => {
    updateBrandingMutation.mutate(brandingFormData);
  };

  const handleBrandingReset = () => {
    setBrandingFormData({});
    setBrandingHasChanges(false);
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
              Profile information is managed through your account provider.
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
            </div>
            
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Select 
                  defaultValue="Asia/Kolkata"
                  disabled={businessType === "clinic"}
                >
                  <SelectTrigger data-testid="select-timezone">
                    <SelectValue placeholder="Select timezone" />
                  </SelectTrigger>
                  <SelectContent side="bottom">
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
                  <SelectContent side="bottom">
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
            
            <Separator />
            
            <div className="space-y-4" data-testid="section-branding">
              <div>
                <p className="font-medium">Company Branding</p>
                <p className="text-sm text-muted-foreground">
                  Customize logo, colors, and email branding
                </p>
              </div>
              
              {brandingLoading ? (
                <div className="py-4 text-center text-sm text-muted-foreground">Loading branding settings...</div>
              ) : (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <ImageUploader
                      label="Logo"
                      type="logo"
                      value={brandingFormData.logoUrl ?? branding?.logoUrl ?? null}
                      onChange={(url: string | null) => handleBrandingChange("logoUrl", url)}
                      acceptTypes="image/png"
                      description="PNG only, max 1MB"
                    />
                    <ImageUploader
                      label="Favicon"
                      type="favicon"
                      value={brandingFormData.faviconUrl ?? branding?.faviconUrl ?? null}
                      onChange={(url: string | null) => handleBrandingChange("faviconUrl", url)}
                      acceptTypes="image/png,image/x-icon"
                      description="PNG or ICO, max 200KB"
                    />
                  </div>
                  
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="space-y-2">
                      <Label>Primary Color</Label>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-10 h-10 rounded-md border cursor-pointer overflow-hidden"
                          style={{ backgroundColor: brandingFormData.primaryColor ?? branding?.primaryColor ?? DEFAULT_BRANDING.primaryColor }}
                        >
                          <input
                            type="color"
                            value={brandingFormData.primaryColor ?? branding?.primaryColor ?? DEFAULT_BRANDING.primaryColor}
                            onChange={(e) => handleBrandingChange("primaryColor", e.target.value)}
                            className="w-full h-full opacity-0 cursor-pointer"
                            data-testid="color-primary"
                          />
                        </div>
                        <Input
                          value={brandingFormData.primaryColor ?? branding?.primaryColor ?? DEFAULT_BRANDING.primaryColor}
                          onChange={(e) => handleBrandingChange("primaryColor", e.target.value)}
                          className="w-24 font-mono text-sm"
                          maxLength={7}
                          data-testid="input-primary-color"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Secondary Color</Label>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-10 h-10 rounded-md border cursor-pointer overflow-hidden"
                          style={{ backgroundColor: brandingFormData.secondaryColor ?? branding?.secondaryColor ?? DEFAULT_BRANDING.secondaryColor }}
                        >
                          <input
                            type="color"
                            value={brandingFormData.secondaryColor ?? branding?.secondaryColor ?? DEFAULT_BRANDING.secondaryColor}
                            onChange={(e) => handleBrandingChange("secondaryColor", e.target.value)}
                            className="w-full h-full opacity-0 cursor-pointer"
                            data-testid="color-secondary"
                          />
                        </div>
                        <Input
                          value={brandingFormData.secondaryColor ?? branding?.secondaryColor ?? DEFAULT_BRANDING.secondaryColor}
                          onChange={(e) => handleBrandingChange("secondaryColor", e.target.value)}
                          className="w-24 font-mono text-sm"
                          maxLength={7}
                          data-testid="input-secondary-color"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Accent Color</Label>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-10 h-10 rounded-md border cursor-pointer overflow-hidden"
                          style={{ backgroundColor: brandingFormData.accentColor ?? branding?.accentColor ?? DEFAULT_BRANDING.accentColor }}
                        >
                          <input
                            type="color"
                            value={brandingFormData.accentColor ?? branding?.accentColor ?? DEFAULT_BRANDING.accentColor}
                            onChange={(e) => handleBrandingChange("accentColor", e.target.value)}
                            className="w-full h-full opacity-0 cursor-pointer"
                            data-testid="color-accent"
                          />
                        </div>
                        <Input
                          value={brandingFormData.accentColor ?? branding?.accentColor ?? DEFAULT_BRANDING.accentColor}
                          onChange={(e) => handleBrandingChange("accentColor", e.target.value)}
                          className="w-24 font-mono text-sm"
                          maxLength={7}
                          data-testid="input-accent-color"
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-3 pt-2">
                    <div 
                      className="flex items-center justify-between p-2 -mx-2 rounded-lg cursor-pointer hover-elevate"
                      onClick={() => setAdvancedBrandingExpanded(!advancedBrandingExpanded)}
                      data-testid="button-toggle-advanced-branding"
                    >
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Advanced branding options</span>
                      </div>
                      <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${advancedBrandingExpanded ? "rotate-180" : ""}`} />
                    </div>
                    
                    {advancedBrandingExpanded && (
                      <div className="space-y-4 p-3 border rounded-lg bg-muted/30" data-testid="section-advanced-branding">
                        <div>
                          <p className="text-sm font-medium mb-1">Email Branding</p>
                          <p className="text-xs text-muted-foreground">Customize email notifications sent to your customers</p>
                        </div>
                        
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor="emailFromName">From Name</Label>
                            <Input
                              id="emailFromName"
                              value={brandingFormData.emailFromName ?? branding?.emailFromName ?? ""}
                              onChange={(e) => handleBrandingChange("emailFromName", e.target.value || null)}
                              placeholder="Your Business Name"
                              data-testid="input-email-from-name"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="supportEmail">Support Email</Label>
                            <Input
                              id="supportEmail"
                              type="email"
                              value={brandingFormData.supportEmail ?? branding?.supportEmail ?? ""}
                              onChange={(e) => handleBrandingChange("supportEmail", e.target.value || null)}
                              placeholder="support@yourbusiness.com"
                              data-testid="input-support-email"
                            />
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="emailSignature">Email Signature</Label>
                          <Textarea
                            id="emailSignature"
                            value={brandingFormData.emailSignature ?? branding?.emailSignature ?? ""}
                            onChange={(e) => handleBrandingChange("emailSignature", e.target.value || null)}
                            placeholder="Best regards,&#10;Your Business Team"
                            className="min-h-[80px] resize-none"
                            data-testid="textarea-email-signature"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex justify-end gap-2 pt-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleBrandingReset}
                      disabled={!brandingHasChanges}
                      data-testid="button-reset-branding"
                    >
                      <RotateCcw className="h-4 w-4 mr-1" />
                      Reset
                    </Button>
                    <Button 
                      size="sm" 
                      onClick={handleBrandingSave}
                      disabled={!brandingHasChanges || updateBrandingMutation.isPending}
                      data-testid="button-save-branding"
                    >
                      <Save className="h-4 w-4 mr-1" />
                      {updateBrandingMutation.isPending ? "Saving..." : "Save"}
                    </Button>
                  </div>
                </>
              )}
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
              Security settings are managed through your account provider.
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
