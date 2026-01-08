import { db } from "../db";
import { 
  scheduledBillingJobs,
  scheduledBillingJobLogs,
  type ScheduledBillingJob,
  type ScheduledBillingJobLog,
} from "@shared/schema";
import { eq, and, lte, sql } from "drizzle-orm";
import { addHours, addDays, addWeeks, setHours, setMinutes, startOfDay } from "date-fns";
import { recurringPaymentService } from "./recurring-payments";
import { autoReminderService } from "./auto-reminders";

interface CreateBillingJobParams {
  tenantId: string;
  jobType: "recurring_invoice" | "reminder_dispatch" | "overdue_check";
  name: string;
  description?: string;
  frequency: "hourly" | "daily" | "weekly";
  runAtHour?: number;
  runAtMinute?: number;
  timezone?: string;
  recurringScheduleId?: string;
  reminderScheduleId?: string;
}

export class ScheduledBillingService {
  async createJob(params: CreateBillingJobParams): Promise<ScheduledBillingJob> {
    const nextRunAt = this.calculateNextRunTime(
      params.frequency,
      params.runAtHour || 9,
      params.runAtMinute || 0
    );

    const [job] = await db.insert(scheduledBillingJobs).values({
      tenantId: params.tenantId,
      jobType: params.jobType,
      name: params.name,
      description: params.description,
      frequency: params.frequency,
      runAtHour: params.runAtHour || 9,
      runAtMinute: params.runAtMinute || 0,
      timezone: params.timezone || "UTC",
      recurringScheduleId: params.recurringScheduleId,
      reminderScheduleId: params.reminderScheduleId,
      nextRunAt,
      isActive: true,
    }).returning();

    return job;
  }

  async getJobsByTenant(tenantId: string): Promise<ScheduledBillingJob[]> {
    return db.select()
      .from(scheduledBillingJobs)
      .where(eq(scheduledBillingJobs.tenantId, tenantId));
  }

  async getActiveJobs(tenantId: string): Promise<ScheduledBillingJob[]> {
    return db.select()
      .from(scheduledBillingJobs)
      .where(and(
        eq(scheduledBillingJobs.tenantId, tenantId),
        eq(scheduledBillingJobs.isActive, true)
      ));
  }

