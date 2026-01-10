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

interface StripeClient {
  paymentIntents: {
    create: (params: Record<string, unknown>) => Promise<Record<string, unknown>>;
    retrieve: (id: string) => Promise<Record<string, unknown>>;
  };
  refunds: {
    create: (params: Record<string, unknown>) => Promise<Record<string, unknown>>;
  };
  customers: {
    create: (params: Record<string, unknown>) => Promise<Record<string, unknown>>;
  };
  subscriptions: {
    create: (params: Record<string, unknown>) => Promise<Record<string, unknown>>;
    cancel: (id: string) => Promise<void>;
  };
  webhooks: {
    constructEvent: (payload: string | Buffer, signature: string, secret: string) => unknown;
  };
}

type StripeConstructor = new (apiKey: string, options: Record<string, unknown>) => StripeClient;

async function loadStripeModule(): Promise<StripeConstructor> {
  try {
    const module = await (Function('return import("stripe")')() as Promise<{ default: unknown }>);
    return module.default as StripeConstructor;
  } catch {
    throw new Error("Stripe adapter unavailable: install 'stripe' dependency");
  }
}

export class StripeAdapter extends BasePaymentAdapter {
  name: PaymentGatewayType = "stripe";
  private stripe: StripeClient | null = null;
  private stripeLoadError: Error | null = null;

  protected async onInitialize(): Promise<void> {
    if (!this.config?.apiKey) {
      console.warn("Stripe API key not configured - gateway will be unavailable");
      return;
    }
    
    try {
      const StripeConstructor = await loadStripeModule();
      this.stripe = new StripeConstructor(this.config.apiKey, {
        apiVersion: "2024-11-20.acacia",
      });
    } catch (error) {
      this.stripeLoadError = error instanceof Error ? error : new Error(String(error));
      console.error("Failed to initialize Stripe:", this.stripeLoadError.message);
    }
  }

  isConfigured(): boolean {
    return super.isConfigured() && this.stripe !== null;
  }

  private getStripeClient(): StripeClient {
    this.ensureInitialized();
    
    if (this.stripeLoadError) {
      throw this.stripeLoadError;
    }
    
    if (!this.stripe) {
      throw new Error("Stripe not initialized");
    }
    
    return this.stripe;
  }

  async createPayment(params: CreatePaymentParams): Promise<PaymentIntent> {
    const stripe = this.getStripeClient();

    try {
      const paymentIntent = await stripe.paymentIntents.create({
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
        status: this.mapStripeStatus(paymentIntent.status as string),
        gatewayPaymentId: paymentIntent.id as string,
        clientSecret: paymentIntent.client_secret as string | undefined,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("Stripe createPayment error:", error);
      return {
        id: this.generateTransactionId(),
        amount: params.amount,
        currency: params.currency,
        status: "failed",
        metadata: { error: errorMessage },
      };
    }
  }

  async getPaymentStatus(gatewayPaymentId: string): Promise<PaymentStatus> {
    const stripe = this.getStripeClient();

    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(gatewayPaymentId);
      
      return {
        id: gatewayPaymentId,
        status: this.mapStripeStatus(paymentIntent.status as string),
        amount: (paymentIntent.amount as number) / 100,
        currency: (paymentIntent.currency as string).toUpperCase() as Currency,
        paidAt: paymentIntent.status === "succeeded" ? new Date() : undefined,
      };
    } catch (error: unknown) {
      const err = error as { code?: string; message?: string };
      return {
        id: gatewayPaymentId,
        status: "failed",
        amount: 0,
        currency: "USD",
        errorCode: err.code,
        errorMessage: err.message,
      };
    }
  }

  async refund(params: RefundParams): Promise<RefundResult> {
    const stripe = this.getStripeClient();

    try {
      const refund = await stripe.refunds.create({
        payment_intent: params.paymentId,
        amount: params.amount ? Math.round(params.amount * 100) : undefined,
        reason: params.reason,
      });

      return {
        id: this.generateTransactionId(),
        paymentId: params.paymentId,
        amount: (refund.amount as number) / 100,
        status: refund.status === "succeeded" ? "succeeded" : "pending",
        gatewayRefundId: refund.id as string,
      };
    } catch {
      return {
        id: this.generateTransactionId(),
        paymentId: params.paymentId,
        amount: params.amount || 0,
        status: "failed",
      };
    }
  }

  async createSubscription(params: SubscriptionCreateParams): Promise<SubscriptionResult> {
    const stripe = this.getStripeClient();

    const customer = await stripe.customers.create({
      email: params.customerEmail,
      name: params.customerName,
      metadata: {
        tenantId: params.tenantId,
        planId: params.planId,
      },
    });

    const subscription = await stripe.subscriptions.create({
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
      gatewaySubscriptionId: subscription.id as string,
      status: this.mapStripeSubscriptionStatus(subscription.status as string),
      currentPeriodStart: new Date((subscription.current_period_start as number) * 1000),
      currentPeriodEnd: new Date((subscription.current_period_end as number) * 1000),
    };
  }

  async cancelSubscription(gatewaySubscriptionId: string): Promise<boolean> {
    const stripe = this.getStripeClient();

    try {
      await stripe.subscriptions.cancel(gatewaySubscriptionId);
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
    const event = payload as { type?: string; id?: string; data?: { object?: Record<string, unknown> } };
    const eventType = event.type || "";
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

    const metadata = data.metadata as Record<string, unknown> | undefined;

    return {
      type,
      gatewayEventId: event.id || "",
      gatewayPaymentId: data.id as string | undefined,
      gatewaySubscriptionId: data.subscription as string | undefined,
      gatewayInvoiceId: data.invoice as string | undefined,
      amount: typeof data.amount === "number" ? data.amount / 100 : undefined,
      currency: typeof data.currency === "string" ? data.currency.toUpperCase() as Currency : undefined,
      tenantId: metadata?.tenantId as string | undefined,
      metadata,
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

export { loadStripeModule };
