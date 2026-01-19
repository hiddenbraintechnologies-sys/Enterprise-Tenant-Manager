import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Globe, Loader2 } from "lucide-react";

import { ComingSoonModal } from "./coming-soon";

type RolloutRow = {
  countryCode: string;
  isActive: boolean;
  comingSoonMessage?: string | null;
  enabledBusinessTypes?: string[];
};

type RolloutResponse = {
  rollouts: RolloutRow[];
  updatedAt?: string;
  version?: number;
};

const STORAGE_KEY = "app:country";

const COUNTRY_OPTIONS: { code: string; name: string; path: string }[] = [
  { code: "IN", name: "India", path: "/in" },
  { code: "MY", name: "Malaysia", path: "/my" },
  { code: "UK", name: "United Kingdom", path: "/uk" },
  { code: "AE", name: "UAE", path: "/uae" },
  { code: "SG", name: "Singapore", path: "/sg" },
];

export type CountryCode = "IN" | "MY" | "UK" | "AE" | "SG";

function safeUpper2(v: unknown) {
  return String(v || "").toUpperCase().slice(0, 2);
}

export function getCountryFromPath(pathname: string): CountryCode | "GLOBAL" {
  const country = COUNTRY_OPTIONS.find((c) => c.path === pathname);
  return country ? (country.code as CountryCode) : "GLOBAL";
}

export function getCountryLabel(pathname: string): string {
  const country = COUNTRY_OPTIONS.find((c) => c.path === pathname);
  return country ? country.name : "Global";
}

export function getStoredCountry(): CountryCode | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(STORAGE_KEY) as CountryCode | null;
  } catch {
    return null;
  }
}

export function setStoredCountry(code: CountryCode) {
  try {
    localStorage.setItem(STORAGE_KEY, code);
    document.cookie = `country=${code};path=/;max-age=31536000`;
  } catch {
    // ignore storage errors
  }
}

export function clearStoredCountry() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    document.cookie = "country=;path=/;max-age=0";
  } catch {
    // ignore
  }
}

interface CountrySelectorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect?: (code: CountryCode) => void;
}

export function CountrySelectorModal({ open, onOpenChange, onSelect }: CountrySelectorModalProps) {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [comingSoonOpen, setComingSoonOpen] = React.useState(false);
  const [comingSoonMsg, setComingSoonMsg] = React.useState<string>("Coming soon.");

  const { data, isLoading, isError, refetch, isFetching } = useQuery<RolloutResponse>({
    queryKey: ["/api/public/rollouts"],
    queryFn: async () => {
      const res = await fetch("/api/public/rollouts", {
        method: "GET",
        headers: {
          "Cache-Control": "no-cache",
          "Pragma": "no-cache",
        },
      });
      if (!res.ok) {
        throw new Error(`Failed to fetch rollouts: ${res.status}`);
      }
      const json = await res.json();
      if (import.meta.env.DEV) {
        console.log("[CountrySelector] Raw API response:", json);
      }
      return json as RolloutResponse;
    },
    enabled: open,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    retry: 2,
  });

  React.useEffect(() => {
    if (open) {
      refetch();
      if (import.meta.env.DEV) {
        console.log("[CountrySelector] Modal opened, refetching rollout data...");
      }
    }
  }, [open, refetch]);

  React.useEffect(() => {
    if (data && import.meta.env.DEV) {
      console.log("[CountrySelector] Received rollout data:", JSON.stringify(data, null, 2));
    }
  }, [data]);

  const rolloutByCode = React.useMemo(() => {
    const map = new Map<string, RolloutRow>();
    const rollouts = data?.rollouts || [];
    if (import.meta.env.DEV) {
      console.log("[CountrySelector] Building lookup from rollouts:", rollouts.length, "entries");
    }
    for (const r of rollouts) {
      let code = safeUpper2(r.countryCode);
      if (code === "GB") code = "UK";
      map.set(code, r);
      if (import.meta.env.DEV) {
        console.log(`[CountrySelector] ${code} -> isActive:`, r.isActive);
      }
    }
    return map;
  }, [data]);

  const handleSelect = (country: typeof COUNTRY_OPTIONS[number]) => {
    const code = country.code as CountryCode;
    const rollout = rolloutByCode.get(code);
    const isActive = rollout?.isActive === true;

    if (!isActive) {
      const msg =
        rollout?.comingSoonMessage?.trim() ||
        "We're not live in this country yet. Please join the waitlist or choose another country.";
      setComingSoonMsg(msg);
      setComingSoonOpen(true);
      return;
    }

    setStoredCountry(code);
    toast({ title: "Country selected", description: `${country.name} selected.` });
    onSelect?.(code);
    onOpenChange(false);
    navigate(country.path);
  };

  const selectedCountry = getStoredCountry() || "";

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg" data-testid="modal-country-selector">
          <DialogHeader>
            <DialogTitle>Select your country</DialogTitle>
            <DialogDescription>
              Choose your country to see local pricing and features.
            </DialogDescription>
          </DialogHeader>

          <Separator className="my-3" />

          {isLoading && !data && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {isError && !data && (
            <div className="flex flex-col items-center gap-3 py-4">
              <p className="text-sm text-destructive">
                Unable to load rollout status.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                data-testid="button-retry-rollouts"
              >
                Retry
              </Button>
            </div>
          )}

          {data && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {COUNTRY_OPTIONS.map((c) => {
                const rollout = rolloutByCode.get(c.code);
                const isActive = rollout?.isActive === true;
                const isKnown = rolloutByCode.has(c.code);

                return (
                  <Button
                    key={c.code}
                    type="button"
                    variant={selectedCountry === c.code ? "default" : "outline"}
                    className="h-auto justify-between gap-2 py-4"
                    onClick={() => handleSelect(c)}
                    data-testid={`button-country-${c.code.toLowerCase()}`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{c.code}</span>
                      <span className="text-sm">{c.name}</span>
                    </div>

                    {isActive ? (
                      <Badge className="bg-green-500 text-white border-green-600 hover:bg-green-500 whitespace-nowrap shrink-0">Active</Badge>
                    ) : (
                      <Badge variant="outline" className="whitespace-nowrap shrink-0">In-Active</Badge>
                    )}
                  </Button>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ComingSoonModal
        open={comingSoonOpen}
        onOpenChange={setComingSoonOpen}
        message={comingSoonMsg}
      />
    </>
  );
}

interface CountrySwitchProps {
  pathname: string;
  onOpenSelector: () => void;
}

export function CountrySwitch({ pathname, onOpenSelector }: CountrySwitchProps) {
  const country = COUNTRY_OPTIONS.find((c) => c.path === pathname);
  const isGlobal = !country;

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onOpenSelector}
      className="gap-2"
      data-testid="button-change-country"
    >
      {isGlobal ? (
        <>
          <Globe className="h-4 w-4" />
          <span className="hidden sm:inline" data-testid="text-country-label">Global</span>
        </>
      ) : (
        <>
          <span className="flex h-5 w-7 items-center justify-center rounded border bg-muted text-xs font-semibold">
            {country.code}
          </span>
          <span className="hidden sm:inline" data-testid="text-country-label">{country.name}</span>
        </>
      )}
    </Button>
  );
}

export { COUNTRY_OPTIONS as COUNTRIES };
