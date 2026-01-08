import { db } from "../db";
import { 
  invoiceReminderSchedules,
  scheduledReminderExecutions,
  furnitureInvoices,
  customers,
  type InvoiceReminderSchedule,
  type ScheduledReminderExecution,
} from "@shared/schema";
import { eq, and, lte, gte, sql, isNull, or, ne } from "drizzle-orm";
import { addDays, startOfDay, setHours, setMinutes } from "date-fns";
import { notificationService } from "./notification";

interface CreateReminderScheduleParams {
  tenantId: string;
  name: string;
  description?: string;
  daysFromDueDate: number;
  sendTimeHour?: number;
  sendTimeMinute?: number;
  channels: string[];
  emailTemplateId?: string;
  whatsappTemplateId?: string;
  eventType?: string;
  appliesTo?: "all" | "overdue_only" | "upcoming_only";
  minBalanceAmount?: string;
  maxRetryAttempts?: number;
  createdBy?: string;
}

export class AutoReminderService {
  async createReminderSchedule(params: CreateReminderScheduleParams): Promise<InvoiceReminderSchedule> {
    const [schedule] = await db.insert(invoiceReminderSchedules).values({
      tenantId: params.tenantId,
      name: params.name,
      description: params.description,
      daysFromDueDate: params.daysFromDueDate,
      sendTimeHour: params.sendTimeHour ?? 9,
      sendTimeMinute: params.sendTimeMinute ?? 0,
      channels: params.channels,
      emailTemplateId: params.emailTemplateId,
      whatsappTemplateId: params.whatsappTemplateId,
      eventType: params.eventType || "payment_reminder",
      appliesTo: params.appliesTo || "all",
      minBalanceAmount: params.minBalanceAmount || "0",
      maxRetryAttempts: params.maxRetryAttempts || 3,
      isActive: true,
      createdBy: params.createdBy,
    }).returning();

    return schedule;
  }

  async getReminderSchedulesByTenant(tenantId: string): Promise<InvoiceReminderSchedule[]> {
    return db.select()
      .from(invoiceReminderSchedules)
      .where(eq(invoiceReminderSchedules.tenantId, tenantId));
  }

  async getActiveReminderSchedules(tenantId: string): Promise<InvoiceReminderSchedule[]> {
    return db.select()
      .from(invoiceReminderSchedules)
      .where(and(
        eq(invoiceReminderSchedules.tenantId, tenantId),
        eq(invoiceReminderSchedules.isActive, true)
      ));
  }

