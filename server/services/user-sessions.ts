import { db } from "../db";
import { userSessions } from "@shared/schema";
import { eq, and, desc, isNull, sql, inArray } from "drizzle-orm";
import crypto from "crypto";

export interface CreateSessionParams {
  tenantId: string;
  userId: string;
  staffId?: string;
  sessionVersion: number;
  ipAddress?: string;
  country?: string;
  city?: string;
  userAgent?: string;
}

/**
 * Generate device fingerprint from user agent.
 */
export function generateDeviceFingerprint(userAgent: string): string {
  return crypto.createHash("sha256").update(userAgent).digest("hex").slice(0, 64);
}

/**
 * Create a new session record on login.
 */
export async function createSession(params: CreateSessionParams): Promise<string> {
  const deviceFingerprint = params.userAgent 
    ? generateDeviceFingerprint(params.userAgent)
    : null;

  const [session] = await db
    .insert(userSessions)
    .values({
      tenantId: params.tenantId,
      userId: params.userId,
      staffId: params.staffId || null,
      sessionVersion: params.sessionVersion,
      ipAddress: params.ipAddress || null,
      country: params.country || null,
      city: params.city || null,
      userAgent: params.userAgent || null,
      deviceFingerprint,
      isCurrent: true,
      lastSeenAt: new Date(),
    })
    .returning({ id: userSessions.id });

  return session.id;
}

/**
 * Update last_seen_at for a session (throttled to avoid excessive writes).
 */
export async function updateSessionLastSeen(sessionId: string): Promise<void> {
  await db
    .update(userSessions)
    .set({ lastSeenAt: new Date() })
    .where(eq(userSessions.id, sessionId));
}

// In-memory throttle cache for touchSession (to avoid DB writes on every request)
const touchThrottle = new Map<string, number>();
const TOUCH_THROTTLE_MS = 60_000; // 1 minute

/**
 * Touch session last_seen_at (throttled to reduce DB writes).
 * Only updates if more than 1 minute since last touch.
 */
export async function touchSession(sessionId: string): Promise<void> {
  const now = Date.now();
  const lastTouch = touchThrottle.get(sessionId) || 0;
  
  if (now - lastTouch < TOUCH_THROTTLE_MS) {
    return; // Throttled, skip update
  }
  
  touchThrottle.set(sessionId, now);
  await updateSessionLastSeen(sessionId);
}

export interface SessionValidationResult {
  valid: boolean;
  reason?: "not_found" | "revoked" | "version_mismatch";
  session?: typeof userSessions.$inferSelect;
}

/**
 * Validate that a session is active and matches the expected version.
 * Used by auth middleware to verify JWT session claims.
 */
export async function validateSessionActive(
  sessionId: string,
  tenantId: string,
  expectedVersion?: number
): Promise<SessionValidationResult> {
  const [session] = await db
    .select()
    .from(userSessions)
    .where(
      and(
        eq(userSessions.id, sessionId),
        eq(userSessions.tenantId, tenantId)
      )
    )
    .limit(1);

  if (!session) {
    return { valid: false, reason: "not_found" };
  }

  if (session.revokedAt) {
    return { valid: false, reason: "revoked" };
  }

  if (expectedVersion !== undefined && session.sessionVersion !== expectedVersion) {
    return { valid: false, reason: "version_mismatch" };
  }

  return { valid: true, session };
}

/**
 * Get active sessions for a user.
 */
export async function getUserSessions(
  tenantId: string,
  userId: string
): Promise<typeof userSessions.$inferSelect[]> {
  return db
    .select()
    .from(userSessions)
    .where(
      and(
        eq(userSessions.tenantId, tenantId),
        eq(userSessions.userId, userId),
        isNull(userSessions.revokedAt)
      )
    )
    .orderBy(desc(userSessions.lastSeenAt));
}

/**
 * Get all active sessions for a tenant (admin view).
 */
