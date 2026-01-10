import { BasePaymentAdapter } from "./base-adapter";
import type {
  PaymentGatewayType,
  CreatePaymentParams,
  PaymentIntent,
  PaymentStatus,
  RefundParams,
  RefundResult,
  NormalizedWebhookEvent,
  SubscriptionCreateParams,
  SubscriptionResult,
  Currency,
} from "../types";

export class StripeAdapter extends BasePaymentAdapter {
  name: PaymentGatewayType = "stripe";
  private stripe: any = null;

  protected async onInitialize(): Promise<void> {
    if (!this.config?.apiKey) {
      console.warn("Stripe API key not configured - gateway will be unavailable");
      return;
    }
    
    try {
      // @ts-ignore - stripe is an optional peer dependency
      const Stripe = (await import("stripe")).default;
      this.stripe = new Stripe(this.config.apiKey, {
        apiVersion: "2024-11-20.acacia",
      });
    } catch (error) {
      console.error("Failed to initialize Stripe:", error);
    }
  }

  isConfigured(): boolean {
    return super.isConfigured() && this.stripe !== null;
  }

  async createPayment(params: CreatePaymentParams): Promise<PaymentIntent> {
    this.ensureInitialized();
    
    if (!this.stripe) {
      throw new Error("Stripe not initialized");
    }

    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(params.amount * 100),
        currency: params.currency.toLowerCase(),
        description: params.description,
        metadata: {
          tenantId: params.tenantId,
          invoiceId: params.invoiceId || "",
          ...params.metadata,
        },
        receipt_email: params.customerEmail,
      });

      return {
        id: this.generateTransactionId(),
        amount: params.amount,
        currency: params.currency,
        status: this.mapStripeStatus(paymentIntent.status),
        gatewayPaymentId: paymentIntent.id,
        clientSecret: paymentIntent.client_secret,
      };
    } catch (error: any) {
      console.error("Stripe createPayment error:", error);
      return {
        id: this.generateTransactionId(),
        amount: params.amount,
        currency: params.currency,
        status: "failed",
        metadata: { error: error.message },
      };
    }
  }

  async getPaymentStatus(gatewayPaymentId: string): Promise<PaymentStatus> {
    this.ensureInitialized();
    
    if (!this.stripe) {
      throw new Error("Stripe not initialized");
    }

    try {
      const paymentIntent = await this.stripe.paymentIntents.retrieve(gatewayPaymentId);
      
      return {
        id: gatewayPaymentId,
        status: this.mapStripeStatus(paymentIntent.status),
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency.toUpperCase() as Currency,
        paidAt: paymentIntent.status === "succeeded" ? new Date() : undefined,
      };
    } catch (error: any) {
      return {
        id: gatewayPaymentId,
        status: "failed",
        amount: 0,
        currency: "USD",
        errorCode: error.code,
        errorMessage: error.message,
      };
    }
  }

  async refund(params: RefundParams): Promise<RefundResult> {
    this.ensureInitialized();
    
    if (!this.stripe) {
      throw new Error("Stripe not initialized");
    }

    try {
      const refund = await this.stripe.refunds.create({
        payment_intent: params.paymentId,
        amount: params.amount ? Math.round(params.amount * 100) : undefined,
        reason: params.reason as any,
      });

      return {
        id: this.generateTransactionId(),
        paymentId: params.paymentId,
        amount: refund.amount / 100,
        status: refund.status === "succeeded" ? "succeeded" : "pending",
        gatewayRefundId: refund.id,
      };
    } catch (error: any) {
      return {
        id: this.generateTransactionId(),
        paymentId: params.paymentId,
        amount: params.amount || 0,
        status: "failed",
      };
    }
  }

  async createSubscription(params: SubscriptionCreateParams): Promise<SubscriptionResult> {
    this.ensureInitialized();
    
    if (!this.stripe) {
      throw new Error("Stripe not initialized");
    }

    const customer = await this.stripe.customers.create({
      email: params.customerEmail,
      name: params.customerName,
      metadata: {
        tenantId: params.tenantId,
        planId: params.planId,
      },
    });

    const subscription = await this.stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: params.planId }],
      trial_period_days: params.trialDays,
      metadata: {
        tenantId: params.tenantId,
        ...params.metadata,
      },
    });

    return {
      id: this.generateTransactionId(),
      gatewaySubscriptionId: subscription.id,
      status: this.mapStripeSubscriptionStatus(subscription.status),
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    };
  }

  async cancelSubscription(gatewaySubscriptionId: string): Promise<boolean> {
    this.ensureInitialized();
    
    if (!this.stripe) {
      throw new Error("Stripe not initialized");
    }

    try {
      await this.stripe.subscriptions.cancel(gatewaySubscriptionId);
      return true;
    } catch (error) {
      console.error("Stripe cancelSubscription error:", error);
      return false;
    }
  }

  async verifyWebhookSignature(payload: string | Buffer, signature: string): Promise<boolean> {
    if (!this.stripe || !this.config?.webhookSecret) {
      return false;
    }

    try {
      this.stripe.webhooks.constructEvent(payload, signature, this.config.webhookSecret);
      return true;
    } catch (error) {
      console.error("Stripe webhook signature verification failed:", error);
      return false;
    }
  }

  normalizeWebhookEvent(payload: Record<string, unknown>): NormalizedWebhookEvent {
    const event = payload as any;
    const eventType = event.type as string;
    const data = event.data?.object || {};

    let type: NormalizedWebhookEvent["type"] = "unknown";
    
    if (eventType === "payment_intent.succeeded") {
      type = "payment.succeeded";
    } else if (eventType === "payment_intent.payment_failed") {
      type = "payment.failed";
    } else if (eventType === "customer.subscription.deleted") {
      type = "subscription.cancelled";
    } else if (eventType === "charge.refunded") {
      type = "refund.completed";
    } else if (eventType === "invoice.paid") {
      type = "invoice.paid";
    }

    return {
      type,
      gatewayEventId: event.id,
      gatewayPaymentId: data.id,
      gatewaySubscriptionId: data.subscription,
      gatewayInvoiceId: data.invoice,
      amount: data.amount ? data.amount / 100 : undefined,
      currency: data.currency?.toUpperCase(),
      tenantId: data.metadata?.tenantId,
      metadata: data.metadata,
      rawPayload: payload,
    };
  }

  private mapStripeStatus(status: string): PaymentIntent["status"] {
    switch (status) {
      case "succeeded":
        return "succeeded";
      case "processing":
        return "processing";
      case "canceled":
        return "cancelled";
      case "requires_payment_method":
      case "requires_confirmation":
      case "requires_action":
        return "pending";
      default:
        return "pending";
    }
  }

  private mapStripeSubscriptionStatus(status: string): SubscriptionResult["status"] {
    switch (status) {
      case "active":
        return "active";
      case "trialing":
        return "trialing";
      case "past_due":
        return "past_due";
      case "canceled":
      case "incomplete_expired":
        return "cancelled";
      default:
        return "active";
    }
  }
}
