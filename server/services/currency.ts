import { db } from "../db";
import { exchangeRates } from "@shared/schema";
import { eq, and, lte, desc, sql, isNull, or } from "drizzle-orm";

export interface CurrencyInfo {
  code: string;
  name: string;
  symbol: string;
  decimalPlaces: number;
  symbolPosition: "before" | "after";
}

export const SUPPORTED_CURRENCIES: Record<string, CurrencyInfo> = {
  INR: { code: "INR", name: "Indian Rupee", symbol: "₹", decimalPlaces: 2, symbolPosition: "before" },
  AED: { code: "AED", name: "UAE Dirham", symbol: "د.إ", decimalPlaces: 2, symbolPosition: "before" },
  GBP: { code: "GBP", name: "British Pound", symbol: "£", decimalPlaces: 2, symbolPosition: "before" },
  MYR: { code: "MYR", name: "Malaysian Ringgit", symbol: "RM", decimalPlaces: 2, symbolPosition: "before" },
  SGD: { code: "SGD", name: "Singapore Dollar", symbol: "S$", decimalPlaces: 2, symbolPosition: "before" },
  USD: { code: "USD", name: "US Dollar", symbol: "$", decimalPlaces: 2, symbolPosition: "before" },
  EUR: { code: "EUR", name: "Euro", symbol: "€", decimalPlaces: 2, symbolPosition: "before" },
  AUD: { code: "AUD", name: "Australian Dollar", symbol: "A$", decimalPlaces: 2, symbolPosition: "before" },
  CAD: { code: "CAD", name: "Canadian Dollar", symbol: "C$", decimalPlaces: 2, symbolPosition: "before" },
  JPY: { code: "JPY", name: "Japanese Yen", symbol: "¥", decimalPlaces: 0, symbolPosition: "before" },
  CNY: { code: "CNY", name: "Chinese Yuan", symbol: "¥", decimalPlaces: 2, symbolPosition: "before" },
  SAR: { code: "SAR", name: "Saudi Riyal", symbol: "﷼", decimalPlaces: 2, symbolPosition: "before" },
  ZAR: { code: "ZAR", name: "South African Rand", symbol: "R", decimalPlaces: 2, symbolPosition: "before" },
  NGN: { code: "NGN", name: "Nigerian Naira", symbol: "₦", decimalPlaces: 2, symbolPosition: "before" },
  BRL: { code: "BRL", name: "Brazilian Real", symbol: "R$", decimalPlaces: 2, symbolPosition: "before" },
};

export interface ExchangeRateResult {
  id: string;
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  inverseRate: number;
  validFrom: Date;
  source: string;
}

export interface ConversionResult {
  originalAmount: number;
  originalCurrency: string;
  convertedAmount: number;
  targetCurrency: string;
  exchangeRate: number;
  exchangeRateId: string;
  exchangeRateDate: Date;
}

class CurrencyService {
  async getExchangeRate(
    fromCurrency: string,
    toCurrency: string,
    asOfDate?: Date
  ): Promise<ExchangeRateResult | null> {
    if (fromCurrency === toCurrency) {
      return {
        id: "same-currency",
        fromCurrency,
        toCurrency,
        rate: 1,
        inverseRate: 1,
        validFrom: new Date(),
        source: "identity",
      };
    }

    const effectiveDate = asOfDate || new Date();

    const result = await db
      .select()
      .from(exchangeRates)
      .where(
        and(
          eq(exchangeRates.fromCurrency, fromCurrency),
          eq(exchangeRates.toCurrency, toCurrency),
          eq(exchangeRates.isActive, true),
          lte(exchangeRates.validFrom, effectiveDate),
          or(
            isNull(exchangeRates.validTo),
            sql`${exchangeRates.validTo} > ${effectiveDate}`
          )
        )
      )
      .orderBy(desc(exchangeRates.validFrom))
      .limit(1);

    if (result.length === 0) {
      const inverseResult = await db
        .select()
        .from(exchangeRates)
        .where(
          and(
            eq(exchangeRates.fromCurrency, toCurrency),
            eq(exchangeRates.toCurrency, fromCurrency),
            eq(exchangeRates.isActive, true),
            lte(exchangeRates.validFrom, effectiveDate),
            or(
              isNull(exchangeRates.validTo),
              sql`${exchangeRates.validTo} > ${effectiveDate}`
            )
          )
        )
        .orderBy(desc(exchangeRates.validFrom))
        .limit(1);

      if (inverseResult.length === 0) {
        return null;
      }

      const inverseRate = inverseResult[0];
      return {
        id: inverseRate.id,
        fromCurrency,
        toCurrency,
        rate: parseFloat(inverseRate.inverseRate),
        inverseRate: parseFloat(inverseRate.rate),
        validFrom: inverseRate.validFrom,
        source: inverseRate.source || "manual",
      };
    }

    const rate = result[0];
    return {
      id: rate.id,
      fromCurrency: rate.fromCurrency,
      toCurrency: rate.toCurrency,
      rate: parseFloat(rate.rate),
      inverseRate: parseFloat(rate.inverseRate),
      validFrom: rate.validFrom,
      source: rate.source || "manual",
    };
  }

