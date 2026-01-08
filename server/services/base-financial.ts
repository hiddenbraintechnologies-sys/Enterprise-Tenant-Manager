import { currencyService, type ConversionResult, type CurrencyInfo, SUPPORTED_CURRENCIES } from "./currency";
import { taxCalculatorService, type TaxCalculationResult, type TaxBreakdown } from "./tax-calculator";

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  discountAmount?: number;
  taxRate?: number;
  hsnCode?: string | null;
}

export interface InvoiceData {
  id: string;
  invoiceNumber: string;
  invoiceType: string;
  status: string;
  invoiceDate: Date;
  dueDate: Date | null;
  currency: string;
  baseCurrency: string;
  exchangeRate: number;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  taxMetadata: Record<string, unknown>;
  billingName: string | null;
  billingAddress: string | null;
  billingCity: string | null;
  billingState: string | null;
  billingPostalCode: string | null;
  billingCountry: string | null;
  billingEmail: string | null;
  billingPhone: string | null;
  customerTaxId: string | null;
  customerTaxIdType: string | null;
  tenantTaxId: string | null;
  tenantTaxIdType: string | null;
  tenantBusinessName: string | null;
  tenantAddress: string | null;
  notes: string | null;
  termsAndConditions: string | null;
  complianceCountry: string | null;
}

export interface InvoicePDFRequest {
  invoice: InvoiceData;
  items: InvoiceLineItem[];
  branding: {
    logoUrl: string | null;
    primaryColor: string;
    secondaryColor: string;
    fontFamily: string;
    emailFromName: string | null;
    supportEmail: string | null;
    supportPhone: string | null;
  } | null;
  tenant: {
    name: string;
    address: string | null;
  };
  moduleSpecificData?: Record<string, unknown>;
}

export interface TaxCalculationRequest {
  tenantId: string;
  country: string;
  baseAmount: number;
  metadata?: Record<string, unknown>;
}

export interface CurrencyConversionRequest {
  amount: number;
  fromCurrency: string;
  toCurrency: string;
  asOfDate?: Date;
}

export interface IFinancialService {
  calculateTax(request: TaxCalculationRequest): Promise<TaxCalculationResult>;
  convertCurrency(request: CurrencyConversionRequest): Promise<ConversionResult | null>;
  getCurrencyInfo(currencyCode: string): CurrencyInfo | null;
  formatCurrency(amount: number, currencyCode: string): string;
  getSupportedCurrencies(): Record<string, CurrencyInfo>;
}

export interface IInvoicePDFGenerator {
  generatePDF(request: InvoicePDFRequest): Promise<Buffer>;
}

class BaseFinancialService implements IFinancialService {
  async calculateTax(request: TaxCalculationRequest): Promise<TaxCalculationResult> {
    return taxCalculatorService.calculateTax(
      request.tenantId,
      request.country,
      request.baseAmount,
      request.metadata || {}
    );
  }

  async convertCurrency(request: CurrencyConversionRequest): Promise<ConversionResult | null> {
    return currencyService.convertAmount(
      request.amount,
      request.fromCurrency,
      request.toCurrency,
      request.asOfDate
    );
  }

  getCurrencyInfo(currencyCode: string): CurrencyInfo | null {
    return SUPPORTED_CURRENCIES[currencyCode] || null;
  }

  formatCurrency(amount: number, currencyCode: string): string {
    return currencyService.formatAmount(amount, currencyCode);
  }

  getSupportedCurrencies(): Record<string, CurrencyInfo> {
    return SUPPORTED_CURRENCIES;
  }

  calculateLineItemTax(
    items: InvoiceLineItem[],
    taxResult: TaxCalculationResult
  ): Array<InvoiceLineItem & { taxAmount: number; totalPrice: number }> {
    const taxRate = taxResult.breakdown.length > 0
      ? taxResult.breakdown.reduce((sum, b) => sum + b.rate, 0)
      : 0;

    return items.map(item => {
      const lineSubtotal = item.quantity * item.unitPrice - (item.discountAmount || 0);
      const lineTaxAmount = (lineSubtotal * taxRate) / 100;
      return {
        ...item,
        taxRate: taxRate,
        taxAmount: Math.round(lineTaxAmount * 100) / 100,
        totalPrice: Math.round((lineSubtotal + lineTaxAmount) * 100) / 100,
      };
    });
  }

  calculateInvoiceTotals(
    items: InvoiceLineItem[],
    taxResult: TaxCalculationResult,
    additionalCharges: { delivery?: number; installation?: number; discount?: number } = {}
  ): {
    subtotal: number;
    discountAmount: number;
    taxAmount: number;
    totalAmount: number;
  } {
    const subtotal = items.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0
    );

    const itemDiscounts = items.reduce(
      (sum, item) => sum + (item.discountAmount || 0),
      0
    );

    const discountAmount = itemDiscounts + (additionalCharges.discount || 0);
    const deliveryCharges = additionalCharges.delivery || 0;
    const installationCharges = additionalCharges.installation || 0;

    const taxableAmount = subtotal - discountAmount + deliveryCharges + installationCharges;
    const taxAmount = taxResult.totalTaxAmount;
    const totalAmount = taxableAmount + taxAmount;

    return {
      subtotal: Math.round(subtotal * 100) / 100,
      discountAmount: Math.round(discountAmount * 100) / 100,
      taxAmount: Math.round(taxAmount * 100) / 100,
      totalAmount: Math.round(totalAmount * 100) / 100,
    };
  }
}

export const baseFinancialService = new BaseFinancialService();

export {
  type TaxCalculationResult,
  type TaxBreakdown,
  type ConversionResult,
  type CurrencyInfo,
};
