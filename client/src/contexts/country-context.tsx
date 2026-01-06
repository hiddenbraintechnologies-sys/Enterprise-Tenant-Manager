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
    flag: "EU",
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
    flag: "AU",
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
    flag: "SG",
  },
];

const STORAGE_KEY = "bizflow_country_preference";

interface CountryContextType {
  country: CountryConfig;
  setCountry: (countryCode: string) => void;
  formatCurrency: (amount: number, options?: { showSymbol?: boolean; decimals?: number }) => string;
  formatCompactCurrency: (amount: number) => string;
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
