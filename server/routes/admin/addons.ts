import { Router, Request, Response } from "express";
import { z } from "zod";
import { db } from "../../db";
import { payrollAddonTiers, bundleDiscounts, tenantPayrollAddon, countryRolloutPolicy } from "@shared/schema";
import { eq, and, inArray, count, desc, sql } from "drizzle-orm";
import { authenticateJWT, requirePlatformAdmin } from "../../core/auth-middleware";
import { getScopeContext } from "../../rbac/guards";
import { auditService } from "../../core";

const router = Router();

const requiredAuth = authenticateJWT({ required: true });

function canAdminManageCountry(req: Request, countryCode: string): boolean {
  const scopeContext = getScopeContext(req);
  
  if (!scopeContext) {
    return false;
  }
  
  if (scopeContext.isSuperAdmin || scopeContext.scopeType === "GLOBAL") {
    return true;
  }
  
  return scopeContext.allowedCountryIds?.includes(countryCode) || false;
}

const createTierSchema = z.object({
  tierName: z.string().min(1).max(100),
  minEmployees: z.number().int().min(1),
  maxEmployees: z.number().int().min(1),
  monthlyPrice: z.string().regex(/^\d+(\.\d{1,2})?$/),
  yearlyPrice: z.string().regex(/^\d+(\.\d{1,2})?$/),
  currencyCode: z.string().length(3),
  countryCode: z.string().min(2).max(5),
  razorpayMonthlyPlanId: z.string().optional().nullable(),
  razorpayYearlyPlanId: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

const updateTierSchema = createTierSchema.partial();

const createBundleDiscountSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  planCode: z.string().min(1),
  addonCode: z.string().default("payroll"),
  addonTierId: z.string().uuid().optional().nullable(),
  discountType: z.enum(["fixed", "percentage"]),
  discountAmount: z.string().regex(/^\d+(\.\d{1,2})?$/),
  currencyCode: z.string().length(3),
  countryCode: z.string().min(2).max(5),
  appliesTo: z.enum(["addon", "plan", "total"]).default("addon"),
  isActive: z.boolean().optional(),
});

router.get("/payroll/tiers", requiredAuth, requirePlatformAdmin(), async (req, res) => {
  try {
    const countryCode = req.query.country as string | undefined;
    
    const conditions = [];
    if (countryCode) {
      conditions.push(eq(payrollAddonTiers.countryCode, countryCode.toUpperCase()));
    }

    const scopeContext = getScopeContext(req);
    if (scopeContext && !scopeContext.isSuperAdmin && scopeContext.scopeType !== "GLOBAL") {
      const allowedCountries = scopeContext.allowedCountryIds || [];
      if (allowedCountries.length > 0) {
        conditions.push(inArray(payrollAddonTiers.countryCode, allowedCountries));
      }
    }

    const tiers = await db
      .select()
      .from(payrollAddonTiers)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(payrollAddonTiers.countryCode, payrollAddonTiers.minEmployees);

    res.json(tiers);
  } catch (error) {
    console.error("[admin/addons] Error fetching payroll tiers:", error);
    res.status(500).json({ error: "Failed to fetch payroll tiers" });
  }
});

