import type { Request, Response, NextFunction } from "express";
import { db } from "../db";
import {
  adminLoginAttempts,
  adminAccountLockouts,
  adminIpRules,
  adminSessions,
  adminAuditLogs,
  adminSecurityConfig,
  platformAdmins,
  adminTwoFactorAuth,
  DEFAULT_ADMIN_SECURITY_CONFIG,
} from "@shared/schema";
import { eq, and, gt, lt, desc, sql } from "drizzle-orm";
import crypto from "crypto";

interface SecurityConfig {
  maxLoginAttempts: number;
  lockoutDurationMinutes: number;
  sessionTimeoutMinutes: number;
  sessionAbsoluteTimeoutHours: number;
  requireIpWhitelist: boolean;
  require2FA: boolean;
  require2FAForSuperAdmin: boolean;
  passwordExpiryDays: number;
  minPasswordLength: number;
  auditLogRetentionDays: number;
  highRiskActions: string[];
}

let cachedConfig: SecurityConfig | null = null;
let configCacheTime = 0;
const CONFIG_CACHE_TTL = 60 * 1000; // 1 minute

export async function getSecurityConfig(): Promise<SecurityConfig> {
  const now = Date.now();
  if (cachedConfig && now - configCacheTime < CONFIG_CACHE_TTL) {
    return cachedConfig;
  }

  const configs = await db.select().from(adminSecurityConfig);
  const configMap: Record<string, any> = {};

  for (const config of configs) {
    configMap[config.configKey] = config.configValue;
  }

  cachedConfig = {
    ...DEFAULT_ADMIN_SECURITY_CONFIG,
    highRiskActions: [...DEFAULT_ADMIN_SECURITY_CONFIG.highRiskActions],
    ...configMap,
  } as unknown as SecurityConfig;

  configCacheTime = now;
  return cachedConfig;
}

