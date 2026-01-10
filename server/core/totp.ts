import { verify, generate, generateSecret, generateURI } from "otplib";
import crypto from "crypto";
import bcrypt from "bcrypt";

const defaultOptions = {
  algorithm: "sha1" as const,
  digits: 6 as const,
  period: 30,
};

export function generateTotpSecret(): string {
  return generateSecret();
}

export function generateOtpAuthUrl(email: string, secret: string, issuer = "MyBizStream"): string {
  return generateURI({
    secret,
    issuer,
    algorithm: "sha1",
    digits: 6,
    period: 30,
    label: email,
  });
}

export async function verifyTotpCode(secret: string, code: string): Promise<boolean> {
  try {
    const result = await verify({
      ...defaultOptions,
      secret,
      token: code,
    });
    return result.valid;
  } catch {
    return false;
  }
}

export function generateBackupCodes(count = 8): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const code = crypto.randomBytes(4).toString("hex").toUpperCase();
    codes.push(`${code.slice(0, 4)}-${code.slice(4)}`);
  }
  return codes;
}

export async function hashBackupCodes(codes: string[]): Promise<string[]> {
  return Promise.all(codes.map(code => bcrypt.hash(code.replace("-", ""), 10)));
}

export async function verifyBackupCode(code: string, hashedCodes: string[]): Promise<number> {
  const normalizedCode = code.replace("-", "").toUpperCase();
  for (let i = 0; i < hashedCodes.length; i++) {
    if (hashedCodes[i] && await bcrypt.compare(normalizedCode, hashedCodes[i])) {
      return i;
    }
  }
  return -1;
}

export function generateTempToken(adminId: string, expiresInMinutes = 5): { token: string; expiresAt: Date } {
  const nonce = crypto.randomBytes(16).toString("hex");
  const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);
  const payload = JSON.stringify({ adminId, nonce, expiresAt: expiresAt.toISOString() });
  const token = Buffer.from(payload).toString("base64");
  return { token, expiresAt };
}

export function verifyTempToken(token: string): { adminId: string; valid: boolean } {
  try {
    const payload = JSON.parse(Buffer.from(token, "base64").toString("utf-8"));
    const expiresAt = new Date(payload.expiresAt);
    if (expiresAt < new Date()) {
      return { adminId: "", valid: false };
    }
    return { adminId: payload.adminId, valid: true };
  } catch {
    return { adminId: "", valid: false };
  }
}
