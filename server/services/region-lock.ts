import { db } from "../db";
import { 
  platformRegionConfigs, 
  regionAccessLogs,
  compliancePacks,
  type PlatformRegionConfig,
  type InsertPlatformRegionConfig,
  type InsertRegionAccessLog,
} from "@shared/schema";
import { eq, and, inArray } from "drizzle-orm";
import { cacheService } from "./cache";

const REGION_CACHE_PREFIX = "region:config:";
const REGION_CACHE_TTL = 300; // 5 minutes

export interface RegionValidationResult {
  allowed: boolean;
  reason?: string;
  region?: PlatformRegionConfig;
}

export interface RegionCheckContext {
  countryCode: string;
  action: "registration" | "billing" | "compliance" | "access";
  tenantId?: string;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  businessType?: string;
  subscriptionTier?: string;
  betaCode?: string;
}

class RegionLockService {
  
  /**
   * Get region config by country code (with caching)
   */
  async getRegionConfig(countryCode: string): Promise<PlatformRegionConfig | null> {
    const cacheKey = `${REGION_CACHE_PREFIX}${countryCode.toLowerCase()}`;
    
    // Try cache first
    const cached = await cacheService.get<PlatformRegionConfig>(cacheKey);
    if (cached) {
      return cached;
    }
    
    // Fetch from database
    const [config] = await db
      .select()
      .from(platformRegionConfigs)
      .where(eq(platformRegionConfigs.countryCode, countryCode.toUpperCase()))
      .limit(1);
    
    if (config) {
      await cacheService.set(cacheKey, config, REGION_CACHE_TTL);
    }
    
    return config || null;
  }
  
  /**
   * Get all region configs
   */
  async getAllRegions(): Promise<PlatformRegionConfig[]> {
    return db.select().from(platformRegionConfigs);
  }
  
  /**
   * Get enabled regions only
   */
  async getEnabledRegions(): Promise<PlatformRegionConfig[]> {
    return db
      .select()
      .from(platformRegionConfigs)
      .where(eq(platformRegionConfigs.status, "enabled"));
  }
  
