import type { Request, Response, NextFunction } from "express";
import { db } from "../db";
import { auditLogs, users, type InsertAuditLog } from "@shared/schema";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";

export type PHIAccessReason = 
  | "treatment"
  | "payment"
  | "operations"
  | "research"
  | "legal"
  | "patient_request"
  | "emergency";

export type SensitiveDataCategory =
  | "phi"
  | "pii"
  | "financial"
  | "authentication";

export interface PHIAccessEntry {
  tenantId: string;
  userId: string;
  patientId: string;
  resourceType: string;
  resourceId?: string;
  action: "view" | "create" | "update" | "delete" | "export" | "print";
  accessReason: PHIAccessReason;
  fieldsAccessed?: string[];
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  responseTimeMs?: number;
}

export interface DataMaskingConfig {
  email: "full" | "partial" | "none";
  phone: "full" | "partial" | "none";
  ssn: "full" | "last4" | "none";
  address: "full" | "city_only" | "none";
  dob: "full" | "year_only" | "none";
  financialAccount: "full" | "last4" | "none";
}

const ROLE_MASKING_CONFIGS: Record<string, DataMaskingConfig> = {
  super_admin: {
    email: "none",
    phone: "none",
    ssn: "last4",
    address: "none",
    dob: "none",
    financialAccount: "last4",
  },
  admin: {
    email: "none",
    phone: "none",
    ssn: "last4",
    address: "none",
    dob: "none",
    financialAccount: "last4",
  },
  manager: {
    email: "none",
    phone: "none",
    ssn: "full",
    address: "city_only",
    dob: "none",
    financialAccount: "last4",
  },
  doctor: {
    email: "none",
    phone: "none",
    ssn: "last4",
    address: "none",
    dob: "none",
    financialAccount: "full",
  },
  nurse: {
    email: "none",
    phone: "none",
    ssn: "full",
    address: "city_only",
    dob: "none",
    financialAccount: "full",
  },
  staff: {
    email: "partial",
    phone: "partial",
    ssn: "full",
    address: "city_only",
    dob: "year_only",
    financialAccount: "full",
  },
  receptionist: {
    email: "partial",
    phone: "partial",
    ssn: "full",
    address: "city_only",
    dob: "year_only",
    financialAccount: "full",
  },
  customer: {
    email: "partial",
    phone: "partial",
    ssn: "full",
    address: "full",
    dob: "full",
    financialAccount: "full",
  },
};

export class ComplianceService {
  async logPHIAccess(entry: PHIAccessEntry): Promise<void> {
    try {
      await db.insert(auditLogs).values({
        tenantId: entry.tenantId,
        userId: entry.userId,
        action: "access",
        resource: `phi:${entry.resourceType}`,
        resourceId: entry.resourceId || entry.patientId,
        metadata: {
          patientId: entry.patientId,
          accessReason: entry.accessReason,
          fieldsAccessed: entry.fieldsAccessed,
          sessionId: entry.sessionId,
          responseTimeMs: entry.responseTimeMs,
          category: "phi",
        },
        ipAddress: entry.ipAddress,
        userAgent: entry.userAgent,
      });
    } catch (error) {
      console.error("Failed to log PHI access:", error);
    }
  }

  logPHIAccessAsync(entry: PHIAccessEntry): void {
    setImmediate(() => this.logPHIAccess(entry));
  }

  async getPatientAccessHistory(
    tenantId: string,
    patientId: string,
    options: { startDate?: Date; endDate?: Date; limit?: number } = {}
  ): Promise<any[]> {
    const conditions = [
      eq(auditLogs.tenantId, tenantId),
      sql`${auditLogs.metadata}->>'patientId' = ${patientId}`,
      sql`${auditLogs.metadata}->>'category' = 'phi'`,
    ];

    if (options.startDate) {
      conditions.push(gte(auditLogs.createdAt, options.startDate));
    }
    if (options.endDate) {
      conditions.push(lte(auditLogs.createdAt, options.endDate));
    }

    const results = await db.select({
      log: auditLogs,
      user: {
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
      },
    })
    .from(auditLogs)
    .leftJoin(users, eq(auditLogs.userId, users.id))
    .where(and(...conditions))
    .orderBy(desc(auditLogs.createdAt))
    .limit(options.limit || 100);

    return results.map(r => ({
      ...r.log,
      accessedBy: r.user,
    }));
  }

