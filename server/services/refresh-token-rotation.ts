import crypto from "crypto";
import { db } from "../db";
import { refreshTokens, tenantStaff } from "@shared/schema";
import { eq, and, isNull } from "drizzle-orm";
import { logAudit } from "../audit/logAudit";

const REFRESH_TOKEN_EXPIRY_DAYS = 30;

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function generateToken(): string {
  return crypto.randomBytes(48).toString("base64url");
}

export interface RotateRefreshTokenParams {
  refreshToken: string;
  ipAddress?: string;
  userAgent?: string;
  deviceFingerprint?: string;
}

export interface RotateRefreshTokenResult {
  tenantId: string | null;
  userId: string;
  staffId: string | null;
  newRefreshToken: string;
  newTokenId: string;
}

export class RefreshTokenReuseError extends Error {
  code = "REUSE_DETECTED";
  constructor(message: string) {
    super(message);
    this.name = "RefreshTokenReuseError";
  }
}

export class RefreshTokenNotFoundError extends Error {
  code = "TOKEN_NOT_FOUND";
  constructor(message: string) {
    super(message);
    this.name = "RefreshTokenNotFoundError";
  }
}

/**
 * Rotate a refresh token, revoking the old one and issuing a new one.
 * Implements reuse detection - if a revoked token is used, the entire
 * token family is revoked and sessions are invalidated.
 */
export async function rotateRefreshToken(
  params: RotateRefreshTokenParams
): Promise<RotateRefreshTokenResult> {
  const { refreshToken, ipAddress, userAgent, deviceFingerprint } = params;
  const tokenHash = hashToken(refreshToken);

  const [existing] = await db
    .select()
    .from(refreshTokens)
    .where(eq(refreshTokens.tokenHash, tokenHash))
    .limit(1);

  if (!existing) {
    throw new RefreshTokenNotFoundError("Refresh token not found");
  }

  if (existing.revokedAt || existing.isRevoked) {
    await revokeRefreshFamilyAndInvalidate(existing, {
      reason: "reuse_detected",
      ipAddress,
      userAgent,
      deviceFingerprint,
    });
    throw new RefreshTokenReuseError("Refresh token reuse detected - all sessions invalidated");
  }

  if (existing.expiresAt < new Date()) {
    throw new RefreshTokenNotFoundError("Refresh token expired");
  }

  const now = new Date();

  await db.update(refreshTokens).set({
    revokedAt: now,
    isRevoked: true,
    revokeReason: "rotated",
  }).where(eq(refreshTokens.id, existing.id));

  const newRaw = generateToken();
  const newHash = hashToken(newRaw);
  const expiresAt = new Date(now.getTime() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  const [newRow] = await db.insert(refreshTokens).values({
    tenantId: existing.tenantId,
    userId: existing.userId,
    staffId: existing.staffId,
    tokenHash: newHash,
    familyId: existing.familyId ?? existing.id,
    parentId: existing.id,
    issuedAt: now,
    expiresAt,
    ipAddress,
    userAgent,
    deviceFingerprint,
    deviceInfo: { userAgent, ipAddress },
    isRevoked: false,
  }).returning({ id: refreshTokens.id });

  await db.update(refreshTokens).set({
    replacedByTokenId: newRow.id,
  }).where(eq(refreshTokens.id, existing.id));

  if (existing.tenantId) {
    await logAudit({
      tenantId: existing.tenantId,
      userId: existing.userId,
      action: "update",
      resource: "refresh_token",
      resourceId: existing.id,
      metadata: { 
        event: "TOKEN_ROTATED",
        rotatedTo: newRow.id,
        familyId: existing.familyId ?? existing.id,
      },
      ipAddress,
      userAgent,
    });
  }

  return {
    tenantId: existing.tenantId,
    userId: existing.userId,
    staffId: existing.staffId,
    newRefreshToken: newRaw,
    newTokenId: newRow.id,
  };
}

/**
 * Revoke an entire refresh token family and invalidate user sessions.
 * Called when reuse is detected.
 */
async function revokeRefreshFamilyAndInvalidate(
  existing: typeof refreshTokens.$inferSelect,
  ctx: {
    reason: "reuse_detected" | "force_logout" | "admin_action";
    ipAddress?: string;
    userAgent?: string;
    deviceFingerprint?: string;
  }
): Promise<void> {
  const familyId = existing.familyId ?? existing.id;
  const now = new Date();

  await db.update(refreshTokens).set({
    revokedAt: now,
    isRevoked: true,
    revokeReason: ctx.reason,
    suspiciousReuseAt: ctx.reason === "reuse_detected" ? now : undefined,
  }).where(eq(refreshTokens.familyId, familyId));

  if (existing.staffId) {
    const [staff] = await db.select().from(tenantStaff).where(eq(tenantStaff.id, existing.staffId));
    if (staff) {
      await db.update(tenantStaff)
        .set({ sessionVersion: (staff.sessionVersion || 1) + 1 })
        .where(eq(tenantStaff.id, existing.staffId));
    }
  }

  if (existing.tenantId) {
    await logAudit({
      tenantId: existing.tenantId,
      userId: existing.userId,
      action: "update",
      resource: "refresh_token_family",
      resourceId: String(familyId),
      metadata: {
        event: "REFRESH_TOKEN_REUSE_DETECTED",
        reason: ctx.reason,
        affectedStaffId: existing.staffId,
      },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });
  }
}

/**
 * Create a new refresh token (for initial login).
 */
export async function createRefreshToken(params: {
  tenantId: string | null;
  userId: string;
  staffId?: string;
  ipAddress?: string;
  userAgent?: string;
  deviceFingerprint?: string;
}): Promise<{ token: string; tokenId: string; expiresAt: Date }> {
  const { tenantId, userId, staffId, ipAddress, userAgent, deviceFingerprint } = params;
  
  const rawToken = generateToken();
  const tokenHash = hashToken(rawToken);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  const [row] = await db.insert(refreshTokens).values({
    tenantId,
    userId,
    staffId: staffId || null,
    tokenHash,
    issuedAt: now,
    expiresAt,
    ipAddress,
    userAgent,
    deviceFingerprint,
    deviceInfo: { userAgent, ipAddress },
    isRevoked: false,
  }).returning({ id: refreshTokens.id });

  await db.update(refreshTokens).set({
    familyId: row.id,
  }).where(eq(refreshTokens.id, row.id));

  return {
    token: rawToken,
    tokenId: row.id,
    expiresAt,
  };
}

/**
 * Revoke all refresh tokens for a user/staff (for logout or force logout).
 */
export async function revokeAllRefreshTokens(params: {
  userId: string;
  tenantId?: string;
  staffId?: string;
  reason: "logout" | "force_logout" | "admin_action";
}): Promise<number> {
  const { userId, tenantId, staffId, reason } = params;
  const now = new Date();

  let whereClause = eq(refreshTokens.userId, userId);
  if (tenantId) {
    whereClause = and(whereClause, eq(refreshTokens.tenantId, tenantId))!;
  }
  if (staffId) {
    whereClause = and(whereClause, eq(refreshTokens.staffId, staffId))!;
  }
  whereClause = and(whereClause, isNull(refreshTokens.revokedAt))!;

  const result = await db.update(refreshTokens).set({
    revokedAt: now,
    isRevoked: true,
    revokeReason: reason,
  }).where(whereClause);

  return 0;
}
