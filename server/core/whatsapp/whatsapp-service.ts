import { db } from "../../db";
import {
  whatsappMessages,
  whatsappTemplates,
  whatsappOptIns,
  whatsappUsage,
  whatsappProviderHealth,
  whatsappWebhookEvents,
  whatsappProviderConfigs,
  tenants,
} from "@shared/schema";
import { eq, and, desc, sql, gte, lte } from "drizzle-orm";
import { whatsappProviderSelector } from "./provider-selector";
import type {
  SendMessageParams,
  SendMessageResult,
  TemplateSubmitParams,
  TemplateSubmitResult,
  WhatsappProviderType,
  TenantCountry,
  EffectiveCountry,
  UsageStats,
  ProviderHealthStatus,
  GlobalWhatsappStats,
  NormalizedWebhookEvent,
} from "./types";

class WhatsappService {
  private normalizeCountry(rawCountry: string | null | undefined): TenantCountry | undefined {
    if (!rawCountry) return undefined;
    const normalized = rawCountry.toLowerCase().trim();
    const countryMap: Record<string, TenantCountry> = {
      "india": "india", "in": "india", "ind": "india",
      "uae": "uae", "ae": "uae", "united arab emirates": "uae",
      "uk": "uk", "gb": "uk", "united kingdom": "uk", "great britain": "uk", "england": "uk",
      "malaysia": "malaysia", "my": "malaysia",
      "singapore": "singapore", "sg": "singapore",
    };
    return countryMap[normalized];
  }

  private async checkQuota(tenantId: string): Promise<{ withinQuota: boolean; used: number; limit: number }> {
    const yearMonth = new Date().toISOString().slice(0, 7);
    try {
      const [usage] = await db.select()
        .from(whatsappUsage)
        .where(and(eq(whatsappUsage.tenantId, tenantId), eq(whatsappUsage.yearMonth, yearMonth)))
        .limit(1);
      
      if (!usage) {
        return { withinQuota: true, used: 0, limit: 10000 };
      }
      
      const used = usage.quotaUsed || 0;
      const limit = usage.quotaLimit || 10000;
      return { withinQuota: used < limit, used, limit };
    } catch {
      return { withinQuota: true, used: 0, limit: 10000 };
    }
  }

