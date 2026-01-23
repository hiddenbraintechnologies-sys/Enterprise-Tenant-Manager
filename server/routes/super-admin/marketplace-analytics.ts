import { Router, Request, Response } from "express";
import { db } from "../../db";
import {
  tenantAddons,
  addons,
  tenants,
  addonCountryConfig,
} from "@shared/schema";
import { eq, sql, and, gte, lte, count, sum, or } from "drizzle-orm";
import { authenticateJWT, requirePlatformAdmin } from "../../core/auth-middleware";

const router = Router();

const requiredAuth = authenticateJWT({ required: true });
const requireSuperAdmin = requirePlatformAdmin("SUPER_ADMIN");

interface AnalyticsOverview {
  activeSubscriptions: number;
  mtdRevenue: number;
  ytdRevenue: number;
  avgAddonsPerTenant: number;
  trialToPaidConversion: number;
  payrollAttachRate: number;
  currency: string;
}

interface AddonRevenue {
  addonId: string;
  addonName: string;
  category: string;
  activeTenants: number;
  mtdRevenue: number;
  ytdRevenue: number;
  trialToPaidPct: number;
}

interface CountryRevenue {
  countryCode: string;
  tenantCount: number;
  activeAddons: number;
  mtdRevenue: number;
  topAddon: string;
}

interface FunnelStep {
  step: string;
  count: number;
  conversionRate: number;
}

router.get("/overview", requiredAuth, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const { from, to, currency = "INR" } = req.query;
    
    const now = new Date();
    const mtdStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const ytdStart = new Date(now.getFullYear(), 0, 1);
    
    const fromDate = from ? new Date(from as string) : mtdStart;
    const toDate = to ? new Date(to as string) : now;

    const [activeSubsResult] = await db
      .select({ count: count() })
      .from(tenantAddons)
      .where(eq(tenantAddons.status, "active"));

    const [mtdRevenueResult] = await db
      .select({ total: sum(tenantAddons.monthlyAmount) })
      .from(tenantAddons)
      .where(
        and(
          eq(tenantAddons.status, "active"),
          gte(tenantAddons.currentPeriodStart, mtdStart),
          lte(tenantAddons.currentPeriodStart, now)
        )
      );

    const [ytdRevenueResult] = await db
      .select({ total: sum(tenantAddons.monthlyAmount) })
      .from(tenantAddons)
      .where(
        and(
          eq(tenantAddons.status, "active"),
          gte(tenantAddons.installedAt, ytdStart)
        )
      );

    const [tenantCountResult] = await db
      .select({ count: count() })
      .from(tenants)
      .where(eq(tenants.status, "active"));

    const [totalAddonsResult] = await db
      .select({ count: count() })
      .from(tenantAddons)
      .where(eq(tenantAddons.status, "active"));

    const tenantCount = tenantCountResult?.count || 1;
    const totalAddons = totalAddonsResult?.count || 0;
    const avgAddonsPerTenant = tenantCount > 0 ? totalAddons / tenantCount : 0;

    const [trialsResult] = await db
      .select({ count: count() })
      .from(tenantAddons)
      .where(
        and(
          sql`${tenantAddons.trialEndsAt} IS NOT NULL`,
          sql`${tenantAddons.trialEndsAt} > NOW()`
        )
      );

    const [convertedResult] = await db
      .select({ count: count() })
      .from(tenantAddons)
      .where(
        and(
          sql`${tenantAddons.status} = 'active'`,
          sql`${tenantAddons.trialEndsAt} IS NOT NULL`
        )
      );

    const trialsCount = trialsResult?.count || 0;
    const convertedCount = convertedResult?.count || 0;
    const trialToPaidConversion = trialsCount > 0 
      ? (convertedCount / (trialsCount + convertedCount)) * 100 
      : 0;

    const payrollAddon = await db
      .select({ id: addons.id })
      .from(addons)
      .where(eq(addons.slug, "payroll"))
      .limit(1);

    let payrollAttachRate = 0;
    if (payrollAddon.length > 0) {
      const [payrollTenantsResult] = await db
        .select({ count: count() })
        .from(tenantAddons)
        .where(
          and(
            eq(tenantAddons.addonId, payrollAddon[0].id),
            sql`${tenantAddons.status} = 'active'`
          )
        );
      
      const [proTenantsResult] = await db
        .select({ count: count() })
        .from(tenants)
        .where(
          and(
            eq(tenants.status, "active"),
            or(
              eq(tenants.subscriptionTier, "pro"),
              eq(tenants.subscriptionTier, "professional")
            )
          )
        );
      
      const proTenants = proTenantsResult?.count || 1;
      const payrollTenants = payrollTenantsResult?.count || 0;
      payrollAttachRate = proTenants > 0 ? (payrollTenants / proTenants) * 100 : 0;
    }

    const overview: AnalyticsOverview = {
      activeSubscriptions: activeSubsResult?.count || 0,
      mtdRevenue: Number(mtdRevenueResult?.total || 0) / 100,
      ytdRevenue: Number(ytdRevenueResult?.total || 0) / 100,
      avgAddonsPerTenant: Math.round(avgAddonsPerTenant * 100) / 100,
      trialToPaidConversion: Math.round(trialToPaidConversion * 100) / 100,
      payrollAttachRate: Math.round(payrollAttachRate * 100) / 100,
      currency: currency as string,
    };

    res.json(overview);
  } catch (error) {
    console.error("[marketplace-analytics] Error fetching overview:", error);
    res.status(500).json({ error: "Failed to fetch analytics overview" });
  }
});

