import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Globe, Settings2, Building2, Zap, Package, FileText, Loader2, ChevronRight, Wallet, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { FEATURE_CATALOG } from "@shared/billing/feature-catalog";

interface CountryWithPolicy {
  id: string;
  countryCode: string;
  countryName: string;
  status: "enabled" | "disabled" | "maintenance" | "coming_soon";
  registrationEnabled: boolean;
  billingEnabled: boolean;
  defaultCurrency: string;
  allowedBusinessTypes: string[] | null;
  allowedSubscriptionTiers: string[] | null;
  rolloutPolicy: {
    countryCode: string;
    enabledBusinessTypes: string[];
    disabledFeatures: string[];
    enabledAddons: string[];
    enabledPlans: string[];
    notes: string | null;
    payrollStatus?: "disabled" | "beta" | "live";
    payrollCohortTenantIds?: number[];
    payrollDisclaimerText?: string | null;
  } | null;
}

const PAYROLL_STATUS_COLORS: Record<string, string> = {
  disabled: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  beta: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  live: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
};

const BUSINESS_TYPES = [
  { value: "clinic", label: "Clinic / Healthcare" },
  { value: "salon", label: "Salon / Spa" },
  { value: "pg", label: "PG / Hostel" },
  { value: "coworking", label: "Coworking" },
  { value: "service", label: "General Services" },
  { value: "real_estate", label: "Real Estate" },
  { value: "tourism", label: "Tourism" },
  { value: "education", label: "Education" },
  { value: "logistics", label: "Logistics" },
  { value: "legal", label: "Legal Services" },
  { value: "furniture_manufacturing", label: "Furniture Manufacturing" },
  { value: "software_services", label: "Software Services" },
  { value: "consulting", label: "Consulting" },
];

const STATUS_COLORS: Record<string, string> = {
  enabled: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  disabled: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  maintenance: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  coming_soon: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
};

