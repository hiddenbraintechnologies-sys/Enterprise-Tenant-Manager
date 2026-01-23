import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { superAdminMarketplaceApi, type AddonDto } from "@/lib/api/superAdminMarketplace";
import { RolloutMatrix } from "@/components/super-admin/marketplace/rollout-matrix";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function SuperAdminMarketplaceRolloutsPage() {
  const qc = useQueryClient();
  const [pricingAddon, setPricingAddon] = useState<AddonDto | null>(null);

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
            <div className="flex items-center justify-between gap-3">
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
                  <div key={p.id} className="rounded-lg border p-3 flex items-center justify-between gap-3">
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
    </div>
  );
}