router.get("/by-addon", requiredAuth, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const now = new Date();
    const mtdStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const ytdStart = new Date(now.getFullYear(), 0, 1);

    const allAddons = await db
      .select({
        id: addons.id,
        name: addons.name,
        category: addons.category,
      })
      .from(addons)
      .where(eq(addons.status, "published"));

    const results: AddonRevenue[] = [];

    for (const addon of allAddons) {
      const [activeTenantsResult] = await db
        .select({ count: count() })
        .from(tenantAddons)
        .where(
          and(
            eq(tenantAddons.addonId, addon.id),
            eq(tenantAddons.status, "active")
          )
        );

      const [mtdRevenueResult] = await db
        .select({ total: sum(tenantAddons.monthlyAmount) })
        .from(tenantAddons)
        .where(
          and(
            eq(tenantAddons.addonId, addon.id),
            eq(tenantAddons.status, "active"),
            gte(tenantAddons.currentPeriodStart, mtdStart)
          )
        );

      const [ytdRevenueResult] = await db
        .select({ total: sum(tenantAddons.monthlyAmount) })
        .from(tenantAddons)
        .where(
          and(
            eq(tenantAddons.addonId, addon.id),
            eq(tenantAddons.status, "active"),
            gte(tenantAddons.installedAt, ytdStart)
          )
        );

      const [trialCountResult] = await db
        .select({ count: count() })
        .from(tenantAddons)
        .where(
          and(
            eq(tenantAddons.addonId, addon.id),
            sql`${tenantAddons.trialEndsAt} IS NOT NULL`
          )
        );

      const [convertedCountResult] = await db
        .select({ count: count() })
        .from(tenantAddons)
        .where(
          and(
            eq(tenantAddons.addonId, addon.id),
            eq(tenantAddons.status, "active"),
            sql`${tenantAddons.trialEndsAt} IS NOT NULL`
          )
        );

      const trialCount = trialCountResult?.count || 0;
      const convertedCount = convertedCountResult?.count || 0;
      const trialToPaidPct = trialCount > 0 ? (convertedCount / trialCount) * 100 : 0;

      results.push({
        addonId: addon.id,
        addonName: addon.name,
        category: addon.category,
        activeTenants: activeTenantsResult?.count || 0,
        mtdRevenue: Number(mtdRevenueResult?.total || 0) / 100,
        ytdRevenue: Number(ytdRevenueResult?.total || 0) / 100,
        trialToPaidPct: Math.round(trialToPaidPct * 100) / 100,
      });
    }

    res.json(results);
  } catch (error) {
    console.error("[marketplace-analytics] Error fetching by-addon:", error);
    res.status(500).json({ error: "Failed to fetch addon analytics" });
  }
});