  /**
   * Check if registration is allowed for a country
   */
  async canRegister(context: RegionCheckContext): Promise<RegionValidationResult> {
    const config = await this.getRegionConfig(context.countryCode);
    
    if (!config) {
      await this.logAccess({
        countryCode: context.countryCode,
        action: "registration_attempt",
        result: "blocked",
        tenantId: context.tenantId,
        userId: context.userId,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        reason: "Region not configured",
      });
      
      return {
        allowed: false,
        reason: "This region is not available for registration",
      };
    }
    
    // Check if region is enabled
    if (config.status === "disabled") {
      await this.logAccess({
        countryCode: context.countryCode,
        action: "registration_attempt",
        result: "blocked",
        reason: "Region is disabled",
        ipAddress: context.ipAddress,
      });
      
      return {
        allowed: false,
        reason: "Registration is currently not available in this region",
        region: config,
      };
    }
    
    // Check if region is in maintenance
    if (config.status === "maintenance") {
      const now = new Date();
      const inMaintenance = config.maintenanceStartAt && config.maintenanceEndAt &&
        now >= config.maintenanceStartAt && now <= config.maintenanceEndAt;
      
      if (inMaintenance) {
        await this.logAccess({
          countryCode: context.countryCode,
          action: "registration_attempt",
          result: "blocked",
          reason: "Region in maintenance",
          ipAddress: context.ipAddress,
        });
        
        return {
          allowed: false,
          reason: config.maintenanceMessage || "Registration is temporarily unavailable due to maintenance",
          region: config,
        };
      }
    }
    
    // Check if coming soon
    if (config.status === "coming_soon") {
      await this.logAccess({
        countryCode: context.countryCode,
        action: "registration_attempt",
        result: "blocked",
        reason: "Region coming soon",
        ipAddress: context.ipAddress,
      });
      
      return {
        allowed: false,
        reason: "This region is coming soon. Please check back later.",
        region: config,
      };
    }
    
    // Check registration enabled flag
    if (!config.registrationEnabled) {
      await this.logAccess({
        countryCode: context.countryCode,
        action: "registration_attempt",
        result: "blocked",
        reason: "Registration disabled for region",
        ipAddress: context.ipAddress,
      });
      
      return {
        allowed: false,
        reason: "New registrations are currently paused in this region",
        region: config,
      };
    }
    
    // Check beta access if required
    if (config.betaAccessOnly) {
      const betaCodes = (config.betaAccessCodes as string[]) || [];
      if (!context.betaCode || !betaCodes.includes(context.betaCode)) {
        await this.logAccess({
          countryCode: context.countryCode,
          action: "registration_attempt",
          result: "blocked",
          reason: "Beta access required",
          ipAddress: context.ipAddress,
        });
        
        return {
          allowed: false,
          reason: "This region is in beta. Please provide a valid beta access code.",
          region: config,
        };
      }
    }
    
    // Check business type restrictions
    if (context.businessType && config.allowedBusinessTypes) {
      const allowed = config.allowedBusinessTypes as string[];
      if (!allowed.includes(context.businessType)) {
        await this.logAccess({
          countryCode: context.countryCode,
          action: "registration_attempt",
          result: "blocked",
          reason: `Business type ${context.businessType} not allowed`,
          ipAddress: context.ipAddress,
        });
        
        return {
          allowed: false,
          reason: `The business type "${context.businessType}" is not available in this region`,
          region: config,
        };
      }
    }
    
    // All checks passed
    await this.logAccess({
      countryCode: context.countryCode,
      action: "registration_attempt",
      result: "allowed",
      userId: context.userId,
      ipAddress: context.ipAddress,
    });
    
    return {
      allowed: true,
      region: config,
    };
  }
  
  /**
   * Check if billing is allowed for a country
   */
  async canBill(context: RegionCheckContext): Promise<RegionValidationResult> {
    const config = await this.getRegionConfig(context.countryCode);
    
    if (!config) {
      await this.logAccess({
        countryCode: context.countryCode,
        action: "billing_attempt",
        result: "blocked",
        tenantId: context.tenantId,
        reason: "Region not configured",
      });
      
      return {
        allowed: false,
        reason: "Billing is not available in this region",
      };
    }
    
    if (config.status !== "enabled") {
      await this.logAccess({
        countryCode: context.countryCode,
        action: "billing_attempt",
        result: "blocked",
        tenantId: context.tenantId,
        reason: `Region status: ${config.status}`,
      });
      
      return {
        allowed: false,
        reason: "Billing is temporarily unavailable in this region",
        region: config,
      };
    }
    
    if (!config.billingEnabled) {
      await this.logAccess({
        countryCode: context.countryCode,
        action: "billing_attempt",
        result: "blocked",
        tenantId: context.tenantId,
        reason: "Billing disabled for region",
      });
      
      return {
        allowed: false,
        reason: "Billing is currently disabled in this region",
        region: config,
      };
    }
    
    // Check subscription tier restrictions
    if (context.subscriptionTier && config.allowedSubscriptionTiers) {
      const allowed = config.allowedSubscriptionTiers as string[];
      if (!allowed.includes(context.subscriptionTier)) {
        await this.logAccess({
          countryCode: context.countryCode,
          action: "billing_attempt",
          result: "blocked",
          tenantId: context.tenantId,
          reason: `Tier ${context.subscriptionTier} not allowed`,
        });
        
        return {
          allowed: false,
          reason: `The "${context.subscriptionTier}" plan is not available in this region`,
          region: config,
        };
      }
    }
    
    await this.logAccess({
      countryCode: context.countryCode,
      action: "billing_attempt",
      result: "allowed",
      tenantId: context.tenantId,
    });
    
    return {
      allowed: true,
      region: config,
    };
  }
  
