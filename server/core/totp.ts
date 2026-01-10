import { verify, generate, generateSecret, generateURI } from "otplib";
import crypto from "crypto";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

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

const TEMP_TOKEN_SECRET = process.env.JWT_ACCESS_SECRET || "fallback-2fa-temp-secret-change-me";

export function generateTempToken(adminId: string, expiresInMinutes = 5): { token: string; expiresAt: Date } {
  const nonce = crypto.randomBytes(16).toString("hex");
  const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);
  
  const token = jwt.sign(
    { 
      adminId, 
      nonce,
      purpose: "2fa-verification",
    },
    TEMP_TOKEN_SECRET,
    { 
      expiresIn: `${expiresInMinutes}m`,
      issuer: "mybizstream-2fa",
    }
  );
  
  return { token, expiresAt };
}

export function verifyTempToken(token: string): { adminId: string; valid: boolean } {
  try {
    const decoded = jwt.verify(token, TEMP_TOKEN_SECRET, {
      issuer: "mybizstream-2fa",
    }) as { adminId: string; purpose: string };
    
    if (decoded.purpose !== "2fa-verification") {
      return { adminId: "", valid: false };
    }
    
    return { adminId: decoded.adminId, valid: true };
  } catch (error) {
    return { adminId: "", valid: false };
  }
}
