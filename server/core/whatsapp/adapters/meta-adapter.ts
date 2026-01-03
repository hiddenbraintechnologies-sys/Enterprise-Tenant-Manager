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

export class MetaWhatsappAdapter implements WhatsappProvider {
  name = "meta" as const;
  private config: ProviderConfig | null = null;
  private baseUrl = "https://graph.facebook.com/v18.0";

  async initialize(config: ProviderConfig): Promise<void> {
    this.config = config;
  }

  isConfigured(): boolean {
    return !!(this.config?.apiKey && this.config?.phoneNumberId);
  }

  async sendTemplateMessage(
    to: string,
    templateName: string,
    templateParams: Record<string, string>,
    language = "en"
  ): Promise<SendMessageResult> {
    if (!this.isConfigured()) {
      return { success: false, status: "failed", errorMessage: "Meta WhatsApp not configured" };
    }

    try {
      const components = [];
      const paramValues = Object.values(templateParams);

      if (paramValues.length > 0) {
        components.push({
          type: "body",
          parameters: paramValues.map(value => ({
            type: "text",
            text: value,
          })),
        });
      }

      const response = await fetch(
        `${this.baseUrl}/${this.config!.phoneNumberId}/messages`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${this.config!.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to,
            type: "template",
            template: {
              name: templateName,
              language: { code: language },
              components,
            },
          }),
        }
      );

      const data = await response.json();

      if (data.messages && data.messages[0]?.id) {
        return {
          success: true,
          providerMessageId: data.messages[0].id,
          status: "sent",
        };
      }

      return {
        success: false,
        status: "failed",
        errorCode: data.error?.code?.toString(),
        errorMessage: data.error?.message || "Failed to send template message",
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
      return { success: false, status: "failed", errorMessage: "Meta WhatsApp not configured" };
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/${this.config!.phoneNumberId}/messages`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${this.config!.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to,
            type: "text",
            text: { body: text },
          }),
        }
      );

      const data = await response.json();

      if (data.messages && data.messages[0]?.id) {
        return {
          success: true,
          providerMessageId: data.messages[0].id,
          status: "sent",
        };
      }

      return {
        success: false,
        status: "failed",
        errorCode: data.error?.code?.toString(),
        errorMessage: data.error?.message || "Failed to send text message",
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
      return { success: false, status: "failed", errorMessage: "Meta WhatsApp not configured" };
    }

    try {
      const mediaPayload: Record<string, unknown> = { link: mediaUrl };
      if (caption && mediaType !== "audio") {
        mediaPayload.caption = caption;
      }

      const response = await fetch(
        `${this.baseUrl}/${this.config!.phoneNumberId}/messages`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${this.config!.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to,
            type: mediaType,
            [mediaType]: mediaPayload,
          }),
        }
      );

      const data = await response.json();

      if (data.messages && data.messages[0]?.id) {
        return {
          success: true,
          providerMessageId: data.messages[0].id,
          status: "sent",
        };
      }

      return {
        success: false,
        status: "failed",
        errorCode: data.error?.code?.toString(),
        errorMessage: data.error?.message || "Failed to send media message",
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
    if (!this.isConfigured() || !this.config?.businessAccountId) {
      return { success: false, errorMessage: "Meta WhatsApp not configured", status: "pending" };
    }

    try {
      const components = [];

      if (params.headerType && params.headerContent) {
        components.push({
          type: "HEADER",
          format: params.headerType.toUpperCase(),
          ...(params.headerType === "text" && { text: params.headerContent }),
        });
      }

      components.push({
        type: "BODY",
        text: params.bodyText,
        ...(params.placeholders && params.placeholders.length > 0 && {
          example: {
            body_text: [params.placeholders],
          },
        }),
      });

      if (params.footerText) {
        components.push({
          type: "FOOTER",
          text: params.footerText,
        });
      }

      if (params.buttons && params.buttons.length > 0) {
        components.push({
          type: "BUTTONS",
          buttons: params.buttons.map(btn => ({
            type: btn.type === "quick_reply" ? "QUICK_REPLY" : btn.type.toUpperCase(),
            text: btn.text,
            ...(btn.url && { url: btn.url }),
            ...(btn.phoneNumber && { phone_number: btn.phoneNumber }),
          })),
        });
      }

      const response = await fetch(
        `${this.baseUrl}/${this.config.businessAccountId}/message_templates`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${this.config.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: params.name,
            category: params.category.toUpperCase(),
            language: params.language,
            components,
          }),
        }
      );

      const data = await response.json();

      if (data.id) {
        return {
          success: true,
          providerTemplateId: data.id,
          status: "pending",
        };
      }

      return {
        success: false,
        status: "pending",
        errorMessage: data.error?.message || "Failed to submit template",
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
      const response = await fetch(
        `${this.baseUrl}/${providerTemplateId}?fields=status,rejected_reason`,
        {
          headers: {
            "Authorization": `Bearer ${this.config!.apiKey}`,
          },
        }
      );

      const data = await response.json();

      const statusMap: Record<string, "pending" | "approved" | "rejected"> = {
        PENDING: "pending",
        APPROVED: "approved",
        REJECTED: "rejected",
      };

      return {
        providerTemplateId,
        status: statusMap[data.status] || "pending",
        rejectionReason: data.rejected_reason,
      };
    } catch (error) {
      return { providerTemplateId, status: "pending" };
    }
  }

  async verifyWebhookSignature(payload: string | Buffer, signature: string): Promise<boolean> {
    if (!this.config?.webhookSecret) return false;

    const expectedSignature = "sha256=" + crypto
      .createHmac("sha256", this.config.webhookSecret)
      .update(payload)
      .digest("hex");

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  normalizeWebhookEvent(payload: Record<string, unknown>): NormalizedWebhookEvent {
    const entry = (payload.entry as unknown[])?.[0] as Record<string, unknown>;
    const changes = (entry?.changes as unknown[])?.[0] as Record<string, unknown>;
    const value = changes?.value as Record<string, unknown>;
    const statuses = (value?.statuses as unknown[])?.[0] as Record<string, unknown>;

    if (statuses) {
      const statusMap: Record<string, NormalizedWebhookEvent["type"]> = {
        sent: "message.sent",
        delivered: "message.delivered",
        read: "message.read",
        failed: "message.failed",
      };

      const errors = statuses.errors as { code: number; title: string }[] | undefined;

      return {
        type: statusMap[statuses.status as string] || "unknown",
        providerMessageId: statuses.id as string,
        status: statuses.status as "sent" | "delivered" | "read" | "failed",
        errorCode: errors?.[0]?.code?.toString(),
        errorMessage: errors?.[0]?.title,
        timestamp: statuses.timestamp
          ? new Date(parseInt(statuses.timestamp as string) * 1000)
          : new Date(),
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
      const response = await fetch(
        `${this.baseUrl}/${this.config!.phoneNumberId}`,
        {
          headers: {
            "Authorization": `Bearer ${this.config!.apiKey}`,
          },
        }
      );

      const latencyMs = Date.now() - start;

      if (response.ok) {
        return { healthy: true, latencyMs };
      }

      const data = await response.json();
      return {
        healthy: false,
        latencyMs,
        errorMessage: data.error?.message || `HTTP ${response.status}`,
      };
    } catch (error) {
      return {
        healthy: false,
        latencyMs: Date.now() - start,
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}
