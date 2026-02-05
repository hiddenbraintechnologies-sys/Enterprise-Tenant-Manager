import { db } from "../db";
import { userSessions } from "@shared/schema";
import { and, eq, desc, isNull, sql } from "drizzle-orm";

export interface AnomalyScoreParams {
  tenantId: string;
  userId: string;
  staffId?: string | null;
  deviceFingerprint?: string | null;
  country?: string | null;
  city?: string | null;
  ipAddress?: string | null;
  activeSessionThreshold?: number;
  lookbackLimit?: number;
  cacheTtlMs?: number;
}

export interface AnomalyScoreResult {
  score: number;
  reasons: string[];
  requiresStepUp: boolean;
  requiresForceLogout: boolean;
  activeSessionCount: number;
  lookedBack: number;
  cached?: boolean;
}

const SCORE_NEW_DEVICE = 30;
const SCORE_NEW_COUNTRY = 25;
const SCORE_NEW_CITY = 10;
const SCORE_MANY_ACTIVE_SESSIONS = 20;
const SCORE_REUSE_DETECTED = 100;

const THRESHOLD_STEP_UP = 60;
const THRESHOLD_FORCE_LOGOUT = 90;

const memCache = new Map<string, { at: number; value: AnomalyScoreResult }>();
const MAX_CACHE_ENTRIES = 10_000;

function cacheKey(params: AnomalyScoreParams): string {
  return [
    params.tenantId,
    params.userId,
    params.staffId ?? "-",
    params.deviceFingerprint ?? "-",
    params.country ?? "-",
    params.city ?? "-",
  ].join("|");
}

/**
 * Compute an anomaly score for a login/refresh attempt.
 * Higher scores indicate more suspicious activity.
 * 
 * OPTIMIZED VERSION:
 * - Active session count via indexed SQL COUNT (not JS filtering)
 * - Per-user throttled cache (60s default) to reduce DB load
 * - Uses partial indexes on revoked_at IS NULL
 * - Non-fatal: returns safe defaults on DB errors
 */
export async function computeAnomalyScore(
  params: AnomalyScoreParams
): Promise<AnomalyScoreResult> {
  const activeSessionThreshold = params.activeSessionThreshold ?? 5;
  const lookbackLimit = params.lookbackLimit ?? 12;
  const cacheTtlMs = params.cacheTtlMs ?? 60_000;

  const key = cacheKey(params);
  const cached = memCache.get(key);
  if (cached && Date.now() - cached.at < cacheTtlMs) {
    return { ...cached.value, cached: true };
  }

  try {
    const [activeCountResult, recentSessions] = await Promise.all([
      db
        .select({ count: sql<number>`count(*)` })
        .from(userSessions)
        .where(
          and(
            eq(userSessions.tenantId, params.tenantId),
            eq(userSessions.userId, params.userId),
            isNull(userSessions.revokedAt)
          )
        ),
      db
        .select({
          deviceFingerprint: userSessions.deviceFingerprint,
          country: userSessions.country,
          city: userSessions.city,
          revokedAt: userSessions.revokedAt,
          lastSeenAt: userSessions.lastSeenAt,
        })
        .from(userSessions)
        .where(
          and(
            eq(userSessions.tenantId, params.tenantId),
            eq(userSessions.userId, params.userId)
          )
        )
        .orderBy(desc(userSessions.lastSeenAt))
        .limit(lookbackLimit),
    ]);

    const activeSessionCount = Number(activeCountResult?.[0]?.count ?? 0);

    let score = 0;
    const reasons: string[] = [];

    const knownDevices = new Set(
      recentSessions.map(r => r.deviceFingerprint).filter(Boolean) as string[]
    );
    const knownCountries = new Set(
      recentSessions.map(r => r.country).filter(Boolean) as string[]
    );
    const knownCities = new Set(
      recentSessions.map(r => r.city).filter(Boolean) as string[]
    );

    if (params.deviceFingerprint && knownDevices.size > 0 && !knownDevices.has(params.deviceFingerprint)) {
      score += SCORE_NEW_DEVICE;
      reasons.push("NEW_DEVICE");
    }

    if (params.country && knownCountries.size > 0 && !knownCountries.has(params.country)) {
      score += SCORE_NEW_COUNTRY;
      reasons.push("NEW_COUNTRY");
    }

    if (params.city && knownCities.size > 0 && !knownCities.has(params.city)) {
      score += SCORE_NEW_CITY;
      reasons.push("NEW_CITY");
    }

    if (activeSessionCount >= activeSessionThreshold) {
      score += SCORE_MANY_ACTIVE_SESSIONS;
      reasons.push("MANY_ACTIVE_SESSIONS");
    }

    const result: AnomalyScoreResult = {
      score,
      reasons,
      requiresStepUp: score >= THRESHOLD_STEP_UP,
      requiresForceLogout: score >= THRESHOLD_FORCE_LOGOUT,
      activeSessionCount,
      lookedBack: recentSessions.length,
    };

    if (memCache.size > MAX_CACHE_ENTRIES) {
      memCache.clear();
    }
    memCache.set(key, { at: Date.now(), value: result });
    return result;
  } catch (error) {
    console.error("[anomaly-scoring] ANOMALY_SCORE_FAILED - database error, skipping check:", error);
    return {
      score: 0,
      reasons: ["ANOMALY_CHECK_SKIPPED"],
      requiresStepUp: false,
      requiresForceLogout: false,
      activeSessionCount: 0,
      lookedBack: 0,
    };
  }
}

/**
 * Add reuse detection score (called when refresh token reuse is detected).
 */
export function addReuseDetectionScore(result: AnomalyScoreResult): AnomalyScoreResult {
  return {
    ...result,
    score: result.score + SCORE_REUSE_DETECTED,
    reasons: [...result.reasons, "TOKEN_REUSE_DETECTED"],
    requiresStepUp: true,
    requiresForceLogout: true,
  };
}

/**
 * Check if a session should trigger a security alert.
 */
export function shouldTriggerSecurityAlert(result: AnomalyScoreResult): boolean {
  return result.reasons.includes("NEW_COUNTRY") || 
         result.reasons.includes("TOKEN_REUSE_DETECTED") ||
         result.requiresForceLogout;
}

/**
 * Get a human-readable summary of the anomaly score.
 */
export function getAnomalySummary(result: AnomalyScoreResult): string {
  if (result.requiresForceLogout) {
    return "Critical security anomaly detected - sessions invalidated";
  }
  if (result.requiresStepUp) {
    return "Suspicious activity detected - additional verification required";
  }
  if (result.score > 0) {
    return `Minor anomalies detected: ${result.reasons.join(", ")}`;
  }
  return "No anomalies detected";
}

/**
 * Clear the anomaly cache (useful for testing or after force logout).
 */
export function clearAnomalyCache(tenantId?: string, userId?: string): void {
  if (tenantId && userId) {
    for (const key of memCache.keys()) {
      if (key.startsWith(`${tenantId}|${userId}|`)) {
        memCache.delete(key);
      }
    }
  } else {
    memCache.clear();
  }
}
