import { db } from "../db";
import {
  gstConfigurations,
  uaeVatConfigurations,
  ukVatConfigurations,
  malaysiaSstConfigurations,
  usStateSalesTaxConfigurations,
  tenantTaxRegistrations,
  taxRules,
  taxCalculationLogs,
} from "@shared/schema";
import { eq, and } from "drizzle-orm";

export interface TaxBreakdown {
  taxType: string;
  taxName: string;
  rate: number;
  baseAmount: number;
  taxAmount: number;
  metadata?: Record<string, unknown>;
}

export interface TaxCalculationResult {
  country: string;
  taxType: string;
  baseAmount: number;
  totalTaxAmount: number;
  totalWithTax: number;
  breakdown: TaxBreakdown[];
  metadata: Record<string, unknown>;
}

export interface IndiaTaxMetadata {
  supplyType: "intra_state" | "inter_state";
  sellerStateCode: string;
  buyerStateCode: string;
  hsnCode?: string;
}

export interface MalaysiaTaxMetadata {
  taxCategory: "sales_tax" | "service_tax" | "exempt";
  tariffCode?: string;
}

export interface USTaxMetadata {
  stateCode: string;
  countyName?: string;
  cityName?: string;
  isExempt?: boolean;
  exemptionReason?: string;
}

export interface UAETaxMetadata {
  isZeroRated?: boolean;
  isExempt?: boolean;
  isReverseCharge?: boolean;
  trn?: string;
}

export interface UKTaxMetadata {
  vatRateType: "standard" | "reduced" | "zero" | "exempt";
  isReverseCharge?: boolean;
  vatNumber?: string;
}

class TaxCalculatorService {
  async calculateTax(
    tenantId: string,
    country: string,
    baseAmount: number,
    metadata: Record<string, unknown> = {}
  ): Promise<TaxCalculationResult> {
    switch (country.toUpperCase()) {
      case "IN":
        return this.calculateIndiaGST(tenantId, baseAmount, metadata as unknown as IndiaTaxMetadata);
      case "MY":
        return this.calculateMalaysiaSST(tenantId, baseAmount, metadata as unknown as MalaysiaTaxMetadata);
      case "US":
        return this.calculateUSSalesTax(tenantId, baseAmount, metadata as unknown as USTaxMetadata);
      case "AE":
        return this.calculateUAEVAT(tenantId, baseAmount, metadata as unknown as UAETaxMetadata);
      case "GB":
        return this.calculateUKVAT(tenantId, baseAmount, metadata as unknown as UKTaxMetadata);
      default:
        return {
          country,
          taxType: "none",
          baseAmount,
          totalTaxAmount: 0,
          totalWithTax: baseAmount,
          breakdown: [],
          metadata: {},
        };
    }
  }

  async calculateIndiaGST(
    tenantId: string,
    baseAmount: number,
    metadata: IndiaTaxMetadata
  ): Promise<TaxCalculationResult> {
    const config = await db
      .select()
      .from(gstConfigurations)
      .where(eq(gstConfigurations.tenantId, tenantId))
      .limit(1);

    const gstConfig = config[0];
    const breakdown: TaxBreakdown[] = [];
    let totalTaxAmount = 0;

    if (metadata.supplyType === "intra_state") {
      const cgstRate = gstConfig ? parseFloat(gstConfig.defaultCgstRate || "9") : 9;
      const sgstRate = gstConfig ? parseFloat(gstConfig.defaultSgstRate || "9") : 9;

      const cgstAmount = this.round((baseAmount * cgstRate) / 100);
      const sgstAmount = this.round((baseAmount * sgstRate) / 100);

      breakdown.push({
        taxType: "cgst",
        taxName: "CGST",
        rate: cgstRate,
        baseAmount,
        taxAmount: cgstAmount,
      });

      breakdown.push({
        taxType: "sgst",
        taxName: "SGST",
        rate: sgstRate,
        baseAmount,
        taxAmount: sgstAmount,
      });

      totalTaxAmount = cgstAmount + sgstAmount;
    } else {
      const igstRate = gstConfig ? parseFloat(gstConfig.defaultIgstRate || "18") : 18;
      const igstAmount = this.round((baseAmount * igstRate) / 100);

      breakdown.push({
        taxType: "igst",
        taxName: "IGST",
        rate: igstRate,
        baseAmount,
        taxAmount: igstAmount,
      });

      totalTaxAmount = igstAmount;
    }

    return {
      country: "IN",
      taxType: "gst",
      baseAmount,
      totalTaxAmount,
      totalWithTax: baseAmount + totalTaxAmount,
      breakdown,
      metadata: {
        supplyType: metadata.supplyType,
        sellerStateCode: metadata.sellerStateCode,
        buyerStateCode: metadata.buyerStateCode,
        gstin: gstConfig?.gstin,
        hsnCode: metadata.hsnCode,
      },
    };
  }

