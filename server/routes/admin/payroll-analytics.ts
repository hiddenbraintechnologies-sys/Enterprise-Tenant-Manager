/**
 * Payroll Revenue Analytics Routes (Super Admin)
 * 
 * Provides analytics for payroll addon revenue, tenant metrics,
 * trial tracking, and conversion rates.
 * 
 * Endpoints (mounted at /api/admin/analytics/payroll):
 * - GET /summary - Overall payroll metrics
 * - GET /tenants - Per-tenant payroll breakdown
 * - GET /trials - Tenants in trial period
 * - GET /grace - Tenants in grace period
 */

import { Router } from "express";
import { db } from "../../db";
import { 
  tenants,
  tenantPayrollAddon,
  payrollAddonTiers,
  tenantSubscriptions,
  auditLogs,
} from "@shared/schema";
import { eq, and, sql, desc, gte, lte, count, isNotNull } from "drizzle-orm";
import { requirePlatformAdmin, authenticateJWT } from "../../core/auth-middleware";

const router = Router();

interface PayrollSummary {
  totalMRR: number;
  activeCount: number;
  trialCount: number;
  paidCount: number;
  churnedCount: number;
  conversionRate: number;
  byCountry: Record<string, { mrr: number; count: number }>;
  byTier: Record<string, { mrr: number; count: number }>;
  byBasePlan: Record<string, { mrr: number; count: number }>;
}

router.get("/summary", authenticateJWT(), requirePlatformAdmin(), async (req, res) => {
  try {
    const { country, startDate, endDate } = req.query;

    const payrollAddons = await db
      .select({
        tenantId: tenantPayrollAddon.tenantId,
        status: tenantPayrollAddon.status,
        tier: tenantPayrollAddon.tier,
        employeeCount: tenantPayrollAddon.employeeCount,
        monthlyAmount: tenantPayrollAddon.monthlyAmount,
        currency: tenantPayrollAddon.currency,
        trialEndsAt: tenantPayrollAddon.trialEndsAt,
        country: tenants.country,
        subscriptionTier: tenants.subscriptionTier,
      })
      .from(tenantPayrollAddon)
      .innerJoin(tenants, eq(tenantPayrollAddon.tenantId, tenants.id))
      .where(country ? eq(tenants.country, country as string) : sql`1=1`);

    let totalMRR = 0;
    let activeCount = 0;
    let trialCount = 0;
    let paidCount = 0;
    let churnedCount = 0;

    const byCountry: Record<string, { mrr: number; count: number }> = {};
    const byTier: Record<string, { mrr: number; count: number }> = {};
    const byBasePlan: Record<string, { mrr: number; count: number }> = {};

    for (const addon of payrollAddons) {
      const countryKey = addon.country || "unknown";
      const tierKey = addon.tier || "unknown";
      const planKey = addon.subscriptionTier || "unknown";

      if (!byCountry[countryKey]) byCountry[countryKey] = { mrr: 0, count: 0 };
      if (!byTier[tierKey]) byTier[tierKey] = { mrr: 0, count: 0 };
      if (!byBasePlan[planKey]) byBasePlan[planKey] = { mrr: 0, count: 0 };

      if (addon.status === "active") {
        activeCount++;
        const mrr = parseFloat(addon.monthlyAmount || "0");
        totalMRR += mrr;
        
        byCountry[countryKey].mrr += mrr;
        byCountry[countryKey].count++;
        byTier[tierKey].mrr += mrr;
        byTier[tierKey].count++;
        byBasePlan[planKey].mrr += mrr;
        byBasePlan[planKey].count++;
        
        if (addon.trialEndsAt && new Date(addon.trialEndsAt) > new Date()) {
          trialCount++;
        } else {
          paidCount++;
        }
      } else if (addon.status === "cancelled" || addon.status === "expired") {
        churnedCount++;
      }
    }

    const conversionRate = trialCount + paidCount > 0 
      ? (paidCount / (trialCount + paidCount)) * 100 
      : 0;

    const summary: PayrollSummary = {
      totalMRR,
      activeCount,
      trialCount,
      paidCount,
      churnedCount,
      conversionRate,
      byCountry,
      byTier,
      byBasePlan,
    };

    res.json(summary);
  } catch (error) {
    console.error("[payroll-analytics] Summary error:", error);
    res.status(500).json({ error: "Failed to fetch payroll analytics summary" });
  }
});

