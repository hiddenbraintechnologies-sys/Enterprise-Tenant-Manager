import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

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

interface RolloutRow {
  countryCode: string;
  isActive: boolean;
  enabledBusinessTypes: string[];
  enabledModules: string[];
  enabledFeatures: Record<string, boolean>;
  comingSoonMessage?: string | null;
}

interface CountryConfig {
  countryCode: string;
  countryName: string;
  rolloutPolicy: RolloutRow | null;
}

const COUNTRY_OPTIONS = [
  { code: "IN", name: "India" },
  { code: "MY", name: "Malaysia" },
  { code: "GB", name: "United Kingdom" },
  { code: "AE", name: "UAE" },
  { code: "SG", name: "Singapore" },
];

const BUSINESS_TYPES = [
  { key: "pg_hostel", label: "PG / Hostel" },
  { key: "pg", label: "PG / Hostel" },
  { key: "consulting", label: "Consulting" },
  { key: "software_services", label: "Software Services" },
  { key: "clinic_healthcare", label: "Clinic / Healthcare" },
  { key: "clinic", label: "Clinic" },
  { key: "salon_spa", label: "Salon / Spa" },
  { key: "salon", label: "Salon" },
  { key: "coworking", label: "Coworking" },
  { key: "gym", label: "Gym / Fitness" },
  { key: "service", label: "General Service" },
  { key: "legal", label: "Legal Services" },
  { key: "digital_agency", label: "Digital Agency" },
  { key: "retail_store", label: "Retail Store" },
  { key: "furniture_manufacturing", label: "Furniture Manufacturing" },
  { key: "furniture", label: "Furniture" },
  { key: "logistics_fleet", label: "Logistics & Fleet" },
  { key: "logistics", label: "Logistics" },
  { key: "education_institute", label: "Education Institute" },
  { key: "education", label: "Education" },
  { key: "tourism", label: "Tourism" },
  { key: "real_estate", label: "Real Estate" },
];

const MODULES = [
  { key: "dashboard", label: "Dashboard" },
  { key: "customers", label: "Customers" },
  { key: "bookings", label: "Bookings" },
  { key: "pg", label: "PG / Rooms" },
  { key: "projects", label: "Projects" },
  { key: "timesheets", label: "Timesheets" },
  { key: "clients", label: "Clients" },
  { key: "invoicing", label: "Invoicing" },
  { key: "analytics", label: "Analytics" },
  { key: "hrms", label: "HRMS" },
  { key: "payroll", label: "Payroll" },
];

const FEATURES = [
  { key: "hrms", label: "HRMS" },
  { key: "payroll", label: "Payroll" },
  { key: "gst_invoicing", label: "GST Invoicing" },
  { key: "whatsapp_automation", label: "WhatsApp Automation" },
  { key: "sms_notifications", label: "SMS Notifications" },
  { key: "priority_support", label: "Priority Support" },
];

function ensureArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(String);
  return [];
}

