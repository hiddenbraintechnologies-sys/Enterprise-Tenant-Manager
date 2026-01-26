import type { ExchangeRate } from "@shared/schema";
import { apiRequest } from "./queryClient";

export interface CurrencyConfig {
  code: string;
  symbol: string;
  name: string;
  decimalPlaces: number;
  symbolPosition: "before" | "after";
  thousandsSeparator: string;
  decimalSeparator: string;
}

export const CURRENCY_CONFIGS: Record<string, CurrencyConfig> = {
  INR: {
    code: "INR",
    symbol: "₹",
    name: "Indian Rupee",
    decimalPlaces: 2,
    symbolPosition: "before",
    thousandsSeparator: ",",
    decimalSeparator: ".",
  },
  AED: {
    code: "AED",
    symbol: "د.إ",
    name: "UAE Dirham",
    decimalPlaces: 2,
    symbolPosition: "before",
    thousandsSeparator: ",",
    decimalSeparator: ".",
  },
  GBP: {
    code: "GBP",
    symbol: "£",
    name: "British Pound",
    decimalPlaces: 2,
    symbolPosition: "before",
    thousandsSeparator: ",",
    decimalSeparator: ".",
  },
  MYR: {
    code: "MYR",
    symbol: "RM",
    name: "Malaysian Ringgit",
    decimalPlaces: 2,
    symbolPosition: "before",
    thousandsSeparator: ",",
    decimalSeparator: ".",
  },
  SGD: {
    code: "SGD",
    symbol: "S$",
    name: "Singapore Dollar",
    decimalPlaces: 2,
    symbolPosition: "before",
    thousandsSeparator: ",",
    decimalSeparator: ".",
  },
  USD: {
    code: "USD",
    symbol: "$",
    name: "US Dollar",
    decimalPlaces: 2,
    symbolPosition: "before",
    thousandsSeparator: ",",
    decimalSeparator: ".",
  },
  EUR: {
    code: "EUR",
    symbol: "€",
    name: "Euro",
    decimalPlaces: 2,
    symbolPosition: "before",
    thousandsSeparator: ".",
    decimalSeparator: ",",
  },
  AUD: {
    code: "AUD",
    symbol: "A$",
    name: "Australian Dollar",
    decimalPlaces: 2,
    symbolPosition: "before",
    thousandsSeparator: ",",
    decimalSeparator: ".",
  },
  CAD: {
    code: "CAD",
    symbol: "C$",
    name: "Canadian Dollar",
    decimalPlaces: 2,
    symbolPosition: "before",
    thousandsSeparator: ",",
    decimalSeparator: ".",
  },
  JPY: {
    code: "JPY",
    symbol: "¥",
    name: "Japanese Yen",
    decimalPlaces: 0,
    symbolPosition: "before",
    thousandsSeparator: ",",
    decimalSeparator: ".",
  },
  CNY: {
    code: "CNY",
    symbol: "¥",
    name: "Chinese Yuan",
    decimalPlaces: 2,
    symbolPosition: "before",
    thousandsSeparator: ",",
    decimalSeparator: ".",
  },
  SAR: {
    code: "SAR",
    symbol: "﷼",
    name: "Saudi Riyal",
    decimalPlaces: 2,
    symbolPosition: "before",
    thousandsSeparator: ",",
    decimalSeparator: ".",
  },
  ZAR: {
    code: "ZAR",
    symbol: "R",
    name: "South African Rand",
    decimalPlaces: 2,
    symbolPosition: "before",
    thousandsSeparator: " ",
    decimalSeparator: ",",
  },
  NGN: {
    code: "NGN",
    symbol: "₦",
    name: "Nigerian Naira",
    decimalPlaces: 2,
    symbolPosition: "before",
    thousandsSeparator: ",",
    decimalSeparator: ".",
  },
  BRL: {
    code: "BRL",
    symbol: "R$",
    name: "Brazilian Real",
    decimalPlaces: 2,
    symbolPosition: "before",
    thousandsSeparator: ".",
    decimalSeparator: ",",
  },
};

export function getCurrencyConfig(currencyCode: string): CurrencyConfig {
  return CURRENCY_CONFIGS[currencyCode.toUpperCase()] || CURRENCY_CONFIGS.USD;
}

