import { db } from "../db";
import { tenantStaffLoginHistory, tenantStaff } from "@shared/schema";
import { eq, and, desc, lt, sql } from "drizzle-orm";
import { createSession } from "./user-sessions";

export async function findStaffByUserId(tenantId: string, userId: string): Promise<string | null> {
  const [staff] = await db
    .select({ id: tenantStaff.id })
    .from(tenantStaff)
    .where(
      and(
        eq(tenantStaff.tenantId, tenantId),
        eq(tenantStaff.userId, userId)
      )
    )
    .limit(1);
  return staff?.id || null;
}

export interface RecordLoginParams {
  tenantId: string;
  staffId: string;
  userId: string;
  ipAddress?: string;
  userAgent?: string;
  authProvider?: string;
  isImpersonated?: boolean;
  impersonatedByStaffId?: string;
  sessionVersion?: number;
  country?: string;
  city?: string;
}

export interface RecordLoginResult {
  loginHistoryId: string;
  sessionId: string;
}

/**
 * Record a login event and create an active session.
 * Returns just the loginHistoryId for backwards compatibility.
 * The sessionId can be retrieved from recordLoginWithSession.
 */
export async function recordLogin(params: RecordLoginParams): Promise<string> {
  const result = await recordLoginWithSession(params);
  return result.loginHistoryId;
}

/**
 * Record a login event and create an active session.
 * Returns both loginHistoryId and sessionId.
 */
export async function recordLoginWithSession(params: RecordLoginParams): Promise<RecordLoginResult> {
  const {
    tenantId,
    staffId,
    userId,
    ipAddress,
    userAgent,
    authProvider = "sso",
    isImpersonated = false,
    impersonatedByStaffId,
    sessionVersion = 1,
    country,
    city,
  } = params;

  const [entry] = await db
    .insert(tenantStaffLoginHistory)
    .values({
      tenantId,
      staffId,
      userId,
      ipAddress: ipAddress || null,
      userAgent: userAgent || null,
      authProvider,
      isImpersonated,
      impersonatedByStaffId: impersonatedByStaffId || null,
    })
    .returning({ id: tenantStaffLoginHistory.id });

  await db
    .update(tenantStaff)
    .set({ lastLoginAt: new Date() })
    .where(eq(tenantStaff.id, staffId));

  const sessionId = await createSession({
    tenantId,
    userId,
    staffId,
    sessionVersion,
    ipAddress,
    userAgent,
    country,
    city,
  });

  return { loginHistoryId: entry.id, sessionId };
}

export async function recordLogout(loginHistoryId: string): Promise<void> {
  await db
    .update(tenantStaffLoginHistory)
    .set({ logoutAt: new Date() })
    .where(eq(tenantStaffLoginHistory.id, loginHistoryId));
}

export interface GetLoginHistoryParams {
  tenantId: string;
  staffId: string;
  limit?: number;
  offset?: number;
}

export interface LoginHistoryEntry {
  id: string;
  loginAt: Date;
  logoutAt: Date | null;
  ipAddress: string | null;
  userAgent: string | null;
  authProvider: string;
  isImpersonated: boolean;
  impersonatedByStaffId: string | null;
  impersonatedByStaffName?: string | null;
}

export async function getLoginHistory(params: GetLoginHistoryParams): Promise<{
  entries: LoginHistoryEntry[];
  total: number;
}> {
  const { tenantId, staffId, limit = 20, offset = 0 } = params;

  const entries = await db
    .select({
      id: tenantStaffLoginHistory.id,
      loginAt: tenantStaffLoginHistory.loginAt,
      logoutAt: tenantStaffLoginHistory.logoutAt,
      ipAddress: tenantStaffLoginHistory.ipAddress,
      userAgent: tenantStaffLoginHistory.userAgent,
      authProvider: tenantStaffLoginHistory.authProvider,
      isImpersonated: tenantStaffLoginHistory.isImpersonated,
      impersonatedByStaffId: tenantStaffLoginHistory.impersonatedByStaffId,
    })
    .from(tenantStaffLoginHistory)
    .where(
      and(
        eq(tenantStaffLoginHistory.tenantId, tenantId),
        eq(tenantStaffLoginHistory.staffId, staffId)
      )
    )
    .orderBy(desc(tenantStaffLoginHistory.loginAt))
    .limit(limit)
    .offset(offset);

  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(tenantStaffLoginHistory)
    .where(
      and(
        eq(tenantStaffLoginHistory.tenantId, tenantId),
        eq(tenantStaffLoginHistory.staffId, staffId)
      )
    );

  const entriesWithNames: LoginHistoryEntry[] = [];
  for (const entry of entries) {
    let impersonatedByStaffName: string | null = null;
    if (entry.impersonatedByStaffId) {
      const [staff] = await db
        .select({ fullName: tenantStaff.fullName, aliasName: tenantStaff.aliasName })
        .from(tenantStaff)
        .where(eq(tenantStaff.id, entry.impersonatedByStaffId))
        .limit(1);
      impersonatedByStaffName = staff?.aliasName || staff?.fullName || null;
    }
    entriesWithNames.push({
      ...entry,
      impersonatedByStaffName,
    });
  }

  return {
    entries: entriesWithNames,
    total: Number(countResult?.count || 0),
  };
}

export async function cleanupOldLoginHistory(retentionDays: number = 90): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

  const result = await db
    .delete(tenantStaffLoginHistory)
    .where(lt(tenantStaffLoginHistory.loginAt, cutoffDate))
    .returning({ id: tenantStaffLoginHistory.id });

  return result.length;
}
