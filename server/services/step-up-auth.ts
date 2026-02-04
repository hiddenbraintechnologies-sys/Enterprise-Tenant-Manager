import { db } from "../db";
import { stepUpChallenges, staffTotpConfig } from "@shared/schema";
import { eq, and, gte, isNotNull } from "drizzle-orm";
import * as OTPAuth from "otpauth";

export type StepUpPurpose = 
  | "force_logout"
  | "revoke_session"
  | "change_role"
  | "change_permissions"
  | "impersonate"
  | "ip_rule_change"
  | "sso_config"
  | "billing_change"
  | "data_export"
  | "security_settings";

const STEP_UP_WINDOW_SECONDS = 600; // 10 minutes

/**
 * Check if user has a recent verified step-up for the given purpose.
 */
export async function hasRecentStepUp(
  tenantId: string,
  userId: string,
  purpose: StepUpPurpose,
  windowSeconds: number = STEP_UP_WINDOW_SECONDS
): Promise<boolean> {
  const cutoff = new Date(Date.now() - windowSeconds * 1000);

  const [challenge] = await db
    .select()
    .from(stepUpChallenges)
    .where(
      and(
        eq(stepUpChallenges.tenantId, tenantId),
        eq(stepUpChallenges.userId, userId),
        eq(stepUpChallenges.purpose, purpose),
        isNotNull(stepUpChallenges.verifiedAt),
        gte(stepUpChallenges.verifiedAt, cutoff)
      )
    )
    .limit(1);

  return !!challenge;
}

/**
 * Create a step-up challenge.
 */
export async function createStepUpChallenge(
  tenantId: string,
  userId: string,
  purpose: StepUpPurpose,
  ipAddress?: string,
  userAgent?: string
): Promise<string> {
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes to enter OTP

  const [challenge] = await db
    .insert(stepUpChallenges)
    .values({
      tenantId,
      userId,
      purpose,
      expiresAt,
      ipAddress: ipAddress || null,
      userAgent: userAgent || null,
    })
    .returning({ id: stepUpChallenges.id });

  return challenge.id;
}

/**
 * Mark a step-up challenge as verified.
 */
export async function markStepUpVerified(
  tenantId: string,
  userId: string,
  purpose: StepUpPurpose
): Promise<boolean> {
  const [updated] = await db
    .update(stepUpChallenges)
    .set({ verifiedAt: new Date() })
    .where(
      and(
        eq(stepUpChallenges.tenantId, tenantId),
        eq(stepUpChallenges.userId, userId),
        eq(stepUpChallenges.purpose, purpose),
        gte(stepUpChallenges.expiresAt, new Date())
      )
    )
    .returning({ id: stepUpChallenges.id });

  return !!updated;
}

/**
 * Get TOTP config for a staff member.
 */
export async function getTotpConfig(staffId: string) {
  const [config] = await db
    .select()
    .from(staffTotpConfig)
    .where(eq(staffTotpConfig.staffId, staffId))
    .limit(1);

  return config;
}

/**
 * Check if TOTP is enabled for a staff member.
 */
export async function isTotpEnabled(staffId: string): Promise<boolean> {
  const config = await getTotpConfig(staffId);
  return config?.totpEnabled ?? false;
}

/**
 * Generate a new TOTP secret for enrollment.
 */
export function generateTotpSecret(email: string, issuer: string = "MyBizStream"): {
  secret: string;
  uri: string;
} {
  const totp = new OTPAuth.TOTP({
    issuer,
    label: email,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: new OTPAuth.Secret({ size: 20 }),
  });

  return {
    secret: totp.secret.base32,
    uri: totp.toString(),
  };
}

/**
 * Verify a TOTP code.
 */
export function verifyTotpCode(secret: string, code: string): boolean {
  try {
    const totp = new OTPAuth.TOTP({
      issuer: "MyBizStream",
      algorithm: "SHA1",
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(secret),
    });

    const delta = totp.validate({ token: code, window: 1 });
    return delta !== null;
  } catch {
    return false;
  }
}

/**
 * Enable TOTP for a staff member.
 */
export async function enableTotp(
  staffId: string,
  tenantId: string,
  secret: string,
  verificationCode: string
): Promise<boolean> {
  if (!verifyTotpCode(secret, verificationCode)) {
    return false;
  }

  const existing = await getTotpConfig(staffId);

  if (existing) {
    await db
      .update(staffTotpConfig)
      .set({
        totpSecret: secret,
        totpEnabled: true,
        enabledAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(staffTotpConfig.staffId, staffId));
  } else {
    await db.insert(staffTotpConfig).values({
      staffId,
      tenantId,
      totpSecret: secret,
      totpEnabled: true,
      enabledAt: new Date(),
    });
  }

  return true;
}

/**
 * Disable TOTP for a staff member.
 */
export async function disableTotp(staffId: string): Promise<boolean> {
  const [updated] = await db
    .update(staffTotpConfig)
    .set({
      totpEnabled: false,
      updatedAt: new Date(),
    })
    .where(eq(staffTotpConfig.staffId, staffId))
    .returning({ id: staffTotpConfig.id });

  return !!updated;
}
