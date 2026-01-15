/**
 * Payroll Add-On Billing Routes
 * 
 * Endpoints for managing payroll add-on subscriptions:
 * - GET  /tiers - List available payroll tiers
 * - GET  /status - Get tenant's payroll addon status
 * - POST /enable - Enable payroll addon (trial or paid)
 * - POST /disable - Disable payroll addon
 * - POST /upgrade-tier - Upgrade to higher tier
 * - GET  /bundle-discount - Get applicable bundle discount
 */

import { Router, Request, Response } from "express";
import { z } from "zod";
import { db } from "../../db";
import { 
  payrollAddonTiers, 
  bundleDiscounts, 
  tenantPayrollAddon,
  tenantSubscriptions,
  globalPricingPlans,
  hrEmployees,
} from "@shared/schema";
import { eq, and, sql, count } from "drizzle-orm";
import { requireMinimumRole, auditService } from "../../core";
import {
  getTierForEmployeeCount,
  getBundleDiscount,
  calculateDiscountedPrice,
  isTrialEligible,
  getTrialEndDate,
  getGraceEndDate,
  isTrialActive,
  isInGracePeriod,
  PAYROLL_TRIAL_DAYS,
} from "../../core/payroll-addon-pricing";

const router = Router();

const enablePayrollSchema = z.object({
  tierId: z.string().uuid(),
  billingCycle: z.enum(["monthly", "yearly"]).default("monthly"),
  useTrial: z.boolean().default(false),
});

const upgradeTierSchema = z.object({
  newTierId: z.string().uuid(),
});

router.get("/tiers", async (req, res) => {
  try {
    const tenantId = req.context?.tenant?.id;
    const countryCode = req.query.country as string || "IN";

    const tiers = await db
      .select()
      .from(payrollAddonTiers)
      .where(
        and(
          eq(payrollAddonTiers.countryCode, countryCode),
          eq(payrollAddonTiers.isActive, true)
        )
      )
      .orderBy(payrollAddonTiers.minEmployees);

    let employeeCount = 0;
    let recommendedTierId: string | null = null;

    if (tenantId) {
      const [result] = await db
        .select({ count: count() })
        .from(hrEmployees)
        .where(
          and(
            eq(hrEmployees.tenantId, tenantId),
            eq(hrEmployees.status, "active")
          )
        );
      employeeCount = result?.count || 0;

      const recommendedTier = await getTierForEmployeeCount(employeeCount, countryCode);
      recommendedTierId = recommendedTier?.id || null;
    }

    res.json({
      tiers,
      employeeCount,
      recommendedTierId,
    });
  } catch (error) {
    console.error("Error fetching payroll tiers:", error);
    res.status(500).json({ error: "Failed to fetch payroll tiers" });
  }
});

