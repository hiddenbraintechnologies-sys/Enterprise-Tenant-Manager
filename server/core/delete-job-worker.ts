import { db } from "../db";
import { eq, and, sql } from "drizzle-orm";
import {
  deleteJobs,
  tenants,
  userTenants,
  staff,
  customers,
  services,
  bookings,
  invoices,
  payments,
  projects,
  refreshTokens,
  auditLogs,
  timesheets,
} from "@shared/schema";
import { users } from "@shared/models/auth";
import { auditService } from "./audit";

const POLL_INTERVAL_MS = 10000;

type DeleteSummary = {
  deletedTables: Record<string, number>;
  totalDeleted: number;
  errors: string[];
};

async function processTenantWipe(job: typeof deleteJobs.$inferSelect): Promise<DeleteSummary> {
  const summary: DeleteSummary = { deletedTables: {}, totalDeleted: 0, errors: [] };
  const tenantId = job.targetId;

  const deleteOrder = [
    { table: "bookings", deleteFunc: async () => {
      const result = await db.delete(bookings).where(eq(bookings.tenantId, tenantId)).returning({ id: bookings.id });
      return result.length;
    }},
    { table: "invoices", deleteFunc: async () => {
      const result = await db.delete(invoices).where(eq(invoices.tenantId, tenantId)).returning({ id: invoices.id });
      return result.length;
    }},
    { table: "payments", deleteFunc: async () => {
      const result = await db.delete(payments).where(eq(payments.tenantId, tenantId)).returning({ id: payments.id });
      return result.length;
    }},
    { table: "services", deleteFunc: async () => {
      const result = await db.delete(services).where(eq(services.tenantId, tenantId)).returning({ id: services.id });
      return result.length;
    }},
    { table: "customers", deleteFunc: async () => {
      const result = await db.delete(customers).where(eq(customers.tenantId, tenantId)).returning({ id: customers.id });
      return result.length;
    }},
    { table: "staff", deleteFunc: async () => {
      const result = await db.delete(staff).where(eq(staff.tenantId, tenantId)).returning({ id: staff.id });
      return result.length;
    }},
    { table: "projects", deleteFunc: async () => {
      const result = await db.delete(projects).where(eq(projects.tenantId, tenantId)).returning({ id: projects.id });
      return result.length;
    }},
    { table: "timesheets", deleteFunc: async () => {
      const result = await db.delete(timesheets).where(eq(timesheets.tenantId, tenantId)).returning({ id: timesheets.id });
      return result.length;
    }},
    { table: "audit_logs", deleteFunc: async () => {
      const result = await db.delete(auditLogs).where(eq(auditLogs.tenantId, tenantId)).returning({ id: auditLogs.id });
      return result.length;
    }},
    { table: "refresh_tokens", deleteFunc: async () => {
      const result = await db.delete(refreshTokens).where(eq(refreshTokens.tenantId, tenantId)).returning({ id: refreshTokens.id });
      return result.length;
    }},
    { table: "user_tenants", deleteFunc: async () => {
      const result = await db.delete(userTenants).where(eq(userTenants.tenantId, tenantId)).returning({ id: userTenants.id });
      return result.length;
    }},
  ];

  const totalSteps = deleteOrder.length + 1;
  let currentStep = 0;

  for (const { table, deleteFunc } of deleteOrder) {
    try {
      currentStep++;
      await db.update(deleteJobs)
        .set({ 
          currentStep: `Deleting ${table}...`,
          progress: Math.round((currentStep / totalSteps) * 100)
        })
        .where(eq(deleteJobs.id, job.id));

      const count = await deleteFunc();
      summary.deletedTables[table] = count;
      summary.totalDeleted += count;
    } catch (error) {
      const errorMsg = `Failed to delete from ${table}: ${error instanceof Error ? error.message : String(error)}`;
      summary.errors.push(errorMsg);
      console.error(`[delete-job-worker] ${errorMsg}`);
    }
  }

  // Delete users who only belonged to this tenant
  await db.update(deleteJobs)
    .set({ 
      currentStep: "Cleaning up users...",
      progress: 90
    })
    .where(eq(deleteJobs.id, job.id));

  try {
    // Get all users who belonged to this tenant (from the records we already deleted from user_tenants)
    // We need to find users who no longer have any tenant associations
    const orphanedUsers = await db.execute(sql`
      SELECT u.id FROM users u
      WHERE NOT EXISTS (
        SELECT 1 FROM user_tenants ut WHERE ut.user_id = u.id
      )
    `);
    
    if (orphanedUsers.rows && orphanedUsers.rows.length > 0) {
      for (const row of orphanedUsers.rows) {
        await db.delete(users).where(eq(users.id, row.id as string));
      }
      summary.deletedTables["users"] = orphanedUsers.rows.length;
      summary.totalDeleted += orphanedUsers.rows.length;
    }
  } catch (error) {
    const errorMsg = `Failed to clean up users: ${error instanceof Error ? error.message : String(error)}`;
    summary.errors.push(errorMsg);
    console.error(`[delete-job-worker] ${errorMsg}`);
  }

  // Hard delete the tenant record (cascades remaining data via FK constraints)
  await db.update(deleteJobs)
    .set({ 
      currentStep: "Deleting tenant record...",
      progress: 95
    })
    .where(eq(deleteJobs.id, job.id));

  try {
    await db.delete(tenants).where(eq(tenants.id, tenantId));
    summary.deletedTables["tenant"] = 1;
    summary.totalDeleted += 1;
  } catch (error) {
    // If hard delete fails (e.g., FK constraint issues), fall back to soft delete
    const errorMsg = `Hard delete failed, falling back to soft delete: ${error instanceof Error ? error.message : String(error)}`;
    summary.errors.push(errorMsg);
    console.error(`[delete-job-worker] ${errorMsg}`);
    
    await db.update(tenants)
      .set({ 
        deletedAt: new Date(),
        status: "deleted",
        isActive: false
      })
      .where(eq(tenants.id, tenantId));
  }

  return summary;
}