  async calculateMalaysiaSST(
    tenantId: string,
    baseAmount: number,
    metadata: MalaysiaTaxMetadata
  ): Promise<TaxCalculationResult> {
    const config = await db
      .select()
      .from(malaysiaSstConfigurations)
      .where(eq(malaysiaSstConfigurations.tenantId, tenantId))
      .limit(1);

    const sstConfig = config[0];
    const breakdown: TaxBreakdown[] = [];
    let totalTaxAmount = 0;

    if (metadata.taxCategory === "exempt") {
      return {
        country: "MY",
        taxType: "sst",
        baseAmount,
        totalTaxAmount: 0,
        totalWithTax: baseAmount,
        breakdown: [],
        metadata: { taxCategory: "exempt" },
      };
    }

    if (metadata.taxCategory === "sales_tax") {
      const salesTaxRate = sstConfig
        ? parseFloat(sstConfig.defaultSalesTaxRate || "10")
        : 10;
      const salesTaxAmount = this.round((baseAmount * salesTaxRate) / 100);

      breakdown.push({
        taxType: "sales_tax",
        taxName: "Sales Tax",
        rate: salesTaxRate,
        baseAmount,
        taxAmount: salesTaxAmount,
        metadata: { tariffCode: metadata.tariffCode },
      });

      totalTaxAmount = salesTaxAmount;
    } else if (metadata.taxCategory === "service_tax") {
      const serviceTaxRate = sstConfig
        ? parseFloat(sstConfig.defaultServiceTaxRate || "6")
        : 6;
      const serviceTaxAmount = this.round((baseAmount * serviceTaxRate) / 100);

      breakdown.push({
        taxType: "service_tax",
        taxName: "Service Tax",
        rate: serviceTaxRate,
        baseAmount,
        taxAmount: serviceTaxAmount,
      });

      totalTaxAmount = serviceTaxAmount;
    }

    return {
      country: "MY",
      taxType: "sst",
      baseAmount,
      totalTaxAmount,
      totalWithTax: baseAmount + totalTaxAmount,
      breakdown,
      metadata: {
        sstNumber: sstConfig?.sstNumber,
        taxCategory: metadata.taxCategory,
        tariffCode: metadata.tariffCode,
      },
    };
  }

  async calculateUSSalesTax(
    tenantId: string,
    baseAmount: number,
    metadata: USTaxMetadata
  ): Promise<TaxCalculationResult> {
    if (metadata.isExempt) {
      return {
        country: "US",
        taxType: "sales_tax",
        baseAmount,
        totalTaxAmount: 0,
        totalWithTax: baseAmount,
        breakdown: [],
        metadata: { isExempt: true, exemptionReason: metadata.exemptionReason },
      };
    }

    const stateConfig = await db
      .select()
      .from(usStateSalesTaxConfigurations)
      .where(
        and(
          eq(usStateSalesTaxConfigurations.tenantId, tenantId),
          eq(usStateSalesTaxConfigurations.stateCode, metadata.stateCode)
        )
      )
      .limit(1);

    const config = stateConfig[0];
    const breakdown: TaxBreakdown[] = [];
    let totalTaxAmount = 0;

    if (config) {
      const stateTaxRate = parseFloat(config.stateTaxRate || "0");
      const countyTaxRate = parseFloat(config.countyTaxRate || "0");
      const cityTaxRate = parseFloat(config.cityTaxRate || "0");
      const specialDistrictRate = parseFloat(config.specialDistrictRate || "0");

      if (stateTaxRate > 0) {
        const stateAmount = this.round((baseAmount * stateTaxRate) / 100);
        breakdown.push({
          taxType: "state_tax",
          taxName: `${config.stateName || metadata.stateCode} State Tax`,
          rate: stateTaxRate,
          baseAmount,
          taxAmount: stateAmount,
        });
        totalTaxAmount += stateAmount;
      }

      if (countyTaxRate > 0) {
        const countyAmount = this.round((baseAmount * countyTaxRate) / 100);
        breakdown.push({
          taxType: "county_tax",
          taxName: `${metadata.countyName || "County"} Tax`,
          rate: countyTaxRate,
          baseAmount,
          taxAmount: countyAmount,
        });
        totalTaxAmount += countyAmount;
      }

      if (cityTaxRate > 0) {
        const cityAmount = this.round((baseAmount * cityTaxRate) / 100);
        breakdown.push({
          taxType: "city_tax",
          taxName: `${metadata.cityName || "City"} Tax`,
          rate: cityTaxRate,
          baseAmount,
          taxAmount: cityAmount,
        });
        totalTaxAmount += cityAmount;
      }

      if (specialDistrictRate > 0) {
        const specialAmount = this.round((baseAmount * specialDistrictRate) / 100);
        breakdown.push({
          taxType: "special_district_tax",
          taxName: "Special District Tax",
          rate: specialDistrictRate,
          baseAmount,
          taxAmount: specialAmount,
        });
        totalTaxAmount += specialAmount;
      }
    }

    const combinedRate = breakdown.reduce((sum, b) => sum + b.rate, 0);

    return {
      country: "US",
      taxType: "sales_tax",
      baseAmount,
      totalTaxAmount,
      totalWithTax: baseAmount + totalTaxAmount,
      breakdown,
      metadata: {
        stateCode: metadata.stateCode,
        stateTaxId: config?.stateTaxId,
        combinedRate,
      },
    };
  }