export function getClientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) {
    const ips = (Array.isArray(forwarded) ? forwarded[0] : forwarded).split(",");
    return ips[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || "unknown";
}

function ipMatchesCidr(ip: string, cidr: string): boolean {
  if (cidr === ip) return true;
  if (!cidr.includes("/")) return false;

  try {
    const [network, prefixLengthStr] = cidr.split("/");
    const prefixLength = parseInt(prefixLengthStr, 10);

    const ipParts = ip.split(".").map(Number);
    const networkParts = network.split(".").map(Number);

    if (ipParts.length !== 4 || networkParts.length !== 4) return false;

    const ipNum = (ipParts[0] << 24) | (ipParts[1] << 16) | (ipParts[2] << 8) | ipParts[3];
    const networkNum = (networkParts[0] << 24) | (networkParts[1] << 16) | (networkParts[2] << 8) | networkParts[3];
    const mask = ~((1 << (32 - prefixLength)) - 1);

    return (ipNum & mask) === (networkNum & mask);
  } catch {
    return false;
  }
}

export async function checkIpRestrictions(ip: string): Promise<{
  allowed: boolean;
  reason?: string;
}> {
  const config = await getSecurityConfig();

  const rules = await db.select().from(adminIpRules).where(
    and(
      eq(adminIpRules.isActive, true),
      sql`${adminIpRules.expiresAt} IS NULL OR ${adminIpRules.expiresAt} > NOW()`
    )
  );

  const blacklisted = rules.find(
    (r) => r.ruleType === "blacklist" && ipMatchesCidr(ip, r.ipPattern)
  );

  if (blacklisted) {
    return {
      allowed: false,
      reason: `IP ${ip} is blacklisted: ${blacklisted.description || "Access denied"}`,
    };
  }

  if (config.requireIpWhitelist) {
    const whitelisted = rules.find(
      (r) => r.ruleType === "whitelist" && ipMatchesCidr(ip, r.ipPattern)
    );

    if (!whitelisted) {
      return {
        allowed: false,
        reason: `IP ${ip} is not whitelisted`,
      };
    }
  }

  return { allowed: true };
}

export async function checkAccountLockout(
  email: string,
  ip: string
): Promise<{ locked: boolean; reason?: string; expiresAt?: Date }> {
  const now = new Date();

  const lockouts = await db
    .select()
    .from(adminAccountLockouts)
    .where(
      and(
        gt(adminAccountLockouts.expiresAt, now),
        sql`${adminAccountLockouts.unlockedAt} IS NULL`
      )
    );

  const emailLockout = lockouts.find(
    (l) => l.email === email && (l.lockoutType === "email" || l.lockoutType === "account")
  );

  if (emailLockout) {
    return {
      locked: true,
      reason: emailLockout.reason,
      expiresAt: emailLockout.expiresAt,
    };
  }

  const ipLockout = lockouts.find(
    (l) => l.ipAddress === ip && l.lockoutType === "ip"
  );

  if (ipLockout) {
    return {
      locked: true,
      reason: ipLockout.reason,
      expiresAt: ipLockout.expiresAt,
    };
  }

  return { locked: false };
}

export async function recordLoginAttempt(
  email: string,
  ip: string,
  userAgent: string | undefined,
  success: boolean,
  failureReason?: string
): Promise<void> {
  await db.insert(adminLoginAttempts).values({
    email,
    ipAddress: ip,
    userAgent: userAgent?.substring(0, 500),
    success,
    failureReason,
  });

  if (!success) {
    const config = await getSecurityConfig();
    const windowStart = new Date(Date.now() - 30 * 60 * 1000); // 30 min window

    const recentAttempts = await db
      .select()
      .from(adminLoginAttempts)
      .where(
        and(
          eq(adminLoginAttempts.email, email),
          eq(adminLoginAttempts.success, false),
          gt(adminLoginAttempts.attemptedAt, windowStart)
        )
      );

    if (recentAttempts.length >= config.maxLoginAttempts) {
      const expiresAt = new Date(Date.now() + config.lockoutDurationMinutes * 60 * 1000);

      const [admin] = await db.select().from(platformAdmins).where(eq(platformAdmins.email, email));

      await db.insert(adminAccountLockouts).values({
        adminId: admin?.id || null,
        email,
        ipAddress: ip,
        lockoutType: "email",
        reason: `Exceeded ${config.maxLoginAttempts} failed login attempts`,
        failedAttempts: String(recentAttempts.length),
        expiresAt,
      });
    }
  }
}

export async function check2FARequired(adminId: string, adminRole: string): Promise<{
  required: boolean;
  enabled: boolean;
  verified: boolean;
}> {
  const config = await getSecurityConfig();

  const [twoFa] = await db
    .select()
    .from(adminTwoFactorAuth)
    .where(eq(adminTwoFactorAuth.adminId, adminId));

  const enabled = twoFa?.isEnabled || false;
  const verified = twoFa?.isVerified || false;

  let required = config.require2FA;
  if (adminRole === "SUPER_ADMIN" && config.require2FAForSuperAdmin) {
    required = true;
  }

  return { required, enabled, verified };
}

export async function createAdminSession(
  adminId: string,
  tokenHash: string,
  ip: string,
  userAgent?: string,
  deviceInfo?: Record<string, any>
): Promise<string> {
  const config = await getSecurityConfig();

  const expiresAt = new Date(
    Date.now() + config.sessionAbsoluteTimeoutHours * 60 * 60 * 1000
  );

  const [session] = await db.insert(adminSessions).values({
    adminId,
    tokenHash,
    ipAddress: ip,
    userAgent: userAgent?.substring(0, 500),
    deviceInfo: deviceInfo || {},
    expiresAt,
  }).returning();

  return session.id;
}

export async function updateSessionActivity(sessionId: string): Promise<void> {
  await db
    .update(adminSessions)
    .set({ lastActivityAt: new Date() })
    .where(eq(adminSessions.id, sessionId));
}

export async function terminateSession(
  sessionId: string,
  reason: string
): Promise<void> {
  await db
    .update(adminSessions)
    .set({
      isActive: false,
      terminatedAt: new Date(),
      terminationReason: reason,
    })
    .where(eq(adminSessions.id, sessionId));
}

export async function terminateAllSessions(
  adminId: string,
  reason: string,
  exceptSessionId?: string
): Promise<number> {
  const whereClause = exceptSessionId
    ? and(
        eq(adminSessions.adminId, adminId),
        eq(adminSessions.isActive, true),
        sql`${adminSessions.id} != ${exceptSessionId}`
      )
    : and(eq(adminSessions.adminId, adminId), eq(adminSessions.isActive, true));

  const result = await db
    .update(adminSessions)
    .set({
      isActive: false,
      terminatedAt: new Date(),
      terminationReason: reason,
    })
    .where(whereClause!)
    .returning();

  return result.length;
}

export async function checkSessionValidity(
  tokenHash: string
): Promise<{
  valid: boolean;
  session?: typeof adminSessions.$inferSelect;
  reason?: string;
}> {
  const config = await getSecurityConfig();
  const now = new Date();

  const [session] = await db
    .select()
    .from(adminSessions)
    .where(
      and(
        eq(adminSessions.tokenHash, tokenHash),
        eq(adminSessions.isActive, true)
      )
    );

  if (!session) {
    return { valid: false, reason: "Session not found" };
  }

  if (session.expiresAt < now) {
    await terminateSession(session.id, "expired");
    return { valid: false, reason: "Session expired" };
  }

  const inactivityLimit = new Date(
    now.getTime() - config.sessionTimeoutMinutes * 60 * 1000
  );

  if (session.lastActivityAt && session.lastActivityAt < inactivityLimit) {
    await terminateSession(session.id, "inactivity_timeout");
    return { valid: false, reason: "Session timed out due to inactivity" };
  }

  return { valid: true, session };
}

type RiskLevel = "low" | "medium" | "high" | "critical";

export async function logAdminAction(params: {
  adminId: string | null;
  adminEmail: string;
  adminRole: string;
  sessionId?: string;
  action: string;
  category: "auth" | "tenant" | "user" | "config" | "security" | "support";
  resource?: string;
  resourceId?: string;
  targetTenantId?: string;
  targetUserId?: string;
  oldValue?: any;
  newValue?: any;
  metadata?: Record<string, any>;
  ipAddress: string;
  userAgent?: string;
  reason?: string;
  correlationId?: string;
}): Promise<string> {
  const config = await getSecurityConfig();

  let riskLevel: RiskLevel = "low";
  if (config.highRiskActions.includes(params.action)) {
    riskLevel = "high";
  } else if (params.action.includes("delete") || params.action.includes("terminate")) {
    riskLevel = "medium";
  }

  const [log] = await db.insert(adminAuditLogs).values({
    adminId: params.adminId,
    adminEmail: params.adminEmail,
    adminRole: params.adminRole,
    sessionId: params.sessionId,
    action: params.action,
    category: params.category,
    resource: params.resource,
    resourceId: params.resourceId,
    targetTenantId: params.targetTenantId,
    targetUserId: params.targetUserId,
    oldValue: params.oldValue,
    newValue: params.newValue,
    metadata: params.metadata || {},
    ipAddress: params.ipAddress,
    userAgent: params.userAgent?.substring(0, 500),
    riskLevel,
    reason: params.reason,
    correlationId: params.correlationId,
  }).returning();

  return log.id;
}

export function adminIpRestriction() {
  return async (req: Request, res: Response, next: NextFunction) => {
    const ip = getClientIp(req);
    const result = await checkIpRestrictions(ip);

    if (!result.allowed) {
      return res.status(403).json({
        message: "Access denied",
        code: "IP_RESTRICTED",
        reason: result.reason,
      });
    }

    next();
  };
}

export function adminRateLimit(options: {
  windowMs?: number;
  maxRequests?: number;
} = {}) {
  const windowMs = options.windowMs || 60 * 1000; // 1 minute
  const maxRequests = options.maxRequests || 30;

  const requests = new Map<string, { count: number; resetAt: number }>();

  setInterval(() => {
    const now = Date.now();
    const keys = Array.from(requests.keys());
    for (const key of keys) {
      const value = requests.get(key);
      if (value && value.resetAt < now) {
        requests.delete(key);
      }
    }
  }, 60 * 1000);

  return (req: Request, res: Response, next: NextFunction) => {
    const ip = getClientIp(req);
    const now = Date.now();

    const record = requests.get(ip);

    if (!record || record.resetAt < now) {
      requests.set(ip, { count: 1, resetAt: now + windowMs });
      return next();
    }

    if (record.count >= maxRequests) {
      return res.status(429).json({
        message: "Too many requests",
        code: "RATE_LIMITED",
        retryAfter: Math.ceil((record.resetAt - now) / 1000),
      });
    }

    record.count++;
    next();
  };
}

export function adminSessionTimeout() {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.platformAdminContext) {
      return next();
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return next();
    }

    const token = authHeader.slice(7);
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const { valid, reason } = await checkSessionValidity(tokenHash);

    if (!valid) {
      return res.status(401).json({
        message: "Session invalid",
        code: "SESSION_INVALID",
        reason,
      });
    }

    await updateSessionActivity(tokenHash);

    next();
  };
}