  /**
   * Get compliance packs for a region
   */
  async getRegionCompliancePacks(countryCode: string): Promise<string[]> {
    const config = await this.getRegionConfig(countryCode);
    
    if (!config || !config.compliancePacksEnabled) {
      return [];
    }
    
    const requiredPacks = (config.requiredCompliancePacks as string[]) || [];
    
    // Verify packs exist
    if (requiredPacks.length === 0) {
      return [];
    }
    
    const existingPacks = await db
      .select({ code: compliancePacks.code })
      .from(compliancePacks)
      .where(
        and(
          inArray(compliancePacks.code, requiredPacks),
          eq(compliancePacks.isActive, true)
        )
      );
    
    return existingPacks.map(p => p.code);
  }
  
  /**
   * Create or update a region config (SuperAdmin only)
   */
  async upsertRegion(
    config: InsertPlatformRegionConfig,
    adminId: string
  ): Promise<PlatformRegionConfig> {
    const existing = await this.getRegionConfig(config.countryCode);
    
    if (existing) {
      const [updated] = await db
        .update(platformRegionConfigs)
        .set({
          ...config,
          updatedBy: adminId,
          updatedAt: new Date(),
        })
        .where(eq(platformRegionConfigs.countryCode, config.countryCode.toUpperCase()))
        .returning();
      
      // Invalidate cache
      await cacheService.delete(`${REGION_CACHE_PREFIX}${config.countryCode.toLowerCase()}`);
      
      return updated;
    }
    
    const [created] = await db
      .insert(platformRegionConfigs)
      .values({
        ...config,
        countryCode: config.countryCode.toUpperCase(),
        createdBy: adminId,
        updatedBy: adminId,
      })
      .returning();
    
    return created;
  }
  
  /**
   * Update region status (enable/disable/maintenance)
   */
  async updateRegionStatus(
    countryCode: string,
    status: "enabled" | "disabled" | "maintenance" | "coming_soon",
    adminId: string,
    maintenanceMessage?: string
  ): Promise<PlatformRegionConfig | null> {
    const [updated] = await db
      .update(platformRegionConfigs)
      .set({
        status,
        maintenanceMessage: status === "maintenance" ? maintenanceMessage : null,
        updatedBy: adminId,
        updatedAt: new Date(),
      })
      .where(eq(platformRegionConfigs.countryCode, countryCode.toUpperCase()))
      .returning();
    
    // Invalidate cache
    await cacheService.delete(`${REGION_CACHE_PREFIX}${countryCode.toLowerCase()}`);
    
    return updated || null;
  }
  
  /**
   * Toggle specific feature for a region
   */
  async toggleRegionFeature(
    countryCode: string,
    feature: "registration" | "billing" | "compliance" | "sms" | "whatsapp" | "email",
    enabled: boolean,
    adminId: string
  ): Promise<PlatformRegionConfig | null> {
    const fieldMap: Record<string, string> = {
      registration: "registrationEnabled",
      billing: "billingEnabled",
      compliance: "compliancePacksEnabled",
      sms: "smsEnabled",
      whatsapp: "whatsappEnabled",
      email: "emailEnabled",
    };
    
    const field = fieldMap[feature];
    if (!field) {
      throw new Error(`Invalid feature: ${feature}`);
    }
    
    const [updated] = await db
      .update(platformRegionConfigs)
      .set({
        [field]: enabled,
        updatedBy: adminId,
        updatedAt: new Date(),
      })
      .where(eq(platformRegionConfigs.countryCode, countryCode.toUpperCase()))
      .returning();
    
    // Invalidate cache
    await cacheService.delete(`${REGION_CACHE_PREFIX}${countryCode.toLowerCase()}`);
    
    return updated || null;
  }
  