export async function getTenantSessions(tenantId: string) {
  return db
    .select()
    .from(userSessions)
    .where(
      and(
        eq(userSessions.tenantId, tenantId),
        isNull(userSessions.revokedAt)
      )
    )
    .orderBy(desc(userSessions.lastSeenAt));
}

/**
 * Get a session by ID.
 */
export async function getSessionById(sessionId: string) {
  const [session] = await db
    .select()
    .from(userSessions)
    .where(eq(userSessions.id, sessionId))
    .limit(1);
  
  return session || null;
}

/**
 * Revoke a specific session.
 */
export async function revokeSession(
  sessionId: string,
  revokedBy: string,
  reason: "user_requested" | "admin_forced" | "session_version_bump" | "security_alert" | "expired"
): Promise<boolean> {
  const [result] = await db
    .update(userSessions)
    .set({
      revokedAt: new Date(),
      revokeReason: reason,
      revokedBy,
      isCurrent: false,
    })
    .where(
      and(
        eq(userSessions.id, sessionId),
        isNull(userSessions.revokedAt)
      )
    )
    .returning({ id: userSessions.id });

  return !!result;
}

/**
 * Revoke all sessions for a user (except current one optionally).
 */
export async function revokeAllUserSessions(
  tenantId: string,
  userId: string,
  revokedBy: string,
  exceptSessionId?: string
): Promise<number> {
  const allSessions = await db
    .select({ id: userSessions.id })
    .from(userSessions)
    .where(
      and(
        eq(userSessions.tenantId, tenantId),
        eq(userSessions.userId, userId),
        isNull(userSessions.revokedAt)
      )
    );

  const sessionsToRevoke = exceptSessionId
    ? allSessions.filter(s => s.id !== exceptSessionId)
    : allSessions;

  if (sessionsToRevoke.length === 0) {
    return 0;
  }

  const idsToRevoke = sessionsToRevoke.map(s => s.id);

  const result = await db
    .update(userSessions)
    .set({
      revokedAt: new Date(),
      revokeReason: "admin_forced",
      revokedBy,
      isCurrent: false,
    })
    .where(
      and(
        eq(userSessions.tenantId, tenantId),
        inArray(userSessions.id, idsToRevoke)
      )
    )
    .returning({ id: userSessions.id });

  return result.length;
}

/**
 * Mark sessions as revoked when session version is bumped.
 */
export async function markSessionsRevokedByVersionBump(
  tenantId: string,
  staffId: string,
  currentVersion: number
): Promise<number> {
  const result = await db
    .update(userSessions)
    .set({
      revokedAt: new Date(),
      revokeReason: "session_version_bump",
      isCurrent: false,
    })
    .where(
      and(
        eq(userSessions.tenantId, tenantId),
        eq(userSessions.staffId, staffId),
        isNull(userSessions.revokedAt),
        sql`${userSessions.sessionVersion} < ${currentVersion}`
      )
    )
    .returning({ id: userSessions.id });

  return result.length;
}

/**
 * Parse user agent to device description.
 */
export function parseUserAgent(userAgent: string): string {
  if (!userAgent) return "Unknown Device";

  const ua = userAgent.toLowerCase();
  
  let browser = "Unknown Browser";
  if (ua.includes("chrome") && !ua.includes("edge")) browser = "Chrome";
  else if (ua.includes("firefox")) browser = "Firefox";
  else if (ua.includes("safari") && !ua.includes("chrome")) browser = "Safari";
  else if (ua.includes("edge")) browser = "Edge";
  else if (ua.includes("opera")) browser = "Opera";

  let os = "Unknown OS";
  if (ua.includes("windows")) os = "Windows";
  else if (ua.includes("mac os") || ua.includes("macintosh")) os = "macOS";
  else if (ua.includes("linux")) os = "Linux";
  else if (ua.includes("android")) os = "Android";
  else if (ua.includes("iphone") || ua.includes("ipad")) os = "iOS";

  return `${browser} on ${os}`;
}
