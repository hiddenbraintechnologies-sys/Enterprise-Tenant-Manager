import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { superAdminMarketplaceApi, type AddonDto } from "@/lib/api/superAdminMarketplace";
import { RolloutMatrix } from "@/components/super-admin/marketplace/rollout-matrix";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { apiRequest } from "@/lib/queryClient";

type BusinessTypeRow = {
  businessType: string;
  isEnabled: boolean;
};

const BUSINESS_TYPE_LABELS: Record<string, string> = {
  pg_hostel: "PG / Hostel Management",
  consulting: "Consulting / Professional Services",
  software_services: "Software / IT Services",
  clinic_healthcare: "Clinic / Healthcare",
  legal: "Legal & Compliance",
  digital_agency: "Digital Marketing Agency",
  retail_store: "Retail Store / POS",
  salon_spa: "Salon / Spa",
  furniture_manufacturing: "Furniture Manufacturing",
  logistics_fleet: "Logistics & Fleet",
  education_institute: "Coaching / Training Institute",
  tourism: "Tourism / Travel Agency",
  real_estate: "Real Estate Agency",
};

function BusinessTypesPanel({ countryCode }: { countryCode: string }) {
  const qc = useQueryClient();
  const [q, setQ] = useState("");

  const queryKey = ["sa-rollout-business-types", countryCode];

  const btQuery = useQuery({
    queryKey,
    queryFn: async (): Promise<{ businessTypes: BusinessTypeRow[] }> => {
      const res = await fetch(`/api/super-admin/marketplace/rollouts/${countryCode}/business-types`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch business types");
      return res.json();
    },
    staleTime: 0,
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: { businessTypes: BusinessTypeRow[] }) => {
      return apiRequest("PATCH", `/api/super-admin/marketplace/rollouts/${countryCode}/business-types`, payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
      qc.invalidateQueries({ queryKey: ["public-rollouts"] });
    },
  });

  const rows = btQuery.data?.businessTypes ?? [];
  const enabledCount = rows.filter((r) => r.isEnabled).length;

  const merged = rows.map((r) => ({
    ...r,
    label: BUSINESS_TYPE_LABELS[r.businessType] || r.businessType,
  }));

  const filtered = merged.filter((x) =>
    (x.label + " " + x.businessType).toLowerCase().includes(q.toLowerCase().trim())
  );

  const setAll = (value: boolean) => {
    const next = merged.map((x) => ({ businessType: x.businessType, isEnabled: value }));
    saveMutation.mutate({ businessTypes: next });
  };

  const toggleOne = (key: string, value: boolean) => {
    const next = merged.map((x) =>
      x.businessType === key
        ? { businessType: x.businessType, isEnabled: value }
        : { businessType: x.businessType, isEnabled: x.isEnabled }
    );
    saveMutation.mutate({ businessTypes: next });
  };

  return (
    <Card className="mt-3" data-testid="card-business-types">
      <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
        <div>
          <CardTitle className="text-base" data-testid="text-business-types-title">Business Types Allowed</CardTitle>
          <div className="mt-1 text-sm text-muted-foreground">
            Enable which business types appear during signup for <span className="font-medium">{countryCode}</span>.
          </div>
        </div>

        <Badge variant={enabledCount > 0 ? "default" : "secondary"} data-testid="badge-enabled-count">
          {enabledCount} enabled
        </Badge>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search business types..."
            className="sm:max-w-sm"
            data-testid="input-search-business-types"
          />

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setAll(true)}
              disabled={saveMutation.isPending || btQuery.isLoading}
              data-testid="button-enable-all"
            >
              Enable all
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setAll(false)}
              disabled={saveMutation.isPending || btQuery.isLoading}
              data-testid="button-disable-all"
            >
              Disable all
            </Button>
          </div>
        </div>

        <Separator />

        {btQuery.isLoading ? (
          <div className="text-sm text-muted-foreground">Loading business types...</div>
        ) : btQuery.isError ? (
          <div className="text-sm text-destructive">
            Failed to load business types. Please retry.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {filtered.map((x) => (
              <label
                key={x.businessType}
                className="flex items-center justify-between rounded-lg border p-3 cursor-pointer hover-elevate"
                data-testid={`label-business-type-${x.businessType}`}
              >
                <div className="flex flex-col">
                  <span className="font-medium">{x.label}</span>
                  <span className="text-xs text-muted-foreground">{x.businessType}</span>
                </div>

                <Checkbox
                  checked={x.isEnabled}
                  onCheckedChange={(v) => toggleOne(x.businessType, Boolean(v))}
                  disabled={saveMutation.isPending}
                  data-testid={`checkbox-${x.businessType}`}
                />
              </label>
            ))}
          </div>
        )}

        {saveMutation.isPending && (
          <div className="text-sm text-muted-foreground">Saving...</div>
        )}

        {saveMutation.isError && (
          <div className="text-sm text-destructive">
            Save failed. Check permissions or server logs.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function SuperAdminMarketplaceRolloutsPage() {
  const qc = useQueryClient();
  const [pricingAddon, setPricingAddon] = useState<AddonDto | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<string>("");

  const addonsQ = useQuery({ queryKey: ["sa-marketplace-addons"], queryFn: () => superAdminMarketplaceApi.listAddons() });
  const countriesQ = useQuery({ queryKey: ["sa-marketplace-countries"], queryFn: () => superAdminMarketplaceApi.listCountries() });
  const configsQ = useQuery({
    queryKey: ["sa-marketplace-addon-country-configs"],
    queryFn: () => superAdminMarketplaceApi.listAddonCountryConfigs(),
  });

  const upsertCfg = useMutation({
    mutationFn: ({ addonId, countryCode, payload }: { addonId: string; countryCode: string; payload: Parameters<typeof superAdminMarketplaceApi.upsertAddonCountryConfig>[2] }) =>
      superAdminMarketplaceApi.upsertAddonCountryConfig(addonId, countryCode, payload),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["sa-marketplace-addon-country-configs"] });
    },
  });

  const addonDetailsQ = useQuery({
    queryKey: ["sa-marketplace-addon-details", pricingAddon?.id],
    queryFn: () => superAdminMarketplaceApi.getAddonDetails(pricingAddon!.id),
    enabled: !!pricingAddon?.id,
  });

  const addons = addonsQ.data?.addons ?? [];
  const countries = countriesQ.data?.countries ?? [];
  const configs = configsQ.data?.configs ?? [];
  const pricing = addonDetailsQ.data?.pricing ?? [];

  function openPricing(addon: AddonDto) {
    setPricingAddon(addon);
  }

  return (
    <div className="p-6 space-y-4" data-testid="marketplace-rollouts-page">
      <div>
        <h1 className="text-2xl font-semibold" data-testid="text-page-title">Marketplace Rollouts</h1>
        <p className="text-sm text-muted-foreground">
          Control which add-ons are Live per country and configure trials.
        </p>
      </div>

      <Tabs defaultValue="marketplace" className="space-y-4">
        <TabsList data-testid="tabs-rollout">
          <TabsTrigger value="marketplace" data-testid="tab-marketplace">Marketplace Addons</TabsTrigger>
          <TabsTrigger value="businessTypes" data-testid="tab-business-types">Business Types</TabsTrigger>
        </TabsList>

        <TabsContent value="marketplace" className="space-y-4">
          <RolloutMatrix
            addons={addons}
            countries={countries}
            configs={configs}
            onUpsertConfig={async (addonId, countryCode, payload) => {
              await upsertCfg.mutateAsync({ addonId, countryCode, payload });
            }}
            onOpenPricing={(addon) => openPricing(addon)}
          />

          {pricingAddon ? (
            <Card data-testid="card-pricing-info">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <div className="text-lg font-semibold" data-testid="text-pricing-title">Pricing — {pricingAddon.name}</div>
                    <div className="text-sm text-muted-foreground">
                      View pricing tiers for this add-on.
                    </div>
                  </div>
                  <Button variant="outline" onClick={() => setPricingAddon(null)} data-testid="button-close-pricing">
                    Close
                  </Button>
                </div>

                {addonDetailsQ.isLoading ? (
                  <div className="text-sm text-muted-foreground">Loading pricing...</div>
                ) : pricing.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No pricing tiers configured for this add-on.</div>
                ) : (
                  <div className="space-y-2">
                    {pricing.map((p) => (
                      <div key={p.id} className="rounded-lg border p-3 flex items-center justify-between gap-3 flex-wrap">
                        <div>
                          <div className="font-medium">{p.name}</div>
                          <div className="text-xs text-muted-foreground">{p.pricingType} • {p.currency}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{p.price} {p.currency}</Badge>
                          {p.isDefault && <Badge>Default</Badge>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ) : null}
        </TabsContent>

        <TabsContent value="businessTypes" className="space-y-4">
          <Card data-testid="card-country-selector">
            <CardContent className="p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                <label className="font-medium text-sm">Select Country:</label>
                <div className="flex flex-wrap gap-2">
                  {countries.length === 0 ? (
                    <div className="text-sm text-muted-foreground">Loading countries...</div>
                  ) : (
                    countries.map((c) => (
                      <Button
                        key={c.countryCode}
                        variant={selectedCountry === c.countryCode ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedCountry(c.countryCode)}
                        data-testid={`button-country-${c.countryCode}`}
                      >
                        {c.countryCode} - {c.countryName}
                      </Button>
                    ))
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {selectedCountry ? (
            <BusinessTypesPanel countryCode={selectedCountry} />
          ) : (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                Select a country above to manage its enabled business types.
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
