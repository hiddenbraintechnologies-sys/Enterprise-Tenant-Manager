import { db } from "../db";
import { 
  recurringPaymentSchedules, 
  recurringPaymentExecutions,
  furnitureInvoices,
  furnitureInvoicePayments,
  customers,
  type RecurringPaymentSchedule,
  type InsertRecurringPaymentSchedule,
} from "@shared/schema";
import { eq, and, lte, sql } from "drizzle-orm";
import { addDays, addWeeks, addMonths, addYears, startOfDay, endOfDay } from "date-fns";

export type RecurringFrequency = "daily" | "weekly" | "biweekly" | "monthly" | "quarterly" | "yearly";

interface CreateRecurringScheduleParams {
  tenantId: string;
  customerId: string;
  sourceInvoiceId?: string;
  name: string;
  description?: string;
  frequency: RecurringFrequency;
  intervalCount?: number;
  amount: string;
  currency: string;
  startDate: Date;
  endDate?: Date;
  preferredPaymentMethod?: string;
  autoGenerateInvoice?: boolean;
  invoicePrefix?: string;
  createdBy?: string;
}

export class RecurringPaymentService {
  async createSchedule(params: CreateRecurringScheduleParams): Promise<RecurringPaymentSchedule> {
    const nextBillingDate = this.calculateNextBillingDate(params.startDate, params.frequency, params.intervalCount || 1);
    const billingPeriod = this.calculateBillingPeriod(params.startDate, params.frequency, params.intervalCount || 1);

    const [schedule] = await db.insert(recurringPaymentSchedules).values({
      tenantId: params.tenantId,
      customerId: params.customerId,
      sourceInvoiceId: params.sourceInvoiceId,
      name: params.name,
      description: params.description,
      frequency: params.frequency,
      intervalCount: params.intervalCount || 1,
      amount: params.amount,
      currency: params.currency,
      startDate: params.startDate,
      endDate: params.endDate,
      nextBillingDate,
      currentBillingPeriodStart: billingPeriod.start,
      currentBillingPeriodEnd: billingPeriod.end,
      preferredPaymentMethod: params.preferredPaymentMethod,
      autoGenerateInvoice: params.autoGenerateInvoice ?? true,
      invoicePrefix: params.invoicePrefix,
      createdBy: params.createdBy,
      status: "active",
    }).returning();

    return schedule;
  }

  async getSchedulesByTenant(tenantId: string): Promise<RecurringPaymentSchedule[]> {
    return db.select()
      .from(recurringPaymentSchedules)
      .where(eq(recurringPaymentSchedules.tenantId, tenantId));
  }

  async getScheduleById(id: string, tenantId: string): Promise<RecurringPaymentSchedule | undefined> {
    const [schedule] = await db.select()
      .from(recurringPaymentSchedules)
      .where(and(
        eq(recurringPaymentSchedules.id, id),
        eq(recurringPaymentSchedules.tenantId, tenantId)
      ));
    return schedule;
  }

  async updateScheduleStatus(id: string, tenantId: string, status: "active" | "paused" | "cancelled"): Promise<RecurringPaymentSchedule | undefined> {
    const [updated] = await db.update(recurringPaymentSchedules)
      .set({ status, updatedAt: new Date() })
      .where(and(
        eq(recurringPaymentSchedules.id, id),
        eq(recurringPaymentSchedules.tenantId, tenantId)
      ))
      .returning();
    return updated;
  }

  async getDueSchedules(): Promise<RecurringPaymentSchedule[]> {
    const now = new Date();
    return db.select()
      .from(recurringPaymentSchedules)
      .where(and(
        eq(recurringPaymentSchedules.status, "active"),
        lte(recurringPaymentSchedules.nextBillingDate, now)
      ));
  }

