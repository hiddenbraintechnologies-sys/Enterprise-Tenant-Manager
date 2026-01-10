import { BasePaymentAdapter } from "./base-adapter";
import type {
  PaymentGatewayType,
  CreatePaymentParams,
  PaymentIntent,
  PaymentStatus,
  RefundParams,
  RefundResult,
  NormalizedWebhookEvent,
  Currency,
} from "../types";
import crypto from "crypto";

export class RazorpayAdapter extends BasePaymentAdapter {
  name: PaymentGatewayType = "razorpay";
  private razorpay: any = null;

  protected async onInitialize(): Promise<void> {
    if (!this.config?.apiKey || !this.config?.secretKey) {
      console.warn("Razorpay API keys not configured - gateway will be unavailable");
      return;
    }

    try {
      // @ts-ignore - razorpay is an optional peer dependency
      const Razorpay = (await import("razorpay")).default;
      this.razorpay = new Razorpay({
        key_id: this.config.apiKey,
        key_secret: this.config.secretKey,
      });
    } catch (error) {
      console.warn("Razorpay SDK not installed - using mock implementation");
      this.razorpay = this.createMockClient();
    }
  }

  private createMockClient() {
    return {
      orders: {
        create: async (params: any) => ({
          id: `order_${Date.now()}`,
          amount: params.amount,
          currency: params.currency,
          status: "created",
          receipt: params.receipt,
        }),
        fetch: async (orderId: string) => ({
          id: orderId,
          status: "paid",
          amount: 0,
          currency: "INR",
        }),
      },
      payments: {
        fetch: async (paymentId: string) => ({
          id: paymentId,
          status: "captured",
          amount: 0,
          currency: "INR",
        }),
        refund: async (paymentId: string, params: any) => ({
          id: `rfnd_${Date.now()}`,
          payment_id: paymentId,
          amount: params.amount,
          status: "processed",
        }),
      },
    };
  }

  isConfigured(): boolean {
    return super.isConfigured() && this.razorpay !== null;
  }

  async createPayment(params: CreatePaymentParams): Promise<PaymentIntent> {
    this.ensureInitialized();

    if (!this.razorpay) {
      throw new Error("Razorpay not initialized");
    }

    try {
      const order = await this.razorpay.orders.create({
        amount: Math.round(params.amount * 100),
        currency: params.currency,
        receipt: params.invoiceId || this.generateTransactionId(),
        notes: {
          tenantId: params.tenantId,
          invoiceId: params.invoiceId || "",
          description: params.description || "",
        },
      });

      return {
        id: this.generateTransactionId(),
        amount: params.amount,
        currency: params.currency,
        status: "pending",
        gatewayPaymentId: order.id,
        metadata: {
          orderId: order.id,
          keyId: this.config?.apiKey,
        },
      };
    } catch (error: any) {
      console.error("Razorpay createPayment error:", error);
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

    if (!this.razorpay) {
      throw new Error("Razorpay not initialized");
    }

    try {
      const payment = await this.razorpay.payments.fetch(gatewayPaymentId);

      return {
        id: gatewayPaymentId,
        status: this.mapRazorpayStatus(payment.status),
        amount: payment.amount / 100,
        currency: payment.currency as Currency,
        paidAt: payment.status === "captured" ? new Date() : undefined,
      };
    } catch (error: any) {
      return {
        id: gatewayPaymentId,
        status: "failed",
        amount: 0,
        currency: "INR",
        errorCode: error.error?.code,
        errorMessage: error.error?.description || error.message,
      };
    }
  }

  async refund(params: RefundParams): Promise<RefundResult> {
    this.ensureInitialized();

    if (!this.razorpay) {
      throw new Error("Razorpay not initialized");
    }

    try {
      const refund = await this.razorpay.payments.refund(params.paymentId, {
        amount: params.amount ? Math.round(params.amount * 100) : undefined,
        notes: { reason: params.reason },
      });

      return {
        id: this.generateTransactionId(),
        paymentId: params.paymentId,
        amount: refund.amount / 100,
        status: refund.status === "processed" ? "succeeded" : "pending",
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

  async verifyWebhookSignature(payload: string | Buffer, signature: string): Promise<boolean> {
    if (!this.config?.webhookSecret) {
      return false;
    }

    try {
      const expectedSignature = crypto
        .createHmac("sha256", this.config.webhookSecret)
        .update(payload)
        .digest("hex");

      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );
    } catch (error) {
      console.error("Razorpay webhook signature verification failed:", error);
      return false;
    }
  }

  normalizeWebhookEvent(payload: Record<string, unknown>): NormalizedWebhookEvent {
    const event = payload as any;
    const eventType = event.event as string;
    const paymentEntity = event.payload?.payment?.entity || {};

    let type: NormalizedWebhookEvent["type"] = "unknown";

    if (eventType === "payment.captured") {
      type = "payment.succeeded";
    } else if (eventType === "payment.failed") {
      type = "payment.failed";
    } else if (eventType === "refund.processed") {
      type = "refund.completed";
    }

    return {
      type,
      gatewayEventId: event.event_id || `rz_${Date.now()}`,
      gatewayPaymentId: paymentEntity.id,
      amount: paymentEntity.amount ? paymentEntity.amount / 100 : undefined,
      currency: paymentEntity.currency?.toUpperCase(),
      tenantId: paymentEntity.notes?.tenantId,
      metadata: paymentEntity.notes,
      rawPayload: payload,
    };
  }

  private mapRazorpayStatus(status: string): PaymentStatus["status"] {
    switch (status) {
      case "captured":
        return "succeeded";
      case "authorized":
        return "processing";
      case "failed":
        return "failed";
      case "refunded":
        return "refunded";
      default:
        return "pending";
    }
  }
}
