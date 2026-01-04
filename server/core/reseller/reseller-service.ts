import { db } from "../../db";
import {
  tenants,
  resellerProfiles,
  resellerRevenueAgreements,
  resellerRevenueRecords,
  resellerChildInvoices,
  resellerBrandAssets,
  ResellerProfile,
  InsertResellerProfile,
  ResellerRevenueAgreement,
  InsertResellerRevenueAgreement,
  ResellerRevenueRecord,
  InsertResellerRevenueRecord,
  ResellerChildInvoice,
  InsertResellerChildInvoice,
  ResellerBrandAsset,
  InsertResellerBrandAsset,
} from "@shared/schema";
import { eq, and, isNull, desc, sql, gte, lte, inArray } from "drizzle-orm";
import { auditService } from "../audit";

interface TieredRate {
  minRevenue: number;
  maxRevenue: number;
  percentage: number;
}

interface ResellerContext {
  resellerId: string;
  userId: string;
  userRole: string;
}

interface CreateResellerInput {
  tenantId: string;
  brandName: string;
  brandTagline?: string;
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  customDomain?: string;
  subdomainPrefix?: string;
  allowedBusinessTypes?: string[];
  maxChildTenants?: number;
}

interface CreateChildTenantInput {
  resellerId: string;
  name: string;
  businessType: string;
  email?: string;
  phone?: string;
  country?: string;
  currency?: string;
  timezone?: string;
}

interface RevenueCalculationResult {
  grossRevenue: number;
  refunds: number;
  netRevenue: number;
  resellerShare: number;
  platformShare: number;
  appliedPercentage: number;
  activeChildTenants: number;
  totalTransactions: number;
}

class ResellerService {
  async createResellerProfile(
    input: CreateResellerInput,
    actorId: string
  ): Promise<ResellerProfile> {
    const [updatedTenant] = await db
      .update(tenants)
      .set({ 
        tenantType: "reseller",
        updatedAt: new Date()
      })
      .where(eq(tenants.id, input.tenantId))
      .returning();

    if (!updatedTenant) {
      throw new Error("Tenant not found");
    }

    const profileData: InsertResellerProfile = {
      tenantId: input.tenantId,
      brandName: input.brandName,
      brandTagline: input.brandTagline,
      logoUrl: input.logoUrl,
      primaryColor: input.primaryColor || "#3B82F6",
      secondaryColor: input.secondaryColor || "#1E40AF",
      customDomain: input.customDomain,
      subdomainPrefix: input.subdomainPrefix,
      allowedBusinessTypes: input.allowedBusinessTypes || [],
      maxChildTenants: input.maxChildTenants || 100,
      status: "pending_approval",
    };

    const [profile] = await db
      .insert(resellerProfiles)
      .values(profileData)
      .returning();

    await auditService.log({
      tenantId: input.tenantId,
      userId: actorId,
      action: "create",
      resource: "reseller_profile",
      resourceId: profile.id,
      metadata: { brandName: input.brandName },
    });

    return profile;
  }

  async getResellerProfile(tenantId: string): Promise<ResellerProfile | null> {
    const [profile] = await db
      .select()
      .from(resellerProfiles)
      .where(eq(resellerProfiles.tenantId, tenantId))
      .limit(1);

    return profile || null;
  }

  async updateResellerProfile(
    tenantId: string,
    updates: Partial<InsertResellerProfile>,
    actorId: string
  ): Promise<ResellerProfile | null> {
    const [profile] = await db
      .update(resellerProfiles)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(resellerProfiles.tenantId, tenantId))
      .returning();

    if (profile) {
      await auditService.log({
        tenantId,
        userId: actorId,
        action: "update",
        resource: "reseller_profile",
        resourceId: profile.id,
        metadata: { updatedFields: Object.keys(updates) },
      });
    }