  async sendMessage(params: SendMessageParams): Promise<SendMessageResult> {
    const tenant = await db.select().from(tenants).where(eq(tenants.id, params.tenantId)).limit(1);
    if (!tenant[0]) {
      return { success: false, status: "failed", errorMessage: "Tenant not found" };
    }

    const country = this.normalizeCountry(tenant[0].country);
    const effectiveCountry = country || "other";
    
    const quotaCheck = await this.checkQuota(params.tenantId);
    if (!quotaCheck.withinQuota) {
      return { 
        success: false, 
        status: "failed", 
        errorCode: "QUOTA_EXCEEDED", 
        errorMessage: `Monthly quota exceeded: ${quotaCheck.used}/${quotaCheck.limit} messages used` 
      };
    }
    
    const isOptedIn = await this.checkOptIn(params.tenantId, params.toPhoneNumber);
    if (!isOptedIn) {
      return { success: false, status: "failed", errorCode: "NO_OPTIN", errorMessage: "Phone number not opted in" };
    }

    const provider = whatsappProviderSelector.getProviderForCountry(country);
    if (!provider) {
      return { success: false, status: "failed", errorMessage: "No WhatsApp provider available for country" };
    }

    let template = null;
    if (params.messageType === "template") {
      if (!params.templateId && !params.templateName) {
        return { success: false, status: "failed", errorCode: "TEMPLATE_REQUIRED", errorMessage: "Template ID or name required for template messages" };
      }
      template = await this.getTemplate(params.templateId, params.templateName);
      if (!template) {
        return { success: false, status: "failed", errorCode: "TEMPLATE_NOT_FOUND", errorMessage: "Template not found in system" };
      }
      if (template.status !== "approved") {
        return { success: false, status: "failed", errorCode: "TEMPLATE_NOT_APPROVED", errorMessage: "Template not approved" };
      }
    }

    let result: SendMessageResult;
    
    if (params.messageType === "template" && template) {
      result = await provider.sendTemplateMessage(
        params.toPhoneNumber,
        template.providerTemplateId || template.name,
        params.templateParams || {},
        template.language || "en"
      );
    } else if (params.messageType === "media" && params.mediaUrl) {
      result = await provider.sendMediaMessage(
        params.toPhoneNumber,
        params.mediaUrl,
        params.mediaType || "image",
        params.content
      );
    } else if (params.messageType === "text" && params.content) {
      result = await provider.sendTextMessage(params.toPhoneNumber, params.content);
    } else {
      return { success: false, status: "failed", errorMessage: "Invalid message parameters" };
    }

    const [messageRecord] = await db.insert(whatsappMessages).values({
      tenantId: params.tenantId,
      provider: provider.name,
      providerMessageId: result.providerMessageId,
      templateId: template?.id,
      toPhoneNumber: params.toPhoneNumber,
      messageType: params.messageType,
      content: params.content,
      templateParams: params.templateParams || {},
      mediaUrl: params.mediaUrl,
      status: result.success ? "sent" : "failed",
      sentAt: result.success ? new Date() : null,
      errorCode: result.errorCode,
      errorMessage: result.errorMessage,
      cost: result.cost?.toString(),
      currency: result.currency,
      country: effectiveCountry,
      metadata: params.metadata || {},
    }).returning();

    if (result.success) {
      await this.updateUsage(params.tenantId, effectiveCountry, provider.name, params.messageType === "template");
      await this.updateOptInMessageCount(params.tenantId, params.toPhoneNumber);
    }

    return {
      ...result,
      messageId: messageRecord.id,
    };
  }

  async checkOptIn(tenantId: string, phoneNumber: string): Promise<boolean> {
    const optIn = await db.select()
      .from(whatsappOptIns)
      .where(
        and(
          eq(whatsappOptIns.tenantId, tenantId),
          eq(whatsappOptIns.phoneNumber, phoneNumber),
          eq(whatsappOptIns.isActive, true)
        )
      )
      .limit(1);

    return optIn.length > 0;
  }

  async recordOptIn(
    tenantId: string,
    phoneNumber: string,
    countryCode: string,
    source: string,
    customerId?: string,
    consentText?: string,
    ipAddress?: string
  ): Promise<{ success: boolean; optInId?: string; errorMessage?: string }> {
    try {
      const existingOptIn = await db.select()
        .from(whatsappOptIns)
        .where(
          and(
            eq(whatsappOptIns.tenantId, tenantId),
            eq(whatsappOptIns.phoneNumber, phoneNumber)
          )
        )
        .limit(1);

      if (existingOptIn[0]) {
        if (existingOptIn[0].isActive) {
          return { success: true, optInId: existingOptIn[0].id };
        }

        const [updated] = await db.update(whatsappOptIns)
          .set({
            isActive: true,
            optInAt: new Date(),
            optOutAt: null,
            optInSource: source,
            consentText,
            consentIpAddress: ipAddress,
            updatedAt: new Date(),
          })
          .where(eq(whatsappOptIns.id, existingOptIn[0].id))
          .returning();

        return { success: true, optInId: updated.id };
      }

      const [optIn] = await db.insert(whatsappOptIns).values({
        tenantId,
        phoneNumber,
        countryCode,
        customerId,
        optInSource: source,
        consentText,
        consentIpAddress: ipAddress,
      }).returning();

      return { success: true, optInId: optIn.id };
    } catch (error) {
      return {
        success: false,
        errorMessage: error instanceof Error ? error.message : "Failed to record opt-in",
      };
    }
  }