  async getUnusualAccessPatterns(
    tenantId: string,
    options: { windowHours?: number; threshold?: number } = {}
  ): Promise<any[]> {
    const windowHours = options.windowHours || 24;
    const threshold = options.threshold || 50;
    const windowStart = new Date(Date.now() - windowHours * 60 * 60 * 1000);

    const results = await db.execute(sql`
      SELECT 
        user_id,
        COUNT(*) as access_count,
        COUNT(DISTINCT ${auditLogs.metadata}->>'patientId') as unique_patients,
        array_agg(DISTINCT ${auditLogs.resource}) as resources_accessed
      FROM ${auditLogs}
      WHERE 
        tenant_id = ${tenantId}
        AND ${auditLogs.metadata}->>'category' = 'phi'
        AND created_at >= ${windowStart}
      GROUP BY user_id
      HAVING COUNT(*) > ${threshold}
      ORDER BY access_count DESC
    `);

    return results.rows as any[];
  }

  getMaskingConfig(roleName: string): DataMaskingConfig {
    return ROLE_MASKING_CONFIGS[roleName] || ROLE_MASKING_CONFIGS.customer;
  }
}

export class DataMasker {
  private config: DataMaskingConfig;

  constructor(config: DataMaskingConfig) {
    this.config = config;
  }

  maskEmail(email: string | null | undefined): string | null {
    if (!email) return null;
    
    switch (this.config.email) {
      case "none":
        return email;
      case "partial":
        const [local, domain] = email.split("@");
        if (!domain) return "***@***.***";
        const maskedLocal = local.length > 2 
          ? local[0] + "***" + local[local.length - 1]
          : "***";
        return `${maskedLocal}@${domain}`;
      case "full":
        return "***@***.***";
      default:
        return email;
    }
  }

  maskPhone(phone: string | null | undefined): string | null {
    if (!phone) return null;
    
    const digits = phone.replace(/\D/g, "");
    
    switch (this.config.phone) {
      case "none":
        return phone;
      case "partial":
        if (digits.length >= 4) {
          return "***-***-" + digits.slice(-4);
        }
        return "***-***-****";
      case "full":
        return "***-***-****";
      default:
        return phone;
    }
  }

  maskSSN(ssn: string | null | undefined): string | null {
    if (!ssn) return null;
    
    const digits = ssn.replace(/\D/g, "");
    
    switch (this.config.ssn) {
      case "none":
        return ssn;
      case "last4":
        if (digits.length >= 4) {
          return "***-**-" + digits.slice(-4);
        }
        return "***-**-****";
      case "full":
        return "***-**-****";
      default:
        return ssn;
    }
  }

  maskAddress(address: { 
    street?: string; 
    city?: string; 
    state?: string; 
    zip?: string;
    country?: string;
  } | null | undefined): any {
    if (!address) return null;
    
    switch (this.config.address) {
      case "none":
        return address;
      case "city_only":
        return {
          street: "***",
          city: address.city,
          state: address.state,
          zip: "***",
          country: address.country,
        };
      case "full":
        return {
          street: "***",
          city: "***",
          state: "***",
          zip: "***",
          country: "***",
        };
      default:
        return address;
    }
  }

  maskDOB(dob: Date | string | null | undefined): string | null {
    if (!dob) return null;
    
    const date = typeof dob === "string" ? new Date(dob) : dob;
    
    switch (this.config.dob) {
      case "none":
        return date.toISOString().split("T")[0];
      case "year_only":
        return `${date.getFullYear()}-**-**`;
      case "full":
        return "****-**-**";
      default:
        return date.toISOString().split("T")[0];
    }
  }

  maskFinancialAccount(account: string | null | undefined): string | null {
    if (!account) return null;
    
    switch (this.config.financialAccount) {
      case "none":
        return account;
      case "last4":
        if (account.length >= 4) {
          return "****" + account.slice(-4);
        }
        return "********";
      case "full":
        return "********";
      default:
        return account;
    }
  }

