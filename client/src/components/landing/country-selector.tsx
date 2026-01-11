import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { Globe } from "lucide-react";

const COUNTRIES = [
  { code: "IN", name: "India", path: "/in", available: true },
  { code: "UK", name: "United Kingdom", path: "/uk", available: false },
  { code: "AE", name: "UAE", path: "/uae", available: false },
  { code: "SG", name: "Singapore", path: "/sg", available: false },
  { code: "MY", name: "Malaysia", path: "/my", available: false },
] as const;

export function getCountryFromPath(pathname: string): CountryCode | "GLOBAL" {
  const country = COUNTRIES.find((c) => c.path === pathname);
  return country ? country.code : "GLOBAL";
}

export function getCountryLabel(pathname: string): string {
  const country = COUNTRIES.find((c) => c.path === pathname);
  return country ? country.name : "Global";
}

export type CountryCode = typeof COUNTRIES[number]["code"];

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

  const handleSelect = (country: typeof COUNTRIES[number]) => {
    setStoredCountry(country.code);
    onOpenChange(false);
    onSelect?.(country.code);
    navigate(country.path);
  };

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
          {COUNTRIES.map((country) => (
            <Button
              key={country.code}
              variant={country.available ? "outline" : "ghost"}
              className="justify-start h-auto py-3 px-4"
              onClick={() => handleSelect(country)}
              data-testid={`button-country-${country.code.toLowerCase()}`}
            >
              <span className="flex h-6 w-8 items-center justify-center rounded border bg-muted text-xs font-semibold mr-3">
                {country.code}
              </span>
              <span className="font-medium">{country.name}</span>
              {!country.available && (
                <span className="ml-auto text-xs text-muted-foreground">Coming soon</span>
              )}
            </Button>
          ))}
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
  const country = COUNTRIES.find((c) => c.path === pathname);
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

export { COUNTRIES };