export function formatCurrency(
  amount: number | string,
  currencyCode: string,
  options?: {
    showSymbol?: boolean;
    showCode?: boolean;
  }
): string {
  const config = getCurrencyConfig(currencyCode);
  const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;
  
  if (isNaN(numAmount)) {
    return "0.00";
  }

  const absoluteAmount = Math.abs(numAmount);
  const isNegative = numAmount < 0;
  
  const fixedAmount = absoluteAmount.toFixed(config.decimalPlaces);
  const [integerPart, decimalPart] = fixedAmount.split(".");
  
  const formattedInteger = integerPart.replace(
    /\B(?=(\d{3})+(?!\d))/g,
    config.thousandsSeparator
  );
  
  let formattedAmount = decimalPart
    ? `${formattedInteger}${config.decimalSeparator}${decimalPart}`
    : formattedInteger;
  
  if (isNegative) {
    formattedAmount = `-${formattedAmount}`;
  }
  
  const showSymbol = options?.showSymbol !== false;
  const showCode = options?.showCode === true;
  
  if (showSymbol) {
    if (config.symbolPosition === "before") {
      formattedAmount = `${config.symbol}${formattedAmount}`;
    } else {
      formattedAmount = `${formattedAmount}${config.symbol}`;
    }
  }
  
  if (showCode) {
    formattedAmount = `${formattedAmount} ${config.code}`;
  }
  
  return formattedAmount;
}

export function formatCurrencyCompact(
  amount: number | string,
  currencyCode: string
): string {
  const config = getCurrencyConfig(currencyCode);
  const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;
  
  if (isNaN(numAmount)) {
    return `${config.symbol}0`;
  }
  
  const absAmount = Math.abs(numAmount);
  const isNegative = numAmount < 0;
  
  let formattedValue: string;
  
  if (absAmount >= 1_000_000_000) {
    formattedValue = `${(absAmount / 1_000_000_000).toFixed(1)}B`;
  } else if (absAmount >= 1_000_000) {
    formattedValue = `${(absAmount / 1_000_000).toFixed(1)}M`;
  } else if (absAmount >= 1_000) {
    formattedValue = `${(absAmount / 1_000).toFixed(1)}K`;
  } else {
    formattedValue = absAmount.toFixed(config.decimalPlaces);
  }
  
  return `${isNegative ? "-" : ""}${config.symbol}${formattedValue}`;
}

export function parseCurrencyAmount(
  value: string,
  currencyCode: string
): number {
  const config = getCurrencyConfig(currencyCode);
  
  let cleanValue = value
    .replace(config.symbol, "")
    .replace(config.code, "")
    .trim();
  
  cleanValue = cleanValue.replace(new RegExp(`\\${config.thousandsSeparator}`, "g"), "");
  
  if (config.decimalSeparator !== ".") {
    cleanValue = cleanValue.replace(config.decimalSeparator, ".");
  }
  
  return parseFloat(cleanValue) || 0;
}

export async function fetchExchangeRate(
  fromCurrency: string,
  toCurrency: string
): Promise<ExchangeRate | null> {
  try {
    const response = await apiRequest(
      "GET",
      `/api/exchange-rates/${fromCurrency}/${toCurrency}`
    );
    
    return response.json();
  } catch (error) {
    console.error("Failed to fetch exchange rate:", error);
    return null;
  }
}

export async function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string
): Promise<{ convertedAmount: number; rate: number; decimalPlaces: number } | null> {
  try {
    const response = await apiRequest("POST", "/api/exchange-rates/convert", {
      amount,
      fromCurrency,
      toCurrency,
    });
    
    const data = await response.json();
    return {
      convertedAmount: data.convertedAmount,
      rate: data.rate,
      decimalPlaces: data.decimalPlaces ?? 2,
    };
  } catch (error) {
    console.error("Failed to convert currency:", error);
    return null;
  }
}

export function getCurrencySymbol(currencyCode: string): string {
  return getCurrencyConfig(currencyCode).symbol;
}

export function getAllCurrencies(): CurrencyConfig[] {
  return Object.values(CURRENCY_CONFIGS);
}

export function getCommonCurrencies(): CurrencyConfig[] {
  const commonCodes = ["USD", "EUR", "GBP", "INR", "AED", "SGD", "AUD"];
  return commonCodes.map((code) => CURRENCY_CONFIGS[code]).filter(Boolean);
}