  async recordOptOut(tenantId: string, phoneNumber: string): Promise<{ success: boolean }> {
    try {
      await db.update(whatsappOptIns)
        .set({
          isActive: false,
          optOutAt: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(whatsappOptIns.tenantId, tenantId),
            eq(whatsappOptIns.phoneNumber, phoneNumber)
          )
        );

      return { success: true };
    } catch (error) {
      return { success: false };
    }
  }

  async getTemplate(templateId?: string, templateName?: string) {
    if (templateId) {
      const [template] = await db.select()
        .from(whatsappTemplates)
        .where(eq(whatsappTemplates.id, templateId))
        .limit(1);
      return template;
    }

    if (templateName) {
      const [template] = await db.select()
        .from(whatsappTemplates)
        .where(eq(whatsappTemplates.name, templateName))
        .limit(1);
      return template;
    }

    return null;
  }

  async submitTemplate(params: TemplateSubmitParams, provider: WhatsappProviderType): Promise<TemplateSubmitResult> {
    const providerInstance = whatsappProviderSelector.getProvider(provider);
    if (!providerInstance) {
      return { success: false, status: "pending", errorMessage: "Provider not available" };
    }

    const result = await providerInstance.submitTemplate(params);

    if (result.success) {
      await db.insert(whatsappTemplates).values({
        name: params.name,
        category: params.category,
        language: params.language,
        provider,
        providerTemplateId: result.providerTemplateId,
        headerType: params.headerType,
        headerContent: params.headerContent,
        bodyText: params.bodyText,
        footerText: params.footerText,
        buttons: params.buttons || [],
        placeholders: params.placeholders || [],
        status: "pending",
        submittedAt: new Date(),
      });
    }

    return result;
  }

  async getTemplates(filters?: {
    provider?: WhatsappProviderType;
    status?: "pending" | "approved" | "rejected";
    tenantId?: string;
    isGlobal?: boolean;
  }) {
    let query = db.select().from(whatsappTemplates);

    const conditions = [];
    if (filters?.provider) {
      conditions.push(eq(whatsappTemplates.provider, filters.provider));
    }
    if (filters?.status) {
      conditions.push(eq(whatsappTemplates.status, filters.status));
    }
    if (filters?.tenantId) {
      conditions.push(eq(whatsappTemplates.tenantId, filters.tenantId));
    }
    if (filters?.isGlobal !== undefined) {
      conditions.push(eq(whatsappTemplates.isGlobal, filters.isGlobal));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as typeof query;
    }

    return query.orderBy(desc(whatsappTemplates.createdAt));
  }

