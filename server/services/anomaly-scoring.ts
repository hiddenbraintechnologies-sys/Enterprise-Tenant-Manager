import { db } from "../db";
import { userSessions } from "@shared/schema";
import { and, eq, desc, isNull } from "drizzle-orm";

export interface AnomalyScoreParams {
  tenantId: string;
  userId: string;
  deviceFingerprint?: string;
  country?: string;
  city?: string;
  ipAddress?: string;
}

export interface AnomalyScoreResult {
  score: number;
  reasons: string[];
  requiresStepUp: boolean;
  requiresForceLogout: boolean;
}

const SCORE_NEW_DEVICE = 30;
const SCORE_NEW_COUNTRY = 25;
const SCORE_NEW_CITY = 10;
const SCORE_MANY_ACTIVE_SESSIONS = 20;
const SCORE_REUSE_DETECTED = 100;

const THRESHOLD_STEP_UP = 60;
const THRESHOLD_FORCE_LOGOUT = 90;

/**
 * Compute an anomaly score for a login/refresh attempt.
 * Higher scores indicate more suspicious activity.
 * 
 * IMPORTANT: This function is non-fatal - if DB errors occur,
 * it returns a safe default score with ANOMALY_CHECK_SKIPPED reason.
 */
export async function computeAnomalyScore(
  params: AnomalyScoreParams
): Promise<AnomalyScoreResult> {
  const { tenantId, userId, deviceFingerprint, country, city, ipAddress } = params;

  let recentSessions: typeof userSessions.$inferSelect[] = [];

  try {
    recentSessions = await db
      .select()
      .from(userSessions)
      .where(
        and(
          eq(userSessions.tenantId, tenantId),
          eq(userSessions.userId, userId)
        )
      )
      .orderBy(desc(userSessions.lastSeenAt))
      .limit(10);
  } catch (error) {
    console.error("[anomaly-scoring] ANOMALY_SCORE_FAILED - database error, skipping check:", error);
    return {
      score: 0,
      reasons: ["ANOMALY_CHECK_SKIPPED"],
      requiresStepUp: false,
      requiresForceLogout: false,
    };
  }

  let score = 0;
  const reasons: string[] = [];

  const knownDevices = new Set(
    recentSessions.map(r => r.deviceFingerprint).filter(Boolean)
  );
  const knownCountries = new Set(
    recentSessions.map(r => r.country).filter(Boolean)
  );
  const knownCities = new Set(
    recentSessions.map(r => r.city).filter(Boolean)
  );
  const knownIps = new Set(
    recentSessions.map(r => r.ipAddress).filter(Boolean)
  );

  if (deviceFingerprint && knownDevices.size > 0 && !knownDevices.has(deviceFingerprint)) {
    score += SCORE_NEW_DEVICE;
    reasons.push("NEW_DEVICE");
  }

  if (country && knownCountries.size > 0 && !knownCountries.has(country)) {
    score += SCORE_NEW_COUNTRY;
    reasons.push("NEW_COUNTRY");
  }

  if (city && knownCities.size > 0 && !knownCities.has(city)) {
    score += SCORE_NEW_CITY;
    reasons.push("NEW_CITY");
  }

  const activeSessions = recentSessions.filter(r => !r.revokedAt);
  if (activeSessions.length >= 5) {
    score += SCORE_MANY_ACTIVE_SESSIONS;
    reasons.push("MANY_ACTIVE_SESSIONS");
  }

  return {
    score,
    reasons,
    requiresStepUp: score >= THRESHOLD_STEP_UP,
    requiresForceLogout: score >= THRESHOLD_FORCE_LOGOUT,
  };
}

/**
 * Add reuse detection score (called when refresh token reuse is detected).
 */
export function addReuseDetectionScore(result: AnomalyScoreResult): AnomalyScoreResult {
  return {
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
