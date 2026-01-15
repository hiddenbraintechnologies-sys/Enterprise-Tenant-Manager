import { Router, Request, Response } from "express";
import { db } from "../../db";
import { billingPromos, billingPromoRedemptions, insertBillingPromoSchema } from "@shared/schema";
import { eq, and, gte, lte, or, isNull, sql, desc } from "drizzle-orm";
import { z } from "zod";

const router = Router();

const validatePromoSchema = z.object({
  code: z.string().min(1),
  planId: z.string().optional(),
  addonTierId: z.string().optional(),
  cycle: z.enum(["monthly", "yearly"]).optional(),
  amount: z.number().optional()
});

interface PromoValidationResult {
  valid: boolean;
  discountAmount: number;
  finalAmount: number;
  message: string;
  promo?: {
    id: string;
    code: string;
    name: string;
    discountType: string;
    discountValue: number;
  };
}

async function validatePromo(
  code: string,
  tenantId: string | undefined,
  planId?: string,
  addonTierId?: string,
  amount?: number
): Promise<PromoValidationResult> {
  const now = new Date();

  const [promo] = await db.select()
    .from(billingPromos)
    .where(and(
      eq(billingPromos.code, code.toUpperCase()),
      eq(billingPromos.isActive, true),
      isNull(billingPromos.archivedAt)
    ))
    .limit(1);

  if (!promo) {
    return {
      valid: false,
      discountAmount: 0,
      finalAmount: amount || 0,
      message: "Invalid promo code"
    };
  }

  if (promo.startAt && promo.startAt > now) {
    return {
      valid: false,
      discountAmount: 0,
      finalAmount: amount || 0,
      message: "This promo code is not yet active"
    };
  }

  if (promo.endAt && promo.endAt < now) {
    return {
      valid: false,
      discountAmount: 0,
      finalAmount: amount || 0,
      message: "This promo code has expired"
    };
  }

  if (promo.usageLimitTotal && promo.usageCount && promo.usageCount >= promo.usageLimitTotal) {
    return {
      valid: false,
      discountAmount: 0,
      finalAmount: amount || 0,
      message: "This promo code has reached its usage limit"
    };
  }

  if (tenantId && promo.usageLimitPerTenant) {
    const tenantRedemptions = await db.select()
      .from(billingPromoRedemptions)
      .where(and(
        eq(billingPromoRedemptions.promoId, promo.id),
        eq(billingPromoRedemptions.tenantId, tenantId)
      ));

    if (tenantRedemptions.length >= promo.usageLimitPerTenant) {
      return {
        valid: false,
        discountAmount: 0,
        finalAmount: amount || 0,
        message: "You've already used this promo code"
      };
    }
  }

  if (promo.appliesTo !== "any") {
    const targetIds = (promo.targetIds as string[]) || [];
    
    if (promo.appliesTo === "plan" && planId) {
      if (targetIds.length > 0 && !targetIds.includes(planId)) {
        return {
          valid: false,
          discountAmount: 0,
          finalAmount: amount || 0,
          message: "This promo code is not valid for this plan"
        };
      }
    } else if (promo.appliesTo === "addon" && addonTierId) {
      if (targetIds.length > 0 && !targetIds.includes(addonTierId)) {
        return {
          valid: false,
          discountAmount: 0,
          finalAmount: amount || 0,
          message: "This promo code is not valid for this add-on"
        };
      }
    } else if (promo.appliesTo === "bundle") {
      if (!planId || !addonTierId) {
        return {
          valid: false,
          discountAmount: 0,
          finalAmount: amount || 0,
          message: "This promo code is only valid for plan + add-on bundles"
        };
      }
    }
  }

  if (promo.minAmount && amount && amount < promo.minAmount) {
    return {
      valid: false,
      discountAmount: 0,
      finalAmount: amount,
      message: `Minimum purchase of ₹${promo.minAmount / 100} required`
    };
  }

  let discountAmount = 0;
  const baseAmount = amount || 0;

  if (promo.discountType === "percent") {
    discountAmount = Math.floor((baseAmount * promo.discountValue) / 100);
  } else {
    discountAmount = promo.discountValue;
  }

  if (promo.maxDiscountAmount && discountAmount > promo.maxDiscountAmount) {
    discountAmount = promo.maxDiscountAmount;
  }

  discountAmount = Math.min(discountAmount, baseAmount);

  const finalAmount = baseAmount - discountAmount;

  return {
    valid: true,
    discountAmount,
    finalAmount,
    message: `Promo applied! You save ₹${discountAmount / 100}`,
    promo: {
      id: promo.id,
      code: promo.code,
      name: promo.name,
      discountType: promo.discountType || "percent",
      discountValue: promo.discountValue
    }
  };
}

router.post("/validate", async (req: Request, res: Response) => {
  try {
    const parsed = validatePromoSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ 
        valid: false,
        error: "Invalid request",
        discountAmount: 0,
        finalAmount: req.body.amount || 0,
        message: "Invalid request data"
      });
    }

    const { code, planId, addonTierId, amount } = parsed.data;
    const tenantId = (req as any).context?.tenantId;

    const result = await validatePromo(code, tenantId, planId, addonTierId, amount);
    return res.json(result);
  } catch (error: any) {
    console.error("[promos] Validation error:", error);
    return res.status(500).json({ 
      valid: false,
      discountAmount: 0,
      finalAmount: req.body.amount || 0,
      message: "Error validating promo code"
    });
  }
});

export default router;

export { validatePromo };
