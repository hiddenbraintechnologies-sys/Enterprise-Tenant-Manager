import { createContext, useContext, useEffect, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";

export interface TenantBranding {
  id: string;
  tenantId: string;
  logoUrl: string | null;
  logoAltUrl: string | null;
  faviconUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  foregroundColor: string;
  mutedColor: string;
  borderColor: string;
  fontFamily: string;
  fontFamilyHeading: string | null;
  fontFamilyMono: string;
  emailFromName: string | null;
  emailFromAddress: string | null;
  emailReplyTo: string | null;
  emailSignature: string | null;
  supportEmail: string | null;
  supportPhone: string | null;
  supportUrl: string | null;
  termsOfServiceUrl: string | null;
  privacyPolicyUrl: string | null;
  socialLinks: Record<string, string>;
  customCss: string | null;
  themeTokens: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

const DEFAULT_BRANDING: Partial<TenantBranding> = {
  primaryColor: "#3B82F6",
  secondaryColor: "#1E40AF",
  accentColor: "#10B981",
  backgroundColor: "#FFFFFF",
  foregroundColor: "#111827",
  mutedColor: "#6B7280",
  borderColor: "#E5E7EB",
  fontFamily: "Inter",
  fontFamilyMono: "JetBrains Mono",
};

function hexToHSL(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return "0 0% 0%";
  
  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function injectBrandingCSS(branding: Partial<TenantBranding>) {
  const root = document.documentElement;
  
  if (branding.primaryColor) {
    root.style.setProperty("--brand-primary", branding.primaryColor);
    root.style.setProperty("--brand-primary-hsl", hexToHSL(branding.primaryColor));
  }
  if (branding.secondaryColor) {
    root.style.setProperty("--brand-secondary", branding.secondaryColor);
    root.style.setProperty("--brand-secondary-hsl", hexToHSL(branding.secondaryColor));
  }
  if (branding.accentColor) {
    root.style.setProperty("--brand-accent", branding.accentColor);
    root.style.setProperty("--brand-accent-hsl", hexToHSL(branding.accentColor));
  }
  
  if (branding.faviconUrl) {
    const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
    if (link) {
      link.href = branding.faviconUrl;
    }
  }
}

function removeBrandingCSS() {
  const root = document.documentElement;
  root.style.removeProperty("--brand-primary");
  root.style.removeProperty("--brand-primary-hsl");
  root.style.removeProperty("--brand-secondary");
  root.style.removeProperty("--brand-secondary-hsl");
  root.style.removeProperty("--brand-accent");
  root.style.removeProperty("--brand-accent-hsl");
}

interface BrandingContextType {
  branding: TenantBranding | null;
  isLoading: boolean;
  refetch: () => void;
}

const BrandingContext = createContext<BrandingContextType | undefined>(undefined);

export function BrandingProvider({ children }: { children: ReactNode }) {
  const { tenant } = useAuth();
  
  const { data: branding, isLoading, refetch } = useQuery<TenantBranding>({
    queryKey: ["/api/tenant/branding"],
    enabled: !!tenant,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
  
  useEffect(() => {
    if (branding) {
      console.log("[BrandingContext] Applying tenant branding:", {
        primaryColor: branding.primaryColor,
        secondaryColor: branding.secondaryColor,
        accentColor: branding.accentColor,
        logoUrl: branding.logoUrl,
      });
      injectBrandingCSS(branding);
    } else {
      removeBrandingCSS();
    }
    
    return () => {
      removeBrandingCSS();
    };
  }, [branding]);
  
  return (
    <BrandingContext.Provider value={{ branding: branding || null, isLoading, refetch }}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  const context = useContext(BrandingContext);
  if (context === undefined) {
    throw new Error("useBranding must be used within a BrandingProvider");
  }
  return context;
}

export { DEFAULT_BRANDING };
