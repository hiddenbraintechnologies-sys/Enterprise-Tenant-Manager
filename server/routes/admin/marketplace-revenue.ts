import { Router, Request, Response } from "express";
import { db } from "../../db";
import { 
  tenantAddons, 
  addons, 
  addonPricing, 
  tenants, 
  tenantPayrollAddon,
  billingPayments,
  globalPricingPlans,
  tenantSubscriptions,
} from "@shared/schema";
import { eq, and, sql, gte, lte, count, sum, desc } from "drizzle-orm";
import { authenticateJWT } from "../../core/auth-middleware";
import { requirePermission, Permissions } from "../../rbac/guards";

const router = Router();

const requireSuperAdmin = requirePermission(Permissions.PLATFORM_ADMIN);

const COUNTRY_CODE_MAP: Record<string, string> = {
  india: "IN",
  malaysia: "MY",
  uk: "UK",
  uae: "AE",
  us: "US",
};

router.get("/overview", authenticateJWT({ required: true }), requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const [activeAddonsResult] = await db
      .select({ count: count() })
      .from(tenantAddons)
      .where(eq(tenantAddons.status, "active"));

    const [payrollAddonsResult] = await db
      .select({ count: count() })
      .from(tenantPayrollAddon)
      .where(eq(tenantPayrollAddon.enabled, true));

    const totalActiveSubscriptions = (activeAddonsResult?.count || 0) + (payrollAddonsResult?.count || 0);

    const mtdPayments = await db
      .select({ 
        total: sql<string>`COALESCE(SUM(amount), 0)`,
        currency: billingPayments.currency,
      })
      .from(billingPayments)
      .where(
        and(
          eq(billingPayments.status, "paid"),
          gte(billingPayments.createdAt, startOfMonth),
          sql`${billingPayments.metadata}->>'type' = 'addon'`
        )
      )
      .groupBy(billingPayments.currency);

    const ytdPayments = await db
      .select({ 
        total: sql<string>`COALESCE(SUM(amount), 0)`,
        currency: billingPayments.currency,
      })
      .from(billingPayments)
      .where(
        and(
          eq(billingPayments.status, "paid"),
          gte(billingPayments.createdAt, startOfYear),
          sql`${billingPayments.metadata}->>'type' = 'addon'`
        )
      )
      .groupBy(billingPayments.currency);

    const [totalTenantsResult] = await db
      .select({ count: count() })
      .from(tenants)
      .where(eq(tenants.isActive, true));

    const totalTenants = totalTenantsResult?.count || 1;

    const avgAddonPerTenant = totalActiveSubscriptions / Math.max(totalTenants, 1);

    const [trialStartedResult] = await db
      .select({ count: count() })
      .from(tenantAddons)
      .where(sql`${tenantAddons.trialEndsAt} IS NOT NULL`);

    const [trialConvertedResult] = await db
      .select({ count: count() })
      .from(tenantAddons)
      .where(
        and(
          sql`${tenantAddons.trialEndsAt} IS NOT NULL`,
          eq(tenantAddons.status, "active"),
          eq(tenantAddons.subscriptionStatus, "active")
        )
      );

    const trialStarted = trialStartedResult?.count || 0;
    const trialConverted = trialConvertedResult?.count || 0;
    const conversionRate = trialStarted > 0 ? ((trialConverted / trialStarted) * 100).toFixed(1) : "0";

    return res.json({
      success: true,
      data: {
        topMetrics: {
          totalActiveSubscriptions,
          mtdRevenue: mtdPayments.reduce((acc, p) => ({
            ...acc,
            [p.currency]: parseFloat(p.total || "0"),
          }), {} as Record<string, number>),
          ytdRevenue: ytdPayments.reduce((acc, p) => ({
            ...acc,
            [p.currency]: parseFloat(p.total || "0"),
          }), {} as Record<string, number>),
          avgAddonPerTenant: avgAddonPerTenant.toFixed(2),
          trialConversionRate: `${conversionRate}%`,
        },
        period: {
          mtdStart: startOfMonth.toISOString(),
          ytdStart: startOfYear.toISOString(),
        },
      },
    });
  } catch (error) {
    console.error("[marketplace-revenue] Error fetching overview:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch revenue overview",
    });
  }
});

router.get("/by-addon", authenticateJWT({ required: true }), requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const marketplaceAddons = await db
      .select({
        addonId: tenantAddons.addonId,
        addonName: addons.name,
        addonSlug: addons.slug,
        category: addons.category,
        activeCount: count(),
      })
      .from(tenantAddons)
      .innerJoin(addons, eq(tenantAddons.addonId, addons.id))
      .where(eq(tenantAddons.status, "active"))
      .groupBy(tenantAddons.addonId, addons.name, addons.slug, addons.category)
      .orderBy(desc(count()));

    const payrollAddons = await db
      .select({
        count: count(),
      })
      .from(tenantPayrollAddon)
      .where(eq(tenantPayrollAddon.enabled, true));

    const payrollCount = payrollAddons[0]?.count || 0;

    const result = [
      ...marketplaceAddons.map(a => ({
        addonId: a.addonId,
        name: a.addonName,
        slug: a.addonSlug,
        category: a.category,
        activeTenants: a.activeCount,
      })),
    ];

    if (payrollCount > 0) {
      result.unshift({
        addonId: "payroll-legacy",
        name: "Payroll (Legacy)",
        slug: "payroll-legacy",
        category: "compliance",
        activeTenants: payrollCount,
      });
    }

    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("[marketplace-revenue] Error fetching revenue by addon:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch revenue by addon",
    });
  }
});

