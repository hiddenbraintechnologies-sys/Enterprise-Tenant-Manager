import { db } from "../../db";
import {
  planUsageLimits,
  tenantUsageTracking,
  usageEvents,
  tenants,
  tenantSubscriptions,
  globalPricingPlans,
  type UsageType,
  type TenantUsageTracking,
} from "@shared/schema";
import { eq, and, gte, lte, sql, desc } from "drizzle-orm";

interface UsageLimits {
  usageType: UsageType;
  includedUnits: number;
  overageRate: number | null;
  hardLimit: number | null;
  isEnabled: boolean;
}

interface UsageStatus {
  usageType: UsageType;
  usedUnits: number;
  includedUnits: number;
  overageUnits: number;
  overageCost: number;
  isWithinLimit: boolean;
  remainingUnits: number;
  percentUsed: number;
}

interface RecordUsageParams {
  tenantId: string;
  usageType: UsageType;
  quantity?: number;
  resourceId?: string;
  resourceType?: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

interface RecordUsageResult {
  success: boolean;
  eventId?: string;
  withinLimit: boolean;
  usedUnits: number;
  remainingUnits: number;
  errorMessage?: string;
}

const REAL_ESTATE_USAGE_TYPES: UsageType[] = [
  "whatsapp_messages",
  "leads",
  "properties",
  "listings",
  "site_visits",
];

const TOURISM_USAGE_TYPES: UsageType[] = [
  "whatsapp_messages",
  "tour_packages",
  "tour_bookings",
  "travelers",
];

const DEFAULT_PLAN_LIMITS: Record<string, Record<UsageType, { included: number; overage: number; hardLimit: number | null }>> = {
  free: {
    whatsapp_messages: { included: 100, overage: 0.05, hardLimit: 100 },
    leads: { included: 50, overage: 0.10, hardLimit: 50 },
    properties: { included: 10, overage: 0.25, hardLimit: 10 },
    listings: { included: 10, overage: 0.25, hardLimit: 10 },
    site_visits: { included: 25, overage: 0.15, hardLimit: 25 },
    tour_packages: { included: 5, overage: 0.50, hardLimit: 5 },
    tour_bookings: { included: 20, overage: 0.30, hardLimit: 20 },
    travelers: { included: 50, overage: 0.10, hardLimit: 50 },
    bookings: { included: 50, overage: 0.10, hardLimit: 50 },
    api_calls: { included: 1000, overage: 0.001, hardLimit: 1000 },
  },
  starter: {
    whatsapp_messages: { included: 500, overage: 0.04, hardLimit: null },
    leads: { included: 200, overage: 0.08, hardLimit: null },
    properties: { included: 50, overage: 0.20, hardLimit: null },
    listings: { included: 50, overage: 0.20, hardLimit: null },
    site_visits: { included: 100, overage: 0.12, hardLimit: null },
    tour_packages: { included: 25, overage: 0.40, hardLimit: null },
    tour_bookings: { included: 100, overage: 0.25, hardLimit: null },
    travelers: { included: 250, overage: 0.08, hardLimit: null },
    bookings: { included: 200, overage: 0.08, hardLimit: null },
    api_calls: { included: 10000, overage: 0.0008, hardLimit: null },
  },
  pro: {
    whatsapp_messages: { included: 2000, overage: 0.03, hardLimit: null },
    leads: { included: 1000, overage: 0.05, hardLimit: null },
    properties: { included: 200, overage: 0.15, hardLimit: null },
    listings: { included: 200, overage: 0.15, hardLimit: null },
    site_visits: { included: 500, overage: 0.10, hardLimit: null },
    tour_packages: { included: 100, overage: 0.30, hardLimit: null },
    tour_bookings: { included: 500, overage: 0.20, hardLimit: null },
    travelers: { included: 1000, overage: 0.05, hardLimit: null },
    bookings: { included: 1000, overage: 0.05, hardLimit: null },
    api_calls: { included: 50000, overage: 0.0005, hardLimit: null },
  },
  enterprise: {
    whatsapp_messages: { included: 10000, overage: 0.02, hardLimit: null },
    leads: { included: 10000, overage: 0.03, hardLimit: null },
    properties: { included: 1000, overage: 0.10, hardLimit: null },
    listings: { included: 1000, overage: 0.10, hardLimit: null },
    site_visits: { included: 5000, overage: 0.05, hardLimit: null },
    tour_packages: { included: 500, overage: 0.20, hardLimit: null },
    tour_bookings: { included: 5000, overage: 0.10, hardLimit: null },
    travelers: { included: 10000, overage: 0.03, hardLimit: null },
    bookings: { included: 10000, overage: 0.03, hardLimit: null },
    api_calls: { included: 500000, overage: 0.0002, hardLimit: null },
  },
};

class UsageBillingService {
  private getCurrentBillingPeriod(): { start: Date; end: Date } {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    return { start, end };
  }