export default function SuperAdminCountries() {
  const { toast } = useToast();
  const [selectedCountry, setSelectedCountry] = useState<CountryWithPolicy | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [rolloutDialogOpen, setRolloutDialogOpen] = useState(false);

  // Form state for region config
  const [formStatus, setFormStatus] = useState<string>("enabled");
  const [formSignup, setFormSignup] = useState(true);
  const [formBilling, setFormBilling] = useState(true);

  // Form state for rollout policy
  const [formBusinessTypes, setFormBusinessTypes] = useState<string[]>([]);
  const [formDisabledFeatures, setFormDisabledFeatures] = useState<string[]>([]);
  const [formEnabledAddons, setFormEnabledAddons] = useState<string[]>([]);
  const [formNotes, setFormNotes] = useState("");
  
  // Payroll rollout settings
  const [formPayrollStatus, setFormPayrollStatus] = useState<"disabled" | "beta" | "live">("disabled");
  const [formPayrollCohort, setFormPayrollCohort] = useState("");
  const [formPayrollDisclaimer, setFormPayrollDisclaimer] = useState("");

  const countriesQuery = useQuery<CountryWithPolicy[]>({
    queryKey: ["/api/super-admin/countries"],
  });

  const updateRegionMutation = useMutation({
    mutationFn: async (data: { countryCode: string; updates: Record<string, unknown> }) => {
      const res = await apiRequest("PATCH", `/api/super-admin/countries/${data.countryCode}`, data.updates);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Country updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/countries"] });
      setEditDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateRolloutMutation = useMutation({
    mutationFn: async (data: { countryCode: string; updates: Record<string, unknown> }) => {
      const res = await apiRequest("PATCH", `/api/super-admin/countries/${data.countryCode}/rollout`, data.updates);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Rollout policy updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/countries"] });
      setRolloutDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const openEditDialog = (country: CountryWithPolicy) => {
    setSelectedCountry(country);
    setFormStatus(country.status);
    setFormSignup(country.registrationEnabled);
    setFormBilling(country.billingEnabled);
    setEditDialogOpen(true);
  };

  const openRolloutDialog = (country: CountryWithPolicy) => {
    setSelectedCountry(country);
    setFormBusinessTypes(country.rolloutPolicy?.enabledBusinessTypes || country.allowedBusinessTypes || []);
    setFormDisabledFeatures(country.rolloutPolicy?.disabledFeatures || []);
    setFormEnabledAddons(country.rolloutPolicy?.enabledAddons || []);
    setFormNotes(country.rolloutPolicy?.notes || "");
    setFormPayrollStatus(country.rolloutPolicy?.payrollStatus || "disabled");
    setFormPayrollCohort(country.rolloutPolicy?.payrollCohortTenantIds?.join(", ") || "");
    setFormPayrollDisclaimer(country.rolloutPolicy?.payrollDisclaimerText || "");
    setRolloutDialogOpen(true);
  };

  const handleSaveRegion = () => {
    if (!selectedCountry) return;
    updateRegionMutation.mutate({
      countryCode: selectedCountry.countryCode,
      updates: {
        status: formStatus,
        registrationEnabled: formSignup,
        billingEnabled: formBilling,
      },
    });
  };

  const handleSaveRollout = () => {
    if (!selectedCountry) return;
    
    const cohortIds = formPayrollCohort
      .split(",")
      .map(s => s.trim())
      .filter(s => s.length > 0)
      .map(s => parseInt(s, 10))
      .filter(n => !isNaN(n));
    
    updateRolloutMutation.mutate({
      countryCode: selectedCountry.countryCode,
      updates: {
        enabledBusinessTypes: formBusinessTypes,
        disabledFeatures: formDisabledFeatures,
        enabledAddons: formEnabledAddons,
        notes: formNotes,
        payrollStatus: formPayrollStatus,
        payrollCohortTenantIds: cohortIds,
        payrollDisclaimerText: formPayrollDisclaimer || null,
      },
    });
  };

  const toggleBusinessType = (bt: string) => {
    setFormBusinessTypes((prev) =>
      prev.includes(bt) ? prev.filter((x) => x !== bt) : [...prev, bt]
    );
  };

  const toggleFeature = (f: string) => {
    setFormDisabledFeatures((prev) =>
      prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]
    );
  };

  if (countriesQuery.isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const countries = countriesQuery.data || [];

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold" data-testid="text-page-title">Country Rollout Control</h1>
          <p className="text-muted-foreground">
            Manage country availability, signup, billing, and feature rollout
          </p>
        </div>
        <Badge variant="outline" className="gap-1">
          <Globe className="h-3 w-3" />
          {countries.length} countries
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {countries.map((country) => (
          <Card key={country.countryCode} className="hover-elevate" data-testid={`card-country-${country.countryCode}`}>
            <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary font-bold">
                  {country.countryCode}
                </div>
                <div>
                  <CardTitle className="text-base" data-testid={`text-country-name-${country.countryCode}`}>
                    {country.countryName}
                  </CardTitle>
                  <CardDescription>{country.defaultCurrency}</CardDescription>
                </div>
              </div>
              <Badge className={STATUS_COLORS[country.status] || ""} data-testid={`badge-status-${country.countryCode}`}>
                {country.status.replace("_", " ")}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${country.registrationEnabled ? "bg-green-500" : "bg-red-500"}`} />
                  <span className="text-muted-foreground">Signup</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${country.billingEnabled ? "bg-green-500" : "bg-red-500"}`} />
                  <span className="text-muted-foreground">Billing</span>
                </div>
              </div>

              <div className="flex items-center gap-4 text-sm">
                <div className="text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {country.rolloutPolicy?.enabledBusinessTypes?.length || country.allowedBusinessTypes?.length || "All"}
                  </span>
                  {" business types"}
                </div>
                <div className="flex items-center gap-2">
                  <Wallet className="h-3 w-3 text-muted-foreground" />
                  <Badge 
                    className={PAYROLL_STATUS_COLORS[country.rolloutPolicy?.payrollStatus || "disabled"]} 
                    data-testid={`badge-payroll-${country.countryCode}`}
                  >
                    Payroll: {country.rolloutPolicy?.payrollStatus || "disabled"}
                  </Badge>
                </div>
              </div>

              <Separator />

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openEditDialog(country)}
                  className="flex-1"
                  data-testid={`button-edit-${country.countryCode}`}
                >
                  <Settings2 className="h-4 w-4 mr-1" />
                  Settings
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openRolloutDialog(country)}
                  className="flex-1"
                  data-testid={`button-rollout-${country.countryCode}`}
                >
                  <Zap className="h-4 w-4 mr-1" />
                  Rollout
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent data-testid="dialog-edit-country">
          <DialogHeader>
            <DialogTitle>Edit Country Settings: {selectedCountry?.countryName}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={formStatus} onValueChange={setFormStatus}>
                <SelectTrigger data-testid="select-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="enabled">Enabled (Live)</SelectItem>
                  <SelectItem value="coming_soon">Coming Soon</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="disabled">Disabled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <Label>Allow Signups</Label>
              <Switch
                checked={formSignup}
                onCheckedChange={setFormSignup}
                data-testid="switch-signup"
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Enable Billing</Label>
              <Switch
                checked={formBilling}
                onCheckedChange={setFormBilling}
                data-testid="switch-billing"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveRegion}
              disabled={updateRegionMutation.isPending}
              data-testid="button-save-settings"
            >
              {updateRegionMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={rolloutDialogOpen} onOpenChange={setRolloutDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" data-testid="dialog-rollout">
          <DialogHeader>
            <DialogTitle>Rollout Policy: {selectedCountry?.countryName}</DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                <Label className="text-base font-medium">Enabled Business Types</Label>
              </div>
              <p className="text-sm text-muted-foreground">
                Select which business types can register in this country
              </p>
              <div className="grid grid-cols-2 gap-2">
                {BUSINESS_TYPES.map((bt) => (
                  <div key={bt.value} className="flex items-center gap-2">
                    <Checkbox
                      id={`bt-${bt.value}`}
                      checked={formBusinessTypes.includes(bt.value)}
                      onCheckedChange={() => toggleBusinessType(bt.value)}
                      data-testid={`checkbox-bt-${bt.value}`}
                    />
                    <Label htmlFor={`bt-${bt.value}`} className="text-sm">
                      {bt.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                <Label className="text-base font-medium">Disabled Features</Label>
              </div>
              <p className="text-sm text-muted-foreground">
                Select features to block at country level (even if plan includes them)
              </p>
              <div className="grid grid-cols-2 gap-2">
                {FEATURE_CATALOG.map((f) => (
                  <div key={f.key} className="flex items-center gap-2">
                    <Checkbox
                      id={`f-${f.key}`}
                      checked={formDisabledFeatures.includes(f.key)}
                      onCheckedChange={() => toggleFeature(f.key)}
                      data-testid={`checkbox-feature-${f.key}`}
                    />
                    <Label htmlFor={`f-${f.key}`} className="text-sm">
                      {f.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Wallet className="h-4 w-4" />
                <Label className="text-base font-medium">Payroll Rollout Settings</Label>
              </div>
              <p className="text-sm text-muted-foreground">
                Control payroll module availability in this country
              </p>
              
              <div className="space-y-4 bg-muted/30 p-4 rounded-lg">
                <div className="space-y-2">
                  <Label>Payroll Status</Label>
                  <Select 
                    value={formPayrollStatus} 
                    onValueChange={(v) => setFormPayrollStatus(v as "disabled" | "beta" | "live")}
                  >
                    <SelectTrigger data-testid="select-payroll-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="disabled">Disabled - Not available</SelectItem>
                      <SelectItem value="beta">Beta - Cohort tenants only</SelectItem>
                      <SelectItem value="live">Live - Available to all</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formPayrollStatus === "beta" && (
                  <div className="space-y-2">
                    <Label>Beta Cohort Tenant IDs</Label>
                    <Input
                      value={formPayrollCohort}
                      onChange={(e) => setFormPayrollCohort(e.target.value)}
                      placeholder="e.g., 1, 5, 12, 23"
                      data-testid="input-payroll-cohort"
                    />
                    <p className="text-xs text-muted-foreground">
                      Comma-separated tenant IDs with beta access to payroll
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Disclaimer Text</Label>
                  <Textarea
                    value={formPayrollDisclaimer}
                    onChange={(e) => setFormPayrollDisclaimer(e.target.value)}
                    placeholder="Optional disclaimer for payroll features in this country..."
                    rows={2}
                    data-testid="textarea-payroll-disclaimer"
                  />
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <Label className="text-base font-medium">Notes</Label>
              </div>
              <Textarea
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                placeholder="Internal notes about this rollout configuration..."
                data-testid="textarea-notes"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRolloutDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveRollout}
              disabled={updateRolloutMutation.isPending}
              data-testid="button-save-rollout"
            >
              {updateRolloutMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Rollout Policy
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
