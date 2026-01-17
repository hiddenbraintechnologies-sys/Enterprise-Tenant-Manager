import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { Loader2, Globe, Save, AlertCircle } from "lucide-react";

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

interface CountryConfig {
  countryCode: string;
  countryName: string;
  status: string;
  registrationEnabled: boolean;
  billingEnabled: boolean;
  rolloutPolicy: {
    countryCode: string;
    status: "coming_soon" | "beta" | "live";
    enabledBusinessTypes: string[];
    enabledModules: string[];
    notes?: string;
    updatedBy?: string;
    updatedAt?: string;
  } | null;
}

// Business Type Registry - matches shared/business-types.ts
// ❌ Never change codes after launch | ✅ Labels can be renamed
const ALL_BUSINESS_TYPES = [
  // Phase-1 India
  { value: "pg_hostel", label: "PG / Hostel", category: "hospitality", phase: "phase1" },
  // Phase-1 Multi-country
  { value: "consulting", label: "Consulting / Professional Services", category: "professional", phase: "phase1" },
  { value: "software_services", label: "Software / IT Services", category: "technology", phase: "phase1" },
  // Phase-2
  { value: "clinic_healthcare", label: "Clinic / Healthcare", category: "healthcare", phase: "phase2" },
  // Later phases
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

const ROLLOUT_STATUSES = [
  { value: "coming_soon", label: "Coming Soon", color: "secondary" },
  { value: "beta", label: "Beta", color: "warning" },
  { value: "live", label: "Live", color: "success" },
];

export default function CountryRolloutManagement() {
  const { toast } = useToast();
  const [selectedCountry, setSelectedCountry] = useState<string>("");
  const [rolloutStatus, setRolloutStatus] = useState<string>("coming_soon");
  const [enabledBusinessTypes, setEnabledBusinessTypes] = useState<string[]>([]);
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
      setRolloutStatus(country.rolloutPolicy?.status || "coming_soon");
      setEnabledBusinessTypes(country.rolloutPolicy?.enabledBusinessTypes || []);
      setHasChanges(false);
    }
  };

  // Save rollout policy
  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/super-admin/countries/${selectedCountry}/rollout`, {
        method: "PATCH",
        headers: {
          ...getAdminAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: rolloutStatus,
          enabledBusinessTypes,
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
      const newTypes = prev.includes(value)
        ? prev.filter(t => t !== value)
        : [...prev, value];
      setHasChanges(true);
      return newTypes;
    });
  };

  const selectAllBusinessTypes = () => {
    setEnabledBusinessTypes(ALL_BUSINESS_TYPES.map(bt => bt.value));
    setHasChanges(true);
  };

  const clearAllBusinessTypes = () => {
    setEnabledBusinessTypes([]);
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
            Configure which business types are available in each country
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Country Selector */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Select Country
            </CardTitle>
            <CardDescription>Choose a country to configure</CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={selectedCountry} onValueChange={loadCountryConfig}>
              <SelectTrigger data-testid="select-country">
                <SelectValue placeholder="Select a country" />
              </SelectTrigger>
              <SelectContent>
                {countries?.map((country) => (
                  <SelectItem 
                    key={country.countryCode} 
                    value={country.countryCode}
                    data-testid={`option-country-${country.countryCode}`}
                  >
                    {country.countryName} ({country.countryCode})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedCountryData && (
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Region Status:</span>
                  <Badge variant={selectedCountryData.status === "enabled" ? "default" : "secondary"}>
                    {selectedCountryData.status}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Registration:</span>
                  <Badge variant={selectedCountryData.registrationEnabled ? "default" : "outline"}>
                    {selectedCountryData.registrationEnabled ? "Enabled" : "Disabled"}
                  </Badge>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Rollout Status */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Rollout Status</CardTitle>
            <CardDescription>Set the overall rollout stage for this country</CardDescription>
          </CardHeader>
          <CardContent>
            <Select 
              value={rolloutStatus} 
              onValueChange={(value) => {
                setRolloutStatus(value);
                setHasChanges(true);
              }}
              disabled={!selectedCountry}
            >
              <SelectTrigger data-testid="select-rollout-status">
                <SelectValue placeholder="Select rollout status" />
              </SelectTrigger>
              <SelectContent>
                {ROLLOUT_STATUSES.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    <div className="flex items-center gap-2">
                      <Badge variant={status.color as "default" | "secondary" | "destructive" | "outline"}>
                        {status.label}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {rolloutStatus === "beta" && (
              <div className="mt-3 flex items-start gap-2 text-sm text-amber-600 dark:text-amber-400">
                <AlertCircle className="h-4 w-4 mt-0.5" />
                <span>Beta status allows limited access. Only selected business types will be available.</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Business Types Configuration */}
      {selectedCountry && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Enabled Business Types</CardTitle>
              <CardDescription>
                Select which business types can register in {selectedCountryData?.countryName}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={selectAllBusinessTypes}>
                Select All
              </Button>
              <Button variant="outline" size="sm" onClick={clearAllBusinessTypes}>
                Clear All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {ALL_BUSINESS_TYPES.map((bt) => (
                <div key={bt.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`bt-${bt.value}`}
                    checked={enabledBusinessTypes.includes(bt.value)}
                    onCheckedChange={() => toggleBusinessType(bt.value)}
                    data-testid={`checkbox-${bt.value}`}
                  />
                  <Label
                    htmlFor={`bt-${bt.value}`}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {bt.label}
                  </Label>
                </div>
              ))}
            </div>

            {enabledBusinessTypes.length === 0 && (
              <p className="mt-4 text-sm text-muted-foreground">
                No business types selected. All business types will be available if none are specifically enabled.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Save Button */}
      {selectedCountry && (
        <div className="flex justify-end">
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
        </div>
      )}
    </div>
  );
}