async function processUserDelete(job: typeof deleteJobs.$inferSelect): Promise<DeleteSummary> {
  const summary: DeleteSummary = { deletedTables: {}, totalDeleted: 0, errors: [] };
  const userId = job.targetId;
  const tenantId = job.tenantId;
  const mode = job.mode;

  if (!tenantId) {
    summary.errors.push("No tenant ID specified for user delete");
    return summary;
  }

  if (mode === "soft_delete") {
    await db.update(userTenants)
      .set({ isActive: false })
      .where(and(eq(userTenants.userId, userId), eq(userTenants.tenantId, tenantId)));
    
    await db.update(users)
      .set({ deletedAt: new Date() })
      .where(eq(users.id, userId));
    
    summary.deletedTables["user_deactivated"] = 1;
    summary.totalDeleted = 1;
    return summary;
  }

  if (mode === "hard_delete") {
    const deleteOrder = [
      { table: "bookings", deleteFunc: async () => {
        const result = await db.delete(bookings).where(and(eq(bookings.tenantId, tenantId), eq(bookings.createdBy, userId))).returning({ id: bookings.id });
        return result.length;
      }},
      { table: "invoices", deleteFunc: async () => {
        const result = await db.delete(invoices).where(and(eq(invoices.tenantId, tenantId), eq(invoices.createdBy, userId))).returning({ id: invoices.id });
        return result.length;
      }},
      { table: "services", deleteFunc: async () => {
        const result = await db.delete(services).where(and(eq(services.tenantId, tenantId), eq(services.createdBy, userId))).returning({ id: services.id });
        return result.length;
      }},
      { table: "customers", deleteFunc: async () => {
        const result = await db.delete(customers).where(and(eq(customers.tenantId, tenantId), eq(customers.createdBy, userId))).returning({ id: customers.id });
        return result.length;
      }},
      { table: "projects", deleteFunc: async () => {
        const result = await db.delete(projects).where(and(eq(projects.tenantId, tenantId), eq(projects.createdBy, userId))).returning({ id: projects.id });
        return result.length;
      }},
      { table: "staff", deleteFunc: async () => {
        const result = await db.delete(staff).where(and(eq(staff.tenantId, tenantId), eq(staff.createdBy, userId))).returning({ id: staff.id });
        return result.length;
      }},
    ];

    const totalSteps = deleteOrder.length + 2;
    let currentStep = 0;

    for (const { table, deleteFunc } of deleteOrder) {
      try {
        currentStep++;
        await db.update(deleteJobs)
          .set({ 
            currentStep: `Deleting ${table}...`,
            progress: Math.round((currentStep / totalSteps) * 100)
          })
          .where(eq(deleteJobs.id, job.id));

        const count = await deleteFunc();
        summary.deletedTables[table] = count;
        summary.totalDeleted += count;
      } catch (error) {
        const errorMsg = `Failed to delete from ${table}: ${error instanceof Error ? error.message : String(error)}`;
        summary.errors.push(errorMsg);
      }
    }

    const refreshResult = await db.delete(refreshTokens)
      .where(and(eq(refreshTokens.userId, userId), eq(refreshTokens.tenantId, tenantId))).returning({ id: refreshTokens.id });
    summary.deletedTables["refresh_tokens"] = refreshResult.length;
    summary.totalDeleted += refreshResult.length;

    const userTenantResult = await db.delete(userTenants)
      .where(and(eq(userTenants.userId, userId), eq(userTenants.tenantId, tenantId))).returning({ id: userTenants.id });
    summary.deletedTables["user_tenants"] = userTenantResult.length;
    summary.totalDeleted += userTenantResult.length;
  }

  if (mode === "anonymize") {
    await db.update(users)
      .set({ 
        email: `anonymized_${userId.substring(0, 8)}@deleted.local`,
        firstName: "Deleted",
        lastName: "User",
        deletedAt: new Date()
      })
      .where(eq(users.id, userId));

    await db.update(userTenants)
      .set({ isActive: false })
      .where(and(eq(userTenants.userId, userId), eq(userTenants.tenantId, tenantId)));

    summary.deletedTables["user_anonymized"] = 1;
    summary.totalDeleted = 1;
  }

  return summary;
}

