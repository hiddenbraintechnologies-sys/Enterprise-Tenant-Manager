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

export class TwilioWhatsappAdapter implements WhatsappProvider {
  name = "twilio" as const;
  private config: ProviderConfig | null = null;
  private baseUrl = "https://api.twilio.com/2010-04-01";

  async initialize(config: ProviderConfig): Promise<void> {
    this.config = config;
  }

  isConfigured(): boolean {
    return !!(this.config?.apiKey && this.config?.apiSecret);
  }

  private getAuthHeader(): string {
    return "Basic " + Buffer.from(
      `${this.config!.apiKey}:${this.config!.apiSecret}`
    ).toString("base64");
  }

  async sendTemplateMessage(
    to: string,
    templateName: string,
    templateParams: Record<string, string>,
    language = "en"
  ): Promise<SendMessageResult> {
    if (!this.isConfigured()) {
      return { success: false, status: "failed", errorMessage: "Twilio not configured" };
    }

    try {
      const contentVariables = Object.entries(templateParams).reduce((acc, [key, value], index) => {
        acc[`${index + 1}`] = value;
        return acc;
      }, {} as Record<string, string>);

      const formData = new URLSearchParams();
      formData.append("To", `whatsapp:${to}`);
      formData.append("From", `whatsapp:${this.config!.phoneNumberId}`);
      formData.append("ContentSid", templateName);
      formData.append("ContentVariables", JSON.stringify(contentVariables));

      const response = await fetch(
        `${this.baseUrl}/Accounts/${this.config!.apiKey}/Messages.json`,
        {
          method: "POST",
          headers: {
            "Authorization": this.getAuthHeader(),
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: formData,
        }
      );

      const data = await response.json();

      if (data.sid) {
        return {
          success: true,
          providerMessageId: data.sid,
          status: "sent",
        };
      }

      return {
        success: false,
        status: "failed",
        errorCode: data.code?.toString(),
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
      return { success: false, status: "failed", errorMessage: "Twilio not configured" };
    }

    try {
      const formData = new URLSearchParams();
      formData.append("To", `whatsapp:${to}`);
      formData.append("From", `whatsapp:${this.config!.phoneNumberId}`);
      formData.append("Body", text);

      const response = await fetch(
        `${this.baseUrl}/Accounts/${this.config!.apiKey}/Messages.json`,
        {
          method: "POST",
          headers: {
            "Authorization": this.getAuthHeader(),
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: formData,
        }
      );

      const data = await response.json();

      if (data.sid) {
        return {
          success: true,
          providerMessageId: data.sid,
          status: "sent",
        };
      }

      return {
        success: false,
        status: "failed",
        errorCode: data.code?.toString(),
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
      return { success: false, status: "failed", errorMessage: "Twilio not configured" };
    }

    try {
      const formData = new URLSearchParams();
      formData.append("To", `whatsapp:${to}`);
      formData.append("From", `whatsapp:${this.config!.phoneNumberId}`);
      formData.append("MediaUrl", mediaUrl);
      if (caption) {
        formData.append("Body", caption);
      }

      const response = await fetch(
        `${this.baseUrl}/Accounts/${this.config!.apiKey}/Messages.json`,
        {
          method: "POST",
          headers: {
            "Authorization": this.getAuthHeader(),
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: formData,
        }
      );

      const data = await response.json();

      if (data.sid) {
        return {
          success: true,
          providerMessageId: data.sid,
          status: "sent",
        };
      }

      return {
        success: false,
        status: "failed",
        errorCode: data.code?.toString(),
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
      return { success: false, errorMessage: "Twilio not configured", status: "pending" };
    }

    try {
      const types: Record<string, unknown> = {};
      
      if (params.headerType && params.headerContent) {
        types["twilio/text"] = {
          header: params.headerContent,
          body: params.bodyText,
        };
      } else {
        types["twilio/text"] = {
          body: params.bodyText,
        };
      }

      const response = await fetch(
        `https://content.twilio.com/v1/Content`,
        {
          method: "POST",
          headers: {
            "Authorization": this.getAuthHeader(),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            friendly_name: params.name,
            language: params.language,
            types,
          }),
        }
      );

      const data = await response.json();

      if (data.sid) {
        return {
          success: true,
          providerTemplateId: data.sid,
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
      const response = await fetch(
        `https://content.twilio.com/v1/Content/${providerTemplateId}/ApprovalRequests`,
        {
          headers: {
            "Authorization": this.getAuthHeader(),
          },
        }
      );

      const data = await response.json();

      const statusMap: Record<string, "pending" | "approved" | "rejected"> = {
        pending: "pending",
        approved: "approved",
        rejected: "rejected",
      };

      return {
        providerTemplateId,
        status: statusMap[data.whatsapp?.status] || "pending",
        rejectionReason: data.whatsapp?.rejection_reason,
      };
    } catch (error) {
      return { providerTemplateId, status: "pending" };
    }
  }

  async verifyWebhookSignature(payload: string | Buffer, signature: string): Promise<boolean> {
    if (!this.config?.webhookSecret) return false;

    const url = this.config.additionalConfig?.webhookUrl as string || "";
    const paramString = payload.toString();
    
    const signatureBase = url + paramString;
    const expectedSignature = crypto
      .createHmac("sha1", this.config.webhookSecret)
      .update(signatureBase)
      .digest("base64");

    return signature === expectedSignature;
  }

  normalizeWebhookEvent(payload: Record<string, unknown>): NormalizedWebhookEvent {
    const messageStatus = payload.MessageStatus as string;
    const messageSid = payload.MessageSid as string;

    const statusMap: Record<string, NormalizedWebhookEvent["type"]> = {
      sent: "message.sent",
      delivered: "message.delivered",
      read: "message.read",
      failed: "message.failed",
      undelivered: "message.failed",
    };

    return {
      type: statusMap[messageStatus] || "unknown",
      providerMessageId: messageSid,
      status: messageStatus === "undelivered" ? "failed" : messageStatus as "sent" | "delivered" | "read" | "failed",
      errorCode: payload.ErrorCode as string,
      errorMessage: payload.ErrorMessage as string,
      timestamp: new Date(),
    };
  }

  async healthCheck(): Promise<{ healthy: boolean; latencyMs: number; errorMessage?: string }> {
    if (!this.isConfigured()) {
      return { healthy: false, latencyMs: 0, errorMessage: "Not configured" };
    }

    const start = Date.now();
    try {
      const response = await fetch(
        `${this.baseUrl}/Accounts/${this.config!.apiKey}.json`,
        {
          headers: {
            "Authorization": this.getAuthHeader(),
          },
        }
      );

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
