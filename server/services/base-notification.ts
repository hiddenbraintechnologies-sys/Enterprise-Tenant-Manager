export type NotificationChannel = "email" | "whatsapp" | "sms";

export type NotificationEventType =
  | "INVOICE_CREATED"
  | "INVOICE_ISSUED"
  | "PAYMENT_REMINDER"
  | "PAYMENT_RECEIVED"
  | "PAYMENT_PARTIAL"
  | "INVOICE_OVERDUE"
  | "INVOICE_CANCELLED"
  | "APPOINTMENT_CREATED"
  | "APPOINTMENT_REMINDER"
  | "APPOINTMENT_CANCELLED"
  | "ORDER_CREATED"
  | "ORDER_UPDATED"
  | "ORDER_COMPLETED"
  | "DELIVERY_SCHEDULED"
  | "DELIVERY_COMPLETED"
  | "CUSTOM";

export interface NotificationRecipient {
  email?: string;
  phone?: string;
  name: string;
}

export interface NotificationVariables {
  customerName?: string;
  invoiceNumber?: string;
  totalAmount?: string;
  currency?: string;
  dueDate?: string;
  taxAmount?: string;
  paidAmount?: string;
  balanceAmount?: string;
  tenantName?: string;
  [key: string]: string | undefined;
}

export interface NotificationPayload {
  tenantId: string;
  eventType: NotificationEventType;
  channels: NotificationChannel[];
  recipient: NotificationRecipient;
  variables: NotificationVariables;
  referenceId?: string;
  referenceType?: string;
  userId?: string;
  language?: string;
  priority?: "low" | "normal" | "high";
  scheduledAt?: Date;
  moduleContext?: string;
}

export interface NotificationResult {
  success: boolean;
  logId?: string;
  channelResults: Array<{
    channel: NotificationChannel;
    success: boolean;
    messageId?: string;
    error?: string;
  }>;
}

export interface INotificationAdapter {
  getModuleName(): string;
  mapEventToLegacyType(eventType: NotificationEventType): string;
  buildVariables(data: Record<string, unknown>): NotificationVariables;
  getDefaultChannels(eventType: NotificationEventType): NotificationChannel[];
}

export interface INotificationService {
  dispatch(payload: NotificationPayload): Promise<NotificationResult>;
  dispatchToMultiple(payloads: NotificationPayload[]): Promise<NotificationResult[]>;
  scheduleReminders(
    tenantId: string,
    referenceId: string,
    referenceType: string,
    eventType: NotificationEventType,
    recipient: NotificationRecipient,
    variables: NotificationVariables,
    scheduledAt: Date
  ): Promise<void>;
}

const EVENT_TYPE_MAPPING: Record<NotificationEventType, string> = {
  INVOICE_CREATED: "invoice_created",
  INVOICE_ISSUED: "invoice_issued",
  PAYMENT_REMINDER: "payment_reminder",
  PAYMENT_RECEIVED: "payment_received",
  PAYMENT_PARTIAL: "payment_partial",
  INVOICE_OVERDUE: "invoice_overdue",
  INVOICE_CANCELLED: "invoice_cancelled",
  APPOINTMENT_CREATED: "custom",
  APPOINTMENT_REMINDER: "custom",
  APPOINTMENT_CANCELLED: "custom",
  ORDER_CREATED: "custom",
  ORDER_UPDATED: "custom",
  ORDER_COMPLETED: "custom",
  DELIVERY_SCHEDULED: "custom",
  DELIVERY_COMPLETED: "custom",
  CUSTOM: "custom",
};

class BaseNotificationService implements INotificationService {
  private notificationService: typeof import("./notification").notificationService | null = null;
  private whatsappService: typeof import("../core/whatsapp/whatsapp-service").whatsappService | null = null;
  private adapters: Map<string, INotificationAdapter> = new Map();

  registerAdapter(adapter: INotificationAdapter): void {
    const moduleName = adapter.getModuleName();
    this.adapters.set(moduleName, adapter);
  }

  getAdapter(moduleName: string): INotificationAdapter | undefined {
    return this.adapters.get(moduleName);
  }

  getRegisteredModules(): string[] {
    return Array.from(this.adapters.keys());
  }