  async calculateUAEVAT(
    tenantId: string,
    baseAmount: number,
    metadata: UAETaxMetadata
  ): Promise<TaxCalculationResult> {
    if (metadata.isExempt || metadata.isZeroRated) {
      return {
        country: "AE",
        taxType: "vat",
        baseAmount,
        totalTaxAmount: 0,
        totalWithTax: baseAmount,
        breakdown: [],
        metadata: {
          isZeroRated: metadata.isZeroRated,
          isExempt: metadata.isExempt,
        },
      };
    }

    const config = await db
      .select()
      .from(uaeVatConfigurations)
      .where(eq(uaeVatConfigurations.tenantId, tenantId))
      .limit(1);

    const vatConfig = config[0];
    const vatRate = vatConfig ? parseFloat(vatConfig.defaultVatRate || "5") : 5;
    const vatAmount = this.round((baseAmount * vatRate) / 100);

    const breakdown: TaxBreakdown[] = [
      {
        taxType: "vat",
        taxName: "VAT",
        rate: vatRate,
        baseAmount,
        taxAmount: vatAmount,
        metadata: { isReverseCharge: metadata.isReverseCharge },
      },
    ];

    return {
      country: "AE",
      taxType: "vat",
      baseAmount,
      totalTaxAmount: vatAmount,
      totalWithTax: baseAmount + vatAmount,
      breakdown,
      metadata: {
        trn: vatConfig?.trn || metadata.trn,
        isReverseCharge: metadata.isReverseCharge,
      },
    };
  }

  async calculateUKVAT(
    tenantId: string,
    baseAmount: number,
    metadata: UKTaxMetadata
  ): Promise<TaxCalculationResult> {
    const vatRates: Record<string, number> = {
      standard: 20,
      reduced: 5,
      zero: 0,
      exempt: 0,
    };

    const vatRate = vatRates[metadata.vatRateType] || 20;

    if (metadata.vatRateType === "exempt" || metadata.vatRateType === "zero") {
      return {
        country: "GB",
        taxType: "vat",
        baseAmount,
        totalTaxAmount: 0,
        totalWithTax: baseAmount,
        breakdown: [],
        metadata: {
          vatRateType: metadata.vatRateType,
        },
      };
    }

    const config = await db
      .select()
      .from(ukVatConfigurations)
      .where(eq(ukVatConfigurations.tenantId, tenantId))
      .limit(1);

    const vatConfig = config[0];
    const vatAmount = this.round((baseAmount * vatRate) / 100);

    const breakdown: TaxBreakdown[] = [
      {
        taxType: "vat",
        taxName: metadata.vatRateType === "reduced" ? "VAT (Reduced)" : "VAT",
        rate: vatRate,
        baseAmount,
        taxAmount: vatAmount,
        metadata: { isReverseCharge: metadata.isReverseCharge },
      },
    ];

    return {
      country: "GB",
      taxType: "vat",
      baseAmount,
      totalTaxAmount: vatAmount,
      totalWithTax: baseAmount + vatAmount,
      breakdown,
      metadata: {
        vatNumber: vatConfig?.vatNumber || metadata.vatNumber,
        vatRateType: metadata.vatRateType,
        isReverseCharge: metadata.isReverseCharge,
      },
    };
  }

  async getTenantTaxRegistration(
    tenantId: string,
    country: string
  ): Promise<{
    registrationNumber: string | null;
    taxType: string;
    registrationName: string | null;
  }> {
    const registration = await db
      .select()
      .from(tenantTaxRegistrations)
      .where(
        and(
          eq(tenantTaxRegistrations.tenantId, tenantId),
          eq(tenantTaxRegistrations.country, country),
          eq(tenantTaxRegistrations.isActive, true)
        )
      )
      .limit(1);

    if (registration.length === 0) {
      return { registrationNumber: null, taxType: "none", registrationName: null };
    }

    return {
      registrationNumber: registration[0].registrationNumber,
      taxType: registration[0].taxType,
      registrationName: registration[0].registrationName,
    };
  }

  async logTaxCalculation(
    tenantId: string,
    invoiceId: string,
    calculation: TaxCalculationResult,
    currency: string
  ): Promise<void> {
    for (const item of calculation.breakdown) {
      await db.insert(taxCalculationLogs).values({
        tenantId,
        invoiceId,
        country: calculation.country as any,
        businessType: "furniture" as any,
        taxName: item.taxName,
        taxRate: item.rate.toFixed(2),
        baseAmount: item.baseAmount.toFixed(2),
        taxAmount: item.taxAmount.toFixed(2),
        currency: currency as any,
        calculationDetails: {
          taxType: item.taxType,
          metadata: calculation.metadata,
        },
      });
    }
  }

  private round(amount: number): number {
    return Math.round(amount * 100) / 100;
  }
}

export const taxCalculatorService = new TaxCalculatorService();
