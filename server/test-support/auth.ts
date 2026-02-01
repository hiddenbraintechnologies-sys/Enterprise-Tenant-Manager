/**
 * Test Authentication Helpers
 * 
 * Provides deterministic auth for HTTP tests by minting JWTs directly,
 * bypassing bcrypt password hashing for speed and reliability.
 * 
 * These helpers use the same JWT signing as production but skip the
 * login flow entirely, making tests fast and deterministic.
 */

import jwt, { SignOptions } from "jsonwebtoken";
import { randomBytes } from "crypto";
import { db } from "../db";
import { users, userTenants, roles } from "@shared/schema";
import { eq } from "drizzle-orm";

function getJwtSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET environment variable is required for JWT signing");
  }
  return secret;
}

export interface TestTokenPayload {
  userId: string;
  tenantId: string;
  roleId?: string;
  permissions?: string[];
}

export interface TestUserPayload {
  email: string;
  firstName: string;
  lastName: string;
  tenantId: string;
}

/**
 * Mints a valid JWT access token for testing.
 * Uses the same signing key and format as production.
 */
export function mintTestJwt(payload: TestTokenPayload): string {
  const secret = getJwtSecret();
  const jti = randomBytes(32).toString("hex");

  const tokenPayload = {
    sub: payload.userId,
    tnt: payload.tenantId,
    rol: payload.roleId || null,
    perms: payload.permissions || [],
    type: "access",
    jti,
    ver: 1,
  };

  return jwt.sign(tokenPayload, secret, {
    expiresIn: "1h",
    issuer: "bizflow",
    audience: "bizflow-api",
  } as SignOptions);
}

/**
 * Returns Authorization header for Bearer token.
 */
export function authHeader(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

/**
 * Creates auth headers for a user in a specific tenant.
 * This is the main helper for HTTP tests.
 */
export function getAuthHeadersForTenant(
  userId: string,
  tenantId: string,
  options: { roleId?: string; permissions?: string[] } = {}
): Record<string, string> {
  const token = mintTestJwt({
    userId,
    tenantId,
    roleId: options.roleId,
    permissions: options.permissions || [],
  });
  return authHeader(token);
}

/**
 * Gets the admin role ID from the database.
 * Creates it if it doesn't exist.
 */
export async function getAdminRoleId(): Promise<string> {
  const [adminRole] = await db.select().from(roles).where(eq(roles.name, "Admin"));
  if (adminRole) return adminRole.id;

  const [created] = await db.insert(roles).values({
    name: "Admin",
    description: "Administrator role",
    isSystem: true,
  }).returning();
  return created.id;
}

/**
 * Creates a test user in the database and links them to a tenant.
 * Returns the user ID and a pre-minted JWT token.
 * 
 * Note: Does NOT set a password - use mintTestJwt directly for auth.
 */
export async function createTestUserWithToken(
  payload: TestUserPayload
): Promise<{ userId: string; token: string; authHeaders: Record<string, string> }> {
  const roleId = await getAdminRoleId();

  const [user] = await db.insert(users).values({
    email: payload.email,
    firstName: payload.firstName,
    lastName: payload.lastName,
    passwordHash: "TEST_USER_NO_PASSWORD", // Not used - we mint tokens directly
    lastTenantId: payload.tenantId,
  }).returning();

  await db.insert(userTenants).values({
    userId: user.id,
    tenantId: payload.tenantId,
    roleId,
    isDefault: true,
    isActive: true,
  });

  const token = mintTestJwt({
    userId: user.id,
    tenantId: payload.tenantId,
    roleId,
    permissions: [],
  });

  return {
    userId: user.id,
    token,
    authHeaders: authHeader(token),
  };
}

/**
 * Mints a platform admin JWT for testing admin routes.
 */
export function mintPlatformAdminJwt(adminId: string, role: "SUPER_ADMIN" | "PLATFORM_ADMIN" = "SUPER_ADMIN"): string {
  const secret = getJwtSecret();
  const jti = randomBytes(32).toString("hex");

  const permissions = role === "SUPER_ADMIN"
    ? ["platform:*", "tenants:*", "users:*", "admins:*"]
    : [];

  const tokenPayload = {
    sub: adminId,
    tnt: null,
    rol: null,
    perms: permissions,
    type: "access",
    jti,
    ver: 1,
    isPlatformAdmin: true,
    platformRole: role,
  };

  return jwt.sign(tokenPayload, secret, {
    expiresIn: "1h",
    issuer: "bizflow",
    audience: "bizflow-api",
  } as SignOptions);
}