router.get("/by-country", requiredAuth, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const now = new Date();
    const mtdStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const countries = await db
      .selectDistinct({ countryCode: addonCountryConfig.countryCode })
      .from(addonCountryConfig)
      .where(eq(addonCountryConfig.isActive, true));

    const results: CountryRevenue[] = [];

    for (const country of countries) {
      const countryCode = country.countryCode;

      const [tenantCountResult] = await db
        .select({ count: count() })
        .from(tenants)
        .where(sql`UPPER(${tenants.country}) = ${countryCode}`);

      const [activeAddonsResult] = await db
        .select({ count: count() })
        .from(tenantAddons)
        .where(
          and(
            eq(tenantAddons.countryCode, countryCode),
            eq(tenantAddons.status, "active")
          )
        );

      const [mtdRevenueResult] = await db
        .select({ total: sum(tenantAddons.monthlyAmount) })
        .from(tenantAddons)
        .where(
          and(
            eq(tenantAddons.countryCode, countryCode),
            eq(tenantAddons.status, "active"),
            gte(tenantAddons.currentPeriodStart, mtdStart)
          )
        );

      const topAddonResult = await db
        .select({
          addonId: tenantAddons.addonId,
          count: count(),
        })
        .from(tenantAddons)
        .where(
          and(
            eq(tenantAddons.countryCode, countryCode),
            eq(tenantAddons.status, "active")
          )
        )
        .groupBy(tenantAddons.addonId)
        .orderBy(sql`count(*) DESC`)
        .limit(1);

      let topAddonName = "N/A";
      if (topAddonResult.length > 0) {
        const [addonDetails] = await db
          .select({ name: addons.name })
          .from(addons)
          .where(eq(addons.id, topAddonResult[0].addonId));
        topAddonName = addonDetails?.name || "Unknown";
      }

      results.push({
        countryCode,
        tenantCount: tenantCountResult?.count || 0,
        activeAddons: activeAddonsResult?.count || 0,
        mtdRevenue: Number(mtdRevenueResult?.total || 0) / 100,
        topAddon: topAddonName,
      });
    }

    res.json(results);
  } catch (error) {
    console.error("[marketplace-analytics] Error fetching by-country:", error);
    res.status(500).json({ error: "Failed to fetch country analytics" });
  }
});

router.get("/funnel", requiredAuth, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const [viewedResult] = await db
      .select({ count: count() })
      .from(tenants)
      .where(eq(tenants.status, "active"));

    const [trialStartedResult] = await db
      .select({ count: count() })
      .from(tenantAddons)
      .where(sql`${tenantAddons.trialEndsAt} IS NOT NULL`);

    const [activatedPaidResult] = await db
      .select({ count: count() })
      .from(tenantAddons)
      .where(
        and(
          eq(tenantAddons.status, "active"),
          sql`${tenantAddons.trialEndsAt} IS NOT NULL`
        )
      );

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [retained30Result] = await db
      .select({ count: count() })
      .from(tenantAddons)
      .where(
        and(
          eq(tenantAddons.status, "active"),
          sql`${tenantAddons.trialEndsAt} IS NOT NULL`,
          lte(tenantAddons.installedAt, thirtyDaysAgo)
        )
      );

    const viewed = viewedResult?.count || 0;
    const trialStarted = trialStartedResult?.count || 0;
    const activatedPaid = activatedPaidResult?.count || 0;
    const retained30 = retained30Result?.count || 0;

    const funnel: FunnelStep[] = [
      {
        step: "Viewed Marketplace",
        count: viewed,
        conversionRate: 100,
      },
      {
        step: "Started Trial",
        count: trialStarted,
        conversionRate: viewed > 0 ? (trialStarted / viewed) * 100 : 0,
      },
      {
        step: "Activated Paid",
        count: activatedPaid,
        conversionRate: trialStarted > 0 ? (activatedPaid / trialStarted) * 100 : 0,
      },
      {
        step: "Retained 30 Days",
        count: retained30,
        conversionRate: activatedPaid > 0 ? (retained30 / activatedPaid) * 100 : 0,
      },
    ];

    res.json(funnel);
  } catch (error) {
    console.error("[marketplace-analytics] Error fetching funnel:", error);
    res.status(500).json({ error: "Failed to fetch funnel analytics" });
  }
});

export default router;