export default function SuperAdminRolloutsPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [selectedCountry, setSelectedCountry] = useState("IN");
  const [draft, setDraft] = useState<RolloutRow | null>(null);

  const { data, isLoading } = useQuery<CountryConfig[]>({
    queryKey: ["/api/super-admin/countries"],
    queryFn: async () => {
      const res = await fetch("/api/super-admin/countries", {
        headers: getAdminAuthHeaders(),
      });
      if (!res.ok) throw new Error("Failed to fetch countries");
      return res.json();
    },
  });

  const countries = data || [];
  const current = countries.find(c => c.countryCode === selectedCountry);

  useEffect(() => {
    if (current?.rolloutPolicy) {
      setDraft({
        countryCode: selectedCountry,
        isActive: current.rolloutPolicy.isActive ?? false,
        enabledBusinessTypes: ensureArray(current.rolloutPolicy.enabledBusinessTypes),
        enabledModules: ensureArray(current.rolloutPolicy.enabledModules),
        enabledFeatures: current.rolloutPolicy.enabledFeatures || {},
        comingSoonMessage: current.rolloutPolicy.comingSoonMessage,
      });
    } else {
      setDraft({
        countryCode: selectedCountry,
        isActive: false,
        enabledBusinessTypes: [],
        enabledModules: [],
        enabledFeatures: {},
        comingSoonMessage: "Coming soon",
      });
    }
  }, [selectedCountry, current?.countryCode]);

  const mutation = useMutation({
    mutationFn: async (payload: RolloutRow) => {
      const res = await fetch(`/api/super-admin/countries/${payload.countryCode}/rollout`, {
        method: "PATCH",
        headers: getAdminAuthHeaders(),
        body: JSON.stringify({
          isActive: payload.isActive,
          enabledBusinessTypes: payload.enabledBusinessTypes,
          enabledModules: payload.enabledModules,
          enabledFeatures: payload.enabledFeatures,
          comingSoonMessage: payload.comingSoonMessage || null,
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      return res.json();
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["/api/super-admin/countries"] });
      toast({ title: "Saved", description: "Country rollout updated." });
    },
    onError: (err: Error) => {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    },
  });

  if (isLoading || !draft) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader><CardTitle>Country Rollouts</CardTitle></CardHeader>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      </div>
    );
  }

  const toggleInList = (list: string[], key: string) =>
    list.includes(key) ? list.filter(x => x !== key) : [...list, key];

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Country Rollouts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {COUNTRY_OPTIONS.map(c => (
              <Button
                key={c.code}
                variant={selectedCountry === c.code ? "default" : "outline"}
                onClick={() => setSelectedCountry(c.code)}
                data-testid={`button-country-${c.code}`}
              >
                {c.code} • {c.name}
              </Button>
            ))}
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Country Active</div>
              <div className="text-sm text-muted-foreground">
                If off, country shows as "Coming soon" and signup is blocked.
              </div>
            </div>
            <Switch
              checked={draft.isActive}
              onCheckedChange={(v) => setDraft({ ...draft, isActive: v })}
              data-testid="switch-is-active"
            />
          </div>

          {!draft.isActive && (
            <div className="space-y-2">
              <Label>Coming soon message</Label>
              <Input
                value={draft.comingSoonMessage || ""}
                onChange={(e) => setDraft({ ...draft, comingSoonMessage: e.target.value })}
                placeholder="Coming soon in this country"
                data-testid="input-coming-soon-message"
              />
            </div>
          )}

          <Tabs defaultValue="business">
            <TabsList>
              <TabsTrigger value="business" data-testid="tab-business-types">Business Types</TabsTrigger>
              <TabsTrigger value="modules" data-testid="tab-modules">Modules</TabsTrigger>
              <TabsTrigger value="features" data-testid="tab-features">Features</TabsTrigger>
            </TabsList>

            <TabsContent value="business" className="mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {BUSINESS_TYPES.map(b => (
                  <div key={b.key} className="flex items-center gap-3 rounded-md border p-3">
                    <Checkbox
                      checked={draft.enabledBusinessTypes.includes(b.key)}
                      onCheckedChange={() =>
                        setDraft({ ...draft, enabledBusinessTypes: toggleInList(draft.enabledBusinessTypes, b.key) })
                      }
                      data-testid={`checkbox-bt-${b.key}`}
                    />
                    <div className="text-sm">{b.label}</div>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="modules" className="mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {MODULES.map(m => (
                  <div key={m.key} className="flex items-center gap-3 rounded-md border p-3">
                    <Checkbox
                      checked={draft.enabledModules.includes(m.key)}
                      onCheckedChange={() =>
                        setDraft({ ...draft, enabledModules: toggleInList(draft.enabledModules, m.key) })
                      }
                      data-testid={`checkbox-mod-${m.key}`}
                    />
                    <div className="text-sm">{m.label}</div>
                  </div>
                ))}
              </div>
              <div className="text-xs text-muted-foreground mt-3">
                Tip: Modules should match backend guards. If module is disabled, API returns 403.
              </div>
            </TabsContent>

            <TabsContent value="features" className="mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {FEATURES.map(f => (
                  <div key={f.key} className="flex items-center justify-between rounded-md border p-3">
                    <div className="text-sm">{f.label}</div>
                    <Switch
                      checked={Boolean(draft.enabledFeatures?.[f.key])}
                      onCheckedChange={(v) =>
                        setDraft({
                          ...draft,
                          enabledFeatures: { ...(draft.enabledFeatures || {}), [f.key]: v },
                        })
                      }
                      data-testid={`switch-feat-${f.key}`}
                    />
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => {
                if (current?.rolloutPolicy) {
                  setDraft({
                    countryCode: selectedCountry,
                    isActive: current.rolloutPolicy.isActive ?? false,
                    enabledBusinessTypes: ensureArray(current.rolloutPolicy.enabledBusinessTypes),
                    enabledModules: ensureArray(current.rolloutPolicy.enabledModules),
                    enabledFeatures: current.rolloutPolicy.enabledFeatures || {},
                    comingSoonMessage: current.rolloutPolicy.comingSoonMessage,
                  });
                } else {
                  setDraft({
                    countryCode: selectedCountry,
                    isActive: false,
                    enabledBusinessTypes: [],
                    enabledModules: [],
                    enabledFeatures: {},
                    comingSoonMessage: "Coming soon",
                  });
                }
              }}
              data-testid="button-reset"
            >
              Reset
            </Button>

            <Button
              onClick={() => mutation.mutate(draft)}
              disabled={mutation.isPending}
              data-testid="button-save-rollout"
            >
              {mutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