  async convert(
    amount: number,
    fromCurrency: string,
    toCurrency: string,
    asOfDate?: Date
  ): Promise<ConversionResult | null> {
    const exchangeRate = await this.getExchangeRate(fromCurrency, toCurrency, asOfDate);

    if (!exchangeRate) {
      return null;
    }

    const convertedAmount = this.round(amount * exchangeRate.rate, toCurrency);

    return {
      originalAmount: amount,
      originalCurrency: fromCurrency,
      convertedAmount,
      targetCurrency: toCurrency,
      exchangeRate: exchangeRate.rate,
      exchangeRateId: exchangeRate.id,
      exchangeRateDate: exchangeRate.validFrom,
    };
  }

  async convertToBaseCurrency(
    amount: number,
    fromCurrency: string,
    baseCurrency: string = "USD",
    asOfDate?: Date
  ): Promise<ConversionResult | null> {
    return this.convert(amount, fromCurrency, baseCurrency, asOfDate);
  }

  round(amount: number, currencyCode: string): number {
    const currency = SUPPORTED_CURRENCIES[currencyCode];
    const decimals = currency?.decimalPlaces ?? 2;
    const multiplier = Math.pow(10, decimals);
    return Math.round(amount * multiplier) / multiplier;
  }

  formatAmount(amount: number, currencyCode: string): string {
    const currency = SUPPORTED_CURRENCIES[currencyCode];
    if (!currency) {
      return amount.toFixed(2);
    }

    const formattedNumber = amount.toLocaleString(undefined, {
      minimumFractionDigits: currency.decimalPlaces,
      maximumFractionDigits: currency.decimalPlaces,
    });

    return currency.symbolPosition === "before"
      ? `${currency.symbol}${formattedNumber}`
      : `${formattedNumber}${currency.symbol}`;
  }

  getCurrencyInfo(currencyCode: string): CurrencyInfo | undefined {
    return SUPPORTED_CURRENCIES[currencyCode];
  }

  async createExchangeRate(
    fromCurrency: string,
    toCurrency: string,
    rate: number,
    source: string = "manual"
  ): Promise<string> {
    const inverseRate = 1 / rate;

    const [result] = await db
      .insert(exchangeRates)
      .values({
        fromCurrency,
        toCurrency,
        rate: rate.toFixed(8),
        inverseRate: inverseRate.toFixed(8),
        source,
        isActive: true,
        validFrom: new Date(),
      })
      .returning({ id: exchangeRates.id });

    return result.id;
  }

  async deactivateExchangeRate(id: string): Promise<void> {
    await db
      .update(exchangeRates)
      .set({
        isActive: false,
        validTo: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(exchangeRates.id, id));
  }

  async getActiveRates(): Promise<ExchangeRateResult[]> {
    const rates = await db
      .select()
      .from(exchangeRates)
      .where(eq(exchangeRates.isActive, true))
      .orderBy(desc(exchangeRates.validFrom));

    return rates.map((rate) => ({
      id: rate.id,
      fromCurrency: rate.fromCurrency,
      toCurrency: rate.toCurrency,
      rate: parseFloat(rate.rate),
      inverseRate: parseFloat(rate.inverseRate),
      validFrom: rate.validFrom,
      source: rate.source || "manual",
    }));
  }
}

export const currencyService = new CurrencyService();
