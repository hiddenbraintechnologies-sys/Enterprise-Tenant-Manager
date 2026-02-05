import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { SettingsLayout } from "@/components/settings-layout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { useTenant } from "@/contexts/tenant-context";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getBusinessTypeLabel } from "@shared/business-types";

// Country to timezone/currency mapping
const COUNTRY_DEFAULTS: Record<string, { timezone: string; currency: string; label: string }> = {
  india: { timezone: "Asia/Kolkata", currency: "INR", label: "India" },
  malaysia: { timezone: "Asia/Kuala_Lumpur", currency: "MYR", label: "Malaysia" },
  uk: { timezone: "Europe/London", currency: "GBP", label: "United Kingdom" },
  uae: { timezone: "Asia/Dubai", currency: "AED", label: "United Arab Emirates" },
  singapore: { timezone: "Asia/Singapore", currency: "SGD", label: "Singapore" },
  other: { timezone: "UTC", currency: "USD", label: "Other" },
};

interface TenantData {
  tenant: {
    id: string;
    name: string;
    businessType: string;
    country?: string;
    currency?: string;
    timezone?: string;
  };
}

export default function BusinessSettings() {
  const { tenant: authTenant } = useAuth();
  const { businessType } = useTenant();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  
  // Fetch fresh tenant data from API
  const { data: tenantData, isLoading } = useQuery<TenantData>({
    queryKey: ["/api/tenant"],
    enabled: Boolean(authTenant?.id),
  });
  
  // Use API data, fallback to auth context, then defaults
  const tenant = tenantData?.tenant || authTenant;
  const tenantCountry = (tenant as any)?.country?.toLowerCase() || "india";
  const countryDefaults = COUNTRY_DEFAULTS[tenantCountry] || COUNTRY_DEFAULTS.other;
  const tenantTimezone = (tenant as any)?.timezone || countryDefaults.timezone;
  const tenantCurrency = (tenant as any)?.currency || countryDefaults.currency;

  const handleSave = async () => {
    setIsSaving(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    setIsSaving(false);
    toast({ title: "Business settings saved." });
  };

  if (isLoading) {
    return (
      <SettingsLayout title="Business">
        <div className="space-y-6">
          <header>
            <h1 className="text-xl font-semibold">Business</h1>
            <p className="text-sm text-muted-foreground">
              Configure your business settings
            </p>
          </header>
          <Separator />
          <div className="grid gap-4 sm:grid-cols-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      </SettingsLayout>
    );
  }

  return (
    <SettingsLayout title="Business">
      <div className="space-y-6">
        <header>
          <h1 className="text-xl font-semibold">Business</h1>
          <p className="text-sm text-muted-foreground">
            Configure your business settings
          </p>
        </header>

        <Separator />

        {/* Business Profile Section */}
        <section className="space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Business profile</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="businessName">Business name</Label>
              <Input
                id="businessName"
                defaultValue={tenant?.name || "My Business"}
                placeholder="Business name"
                data-testid="input-business-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="businessType">Business type</Label>
              <Input
                id="businessType"
                value={getBusinessTypeLabel(tenant?.businessType || "service")}
                disabled
                className="bg-muted"
                data-testid="input-business-type"
              />
              <p className="text-xs text-muted-foreground">
                Can't be changed after registration
              </p>
            </div>
          </div>
        </section>

        <Separator />

        {/* Location Settings Section */}
        <section className="space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Business Location</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                value={countryDefaults.label}
                disabled
                className="bg-muted"
                data-testid="input-country"
              />
              <p className="text-xs text-muted-foreground">
                Set during registration
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="timezone">Time zone</Label>
              <Select 
                defaultValue={tenantTimezone}
                disabled={businessType === "clinic"}
              >
                <SelectTrigger data-testid="select-timezone">
                  <SelectValue placeholder="Select time zone" />
                </SelectTrigger>
                <SelectContent side="bottom">
                  <SelectItem value="Asia/Kolkata">Asia/Kolkata (IST)</SelectItem>
                  <SelectItem value="Asia/Kuala_Lumpur">Asia/Kuala Lumpur (MYT)</SelectItem>
                  <SelectItem value="Asia/Singapore">Asia/Singapore (SGT)</SelectItem>
                  <SelectItem value="Asia/Dubai">Asia/Dubai (GST)</SelectItem>
                  <SelectItem value="Europe/London">Europe/London (GMT)</SelectItem>
                  <SelectItem value="America/New_York">America/New York (EST)</SelectItem>
                  <SelectItem value="UTC">UTC</SelectItem>
                </SelectContent>
              </Select>
              {businessType === "clinic" && (
                <p className="text-xs text-muted-foreground">
                  Locked for healthcare businesses
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Select 
                defaultValue={tenantCurrency}
                disabled={businessType === "clinic"}
              >
                <SelectTrigger data-testid="select-currency">
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent side="bottom">
                  <SelectItem value="INR">INR (₹)</SelectItem>
                  <SelectItem value="MYR">MYR (RM)</SelectItem>
                  <SelectItem value="GBP">GBP (£)</SelectItem>
                  <SelectItem value="AED">AED (د.إ)</SelectItem>
                  <SelectItem value="SGD">SGD ($)</SelectItem>
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="EUR">EUR (€)</SelectItem>
                </SelectContent>
              </Select>
              {businessType === "clinic" && (
                <p className="text-xs text-muted-foreground">
                  Locked for healthcare businesses
                </p>
              )}
            </div>
          </div>
        </section>

        <Separator />

        <div className="flex justify-end">
          <Button 
            onClick={handleSave}
            disabled={isSaving}
            data-testid="button-save-business"
          >
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>
    </SettingsLayout>
  );
}
