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

  const { data, isLoading, isError, refetch } = useQuery<{ rollouts: RolloutRow[] } | RolloutRow[]>({
    queryKey: ["/api/public/rollouts"],
    enabled: open,
    staleTime: 0,
  });

  React.useEffect(() => {
    if (open) {
      refetch();
    }
  }, [open, refetch]);

  const rolloutByCode = React.useMemo(() => {
    const map = new Map<string, RolloutRow>();
    const rollouts = Array.isArray(data) ? data : (data as { rollouts: RolloutRow[] })?.rollouts || [];
    for (const r of rollouts) {
      let code = safeUpper2(r.countryCode);
      if (code === "GB") code = "UK";
      map.set(code, r);
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

          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {isError && (
            <div className="text-sm text-destructive py-4">
              Could not load country availability. Please refresh.
            </div>
          )}

          {!isLoading && !isError && (
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
                    <div className="flex flex-col items-start">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{c.code}</span>
                        <span className="text-sm">{c.name}</span>
                      </div>
                      <span className="text-xs text-muted-foreground mt-1">
                        {isKnown && isActive ? "Live" : "Coming soon"}
                      </span>
                    </div>

                    {isKnown && isActive ? (
                      <Badge className="bg-green-500 text-white border-green-600 hover:bg-green-500">Live</Badge>
                    ) : (
                      <Badge variant="outline">Soon</Badge>
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