router.get("/status", async (req, res) => {
  try {
    const tenantId = req.context?.tenant?.id;
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant ID required" });
    }

    const [addon] = await db
      .select()
      .from(tenantPayrollAddon)
      .where(eq(tenantPayrollAddon.tenantId, tenantId))
      .limit(1);

    if (!addon) {
      const subscription = await db
        .select({ 
          planId: tenantSubscriptions.planId,
          plan: globalPricingPlans,
        })
        .from(tenantSubscriptions)
        .leftJoin(globalPricingPlans, eq(tenantSubscriptions.planId, globalPricingPlans.id))
        .where(eq(tenantSubscriptions.tenantId, tenantId))
        .limit(1);

      const planTier = subscription[0]?.plan?.tier || "free";
      const trialEligible = isTrialEligible(planTier, false);

      return res.json({
        enabled: false,
        tierId: null,
        tierName: null,
        billingCycle: null,
        price: null,
        trialActive: false,
        trialEndsAt: null,
        trialEligible,
        trialUsed: false,
        graceUntil: null,
        inGracePeriod: false,
        subscriptionStatus: "inactive",
        razorpaySubscriptionId: null,
      });
    }

    let tierName = null;
    if (addon.tierId) {
      const [tier] = await db
        .select()
        .from(payrollAddonTiers)
        .where(eq(payrollAddonTiers.id, addon.tierId))
        .limit(1);
      tierName = tier?.tierName || null;
    }

    const trialActive = isTrialActive(addon.trialEndsAt);
    const inGracePeriod = isInGracePeriod(addon.graceUntil);

    const subscription = await db
      .select({ planTier: globalPricingPlans.tier })
      .from(tenantSubscriptions)
      .leftJoin(globalPricingPlans, eq(tenantSubscriptions.planId, globalPricingPlans.id))
      .where(eq(tenantSubscriptions.tenantId, tenantId))
      .limit(1);

    const planTier = subscription[0]?.planTier || "free";
    const trialEligible = isTrialEligible(planTier, addon.trialUsed);

    res.json({
      enabled: addon.enabled,
      tierId: addon.tierId,
      tierName,
      billingCycle: addon.billingCycle,
      price: addon.price,
      discountApplied: addon.discountApplied,
      trialActive,
      trialEndsAt: addon.trialEndsAt,
      trialEligible,
      trialUsed: addon.trialUsed,
      graceUntil: addon.graceUntil,
      graceEmployeeCount: addon.graceEmployeeCount,
      inGracePeriod,
      subscriptionStatus: addon.subscriptionStatus,
      razorpaySubscriptionId: addon.razorpaySubscriptionId,
      currentPeriodStart: addon.currentPeriodStart,
      currentPeriodEnd: addon.currentPeriodEnd,
      cancelAtPeriodEnd: addon.cancelAtPeriodEnd,
    });
  } catch (error) {
    console.error("Error fetching payroll addon status:", error);
    res.status(500).json({ error: "Failed to fetch payroll addon status" });
  }
});

router.post("/enable", requireMinimumRole("admin"), async (req, res) => {
  try {
    const tenantId = req.context?.tenant?.id;
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant ID required" });
    }

    const parseResult = enablePayrollSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ 
        error: "Validation failed", 
        details: parseResult.error.flatten() 
      });
    }

    const { tierId, billingCycle, useTrial } = parseResult.data;

    const [tier] = await db
      .select()
      .from(payrollAddonTiers)
      .where(eq(payrollAddonTiers.id, tierId))
      .limit(1);

    if (!tier) {
      return res.status(404).json({ error: "Tier not found" });
    }

    const [existingAddon] = await db
      .select()
      .from(tenantPayrollAddon)
      .where(eq(tenantPayrollAddon.tenantId, tenantId))
      .limit(1);

    const subscription = await db
      .select({ 
        planId: tenantSubscriptions.planId,
        plan: globalPricingPlans,
      })
      .from(tenantSubscriptions)
      .leftJoin(globalPricingPlans, eq(tenantSubscriptions.planId, globalPricingPlans.id))
      .where(eq(tenantSubscriptions.tenantId, tenantId))
      .limit(1);

    const planTier = subscription[0]?.plan?.tier || "free";
    const planCode = subscription[0]?.plan?.code || "";

    const trialUsed = existingAddon?.trialUsed || false;
    const trialEligible = useTrial && isTrialEligible(planTier, trialUsed);

    const basePrice = billingCycle === "yearly" 
      ? parseFloat(tier.yearlyPrice) 
      : parseFloat(tier.monthlyPrice);

    let discountApplied = 0;
    let finalPrice = basePrice;

    if (!trialEligible) {
      const discount = await getBundleDiscount(planCode, tierId, tier.countryCode);
      if (discount) {
        const calculated = calculateDiscountedPrice(basePrice, discount);
        finalPrice = calculated.finalPrice;
        discountApplied = calculated.savings;
      }
    }

    const now = new Date();
    const periodEnd = new Date(now);
    if (billingCycle === "yearly") {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }

    const addonData = {
      tenantId,
      tierId,
      enabled: true,
      billingCycle,
      price: finalPrice.toFixed(2),
      discountApplied: discountApplied.toFixed(2),
      trialUsed: trialEligible ? true : trialUsed,
      trialEndsAt: trialEligible ? getTrialEndDate() : null,
      subscriptionStatus: trialEligible ? "trialing" : "pending_payment",
      currentPeriodStart: now,
      currentPeriodEnd: trialEligible ? getTrialEndDate() : periodEnd,
      updatedAt: now,
    };

    let result;
    if (existingAddon) {
      [result] = await db
        .update(tenantPayrollAddon)
        .set(addonData)
        .where(eq(tenantPayrollAddon.id, existingAddon.id))
        .returning();
    } else {
      [result] = await db
        .insert(tenantPayrollAddon)
        .values(addonData)
        .returning();
    }

    auditService.logFromRequest("enable_payroll_addon", req, "payroll_addon");

    if (!trialEligible) {
      return res.json({
        success: true,
        addon: result,
        requiresPayment: true,
        paymentDetails: {
          amount: finalPrice,
          currency: tier.currencyCode,
          billingCycle,
          tierName: tier.tierName,
          discountApplied,
        },
      });
    }

    res.json({
      success: true,
      addon: result,
      requiresPayment: false,
      trial: {
        active: true,
        endsAt: result.trialEndsAt,
        daysRemaining: PAYROLL_TRIAL_DAYS,
      },
    });
  } catch (error) {
    console.error("Error enabling payroll addon:", error);
    res.status(500).json({ error: "Failed to enable payroll addon" });
  }
});

