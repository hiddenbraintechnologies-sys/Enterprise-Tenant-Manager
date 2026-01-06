import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";

export interface CountryConfig {
  code: string;
  name: string;
  currency: {
    code: string;
    symbol: string;
    locale: string;
    position: "before" | "after";
  };
  dateFormat: string;
  taxName: string;
  taxRate: number;
  flag: string;
}

const FALLBACK_COUNTRIES: CountryConfig[] = [
  {
    code: "IN",
    name: "India",
    currency: {
      code: "INR",
      symbol: "₹",
      locale: "en-IN",
      position: "before",
    },
    dateFormat: "dd/MM/yyyy",
    taxName: "GST",
    taxRate: 18,
    flag: "IN",
  },
  {
    code: "GB",
    name: "United Kingdom",
    currency: {
      code: "GBP",
      symbol: "£",
      locale: "en-GB",
      position: "before",
    },
    dateFormat: "dd/MM/yyyy",
    taxName: "VAT",
    taxRate: 20,
    flag: "GB",
  },
  {
    code: "AE",
    name: "United Arab Emirates",
    currency: {
      code: "AED",
      symbol: "AED",
      locale: "en-AE",
      position: "after",
    },
    dateFormat: "dd/MM/yyyy",
    taxName: "VAT",
    taxRate: 5,
    flag: "AE",
  },
  {
    code: "US",
    name: "United States",
    currency: {
      code: "USD",
      symbol: "$",
      locale: "en-US",
      position: "before",
    },
    dateFormat: "MM/dd/yyyy",
    taxName: "Tax",
    taxRate: 0,
    flag: "US",
  },
];

export const SUPPORTED_COUNTRIES = FALLBACK_COUNTRIES;

interface RegionConfigResponse {
  id: string;
  countryCode: string;
  countryName: string;
  defaultCurrency: string;
  defaultTimezone: string;
  taxType: string | null;
  taxRate: string | null;
  status: "enabled" | "disabled";
}

const CURRENCY_SYMBOLS: Record<string, { symbol: string; locale: string; position: "before" | "after" }> = {
  INR: { symbol: "₹", locale: "en-IN", position: "before" },
  USD: { symbol: "$", locale: "en-US", position: "before" },
  GBP: { symbol: "£", locale: "en-GB", position: "before" },
  EUR: { symbol: "€", locale: "de-DE", position: "before" },
  AED: { symbol: "AED", locale: "en-AE", position: "after" },
  AUD: { symbol: "A$", locale: "en-AU", position: "before" },
  SGD: { symbol: "S$", locale: "en-SG", position: "before" },
  CAD: { symbol: "C$", locale: "en-CA", position: "before" },
  JPY: { symbol: "¥", locale: "ja-JP", position: "before" },
  CNY: { symbol: "¥", locale: "zh-CN", position: "before" },
  MYR: { symbol: "RM", locale: "ms-MY", position: "before" },
  SAR: { symbol: "SAR", locale: "ar-SA", position: "after" },
  ZAR: { symbol: "R", locale: "en-ZA", position: "before" },
  NGN: { symbol: "₦", locale: "en-NG", position: "before" },
  BRL: { symbol: "R$", locale: "pt-BR", position: "before" },
};

function convertRegionToCountryConfig(region: RegionConfigResponse): CountryConfig {
  const currencyInfo = CURRENCY_SYMBOLS[region.defaultCurrency] || {
    symbol: region.defaultCurrency,
    locale: "en-US",
    position: "before" as const,
  };

  return {
    code: region.countryCode,
    name: region.countryName,
    currency: {
      code: region.defaultCurrency,
      ...currencyInfo,
    },
    dateFormat: "dd/MM/yyyy",
    taxName: region.taxType || "Tax",
    taxRate: region.taxRate ? parseFloat(region.taxRate) : 0,
    flag: region.countryCode,
  };
}

const STORAGE_KEY = "bizflow_country_preference";

interface CountryContextType {
  country: CountryConfig;
  setCountry: (countryCode: string) => void;
  formatCurrency: (amount: number, options?: { showSymbol?: boolean; decimals?: number }) => string;
  formatCompactCurrency: (amount: number) => string;
  formatDate: (date: Date | string) => string;
  supportedCountries: CountryConfig[];
  isLoading: boolean;
}

const CountryContext = createContext<CountryContextType | undefined>(undefined);

export function CountryProvider({ children }: { children: ReactNode }) {
  const [supportedCountries, setSupportedCountries] = useState<CountryConfig[]>(FALLBACK_COUNTRIES);
  
  const { data: regionConfigs, isLoading } = useQuery<RegionConfigResponse[]>({
    queryKey: ["/api/region-configs/active"],
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });

  useEffect(() => {
    if (regionConfigs && regionConfigs.length > 0) {
      const convertedConfigs = regionConfigs.map(convertRegionToCountryConfig);
      setSupportedCountries(convertedConfigs);
    }
  }, [regionConfigs]);

  const [country, setCountryState] = useState<CountryConfig>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const found = FALLBACK_COUNTRIES.find(c => c.code === saved);
        if (found) return found;
      }
    }
    return FALLBACK_COUNTRIES[0];
  });

  useEffect(() => {
    if (supportedCountries.length > 0) {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const found = supportedCountries.find(c => c.code === saved);
        if (found && found.code !== country.code) {
          setCountryState(found);
        }
      } else if (!supportedCountries.find(c => c.code === country.code)) {
        setCountryState(supportedCountries[0]);
      }
    }
  }, [supportedCountries, country.code]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, country.code);
  }, [country]);

  const setCountry = (countryCode: string) => {
    const found = supportedCountries.find(c => c.code === countryCode);
    if (found) {
      setCountryState(found);
    }
  };

  const formatCurrency = (
    amount: number,
    options: { showSymbol?: boolean; decimals?: number } = {}
  ): string => {
    const { showSymbol = true, decimals = 2 } = options;
    
    const numericFormatter = new Intl.NumberFormat(country.currency.locale, {
      style: "decimal",
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
    
    const formatted = numericFormatter.format(amount);
    
    if (!showSymbol) return formatted;
    
    return country.currency.position === "before"
      ? `${country.currency.symbol}${formatted}`
      : `${formatted} ${country.currency.symbol}`;
  };

  const formatCompactCurrency = (amount: number): string => {
    const absAmount = Math.abs(amount);
    let compactValue: string;
    let suffix: string;
    
    if (absAmount >= 1_000_000) {
      const val = amount / 1_000_000;
      compactValue = val % 1 === 0 ? val.toFixed(0) : val.toFixed(1);
      suffix = "M";
    } else if (absAmount >= 1_000) {
      const val = amount / 1_000;
      compactValue = val % 1 === 0 ? val.toFixed(0) : val.toFixed(1);
      suffix = "k";
    } else {
      compactValue = amount.toFixed(0);
      suffix = "";
    }
    
    const symbol = country.currency.symbol;
    return country.currency.position === "before"
      ? `${symbol}${compactValue}${suffix}`
      : `${compactValue}${suffix} ${symbol}`;
  };

  const formatDate = (date: Date | string): string => {
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleDateString(country.currency.locale);
  };

  return (
    <CountryContext.Provider
      value={{
        country,
        setCountry,
        formatCurrency,
        formatCompactCurrency,
        formatDate,
        supportedCountries,
        isLoading,
      }}
    >
      {children}
    </CountryContext.Provider>
  );
}

export function useCountry() {
  const context = useContext(CountryContext);
  if (context === undefined) {
    throw new Error("useCountry must be used within a CountryProvider");
  }
  return context;
}