export function adminLoginLockout() {
  return async (req: Request, res: Response, next: NextFunction) => {
    const { email } = req.body;
    if (!email) {
      return next();
    }

    const ip = getClientIp(req);
    const lockout = await checkAccountLockout(email, ip);

    if (lockout.locked) {
      return res.status(423).json({
        message: "Account temporarily locked",
        code: "ACCOUNT_LOCKED",
        reason: lockout.reason,
        expiresAt: lockout.expiresAt,
      });
    }

    next();
  };
}

export function require2FAVerification() {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.platformAdminContext) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { platformAdmin } = req.platformAdminContext;

    const twoFaStatus = await check2FARequired(platformAdmin.id, platformAdmin.role);

    if (twoFaStatus.required && !twoFaStatus.enabled) {
      return res.status(403).json({
        message: "Two-factor authentication setup required",
        code: "2FA_SETUP_REQUIRED",
      });
    }

    if (twoFaStatus.required && twoFaStatus.enabled && !twoFaStatus.verified) {
      return res.status(403).json({
        message: "Two-factor authentication verification required",
        code: "2FA_VERIFICATION_REQUIRED",
      });
    }

    next();
  };
}

export async function getAdminLoginAttempts(
  email: string,
  limit: number = 10
): Promise<typeof adminLoginAttempts.$inferSelect[]> {
  return db
    .select()
    .from(adminLoginAttempts)
    .where(eq(adminLoginAttempts.email, email))
    .orderBy(desc(adminLoginAttempts.attemptedAt))
    .limit(limit);
}

