import { db } from "../db";
import { 
  notificationTemplates, 
  notificationLogs, 
  tenantNotificationSettings,
  tenants,
  furnitureInvoices,
  customers,
  type NotificationTemplate,
  type NotificationLog,
  type TenantNotificationSettings
} from "@shared/schema";
import { eq, and, lte, or } from "drizzle-orm";

export type NotificationChannel = "email" | "whatsapp" | "sms";
export type NotificationEventType = 
  | "invoice_created"
  | "invoice_issued"
  | "payment_reminder"
  | "payment_received"
  | "payment_partial"
  | "invoice_overdue"
  | "invoice_cancelled"
  | "custom";

export interface NotificationRecipient {
  email?: string;
  phone?: string;
  name: string;
}

export interface NotificationVariables {
  customerName: string;
  invoiceNumber: string;
  dueDate?: string;
  totalAmount: string;
  currency: string;
  taxAmount?: string;
  paidAmount?: string;
  balanceAmount?: string;
  tenantName?: string;
  [key: string]: string | undefined;
}

export interface SendNotificationOptions {
  tenantId: string;
  channel: NotificationChannel;
  eventType: NotificationEventType;
  recipient: NotificationRecipient;
  variables: NotificationVariables;
  invoiceId?: string;
  userId?: string;
  language?: string;
  templateCode?: string;
}

export interface NotificationResult {
  success: boolean;
  logId: string;
  messageId?: string;
  error?: string;
}

const DEFAULT_TEMPLATES: Record<NotificationEventType, { email: { subject: string; body: string }; whatsapp: { body: string } }> = {
  invoice_created: {
    email: {
      subject: "Invoice {{invoiceNumber}} Created",
      body: `Dear {{customerName}},

A new invoice has been created for you.

Invoice Number: {{invoiceNumber}}
Amount: {{currency}} {{totalAmount}}
Due Date: {{dueDate}}

Thank you for your business.

Best regards,
{{tenantName}}`
    },
    whatsapp: {
      body: `Hello {{customerName}}, your invoice {{invoiceNumber}} for {{currency}} {{totalAmount}} has been created. Due: {{dueDate}}.`
    }
  },
  invoice_issued: {
    email: {
      subject: "Invoice {{invoiceNumber}} - Payment Required",
      body: `Dear {{customerName}},

Your invoice is now due for payment.

Invoice Number: {{invoiceNumber}}
Amount: {{currency}} {{totalAmount}}
Tax: {{currency}} {{taxAmount}}
Due Date: {{dueDate}}

Please arrange payment at your earliest convenience.

Best regards,
{{tenantName}}`
    },
    whatsapp: {
      body: `Hello {{customerName}}, invoice {{invoiceNumber}} for {{currency}} {{totalAmount}} is ready. Please pay by {{dueDate}}.`
    }
  },
  payment_reminder: {
    email: {
      subject: "Payment Reminder - Invoice {{invoiceNumber}}",
      body: `Dear {{customerName}},

This is a friendly reminder that invoice {{invoiceNumber}} is due for payment.

Amount Due: {{currency}} {{balanceAmount}}
Due Date: {{dueDate}}

Please arrange payment as soon as possible to avoid any late fees.

Best regards,
{{tenantName}}`
    },
    whatsapp: {
      body: `Reminder: Invoice {{invoiceNumber}} for {{currency}} {{balanceAmount}} is due on {{dueDate}}. Please pay soon.`
    }
  },
  payment_received: {
    email: {
      subject: "Payment Received - Invoice {{invoiceNumber}}",
      body: `Dear {{customerName}},

We have received your payment for invoice {{invoiceNumber}}.

Amount Paid: {{currency}} {{paidAmount}}
Invoice Total: {{currency}} {{totalAmount}}

Thank you for your payment!

Best regards,
{{tenantName}}`
    },
    whatsapp: {
      body: `Thank you! Payment of {{currency}} {{paidAmount}} received for invoice {{invoiceNumber}}.`
    }
  },
  payment_partial: {
    email: {
      subject: "Partial Payment Received - Invoice {{invoiceNumber}}",
      body: `Dear {{customerName}},

We have received a partial payment for invoice {{invoiceNumber}}.

Amount Paid: {{currency}} {{paidAmount}}
Balance Due: {{currency}} {{balanceAmount}}
Due Date: {{dueDate}}

Please arrange to pay the remaining balance.

Best regards,
{{tenantName}}`
    },
    whatsapp: {
      body: `Partial payment of {{currency}} {{paidAmount}} received for invoice {{invoiceNumber}}. Balance: {{currency}} {{balanceAmount}}.`
    }
  },
  invoice_overdue: {
    email: {
      subject: "OVERDUE: Invoice {{invoiceNumber}}",
      body: `Dear {{customerName}},

Invoice {{invoiceNumber}} is now OVERDUE.

Amount Due: {{currency}} {{balanceAmount}}
Original Due Date: {{dueDate}}

Please pay immediately to avoid further action.

Best regards,
{{tenantName}}`
    },
    whatsapp: {
      body: `URGENT: Invoice {{invoiceNumber}} is overdue. Balance: {{currency}} {{balanceAmount}}. Please pay immediately.`
    }
  },
  invoice_cancelled: {
    email: {
      subject: "Invoice {{invoiceNumber}} Cancelled",
      body: `Dear {{customerName}},

Invoice {{invoiceNumber}} has been cancelled.

Original Amount: {{currency}} {{totalAmount}}

If you have any questions, please contact us.

Best regards,
{{tenantName}}`
    },
    whatsapp: {
      body: `Invoice {{invoiceNumber}} has been cancelled. Original amount: {{currency}} {{totalAmount}}.`
    }
  },
  custom: {
    email: {
      subject: "Message from {{tenantName}}",
      body: "{{customMessage}}"
    },
    whatsapp: {
      body: "{{customMessage}}"
    }
  }
};