  async getTenantPlanTier(tenantId: string): Promise<string> {
    try {
      const [subscription] = await db.select({
        tier: globalPricingPlans.tier,
      })
        .from(tenantSubscriptions)
        .innerJoin(globalPricingPlans, eq(tenantSubscriptions.planId, globalPricingPlans.id))
        .where(and(
          eq(tenantSubscriptions.tenantId, tenantId),
          eq(tenantSubscriptions.status, "active")
        ))
        .limit(1);

      return subscription?.tier || "free";
    } catch {
      return "free";
    }
  }

  async getUsageLimits(tenantId: string, usageType: UsageType): Promise<UsageLimits> {
    const [tenant] = await db.select()
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1);

    if (!tenant) {
      throw new Error("Tenant not found");
    }

    const tier = await this.getTenantPlanTier(tenantId);
    const businessType = tenant.businessType || "service";

    const [customLimit] = await db.select()
      .from(planUsageLimits)
      .innerJoin(tenantSubscriptions, eq(planUsageLimits.planId, tenantSubscriptions.planId))
      .where(and(
        eq(tenantSubscriptions.tenantId, tenantId),
        eq(planUsageLimits.businessType, businessType),
        eq(planUsageLimits.usageType, usageType)
      ))
      .limit(1);

    if (customLimit) {
      return {
        usageType,
        includedUnits: customLimit.plan_usage_limits.includedUnits || 0,
        overageRate: customLimit.plan_usage_limits.overageRate ? parseFloat(customLimit.plan_usage_limits.overageRate) : null,
        hardLimit: customLimit.plan_usage_limits.hardLimit,
        isEnabled: customLimit.plan_usage_limits.isEnabled ?? true,
      };
    }

    const defaults = DEFAULT_PLAN_LIMITS[tier]?.[usageType] || DEFAULT_PLAN_LIMITS.free[usageType];
    return {
      usageType,
      includedUnits: defaults?.included || 0,
      overageRate: defaults?.overage || null,
      hardLimit: defaults?.hardLimit || null,
      isEnabled: true,
    };
  }

  async getUsageStatus(tenantId: string, usageType: UsageType): Promise<UsageStatus> {
    const limits = await this.getUsageLimits(tenantId, usageType);
    const { start, end } = this.getCurrentBillingPeriod();

    const [tracking] = await db.select()
      .from(tenantUsageTracking)
      .where(and(
        eq(tenantUsageTracking.tenantId, tenantId),
        eq(tenantUsageTracking.usageType, usageType),
        gte(tenantUsageTracking.periodStart, start),
        lte(tenantUsageTracking.periodEnd, end)
      ))
      .limit(1);

    const usedUnits = tracking?.usedUnits || 0;
    const overageUnits = Math.max(0, usedUnits - limits.includedUnits);
    const overageCost = limits.overageRate ? overageUnits * limits.overageRate : 0;
    const remainingUnits = limits.hardLimit !== null 
      ? Math.max(0, limits.hardLimit - usedUnits)
      : limits.includedUnits > 0 
        ? Math.max(0, limits.includedUnits - usedUnits)
        : Infinity;
    const isWithinLimit = limits.hardLimit !== null ? usedUnits < limits.hardLimit : true;
    const percentUsed = limits.includedUnits > 0 ? (usedUnits / limits.includedUnits) * 100 : 0;

    return {
      usageType,
      usedUnits,
      includedUnits: limits.includedUnits,
      overageUnits,
      overageCost,
      isWithinLimit,
      remainingUnits: remainingUnits === Infinity ? -1 : remainingUnits,
      percentUsed: Math.min(percentUsed, 100),
    };
  }

