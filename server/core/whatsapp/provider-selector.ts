import { db } from "../../db";
import { whatsappProviderConfigs } from "@shared/schema";
import { eq } from "drizzle-orm";
import type { WhatsappProvider, WhatsappProviderType, TenantCountry, SupportedCountry, CountryProviderMapping, ProviderConfig } from "./types";
import { GupshupAdapter, MetaWhatsappAdapter, TwilioWhatsappAdapter } from "./adapters";

class WhatsappProviderSelector {
  private providers: Map<WhatsappProviderType, WhatsappProvider> = new Map();
  private countryMappings: Map<SupportedCountry, CountryProviderMapping> = new Map();
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;

    await this.initializeProviders();
    await this.loadCountryMappings();
    this.initialized = true;
  }

  private async initializeProviders(): Promise<void> {
    const gupshupAdapter = new GupshupAdapter();
    await gupshupAdapter.initialize({
      apiKey: process.env.GUPSHUP_API_KEY || "",
      phoneNumberId: process.env.GUPSHUP_PHONE_NUMBER || "",
      webhookSecret: process.env.GUPSHUP_WEBHOOK_SECRET || "",
      additionalConfig: {
        appName: process.env.GUPSHUP_APP_NAME || "BizFlow",
      },
    });
    this.providers.set("gupshup", gupshupAdapter);

    const metaAdapter = new MetaWhatsappAdapter();
    await metaAdapter.initialize({
      apiKey: process.env.META_WHATSAPP_ACCESS_TOKEN || "",
      phoneNumberId: process.env.META_WHATSAPP_PHONE_NUMBER_ID || "",
      businessAccountId: process.env.META_WHATSAPP_BUSINESS_ACCOUNT_ID || "",
      webhookSecret: process.env.META_WHATSAPP_WEBHOOK_SECRET || "",
    });
    this.providers.set("meta", metaAdapter);

    const twilioAdapter = new TwilioWhatsappAdapter();
    await twilioAdapter.initialize({
      apiKey: process.env.TWILIO_ACCOUNT_SID || "",
      apiSecret: process.env.TWILIO_AUTH_TOKEN || "",
      phoneNumberId: process.env.TWILIO_WHATSAPP_NUMBER || "",
      webhookSecret: process.env.TWILIO_WEBHOOK_SECRET || "",
      additionalConfig: {
        webhookUrl: process.env.TWILIO_WEBHOOK_URL || "",
      },
    });
    this.providers.set("twilio", twilioAdapter);
  }

  private async loadCountryMappings(): Promise<void> {
    try {
      const configs = await db.select().from(whatsappProviderConfigs);
      const supportedCountries: SupportedCountry[] = ["india", "uae", "uk", "malaysia", "singapore"];
      
      for (const config of configs) {
        if (supportedCountries.includes(config.country as SupportedCountry)) {
          this.countryMappings.set(config.country as SupportedCountry, {
            country: config.country as SupportedCountry,
            primaryProvider: config.primaryProvider as WhatsappProviderType,
            fallbackProvider: config.fallbackProvider as WhatsappProviderType | undefined,
            businessPhoneNumber: config.businessPhoneNumber || undefined,
            monthlyQuota: config.monthlyQuota || 10000,
          });
        }
      }
    } catch (error) {
      console.error("Failed to load WhatsApp country mappings from database, using defaults:", error);
      this.loadDefaultMappings();
    }
  }

  private loadDefaultMappings(): void {
    const defaults: CountryProviderMapping[] = [
      { country: "india", primaryProvider: "gupshup", fallbackProvider: "twilio", monthlyQuota: 10000 },
      { country: "uae", primaryProvider: "meta", fallbackProvider: "twilio", monthlyQuota: 10000 },
      { country: "uk", primaryProvider: "meta", fallbackProvider: "twilio", monthlyQuota: 10000 },
      { country: "malaysia", primaryProvider: "meta", fallbackProvider: "twilio", monthlyQuota: 10000 },
      { country: "singapore", primaryProvider: "meta", fallbackProvider: "twilio", monthlyQuota: 10000 },
    ];

    for (const mapping of defaults) {
      this.countryMappings.set(mapping.country, mapping);
    }
  }

  getProvider(type: WhatsappProviderType): WhatsappProvider | undefined {
    return this.providers.get(type);
  }

  private isSupportedCountry(country: string): country is SupportedCountry {
    const supported: SupportedCountry[] = ["india", "uae", "uk", "malaysia", "singapore"];
    return supported.includes(country as SupportedCountry);
  }

  getProviderForCountry(country: TenantCountry | undefined): WhatsappProvider | undefined {
    if (!country || country === "other") {
      console.warn("No supported country specified, using Twilio as fallback provider");
      return this.providers.get("twilio");
    }
    
    if (!this.isSupportedCountry(country)) {
      console.warn(`Unsupported country: ${country}, using Twilio as fallback`);
      return this.providers.get("twilio");
    }
    
    const mapping = this.countryMappings.get(country);
    if (!mapping) {
      console.warn(`No WhatsApp provider mapping found for country: ${country}, using Twilio as default`);
      return this.providers.get("twilio");
    }

    const primaryProvider = this.providers.get(mapping.primaryProvider);
    if (primaryProvider?.isConfigured()) {
      return primaryProvider;
    }

    if (mapping.fallbackProvider) {
      const fallbackProvider = this.providers.get(mapping.fallbackProvider);
      if (fallbackProvider?.isConfigured()) {
        console.warn(`Primary WhatsApp provider ${mapping.primaryProvider} not configured for ${country}, using fallback ${mapping.fallbackProvider}`);
        return fallbackProvider;
      }
    }

    const twilioProvider = this.providers.get("twilio");
    if (twilioProvider?.isConfigured()) {
      console.warn(`No configured WhatsApp provider for ${country}, falling back to Twilio`);
      return twilioProvider;
    }

    console.error(`No configured WhatsApp provider available for country: ${country}`);
    return undefined;
  }

  getCountryConfig(country: SupportedCountry): CountryProviderMapping | undefined {
    return this.countryMappings.get(country);
  }

  getAllCountryConfigs(): CountryProviderMapping[] {
    return Array.from(this.countryMappings.values());
  }

  getAllProviders(): WhatsappProvider[] {
    return Array.from(this.providers.values());
  }

  async reloadCountryMappings(): Promise<void> {
    await this.loadCountryMappings();
  }

  async checkAllProvidersHealth(): Promise<Map<WhatsappProviderType, { healthy: boolean; latencyMs: number; errorMessage?: string }>> {
    const results = new Map<WhatsappProviderType, { healthy: boolean; latencyMs: number; errorMessage?: string }>();
    
    const entries = Array.from(this.providers.entries());
    for (const [type, provider] of entries) {
      if (provider.isConfigured()) {
        const health = await provider.healthCheck();
        results.set(type, health);
      } else {
        results.set(type, { healthy: false, latencyMs: 0, errorMessage: "Not configured" });
      }
    }

    return results;
  }
}

export const whatsappProviderSelector = new WhatsappProviderSelector();

export async function initializeWhatsappProviders(): Promise<void> {
  await whatsappProviderSelector.initialize();
  console.log("WhatsApp providers initialized");
}