  maskRecord<T extends Record<string, any>>(
    record: T,
    fieldMappings: {
      email?: keyof T;
      phone?: keyof T;
      ssn?: keyof T;
      dob?: keyof T;
      financialAccount?: keyof T;
    }
  ): T {
    const masked = { ...record };

    if (fieldMappings.email && masked[fieldMappings.email]) {
      (masked as any)[fieldMappings.email] = this.maskEmail(masked[fieldMappings.email] as string);
    }
    if (fieldMappings.phone && masked[fieldMappings.phone]) {
      (masked as any)[fieldMappings.phone] = this.maskPhone(masked[fieldMappings.phone] as string);
    }
    if (fieldMappings.ssn && masked[fieldMappings.ssn]) {
      (masked as any)[fieldMappings.ssn] = this.maskSSN(masked[fieldMappings.ssn] as string);
    }
    if (fieldMappings.dob && masked[fieldMappings.dob]) {
      (masked as any)[fieldMappings.dob] = this.maskDOB(masked[fieldMappings.dob] as any);
    }
    if (fieldMappings.financialAccount && masked[fieldMappings.financialAccount]) {
      (masked as any)[fieldMappings.financialAccount] = this.maskFinancialAccount(
        masked[fieldMappings.financialAccount] as string
      );
    }

    return masked;
  }
}

export function createDataMasker(req: Request): DataMasker {
  const roleName = req.context?.role?.name || "customer";
  const config = complianceService.getMaskingConfig(roleName);
  return new DataMasker(config);
}

export function phiAccessMiddleware(resourceType: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    const originalJson = res.json.bind(res);

    res.json = function(body: any) {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const patientId = req.params.patientId || req.params.id || body?.id;
        
        if (patientId && req.context?.user?.id && req.context?.tenant?.id) {
          complianceService.logPHIAccessAsync({
            tenantId: req.context.tenant.id,
            userId: req.context.user.id,
            patientId,
            resourceType,
            resourceId: req.params.id,
            action: getActionFromMethod(req.method),
            accessReason: (req.headers["x-access-reason"] as PHIAccessReason) || "treatment",
            ipAddress: req.ip || undefined,
            userAgent: req.headers["user-agent"],
            responseTimeMs: Date.now() - startTime,
          });
        }
      }
      return originalJson(body);
    };

    next();
  };
}

function getActionFromMethod(method: string): PHIAccessEntry["action"] {
  switch (method.toUpperCase()) {
    case "GET": return "view";
    case "POST": return "create";
    case "PUT":
    case "PATCH": return "update";
    case "DELETE": return "delete";
    default: return "view";
  }
}

export function requireAccessReason() {
  return (req: Request, res: Response, next: NextFunction) => {
    const reason = req.headers["x-access-reason"];
    
    if (!reason) {
      return res.status(400).json({
        message: "Access reason required for PHI access",
        code: "ACCESS_REASON_REQUIRED",
        hint: "Provide X-Access-Reason header with one of: treatment, payment, operations, research, legal, patient_request, emergency",
      });
    }

    const validReasons: PHIAccessReason[] = [
      "treatment", "payment", "operations", "research", 
      "legal", "patient_request", "emergency"
    ];

    if (!validReasons.includes(reason as PHIAccessReason)) {
      return res.status(400).json({
        message: "Invalid access reason",
        code: "INVALID_ACCESS_REASON",
        validReasons,
      });
    }

    next();
  };
}

export function dataMaskingMiddleware(fieldMappings: {
  email?: string;
  phone?: string;
  ssn?: string;
  dob?: string;
  financialAccount?: string;
}) {
  return (req: Request, res: Response, next: NextFunction) => {
    const originalJson = res.json.bind(res);

    res.json = function(body: any) {
      if (res.statusCode >= 200 && res.statusCode < 300 && body) {
        const masker = createDataMasker(req);
        
        if (Array.isArray(body)) {
          body = body.map(item => masker.maskRecord(item, fieldMappings as any));
        } else if (typeof body === "object" && body !== null) {
          if (body.data && Array.isArray(body.data)) {
            body.data = body.data.map((item: any) => masker.maskRecord(item, fieldMappings as any));
          } else {
            body = masker.maskRecord(body, fieldMappings as any);
          }
        }
      }
      return originalJson(body);
    };

    next();
  };
}