  async recordUsage(params: RecordUsageParams): Promise<RecordUsageResult> {
    const { tenantId, usageType, quantity = 1, resourceId, resourceType, description, metadata } = params;

    try {
      const limits = await this.getUsageLimits(tenantId, usageType);
      
      if (!limits.isEnabled) {
        return {
          success: false,
          withinLimit: false,
          usedUnits: 0,
          remainingUnits: 0,
          errorMessage: `Usage type ${usageType} is not enabled for this tenant`,
        };
      }

      const { start, end } = this.getCurrentBillingPeriod();

      const [existingTracking] = await db.select()
        .from(tenantUsageTracking)
        .where(and(
          eq(tenantUsageTracking.tenantId, tenantId),
          eq(tenantUsageTracking.usageType, usageType),
          gte(tenantUsageTracking.periodStart, start),
          lte(tenantUsageTracking.periodEnd, end)
        ))
        .limit(1);

      const currentUsed = existingTracking?.usedUnits || 0;
      const newUsed = currentUsed + quantity;

      if (limits.hardLimit !== null && newUsed > limits.hardLimit) {
        return {
          success: false,
          withinLimit: false,
          usedUnits: currentUsed,
          remainingUnits: Math.max(0, limits.hardLimit - currentUsed),
          errorMessage: `Hard limit of ${limits.hardLimit} ${usageType} reached`,
        };
      }

      const [event] = await db.insert(usageEvents).values({
        tenantId,
        usageType,
        quantity,
        unitCost: limits.overageRate?.toString(),
        resourceId,
        resourceType,
        description,
        metadata: metadata || {},
      }).returning();

      const overageUnits = Math.max(0, newUsed - limits.includedUnits);
      const overageCost = limits.overageRate ? overageUnits * limits.overageRate : 0;

      if (existingTracking) {
        await db.update(tenantUsageTracking)
          .set({
            usedUnits: newUsed,
            overageUnits,
            overageCost: overageCost.toFixed(2),
            updatedAt: new Date(),
          })
          .where(eq(tenantUsageTracking.id, existingTracking.id));
      } else {
        await db.insert(tenantUsageTracking).values({
          tenantId,
          usageType,
          periodStart: start,
          periodEnd: end,
          usedUnits: newUsed,
          includedUnits: limits.includedUnits,
          overageUnits,
          overageCost: overageCost.toFixed(2),
        });
      }

      const remainingUnits = limits.hardLimit !== null
        ? Math.max(0, limits.hardLimit - newUsed)
        : limits.includedUnits > 0
          ? Math.max(0, limits.includedUnits - newUsed)
          : -1;

      return {
        success: true,
        eventId: event.id,
        withinLimit: limits.hardLimit === null || newUsed <= limits.hardLimit,
        usedUnits: newUsed,
        remainingUnits,
      };
    } catch (error) {
      return {
        success: false,
        withinLimit: false,
        usedUnits: 0,
        remainingUnits: 0,
        errorMessage: error instanceof Error ? error.message : "Failed to record usage",
      };
    }
  }

  async getTenantUsageSummary(tenantId: string): Promise<UsageStatus[]> {
    const [tenant] = await db.select()
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1);

    if (!tenant) {
      return [];
    }

    const businessType = tenant.businessType || "service";
    let usageTypes: UsageType[];

    switch (businessType) {
      case "real_estate":
        usageTypes = REAL_ESTATE_USAGE_TYPES;
        break;
      case "tourism":
        usageTypes = TOURISM_USAGE_TYPES;
        break;
      default:
        usageTypes = ["whatsapp_messages", "bookings", "api_calls"];
    }

