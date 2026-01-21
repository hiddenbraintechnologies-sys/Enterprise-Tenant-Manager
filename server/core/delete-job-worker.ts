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
      const result = await db.delete(bookings).where(eq(bookings.tenantId, tenantId));
      return 0;
    }},
    { table: "invoices", deleteFunc: async () => {
      const result = await db.delete(invoices).where(eq(invoices.tenantId, tenantId));
      return 0;
    }},
    { table: "payments", deleteFunc: async () => {
      const result = await db.delete(payments).where(eq(payments.tenantId, tenantId));
      return 0;
    }},
    { table: "services", deleteFunc: async () => {
      const result = await db.delete(services).where(eq(services.tenantId, tenantId));
      return 0;
    }},
    { table: "customers", deleteFunc: async () => {
      const result = await db.delete(customers).where(eq(customers.tenantId, tenantId));
      return 0;
    }},
    { table: "staff", deleteFunc: async () => {
      const result = await db.delete(staff).where(eq(staff.tenantId, tenantId));
      return 0;
    }},
    { table: "projects", deleteFunc: async () => {
      const result = await db.delete(projects).where(eq(projects.tenantId, tenantId));
      return 0;
    }},
    { table: "refresh_tokens", deleteFunc: async () => {
      const result = await db.delete(refreshTokens).where(eq(refreshTokens.tenantId, tenantId));
      return 0;
    }},
    { table: "user_tenants", deleteFunc: async () => {
      const result = await db.delete(userTenants).where(eq(userTenants.tenantId, tenantId));
      return 0;
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

  await db.update(deleteJobs)
    .set({ 
      currentStep: "Soft-deleting tenant...",
      progress: 95
    })
    .where(eq(deleteJobs.id, job.id));

  await db.update(tenants)
    .set({ 
      deletedAt: new Date(),
      status: "deleted",
      isActive: false
    })
    .where(eq(tenants.id, tenantId));

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
        await db.delete(bookings).where(and(eq(bookings.tenantId, tenantId), eq(bookings.createdBy, userId)));
      }},
      { table: "invoices", deleteFunc: async () => {
        await db.delete(invoices).where(and(eq(invoices.tenantId, tenantId), eq(invoices.createdBy, userId)));
      }},
      { table: "services", deleteFunc: async () => {
        await db.delete(services).where(and(eq(services.tenantId, tenantId), eq(services.createdBy, userId)));
      }},
      { table: "customers", deleteFunc: async () => {
        await db.delete(customers).where(and(eq(customers.tenantId, tenantId), eq(customers.createdBy, userId)));
      }},
      { table: "projects", deleteFunc: async () => {
        await db.delete(projects).where(and(eq(projects.tenantId, tenantId), eq(projects.createdBy, userId)));
      }},
      { table: "staff", deleteFunc: async () => {
        await db.delete(staff).where(and(eq(staff.tenantId, tenantId), eq(staff.createdBy, userId)));
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

        await deleteFunc();
        summary.deletedTables[table] = 1;
        summary.totalDeleted += 1;
      } catch (error) {
        const errorMsg = `Failed to delete from ${table}: ${error instanceof Error ? error.message : String(error)}`;
        summary.errors.push(errorMsg);
      }
    }

    await db.delete(refreshTokens)
      .where(and(eq(refreshTokens.userId, userId), eq(refreshTokens.tenantId, tenantId)));

    await db.delete(userTenants)
      .where(and(eq(userTenants.userId, userId), eq(userTenants.tenantId, tenantId)));

    summary.deletedTables["user_tenant_removed"] = 1;
    summary.totalDeleted += 1;
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