export async function getAdminAuditLogs(filters: {
  adminId?: string;
  category?: string;
  action?: string;
  targetTenantId?: string;
  riskLevel?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}): Promise<typeof adminAuditLogs.$inferSelect[]> {
  let query = db.select().from(adminAuditLogs);

  const conditions = [];

  if (filters.adminId) {
    conditions.push(eq(adminAuditLogs.adminId, filters.adminId));
  }
  if (filters.category) {
    conditions.push(eq(adminAuditLogs.category, filters.category));
  }
  if (filters.action) {
    conditions.push(eq(adminAuditLogs.action, filters.action));
  }
  if (filters.targetTenantId) {
    conditions.push(eq(adminAuditLogs.targetTenantId, filters.targetTenantId));
  }
  if (filters.riskLevel) {
    conditions.push(eq(adminAuditLogs.riskLevel, filters.riskLevel));
  }
  if (filters.startDate) {
    conditions.push(gt(adminAuditLogs.createdAt, filters.startDate));
  }
  if (filters.endDate) {
    conditions.push(lt(adminAuditLogs.createdAt, filters.endDate));
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as typeof query;
  }

  return query
    .orderBy(desc(adminAuditLogs.createdAt))
    .limit(filters.limit || 50)
    .offset(filters.offset || 0);
}

export async function unlockAccount(
  lockoutId: string,
  unlockedBy: string
): Promise<void> {
  await db
    .update(adminAccountLockouts)
    .set({
      unlockedAt: new Date(),
      unlockedBy,
    })
    .where(eq(adminAccountLockouts.id, lockoutId));
}

export async function addIpRule(
  ipPattern: string,
  ruleType: "whitelist" | "blacklist",
  description: string,
  createdBy: string,
  expiresAt?: Date
): Promise<string> {
  const [rule] = await db.insert(adminIpRules).values({
    ipPattern,
    ruleType,
    description,
    createdBy,
    expiresAt,
  }).returning();

  return rule.id;
}

export async function removeIpRule(ruleId: string): Promise<void> {
  await db.update(adminIpRules).set({ isActive: false }).where(eq(adminIpRules.id, ruleId));
}