router.post("/payroll/tiers", requiredAuth, requirePlatformAdmin("SUPER_ADMIN"), async (req, res) => {
  try {
    const parsed = createTierSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid request body", details: parsed.error.errors });
    }

    const { countryCode, tierName, minEmployees, maxEmployees, ...tierData } = parsed.data;

    if (!canAdminManageCountry(req, countryCode)) {
      return res.status(403).json({ error: "You do not have permission to manage add-ons for this country" });
    }

    const existing = await db
      .select()
      .from(payrollAddonTiers)
      .where(
        and(
          eq(payrollAddonTiers.tierName, tierName),
          eq(payrollAddonTiers.countryCode, countryCode)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      return res.status(409).json({ error: "A tier with this name already exists for this country" });
    }

    const overlapping = await db
      .select()
      .from(payrollAddonTiers)
      .where(
        and(
          eq(payrollAddonTiers.countryCode, countryCode),
          sql`${payrollAddonTiers.minEmployees} <= ${maxEmployees}`,
          sql`${payrollAddonTiers.maxEmployees} >= ${minEmployees}`
        )
      )
      .limit(1);

    if (overlapping.length > 0) {
      return res.status(409).json({ 
        error: "Employee range overlaps with existing tier",
        existingTier: overlapping[0].tierName 
      });
    }

    const [tier] = await db.insert(payrollAddonTiers).values({
      addonCode: "payroll",
      tierName,
      minEmployees,
      maxEmployees,
      countryCode: countryCode.toUpperCase(),
      isActive: tierData.isActive ?? true,
      ...tierData,
    }).returning();

    auditService.logFromRequest("create_payroll_tier", req, "payroll_addon_tier");

    res.status(201).json(tier);
  } catch (error) {
    console.error("[admin/addons] Error creating payroll tier:", error);
    res.status(500).json({ error: "Failed to create payroll tier" });
  }
});

router.patch("/payroll/tiers/:tierId", requiredAuth, requirePlatformAdmin("SUPER_ADMIN"), async (req, res) => {
  try {
    const { tierId } = req.params;
    
    const [existing] = await db
      .select()
      .from(payrollAddonTiers)
      .where(eq(payrollAddonTiers.id, tierId))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ error: "Tier not found" });
    }

    if (!canAdminManageCountry(req, existing.countryCode)) {
      return res.status(403).json({ error: "You do not have permission to manage add-ons for this country" });
    }

    const parsed = updateTierSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid request body", details: parsed.error.errors });
    }

    const [updated] = await db
      .update(payrollAddonTiers)
      .set({
        ...parsed.data,
        updatedAt: new Date(),
      })
      .where(eq(payrollAddonTiers.id, tierId))
      .returning();

    auditService.logFromRequest("update_payroll_tier", req, "payroll_addon_tier");

    res.json(updated);
  } catch (error) {
    console.error("[admin/addons] Error updating payroll tier:", error);
    res.status(500).json({ error: "Failed to update payroll tier" });
  }
});

router.delete("/payroll/tiers/:tierId", requiredAuth, requirePlatformAdmin("SUPER_ADMIN"), async (req, res) => {
  try {
    const { tierId } = req.params;
    
    const [existing] = await db
      .select()
      .from(payrollAddonTiers)
      .where(eq(payrollAddonTiers.id, tierId))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ error: "Tier not found" });
    }

    if (!canAdminManageCountry(req, existing.countryCode)) {
      return res.status(403).json({ error: "You do not have permission to manage add-ons for this country" });
    }

    const [activeSubscriptions] = await db
      .select({ count: count() })
      .from(tenantPayrollAddon)
      .where(
        and(
          eq(tenantPayrollAddon.tierId, tierId),
          eq(tenantPayrollAddon.enabled, true)
        )
      );

    if (activeSubscriptions.count > 0) {
      return res.status(409).json({ 
        error: "Cannot delete tier with active subscriptions",
        activeCount: activeSubscriptions.count
      });
    }

    await db.delete(payrollAddonTiers).where(eq(payrollAddonTiers.id, tierId));

    auditService.logFromRequest("delete_payroll_tier", req, "payroll_addon_tier");

    res.json({ success: true, message: "Tier deleted successfully" });
  } catch (error) {
    console.error("[admin/addons] Error deleting payroll tier:", error);
    res.status(500).json({ error: "Failed to delete payroll tier" });
  }
});