async function processNextJob() {
  try {
    const [job] = await db.select()
      .from(deleteJobs)
      .where(eq(deleteJobs.status, "queued"))
      .orderBy(deleteJobs.queuedAt)
      .limit(1);

    if (!job) {
      return;
    }

    console.log(`[delete-job-worker] Processing job ${job.id} (${job.targetType}: ${job.targetId})`);

    await db.update(deleteJobs)
      .set({ 
        status: "running",
        startedAt: new Date(),
        currentStep: "Starting...",
        progress: 0
      })
      .where(eq(deleteJobs.id, job.id));

    let summary: DeleteSummary;

    if (job.targetType === "tenant") {
      summary = await processTenantWipe(job);
    } else if (job.targetType === "user") {
      summary = await processUserDelete(job);
    } else {
      throw new Error(`Unknown target type: ${job.targetType}`);
    }

    const finalStatus = summary.errors.length > 0 ? "failed" : "completed";
    
    await db.update(deleteJobs)
      .set({ 
        status: finalStatus,
        completedAt: new Date(),
        progress: 100,
        currentStep: finalStatus === "completed" ? "Done" : "Completed with errors",
        summary: summary,
        errorMessage: summary.errors.length > 0 ? summary.errors.join("; ") : null
      })
      .where(eq(deleteJobs.id, job.id));

    auditService.logAsync({
      tenantId: job.tenantId || undefined,
      userId: job.requestedBy,
      action: finalStatus === "completed" ? "delete" : "update",
      resource: "delete_job",
      resourceId: job.id,
      metadata: { 
        targetType: job.targetType,
        targetId: job.targetId,
        mode: job.mode,
        status: finalStatus,
        summary
      },
    });

    console.log(`[delete-job-worker] Job ${job.id} ${finalStatus}:`, summary);
  } catch (error) {
    console.error("[delete-job-worker] Error processing job:", error);
  }
}

let workerInterval: ReturnType<typeof setInterval> | null = null;

export function startDeleteJobWorker() {
  if (workerInterval) {
    console.log("[delete-job-worker] Worker already running");
    return;
  }

  console.log(`[delete-job-worker] Starting worker (polling every ${POLL_INTERVAL_MS}ms)`);
  
  processNextJob();
  
  workerInterval = setInterval(processNextJob, POLL_INTERVAL_MS);
}

export function stopDeleteJobWorker() {
  if (workerInterval) {
    clearInterval(workerInterval);
    workerInterval = null;
    console.log("[delete-job-worker] Worker stopped");
  }
}
