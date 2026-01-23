import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { AddonCountryConfigDto, AddonDto, CountryDto } from "@/lib/api/superAdminMarketplace";

type Props = {
  addons: AddonDto[];
  countries: CountryDto[];
  configs: AddonCountryConfigDto[];
  onUpsertConfig: (addonId: string, countryCode: string, payload: {
    isActive: boolean;
    currencyCode: string;
    trialDays: number;
    complianceNotes?: string;
  }) => Promise<void>;
  onOpenPricing: (addon: AddonDto) => void;
};

function key(addonId: string, countryCode: string) {
  return `${addonId}:${countryCode}`;
}

export function RolloutMatrix({ addons, countries, configs, onUpsertConfig, onOpenPricing }: Props) {
  const configMap = useMemo(() => {
    const map = new Map<string, AddonCountryConfigDto>();
    for (const c of configs) map.set(key(c.addonId, c.countryCode), c);
    return map;
  }, [configs]);

  const [busyKey, setBusyKey] = useState<string | null>(null);

  async function toggle(addon: AddonDto, c: CountryDto, next: boolean) {
    const k = key(addon.id, c.countryCode);
    const existing = configMap.get(k);

    setBusyKey(k);
    try {
      await onUpsertConfig(addon.id, c.countryCode, {
        isActive: next,
        currencyCode: existing?.currencyCode ?? c.currencyCode,
        trialDays: existing?.trialDays ?? 0,
        complianceNotes: existing?.complianceNotes ?? undefined,
      });
    } finally {
      setBusyKey(null);
    }
  }

  async function updateTrial(addon: AddonDto, c: CountryDto, trialDays: number) {
    const k = key(addon.id, c.countryCode);
    const existing = configMap.get(k);

    setBusyKey(k);
    try {
      await onUpsertConfig(addon.id, c.countryCode, {
        isActive: existing?.isActive ?? false,
        currencyCode: existing?.currencyCode ?? c.currencyCode,
        trialDays,
        complianceNotes: existing?.complianceNotes ?? undefined,
      });
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <div className="rounded-xl border bg-background" data-testid="rollout-matrix">
      <div className="p-4 flex items-center justify-between gap-3">
        <div>
          <div className="text-lg font-semibold" data-testid="text-matrix-title">Add-on Rollout Matrix</div>
          <div className="text-sm text-muted-foreground">Toggle add-ons per country + set trial days.</div>
        </div>
        <Badge variant="outline" data-testid="badge-addon-count">{addons.length} add-ons</Badge>
      </div>

      <div className="overflow-auto">
        <table className="w-full text-sm" data-testid="table-rollout-matrix">
          <thead className="sticky top-0 bg-background border-b">
            <tr>
              <th className="text-left p-3 min-w-[260px]">Add-on</th>
              {countries.map((c) => (
                <th key={c.countryCode} className="text-left p-3 min-w-[240px]">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{c.countryName}</span>
                    <Badge variant="secondary">{c.countryCode}</Badge>
                    <Badge variant="outline">{c.currencyCode}</Badge>
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {addons.map((a) => (
              <tr key={a.id} className="border-b" data-testid={`row-addon-${a.slug}`}>
                <td className="p-3 align-top">
                  <div className="font-medium">{a.name}</div>
                  <div className="text-xs text-muted-foreground">{a.slug} • {a.category}</div>
                  <div className="mt-2 flex gap-2 flex-wrap">
                    <Button size="sm" variant="outline" onClick={() => onOpenPricing(a)} data-testid={`button-pricing-${a.slug}`}>
                      Pricing
                    </Button>
                    <Badge variant={a.status === "published" ? "default" : "secondary"}>{a.status}</Badge>
                  </div>
                </td>

                {countries.map((c) => {
                  const k = key(a.id, c.countryCode);
                  const conf = configMap.get(k);
                  const isActive = conf?.isActive ?? false;
                  const trialDays = conf?.trialDays ?? 0;

                  return (
                    <td key={c.countryCode} className="p-3 align-top" data-testid={`cell-${a.slug}-${c.countryCode}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={isActive}
                            onCheckedChange={(v) => void toggle(a, c, v)}
                            disabled={busyKey === k}
                            data-testid={`switch-active-${a.slug}-${c.countryCode}`}
                          />
                          {isActive ? <Badge data-testid={`badge-live-${a.slug}-${c.countryCode}`}>Live</Badge> : <Badge variant="outline" data-testid={`badge-soon-${a.slug}-${c.countryCode}`}>Soon</Badge>}
                        </div>

                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="text-xs text-muted-foreground cursor-help">?</span>
                            </TooltipTrigger>
                            <TooltipContent>
                              Country rollout controls visibility + purchase eligibility.
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>

                      <div className="mt-3 grid gap-2">
                        <div className="grid grid-cols-2 gap-2 items-end">
                          <div className="grid gap-1">
                            <div className="text-xs text-muted-foreground">Trial (days)</div>
                            <Input
                              value={trialDays}
                              onChange={(e) => {
                                const v = Number(e.target.value || 0);
                                if (Number.isFinite(v)) void updateTrial(a, c, Math.max(0, v));
                              }}
                              disabled={busyKey === k}
                              data-testid={`input-trial-${a.slug}-${c.countryCode}`}
                            />
                          </div>

                          <div className="grid gap-1">
                            <div className="text-xs text-muted-foreground">Currency</div>
                            <div className="rounded-md border px-3 py-2 text-xs bg-muted/30">
                              {conf?.currencyCode ?? c.currencyCode}
                            </div>
                          </div>
                        </div>

                        {a.status !== "published" && (
                          <div className="text-xs text-amber-700 bg-amber-50 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-md p-2">
                            This add-on is not published yet. Tenants won't see it even if rollout is Live.
                          </div>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
