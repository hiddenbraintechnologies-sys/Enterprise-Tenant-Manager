import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

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

export const SUPPORTED_COUNTRIES: CountryConfig[] = [
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
    flag: "🇮🇳",
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
    flag: "🇬🇧",
  },
  {
    code: "AE",
    name: "United Arab Emirates",
    currency: {
      code: "AED",
      symbol: "د.إ",
      locale: "ar-AE",
      position: "after",
    },
    dateFormat: "dd/MM/yyyy",
    taxName: "VAT",
    taxRate: 5,
    flag: "🇦🇪",
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
    flag: "🇺🇸",
  },
  {
    code: "EU",
    name: "European Union",
    currency: {
      code: "EUR",
      symbol: "€",
      locale: "de-DE",
      position: "before",
    },
    dateFormat: "dd.MM.yyyy",
    taxName: "VAT",
    taxRate: 20,
    flag: "🇪🇺",
  },
  {
    code: "AU",
    name: "Australia",
    currency: {
      code: "AUD",
      symbol: "A$",
      locale: "en-AU",
      position: "before",
    },
    dateFormat: "dd/MM/yyyy",
    taxName: "GST",
    taxRate: 10,
    flag: "🇦🇺",
  },
  {
    code: "SG",
    name: "Singapore",
    currency: {
      code: "SGD",
      symbol: "S$",
      locale: "en-SG",
      position: "before",
    },
    dateFormat: "dd/MM/yyyy",
    taxName: "GST",
    taxRate: 9,
    flag: "🇸🇬",
  },
];

const STORAGE_KEY = "bizflow_country_preference";

interface CountryContextType {
  country: CountryConfig;
  setCountry: (countryCode: string) => void;
  formatCurrency: (amount: number, options?: { showSymbol?: boolean; decimals?: number }) => string;
  formatDate: (date: Date | string) => string;
  supportedCountries: CountryConfig[];
}

const CountryContext = createContext<CountryContextType | undefined>(undefined);

export function CountryProvider({ children }: { children: ReactNode }) {
  const [country, setCountryState] = useState<CountryConfig>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const found = SUPPORTED_COUNTRIES.find(c => c.code === saved);
        if (found) return found;
      }
    }
    return SUPPORTED_COUNTRIES[0];
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, country.code);
  }, [country]);

  const setCountry = (countryCode: string) => {
    const found = SUPPORTED_COUNTRIES.find(c => c.code === countryCode);
    if (found) {
      setCountryState(found);
    }
  };

  const formatCurrency = (
    amount: number,
    options: { showSymbol?: boolean; decimals?: number } = {}
  ): string => {
    const { showSymbol = true, decimals = 2 } = options;
    
    try {
      const formatter = new Intl.NumberFormat(country.currency.locale, {
        style: showSymbol ? "currency" : "decimal",
        currency: country.currency.code,
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });
      
      return formatter.format(amount);
    } catch {
      const formatted = amount.toLocaleString(country.currency.locale, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });
      
      if (!showSymbol) return formatted;
      
      return country.currency.position === "before"
        ? `${country.currency.symbol}${formatted}`
        : `${formatted} ${country.currency.symbol}`;
    }
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
        formatDate,
        supportedCountries: SUPPORTED_COUNTRIES,
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