router.post("/disable", requireMinimumRole("admin"), async (req, res) => {
  try {
    const tenantId = req.context?.tenant?.id;
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant ID required" });
    }

    const [existingAddon] = await db
      .select()
      .from(tenantPayrollAddon)
      .where(eq(tenantPayrollAddon.tenantId, tenantId))
      .limit(1);

    if (!existingAddon || !existingAddon.enabled) {
      return res.status(400).json({ error: "Payroll addon is not enabled" });
    }

    const [result] = await db
      .update(tenantPayrollAddon)
      .set({
        cancelAtPeriodEnd: true,
        updatedAt: new Date(),
      })
      .where(eq(tenantPayrollAddon.id, existingAddon.id))
      .returning();

    auditService.logFromRequest("disable_payroll_addon", req, "payroll_addon");

    res.json({
      success: true,
      addon: result,
      message: "Payroll addon will be disabled at the end of the current billing period",
      effectiveDate: result.currentPeriodEnd,
    });
  } catch (error) {
    console.error("Error disabling payroll addon:", error);
    res.status(500).json({ error: "Failed to disable payroll addon" });
  }
});

router.post("/upgrade-tier", requireMinimumRole("admin"), async (req, res) => {
  try {
    const tenantId = req.context?.tenant?.id;
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant ID required" });
    }

    const parseResult = upgradeTierSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ 
        error: "Validation failed", 
        details: parseResult.error.flatten() 
      });
    }

    const { newTierId } = parseResult.data;

    const [existingAddon] = await db
      .select()
      .from(tenantPayrollAddon)
      .where(eq(tenantPayrollAddon.tenantId, tenantId))
      .limit(1);

    if (!existingAddon || !existingAddon.enabled) {
      return res.status(400).json({ error: "Payroll addon is not enabled" });
    }

    const [newTier] = await db
      .select()
      .from(payrollAddonTiers)
      .where(eq(payrollAddonTiers.id, newTierId))
      .limit(1);

    if (!newTier) {
      return res.status(404).json({ error: "Tier not found" });
    }

    const billingCycle = existingAddon.billingCycle || "monthly";
    const newPrice = billingCycle === "yearly" 
      ? parseFloat(newTier.yearlyPrice) 
      : parseFloat(newTier.monthlyPrice);

    const [result] = await db
      .update(tenantPayrollAddon)
      .set({
        tierId: newTierId,
        price: newPrice.toFixed(2),
        graceUntil: null,
        graceEmployeeCount: null,
        updatedAt: new Date(),
      })
      .where(eq(tenantPayrollAddon.id, existingAddon.id))
      .returning();

    auditService.logFromRequest("upgrade_payroll_tier", req, "payroll_addon");

    res.json({
      success: true,
      addon: result,
      newTier: {
        id: newTier.id,
        name: newTier.tierName,
        price: newPrice,
      },
    });
  } catch (error) {
    console.error("Error upgrading payroll tier:", error);
    res.status(500).json({ error: "Failed to upgrade payroll tier" });
  }
});

