import { useState } from "react";
import { SettingsLayout } from "@/components/settings-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useTenant } from "@/contexts/tenant-context";
import { useToast } from "@/hooks/use-toast";
import { Building2 } from "lucide-react";
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
    // Simulate save
    await new Promise(resolve => setTimeout(resolve, 500));
    setIsSaving(false);
    toast({ title: "Business settings saved." });
  };

  return (
    <SettingsLayout title="Business">
      <Card className="rounded-2xl">
        <CardHeader className="space-y-1 p-4 sm:p-6 pb-0 sm:pb-0">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            <CardTitle className="text-lg font-semibold">Business</CardTitle>
          </div>
          <CardDescription>Manage your company's operational defaults</CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="businessName" className="text-sm font-medium">Business name</Label>
              <Input
                id="businessName"
                defaultValue={tenant?.name || "My Business"}
                placeholder="Business name"
                className="w-full"
                data-testid="input-business-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="businessType" className="text-sm font-medium">Business type</Label>
              <Input
                id="businessType"
                value={getBusinessTypeLabel(tenant?.businessType || "service")}
                disabled
                className="bg-muted w-full"
                data-testid="input-business-type"
              />
              <p className="text-xs text-muted-foreground">
                Business type can't be changed after registration.
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="timezone" className="text-sm font-medium">Time zone</Label>
              <Select 
                defaultValue="Asia/Kolkata"
                disabled={businessType === "clinic"}
              >
                <SelectTrigger className="w-full" data-testid="select-timezone">
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
                  Time zone is locked for healthcare businesses.
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency" className="text-sm font-medium">Currency</Label>
              <Select 
                defaultValue="INR"
                disabled={businessType === "clinic"}
              >
                <SelectTrigger className="w-full" data-testid="select-currency">
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
                  Currency is locked for healthcare businesses.
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button 
              onClick={handleSave}
              disabled={isSaving}
              className="w-full sm:w-auto"
              data-testid="button-save-business"
            >
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </SettingsLayout>
  );
}
