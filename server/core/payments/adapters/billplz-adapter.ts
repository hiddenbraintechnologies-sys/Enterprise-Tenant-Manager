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

export class BillplzAdapter extends BasePaymentAdapter {
  name: PaymentGatewayType = "billplz";
  private baseUrl = "https://www.billplz.com/api/v3";

  protected async onInitialize(): Promise<void> {
    if (!this.config?.apiKey) {
      console.warn("Billplz API key not configured - gateway will be unavailable");
    }
    if (this.config?.sandbox) {
      this.baseUrl = "https://www.billplz-sandbox.com/api/v3";
    }
  }

  isConfigured(): boolean {
    return super.isConfigured() && !!this.config?.apiKey;
  }

  private getAuthHeader(): string {
    return `Basic ${Buffer.from(`${this.config!.apiKey}:`).toString("base64")}`;
  }

  async createPayment(params: CreatePaymentParams): Promise<PaymentIntent> {
    this.ensureInitialized();

    try {
      const response = await fetch(`${this.baseUrl}/bills`, {
        method: "POST",
        headers: {
          "Authorization": this.getAuthHeader(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          collection_id: this.config!.merchantId,
          email: params.customerEmail,
          name: params.customerName || "Customer",
          amount: Math.round(params.amount * 100),
          description: params.description || "Subscription payment",
          callback_url: params.webhookUrl,
          redirect_url: params.returnUrl,
          reference_1_label: "Tenant ID",
          reference_1: params.tenantId,
          reference_2_label: "Invoice ID",
          reference_2: params.invoiceId,
        }),
      });

      const data = await response.json();

      if (data.id) {
        return {
          id: this.generateTransactionId(),
          amount: params.amount,
          currency: params.currency,
          status: "pending",
          gatewayPaymentId: data.id,
          redirectUrl: data.url,
        };
      }

      return {
        id: this.generateTransactionId(),
        amount: params.amount,
        currency: params.currency,
        status: "failed",
        metadata: { error: data.error?.message || "Failed to create bill" },
      };
    } catch (error: any) {
      console.error("Billplz createPayment error:", error);
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

    try {
      const response = await fetch(`${this.baseUrl}/bills/${gatewayPaymentId}`, {
        method: "GET",
        headers: {
          "Authorization": this.getAuthHeader(),
        },
      });

      const data = await response.json();

      return {
        id: gatewayPaymentId,
        status: data.paid ? "succeeded" : "pending",
        amount: data.amount / 100,
        currency: "MYR" as Currency,
        paidAt: data.paid_at ? new Date(data.paid_at) : undefined,
      };
    } catch (error: any) {
      return {
        id: gatewayPaymentId,
        status: "failed",
        amount: 0,
        currency: "MYR",
        errorMessage: error.message,
      };
    }
  }

  async refund(params: RefundParams): Promise<RefundResult> {
    console.warn("Billplz does not support programmatic refunds - manual process required");
    return {
      id: this.generateTransactionId(),
      paymentId: params.paymentId,
      amount: params.amount || 0,
      status: "pending",
    };
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
      console.error("Billplz webhook signature verification failed:", error);
      return false;
    }
  }

  normalizeWebhookEvent(payload: Record<string, unknown>): NormalizedWebhookEvent {
    const data = payload as any;
    const isPaid = data.paid === "true" || data.paid === true;

    return {
      type: isPaid ? "payment.succeeded" : "payment.failed",
      gatewayEventId: data.id || `bp_${Date.now()}`,
      gatewayPaymentId: data.id,
      amount: data.paid_amount ? parseInt(data.paid_amount) / 100 : undefined,
      currency: "MYR",
      tenantId: data.reference_1,
      metadata: {
        invoiceId: data.reference_2,
      },
      rawPayload: payload,
    };
  }
}