router.get("/bundle-discount", async (req, res) => {
  try {
    const tenantId = req.context?.tenant?.id;
    const tierId = req.query.tierId as string;
    const countryCode = req.query.country as string || "IN";

    if (!tenantId) {
      return res.status(400).json({ error: "Tenant ID required" });
    }

    const subscription = await db
      .select({ planCode: globalPricingPlans.code })
      .from(tenantSubscriptions)
      .leftJoin(globalPricingPlans, eq(tenantSubscriptions.planId, globalPricingPlans.id))
      .where(eq(tenantSubscriptions.tenantId, tenantId))
      .limit(1);

    const planCode = subscription[0]?.planCode || "";

    const discount = await getBundleDiscount(planCode, tierId || null, countryCode);

    if (!discount) {
      return res.json({ hasDiscount: false });
    }

    res.json({
      hasDiscount: true,
      discount: {
        id: discount.id,
        name: discount.name,
        type: discount.discountType,
        amount: discount.discountAmount,
        currency: discount.currencyCode,
      },
    });
  } catch (error) {
    console.error("Error fetching bundle discount:", error);
    res.status(500).json({ error: "Failed to fetch bundle discount" });
  }
});

router.get("/check-tier-limit", async (req, res) => {
  try {
    const tenantId = req.context?.tenant?.id;
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant ID required" });
    }

    const [addon] = await db
      .select()
      .from(tenantPayrollAddon)
      .where(eq(tenantPayrollAddon.tenantId, tenantId))
      .limit(1);

    if (!addon || !addon.enabled || !addon.tierId) {
      return res.json({ 
        exceeds: false, 
        requiresUpgrade: false,
        blocked: false,
      });
    }

    const [tier] = await db
      .select()
      .from(payrollAddonTiers)
      .where(eq(payrollAddonTiers.id, addon.tierId))
      .limit(1);

    if (!tier) {
      return res.json({ 
        exceeds: false, 
        requiresUpgrade: false,
        blocked: false,
      });
    }

    const [result] = await db
      .select({ count: count() })
      .from(hrEmployees)
      .where(
        and(
          eq(hrEmployees.tenantId, tenantId),
          eq(hrEmployees.status, "active")
        )
      );

    const employeeCount = result?.count || 0;
    const exceeds = employeeCount > tier.maxEmployees;

    if (!exceeds) {
      return res.json({
        exceeds: false,
        requiresUpgrade: false,
        blocked: false,
        employeeCount,
        tierLimit: tier.maxEmployees,
      });
    }

    const inGrace = isInGracePeriod(addon.graceUntil);

    if (!inGrace && !addon.graceUntil) {
      await db
        .update(tenantPayrollAddon)
        .set({
          graceUntil: getGraceEndDate(),
          graceEmployeeCount: employeeCount,
          updatedAt: new Date(),
        })
        .where(eq(tenantPayrollAddon.id, addon.id));
    }

    const blocked = addon.graceUntil && !inGrace;

    res.json({
      exceeds: true,
      requiresUpgrade: true,
      blocked,
      employeeCount,
      tierLimit: tier.maxEmployees,
      graceUntil: addon.graceUntil || getGraceEndDate(),
      inGracePeriod: inGrace,
    });
  } catch (error) {
    console.error("Error checking tier limit:", error);
    res.status(500).json({ error: "Failed to check tier limit" });
  }
});

export default router;
