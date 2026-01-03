import type { CountryPricingConfig, TenantSubscription, SubscriptionInvoice } from "@shared/schema";

export type PaymentGatewayType = "stripe" | "razorpay" | "paytabs" | "billplz";
export type Currency = "INR" | "AED" | "GBP" | "MYR" | "SGD" | "USD";
export type TenantCountry = "india" | "uae" | "uk" | "malaysia" | "singapore";

export interface PaymentIntent {
  id: string;
  amount: number;
  currency: Currency;
  status: "pending" | "processing" | "succeeded" | "failed" | "cancelled";
  gatewayPaymentId?: string;
  clientSecret?: string;
  redirectUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface CreatePaymentParams {
  tenantId: string;
  invoiceId?: string;
  amount: number;
  currency: Currency;
  description?: string;
  customerEmail?: string;
  customerName?: string;
  metadata?: Record<string, unknown>;
  returnUrl?: string;
  webhookUrl?: string;
}

export interface RefundParams {
  paymentId: string;
  amount?: number;
  reason?: string;
}

export interface RefundResult {
  id: string;
  paymentId: string;
  amount: number;
  status: "pending" | "succeeded" | "failed";
  gatewayRefundId?: string;
}

export interface PaymentStatus {
  id: string;
  status: "pending" | "processing" | "succeeded" | "failed" | "cancelled" | "refunded";
  amount: number;
  currency: Currency;
  paidAt?: Date;
  errorCode?: string;
  errorMessage?: string;
}

export interface WebhookEvent {
  gateway: PaymentGatewayType;
  eventId: string;
  eventType: string;
  payload: Record<string, unknown>;
  signature?: string;
}

export interface NormalizedWebhookEvent {
  type: "payment.succeeded" | "payment.failed" | "subscription.cancelled" | "refund.completed" | "invoice.paid" | "unknown";
  gatewayEventId: string;
  gatewayPaymentId?: string;
  gatewaySubscriptionId?: string;
  gatewayInvoiceId?: string;
  amount?: number;
  currency?: Currency;
  tenantId?: string;
  metadata?: Record<string, unknown>;
  rawPayload: Record<string, unknown>;
}

export interface SubscriptionCreateParams {
  tenantId: string;
  planId: string;
  country: TenantCountry;
  customerEmail: string;
  customerName?: string;
  trialDays?: number;
  metadata?: Record<string, unknown>;
}

export interface SubscriptionResult {
  id: string;
  gatewaySubscriptionId: string;
  status: "active" | "trialing" | "past_due" | "cancelled";
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
}

export interface GatewayConfig {
  apiKey: string;
  secretKey?: string;
  webhookSecret?: string;
  merchantId?: string;
  sandbox?: boolean;
  additionalConfig?: Record<string, unknown>;
}

export interface PaymentGateway {
  name: PaymentGatewayType;
  
  initialize(config: GatewayConfig): Promise<void>;
  
  createPayment(params: CreatePaymentParams): Promise<PaymentIntent>;
  
  getPaymentStatus(gatewayPaymentId: string): Promise<PaymentStatus>;
  
  refund(params: RefundParams): Promise<RefundResult>;
  
  createSubscription?(params: SubscriptionCreateParams): Promise<SubscriptionResult>;
  
  cancelSubscription?(gatewaySubscriptionId: string): Promise<boolean>;
  
  verifyWebhookSignature(payload: string | Buffer, signature: string): Promise<boolean>;
  
  normalizeWebhookEvent(payload: Record<string, unknown>): NormalizedWebhookEvent;
  
  isConfigured(): boolean;
}

export interface CountryGatewayMapping {
  country: TenantCountry;
  primaryGateway: PaymentGatewayType;
  fallbackGateway?: PaymentGatewayType;
  currency: Currency;
  taxName: string;
  taxRate: number;
}
