import { useState, useEffect } from "react";
import { Building2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { useLocation } from "wouter";
import {
  CountrySelectorModal,
  CountrySwitch,
  getStoredCountry,
} from "./country-selector";

interface LandingLayoutProps {
  children: React.ReactNode;
  showCountryPrompt?: boolean;
}

export function LandingLayout({ children, showCountryPrompt = false }: LandingLayoutProps) {
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [location] = useLocation();

  useEffect(() => {
    if (showCountryPrompt && !getStoredCountry()) {
      const timer = setTimeout(() => {
        setSelectorOpen(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [showCountryPrompt]);

  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-6">
          <div className="flex items-center gap-3">
            <a href="/" className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <Building2 className="h-5 w-5" />
              </div>
              <span className="text-xl font-semibold" data-testid="text-logo">MyBizStream</span>
            </a>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <CountrySwitch
              pathname={location}
              onOpenSelector={() => setSelectorOpen(true)}
            />
            <ThemeToggle />
            <Button variant="ghost" asChild className="hidden sm:inline-flex" data-testid="button-signin">
              <a href="/login">Sign In</a>
            </Button>
            <Button asChild data-testid="button-get-started-nav">
              <a href="/register">
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </Button>
          </div>
        </div>
      </nav>

      {children}

      <footer className="border-t px-6 py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 text-sm text-muted-foreground sm:flex-row">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            <span>MyBizStream</span>
          </div>
          <button
            onClick={() => setSelectorOpen(true)}
            className="text-sm underline hover:text-foreground"
            data-testid="link-change-country-footer"
          >
            Change country
          </button>
        </div>
      </footer>

      <CountrySelectorModal
        open={selectorOpen}
        onOpenChange={setSelectorOpen}
      />
    </div>
  );
}
