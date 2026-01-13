import { db } from "../db";
import { 
  billingOffers, offerRedemptions, globalPricingPlans,
  type BillingOffer, type InsertBillingOffer,
  type OfferRedemption, type InsertOfferRedemption,
} from "@shared/schema";
import { eq, and, gte, lte, sql, isNull, or } from "drizzle-orm";
import type { 
  BillingCycleKey, BillingCyclesMap, QuoteRequest, QuoteResponse, QuoteBreakdown,
  CYCLE_MONTHS 
} from "@shared/billing/types";

const CYCLE_MONTH_COUNT: Record<BillingCycleKey, number> = {
  monthly: 1,
  quarterly: 3,
  half_yearly: 6,
  yearly: 12,
};

export class OfferService {
  async createOffer(data: InsertBillingOffer): Promise<BillingOffer> {
    const [offer] = await db.insert(billingOffers).values(data).returning();
    return offer;
  }

  async updateOffer(id: string, data: Partial<InsertBillingOffer>): Promise<BillingOffer | null> {
    const [offer] = await db
      .update(billingOffers)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(billingOffers.id, id))
      .returning();
    return offer || null;
  }

  async deleteOffer(id: string): Promise<boolean> {
    const result = await db.delete(billingOffers).where(eq(billingOffers.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async getOfferById(id: string): Promise<BillingOffer | null> {
    const [offer] = await db
      .select()
      .from(billingOffers)
      .where(eq(billingOffers.id, id))
      .limit(1);
    return offer || null;
  }

  async getAllOffers(): Promise<BillingOffer[]> {
    return db.select().from(billingOffers).orderBy(billingOffers.createdAt);
  }

  async getActiveOffers(countryCode?: string, planCode?: string, billingCycle?: BillingCycleKey): Promise<BillingOffer[]> {
    const now = new Date();
    const conditions = [
      eq(billingOffers.isActive, true),
      or(isNull(billingOffers.validFrom), lte(billingOffers.validFrom, now)),
      or(isNull(billingOffers.validTo), gte(billingOffers.validTo, now)),
    ];

    if (countryCode) {
      conditions.push(or(isNull(billingOffers.countryCode), eq(billingOffers.countryCode, countryCode)));
    }
    if (planCode) {
      conditions.push(or(isNull(billingOffers.planCode), eq(billingOffers.planCode, planCode)));
    }
    if (billingCycle) {
      conditions.push(or(isNull(billingOffers.billingCycle), eq(billingOffers.billingCycle, billingCycle)));
    }

    return db
      .select()
      .from(billingOffers)
      .where(and(...conditions));
  }

  async getOfferByCoupon(couponCode: string): Promise<BillingOffer | null> {
    const now = new Date();
    const [offer] = await db
      .select()
      .from(billingOffers)
      .where(and(
        sql`LOWER(${billingOffers.couponCode}) = LOWER(${couponCode})`,
        eq(billingOffers.isActive, true),
        or(isNull(billingOffers.validFrom), lte(billingOffers.validFrom, now)),
        or(isNull(billingOffers.validTo), gte(billingOffers.validTo, now)),
      ))
      .limit(1);
    return offer || null;
  }

  async canRedeemOffer(offerId: string, tenantId: string): Promise<{ canRedeem: boolean; reason?: string }> {
    const offer = await this.getOfferById(offerId);
    if (!offer) return { canRedeem: false, reason: "Offer not found" };
    if (!offer.isActive) return { canRedeem: false, reason: "Offer is not active" };

    const now = new Date();
    if (offer.validFrom && offer.validFrom > now) {
      return { canRedeem: false, reason: "Offer not yet valid" };
    }
    if (offer.validTo && offer.validTo < now) {
      return { canRedeem: false, reason: "Offer has expired" };
    }

    if (offer.maxRedemptions && offer.redemptionCount && offer.redemptionCount >= offer.maxRedemptions) {
      return { canRedeem: false, reason: "Offer redemption limit reached" };
    }

    if (offer.perTenantLimit) {
      const tenantRedemptions = await db
        .select({ count: sql<number>`count(*)` })
        .from(offerRedemptions)
        .where(and(
          eq(offerRedemptions.offerId, offerId),
          eq(offerRedemptions.tenantId, tenantId)
        ));
      const count = tenantRedemptions[0]?.count || 0;
      if (count >= offer.perTenantLimit) {
        return { canRedeem: false, reason: "You have already used this offer" };
      }
    }

    return { canRedeem: true };
  }

  async recordRedemption(offerId: string, tenantId: string, subscriptionId: string | null, discountApplied: number): Promise<OfferRedemption> {
    await db
      .update(billingOffers)
      .set({ redemptionCount: sql`COALESCE(${billingOffers.redemptionCount}, 0) + 1` })
      .where(eq(billingOffers.id, offerId));

    const [redemption] = await db
      .insert(offerRedemptions)
      .values({
        offerId,
        tenantId,
        subscriptionId: subscriptionId || undefined,
        discountApplied: String(discountApplied),
      })
      .returning();
    return redemption;
  }

  calculateDiscount(offer: BillingOffer, subtotal: number): number {
    const value = parseFloat(offer.value);
    if (offer.offerType === "PERCENT") {
      return Math.round((subtotal * value) / 100 * 100) / 100;
    } else {
      return Math.min(value, subtotal);
    }
  }

  async calculateQuote(
    planCode: string,
    billingCycle: BillingCycleKey,
    countryCode: string,
    tenantId?: string,
    couponCode?: string
  ): Promise<QuoteResponse | { error: string }> {
    const [plan] = await db
      .select()
      .from(globalPricingPlans)
      .where(and(
        eq(globalPricingPlans.code, planCode),
        eq(globalPricingPlans.isActive, true)
      ))
      .limit(1);

    if (!plan) {
      return { error: "Plan not found" };
    }

    const billingCycles = (plan.billingCycles || {}) as BillingCyclesMap;
    const cycleConfig = billingCycles[billingCycle];
    
    if (!cycleConfig?.enabled) {
      return { error: `${billingCycle} billing cycle is not available for this plan` };
    }

    const basePrice = parseFloat(plan.basePrice);
    const cyclePrice = cycleConfig.price;
    const currencyCode = plan.currencyCode || "INR";
    const cycleMonths = CYCLE_MONTH_COUNT[billingCycle];

    let subtotal = cyclePrice;
    let offerDiscount = 0;
    let couponDiscount = 0;
    let appliedOffer: QuoteResponse["appliedOffer"];
    let appliedCoupon: QuoteResponse["appliedCoupon"];
    let discountDescription: string | undefined;

    const activeOffers = await this.getActiveOffers(countryCode, planCode, billingCycle);
    const autoOffers = activeOffers.filter(o => !o.couponCode);
    
    if (autoOffers.length > 0 && tenantId) {
      const bestOffer = autoOffers.reduce((best, current) => {
        const bestDisc = best ? this.calculateDiscount(best, subtotal) : 0;
        const currDisc = this.calculateDiscount(current, subtotal);
        return currDisc > bestDisc ? current : best;
      }, null as BillingOffer | null);

      if (bestOffer) {
        const redemptionCheck = await this.canRedeemOffer(bestOffer.id, tenantId);
        if (redemptionCheck.canRedeem) {
          offerDiscount = this.calculateDiscount(bestOffer, subtotal);
          appliedOffer = {
            id: bestOffer.id,
            name: bestOffer.name,
            type: bestOffer.offerType,
            value: parseFloat(bestOffer.value),
          };
          discountDescription = bestOffer.name;
        }
      }
    }

    if (couponCode) {
      const couponOffer = await this.getOfferByCoupon(couponCode);
      if (couponOffer) {
        if (tenantId) {
          const redemptionCheck = await this.canRedeemOffer(couponOffer.id, tenantId);
          if (!redemptionCheck.canRedeem) {
            return { error: redemptionCheck.reason || "Invalid coupon" };
          }
        }

        if (couponOffer.countryCode && couponOffer.countryCode !== countryCode) {
          return { error: "Coupon not valid for your region" };
        }
        if (couponOffer.planCode && couponOffer.planCode !== planCode) {
          return { error: "Coupon not valid for this plan" };
        }
        if (couponOffer.billingCycle && couponOffer.billingCycle !== billingCycle) {
          return { error: `Coupon only valid for ${couponOffer.billingCycle} billing` };
        }

        couponDiscount = this.calculateDiscount(couponOffer, subtotal - offerDiscount);
        appliedCoupon = {
          code: couponCode.toUpperCase(),
          discount: couponDiscount,
        };
      } else {
        return { error: "Invalid or expired coupon code" };
      }
    }

    const totalDiscount = offerDiscount + couponDiscount;
    const total = Math.max(0, subtotal - totalDiscount);
    const effectivePricePerMonth = cycleMonths > 0 ? Math.round((total / cycleMonths) * 100) / 100 : total;
    const amountInPaise = Math.round(total * 100);

    const breakdown: QuoteBreakdown = {
      basePrice,
      cyclePrice,
      offerDiscount,
      couponDiscount,
      discountDescription,
    };

    return {
      planCode,
      planName: plan.name,
      billingCycle,
      subtotal,
      discount: totalDiscount,
      total,
      currencyCode,
      breakdown,
      effectivePricePerMonth,
      amountInPaise,
      appliedOffer,
      appliedCoupon,
    };
  }
}

export const offerService = new OfferService();