  /**
   * Log region access attempt
   */
  private async logAccess(log: InsertRegionAccessLog): Promise<void> {
    try {
      await db.insert(regionAccessLogs).values(log);
    } catch (error) {
      console.error("Failed to log region access:", error);
    }
  }
  
  /**
   * Get region access logs (for audit)
   */
  async getAccessLogs(
    countryCode?: string,
    action?: string,
    limit = 100
  ): Promise<typeof regionAccessLogs.$inferSelect[]> {
    let query = db.select().from(regionAccessLogs);
    
    const conditions = [];
    if (countryCode) {
      conditions.push(eq(regionAccessLogs.countryCode, countryCode.toUpperCase()));
    }
    if (action) {
      conditions.push(eq(regionAccessLogs.action, action));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as typeof query;
    }
    
    return query.limit(limit);
  }
  
  /**
   * Seed default region configs
   */
  async seedDefaultRegions(): Promise<void> {
    const defaults: InsertPlatformRegionConfig[] = [
      {
        countryCode: "IN",
        countryName: "India",
        region: "asia_pacific",
        status: "enabled",
        registrationEnabled: true,
        billingEnabled: true,
        compliancePacksEnabled: true,
        defaultCurrency: "INR",
        defaultTimezone: "Asia/Kolkata",
        requiredCompliancePacks: ["dpdp_basic"],
        taxType: "GST",
        taxRate: "18.00",
        taxInclusive: false,
        smsEnabled: true,
        whatsappEnabled: true,
        emailEnabled: true,
      },
      {
        countryCode: "AE",
        countryName: "United Arab Emirates",
        region: "middle_east",
        status: "enabled",
        registrationEnabled: true,
        billingEnabled: true,
        compliancePacksEnabled: true,
        defaultCurrency: "AED",
        defaultTimezone: "Asia/Dubai",
        requiredCompliancePacks: ["uae_data_protection"],
        taxType: "VAT",
        taxRate: "5.00",
        taxInclusive: false,
        smsEnabled: true,
        whatsappEnabled: true,
        emailEnabled: true,
      },
      {
        countryCode: "GB",
        countryName: "United Kingdom",
        region: "europe",
        status: "enabled",
        registrationEnabled: true,
        billingEnabled: true,
        compliancePacksEnabled: true,
        defaultCurrency: "GBP",
        defaultTimezone: "Europe/London",
        requiredCompliancePacks: ["gdpr_basic", "uk_data_protection"],
        dataResidencyRequired: true,
        dataResidencyRegion: "eu-west-2",
        taxType: "VAT",
        taxRate: "20.00",
        taxInclusive: true,
        smsEnabled: true,
        whatsappEnabled: true,
        emailEnabled: true,
      },
      {
        countryCode: "SG",
        countryName: "Singapore",
        region: "asia_pacific",
        status: "coming_soon",
        registrationEnabled: false,
        billingEnabled: false,
        compliancePacksEnabled: true,
        defaultCurrency: "SGD",
        defaultTimezone: "Asia/Singapore",
        requiredCompliancePacks: ["pdpa_basic"],
        taxType: "GST",
        taxRate: "9.00",
        taxInclusive: false,
      },
      {
        countryCode: "MY",
        countryName: "Malaysia",
        region: "asia_pacific",
        status: "coming_soon",
        registrationEnabled: false,
        billingEnabled: false,
        compliancePacksEnabled: true,
        defaultCurrency: "MYR",
        defaultTimezone: "Asia/Kuala_Lumpur",
        requiredCompliancePacks: ["pdpa_my"],
        taxType: "SST",
        taxRate: "6.00",
        taxInclusive: false,
      },
    ];
    
    for (const region of defaults) {
      const existing = await this.getRegionConfig(region.countryCode);
      if (!existing) {
        await db.insert(platformRegionConfigs).values({
          ...region,
          createdBy: "system",
          updatedBy: "system",
        });
      }
    }
  }
}

export const regionLockService = new RegionLockService();