    return profile || null;
  }

  async approveReseller(
    tenantId: string,
    approvedBy: string
  ): Promise<ResellerProfile | null> {
    const [profile] = await db
      .update(resellerProfiles)
      .set({
        status: "active",
        approvedAt: new Date(),
        approvedBy,
        updatedAt: new Date(),
      })
      .where(eq(resellerProfiles.tenantId, tenantId))
      .returning();

    if (profile) {
      await auditService.log({
        tenantId,
        userId: approvedBy,
        action: "update",
        resource: "reseller_profile",
        resourceId: profile.id,
        metadata: { action: "approved" },
      });
    }

    return profile || null;
  }

  async createChildTenant(
    input: CreateChildTenantInput,
    actorId: string
  ): Promise<typeof tenants.$inferSelect> {
    const resellerProfile = await this.getResellerProfile(input.resellerId);
    if (!resellerProfile) {
      throw new Error("Reseller profile not found");
    }

    if (resellerProfile.status !== "active") {
      throw new Error("Reseller is not active");
    }

    if (
      resellerProfile.currentChildTenantCount! >= resellerProfile.maxChildTenants!
    ) {
      throw new Error("Maximum child tenant limit reached");
    }

    const allowedTypes = resellerProfile.allowedBusinessTypes as string[];
    if (allowedTypes.length > 0 && !allowedTypes.includes(input.businessType)) {
      throw new Error(`Business type '${input.businessType}' is not allowed for this reseller`);
    }

    const slug = `${resellerProfile.subdomainPrefix || "r"}-${Date.now().toString(36)}`;

    const [childTenant] = await db
      .insert(tenants)
      .values({
        name: input.name,
        slug,
        businessType: input.businessType as any,
        email: input.email,
        phone: input.phone,
        country: (input.country || "india") as any,
        currency: input.currency || "INR",
        timezone: input.timezone || "Asia/Kolkata",
        tenantType: "direct",
        parentResellerId: input.resellerId,
        primaryColor: resellerProfile.primaryColor,
        secondaryColor: resellerProfile.secondaryColor,
      })
      .returning();

    await db
      .update(resellerProfiles)
      .set({
        currentChildTenantCount: sql`${resellerProfiles.currentChildTenantCount} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(resellerProfiles.tenantId, input.resellerId));

    await auditService.log({
      tenantId: input.resellerId,
      userId: actorId,
      action: "create",
      resource: "child_tenant",
      resourceId: childTenant.id,
      metadata: { name: input.name, businessType: input.businessType },
    });

    return childTenant;
  }

  async getChildTenants(resellerId: string): Promise<Array<typeof tenants.$inferSelect>> {
    return db
      .select()
      .from(tenants)
      .where(
        and(
          eq(tenants.parentResellerId, resellerId),
          isNull(tenants.deletedAt)
        )
      )
      .orderBy(desc(tenants.createdAt));
  }

  async getChildTenantCount(resellerId: string): Promise<number> {
    const [result] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(tenants)
      .where(
        and(
          eq(tenants.parentResellerId, resellerId),
          isNull(tenants.deletedAt)
        )
      );
    return result?.count || 0;
  }

  async validateResellerAccess(
    resellerId: string,
    childTenantId: string
  ): Promise<boolean> {
    const [child] = await db
      .select()
      .from(tenants)
      .where(
        and(
          eq(tenants.id, childTenantId),
          eq(tenants.parentResellerId, resellerId),
          isNull(tenants.deletedAt)
        )
      )
      .limit(1);

    return !!child;
  }

  async createRevenueAgreement(
    data: InsertResellerRevenueAgreement,
    actorId: string
  ): Promise<ResellerRevenueAgreement> {
    await db
      .update(resellerRevenueAgreements)
      .set({ isActive: false, updatedAt: new Date() })
      .where(
        and(
          eq(resellerRevenueAgreements.resellerId, data.resellerId!),
          eq(resellerRevenueAgreements.isActive, true)
        )
      );

    const [agreement] = await db
      .insert(resellerRevenueAgreements)
      .values(data)
      .returning();

    await auditService.log({
      tenantId: data.resellerId!,
      userId: actorId,
      action: "create",
      resource: "revenue_agreement",
      resourceId: agreement.id,
      metadata: { agreementName: data.agreementName },
    });

    return agreement;
  }

  async getActiveRevenueAgreement(
    resellerId: string
  ): Promise<ResellerRevenueAgreement | null> {
    const [agreement] = await db
      .select()
      .from(resellerRevenueAgreements)
      .where(
        and(
          eq(resellerRevenueAgreements.resellerId, resellerId),
          eq(resellerRevenueAgreements.isActive, true)
        )
      )
      .limit(1);

    return agreement || null;
  }

  private safeParseNumber(value: string | null | undefined, defaultValue: number = 0): number {
    if (value === null || value === undefined || value === "") {
      return defaultValue;
    }
    const parsed = parseFloat(value);
    return isNaN(parsed) || !isFinite(parsed) ? defaultValue : parsed;
  }

  private validateTieredRates(rates: TieredRate[] | null | undefined): TieredRate[] {
    if (!Array.isArray(rates) || rates.length === 0) {
      return [];
    }
    
    const validRates = rates
      .filter((tier): tier is TieredRate => 
        tier !== null &&
        typeof tier === "object" &&
        typeof tier.minRevenue === "number" &&
        typeof tier.maxRevenue === "number" &&
        typeof tier.percentage === "number" &&
        tier.minRevenue >= 0 &&
        tier.maxRevenue >= tier.minRevenue &&
        tier.percentage >= 0 &&
        tier.percentage <= 100
      )
      .sort((a, b) => a.minRevenue - b.minRevenue);

    return validRates;
  }

  calculateRevenueShare(
    netRevenue: number,
    agreement: ResellerRevenueAgreement
  ): { resellerShare: number; platformShare: number; appliedPercentage: number } {
    if (!isFinite(netRevenue) || netRevenue < 0) {
      return { resellerShare: 0, platformShare: 0, appliedPercentage: 0 };
    }

    let appliedPercentage = 0;
    let resellerShare = 0;

    switch (agreement.revenueShareType) {
      case "percentage":
        appliedPercentage = this.safeParseNumber(agreement.baseSharePercentage, 20);
        appliedPercentage = Math.min(Math.max(appliedPercentage, 0), 100);
        resellerShare = (netRevenue * appliedPercentage) / 100;
        break;

      case "fixed":
        resellerShare = this.safeParseNumber(agreement.fixedAmount, 0);
        resellerShare = Math.max(0, resellerShare);
        resellerShare = Math.min(resellerShare, netRevenue);
        appliedPercentage = netRevenue > 0 ? (resellerShare / netRevenue) * 100 : 0;
        break;

      case "tiered":
        const tieredRates = this.validateTieredRates(agreement.tieredRates as TieredRate[]);
        for (const tier of tieredRates) {
          if (netRevenue >= tier.minRevenue && netRevenue <= tier.maxRevenue) {
            appliedPercentage = tier.percentage;
            break;
          }
        }
        appliedPercentage = Math.min(Math.max(appliedPercentage, 0), 100);
        resellerShare = (netRevenue * appliedPercentage) / 100;
        break;

      default:
        appliedPercentage = 20;
        resellerShare = (netRevenue * appliedPercentage) / 100;
    }

    const platformShare = Math.max(0, netRevenue - resellerShare);

    return {
      resellerShare: Math.round(resellerShare * 100) / 100,
      platformShare: Math.round(platformShare * 100) / 100,
      appliedPercentage: Math.round(appliedPercentage * 100) / 100,
    };
  }

  async calculatePeriodRevenue(
    resellerId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<RevenueCalculationResult> {
    const childTenants = await this.getChildTenants(resellerId);
    const childTenantIds = childTenants.map((t) => t.id);

    if (childTenantIds.length === 0) {
      return {
        grossRevenue: 0,
        refunds: 0,
        netRevenue: 0,
        resellerShare: 0,
        platformShare: 0,
        appliedPercentage: 0,
        activeChildTenants: 0,
        totalTransactions: 0,
      };
    }

    const [invoicesResult] = await db
      .select({
        totalPaid: sql<string>`COALESCE(SUM(CASE WHEN status = 'paid' THEN total ELSE 0 END), 0)`,
        totalRefunded: sql<string>`COALESCE(SUM(CASE WHEN status = 'refunded' THEN total ELSE 0 END), 0)`,
        transactionCount: sql<number>`COUNT(*)::int`,
      })
      .from(resellerChildInvoices)
      .where(
        and(
          inArray(resellerChildInvoices.childTenantId, childTenantIds),
          gte(resellerChildInvoices.invoiceDate, periodStart),
          lte(resellerChildInvoices.invoiceDate, periodEnd)
        )
      );

    const grossRevenue = parseFloat(invoicesResult?.totalPaid || "0");
    const refunds = parseFloat(invoicesResult?.totalRefunded || "0");
    const netRevenue = grossRevenue - refunds;
    const totalTransactions = invoicesResult?.transactionCount || 0;

    const agreement = await this.getActiveRevenueAgreement(resellerId);
    if (!agreement) {
      return {
        grossRevenue,
        refunds,
        netRevenue,
        resellerShare: 0,
        platformShare: netRevenue,
        appliedPercentage: 0,
        activeChildTenants: childTenants.filter((t) => t.isActive).length,
        totalTransactions,
      };
    }

    const shares = this.calculateRevenueShare(netRevenue, agreement);

    return {
      grossRevenue,
      refunds,
      netRevenue,
      resellerShare: shares.resellerShare,
      platformShare: shares.platformShare,
      appliedPercentage: shares.appliedPercentage,
      activeChildTenants: childTenants.filter((t) => t.isActive).length,
      totalTransactions,
    };
  }

  async createRevenueRecord(
    resellerId: string,
    periodStart: Date,
    periodEnd: Date,
    actorId: string
  ): Promise<ResellerRevenueRecord> {
    const agreement = await this.getActiveRevenueAgreement(resellerId);
    if (!agreement) {
      throw new Error("No active revenue agreement found");
    }

    const calculation = await this.calculatePeriodRevenue(
      resellerId,
      periodStart,
      periodEnd
    );

    const periodLabel = `${periodStart.getFullYear()}-${String(periodStart.getMonth() + 1).padStart(2, "0")}`;

    const recordData: InsertResellerRevenueRecord = {
      resellerId,
      agreementId: agreement.id,
      periodStart,
      periodEnd,
      periodLabel,
      grossRevenue: calculation.grossRevenue.toString(),
      refunds: calculation.refunds.toString(),
      netRevenue: calculation.netRevenue.toString(),
      activeChildTenants: calculation.activeChildTenants,
      totalTransactions: calculation.totalTransactions,
      resellerShareAmount: calculation.resellerShare.toString(),
      platformShareAmount: calculation.platformShare.toString(),
      appliedSharePercentage: calculation.appliedPercentage.toString(),
      status: "calculated",
      calculationDetails: {
        agreementVersion: agreement.agreementVersion,
        shareType: agreement.revenueShareType,
        calculatedAt: new Date().toISOString(),
      },
    };

    const [record] = await db
      .insert(resellerRevenueRecords)
      .values(recordData)
      .returning();

    await auditService.log({
      tenantId: resellerId,
      userId: actorId,
      action: "create",
      resource: "revenue_record",
      resourceId: record.id,
      metadata: { periodLabel, netRevenue: calculation.netRevenue },
    });

    return record;
  }

  async getRevenueRecords(
    resellerId: string,
    limit: number = 12
  ): Promise<ResellerRevenueRecord[]> {
    return db
      .select()
      .from(resellerRevenueRecords)
      .where(eq(resellerRevenueRecords.resellerId, resellerId))
      .orderBy(desc(resellerRevenueRecords.periodStart))
      .limit(limit);
  }

  async getBrandingForDomain(
    domain: string
  ): Promise<{ reseller: ResellerProfile; tenant: typeof tenants.$inferSelect } | null> {
    const [result] = await db
      .select({
        reseller: resellerProfiles,
        tenant: tenants,
      })
      .from(resellerProfiles)
      .innerJoin(tenants, eq(resellerProfiles.tenantId, tenants.id))
      .where(
        and(
          eq(resellerProfiles.customDomain, domain),
          eq(resellerProfiles.customDomainVerified, true),
          eq(resellerProfiles.status, "active")
        )
      )
      .limit(1);

    return result || null;
  }

  async getBrandingForSubdomain(
    subdomain: string
  ): Promise<{ reseller: ResellerProfile; tenant: typeof tenants.$inferSelect } | null> {
    const [result] = await db
      .select({
        reseller: resellerProfiles,
        tenant: tenants,
      })
      .from(resellerProfiles)
      .innerJoin(tenants, eq(resellerProfiles.tenantId, tenants.id))
      .where(
        and(
          eq(resellerProfiles.subdomainPrefix, subdomain),
          eq(resellerProfiles.status, "active")
        )
      )
      .limit(1);

    return result || null;
  }

  async verifyCustomDomain(
    tenantId: string,
    actorId: string
  ): Promise<ResellerProfile | null> {
    const [profile] = await db
      .update(resellerProfiles)
      .set({
        customDomainVerified: true,
        customDomainVerifiedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(resellerProfiles.tenantId, tenantId))
      .returning();

    if (profile) {
      await auditService.log({
        tenantId,
        userId: actorId,
        action: "update",
        resource: "reseller_profile",
        resourceId: profile.id,
        metadata: { action: "domain_verified", domain: profile.customDomain },
      });
    }

    return profile || null;
  }

  async addBrandAsset(
    resellerId: string,
    data: Omit<InsertResellerBrandAsset, "resellerId">,
    actorId: string
  ): Promise<ResellerBrandAsset> {
    const [asset] = await db
      .insert(resellerBrandAssets)
      .values({ ...data, resellerId })
      .returning();

    await auditService.log({
      tenantId: resellerId,
      userId: actorId,
      action: "create",
      resource: "brand_asset",
      resourceId: asset.id,
      metadata: { assetType: data.assetType, assetName: data.assetName },
    });

    return asset;
  }

  async getBrandAssets(
    resellerId: string,
    assetType?: string
  ): Promise<ResellerBrandAsset[]> {
    const conditions = [
      eq(resellerBrandAssets.resellerId, resellerId),
      eq(resellerBrandAssets.isActive, true),
    ];

    if (assetType) {
      conditions.push(eq(resellerBrandAssets.assetType, assetType));
    }

    return db
      .select()
      .from(resellerBrandAssets)
      .where(and(...conditions))
      .orderBy(desc(resellerBrandAssets.createdAt));
  }

  async getAllResellers(): Promise<Array<{
    tenant: typeof tenants.$inferSelect;
    profile: ResellerProfile;
  }>> {
    return db
      .select({
        tenant: tenants,
        profile: resellerProfiles,
      })
      .from(tenants)
      .innerJoin(resellerProfiles, eq(tenants.id, resellerProfiles.tenantId))
      .where(eq(tenants.tenantType, "reseller"))
      .orderBy(desc(tenants.createdAt));
  }

  async suspendReseller(
    tenantId: string,
    reason: string,
    actorId: string
  ): Promise<ResellerProfile | null> {
    const [profile] = await db
      .update(resellerProfiles)
      .set({
        status: "suspended",
        updatedAt: new Date(),
      })
      .where(eq(resellerProfiles.tenantId, tenantId))
      .returning();

    if (profile) {
      await auditService.log({
        tenantId,
        userId: actorId,
        action: "update",
        resource: "reseller_profile",
        resourceId: profile.id,
        metadata: { action: "suspended", reason },
      });
    }

    return profile || null;
  }
}

export const resellerService = new ResellerService();
