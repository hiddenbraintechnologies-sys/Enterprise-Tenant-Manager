import type {
  WhatsappProvider,
  ProviderConfig,
  SendMessageResult,
  TemplateSubmitParams,
  TemplateSubmitResult,
  TemplateStatusResult,
  NormalizedWebhookEvent,
} from "../types";
import crypto from "crypto";

export class GupshupAdapter implements WhatsappProvider {
  name = "gupshup" as const;
  private config: ProviderConfig | null = null;
  private baseUrl = "https://api.gupshup.io/sm/api/v1";

  async initialize(config: ProviderConfig): Promise<void> {
    this.config = config;
  }

  isConfigured(): boolean {
    return !!(this.config?.apiKey);
  }

  async sendTemplateMessage(
    to: string,
    templateName: string,
    templateParams: Record<string, string>,
    language = "en"
  ): Promise<SendMessageResult> {
    if (!this.isConfigured()) {
      return { success: false, status: "failed", errorMessage: "Gupshup not configured" };
    }

    try {
      const params = Object.values(templateParams);
      const response = await fetch(`${this.baseUrl}/template/msg`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "apikey": this.config!.apiKey,
        },
        body: new URLSearchParams({
          channel: "whatsapp",
          source: this.config!.phoneNumberId || "",
          destination: to,
          template: JSON.stringify({
            id: templateName,
            params: params,
          }),
          "src.name": this.config!.additionalConfig?.appName as string || "BizFlow",
        }),
      });

      const data = await response.json();

      if (data.status === "submitted") {
        return {
          success: true,
          providerMessageId: data.messageId,
          status: "sent",
        };
      }

