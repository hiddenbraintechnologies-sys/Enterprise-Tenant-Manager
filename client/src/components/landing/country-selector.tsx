import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import { Globe, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

const COUNTRY_OPTIONS = [
  { code: "IN", name: "India", path: "/in" },
  { code: "MY", name: "Malaysia", path: "/my" },
  { code: "UK", name: "United Kingdom", path: "/uk" },
  { code: "SG", name: "Singapore", path: "/sg" },
  { code: "AE", name: "UAE", path: "/uae" },
] as const;

export type CountryCode = typeof COUNTRY_OPTIONS[number]["code"];

interface RolloutData {
  countryCode: string;
  isActive: boolean;
  status: string;
  comingSoonMessage: string | null;
  enabledBusinessTypes: string[];
}

export function getCountryFromPath(pathname: string): CountryCode | "GLOBAL" {
  const country = COUNTRY_OPTIONS.find((c) => c.path === pathname);
  return country ? country.code : "GLOBAL";
}

export function getCountryLabel(pathname: string): string {
  const country = COUNTRY_OPTIONS.find((c) => c.path === pathname);
  return country ? country.name : "Global";
}

const STORAGE_KEY = "selectedCountry";

export function getStoredCountry(): CountryCode | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(STORAGE_KEY) as CountryCode | null;
}

export function setStoredCountry(code: CountryCode) {
  localStorage.setItem(STORAGE_KEY, code);
  document.cookie = `country=${code};path=/;max-age=31536000`;
}

export function clearStoredCountry() {
  localStorage.removeItem(STORAGE_KEY);
  document.cookie = "country=;path=/;max-age=0";
}

interface CountrySelectorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect?: (code: CountryCode) => void;
}

export function CountrySelectorModal({ open, onOpenChange, onSelect }: CountrySelectorModalProps) {
  const [, navigate] = useLocation();
  const [comingSoonCountry, setComingSoonCountry] = useState<{
    code: CountryCode;
    name: string;
    message: string;
  } | null>(null);

  const { data: rollouts, isLoading } = useQuery<RolloutData[]>({
    queryKey: ["/api/public/rollouts"],
    enabled: open,
  });

  const rolloutByCode: Record<string, RolloutData> = {};
  if (Array.isArray(rollouts)) {
    for (const r of rollouts) {
      rolloutByCode[r.countryCode] = r;
    }
  }

  const isCountryActive = (code: string): boolean => {
    const rollout = rolloutByCode[code];
    return rollout?.isActive === true;
  };

  const getComingSoonMessage = (code: string): string => {
    const rollout = rolloutByCode[code];
    return rollout?.comingSoonMessage || "We're launching soon in this region. Stay tuned!";
  };

  const handleSelect = (country: typeof COUNTRY_OPTIONS[number]) => {
    if (isCountryActive(country.code)) {
      setStoredCountry(country.code);
      onOpenChange(false);
      onSelect?.(country.code);
      navigate(country.path);
    } else {
      setComingSoonCountry({
        code: country.code,
        name: country.name,
        message: getComingSoonMessage(country.code),
      });
    }
  };

  const handleBackFromComingSoon = () => {
    setComingSoonCountry(null);
  };

  if (comingSoonCountry) {
    return (
      <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) setComingSoonCountry(null); }}>
        <DialogContent className="sm:max-w-md" data-testid="modal-coming-soon">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="flex h-6 w-8 items-center justify-center rounded border bg-muted text-xs font-semibold">
                {comingSoonCountry.code}
              </span>
              {comingSoonCountry.name}
            </DialogTitle>
            <DialogDescription>Coming Soon</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-muted-foreground" data-testid="text-coming-soon-message">
              {comingSoonCountry.message}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleBackFromComingSoon}
              data-testid="button-back-to-countries"
            >
              Back
            </Button>
            <Button
              asChild
              data-testid="button-join-waitlist"
            >
              <a href={`/${comingSoonCountry.code.toLowerCase()}`}>Join Waitlist</a>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid="modal-country-selector">
        <DialogHeader>
          <DialogTitle>Choose your country</DialogTitle>
          <DialogDescription>
            Select your country to see local pricing and features.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            COUNTRY_OPTIONS.map((country) => {
              const active = isCountryActive(country.code);
              return (
                <Button
                  key={country.code}
                  variant={active ? "outline" : "ghost"}
                  className="justify-start h-auto py-3 px-4"
                  onClick={() => handleSelect(country)}
                  data-testid={`button-country-${country.code.toLowerCase()}`}
                >
                  <span className="flex h-6 w-8 items-center justify-center rounded border bg-muted text-xs font-semibold mr-3">
                    {country.code}
                  </span>
                  <span className="font-medium">{country.name}</span>
                  {!active && (
                    <Badge variant="secondary" className="ml-auto text-xs">
                      Coming soon
                    </Badge>
                  )}
                </Button>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
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