export class NotificationService {
  private static instance: NotificationService;

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  async getChannelSettings(
    tenantId: string,
    channel: NotificationChannel
  ): Promise<TenantNotificationSettings | null> {
    const [settings] = await db.select()
      .from(tenantNotificationSettings)
      .where(and(
        eq(tenantNotificationSettings.tenantId, tenantId),
        eq(tenantNotificationSettings.channel, channel)
      ));
    return settings || null;
  }

  async isChannelEnabled(tenantId: string, channel: NotificationChannel): Promise<boolean> {
    const settings = await this.getChannelSettings(tenantId, channel);
    return settings?.isEnabled ?? false;
  }

  async getTemplate(
    tenantId: string,
    code: string,
    channel: NotificationChannel,
    language: string = "en"
  ): Promise<NotificationTemplate | null> {
    const [template] = await db.select()
      .from(notificationTemplates)
      .where(and(
        or(eq(notificationTemplates.tenantId, tenantId), eq(notificationTemplates.tenantId, "")),
        eq(notificationTemplates.code, code),
        eq(notificationTemplates.channel, channel),
        eq(notificationTemplates.language, language),
        eq(notificationTemplates.isActive, true)
      ))
      .limit(1);

    if (!template) {
      const [fallbackTemplate] = await db.select()
        .from(notificationTemplates)
        .where(and(
          or(eq(notificationTemplates.tenantId, tenantId), eq(notificationTemplates.tenantId, "")),
          eq(notificationTemplates.code, code),
          eq(notificationTemplates.channel, channel),
          eq(notificationTemplates.language, "en"),
          eq(notificationTemplates.isActive, true)
        ))
        .limit(1);
      return fallbackTemplate || null;
    }
    return template;
  }

