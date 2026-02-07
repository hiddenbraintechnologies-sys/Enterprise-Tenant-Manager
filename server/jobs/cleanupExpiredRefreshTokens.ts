import { db } from "../db";
import { refreshTokens } from "@shared/schema";
import { and, eq, lt, isNull, ne } from "drizzle-orm";
import { logAudit } from "../audit/logAudit";

const HARD_DELETE_AFTER_DAYS = 30;
const SECURITY_EVIDENCE_RETENTION_DAYS = 90;

export interface CleanupResult {
  expiredRevoked: number;
  hardDeleted: number;
  errors: string[];
}

/**
 * Cleanup job for expired refresh tokens.
 * 
 * Policy:
 * - expiresAt < now AND not revoked → Mark revoked (expired)
 * - Revoked for ≥ 30 days → Hard delete (except reuse_detected)
 * - reuse_detected → Keep ≥ 90 days (security evidence for SOC2)
 * 
 * This job is SOC2-friendly: no silent deletes, everything is logged.
 */
export async function cleanupExpiredRefreshTokens(): Promise<CleanupResult> {
  const now = new Date();
  const errors: string[] = [];
  let expiredRevoked = 0;
  let hardDeleted = 0;

  try {
    // 1️⃣ Soft-revoke expired but still active tokens
    const expired = await db.update(refreshTokens)
      .set({
        isRevoked: true,
        revokedAt: now,
        revokeReason: "expired",
      })
      .where(
        and(
          lt(refreshTokens.expiresAt, now),
          eq(refreshTokens.isRevoked, false),
          isNull(refreshTokens.revokedAt)
        )
      )
      .returning({ 
        id: refreshTokens.id, 
        userId: refreshTokens.userId, 
        tenantId: refreshTokens.tenantId 
      });

    expiredRevoked = expired.length;

    // Log each expiration for SOC2 audit trail
    for (const row of expired) {
      if (row.tenantId) {
        await logAudit({
          tenantId: row.tenantId,
          userId: row.userId,
          action: "update",
          resource: "refresh_token",
          resourceId: row.id,
          metadata: { 
            event: "SESSION_EXPIRED",
            reason: "expired_cleanup",
          },
        });
      }
    }

    // 2️⃣ Hard delete old revoked tokens (except security evidence)
    const standardCutoff = new Date(now.getTime() - HARD_DELETE_AFTER_DAYS * 24 * 60 * 60 * 1000);
    const securityEvidenceCutoff = new Date(now.getTime() - SECURITY_EVIDENCE_RETENTION_DAYS * 24 * 60 * 60 * 1000);

    // Delete standard expired tokens older than 30 days
    const deletedStandard = await db.delete(refreshTokens).where(
      and(
        lt(refreshTokens.revokedAt, standardCutoff),
        ne(refreshTokens.revokeReason, "reuse_detected")
      )
    ).returning({ id: refreshTokens.id });

    // Delete security evidence tokens older than 90 days
    const deletedSecurityEvidence = await db.delete(refreshTokens).where(
      and(
        lt(refreshTokens.revokedAt, securityEvidenceCutoff),
        eq(refreshTokens.revokeReason, "reuse_detected")
      )
    ).returning({ id: refreshTokens.id });

    hardDeleted = deletedStandard.length + deletedSecurityEvidence.length;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    errors.push(errorMessage);
    console.error("[CleanupJob] Error:", errorMessage);
  }

  console.log(`[CleanupJob] Revoked ${expiredRevoked} expired tokens, hard deleted ${hardDeleted} old tokens`);

  return {
    expiredRevoked,
    hardDeleted,
    errors,
  };
}

/**
 * Schedule helper - calculates next run time for cron-like scheduling.
 * Returns milliseconds until next 6-hour mark (00:00, 06:00, 12:00, 18:00)
 */
export function getNextCleanupTime(): number {
  const now = new Date();
  const currentHour = now.getHours();
  const nextRunHour = Math.ceil(currentHour / 6) * 6;
  const nextRun = new Date(now);
  
  if (nextRunHour >= 24) {
    nextRun.setDate(nextRun.getDate() + 1);
    nextRun.setHours(0, 0, 0, 0);
  } else if (nextRunHour === currentHour && now.getMinutes() > 0) {
    nextRun.setHours(nextRunHour + 6, 0, 0, 0);
    if (nextRun.getHours() >= 24) {
      nextRun.setDate(nextRun.getDate() + 1);
      nextRun.setHours(0, 0, 0, 0);
    }
  } else {
    nextRun.setHours(nextRunHour, 0, 0, 0);
  }

  return nextRun.getTime() - now.getTime();
}

/**
 * Start the cleanup job scheduler.
 * Runs every 6 hours automatically with consecutive failure tracking.
 */
export function startCleanupScheduler(): void {
  let consecutiveFailures = 0;
  const ALERT_THRESHOLD = 3;

  const runAndScheduleNext = async () => {
    try {
      await cleanupExpiredRefreshTokens();
      consecutiveFailures = 0;
    } catch (error) {
      consecutiveFailures++;
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error(`[CleanupJob] Scheduler error (${consecutiveFailures} consecutive):`, errMsg);
      
      if (consecutiveFailures >= ALERT_THRESHOLD) {
        console.error(`[CleanupJob] ALERT: ${consecutiveFailures} consecutive failures - job may be broken`);
      }
    }
    
    const nextRun = getNextCleanupTime();
    setTimeout(runAndScheduleNext, nextRun);
    console.log(`[CleanupJob] Next run in ${Math.round(nextRun / 1000 / 60)} minutes`);
  };

  setTimeout(runAndScheduleNext, 5000);
}
