import Razorpay from "razorpay";
import crypto from "crypto";

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || "";
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || "";
const RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || "";

let razorpayInstance: Razorpay | null = null;

function getRazorpayInstance(): Razorpay {
  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
    throw new Error("Razorpay credentials not configured");
  }
  
  if (!razorpayInstance) {
    razorpayInstance = new Razorpay({
      key_id: RAZORPAY_KEY_ID,
      key_secret: RAZORPAY_KEY_SECRET,
    });
  }
  
  return razorpayInstance;
}

export function isRazorpayConfigured(): boolean {
  return Boolean(RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET);
}

export function getRazorpayKeyId(): string {
  return RAZORPAY_KEY_ID;
}

export interface CreateOrderParams {
  amount: number;
  currency: string;
  receipt: string;
  notes?: Record<string, string>;
}

export interface RazorpayOrder {
  id: string;
  entity: string;
  amount: number;
  amount_paid: number;
  amount_due: number;
  currency: string;
  receipt: string;
  status: string;
  created_at: number;
}

export async function createOrder(params: CreateOrderParams): Promise<RazorpayOrder> {
  const razorpay = getRazorpayInstance();
  
  const order = await razorpay.orders.create({
    amount: params.amount,
    currency: params.currency,
    receipt: params.receipt,
    notes: params.notes || {},
  });
  
  return order as RazorpayOrder;
}

export interface VerifySignatureParams {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export function verifyPaymentSignature(params: VerifySignatureParams): boolean {
  if (!RAZORPAY_KEY_SECRET) {
    throw new Error("Razorpay key secret not configured");
  }
  
  const body = params.razorpay_order_id + "|" + params.razorpay_payment_id;
  const expectedSignature = crypto
    .createHmac("sha256", RAZORPAY_KEY_SECRET)
    .update(body)
    .digest("hex");
  
  return expectedSignature === params.razorpay_signature;
}

export function verifyWebhookSignature(body: string, signature: string): boolean {
  if (!RAZORPAY_WEBHOOK_SECRET) {
    console.warn("[razorpay] Webhook secret not configured");
    return false;
  }
  
  const expectedSignature = crypto
    .createHmac("sha256", RAZORPAY_WEBHOOK_SECRET)
    .update(body)
    .digest("hex");
  
  return expectedSignature === signature;
}

export async function fetchPayment(paymentId: string) {
  const razorpay = getRazorpayInstance();
  return razorpay.payments.fetch(paymentId);
}

// Subscription Management
export interface CreatePlanParams {
  period: "daily" | "weekly" | "monthly" | "yearly";
  interval: number;
  item: {
    name: string;
    amount: number;
    currency: string;
    description?: string;
  };
  notes?: Record<string, string>;
}

export interface RazorpayPlan {
  id: string;
  entity: string;
  interval: number;
  period: string;
  item: {
    id: string;
    active: boolean;
    amount: number;
    unit_amount: number;
    currency: string;
    name: string;
    description: string | null;
  };
  notes: Record<string, string>;
  created_at: number;
}

export async function createPlan(params: CreatePlanParams): Promise<RazorpayPlan> {
  const razorpay = getRazorpayInstance();
  const plan = await razorpay.plans.create({
    period: params.period,
    interval: params.interval,
    item: params.item,
    notes: params.notes || {},
  });
  return plan as RazorpayPlan;
}

export async function fetchPlan(planId: string): Promise<RazorpayPlan> {
  const razorpay = getRazorpayInstance();
  return razorpay.plans.fetch(planId) as Promise<RazorpayPlan>;
}

export interface CreateSubscriptionParams {
  plan_id: string;
  total_count: number;
  quantity?: number;
  customer_notify?: 0 | 1;
  start_at?: number;
  expire_by?: number;
  notes?: Record<string, string>;
  offer_id?: string;
}

export interface RazorpaySubscription {
  id: string;
  entity: string;
  plan_id: string;
  status: "created" | "authenticated" | "active" | "pending" | "halted" | "cancelled" | "completed" | "expired";
  current_start: number | null;
  current_end: number | null;
  ended_at: number | null;
  quantity: number;
  notes: Record<string, string>;
  charge_at: number | null;
  short_url: string;
  has_scheduled_changes: boolean;
  created_at: number;
  total_count: number;
  paid_count: number;
  remaining_count: string | number | null;
  auth_attempts: number;
}

export async function createSubscription(params: CreateSubscriptionParams): Promise<RazorpaySubscription> {
  const razorpay = getRazorpayInstance();
  const subscription = await razorpay.subscriptions.create({
    plan_id: params.plan_id,
    total_count: params.total_count,
    quantity: params.quantity || 1,
    customer_notify: params.customer_notify ?? 1,
    start_at: params.start_at,
    expire_by: params.expire_by,
    notes: params.notes || {},
    offer_id: params.offer_id,
  });
  return subscription as RazorpaySubscription;
}

export async function fetchSubscription(subscriptionId: string): Promise<RazorpaySubscription> {
  const razorpay = getRazorpayInstance();
  return razorpay.subscriptions.fetch(subscriptionId) as Promise<RazorpaySubscription>;
}

export async function cancelSubscription(subscriptionId: string, cancelAtCycleEnd: boolean = true): Promise<RazorpaySubscription> {
  const razorpay = getRazorpayInstance();
  return razorpay.subscriptions.cancel(subscriptionId, cancelAtCycleEnd) as Promise<RazorpaySubscription>;
}

export async function pauseSubscription(subscriptionId: string): Promise<RazorpaySubscription> {
  const razorpay = getRazorpayInstance();
  return razorpay.subscriptions.pause(subscriptionId) as Promise<RazorpaySubscription>;
}

export async function resumeSubscription(subscriptionId: string): Promise<RazorpaySubscription> {
  const razorpay = getRazorpayInstance();
  return razorpay.subscriptions.resume(subscriptionId) as Promise<RazorpaySubscription>;
}

export async function updateSubscription(
  subscriptionId: string,
  params: { plan_id?: string; quantity?: number; offer_id?: string; remaining_count?: number }
): Promise<RazorpaySubscription> {
  const razorpay = getRazorpayInstance();
  return razorpay.subscriptions.update(subscriptionId, params) as Promise<RazorpaySubscription>;
}

export const razorpayService = {
  isConfigured: isRazorpayConfigured,
  getKeyId: getRazorpayKeyId,
  createOrder,
  verifyPaymentSignature,
  verifyWebhookSignature,
  fetchPayment,
  // Plan management
  createPlan,
  fetchPlan,
  // Subscription management
  createSubscription,
  fetchSubscription,
  cancelSubscription,
  pauseSubscription,
  resumeSubscription,
  updateSubscription,
};
