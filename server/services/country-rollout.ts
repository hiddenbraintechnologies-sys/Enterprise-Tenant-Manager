import { db } from "../db";
import { 
  platformRegionConfigs, 
  countryRolloutPolicy,
  type PlatformRegionConfig,
  type CountryRolloutPolicy
} from "@shared/schema";
import { eq } from "drizzle-orm";

export interface CountryConfig {
  countryCode: string;
  countryName: string;
  status: "enabled" | "disabled" | "maintenance" | "coming_soon";
  rolloutStatus: "coming_soon" | "beta" | "live";
  isSignupEnabled: boolean;
  isBillingEnabled: boolean;
  defaultCurrency: string;
  enabledBusinessTypes: string[];
  enabledModules: string[];
  disabledFeatures: string[];
  enabledAddons: string[];
  enabledPlans: string[];
  payrollStatus: "disabled" | "beta" | "live";
  payrollCohortTenantIds: number[];
  payrollDisclaimerText?: string;
}

export interface PayrollAccessResult {
  allowed: boolean;
  code?: "COUNTRY_PAYROLL_DISABLED" | "TENANT_NOT_IN_COHORT";
  message?: string;
  disclaimerText?: string;
  isBeta?: boolean;
}

export interface RolloutValidationResult {
  allowed: boolean;
  code?: "COUNTRY_NOT_AVAILABLE" | "COUNTRY_SIGNUP_DISABLED" | "BUSINESS_NOT_AVAILABLE_IN_COUNTRY" | "COUNTRY_BILLING_DISABLED";
  message?: string;
}

class CountryRolloutService {
  private cache: Map<string, { config: CountryConfig; expiry: number }> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  async getCountryConfig(countryCode: string): Promise<CountryConfig | null> {
    const normalizedCode = countryCode.toUpperCase();
    
    // Check cache
    const cached = this.cache.get(normalizedCode);
    if (cached && cached.expiry > Date.now()) {
      return cached.config;
    }

    // Fetch from database
    const [regionConfig] = await db
      .select()
      .from(platformRegionConfigs)
      .where(eq(platformRegionConfigs.countryCode, normalizedCode))
      .limit(1);

    if (!regionConfig) {
      return null;
    }

    const [rolloutPolicy] = await db
      .select()
      .from(countryRolloutPolicy)
      .where(eq(countryRolloutPolicy.countryCode, normalizedCode))
      .limit(1);

    const config: CountryConfig = {
      countryCode: regionConfig.countryCode,
      countryName: regionConfig.countryName,
      status: regionConfig.status,
      rolloutStatus: rolloutPolicy?.status || "coming_soon",
      isSignupEnabled: regionConfig.registrationEnabled,
      isBillingEnabled: regionConfig.billingEnabled,
      defaultCurrency: regionConfig.defaultCurrency,
      enabledBusinessTypes: rolloutPolicy?.enabledBusinessTypes || (regionConfig.allowedBusinessTypes as string[]) || [],
      enabledModules: rolloutPolicy?.enabledModules || [],
      disabledFeatures: rolloutPolicy?.disabledFeatures || [],
      enabledAddons: rolloutPolicy?.enabledAddons || [],
      enabledPlans: rolloutPolicy?.enabledPlans || [],
      payrollStatus: rolloutPolicy?.payrollStatus || "disabled",
      payrollCohortTenantIds: (rolloutPolicy?.payrollCohortTenantIds as unknown as number[]) || [],
      payrollDisclaimerText: rolloutPolicy?.payrollDisclaimerText || undefined,
    };

    // Cache the result
    this.cache.set(normalizedCode, {
      config,
      expiry: Date.now() + this.CACHE_TTL,
    });

    return config;
  }

  async getCountryPolicy(countryCode: string): Promise<CountryRolloutPolicy | null> {
    const [policy] = await db
      .select()
      .from(countryRolloutPolicy)
      .where(eq(countryRolloutPolicy.countryCode, countryCode.toUpperCase()))
      .limit(1);
    return policy || null;
  }

  async isBusinessTypeAllowed(countryCode: string, businessType: string): Promise<RolloutValidationResult> {
    const config = await this.getCountryConfig(countryCode);
    
    if (!config) {
      return {
        allowed: false,
        code: "COUNTRY_NOT_AVAILABLE",
        message: "This country is not available on our platform.",
      };
    }

    // Check country status - "enabled" maps to "live", "coming_soon" maps to "beta"
    // Only allow signup for enabled (live) or coming_soon (beta) status
    if (config.status === "disabled" || config.status === "maintenance") {
      return {
        allowed: false,
        code: "COUNTRY_NOT_AVAILABLE",
        message: config.status === "maintenance" 
          ? "This country is currently under maintenance."
          : "This country is currently not available.",
      };
    }

    // Check signup enabled
    if (!config.isSignupEnabled) {
      return {
        allowed: false,
        code: "COUNTRY_SIGNUP_DISABLED",
        message: "Registration is currently disabled for this country.",
      };
    }

    // Check rollout policy for enabled business types
    const rolloutPolicy = await this.getCountryPolicy(countryCode);
    const enabledBusinessTypes = rolloutPolicy?.enabledBusinessTypes || config.enabledBusinessTypes || [];

    // If enabledBusinessTypes is empty, all business types are allowed
    if (enabledBusinessTypes.length > 0) {
      if (!enabledBusinessTypes.includes(businessType)) {
        return {
          allowed: false,
          code: "BUSINESS_NOT_AVAILABLE_IN_COUNTRY",
          message: `The business type "${businessType}" is not available in ${config.countryName}.`,
        };
      }
    }

    return { allowed: true };
  }