  async updateJob(id: string, tenantId: string, updates: Partial<ScheduledBillingJob>): Promise<ScheduledBillingJob | undefined> {
    const [updated] = await db.update(scheduledBillingJobs)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(
        eq(scheduledBillingJobs.id, id),
        eq(scheduledBillingJobs.tenantId, tenantId)
      ))
      .returning();
    return updated;
  }

  async toggleJobStatus(id: string, tenantId: string, isActive: boolean): Promise<ScheduledBillingJob | undefined> {
    const nextRunAt = isActive 
      ? this.calculateNextRunTime("daily", 9, 0)
      : null;

    const [updated] = await db.update(scheduledBillingJobs)
      .set({ 
        isActive, 
        nextRunAt: nextRunAt || undefined,
        updatedAt: new Date() 
      })
      .where(and(
        eq(scheduledBillingJobs.id, id),
        eq(scheduledBillingJobs.tenantId, tenantId)
      ))
      .returning();
    return updated;
  }

  async getDueJobs(): Promise<ScheduledBillingJob[]> {
    const now = new Date();
    return db.select()
      .from(scheduledBillingJobs)
      .where(and(
        eq(scheduledBillingJobs.isActive, true),
        lte(scheduledBillingJobs.nextRunAt, now)
      ));
  }

  async executeJob(job: ScheduledBillingJob): Promise<ScheduledBillingJobLog> {
    const startTime = Date.now();
    
    const [log] = await db.insert(scheduledBillingJobLogs).values({
      jobId: job.id,
      status: "running",
    }).returning();

    let itemsProcessed = 0;
    let itemsSucceeded = 0;
    let itemsFailed = 0;
    let errorMessage: string | undefined;
    const details: Record<string, unknown>[] = [];

    try {
      switch (job.jobType) {
        case "recurring_invoice":
          const recurringResult = await this.processRecurringInvoices(job.tenantId);
          itemsProcessed = recurringResult.processed;
          itemsSucceeded = recurringResult.succeeded;
          itemsFailed = recurringResult.failed;
          details.push(...recurringResult.details);
          break;

        case "reminder_dispatch":
          const reminderResult = await this.processReminders(job.tenantId);
          itemsProcessed = reminderResult.processed;
          itemsSucceeded = reminderResult.succeeded;
          itemsFailed = reminderResult.failed;
          details.push(...reminderResult.details);
          break;

        case "overdue_check":
          const overdueResult = await this.processOverdueCheck(job.tenantId);
          itemsProcessed = overdueResult.processed;
          itemsSucceeded = overdueResult.succeeded;
          details.push(...overdueResult.details);
          break;
      }
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : "Unknown error";
      itemsFailed = itemsProcessed - itemsSucceeded;
    }

    const durationMs = Date.now() - startTime;
    const status = errorMessage ? "failed" : (itemsFailed > 0 ? "partial" : "success");

    await db.update(scheduledBillingJobLogs)
      .set({
        completedAt: new Date(),
        status,
        itemsProcessed,
        itemsSucceeded,
        itemsFailed,
        details,
        errorMessage,
        durationMs,
      })
      .where(eq(scheduledBillingJobLogs.id, log.id));

    const nextRunAt = this.calculateNextRunTime(
      job.frequency as "hourly" | "daily" | "weekly",
      job.runAtHour || 9,
      job.runAtMinute || 0
    );

    await db.update(scheduledBillingJobs)
      .set({
        lastRunAt: new Date(),
        nextRunAt,
        lastRunStatus: status,
        lastRunError: errorMessage,
        totalRuns: sql`${scheduledBillingJobs.totalRuns} + 1`,
        successfulRuns: status === "success" 
          ? sql`${scheduledBillingJobs.successfulRuns} + 1` 
          : scheduledBillingJobs.successfulRuns,
        failedRuns: status === "failed" 
          ? sql`${scheduledBillingJobs.failedRuns} + 1` 
          : scheduledBillingJobs.failedRuns,
        updatedAt: new Date(),
      })
      .where(eq(scheduledBillingJobs.id, job.id));

    const [updatedLog] = await db.select()
      .from(scheduledBillingJobLogs)
      .where(eq(scheduledBillingJobLogs.id, log.id));

    return updatedLog;
  }

  async getJobLogs(jobId: string, tenantId: string, limit: number = 20): Promise<ScheduledBillingJobLog[]> {
    const [job] = await db.select()
      .from(scheduledBillingJobs)
      .where(and(
        eq(scheduledBillingJobs.id, jobId),
        eq(scheduledBillingJobs.tenantId, tenantId)
      ));

    if (!job) return [];

    return db.select()
      .from(scheduledBillingJobLogs)
      .where(eq(scheduledBillingJobLogs.jobId, jobId))
      .orderBy(sql`${scheduledBillingJobLogs.startedAt} DESC`)
      .limit(limit);
  }

  async runAllDueJobs(): Promise<{ jobsRun: number; results: ScheduledBillingJobLog[] }> {
    const dueJobs = await this.getDueJobs();
    const results: ScheduledBillingJobLog[] = [];

    for (const job of dueJobs) {
      const log = await this.executeJob(job);
      results.push(log);
    }

    return { jobsRun: dueJobs.length, results };
  }

  async getScheduledPaymentsAndReminders(tenantId: string): Promise<{
    upcomingPayments: Awaited<ReturnType<typeof recurringPaymentService.getUpcomingPayments>>;
    pendingReminders: Awaited<ReturnType<typeof autoReminderService.getScheduledReminders>>;
    activeJobs: ScheduledBillingJob[];
  }> {
    const [upcomingPayments, pendingReminders, activeJobs] = await Promise.all([
      recurringPaymentService.getUpcomingPayments(tenantId, 30),
      autoReminderService.getScheduledReminders(tenantId, "pending"),
      this.getActiveJobs(tenantId),
    ]);

    return { upcomingPayments, pendingReminders, activeJobs };
  }

  private async processRecurringInvoices(tenantId: string) {
    const schedules = await recurringPaymentService.getDueSchedules();
    const tenantSchedules = schedules.filter(s => s.tenantId === tenantId);
    
    const details: Record<string, unknown>[] = [];
    let succeeded = 0;
    let failed = 0;

    for (const schedule of tenantSchedules) {
      const result = await recurringPaymentService.processSchedule(schedule);
      details.push({
        scheduleId: schedule.id,
        name: schedule.name,
        success: result.success,
        error: result.error,
        invoiceId: result.invoiceId,
      });
      if (result.success) succeeded++;
      else failed++;
    }

    return { processed: tenantSchedules.length, succeeded, failed, details };
  }

  private async processReminders(tenantId: string) {
    await autoReminderService.generateScheduledReminders(tenantId);
    
    const pendingReminders = await autoReminderService.getPendingReminders(tenantId);
    const details: Record<string, unknown>[] = [];
    let succeeded = 0;
    let failed = 0;

    for (const reminder of pendingReminders) {
      const result = await autoReminderService.processReminder(reminder);
      details.push({
        reminderId: reminder.id,
        invoiceId: reminder.invoiceId,
        success: result.success,
        error: result.error,
      });
      if (result.success) succeeded++;
      else failed++;
    }

    return { processed: pendingReminders.length, succeeded, failed, details };
  }

  private async processOverdueCheck(tenantId: string) {
    const { furnitureInvoices } = await import("@shared/schema");
    
    const now = new Date();
    const overdueInvoices = await db.select()
      .from(furnitureInvoices)
      .where(and(
        eq(furnitureInvoices.tenantId, tenantId),
        eq(furnitureInvoices.status, "issued"),
        lte(furnitureInvoices.dueDate, now),
        sql`CAST(${furnitureInvoices.balanceAmount} AS DECIMAL) > 0`
      ));

    const details: Record<string, unknown>[] = [];

    for (const invoice of overdueInvoices) {
      await db.update(furnitureInvoices)
        .set({ status: "overdue", updatedAt: new Date() })
        .where(eq(furnitureInvoices.id, invoice.id));
      
      details.push({
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        markedOverdue: true,
      });
    }

    return { processed: overdueInvoices.length, succeeded: overdueInvoices.length, details };
  }

  private calculateNextRunTime(frequency: "hourly" | "daily" | "weekly", hour: number, minute: number): Date {
    let nextRun = new Date();
    
    switch (frequency) {
      case "hourly":
        nextRun = addHours(nextRun, 1);
        nextRun = setMinutes(nextRun, minute);
        break;
      case "daily":
        nextRun = addDays(startOfDay(nextRun), 1);
        nextRun = setHours(nextRun, hour);
        nextRun = setMinutes(nextRun, minute);
        break;
      case "weekly":
        nextRun = addWeeks(startOfDay(nextRun), 1);
        nextRun = setHours(nextRun, hour);
        nextRun = setMinutes(nextRun, minute);
        break;
    }

    return nextRun;
  }
}

export const scheduledBillingService = new ScheduledBillingService();
