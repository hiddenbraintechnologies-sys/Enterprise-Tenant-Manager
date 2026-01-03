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

export class PayTabsAdapter extends BasePaymentAdapter {
  name: PaymentGatewayType = "paytabs";
  private baseUrl = "https://secure.paytabs.com";

  protected async onInitialize(): Promise<void> {
    if (!this.config?.apiKey || !this.config?.merchantId) {
      console.warn("PayTabs API key/merchant ID not configured - gateway will be unavailable");
    }
    if (this.config?.sandbox) {
      this.baseUrl = "https://secure-egypt.paytabs.com";
    }
  }

  isConfigured(): boolean {
    return super.isConfigured() && !!this.config?.apiKey && !!this.config?.merchantId;
  }

  async createPayment(params: CreatePaymentParams): Promise<PaymentIntent> {
    this.ensureInitialized();

    try {
      const response = await fetch(`${this.baseUrl}/payment/request`, {
        method: "POST",
        headers: {
          "Authorization": this.config!.apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          profile_id: this.config!.merchantId,
          tran_type: "sale",
          tran_class: "ecom",
          cart_id: params.invoiceId || this.generateTransactionId(),
          cart_currency: params.currency,
          cart_amount: params.amount,
          cart_description: params.description || "Subscription payment",
          customer_details: {
            name: params.customerName || "Customer",
            email: params.customerEmail,
          },
          callback: params.webhookUrl,
          return: params.returnUrl,
        }),
      });

      const data = await response.json();

      if (data.redirect_url) {
        return {
          id: this.generateTransactionId(),
          amount: params.amount,
          currency: params.currency,
          status: "pending",
          gatewayPaymentId: data.tran_ref,
          redirectUrl: data.redirect_url,
        };
      }

      return {
        id: this.generateTransactionId(),
        amount: params.amount,
        currency: params.currency,
        status: "failed",
        metadata: { error: data.message || "Failed to create payment" },
      };
    } catch (error: any) {
      console.error("PayTabs createPayment error:", error);
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
      const response = await fetch(`${this.baseUrl}/payment/query`, {
        method: "POST",
        headers: {
          "Authorization": this.config!.apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          profile_id: this.config!.merchantId,
          tran_ref: gatewayPaymentId,
        }),
      });

      const data = await response.json();

      return {
        id: gatewayPaymentId,
        status: this.mapPayTabsStatus(data.payment_result?.response_status),
        amount: parseFloat(data.cart_amount) || 0,
        currency: (data.cart_currency || "AED") as Currency,
        paidAt: data.payment_result?.response_status === "A" ? new Date() : undefined,
      };
    } catch (error: any) {
      return {
        id: gatewayPaymentId,
        status: "failed",
        amount: 0,
        currency: "AED",
        errorMessage: error.message,
      };
    }
  }

  async refund(params: RefundParams): Promise<RefundResult> {
    this.ensureInitialized();

    try {
      const response = await fetch(`${this.baseUrl}/payment/request`, {
        method: "POST",
        headers: {
          "Authorization": this.config!.apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          profile_id: this.config!.merchantId,
          tran_type: "refund",
          tran_class: "ecom",
          cart_id: this.generateTransactionId(),
          cart_currency: "AED",
          cart_amount: params.amount,
          cart_description: params.reason || "Refund",
          tran_ref: params.paymentId,
        }),
      });

      const data = await response.json();

      return {
        id: this.generateTransactionId(),
        paymentId: params.paymentId,
        amount: params.amount || 0,
        status: data.payment_result?.response_status === "A" ? "succeeded" : "failed",
        gatewayRefundId: data.tran_ref,
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
      console.error("PayTabs webhook signature verification failed:", error);
      return false;
    }
  }

  normalizeWebhookEvent(payload: Record<string, unknown>): NormalizedWebhookEvent {
    const data = payload as any;
    const status = data.payment_result?.response_status;

    let type: NormalizedWebhookEvent["type"] = "unknown";
    if (status === "A") {
      type = "payment.succeeded";
    } else if (status === "D" || status === "E") {
      type = "payment.failed";
    }

    return {
      type,
      gatewayEventId: data.tran_ref || `pt_${Date.now()}`,
      gatewayPaymentId: data.tran_ref,
      amount: parseFloat(data.cart_amount) || undefined,
      currency: data.cart_currency?.toUpperCase(),
      tenantId: data.cart_id,
      rawPayload: payload,
    };
  }

  private mapPayTabsStatus(status: string): PaymentStatus["status"] {
    switch (status) {
      case "A":
        return "succeeded";
      case "H":
        return "processing";
      case "P":
        return "pending";
      case "V":
        return "cancelled";
      case "D":
      case "E":
        return "failed";
      default:
        return "pending";
    }
  }
}
