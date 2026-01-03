import type { WhatsappTemplate, WhatsappMessage, WhatsappProviderConfig } from "@shared/schema";

export type WhatsappProviderType = "gupshup" | "meta" | "twilio";
export type SupportedCountry = "india" | "uae" | "uk" | "malaysia" | "singapore";
export type TenantCountry = SupportedCountry | "other";
export type EffectiveCountry = TenantCountry;

export interface SendMessageParams {
  tenantId: string;
  toPhoneNumber: string;
  templateId?: string;
  templateName?: string;
  templateParams?: Record<string, string>;
  messageType: "template" | "text" | "media" | "interactive";
  content?: string;
  mediaUrl?: string;
  mediaType?: "image" | "video" | "document" | "audio";
  buttons?: MessageButton[];
  metadata?: Record<string, unknown>;
}

export interface MessageButton {
  type: "quick_reply" | "url" | "call";
  text: string;
  payload?: string;
  url?: string;
  phoneNumber?: string;
}

export interface SendMessageResult {
  success: boolean;
  messageId?: string;
  providerMessageId?: string;
  status: "pending" | "sent" | "failed";
  errorCode?: string;
  errorMessage?: string;
  cost?: number;
  currency?: string;
}

export interface TemplateSubmitParams {
  name: string;
  category: "marketing" | "utility" | "authentication";
  language: string;
  headerType?: "text" | "image" | "video" | "document";
  headerContent?: string;
  bodyText: string;
  footerText?: string;
  buttons?: TemplateButton[];
  placeholders?: string[];
}

export interface TemplateButton {
  type: "quick_reply" | "url" | "call";
  text: string;
  url?: string;
  phoneNumber?: string;
  example?: string;
}

export interface TemplateSubmitResult {
  success: boolean;
  providerTemplateId?: string;
  status: "pending" | "approved" | "rejected";
  errorMessage?: string;
}

export interface TemplateStatusResult {
  providerTemplateId: string;
  status: "pending" | "approved" | "rejected";
  rejectionReason?: string;
}

export interface WebhookPayload {
  provider: WhatsappProviderType;
  eventId: string;
  eventType: string;
  payload: Record<string, unknown>;
  signature?: string;
}

export interface NormalizedWebhookEvent {
  type: "message.sent" | "message.delivered" | "message.read" | "message.failed" | "template.approved" | "template.rejected" | "unknown";
  providerMessageId?: string;
  providerTemplateId?: string;
  status?: "sent" | "delivered" | "read" | "failed";
  errorCode?: string;
  errorMessage?: string;
  timestamp?: Date;
  metadata?: Record<string, unknown>;
}

export interface ProviderConfig {
  apiKey: string;
  apiSecret?: string;
  phoneNumberId?: string;
  businessAccountId?: string;
  webhookSecret?: string;
  sandbox?: boolean;
  additionalConfig?: Record<string, unknown>;
}

export interface WhatsappProvider {
  name: WhatsappProviderType;
  
  initialize(config: ProviderConfig): Promise<void>;
  
  sendTemplateMessage(
    to: string,
    templateName: string,
    templateParams: Record<string, string>,
    language?: string
  ): Promise<SendMessageResult>;
  
  sendTextMessage(to: string, text: string): Promise<SendMessageResult>;
  
  sendMediaMessage(
    to: string,
    mediaUrl: string,
    mediaType: "image" | "video" | "document" | "audio",
    caption?: string
  ): Promise<SendMessageResult>;
  
  submitTemplate(params: TemplateSubmitParams): Promise<TemplateSubmitResult>;
  
  getTemplateStatus(providerTemplateId: string): Promise<TemplateStatusResult>;
  
  verifyWebhookSignature(payload: string | Buffer, signature: string): Promise<boolean>;
  
  normalizeWebhookEvent(payload: Record<string, unknown>): NormalizedWebhookEvent;
  
  isConfigured(): boolean;
  
  healthCheck(): Promise<{ healthy: boolean; latencyMs: number; errorMessage?: string }>;
}

export interface CountryProviderMapping {
  country: SupportedCountry;
  primaryProvider: WhatsappProviderType;
  fallbackProvider?: WhatsappProviderType;
  businessPhoneNumber?: string;
  monthlyQuota: number;
}

export interface UsageStats {
  tenantId: string;
  yearMonth: string;
  messagesSent: number;
  messagesDelivered: number;
  messagesRead: number;
  messagesFailed: number;
  templateMessages: number;
  sessionMessages: number;
  totalCost: number;
  quotaUsed: number;
  quotaLimit: number;
}

export interface ProviderHealthStatus {
  provider: WhatsappProviderType;
  country?: TenantCountry;
  status: "healthy" | "degraded" | "down";
  lastCheckAt: Date;
  consecutiveFailures: number;
  averageLatencyMs?: number;
  successRate?: number;
  errorMessage?: string;
}

export interface GlobalWhatsappStats {
  totalMessagesSent: number;
  totalMessagesDelivered: number;
  deliveryRate: number;
  activeOptIns: number;
  approvedTemplates: number;
  pendingTemplates: number;
  providerHealth: ProviderHealthStatus[];
  usageByCountry: {
    country: TenantCountry;
    messagesSent: number;
    messagesDelivered: number;
    cost: number;
  }[];
}