  async isFeatureBlockedByCountry(countryCode: string, featureKey: string): Promise<boolean> {
    const config = await this.getCountryConfig(countryCode);
    if (!config) return false;
    return config.disabledFeatures.includes(featureKey);
  }

  async getAvailablePlans(countryCode: string): Promise<string[]> {
    const config = await this.getCountryConfig(countryCode);
    return config?.enabledPlans || [];
  }

  async getAvailableAddons(countryCode: string): Promise<string[]> {
    const config = await this.getCountryConfig(countryCode);
    return config?.enabledAddons || [];
  }

  async getEffectiveFeatures(
    countryCode: string,
    planFeatures: Record<string, boolean>
  ): Promise<Record<string, boolean>> {
    const config = await this.getCountryConfig(countryCode);
    if (!config) return planFeatures;

    const effectiveFeatures = { ...planFeatures };
    
    // Remove any features that are blocked at country level
    for (const feature of config.disabledFeatures) {
      effectiveFeatures[feature] = false;
    }

    return effectiveFeatures;
  }

  async validateSignup(
    countryCode: string,
    businessType: string
  ): Promise<RolloutValidationResult> {
    return this.isBusinessTypeAllowed(countryCode, businessType);
  }

  async validateBilling(countryCode: string): Promise<RolloutValidationResult> {
    const config = await this.getCountryConfig(countryCode);
    
    if (!config) {
      return {
        allowed: false,
        code: "COUNTRY_NOT_AVAILABLE",
        message: "This country is not available on our platform.",
      };
    }

    if (!config.isBillingEnabled) {
      return {
        allowed: false,
        code: "COUNTRY_BILLING_DISABLED",
        message: "Billing is currently disabled for this country.",
      };
    }

    return { allowed: true };
  }

  async getAllCountries(): Promise<PlatformRegionConfig[]> {
    return db.select().from(platformRegionConfigs);
  }

  async updateRolloutPolicy(
    countryCode: string,
    updates: Partial<CountryRolloutPolicy>,
    updatedBy: string
  ): Promise<CountryRolloutPolicy> {
    const normalizedCode = countryCode.toUpperCase();

    // Check if policy exists
    const existing = await this.getCountryPolicy(normalizedCode);

    if (existing) {
      const [updated] = await db
        .update(countryRolloutPolicy)
        .set({
          ...updates,
          updatedBy,
          updatedAt: new Date(),
        })
        .where(eq(countryRolloutPolicy.countryCode, normalizedCode))
        .returning();
      
      // Invalidate cache
      this.cache.delete(normalizedCode);
      
      return updated;
    } else {
      const [created] = await db
        .insert(countryRolloutPolicy)
        .values({
          countryCode: normalizedCode,
          enabledBusinessTypes: updates.enabledBusinessTypes || [],
          disabledFeatures: updates.disabledFeatures || [],
          enabledAddons: updates.enabledAddons || [],
          enabledPlans: updates.enabledPlans || [],
          notes: updates.notes,
          updatedBy,
        })
        .returning();
      
      return created;
    }
  }

  async checkPayrollAccess(countryCode: string, tenantId: string | number): Promise<PayrollAccessResult> {
    const config = await this.getCountryConfig(countryCode);
    
    if (!config) {
      return {
        allowed: false,
        code: "COUNTRY_PAYROLL_DISABLED",
        message: "Payroll is not available for this country.",
      };
    }

    // Check payroll status
    if (config.payrollStatus === "disabled") {
      return {
        allowed: false,
        code: "COUNTRY_PAYROLL_DISABLED",
        message: `Payroll is currently disabled for ${config.countryName}.`,
      };
    }

    // For beta status, check if tenant is in the cohort
    if (config.payrollStatus === "beta") {
      const cohort = config.payrollCohortTenantIds || [];
      // Normalize tenantId to number for comparison
      const tenantIdNum = typeof tenantId === "string" ? parseInt(tenantId, 10) : tenantId;
      // If cohort is empty, all tenants can access beta
      if (cohort.length > 0 && !cohort.includes(tenantIdNum)) {
        return {
          allowed: false,
          code: "TENANT_NOT_IN_COHORT",
          message: `Payroll is in beta for ${config.countryName}. Your account is not yet included.`,
        };
      }

      return {
        allowed: true,
        isBeta: true,
        disclaimerText: config.payrollDisclaimerText,
      };
    }

    // For live status, all tenants can access
    return {
      allowed: true,
      isBeta: false,
      disclaimerText: config.payrollDisclaimerText,
    };
  }

  async getPayrollStatus(countryCode: string): Promise<{ status: string; disclaimer?: string }> {
    const config = await this.getCountryConfig(countryCode);
    return {
      status: config?.payrollStatus || "disabled",
      disclaimer: config?.payrollDisclaimerText,
    };
  }

  clearCache(): void {
    this.cache.clear();
  }
}

export const countryRolloutService = new CountryRolloutService();
