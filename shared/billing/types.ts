export type BillingCycleKey = "monthly" | "quarterly" | "half_yearly" | "yearly";

export interface BillingCycleConfig {
  price: number;
  enabled: boolean;
  badge?: string;
}

export type BillingCyclesMap = Partial<Record<BillingCycleKey, BillingCycleConfig>>;

export interface QuoteRequest {
  planCode: string;
  billingCycle: BillingCycleKey;
  couponCode?: string;
  countryCode?: string;
}

export interface QuoteBreakdown {
  basePrice: number;
  cyclePrice: number;
  offerDiscount: number;
  couponDiscount: number;
  discountDescription?: string;
}

export interface QuoteResponse {
  planCode: string;
  planName: string;
  billingCycle: BillingCycleKey;
  subtotal: number;
  discount: number;
  total: number;
  currencyCode: string;
  breakdown: QuoteBreakdown;
  effectivePricePerMonth: number;
  amountInPaise: number;
  appliedOffer?: {
    id: string;
    name: string;
    type: "PERCENT" | "FLAT";
    value: number;
  };
  appliedCoupon?: {
    code: string;
    discount: number;
  };
}

export interface PlanWithCycles {
  id: string;
  code: string;
  name: string;
  description?: string;
  tier: string;
  basePrice: number;
  currencyCode: string;
  billingCycles: BillingCyclesMap;
  maxUsers: number;
  features: unknown[];
  featureFlags: Record<string, boolean>;
  limits: Record<string, number>;
  isRecommended: boolean;
  sortOrder: number;
}

export const CYCLE_MONTHS: Record<BillingCycleKey, number> = {
  monthly: 1,
  quarterly: 3,
  half_yearly: 6,
  yearly: 12,
};

export const CYCLE_LABELS: Record<BillingCycleKey, { en: string; hi: string }> = {
  monthly: { en: "Monthly", hi: "मासिक" },
  quarterly: { en: "Quarterly", hi: "त्रैमासिक" },
  half_yearly: { en: "Half-Yearly", hi: "अर्धवार्षिक" },
  yearly: { en: "Yearly", hi: "वार्षिक" },
};

export function calculateSavings(
  monthlyPrice: number,
  cyclePrice: number,
  cycleMonths: number
): { amount: number; percent: number } {
  const expectedPrice = monthlyPrice * cycleMonths;
  const savings = expectedPrice - cyclePrice;
  const percent = expectedPrice > 0 ? Math.round((savings / expectedPrice) * 100) : 0;
  return { amount: savings, percent };
}