router.get("/tenants", authenticateJWT(), requirePlatformAdmin(), async (req, res) => {
  try {
    const { country, status, tier, limit = 50, offset = 0 } = req.query;

    let conditions = [];
    if (country) conditions.push(eq(tenants.country, country as string));
    if (status) conditions.push(eq(tenantPayrollAddon.status, status as string));
    if (tier) conditions.push(eq(tenantPayrollAddon.tier, tier as string));

    const tenantList = await db
      .select({
        tenantId: tenants.id,
        tenantName: tenants.businessName,
        country: tenants.country,
        subscriptionTier: tenants.subscriptionTier,
        payrollStatus: tenantPayrollAddon.status,
        payrollTier: tenantPayrollAddon.tier,
        employeeCount: tenantPayrollAddon.employeeCount,
        monthlyAmount: tenantPayrollAddon.monthlyAmount,
        currency: tenantPayrollAddon.currency,
        trialEndsAt: tenantPayrollAddon.trialEndsAt,
        activatedAt: tenantPayrollAddon.activatedAt,
        cancelledAt: tenantPayrollAddon.cancelledAt,
      })
      .from(tenantPayrollAddon)
      .innerJoin(tenants, eq(tenantPayrollAddon.tenantId, tenants.id))
      .where(conditions.length > 0 ? and(...conditions) : sql`1=1`)
      .orderBy(desc(tenantPayrollAddon.activatedAt))
      .limit(parseInt(limit as string))
      .offset(parseInt(offset as string));

    const [countResult] = await db
      .select({ total: count() })
      .from(tenantPayrollAddon)
      .innerJoin(tenants, eq(tenantPayrollAddon.tenantId, tenants.id))
      .where(conditions.length > 0 ? and(...conditions) : sql`1=1`);

    res.json({
      data: tenantList,
      total: countResult?.total || 0,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    });
  } catch (error) {
    console.error("[payroll-analytics] Tenants error:", error);
    res.status(500).json({ error: "Failed to fetch tenant list" });
  }
});

router.get("/trials", authenticateJWT(), requirePlatformAdmin(), async (req, res) => {
  try {
    const { daysToExpire = 7 } = req.query;
    const expiryThreshold = new Date();
    expiryThreshold.setDate(expiryThreshold.getDate() + parseInt(daysToExpire as string));

    const trials = await db
      .select({
        tenantId: tenants.id,
        tenantName: tenants.businessName,
        country: tenants.country,
        subscriptionTier: tenants.subscriptionTier,
        payrollTier: tenantPayrollAddon.tier,
        employeeCount: tenantPayrollAddon.employeeCount,
        trialEndsAt: tenantPayrollAddon.trialEndsAt,
        activatedAt: tenantPayrollAddon.activatedAt,
      })
      .from(tenantPayrollAddon)
      .innerJoin(tenants, eq(tenantPayrollAddon.tenantId, tenants.id))
      .where(and(
        eq(tenantPayrollAddon.status, "active"),
        isNotNull(tenantPayrollAddon.trialEndsAt),
        lte(tenantPayrollAddon.trialEndsAt, expiryThreshold),
        gte(tenantPayrollAddon.trialEndsAt, new Date())
      ))
      .orderBy(tenantPayrollAddon.trialEndsAt);

    res.json(trials);
  } catch (error) {
    console.error("[payroll-analytics] Trials error:", error);
    res.status(500).json({ error: "Failed to fetch trials ending soon" });
  }
});

router.get("/grace", authenticateJWT(), requirePlatformAdmin(), async (req, res) => {
  try {
    const graceAddons = await db
      .select({
        tenantId: tenants.id,
        tenantName: tenants.businessName,
        country: tenants.country,
        payrollTier: tenantPayrollAddon.tier,
        employeeCount: tenantPayrollAddon.employeeCount,
        monthlyAmount: tenantPayrollAddon.monthlyAmount,
        gracePeriodEndsAt: tenantPayrollAddon.gracePeriodEndsAt,
      })
      .from(tenantPayrollAddon)
      .innerJoin(tenants, eq(tenantPayrollAddon.tenantId, tenants.id))
      .where(and(
        eq(tenantPayrollAddon.status, "grace"),
        isNotNull(tenantPayrollAddon.gracePeriodEndsAt)
      ))
      .orderBy(tenantPayrollAddon.gracePeriodEndsAt);

    res.json(graceAddons);
  } catch (error) {
    console.error("[payroll-analytics] Grace error:", error);
    res.status(500).json({ error: "Failed to fetch grace period tenants" });
  }
});

export default router;
