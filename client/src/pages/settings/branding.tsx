import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Palette, Eye, Save, RotateCcw, Image, Mail } from "lucide-react";
import { TenantBranding, DEFAULT_BRANDING } from "@/contexts/branding-context";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { ImageUploader } from "@/components/branding/image-uploader";

function ColorPicker({ 
  label, 
  value, 
  onChange, 
  description 
}: { 
  label: string; 
  value: string; 
  onChange: (value: string) => void;
  description?: string;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        <div 
          className="w-10 h-10 rounded-md border cursor-pointer overflow-hidden"
          style={{ backgroundColor: value }}
        >
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full h-full opacity-0 cursor-pointer"
            data-testid={`color-${label.toLowerCase().replace(/\s+/g, "-")}`}
          />
        </div>
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#000000"
          className="w-28 font-mono text-sm"
          maxLength={7}
          data-testid={`input-${label.toLowerCase().replace(/\s+/g, "-")}`}
        />
      </div>
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
    </div>
  );
}

function BrandPreview({ branding }: { branding: Partial<TenantBranding> }) {
  return (
    <div className="border rounded-lg p-4 bg-background" data-testid="section-brand-preview">
      <p className="text-sm font-medium text-muted-foreground mb-3">Live Preview</p>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          {branding.logoUrl ? (
            <img 
              src={branding.logoUrl} 
              alt="Logo" 
              className="h-10 w-auto object-contain"
              data-testid="img-preview-logo"
            />
          ) : (
            <div 
              className="h-10 w-10 rounded flex items-center justify-center text-white font-bold"
              style={{ backgroundColor: branding.primaryColor }}
              data-testid="placeholder-preview-logo"
            >
              B
            </div>
          )}
          <span className="font-semibold" data-testid="text-preview-business-name">Your Business</span>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Button 
            size="sm"
            style={{ 
              backgroundColor: branding.primaryColor,
              color: "#fff",
              borderColor: branding.primaryColor
            }}
            data-testid="button-preview-primary"
          >
            Primary Button
          </Button>
          <Button 
            size="sm"
            variant="outline"
            style={{ 
              borderColor: branding.secondaryColor,
              color: branding.secondaryColor
            }}
            data-testid="button-preview-secondary"
          >
            Secondary
          </Button>
          <Button 
            size="sm"
            style={{ 
              backgroundColor: branding.accentColor,
              color: "#fff"
            }}
            data-testid="button-preview-accent"
          >
            Accent
          </Button>
        </div>
        
        <div className="flex items-center gap-2 text-sm">
          <div 
            className="w-4 h-4 rounded-full"
            style={{ backgroundColor: branding.primaryColor }}
          />
          <span style={{ color: branding.foregroundColor }}>Primary</span>
          <div 
            className="w-4 h-4 rounded-full"
            style={{ backgroundColor: branding.secondaryColor }}
          />
          <span style={{ color: branding.foregroundColor }}>Secondary</span>
          <div 
            className="w-4 h-4 rounded-full"
            style={{ backgroundColor: branding.accentColor }}
          />
          <span style={{ color: branding.foregroundColor }}>Accent</span>
        </div>
      </div>
    </div>
  );
}

