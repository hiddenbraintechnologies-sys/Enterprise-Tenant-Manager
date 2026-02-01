import { useState } from "react";
import { SettingsLayout } from "@/components/settings-layout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
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

export default function BusinessSettings() {
  const { tenant } = useAuth();
  const { businessType } = useTenant();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    setIsSaving(false);
    toast({ title: "Business settings saved." });
  };

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

        {/* Regional Settings Section */}
        <section className="space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Regional settings</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="timezone">Time zone</Label>
              <Select 
                defaultValue="Asia/Kolkata"
                disabled={businessType === "clinic"}
              >
                <SelectTrigger data-testid="select-timezone">
                  <SelectValue placeholder="Select time zone" />
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
                  Locked for healthcare businesses
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