  async processSchedule(schedule: RecurringPaymentSchedule): Promise<{ success: boolean; error?: string; invoiceId?: string }> {
    const billingPeriodStart = schedule.currentBillingPeriodStart || schedule.startDate;
    const billingPeriodEnd = schedule.currentBillingPeriodEnd || this.calculateBillingPeriod(
      billingPeriodStart,
      schedule.frequency as RecurringFrequency,
      schedule.intervalCount || 1
    ).end;

    const existingExecution = await db.select()
      .from(recurringPaymentExecutions)
      .where(and(
        eq(recurringPaymentExecutions.scheduleId, schedule.id),
        eq(recurringPaymentExecutions.billingPeriodStart, billingPeriodStart),
        eq(recurringPaymentExecutions.billingPeriodEnd, billingPeriodEnd)
      ))
      .limit(1);

    if (existingExecution.length > 0) {
      return { success: false, error: "Billing period already processed" };
    }

    try {
      const [execution] = await db.insert(recurringPaymentExecutions).values({
        scheduleId: schedule.id,
        billingPeriodStart,
        billingPeriodEnd,
        amount: schedule.amount,
        currency: schedule.currency,
        status: "processing",
        attemptCount: 1,
        lastAttemptAt: new Date(),
      }).returning();

      let generatedInvoiceId: string | undefined;

      if (schedule.autoGenerateInvoice) {
        const invoiceNumber = this.generateInvoiceNumber(schedule.invoicePrefix || undefined);
        
        const [invoice] = await db.insert(furnitureInvoices).values({
          tenantId: schedule.tenantId,
          invoiceNumber,
          invoiceType: "tax_invoice",
          status: "issued",
          customerId: schedule.customerId,
          invoiceDate: new Date(),
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          currency: schedule.currency,
          baseCurrency: "USD",
          exchangeRate: "1.00000000",
          subtotal: schedule.amount,
          taxAmount: "0",
          totalAmount: schedule.amount,
          paidAmount: "0",
          balanceAmount: schedule.amount,
          billingName: schedule.name,
          notes: `Auto-generated from recurring schedule: ${schedule.name}`,
        }).returning();

        generatedInvoiceId = invoice.id;

        await db.update(recurringPaymentExecutions)
          .set({ 
            generatedInvoiceId: invoice.id,
            status: "completed",
            completedAt: new Date(),
          })
          .where(eq(recurringPaymentExecutions.id, execution.id));
      } else {
        await db.update(recurringPaymentExecutions)
          .set({ 
            status: "completed",
            completedAt: new Date(),
          })
          .where(eq(recurringPaymentExecutions.id, execution.id));
      }

      const nextBillingDate = this.calculateNextBillingDate(
        schedule.nextBillingDate,
        schedule.frequency as RecurringFrequency,
        schedule.intervalCount || 1
      );
      const nextPeriod = this.calculateBillingPeriod(
        nextBillingDate,
        schedule.frequency as RecurringFrequency,
        schedule.intervalCount || 1
      );

      let newStatus: "active" | "completed" = "active";
      if (schedule.endDate && nextBillingDate > schedule.endDate) {
        newStatus = "completed";
      }

      await db.update(recurringPaymentSchedules)
        .set({
          lastBillingDate: new Date(),
          nextBillingDate,
          currentBillingPeriodStart: nextPeriod.start,
          currentBillingPeriodEnd: nextPeriod.end,
          totalPaymentsMade: sql`${recurringPaymentSchedules.totalPaymentsMade} + 1`,
          totalAmountPaid: sql`${recurringPaymentSchedules.totalAmountPaid} + ${schedule.amount}::decimal`,
          lastPaymentStatus: "completed",
          lastPaymentDate: new Date(),
          status: newStatus,
          updatedAt: new Date(),
        })
        .where(eq(recurringPaymentSchedules.id, schedule.id));

      return { success: true, invoiceId: generatedInvoiceId };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      
      await db.update(recurringPaymentSchedules)
        .set({
          failedPaymentCount: sql`${recurringPaymentSchedules.failedPaymentCount} + 1`,
          lastPaymentStatus: "failed",
          updatedAt: new Date(),
        })
        .where(eq(recurringPaymentSchedules.id, schedule.id));

      return { success: false, error: errorMessage };
    }
  }

  async getUpcomingPayments(tenantId: string, daysAhead: number = 30): Promise<RecurringPaymentSchedule[]> {
    const futureDate = addDays(new Date(), daysAhead);
    return db.select()
      .from(recurringPaymentSchedules)
      .where(and(
        eq(recurringPaymentSchedules.tenantId, tenantId),
        eq(recurringPaymentSchedules.status, "active"),
        lte(recurringPaymentSchedules.nextBillingDate, futureDate)
      ));
  }

  async getExecutionHistory(scheduleId: string, tenantId: string) {
    const schedule = await this.getScheduleById(scheduleId, tenantId);
    if (!schedule) return [];

    return db.select()
      .from(recurringPaymentExecutions)
      .where(eq(recurringPaymentExecutions.scheduleId, scheduleId))
      .orderBy(sql`${recurringPaymentExecutions.executedAt} DESC`);
  }

  private calculateNextBillingDate(fromDate: Date, frequency: RecurringFrequency, intervalCount: number): Date {
    switch (frequency) {
      case "daily":
        return addDays(fromDate, intervalCount);
      case "weekly":
        return addWeeks(fromDate, intervalCount);
      case "biweekly":
        return addWeeks(fromDate, intervalCount * 2);
      case "monthly":
        return addMonths(fromDate, intervalCount);
      case "quarterly":
        return addMonths(fromDate, intervalCount * 3);
      case "yearly":
        return addYears(fromDate, intervalCount);
      default:
        return addMonths(fromDate, intervalCount);
    }
  }

  private calculateBillingPeriod(startDate: Date, frequency: RecurringFrequency, intervalCount: number): { start: Date; end: Date } {
    const start = startOfDay(startDate);
    const end = endOfDay(addDays(this.calculateNextBillingDate(start, frequency, intervalCount), -1));
    return { start, end };
  }

  private generateInvoiceNumber(prefix?: string): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return prefix ? `${prefix}-${timestamp}${random}` : `REC-${timestamp}${random}`;
  }
}

export const recurringPaymentService = new RecurringPaymentService();