  async syncTemplateStatus(templateId: string): Promise<void> {
    const [template] = await db.select()
      .from(whatsappTemplates)
      .where(eq(whatsappTemplates.id, templateId))
      .limit(1);

    if (!template || !template.providerTemplateId) return;

    const provider = whatsappProviderSelector.getProvider(template.provider);
    if (!provider) return;

    const status = await provider.getTemplateStatus(template.providerTemplateId);

    await db.update(whatsappTemplates)
      .set({
        status: status.status,
        rejectionReason: status.rejectionReason,
        approvedAt: status.status === "approved" ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(whatsappTemplates.id, templateId));
  }

  private async updateUsage(tenantId: string, country: EffectiveCountry, provider: WhatsappProviderType, isTemplate: boolean): Promise<void> {
    const yearMonth = new Date().toISOString().slice(0, 7);

    try {
      const existing = await db.select()
        .from(whatsappUsage)
        .where(
          and(
            eq(whatsappUsage.tenantId, tenantId),
            eq(whatsappUsage.yearMonth, yearMonth)
          )
        )
        .limit(1);

      if (existing[0]) {
        await db.update(whatsappUsage)
          .set({
            messagesSent: sql`${whatsappUsage.messagesSent} + 1`,
            quotaUsed: sql`${whatsappUsage.quotaUsed} + 1`,
            ...(isTemplate && { templateMessages: sql`${whatsappUsage.templateMessages} + 1` }),
            ...(!isTemplate && { sessionMessages: sql`${whatsappUsage.sessionMessages} + 1` }),
            updatedAt: new Date(),
          })
          .where(eq(whatsappUsage.id, existing[0].id));
      } else {
        const countryConfig = country !== "other" ? whatsappProviderSelector.getCountryConfig(country) : undefined;
        await db.insert(whatsappUsage).values({
          tenantId,
          country,
          provider,
          yearMonth,
          messagesSent: 1,
          templateMessages: isTemplate ? 1 : 0,
          sessionMessages: isTemplate ? 0 : 1,
          quotaUsed: 1,
          quotaLimit: countryConfig?.monthlyQuota || 10000,
        });
      }
    } catch (error) {
      console.error("Failed to update WhatsApp usage:", error);
    }
  }

  private async updateOptInMessageCount(tenantId: string, phoneNumber: string): Promise<void> {
    try {
      await db.update(whatsappOptIns)
        .set({
          lastMessageAt: new Date(),
          messageCount: sql`${whatsappOptIns.messageCount} + 1`,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(whatsappOptIns.tenantId, tenantId),
            eq(whatsappOptIns.phoneNumber, phoneNumber)
          )
        );
    } catch (error) {
      console.error("Failed to update opt-in message count:", error);
    }
  }

  async handleWebhook(provider: WhatsappProviderType, payload: Record<string, unknown>, signature?: string): Promise<void> {
    const providerInstance = whatsappProviderSelector.getProvider(provider);
    if (!providerInstance) return;

    if (signature) {
      const isValid = await providerInstance.verifyWebhookSignature(JSON.stringify(payload), signature);
      if (!isValid) {
        console.warn(`Invalid WhatsApp webhook signature for provider: ${provider}`);
        return;
      }
    }

    const event = providerInstance.normalizeWebhookEvent(payload);
    
    const eventId = `${provider}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    await db.insert(whatsappWebhookEvents).values({
      provider,
      eventId,
      eventType: event.type,
      payload,
      status: "pending",
    });

    await this.processWebhookEvent(event);
  }

  private async processWebhookEvent(event: NormalizedWebhookEvent): Promise<void> {
    if (!event.providerMessageId) return;

    const [message] = await db.select()
      .from(whatsappMessages)
      .where(eq(whatsappMessages.providerMessageId, event.providerMessageId))
      .limit(1);

    if (!message) return;

    const updates: Record<string, unknown> = {
      status: event.status || message.status,
      statusUpdatedAt: new Date(),
    };

    if (event.type === "message.delivered") {
      updates.deliveredAt = event.timestamp || new Date();
      await this.incrementDeliveryCount(message.tenantId, message.country as TenantCountry);
    } else if (event.type === "message.read") {
      updates.readAt = event.timestamp || new Date();
      await this.incrementReadCount(message.tenantId, message.country as TenantCountry);
    } else if (event.type === "message.failed") {
      updates.errorCode = event.errorCode;
      updates.errorMessage = event.errorMessage;
      await this.incrementFailureCount(message.tenantId, message.country as TenantCountry);
    }

    await db.update(whatsappMessages)
      .set(updates)
      .where(eq(whatsappMessages.id, message.id));
  }

  private async incrementDeliveryCount(tenantId: string, country: TenantCountry): Promise<void> {
    const yearMonth = new Date().toISOString().slice(0, 7);
    await db.update(whatsappUsage)
      .set({
        messagesDelivered: sql`${whatsappUsage.messagesDelivered} + 1`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(whatsappUsage.tenantId, tenantId),
          eq(whatsappUsage.yearMonth, yearMonth)
        )
      );
  }

  private async incrementReadCount(tenantId: string, country: TenantCountry): Promise<void> {
    const yearMonth = new Date().toISOString().slice(0, 7);
    await db.update(whatsappUsage)
      .set({
        messagesRead: sql`${whatsappUsage.messagesRead} + 1`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(whatsappUsage.tenantId, tenantId),
          eq(whatsappUsage.yearMonth, yearMonth)
        )
      );
  }

  private async incrementFailureCount(tenantId: string, country: TenantCountry): Promise<void> {
    const yearMonth = new Date().toISOString().slice(0, 7);
    await db.update(whatsappUsage)
      .set({
        messagesFailed: sql`${whatsappUsage.messagesFailed} + 1`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(whatsappUsage.tenantId, tenantId),
          eq(whatsappUsage.yearMonth, yearMonth)
        )
      );
  }

  async getUsageStats(tenantId: string, yearMonth?: string): Promise<UsageStats | null> {
    const month = yearMonth || new Date().toISOString().slice(0, 7);
    
    const [usage] = await db.select()
      .from(whatsappUsage)
      .where(
        and(
          eq(whatsappUsage.tenantId, tenantId),
          eq(whatsappUsage.yearMonth, month)
        )
      )
      .limit(1);

    if (!usage) return null;

    return {
      tenantId: usage.tenantId,
      yearMonth: usage.yearMonth,
      messagesSent: usage.messagesSent || 0,
      messagesDelivered: usage.messagesDelivered || 0,
      messagesRead: usage.messagesRead || 0,
      messagesFailed: usage.messagesFailed || 0,
      templateMessages: usage.templateMessages || 0,
      sessionMessages: usage.sessionMessages || 0,
      totalCost: parseFloat(usage.totalCost || "0"),
      quotaUsed: usage.quotaUsed || 0,
      quotaLimit: usage.quotaLimit || 10000,
    };
  }

  async updateProviderHealth(): Promise<void> {
    const healthResults = await whatsappProviderSelector.checkAllProvidersHealth();

    const entries = Array.from(healthResults.entries());
    for (const [providerType, health] of entries) {
      const existing = await db.select()
        .from(whatsappProviderHealth)
        .where(eq(whatsappProviderHealth.provider, providerType))
        .limit(1);

      const status = health.healthy ? "healthy" : "down";
      const now = new Date();

      if (existing[0]) {
        await db.update(whatsappProviderHealth)
          .set({
            status,
            lastCheckAt: now,
            lastSuccessAt: health.healthy ? now : existing[0].lastSuccessAt,
            lastFailureAt: !health.healthy ? now : existing[0].lastFailureAt,
            consecutiveFailures: health.healthy ? 0 : (existing[0].consecutiveFailures || 0) + 1,
            averageLatencyMs: health.latencyMs,
            errorMessage: health.errorMessage,
            updatedAt: now,
          })
          .where(eq(whatsappProviderHealth.id, existing[0].id));
      } else {
        await db.insert(whatsappProviderHealth).values({
          provider: providerType,
          status,
          lastCheckAt: now,
          lastSuccessAt: health.healthy ? now : null,
          lastFailureAt: !health.healthy ? now : null,
          consecutiveFailures: health.healthy ? 0 : 1,
          averageLatencyMs: health.latencyMs,
          errorMessage: health.errorMessage,
        });
      }
    }
  }

  async getProviderHealthStatus(): Promise<ProviderHealthStatus[]> {
    const healthRecords = await db.select().from(whatsappProviderHealth);

    return healthRecords.map(record => ({
      provider: record.provider as WhatsappProviderType,
      country: record.country as TenantCountry | undefined,
      status: record.status as "healthy" | "degraded" | "down",
      lastCheckAt: record.lastCheckAt || new Date(),
      consecutiveFailures: record.consecutiveFailures || 0,
      averageLatencyMs: record.averageLatencyMs || undefined,
      successRate: record.successRate ? parseFloat(record.successRate) : undefined,
      errorMessage: record.errorMessage || undefined,
    }));
  }

  async getGlobalStats(): Promise<GlobalWhatsappStats> {
    const yearMonth = new Date().toISOString().slice(0, 7);

    const usageStats = await db.select({
      totalSent: sql<number>`COALESCE(SUM(${whatsappUsage.messagesSent}), 0)`,
      totalDelivered: sql<number>`COALESCE(SUM(${whatsappUsage.messagesDelivered}), 0)`,
      totalCost: sql<number>`COALESCE(SUM(${whatsappUsage.totalCost}::numeric), 0)`,
    })
      .from(whatsappUsage)
      .where(eq(whatsappUsage.yearMonth, yearMonth));

    const optInCount = await db.select({
      count: sql<number>`COUNT(*)`,
    })
      .from(whatsappOptIns)
      .where(eq(whatsappOptIns.isActive, true));

    const templateStats = await db.select({
      approved: sql<number>`COUNT(*) FILTER (WHERE ${whatsappTemplates.status} = 'approved')`,
      pending: sql<number>`COUNT(*) FILTER (WHERE ${whatsappTemplates.status} = 'pending')`,
    })
      .from(whatsappTemplates);

    const usageByCountry = await db.select({
      country: whatsappUsage.country,
      messagesSent: sql<number>`COALESCE(SUM(${whatsappUsage.messagesSent}), 0)`,
      messagesDelivered: sql<number>`COALESCE(SUM(${whatsappUsage.messagesDelivered}), 0)`,
      cost: sql<number>`COALESCE(SUM(${whatsappUsage.totalCost}::numeric), 0)`,
    })
      .from(whatsappUsage)
      .where(eq(whatsappUsage.yearMonth, yearMonth))
      .groupBy(whatsappUsage.country);

    const providerHealth = await this.getProviderHealthStatus();

    const totalSent = Number(usageStats[0]?.totalSent || 0);
    const totalDelivered = Number(usageStats[0]?.totalDelivered || 0);

    return {
      totalMessagesSent: totalSent,
      totalMessagesDelivered: totalDelivered,
      deliveryRate: totalSent > 0 ? (totalDelivered / totalSent) * 100 : 0,
      activeOptIns: Number(optInCount[0]?.count || 0),
      approvedTemplates: Number(templateStats[0]?.approved || 0),
      pendingTemplates: Number(templateStats[0]?.pending || 0),
      providerHealth,
      usageByCountry: usageByCountry.map(u => ({
        country: u.country as TenantCountry,
        messagesSent: Number(u.messagesSent),
        messagesDelivered: Number(u.messagesDelivered),
        cost: Number(u.cost),
      })),
    };
  }

  async getProviderConfigs(): Promise<Array<{
    country: TenantCountry;
    primaryProvider: WhatsappProviderType;
    fallbackProvider?: WhatsappProviderType;
    monthlyQuota: number;
    isActive: boolean;
  }>> {
    const configs = await db.select().from(whatsappProviderConfigs);
    
    return configs.map(config => ({
      country: config.country as TenantCountry,
      primaryProvider: config.primaryProvider as WhatsappProviderType,
      fallbackProvider: config.fallbackProvider as WhatsappProviderType | undefined,
      monthlyQuota: config.monthlyQuota || 10000,
      isActive: config.isActive ?? true,
    }));
  }

  async getMessages(filters: {
    tenantId?: string;
    provider?: WhatsappProviderType;
    status?: string;
    limit?: number;
  }) {
    let query = db.select().from(whatsappMessages).orderBy(desc(whatsappMessages.createdAt));

    const conditions = [];
    if (filters.tenantId) {
      conditions.push(eq(whatsappMessages.tenantId, filters.tenantId));
    }
    if (filters.provider) {
      conditions.push(eq(whatsappMessages.provider, filters.provider));
    }
    if (filters.status) {
      conditions.push(eq(whatsappMessages.status, filters.status as any));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as typeof query;
    }

    if (filters.limit) {
      query = query.limit(filters.limit) as typeof query;
    }

    return query;
  }
}

export const whatsappService = new WhatsappService();