    const statuses = await Promise.all(
      usageTypes.map(type => this.getUsageStatus(tenantId, type))
    );

    return statuses;
  }

  async getUnbilledUsage(tenantId: string): Promise<TenantUsageTracking[]> {
    return db.select()
      .from(tenantUsageTracking)
      .where(and(
        eq(tenantUsageTracking.tenantId, tenantId),
        eq(tenantUsageTracking.isBilled, false)
      ))
      .orderBy(desc(tenantUsageTracking.periodStart));
  }

  async markUsageAsBilled(trackingIds: string[], invoiceId: string): Promise<void> {
    await db.update(tenantUsageTracking)
      .set({
        isBilled: true,
        billedAt: new Date(),
        invoiceId,
        updatedAt: new Date(),
      })
      .where(sql`${tenantUsageTracking.id} = ANY(${trackingIds})`);
  }

  async getUsageEvents(
    tenantId: string,
    usageType?: UsageType,
    startDate?: Date,
    endDate?: Date,
    limit = 100
  ): Promise<typeof usageEvents.$inferSelect[]> {
    const conditions = [eq(usageEvents.tenantId, tenantId)];

    if (usageType) {
      conditions.push(eq(usageEvents.usageType, usageType));
    }
    if (startDate) {
      conditions.push(gte(usageEvents.createdAt, startDate));
    }
    if (endDate) {
      conditions.push(lte(usageEvents.createdAt, endDate));
    }

    return db.select()
      .from(usageEvents)
      .where(and(...conditions))
      .orderBy(desc(usageEvents.createdAt))
      .limit(limit);
  }
}

export const usageBillingService = new UsageBillingService();

export async function recordWhatsAppUsage(tenantId: string, messageId?: string): Promise<RecordUsageResult> {
  return usageBillingService.recordUsage({
    tenantId,
    usageType: "whatsapp_messages",
    resourceId: messageId,
    resourceType: "whatsapp_message",
  });
}

export async function recordLeadUsage(tenantId: string, leadId: string): Promise<RecordUsageResult> {
  return usageBillingService.recordUsage({
    tenantId,
    usageType: "leads",
    resourceId: leadId,
    resourceType: "real_estate_lead",
  });
}

export async function recordPropertyUsage(tenantId: string, propertyId: string): Promise<RecordUsageResult> {
  return usageBillingService.recordUsage({
    tenantId,
    usageType: "properties",
    resourceId: propertyId,
    resourceType: "real_estate_property",
  });
}

export async function recordListingUsage(tenantId: string, listingId: string): Promise<RecordUsageResult> {
  return usageBillingService.recordUsage({
    tenantId,
    usageType: "listings",
    resourceId: listingId,
    resourceType: "real_estate_listing",
  });
}

export async function recordSiteVisitUsage(tenantId: string, visitId: string): Promise<RecordUsageResult> {
  return usageBillingService.recordUsage({
    tenantId,
    usageType: "site_visits",
    resourceId: visitId,
    resourceType: "real_estate_site_visit",
  });
}

export async function recordTourPackageUsage(tenantId: string, packageId: string): Promise<RecordUsageResult> {
  return usageBillingService.recordUsage({
    tenantId,
    usageType: "tour_packages",
    resourceId: packageId,
    resourceType: "tourism_package",
  });
}

export async function recordTourBookingUsage(tenantId: string, bookingId: string): Promise<RecordUsageResult> {
  return usageBillingService.recordUsage({
    tenantId,
    usageType: "tour_bookings",
    resourceId: bookingId,
    resourceType: "tourism_booking",
  });
}

export async function recordTravelerUsage(tenantId: string, travelerId: string): Promise<RecordUsageResult> {
  return usageBillingService.recordUsage({
    tenantId,
    usageType: "travelers",
    resourceId: travelerId,
    resourceType: "tourism_traveler",
  });
}
