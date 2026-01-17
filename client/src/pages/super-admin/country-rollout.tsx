import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { Loader2, Globe, Save, AlertCircle, Building2, Box, Zap } from "lucide-react";

function getAdminAuthHeaders(): Record<string, string> {
  const adminToken = localStorage.getItem("mybizstream_admin_token") || localStorage.getItem("bizflow_admin_token");
  const accessToken = localStorage.getItem("accessToken");
  const token = adminToken || accessToken;
  
  if (!token) {
    return { "Content-Type": "application/json" };
  }
  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`,
  };
}

interface RolloutFeatures {
  hrms?: boolean;
  payroll?: boolean;
  whatsapp_automation?: boolean;
  gst_invoicing?: boolean;
  sms_notifications?: boolean;
  [key: string]: boolean | undefined;
}

interface CountryConfig {
  countryCode: string;
  countryName: string;
  status: string;
  registrationEnabled: boolean;
  billingEnabled: boolean;
  rolloutPolicy: {
    countryCode: string;
    isActive: boolean;
    status: "coming_soon" | "beta" | "live";
    enabledBusinessTypes: string[];
    enabledModules: string[];
    enabledFeatures: RolloutFeatures;
    comingSoonMessage?: string | null;
    notes?: string;
    updatedBy?: string;
    updatedAt?: string;
  } | null;
}

// Business Type Registry - matches shared/business-types.ts
const ALL_BUSINESS_TYPES = [
  { value: "pg_hostel", label: "PG / Hostel", category: "hospitality", phase: "phase1" },
  { value: "consulting", label: "Consulting / Professional Services", category: "professional", phase: "phase1" },
  { value: "software_services", label: "Software / IT Services", category: "technology", phase: "phase1" },
  { value: "clinic_healthcare", label: "Clinic / Healthcare", category: "healthcare", phase: "phase2" },
  { value: "legal", label: "Legal & Compliance", category: "professional", phase: "later" },
  { value: "digital_agency", label: "Digital Marketing Agency", category: "technology", phase: "later" },
  { value: "retail_store", label: "Retail Store / POS", category: "retail", phase: "later" },
  { value: "salon_spa", label: "Salon / Spa", category: "services", phase: "later" },
  { value: "furniture_manufacturing", label: "Furniture Manufacturing", category: "manufacturing", phase: "later" },
  { value: "logistics_fleet", label: "Logistics & Fleet", category: "logistics", phase: "later" },
  { value: "education_institute", label: "Coaching / Training Institute", category: "education", phase: "later" },
  { value: "tourism", label: "Tourism / Travel Agency", category: "travel", phase: "later" },
  { value: "real_estate", label: "Real Estate Agency", category: "property", phase: "later" },
];

// All available modules
const ALL_MODULES = [
  { value: "dashboard", label: "Dashboard" },
  { value: "customers", label: "Customers" },
  { value: "bookings", label: "Bookings" },
  { value: "pg", label: "PG / Rooms" },
  { value: "projects", label: "Projects" },
  { value: "timesheets", label: "Timesheets" },
  { value: "invoicing", label: "Invoices" },
  { value: "analytics", label: "Analytics" },
  { value: "hrms", label: "HRMS" },
  { value: "payroll", label: "Payroll" },
];

// All available features
const ALL_FEATURES = [
  { key: "hrms", label: "HRMS" },
  { key: "payroll", label: "Payroll" },
  { key: "whatsapp_automation", label: "WhatsApp Automation" },
  { key: "gst_invoicing", label: "GST Invoicing" },
  { key: "sms_notifications", label: "SMS Notifications" },
];

const ROLLOUT_STATUSES = [
  { value: "coming_soon", label: "Coming Soon", color: "secondary" },
  { value: "beta", label: "Beta", color: "warning" },
  { value: "live", label: "Live", color: "success" },
];

export default function CountryRolloutManagement() {
  const { toast } = useToast();
  const [selectedCountry, setSelectedCountry] = useState<string>("");
  const [isActive, setIsActive] = useState(false);
  const [rolloutStatus, setRolloutStatus] = useState<string>("coming_soon");
  const [enabledBusinessTypes, setEnabledBusinessTypes] = useState<string[]>([]);
  const [enabledModules, setEnabledModules] = useState<string[]>([]);
  const [enabledFeatures, setEnabledFeatures] = useState<RolloutFeatures>({});
  const [comingSoonMessage, setComingSoonMessage] = useState("");
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch all countries with rollout policies
  const { data: countries, isLoading } = useQuery<CountryConfig[]>({
    queryKey: ["/api/super-admin/countries"],
    queryFn: async () => {
      const res = await fetch("/api/super-admin/countries", {
        headers: getAdminAuthHeaders(),
      });
      if (!res.ok) throw new Error("Failed to fetch countries");
      return res.json();
    },
  });

  // Load selected country's rollout config
  const loadCountryConfig = (countryCode: string) => {
    const country = countries?.find(c => c.countryCode === countryCode);
    if (country) {
      setSelectedCountry(countryCode);
      setIsActive(country.rolloutPolicy?.isActive ?? false);
      setRolloutStatus(country.rolloutPolicy?.status || "coming_soon");
      setEnabledBusinessTypes(country.rolloutPolicy?.enabledBusinessTypes || []);
      setEnabledModules(country.rolloutPolicy?.enabledModules || []);
      setEnabledFeatures(country.rolloutPolicy?.enabledFeatures || {});
      setComingSoonMessage(country.rolloutPolicy?.comingSoonMessage || "");
      setHasChanges(false);
    }
  };

  // Save rollout policy
  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/super-admin/countries/${selectedCountry}/rollout`, {
        method: "PATCH",
        headers: getAdminAuthHeaders(),
        body: JSON.stringify({
          isActive,
          status: rolloutStatus,
          enabledBusinessTypes,
          enabledModules,
          enabledFeatures,
          comingSoonMessage: comingSoonMessage || null,
        }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to save rollout policy");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/countries"] });
      setHasChanges(false);
      toast({
        title: "Rollout policy saved",
        description: `Updated rollout settings for ${selectedCountry}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to save",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const toggleBusinessType = (value: string) => {
    setEnabledBusinessTypes(prev => {
      const newTypes = prev.includes(value) ? prev.filter(t => t !== value) : [...prev, value];
      setHasChanges(true);
      return newTypes;
    });
  };

  const toggleModule = (value: string) => {
    setEnabledModules(prev => {
      const newModules = prev.includes(value) ? prev.filter(m => m !== value) : [...prev, value];
      setHasChanges(true);
      return newModules;
    });
  };

  const toggleFeature = (key: string, enabled: boolean) => {
    setEnabledFeatures(prev => ({ ...prev, [key]: enabled }));
    setHasChanges(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const selectedCountryData = countries?.find(c => c.countryCode === selectedCountry);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Country Rollout Management</h1>
          <p className="text-muted-foreground">
            Configure business types, modules, and features for each country
          </p>
        </div>
        {selectedCountry && (
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={!hasChanges || saveMutation.isPending}
            data-testid="button-save-rollout"
          >
            {saveMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Changes
          </Button>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        {/* Country Selector */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Select Country
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedCountry} onValueChange={loadCountryConfig}>
              <SelectTrigger data-testid="select-country">
                <SelectValue placeholder="Select a country" />
              </SelectTrigger>
              <SelectContent>
                {countries?.map((country) => (
                  <SelectItem key={country.countryCode} value={country.countryCode}>
                    {country.countryName} ({country.countryCode})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* A) Country Toggle */}
        {selectedCountry && (
          <Card className="md:col-span-3">
            <CardHeader>
              <CardTitle>Country Status</CardTitle>
              <CardDescription>Toggle country availability and rollout stage</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="is-active" className="text-base font-medium">Active</Label>
                  <p className="text-sm text-muted-foreground">Enable this country for registration</p>
                </div>
                <Switch
                  id="is-active"
                  checked={isActive}
                  onCheckedChange={(checked) => { setIsActive(checked); setHasChanges(true); }}
                  data-testid="switch-is-active"
                />
              </div>

              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <Label>Rollout Status</Label>
                  <Select
                    value={rolloutStatus}
                    onValueChange={(value) => { setRolloutStatus(value); setHasChanges(true); }}
                  >
                    <SelectTrigger data-testid="select-rollout-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLLOUT_STATUSES.map((status) => (
                        <SelectItem key={status.value} value={status.value}>
                          <Badge variant={status.color as "default" | "secondary" | "destructive"}>
                            {status.label}
                          </Badge>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {!isActive && (
                <div>
                  <Label htmlFor="coming-soon-msg">Coming Soon Message</Label>
                  <Textarea
                    id="coming-soon-msg"
                    placeholder="Launching soon in this region..."
                    value={comingSoonMessage}
                    onChange={(e) => { setComingSoonMessage(e.target.value); setHasChanges(true); }}
                    data-testid="input-coming-soon-message"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {selectedCountry && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* B) Business Types */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                <CardTitle>Business Types</CardTitle>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => { setEnabledBusinessTypes(ALL_BUSINESS_TYPES.map(bt => bt.value)); setHasChanges(true); }}>
                  Select All
                </Button>
                <Button variant="outline" size="sm" onClick={() => { setEnabledBusinessTypes([]); setHasChanges(true); }}>
                  Clear
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2">
                {ALL_BUSINESS_TYPES.map((bt) => (
                  <div key={bt.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`bt-${bt.value}`}
                      checked={enabledBusinessTypes.includes(bt.value)}
                      onCheckedChange={() => toggleBusinessType(bt.value)}
                      data-testid={`checkbox-bt-${bt.value}`}
                    />
                    <Label htmlFor={`bt-${bt.value}`} className="text-sm font-normal cursor-pointer">
                      {bt.label}
                      <Badge variant="outline" className="ml-2 text-xs">{bt.phase}</Badge>
                    </Label>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* C) Modules */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Box className="h-5 w-5" />
                <CardTitle>Modules</CardTitle>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => { setEnabledModules(ALL_MODULES.map(m => m.value)); setHasChanges(true); }}>
                  Select All
                </Button>
                <Button variant="outline" size="sm" onClick={() => { setEnabledModules([]); setHasChanges(true); }}>
                  Clear
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2">
                {ALL_MODULES.map((mod) => (
                  <div key={mod.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`mod-${mod.value}`}
                      checked={enabledModules.includes(mod.value)}
                      onCheckedChange={() => toggleModule(mod.value)}
                      data-testid={`checkbox-mod-${mod.value}`}
                    />
                    <Label htmlFor={`mod-${mod.value}`} className="text-sm font-normal cursor-pointer">
                      {mod.label}
                    </Label>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* D) Features */}
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center gap-2">
              <Zap className="h-5 w-5" />
              <CardTitle>Features</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {ALL_FEATURES.map((feat) => (
                  <div key={feat.key} className="flex items-center justify-between p-3 border rounded-lg">
                    <Label htmlFor={`feat-${feat.key}`} className="font-normal cursor-pointer">
                      {feat.label}
                    </Label>
                    <Switch
                      id={`feat-${feat.key}`}
                      checked={enabledFeatures[feat.key] ?? false}
                      onCheckedChange={(checked) => toggleFeature(feat.key, checked)}
                      data-testid={`switch-feat-${feat.key}`}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {!selectedCountry && (
        <Card className="text-center py-12">
          <CardContent>
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg text-muted-foreground">Select a country to configure rollout settings</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
