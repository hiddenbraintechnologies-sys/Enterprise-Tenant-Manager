import { db } from "../../db";
import { countryPricingConfigs } from "@shared/schema";
import { eq } from "drizzle-orm";
import type { PaymentGateway, PaymentGatewayType, TenantCountry, CountryGatewayMapping, GatewayConfig } from "./types";
import { StripeAdapter, RazorpayAdapter, PayTabsAdapter, BillplzAdapter } from "./adapters";

class GatewaySelector {
  private gateways: Map<PaymentGatewayType, PaymentGateway> = new Map();
  private countryMappings: Map<TenantCountry, CountryGatewayMapping> = new Map();
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;

    await this.initializeGateways();
    await this.loadCountryMappings();
    this.initialized = true;
  }

  private async initializeGateways(): Promise<void> {
    const stripeAdapter = new StripeAdapter();
    await stripeAdapter.initialize({
      apiKey: process.env.STRIPE_SECRET_KEY || "",
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || "",
    });
    this.gateways.set("stripe", stripeAdapter);

    const razorpayAdapter = new RazorpayAdapter();
    await razorpayAdapter.initialize({
      apiKey: process.env.RAZORPAY_KEY_ID || "",
      secretKey: process.env.RAZORPAY_KEY_SECRET || "",
      webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || "",
    });
    this.gateways.set("razorpay", razorpayAdapter);

    const paytabsAdapter = new PayTabsAdapter();
    await paytabsAdapter.initialize({
      apiKey: process.env.PAYTABS_SERVER_KEY || "",
      merchantId: process.env.PAYTABS_PROFILE_ID || "",
      webhookSecret: process.env.PAYTABS_WEBHOOK_SECRET || "",
      sandbox: process.env.NODE_ENV !== "production",
    });
    this.gateways.set("paytabs", paytabsAdapter);

    const billplzAdapter = new BillplzAdapter();
    await billplzAdapter.initialize({
      apiKey: process.env.BILLPLZ_API_KEY || "",
      merchantId: process.env.BILLPLZ_COLLECTION_ID || "",
      webhookSecret: process.env.BILLPLZ_WEBHOOK_SECRET || "",
      sandbox: process.env.NODE_ENV !== "production",
    });
    this.gateways.set("billplz", billplzAdapter);
  }

  private async loadCountryMappings(): Promise<void> {
    try {
      const configs = await db.select().from(countryPricingConfigs);
      
      for (const config of configs) {
        this.countryMappings.set(config.country as TenantCountry, {
          country: config.country as TenantCountry,
          primaryGateway: config.primaryGateway as PaymentGatewayType,
          fallbackGateway: config.fallbackGateway as PaymentGatewayType | undefined,
          currency: config.currency as any,
          taxName: config.taxName,
          taxRate: parseFloat(config.taxRate),
        });
      }
    } catch (error) {
      console.error("Failed to load country mappings from database, using defaults:", error);
      this.loadDefaultMappings();
    }
  }

  private loadDefaultMappings(): void {
    const defaults: CountryGatewayMapping[] = [
      { country: "india", primaryGateway: "razorpay", fallbackGateway: "stripe", currency: "INR", taxName: "GST", taxRate: 18 },
      { country: "uae", primaryGateway: "paytabs", fallbackGateway: "stripe", currency: "AED", taxName: "VAT", taxRate: 5 },
      { country: "uk", primaryGateway: "stripe", currency: "GBP", taxName: "VAT", taxRate: 20 },
      { country: "malaysia", primaryGateway: "billplz", fallbackGateway: "stripe", currency: "MYR", taxName: "SST", taxRate: 6 },
      { country: "singapore", primaryGateway: "stripe", currency: "SGD", taxName: "GST", taxRate: 9 },
    ];

    for (const mapping of defaults) {
      this.countryMappings.set(mapping.country, mapping);
    }
  }

  getGateway(type: PaymentGatewayType): PaymentGateway | undefined {
    return this.gateways.get(type);
  }

  getGatewayForCountry(country: TenantCountry): PaymentGateway | undefined {
    const mapping = this.countryMappings.get(country);
    if (!mapping) {
      console.warn(`No gateway mapping found for country: ${country}, using Stripe as default`);
      return this.gateways.get("stripe");
    }

    const primaryGateway = this.gateways.get(mapping.primaryGateway);
    if (primaryGateway?.isConfigured()) {
      return primaryGateway;
    }

    if (mapping.fallbackGateway) {
      const fallbackGateway = this.gateways.get(mapping.fallbackGateway);
      if (fallbackGateway?.isConfigured()) {
        console.warn(`Primary gateway ${mapping.primaryGateway} not configured for ${country}, using fallback ${mapping.fallbackGateway}`);
        return fallbackGateway;
      }
    }

    const stripeGateway = this.gateways.get("stripe");
    if (stripeGateway?.isConfigured()) {
      console.warn(`No configured gateway for ${country}, falling back to Stripe`);
      return stripeGateway;
    }

    console.error(`No configured payment gateway available for country: ${country}`);
    return undefined;
  }

  getCountryConfig(country: TenantCountry): CountryGatewayMapping | undefined {
    return this.countryMappings.get(country);
  }

  getAllCountryConfigs(): CountryGatewayMapping[] {
    return Array.from(this.countryMappings.values());
  }

  async reloadCountryMappings(): Promise<void> {
    await this.loadCountryMappings();
  }
}

export const gatewaySelector = new GatewaySelector();

export async function initializePaymentGateways(): Promise<void> {
  await gatewaySelector.initialize();
  console.log("Payment gateways initialized");
}