export interface SecureConfig {
  key: string;
  value: string;
  isEncrypted: boolean;
  category: "general" | "security" | "integration" | "compliance";
  lastUpdatedBy?: string;
  lastUpdatedAt?: Date;
}

export class SecureConfigManager {
  private cache: Map<string, { value: string; timestamp: number }> = new Map();
  private cacheTTL = 5 * 60 * 1000;

  async get(tenantId: string, key: string): Promise<string | null> {
    const cacheKey = `${tenantId}:${key}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.value;
    }

    const envKey = `${tenantId.toUpperCase().replace(/-/g, "_")}_${key.toUpperCase()}`;
    const value = process.env[envKey] || process.env[key.toUpperCase()] || null;

    if (value) {
      this.cache.set(cacheKey, { value, timestamp: Date.now() });
    }

    return value;
  }

  async getRequired(tenantId: string, key: string): Promise<string> {
    const value = await this.get(tenantId, key);
    if (!value) {
      throw new Error(`Required configuration '${key}' not found for tenant ${tenantId}`);
    }
    return value;
  }

  async getWithDefault(tenantId: string, key: string, defaultValue: string): Promise<string> {
    const value = await this.get(tenantId, key);
    return value || defaultValue;
  }

  clearCache(tenantId?: string): void {
    if (tenantId) {
      const keysToDelete: string[] = [];
      this.cache.forEach((_, key) => {
        if (key.startsWith(`${tenantId}:`)) {
          keysToDelete.push(key);
        }
      });
      keysToDelete.forEach(key => this.cache.delete(key));
    } else {
      this.cache.clear();
    }
  }

  validateSecretStrength(secret: string): { valid: boolean; issues: string[] } {
    const issues: string[] = [];

    if (secret.length < 32) {
      issues.push("Secret should be at least 32 characters");
    }
    if (!/[A-Z]/.test(secret)) {
      issues.push("Secret should contain uppercase letters");
    }
    if (!/[a-z]/.test(secret)) {
      issues.push("Secret should contain lowercase letters");
    }
    if (!/[0-9]/.test(secret)) {
      issues.push("Secret should contain numbers");
    }
    if (!/[^A-Za-z0-9]/.test(secret)) {
      issues.push("Secret should contain special characters");
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  }
}

export interface ConsentRecord {
  patientId: string;
  tenantId: string;
  consentType: "treatment" | "data_sharing" | "research" | "marketing";
  status: "granted" | "revoked" | "expired";
  grantedAt: Date;
  expiresAt?: Date;
  revokedAt?: Date;
  documentPath?: string;
  witnessedBy?: string;
}

export class ConsentManager {
  async hasConsent(
    tenantId: string,
    patientId: string,
    consentType: ConsentRecord["consentType"]
  ): Promise<boolean> {
    return true;
  }

  async requireConsent(
    tenantId: string,
    patientId: string,
    consentType: ConsentRecord["consentType"]
  ): Promise<void> {
    const hasConsent = await this.hasConsent(tenantId, patientId, consentType);
    if (!hasConsent) {
      throw new ConsentRequiredError(consentType);
    }
  }
}

export class ConsentRequiredError extends Error {
  public consentType: string;
  public statusCode = 403;
  public code = "CONSENT_REQUIRED";

  constructor(consentType: string) {
    super(`Patient consent required for: ${consentType}`);
    this.consentType = consentType;
  }
}

export const RETENTION_POLICIES = {
  auditLogs: { days: 2190, action: "archive" as const },
  phiAccessLogs: { days: 2190, action: "archive" as const },
  financialRecords: { days: 2555, action: "archive" as const },
  patientRecords: { days: 3650, action: "archive" as const },
  sessionData: { days: 30, action: "delete" as const },
  tempFiles: { days: 7, action: "delete" as const },
};

export const complianceService = new ComplianceService();
export const secureConfigManager = new SecureConfigManager();
export const consentManager = new ConsentManager();