router.get("/payroll/subscriptions", requiredAuth, requirePlatformAdmin(), async (req, res) => {
  try {
    const countryCode = req.query.country as string | undefined;
    const status = req.query.status as string | undefined;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const conditions = [];
    
    if (status) {
      conditions.push(eq(tenantPayrollAddon.subscriptionStatus, status));
    }

    const subscriptions = await db
      .select({
        addon: tenantPayrollAddon,
        tier: payrollAddonTiers,
      })
      .from(tenantPayrollAddon)
      .leftJoin(payrollAddonTiers, eq(tenantPayrollAddon.tierId, payrollAddonTiers.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(tenantPayrollAddon.createdAt))
      .limit(limit)
      .offset((page - 1) * limit);

    const [totalResult] = await db
      .select({ count: count() })
      .from(tenantPayrollAddon)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    res.json({
      subscriptions,
      pagination: {
        page,
        limit,
        total: totalResult.count,
        totalPages: Math.ceil(totalResult.count / limit),
      },
    });
  } catch (error) {
    console.error("[admin/addons] Error fetching payroll subscriptions:", error);
    res.status(500).json({ error: "Failed to fetch payroll subscriptions" });
  }
});

router.get("/bundle-discounts", requiredAuth, requirePlatformAdmin(), async (req, res) => {
  try {
    const countryCode = req.query.country as string | undefined;
    
    const conditions = [];
    if (countryCode) {
      conditions.push(eq(bundleDiscounts.countryCode, countryCode.toUpperCase()));
    }

    const discounts = await db
      .select({
        discount: bundleDiscounts,
        tier: payrollAddonTiers,
      })
      .from(bundleDiscounts)
      .leftJoin(payrollAddonTiers, eq(bundleDiscounts.addonTierId, payrollAddonTiers.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(bundleDiscounts.countryCode, bundleDiscounts.planCode);

    res.json(discounts);
  } catch (error) {
    console.error("[admin/addons] Error fetching bundle discounts:", error);
    res.status(500).json({ error: "Failed to fetch bundle discounts" });
  }
});

router.post("/bundle-discounts", requiredAuth, requirePlatformAdmin("SUPER_ADMIN"), async (req, res) => {
  try {
    const parsed = createBundleDiscountSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid request body", details: parsed.error.errors });
    }

    const { countryCode, ...discountData } = parsed.data;

    if (!canAdminManageCountry(req, countryCode)) {
      return res.status(403).json({ error: "You do not have permission to manage discounts for this country" });
    }

    const [discount] = await db.insert(bundleDiscounts).values({
      ...discountData,
      countryCode: countryCode.toUpperCase(),
      isActive: discountData.isActive ?? true,
    }).returning();

    auditService.logFromRequest("create_bundle_discount", req, "bundle_discount");

    res.status(201).json(discount);
  } catch (error) {
    console.error("[admin/addons] Error creating bundle discount:", error);
    res.status(500).json({ error: "Failed to create bundle discount" });
  }
});

router.get("/payroll/stats", requiredAuth, requirePlatformAdmin(), async (req, res) => {
  try {
    const countryCode = req.query.country as string | undefined;

    const tierStats = await db
      .select({
        countryCode: payrollAddonTiers.countryCode,
        tierCount: count(),
      })
      .from(payrollAddonTiers)
      .where(countryCode ? eq(payrollAddonTiers.countryCode, countryCode.toUpperCase()) : undefined)
      .groupBy(payrollAddonTiers.countryCode);

    const subscriptionStats = await db
      .select({
        status: tenantPayrollAddon.subscriptionStatus,
        count: count(),
      })
      .from(tenantPayrollAddon)
      .groupBy(tenantPayrollAddon.subscriptionStatus);

    const revenueByCountry = await db
      .select({
        countryCode: payrollAddonTiers.countryCode,
        activeCount: count(),
      })
      .from(tenantPayrollAddon)
      .leftJoin(payrollAddonTiers, eq(tenantPayrollAddon.tierId, payrollAddonTiers.id))
      .where(eq(tenantPayrollAddon.enabled, true))
      .groupBy(payrollAddonTiers.countryCode);

    res.json({
      tiersByCountry: tierStats,
      subscriptionsByStatus: subscriptionStats,
      activeByCountry: revenueByCountry,
    });
  } catch (error) {
    console.error("[admin/addons] Error fetching payroll stats:", error);
    res.status(500).json({ error: "Failed to fetch payroll stats" });
  }
});

export default router;
