import crypto from "crypto";
import { db } from "../db";
import { refreshTokens, tenantStaff } from "@shared/schema";
import { eq, and, isNull, or } from "drizzle-orm";
import { logAudit } from "../audit/logAudit";

const REFRESH_TOKEN_EXPIRY_DAYS = 30;

/* ------------------ helpers ------------------ */

function hashToken(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

function generateRawToken(): string {
  return crypto.randomBytes(48).toString("base64url");
}

/* ------------------ types ------------------ */

export interface RotateRefreshTokenParams {
  rawToken: string;
  ipAddress?: string;
  userAgent?: string;
  deviceFingerprint?: string;
  deviceInfo?: Record<string, unknown>;
}

export interface RotateRefreshTokenResult {
  newRefreshToken: string;
  newTokenId: string;
  userId: string;
  tenantId: string | null;
  staffId: string | null;
}

export class RefreshTokenReuseError extends Error {
  code = "REUSE_DETECTED" as const;
  constructor(message: string) {
    super(message);
    this.name = "RefreshTokenReuseError";
  }
}

export class RefreshTokenNotFoundError extends Error {
  code = "TOKEN_NOT_FOUND" as const;
  constructor(message: string) {
    super(message);
    this.name = "RefreshTokenNotFoundError";
  }
}

export class RefreshTokenExpiredError extends Error {
  code = "EXPIRED" as const;
  constructor(message: string) {
    super(message);
    this.name = "RefreshTokenExpiredError";
  }
}

/* ------------------ rotate ------------------ */

/**
 * Rotate a refresh token, revoking the old one and issuing a new one.
 * Implements reuse detection - if a revoked token is used, the entire
 * token family is revoked and sessions are invalidated.
 */
export async function rotateRefreshToken(
  params: RotateRefreshTokenParams
): Promise<RotateRefreshTokenResult> {
  const { rawToken, ipAddress, userAgent, deviceFingerprint, deviceInfo } = params;
  const tokenHash = hashToken(rawToken);

  const [existing] = await db
    .select()
    .from(refreshTokens)
    .where(eq(refreshTokens.tokenHash, tokenHash))
    .limit(1);

  // Token not found → suspected replay
  if (!existing) {
    throw new RefreshTokenNotFoundError("Refresh token not found");
  }

  // Expired token - revoke it first, then throw
  if (existing.expiresAt < new Date()) {
    await revokeSingle(existing, "expired");
    throw new RefreshTokenExpiredError("Refresh token expired");
  }

  // Reuse detected - already revoked token being replayed
  if (existing.isRevoked || existing.revokedAt) {
    await revokeFamilyAndInvalidate(existing, {
      reason: "reuse_detected",
      ipAddress,
      userAgent,
      deviceFingerprint,
    });
    throw new RefreshTokenReuseError("Refresh token reuse detected - all sessions invalidated");
  }

  /* -------- normal rotation -------- */

  const now = new Date();
  const familyKey = existing.familyId ?? existing.id;

  // Revoke current token (set both isRevoked + revokedAt for consistency)
  await db.update(refreshTokens).set({
    isRevoked: true,
    revokedAt: now,
    revokeReason: "rotation",
  }).where(eq(refreshTokens.id, existing.id));

  // Create new token in the same family
  const newRaw = generateRawToken();
  const newHash = hashToken(newRaw);
  const expiresAt = new Date(now.getTime() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  const [newRow] = await db.insert(refreshTokens).values({
    userId: existing.userId,
    tenantId: existing.tenantId,
    staffId: existing.staffId,
    tokenHash: newHash,
    familyId: familyKey,
    parentId: existing.id,
    ipAddress,
    userAgent,
    deviceFingerprint,
    deviceInfo: deviceInfo ?? existing.deviceInfo,
    issuedAt: now,
    expiresAt,
    isRevoked: false,
  }).returning({ id: refreshTokens.id });

  // Link old token to new one
  await db.update(refreshTokens).set({
    replacedByTokenId: newRow.id,
  }).where(eq(refreshTokens.id, existing.id));

  // Audit log for successful rotation
  if (existing.tenantId) {
    await logAudit({
      tenantId: existing.tenantId,
      userId: existing.userId,
      action: "update",
      resource: "refresh_token",
      resourceId: existing.id,
      metadata: {
        event: "TOKEN_ROTATED",
        familyId: familyKey,
        rotatedTo: newRow.id,
        staffId: existing.staffId,
      },
      ipAddress,
      userAgent,
    });
  }

  return {
    newRefreshToken: newRaw,
    newTokenId: newRow.id,
    userId: existing.userId,
    tenantId: existing.tenantId,
    staffId: existing.staffId,
  };
}

/* ------------------ revoke single ------------------ */

type RevokeReason = "rotation" | "logout" | "force_logout" | "reuse_detected" | "expired" | "admin_action" | "security_event";

async function revokeSingle(
  token: typeof refreshTokens.$inferSelect,
  reason: RevokeReason
): Promise<void> {
  await db.update(refreshTokens).set({
    isRevoked: true,
    revokedAt: new Date(),
    revokeReason: reason,
  }).where(eq(refreshTokens.id, token.id));
}

/* ------------------ revoke family + invalidate ------------------ */

/**
 * Revoke an entire refresh token family and invalidate user sessions.
 * Called when reuse is detected (security incident).
 * 
 * Critical rules:
 * - Always set both isRevoked=true AND revokedAt=NOW()
 * - familyKey = token.familyId ?? token.id (handles legacy rows)
 * - Revoke by: familyId = familyKey OR id = familyKey
 * - Bump sessionVersion to force logout
 * - Emit SOC2-compliant audit log
 */
export async function revokeFamilyAndInvalidate(
  token: typeof refreshTokens.$inferSelect,
  ctx: {
    reason: "reuse_detected" | "force_logout" | "admin_action";
    ipAddress?: string;
    userAgent?: string;
    deviceFingerprint?: string;
  }
): Promise<void> {
  const now = new Date();
  const familyKey = token.familyId ?? token.id;

  // Revoke entire family (covers old rows with null familyId)
  await db.update(refreshTokens).set({
    isRevoked: true,
    revokedAt: now,
    revokeReason: ctx.reason,
    suspiciousReuseAt: ctx.reason === "reuse_detected" ? now : undefined,
  }).where(
    or(
      eq(refreshTokens.familyId, familyKey),
      eq(refreshTokens.id, familyKey)
    )
  );

  // Force logout by bumping sessionVersion (staff-level preferred)
  if (token.staffId) {
    await db.update(tenantStaff)
      .set({ sessionVersion: crypto.randomInt(1_000_000) })
      .where(eq(tenantStaff.id, token.staffId));
  }

  // SOC2-compliant audit log for security incident
  if (token.tenantId) {
    await logAudit({
      tenantId: token.tenantId,
      userId: token.userId,
      action: "access",
      resource: "refresh_token_family",
      resourceId: String(familyKey),
      metadata: {
        event: "SUSPICIOUS_LOGIN_DETECTED",
        reason: ctx.reason,
        staffId: token.staffId,
        deviceFingerprint: ctx.deviceFingerprint,
        familyId: familyKey,
      },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });
  }
}

/* ------------------ create ------------------ */

/**
 * Create a new refresh token (for initial login).
 * Sets familyId = id on insert to establish the token family.
 */
export async function createRefreshToken(params: {
  tenantId: string | null;
  userId: string;
  staffId?: string;
  ipAddress?: string;
  userAgent?: string;
  deviceFingerprint?: string;
  deviceInfo?: Record<string, unknown>;
}): Promise<{ token: string; tokenId: string; expiresAt: Date }> {
  const { tenantId, userId, staffId, ipAddress, userAgent, deviceFingerprint, deviceInfo } = params;
  
  const rawToken = generateRawToken();
  const tokenHash = hashToken(rawToken);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
  
  // Generate ID upfront so we can set familyId = id on insert
  const tokenId = crypto.randomUUID();

  await db.insert(refreshTokens).values({
    id: tokenId,
    tenantId,
    userId,
    staffId: staffId || null,
    tokenHash,
    familyId: tokenId, // Set familyId = id on initial insert
    issuedAt: now,
    expiresAt,
    ipAddress,
    userAgent,
    deviceFingerprint,
    deviceInfo: deviceInfo ?? { userAgent, ipAddress },
    isRevoked: false,
  });

  // Audit log for new session
  if (tenantId) {
    await logAudit({
      tenantId,
      userId,
      action: "create",
      resource: "refresh_token",
      resourceId: tokenId,
      metadata: {
        event: "SESSION_CREATED",
        familyId: tokenId,
        staffId: staffId || null,
      },
      ipAddress,
      userAgent,
    });
  }

  return {
    token: rawToken,
    tokenId,
    expiresAt,
  };
}

/* ------------------ revoke all ------------------ */

/**
 * Revoke all refresh tokens for a user/staff (for logout or force logout).
 * Returns the count of revoked tokens.
 */
export async function revokeAllRefreshTokens(params: {
  userId: string;
  tenantId?: string;
  staffId?: string;
  reason: "logout" | "force_logout" | "admin_action";
  ipAddress?: string;
  userAgent?: string;
}): Promise<number> {
  const { userId, tenantId, staffId, reason, ipAddress, userAgent } = params;
  const now = new Date();

  // Build where clause for active tokens only
  // Active = isRevoked = false AND revokedAt IS NULL (check both for consistency)
  let whereClause = and(
    eq(refreshTokens.userId, userId),
    eq(refreshTokens.isRevoked, false),
    isNull(refreshTokens.revokedAt)
  )!;
  
  if (tenantId) {
    whereClause = and(whereClause, eq(refreshTokens.tenantId, tenantId))!;
  }
  if (staffId) {
    whereClause = and(whereClause, eq(refreshTokens.staffId, staffId))!;
  }

  // Count before revoking
  const activeTokens = await db
    .select({ id: refreshTokens.id })
    .from(refreshTokens)
    .where(whereClause);

  const count = activeTokens.length;

  if (count > 0) {
    await db.update(refreshTokens).set({
      revokedAt: now,
      isRevoked: true,
      revokeReason: reason,
    }).where(whereClause);

    // Bump sessionVersion on force logout
    if (reason === "force_logout" && staffId) {
      await db.update(tenantStaff)
        .set({ sessionVersion: crypto.randomInt(1_000_000) })
        .where(eq(tenantStaff.id, staffId));
    }

    // Audit log
    if (tenantId) {
      await logAudit({
        tenantId,
        userId,
        action: "logout",
        resource: "refresh_token",
        resourceId: staffId || userId,
        metadata: {
          event: reason === "logout" ? "LOGOUT" : "FORCE_LOGOUT",
          revokedCount: count,
          reason,
          staffId,
        },
        ipAddress,
        userAgent,
      });
    }
  }

  return count;
}