  async updateReminderSchedule(id: string, tenantId: string, updates: Partial<InvoiceReminderSchedule>): Promise<InvoiceReminderSchedule | undefined> {
    const [updated] = await db.update(invoiceReminderSchedules)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(
        eq(invoiceReminderSchedules.id, id),
        eq(invoiceReminderSchedules.tenantId, tenantId)
      ))
      .returning();
    return updated;
  }

  async deleteReminderSchedule(id: string, tenantId: string): Promise<boolean> {
    const result = await db.delete(invoiceReminderSchedules)
      .where(and(
        eq(invoiceReminderSchedules.id, id),
        eq(invoiceReminderSchedules.tenantId, tenantId)
      ));
    return true;
  }

  async generateScheduledReminders(tenantId: string): Promise<number> {
    const schedules = await this.getActiveReminderSchedules(tenantId);
    let generatedCount = 0;

    for (const schedule of schedules) {
      const invoices = await this.getEligibleInvoices(tenantId, schedule);
      
      for (const invoice of invoices) {
        if (!invoice.dueDate) continue;

        const reminderDate = addDays(invoice.dueDate, schedule.daysFromDueDate);
        const scheduledFor = setMinutes(
          setHours(startOfDay(reminderDate), schedule.sendTimeHour || 9),
          schedule.sendTimeMinute || 0
        );

        if (scheduledFor < new Date()) continue;

        const existing = await db.select()
          .from(scheduledReminderExecutions)
          .where(and(
            eq(scheduledReminderExecutions.scheduleId, schedule.id),
            eq(scheduledReminderExecutions.invoiceId, invoice.id),
            eq(scheduledReminderExecutions.scheduledFor, scheduledFor)
          ))
          .limit(1);

        if (existing.length === 0) {
          await db.insert(scheduledReminderExecutions).values({
            scheduleId: schedule.id,
            invoiceId: invoice.id,
            scheduledFor,
            status: "pending",
          });
          generatedCount++;
        }
      }
    }

    return generatedCount;
  }

  async getPendingReminders(tenantId?: string): Promise<ScheduledReminderExecution[]> {
    const now = new Date();
    
    const query = db.select()
      .from(scheduledReminderExecutions)
      .innerJoin(invoiceReminderSchedules, eq(scheduledReminderExecutions.scheduleId, invoiceReminderSchedules.id))
      .where(and(
        eq(scheduledReminderExecutions.status, "pending"),
        lte(scheduledReminderExecutions.scheduledFor, now),
        eq(invoiceReminderSchedules.isActive, true),
        tenantId ? eq(invoiceReminderSchedules.tenantId, tenantId) : sql`1=1`
      ));

    const results = await query;
    return results.map(r => r.scheduled_reminder_executions);
  }

  async processReminder(execution: ScheduledReminderExecution): Promise<{ success: boolean; error?: string }> {
    const [schedule] = await db.select()
      .from(invoiceReminderSchedules)
      .where(eq(invoiceReminderSchedules.id, execution.scheduleId));

    if (!schedule) {
      await this.markReminderSkipped(execution.id, "Schedule not found");
      return { success: false, error: "Schedule not found" };
    }

    const [invoice] = await db.select()
      .from(furnitureInvoices)
      .where(eq(furnitureInvoices.id, execution.invoiceId));

    if (!invoice) {
      await this.markReminderSkipped(execution.id, "Invoice not found");
      return { success: false, error: "Invoice not found" };
    }

    if (invoice.status === "paid" || invoice.status === "cancelled") {
      await this.markReminderSkipped(execution.id, `Invoice is ${invoice.status}`);
      return { success: true };
    }

    const balanceAmount = parseFloat(invoice.balanceAmount?.toString() || "0");
    const minBalance = parseFloat(schedule.minBalanceAmount?.toString() || "0");
    if (balanceAmount <= minBalance) {
      await this.markReminderSkipped(execution.id, "Balance below threshold");
      return { success: true };
    }

    let emailSent = false;
    let whatsappSent = false;
    let emailLogId: string | undefined;
    let whatsappLogId: string | undefined;
    let lastError: string | undefined;

    const channels = schedule.channels || ["email"];

    for (const channel of channels) {
      try {
        const result = await notificationService.sendInvoiceNotification(
          schedule.tenantId,
          invoice.id,
          (schedule.eventType || "payment_reminder") as any,
          channel as "email" | "whatsapp"
        );

        if (result.success) {
          if (channel === "email") {
            emailSent = true;
            emailLogId = result.logId;
          } else if (channel === "whatsapp") {
            whatsappSent = true;
            whatsappLogId = result.logId;
          }
        } else {
          lastError = result.error;
        }
      } catch (error) {
        lastError = error instanceof Error ? error.message : "Unknown error";
      }
    }

    const allSent = (channels.includes("email") ? emailSent : true) && 
                    (channels.includes("whatsapp") ? whatsappSent : true);

    await db.update(scheduledReminderExecutions)
      .set({
        status: allSent ? "sent" : "failed",
        emailSent,
        whatsappSent,
        emailNotificationLogId: emailLogId,
        whatsappNotificationLogId: whatsappLogId,
        attemptCount: (execution.attemptCount || 0) + 1,
        lastAttemptAt: new Date(),
        executedAt: allSent ? new Date() : null,
        errorMessage: lastError,
      })
      .where(eq(scheduledReminderExecutions.id, execution.id));

    return { success: allSent, error: lastError };
  }

  async sendManualReminder(tenantId: string, invoiceId: string, channel: "email" | "whatsapp"): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await notificationService.sendInvoiceNotification(
        tenantId,
        invoiceId,
        "payment_reminder",
        channel
      );
      return { success: result.success, error: result.error };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      };
    }
  }

  async getScheduledReminders(tenantId: string, status?: string): Promise<ScheduledReminderExecution[]> {
    const query = db.select({
      execution: scheduledReminderExecutions,
    })
      .from(scheduledReminderExecutions)
      .innerJoin(invoiceReminderSchedules, eq(scheduledReminderExecutions.scheduleId, invoiceReminderSchedules.id))
      .where(and(
        eq(invoiceReminderSchedules.tenantId, tenantId),
        status ? eq(scheduledReminderExecutions.status, status) : sql`1=1`
      ))
      .orderBy(sql`${scheduledReminderExecutions.scheduledFor} ASC`);

    const results = await query;
    return results.map(r => r.execution);
  }

  private async markReminderSkipped(executionId: string, reason: string): Promise<void> {
    await db.update(scheduledReminderExecutions)
      .set({
        status: "skipped",
        skipReason: reason,
        executedAt: new Date(),
      })
      .where(eq(scheduledReminderExecutions.id, executionId));
  }

  private async getEligibleInvoices(tenantId: string, schedule: InvoiceReminderSchedule) {
    const now = new Date();
    const minBalance = parseFloat(schedule.minBalanceAmount?.toString() || "0");

    let statusCondition = sql`1=1`;
    if (schedule.appliesTo === "overdue_only") {
      statusCondition = and(
        eq(furnitureInvoices.status, "overdue"),
        lte(furnitureInvoices.dueDate, now)
      )!;
    } else if (schedule.appliesTo === "upcoming_only") {
      statusCondition = and(
        ne(furnitureInvoices.status, "overdue"),
        gte(furnitureInvoices.dueDate, now)
      )!;
    }

    return db.select()
      .from(furnitureInvoices)
      .where(and(
        eq(furnitureInvoices.tenantId, tenantId),
        or(eq(furnitureInvoices.status, "issued"), eq(furnitureInvoices.status, "overdue")),
        sql`CAST(${furnitureInvoices.balanceAmount} AS DECIMAL) > ${minBalance}`,
        statusCondition
      ));
  }
}

export const autoReminderService = new AutoReminderService();