export default function BrandingSettings() {
  const { toast } = useToast();
  const [formData, setFormData] = useState<Partial<TenantBranding>>({});
  const [hasChanges, setHasChanges] = useState(false);
  
  const { data: branding, isLoading } = useQuery<TenantBranding>({
    queryKey: ["/api/tenant/branding"],
  });
  
  useEffect(() => {
    if (branding) {
      setFormData(branding);
    }
  }, [branding]);
  
  const updateMutation = useMutation({
    mutationFn: (data: Partial<TenantBranding>) =>
      apiRequest("PUT", "/api/tenant/branding", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tenant/branding"] });
      setHasChanges(false);
      toast({ title: "Branding updated", description: "Your brand settings have been saved." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update branding.", variant: "destructive" });
    },
  });
  
  const updateField = (field: keyof TenantBranding, value: string | null) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };
  
  const handleSave = () => {
    updateMutation.mutate(formData);
  };
  
  const handleReset = () => {
    if (branding) {
      setFormData(branding);
      setHasChanges(false);
    }
  };
  
  const handleResetToDefaults = () => {
    setFormData(prev => ({
      ...prev,
      ...DEFAULT_BRANDING,
    }));
    setHasChanges(true);
  };
  
  if (isLoading) {
    return (
      <DashboardLayout 
        title="Branding" 
        breadcrumbs={[
          { label: "Settings", href: "/settings" },
          { label: "Branding" }
        ]}
      >
        <div className="space-y-6">
          <Skeleton className="h-[400px] w-full" />
        </div>
      </DashboardLayout>
    );
  }
  
  return (
    <DashboardLayout 
      title="Branding" 
      breadcrumbs={[
        { label: "Settings", href: "/settings" },
        { label: "Branding" }
      ]}
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Company Branding</h1>
            <p className="text-muted-foreground">Customize your business identity across the platform</p>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              onClick={handleReset}
              disabled={!hasChanges || updateMutation.isPending}
              data-testid="button-reset"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
            <Button 
              onClick={handleSave}
              disabled={!hasChanges || updateMutation.isPending}
              data-testid="button-save-branding"
            >
              <Save className="h-4 w-4 mr-2" />
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
        
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Image className="h-5 w-5" />
                  <CardTitle className="text-lg font-medium">Company Identity</CardTitle>
                </div>
                <CardDescription>Upload your logo and favicon</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-6 sm:grid-cols-2">
                  <ImageUploader
                    label="Logo"
                    type="logo"
                    value={formData.logoUrl || null}
                    onChange={(url) => updateField("logoUrl", url)}
                    acceptTypes="image/png,image/svg+xml,image/jpeg,image/webp"
                    description="PNG or SVG recommended, minimum 200x50px"
                    previewClassName="h-12 max-w-[200px]"
                  />
                  <ImageUploader
                    label="Favicon"
                    type="favicon"
                    value={formData.faviconUrl || null}
                    onChange={(url) => updateField("faviconUrl", url)}
                    acceptTypes="image/png,image/x-icon,image/vnd.microsoft.icon"
                    description="32x32px PNG or ICO format"
                    previewClassName="h-8 w-8"
                  />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  <CardTitle className="text-lg font-medium">Brand Colors</CardTitle>
                </div>
                <CardDescription>Define your brand color palette</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-3">
                  <ColorPicker
                    label="Primary Color"
                    value={formData.primaryColor || DEFAULT_BRANDING.primaryColor!}
                    onChange={(val) => updateField("primaryColor", val)}
                    description="Main brand color for buttons and links"
                  />
                  <ColorPicker
                    label="Secondary Color"
                    value={formData.secondaryColor || DEFAULT_BRANDING.secondaryColor!}
                    onChange={(val) => updateField("secondaryColor", val)}
                    description="Complementary color for highlights"
                  />
                  <ColorPicker
                    label="Accent Color"
                    value={formData.accentColor || DEFAULT_BRANDING.accentColor!}
                    onChange={(val) => updateField("accentColor", val)}
                    description="Used for badges and accents"
                  />
                </div>
                
                <Separator />
                
                <div className="flex justify-end">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleResetToDefaults}
                    data-testid="button-reset-colors"
                  >
                    Reset to Default Colors
                  </Button>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  <CardTitle className="text-lg font-medium">Email Branding</CardTitle>
                </div>
                <CardDescription>Customize email notifications sent to your customers</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="emailFromName">From Name</Label>
                    <Input
                      id="emailFromName"
                      value={formData.emailFromName || ""}
                      onChange={(e) => updateField("emailFromName", e.target.value || null)}
                      placeholder="Your Business Name"
                      data-testid="input-email-from-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="supportEmail">Support Email</Label>
                    <Input
                      id="supportEmail"
                      type="email"
                      value={formData.supportEmail || ""}
                      onChange={(e) => updateField("supportEmail", e.target.value || null)}
                      placeholder="support@yourbusiness.com"
                      data-testid="input-support-email"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="emailSignature">Email Signature</Label>
                  <Textarea
                    id="emailSignature"
                    value={formData.emailSignature || ""}
                    onChange={(e) => updateField("emailSignature", e.target.value || null)}
                    placeholder="Best regards,
Your Business Team"
                    className="min-h-[80px] resize-none"
                    data-testid="textarea-email-signature"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="space-y-6">
            <Card className="sticky top-4">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  <CardTitle className="text-lg font-medium">Preview</CardTitle>
                </div>
                <CardDescription>See how your branding looks</CardDescription>
              </CardHeader>
              <CardContent>
                <BrandPreview branding={formData} />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