  private async getNotificationService() {
    if (!this.notificationService) {
      const mod = await import("./notification");
      this.notificationService = mod.notificationService;
    }
    return this.notificationService;
  }

  private async getWhatsappService() {
    if (!this.whatsappService) {
      const mod = await import("../core/whatsapp/whatsapp-service");
      this.whatsappService = mod.whatsappService;
    }
    return this.whatsappService;
  }

  async dispatch(payload: NotificationPayload): Promise<NotificationResult> {
    const channelResults: NotificationResult["channelResults"] = [];
    
    const adapter = payload.moduleContext ? this.adapters.get(payload.moduleContext) : undefined;
    
    const legacyEventType = adapter 
      ? adapter.mapEventToLegacyType(payload.eventType)
      : EVENT_TYPE_MAPPING[payload.eventType] || "custom";
    
    const channels = payload.channels.length > 0 
      ? payload.channels 
      : adapter 
        ? adapter.getDefaultChannels(payload.eventType)
        : ["email"];

    for (const channel of channels) {
      try {
        if (channel === "email" || channel === "sms") {
          const service = await this.getNotificationService();
          const result = await service.sendNotification({
            tenantId: payload.tenantId,
            channel: channel,
            eventType: legacyEventType as any,
            recipient: payload.recipient,
            variables: payload.variables as any,
            invoiceId: payload.referenceType === "invoice" ? payload.referenceId : undefined,
            userId: payload.userId,
            language: payload.language,
          });

          channelResults.push({
            channel,
            success: result.success,
            messageId: result.messageId,
            error: result.error,
          });
        } else if (channel === "whatsapp") {
          if (!payload.recipient.phone) {
            channelResults.push({
              channel,
              success: false,
              error: "Phone number required for WhatsApp",
            });
            continue;
          }

          const service = await this.getWhatsappService();
          const result = await service.sendMessage({
            tenantId: payload.tenantId,
            toPhoneNumber: payload.recipient.phone,
            messageType: "template",
            templateName: this.getTemplateNameForEvent(payload.eventType, payload.moduleContext),
            templateParams: payload.variables as Record<string, string>,
            metadata: {
              referenceId: payload.referenceId,
              referenceType: payload.referenceType,
              eventType: payload.eventType,
            },
          });

          channelResults.push({
            channel,
            success: result.success,
            messageId: result.messageId,
            error: result.errorMessage,
          });
        }
      } catch (error: any) {
        channelResults.push({
          channel,
          success: false,
          error: error.message,
        });
      }
    }

    const overallSuccess = channelResults.some((r) => r.success);

    return {
      success: overallSuccess,
      channelResults,
    };
  }

  async dispatchToMultiple(payloads: NotificationPayload[]): Promise<NotificationResult[]> {
    return Promise.all(payloads.map((p) => this.dispatch(p)));
  }

  async scheduleReminders(
    tenantId: string,
    referenceId: string,
    referenceType: string,
    eventType: NotificationEventType,
    recipient: NotificationRecipient,
    variables: NotificationVariables,
    scheduledAt: Date
  ): Promise<void> {
    console.log(`[BaseNotificationService] Scheduled reminder for ${referenceType}:${referenceId} at ${scheduledAt.toISOString()}`);
  }

  private getTemplateNameForEvent(eventType: NotificationEventType, moduleContext?: string): string {
    const baseTemplate = eventType.toLowerCase().replace(/_/g, "-");
    if (moduleContext) {
      return `${moduleContext}-${baseTemplate}`;
    }
    return baseTemplate;
  }

}

export const baseNotificationService = new BaseNotificationService();

export function createNotificationPayload(
  tenantId: string,
  eventType: NotificationEventType,
  recipient: NotificationRecipient,
  variables: NotificationVariables,
  options: Partial<Omit<NotificationPayload, "tenantId" | "eventType" | "recipient" | "variables">> = {}
): NotificationPayload {
  return {
    tenantId,
    eventType,
    recipient,
    variables,
    channels: options.channels || ["email"],
    referenceId: options.referenceId,
    referenceType: options.referenceType,
    userId: options.userId,
    language: options.language,
    priority: options.priority || "normal",
    scheduledAt: options.scheduledAt,
    moduleContext: options.moduleContext,
  };
}
