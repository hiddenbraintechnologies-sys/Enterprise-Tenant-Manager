import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { useTenant } from "@/contexts/tenant-context";
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

  return (
    <DashboardLayout 
      title="Business Settings" 
      breadcrumbs={[
        { label: "Settings", href: "/settings" },
        { label: "Business" }
      ]}
    >
      <div className="max-w-2xl space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              <CardTitle className="text-lg font-medium">Business Information</CardTitle>
            </div>
            <CardDescription>Configure your business details</CardDescription>
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
            
            <div className="flex justify-end pt-4">
              <Button data-testid="button-save-business">Save Changes</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
