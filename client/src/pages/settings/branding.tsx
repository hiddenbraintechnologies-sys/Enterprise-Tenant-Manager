import { useState, useEffect, useMemo } from "react";
import { SettingsLayout } from "@/components/settings-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { TenantBranding, DEFAULT_BRANDING } from "@/contexts/branding-context";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { ImageUploader } from "@/components/branding/image-uploader";

function ColorPicker({ 
  label, 
  value, 
  onChange
}: { 
  label: string; 
  value: string; 
  onChange: (value: string) => void;
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
    </div>
  );
}

function BrandPreview({ branding }: { branding: Partial<TenantBranding> }) {
  const logoCacheBuster = useMemo(() => Date.now(), [branding.logoUrl]);
  
  return (
    <div className="border rounded-lg p-4 bg-muted/30" data-testid="section-brand-preview">
      <p className="text-sm font-medium text-muted-foreground mb-3">Live Preview</p>
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          {branding.logoUrl ? (
            <img 
              src={`${branding.logoUrl}?v=${logoCacheBuster}`} 
              alt="Logo" 
              className="h-8 w-auto object-contain"
              data-testid="img-preview-logo"
            />
          ) : (
            <div 
              className="h-8 w-8 rounded flex items-center justify-center text-white font-bold text-sm"
              style={{ backgroundColor: branding.primaryColor }}
              data-testid="placeholder-preview-logo"
            >
              B
            </div>
          )}
          <span className="font-medium text-sm" data-testid="text-preview-business-name">Your Business</span>
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
            Primary
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
      </div>
    </div>
  );
}

export default function BrandingSettings() {
  const { toast } = useToast();
  const [formData, setFormData] = useState<Partial<TenantBranding>>({});
  const [hasChanges, setHasChanges] = useState(false);
  
  const { data: brandingResponse, isLoading } = useQuery<{ branding: TenantBranding; features: Record<string, boolean> }>({
    queryKey: ["/api/tenant/branding"],
  });
  
  const branding = brandingResponse?.branding;
  
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
      toast({ title: "Branding updated" });
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
      <SettingsLayout title="Branding">
        <div className="space-y-6">
          <Skeleton className="h-[400px] w-full" />
        </div>
      </SettingsLayout>
    );
  }
  
  return (
    <SettingsLayout title="Branding">
      <div className="space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Branding</h1>
            <p className="text-sm text-muted-foreground">
              Customize your company identity
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleReset}
              disabled={!hasChanges || updateMutation.isPending}
              data-testid="button-reset"
            >
              Reset
            </Button>
            <Button 
              size="sm"
              onClick={handleSave}
              disabled={!hasChanges || updateMutation.isPending}
              data-testid="button-save-branding"
            >
              {updateMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        </header>

        <Separator />

        {/* Logo & Favicon Section */}
        <section className="space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Logo & favicon</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <ImageUploader
              label="Logo"
              type="logo"
              value={formData.logoUrl || null}
              onChange={(url) => updateField("logoUrl", url)}
              acceptTypes="image/png"
              description="PNG • up to 1 MB • 200×50+ recommended"
              previewClassName="h-12 max-w-[200px]"
            />
            <ImageUploader
              label="Favicon"
              type="favicon"
              value={formData.faviconUrl || null}
              onChange={(url) => updateField("faviconUrl", url)}
              acceptTypes="image/png,image/x-icon,image/vnd.microsoft.icon"
              description="PNG/ICO • up to 200 KB • 32×32 recommended"
              previewClassName="h-8 w-8"
            />
          </div>
        </section>

        <Separator />

        {/* Brand Colors Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Brand colors</h2>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={handleResetToDefaults}
              data-testid="button-reset-colors"
            >
              Reset to defaults
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <ColorPicker
              label="Primary"
              value={formData.primaryColor || DEFAULT_BRANDING.primaryColor!}
              onChange={(val) => updateField("primaryColor", val)}
            />
            <ColorPicker
              label="Secondary"
              value={formData.secondaryColor || DEFAULT_BRANDING.secondaryColor!}
              onChange={(val) => updateField("secondaryColor", val)}
            />
            <ColorPicker
              label="Accent"
              value={formData.accentColor || DEFAULT_BRANDING.accentColor!}
              onChange={(val) => updateField("accentColor", val)}
            />
          </div>
        </section>

        <Separator />

        {/* Email Branding Section */}
        <section className="space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Email branding</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="emailFromName">From name</Label>
              <Input
                id="emailFromName"
                value={formData.emailFromName || ""}
                onChange={(e) => updateField("emailFromName", e.target.value || null)}
                placeholder="Your Business Name"
                data-testid="input-email-from-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="supportEmail">Support email</Label>
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
            <Label htmlFor="emailSignature">Email signature</Label>
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
        </section>

        <Separator />

        {/* Preview Section */}
        <section className="space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Preview</h2>
          <BrandPreview branding={formData} />
        </section>
      </div>
    </SettingsLayout>
  );
}