router.get("/by-country", authenticateJWT({ required: true }), requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const countryStats = await db
      .select({
        country: tenants.country,
        totalTenants: count(),
      })
      .from(tenants)
      .where(eq(tenants.isActive, true))
      .groupBy(tenants.country);

    const addonsByTenant = await db
      .select({
        tenantId: tenantAddons.tenantId,
        addonCount: count(),
      })
      .from(tenantAddons)
      .where(eq(tenantAddons.status, "active"))
      .groupBy(tenantAddons.tenantId);

    const tenantCountryMap = await db
      .select({
        id: tenants.id,
        country: tenants.country,
      })
      .from(tenants)
      .where(eq(tenants.isActive, true));

    const countryAddonCounts: Record<string, number> = {};
    for (const ta of addonsByTenant) {
      const tenant = tenantCountryMap.find(t => t.id === ta.tenantId);
      if (tenant) {
        const countryCode = COUNTRY_CODE_MAP[tenant.country || "india"] || "IN";
        countryAddonCounts[countryCode] = (countryAddonCounts[countryCode] || 0) + ta.addonCount;
      }
    }

    const result = countryStats.map(cs => {
      const countryCode = COUNTRY_CODE_MAP[cs.country || "india"] || "IN";
      return {
        country: cs.country,
        countryCode,
        totalTenants: cs.totalTenants,
        totalAddons: countryAddonCounts[countryCode] || 0,
      };
    });

    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("[marketplace-revenue] Error fetching revenue by country:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch revenue by country",
    });
  }
});

router.get("/funnel", authenticateJWT({ required: true }), requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const [viewedResult] = await db
      .select({ count: sql<number>`SUM(${addons.installCount})` })
      .from(addons)
      .where(eq(addons.status, "published"));

    const [trialStartedResult] = await db
      .select({ count: count() })
      .from(tenantAddons)
      .where(sql`${tenantAddons.trialEndsAt} IS NOT NULL`);

    const [paidActiveResult] = await db
      .select({ count: count() })
      .from(tenantAddons)
      .where(
        and(
          eq(tenantAddons.status, "active"),
          eq(tenantAddons.subscriptionStatus, "active")
        )
      );

    const [cancelledResult] = await db
      .select({ count: count() })
      .from(tenantAddons)
      .where(eq(tenantAddons.status, "disabled"));

    return res.json({
      success: true,
      data: {
        viewed: viewedResult?.count || 0,
        trialStarted: trialStartedResult?.count || 0,
        paidActive: paidActiveResult?.count || 0,
        cancelled: cancelledResult?.count || 0,
      },
    });
  } catch (error) {
    console.error("[marketplace-revenue] Error fetching funnel:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch funnel data",
    });
  }
});

router.get("/tenant/:tenantId", authenticateJWT({ required: true }), requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;

    const [tenant] = await db
      .select({
        id: tenants.id,
        name: tenants.name,
        country: tenants.country,
        businessType: tenants.businessType,
        createdAt: tenants.createdAt,
      })
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1);

    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: "Tenant not found",
      });
    }

    const [subscription] = await db
      .select({
        planId: tenantSubscriptions.planId,
        planName: globalPricingPlans.name,
        planTier: globalPricingPlans.tier,
        status: tenantSubscriptions.status,
        currentPeriodEnd: tenantSubscriptions.currentPeriodEnd,
      })
      .from(tenantSubscriptions)
      .leftJoin(globalPricingPlans, eq(tenantSubscriptions.planId, globalPricingPlans.id))
      .where(eq(tenantSubscriptions.tenantId, tenantId))
      .limit(1);

    const installedAddons = await db
      .select({
        id: tenantAddons.id,
        addonId: tenantAddons.addonId,
        addonName: addons.name,
        status: tenantAddons.status,
        subscriptionStatus: tenantAddons.subscriptionStatus,
        currentPeriodEnd: tenantAddons.currentPeriodEnd,
        trialEndsAt: tenantAddons.trialEndsAt,
      })
      .from(tenantAddons)
      .innerJoin(addons, eq(tenantAddons.addonId, addons.id))
      .where(eq(tenantAddons.tenantId, tenantId));

    const [payrollAddon] = await db
      .select()
      .from(tenantPayrollAddon)
      .where(eq(tenantPayrollAddon.tenantId, tenantId))
      .limit(1);

    const payments = await db
      .select({
        amount: billingPayments.amount,
        currency: billingPayments.currency,
      })
      .from(billingPayments)
      .where(
        and(
          eq(billingPayments.tenantId, tenantId),
          eq(billingPayments.status, "paid")
        )
      );

    const lifetimeValue = payments.reduce((acc, p) => {
      const currency = p.currency || "INR";
      acc[currency] = (acc[currency] || 0) + parseFloat(p.amount || "0");
      return acc;
    }, {} as Record<string, number>);

    return res.json({
      success: true,
      data: {
        tenant: {
          ...tenant,
          countryCode: COUNTRY_CODE_MAP[tenant.country || "india"] || "IN",
        },
        subscription: subscription || null,
        installedAddons: [
          ...installedAddons,
          ...(payrollAddon?.enabled ? [{
            id: payrollAddon.id,
            addonId: "payroll-legacy",
            addonName: "Payroll (Legacy)",
            status: "active",
            subscriptionStatus: payrollAddon.subscriptionStatus,
            currentPeriodEnd: payrollAddon.currentPeriodEnd,
            trialEndsAt: payrollAddon.trialEndsAt,
          }] : []),
        ],
        lifetimeValue,
      },
    });
  } catch (error) {
    console.error("[marketplace-revenue] Error fetching tenant details:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch tenant details",
    });
  }
});

export default router;