  renderTemplate(template: string, variables: NotificationVariables): string {
    let rendered = template;
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, "g");
      rendered = rendered.replace(regex, value || "");
    }
    return rendered;
  }

  async sendNotification(options: SendNotificationOptions): Promise<NotificationResult> {
    const { tenantId, channel, eventType, recipient, variables, invoiceId, userId, language = "en" } = options;

    const settings = await this.getChannelSettings(tenantId, channel);
    if (!settings?.isEnabled) {
      return {
        success: false,
        logId: "",
        error: `${channel} notifications not enabled for this tenant`
      };
    }

    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId));
    const tenantName = tenant?.name || "Our Business";
    const enrichedVariables = { ...variables, tenantName };

    const templateCode = options.templateCode || eventType;
    let template = await this.getTemplate(tenantId, templateCode, channel, language);

    let subject = "";
    let body = "";

    if (template) {
      subject = template.subject ? this.renderTemplate(template.subject, enrichedVariables) : "";
      body = this.renderTemplate(template.body, enrichedVariables);
    } else {
      const defaultTemplate = DEFAULT_TEMPLATES[eventType];
      if (channel === "email") {
        subject = this.renderTemplate(defaultTemplate.email.subject, enrichedVariables);
        body = this.renderTemplate(defaultTemplate.email.body, enrichedVariables);
      } else {
        body = this.renderTemplate(defaultTemplate.whatsapp.body, enrichedVariables);
      }
    }

    const recipientAddress = channel === "email" ? recipient.email : recipient.phone;
    if (!recipientAddress) {
      return {
        success: false,
        logId: "",
        error: `No ${channel === "email" ? "email" : "phone"} address for recipient`
      };
    }

    const [logEntry] = await db.insert(notificationLogs).values({
      tenantId,
      templateId: template?.id,
      channel,
      eventType,
      recipient: recipientAddress,
      subject: subject || undefined,
      body,
      status: "pending",
      invoiceId,
      userId,
      metadata: { recipientName: recipient.name, variables: enrichedVariables }
    }).returning();

    try {
      let result: { success: boolean; messageId?: string; error?: string };

      if (channel === "email") {
        result = await this.sendEmail(settings, recipientAddress, subject, body, recipient.name);
      } else if (channel === "whatsapp") {
        result = await this.sendWhatsApp(settings, recipientAddress, body);
      } else {
        result = { success: false, error: `Unsupported channel: ${channel}` };
      }

      if (result.success) {
        await db.update(notificationLogs)
          .set({
            status: "sent",
            sentAt: new Date(),
            externalMessageId: result.messageId
          })
          .where(eq(notificationLogs.id, logEntry.id));

        return { success: true, logId: logEntry.id, messageId: result.messageId };
      } else {
        await this.handleFailure(logEntry.id, result.error || "Unknown error");
        return { success: false, logId: logEntry.id, error: result.error };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      await this.handleFailure(logEntry.id, errorMessage);
      return { success: false, logId: logEntry.id, error: errorMessage };
    }
  }

  private async handleFailure(logId: string, errorMessage: string): Promise<void> {
    const [log] = await db.select().from(notificationLogs).where(eq(notificationLogs.id, logId));
    if (!log) return;

    const retryCount = (log.retryCount || 0) + 1;
    const maxRetries = log.maxRetries || 3;

    if (retryCount < maxRetries) {
      const backoffMinutes = Math.pow(2, retryCount) * 5;
      const nextRetryAt = new Date(Date.now() + backoffMinutes * 60 * 1000);

      await db.update(notificationLogs)
        .set({
          status: "retrying",
          retryCount,
          nextRetryAt,
          errorMessage
        })
        .where(eq(notificationLogs.id, logId));
    } else {
      await db.update(notificationLogs)
        .set({
          status: "failed",
          retryCount,
          failedAt: new Date(),
          errorMessage
        })
        .where(eq(notificationLogs.id, logId));
    }
  }

  async processRetries(): Promise<number> {
    const now = new Date();
    const pendingRetries = await db.select()
      .from(notificationLogs)
      .where(and(
        eq(notificationLogs.status, "retrying"),
        lte(notificationLogs.nextRetryAt, now)
      ))
      .limit(50);

    let processed = 0;
    for (const log of pendingRetries) {
      const settings = await this.getChannelSettings(log.tenantId, log.channel as NotificationChannel);
      if (!settings) continue;

      try {
        let result: { success: boolean; messageId?: string; error?: string };

        if (log.channel === "email") {
          const metadata = log.metadata as { recipientName?: string } | null;
          result = await this.sendEmail(settings, log.recipient, log.subject || "", log.body, metadata?.recipientName || "");
        } else if (log.channel === "whatsapp") {
          result = await this.sendWhatsApp(settings, log.recipient, log.body);
        } else {
          continue;
        }

        if (result.success) {
          await db.update(notificationLogs)
            .set({
              status: "sent",
              sentAt: new Date(),
              externalMessageId: result.messageId,
              nextRetryAt: null
            })
            .where(eq(notificationLogs.id, log.id));
        } else {
          await this.handleFailure(log.id, result.error || "Retry failed");
        }
        processed++;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Retry error";
        await this.handleFailure(log.id, errorMessage);
        processed++;
      }
    }
    return processed;
  }

  private async sendEmail(
    settings: TenantNotificationSettings,
    to: string,
    subject: string,
    body: string,
    recipientName: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const config = settings.config as { 
      apiKey?: string; 
      fromEmail?: string; 
      fromName?: string;
      provider?: string;
    } | null;

    if (!config?.apiKey) {
      return { success: false, error: "Email provider not configured" };
    }

    const provider = settings.providerName || config.provider || "sendgrid";

    try {
      if (provider === "sendgrid") {
        const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${config.apiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            personalizations: [{
              to: [{ email: to, name: recipientName }]
            }],
            from: { email: config.fromEmail || "noreply@example.com", name: config.fromName || "Notifications" },
            subject,
            content: [{ type: "text/plain", value: body }]
          })
        });

        if (response.ok) {
          const messageId = response.headers.get("x-message-id") || `sg-${Date.now()}`;
          return { success: true, messageId };
        } else {
          const errorText = await response.text();
          return { success: false, error: `SendGrid error: ${response.status} - ${errorText}` };
        }
      } else if (provider === "resend") {
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${config.apiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            from: config.fromEmail || "noreply@example.com",
            to: [to],
            subject,
            text: body
          })
        });

        if (response.ok) {
          const data = await response.json();
          return { success: true, messageId: data.id };
        } else {
          const errorText = await response.text();
          return { success: false, error: `Resend error: ${response.status} - ${errorText}` };
        }
      }

      return { success: false, error: `Unknown email provider: ${provider}` };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Email send failed" };
    }
  }

  private async sendWhatsApp(
    settings: TenantNotificationSettings,
    to: string,
    body: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const config = settings.config as { 
      accountSid?: string;
      authToken?: string;
      fromNumber?: string;
      provider?: string;
    } | null;

    if (!config?.accountSid || !config?.authToken) {
      return { success: false, error: "WhatsApp provider not configured" };
    }

    const provider = settings.providerName || config.provider || "twilio";

    try {
      if (provider === "twilio") {
        const phone = to.startsWith("+") ? to : `+${to}`;
        const fromNumber = config.fromNumber?.startsWith("whatsapp:") 
          ? config.fromNumber 
          : `whatsapp:${config.fromNumber}`;

        const response = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}/Messages.json`,
          {
            method: "POST",
            headers: {
              "Authorization": `Basic ${Buffer.from(`${config.accountSid}:${config.authToken}`).toString("base64")}`,
              "Content-Type": "application/x-www-form-urlencoded"
            },
            body: new URLSearchParams({
              From: fromNumber,
              To: `whatsapp:${phone}`,
              Body: body
            })
          }
        );

        if (response.ok) {
          const data = await response.json();
          return { success: true, messageId: data.sid };
        } else {
          const errorData = await response.json();
          return { success: false, error: `Twilio error: ${errorData.message || response.status}` };
        }
      }

      return { success: false, error: `Unknown WhatsApp provider: ${provider}` };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "WhatsApp send failed" };
    }
  }

  async getNotificationLogs(
    tenantId: string,
    invoiceId?: string,
    limit: number = 50
  ): Promise<NotificationLog[]> {
    let query = db.select()
      .from(notificationLogs)
      .where(eq(notificationLogs.tenantId, tenantId))
      .orderBy(notificationLogs.createdAt)
      .limit(limit);

    if (invoiceId) {
      query = db.select()
        .from(notificationLogs)
        .where(and(
          eq(notificationLogs.tenantId, tenantId),
          eq(notificationLogs.invoiceId, invoiceId)
        ))
        .orderBy(notificationLogs.createdAt)
        .limit(limit);
    }

    return await query;
  }

  async sendInvoiceNotification(
    tenantId: string,
    invoiceId: string,
    eventType: NotificationEventType,
    channel: NotificationChannel,
    userId?: string
  ): Promise<NotificationResult> {
    const [invoice] = await db.select()
      .from(furnitureInvoices)
      .where(and(
        eq(furnitureInvoices.id, invoiceId),
        eq(furnitureInvoices.tenantId, tenantId)
      ));

    if (!invoice) {
      return { success: false, logId: "", error: "Invoice not found" };
    }

    const [customer] = await db.select()
      .from(customers)
      .where(eq(customers.id, invoice.customerId));

    if (!customer) {
      return { success: false, logId: "", error: "Customer not found" };
    }

    const totalAmount = parseFloat(invoice.totalAmount || "0");
    const paidAmount = parseFloat(invoice.paidAmount || "0");
    const balanceAmount = totalAmount - paidAmount;

    const variables: NotificationVariables = {
      customerName: customer.name,
      invoiceNumber: invoice.invoiceNumber,
      dueDate: invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : "N/A",
      totalAmount: totalAmount.toFixed(2),
      currency: invoice.currency || "USD",
      taxAmount: parseFloat(invoice.taxAmount || "0").toFixed(2),
      paidAmount: paidAmount.toFixed(2),
      balanceAmount: balanceAmount.toFixed(2)
    };

    return await this.sendNotification({
      tenantId,
      channel,
      eventType,
      recipient: {
        email: customer.email || undefined,
        phone: customer.phone || undefined,
        name: customer.name
      },
      variables,
      invoiceId,
      userId,
      language: "en"
    });
  }
}

export const notificationService = NotificationService.getInstance();