      return {
        success: false,
        status: "failed",
        errorCode: data.code,
        errorMessage: data.message || "Failed to send template message",
      };
    } catch (error) {
      return {
        success: false,
        status: "failed",
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async sendTextMessage(to: string, text: string): Promise<SendMessageResult> {
    if (!this.isConfigured()) {
      return { success: false, status: "failed", errorMessage: "Gupshup not configured" };
    }

    try {
      const response = await fetch(`${this.baseUrl}/msg`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "apikey": this.config!.apiKey,
        },
        body: new URLSearchParams({
          channel: "whatsapp",
          source: this.config!.phoneNumberId || "",
          destination: to,
          message: JSON.stringify({ type: "text", text }),
          "src.name": this.config!.additionalConfig?.appName as string || "BizFlow",
        }),
      });

      const data = await response.json();

      if (data.status === "submitted") {
        return {
          success: true,
          providerMessageId: data.messageId,
          status: "sent",
        };
      }

      return {
        success: false,
        status: "failed",
        errorCode: data.code,
        errorMessage: data.message || "Failed to send text message",
      };
    } catch (error) {
      return {
        success: false,
        status: "failed",
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async sendMediaMessage(
    to: string,
    mediaUrl: string,
    mediaType: "image" | "video" | "document" | "audio",
    caption?: string
  ): Promise<SendMessageResult> {
    if (!this.isConfigured()) {
      return { success: false, status: "failed", errorMessage: "Gupshup not configured" };
    }

    try {
      const messageBody: Record<string, unknown> = {
        type: mediaType,
        originalUrl: mediaUrl,
        previewUrl: mediaUrl,
      };

      if (caption) {
        messageBody.caption = caption;
      }

      const response = await fetch(`${this.baseUrl}/msg`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "apikey": this.config!.apiKey,
        },
        body: new URLSearchParams({
          channel: "whatsapp",
          source: this.config!.phoneNumberId || "",
          destination: to,
          message: JSON.stringify(messageBody),
          "src.name": this.config!.additionalConfig?.appName as string || "BizFlow",
        }),
      });

      const data = await response.json();

      if (data.status === "submitted") {
        return {
          success: true,
          providerMessageId: data.messageId,
          status: "sent",
        };
      }

      return {
        success: false,
        status: "failed",
        errorCode: data.code,
        errorMessage: data.message || "Failed to send media message",
      };
    } catch (error) {
      return {
        success: false,
        status: "failed",
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async submitTemplate(params: TemplateSubmitParams): Promise<TemplateSubmitResult> {
    if (!this.isConfigured()) {
      return { success: false, errorMessage: "Gupshup not configured", status: "pending" };
    }

    try {
      const templateData: Record<string, unknown> = {
        elementName: params.name,
        category: params.category.toUpperCase(),
        languageCode: params.language,
        content: params.bodyText,
      };

      if (params.headerType && params.headerContent) {
        templateData.header = {
          type: params.headerType.toUpperCase(),
          text: params.headerContent,
        };
      }

      if (params.footerText) {
        templateData.footer = params.footerText;
      }

      if (params.buttons && params.buttons.length > 0) {
        templateData.buttons = params.buttons.map(btn => ({
          type: btn.type.toUpperCase(),
          text: btn.text,
          ...(btn.url && { url: btn.url }),
          ...(btn.phoneNumber && { phone_number: btn.phoneNumber }),
        }));
      }

      const response = await fetch(`${this.baseUrl}/template/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": this.config!.apiKey,
        },
        body: JSON.stringify(templateData),
      });

      const data = await response.json();

      if (data.status === "success") {
        return {
          success: true,
          providerTemplateId: data.templateId,
          status: "pending",
        };
      }

      return {
        success: false,
        status: "pending",
        errorMessage: data.message || "Failed to submit template",
      };
    } catch (error) {
      return {
        success: false,
        status: "pending",
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async getTemplateStatus(providerTemplateId: string): Promise<TemplateStatusResult> {
    if (!this.isConfigured()) {
      return { providerTemplateId, status: "pending", rejectionReason: "Not configured" };
    }

    try {
      const response = await fetch(`${this.baseUrl}/template/list/${providerTemplateId}`, {
        headers: {
          "apikey": this.config!.apiKey,
        },
      });

      const data = await response.json();

      if (data.template) {
        const statusMap: Record<string, "pending" | "approved" | "rejected"> = {
          PENDING: "pending",
          APPROVED: "approved",
          REJECTED: "rejected",
        };

        return {
          providerTemplateId,
          status: statusMap[data.template.status] || "pending",
          rejectionReason: data.template.rejectedReason,
        };
      }

      return { providerTemplateId, status: "pending" };
    } catch (error) {
      return { providerTemplateId, status: "pending" };
    }
  }

  async verifyWebhookSignature(payload: string | Buffer, signature: string): Promise<boolean> {
    if (!this.config?.webhookSecret) return false;

    const expectedSignature = crypto
      .createHmac("sha256", this.config.webhookSecret)
      .update(payload)
      .digest("hex");

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  normalizeWebhookEvent(payload: Record<string, unknown>): NormalizedWebhookEvent {
    const type = payload.type as string;
    const messagePayload = payload.payload as Record<string, unknown>;

    if (type === "message-event") {
      const eventType = messagePayload?.type as string;
      const statusMap: Record<string, NormalizedWebhookEvent["type"]> = {
        sent: "message.sent",
        delivered: "message.delivered",
        read: "message.read",
        failed: "message.failed",
      };

      const errorObj = messagePayload?.error as { code?: string; message?: string } | undefined;
      return {
        type: statusMap[eventType] || "unknown",
        providerMessageId: messagePayload?.id as string,
        status: eventType as "sent" | "delivered" | "read" | "failed",
        errorCode: errorObj?.code,
        errorMessage: errorObj?.message,
        timestamp: new Date(),
      };
    }

    return { type: "unknown" };
  }

  async healthCheck(): Promise<{ healthy: boolean; latencyMs: number; errorMessage?: string }> {
    if (!this.isConfigured()) {
      return { healthy: false, latencyMs: 0, errorMessage: "Not configured" };
    }

    const start = Date.now();
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        headers: { "apikey": this.config!.apiKey },
      });

      const latencyMs = Date.now() - start;

      if (response.ok) {
        return { healthy: true, latencyMs };
      }

      return { healthy: false, latencyMs, errorMessage: `HTTP ${response.status}` };
    } catch (error) {
      return {
        healthy: false,
        latencyMs: Date.now() - start,
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}
