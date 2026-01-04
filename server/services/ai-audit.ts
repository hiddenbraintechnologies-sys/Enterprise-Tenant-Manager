import { db } from "../db";
import { aiAuditLogs, type AiAuditAction, type InsertAiAuditLog } from "@shared/schema";
import { eq, and, desc, gte, lte, sql } from "drizzle-orm";

interface InputMetadata {
  inputType?: string;
  inputLength?: number;
  inputTokenCount?: number;
  modelRequested?: string;
  contextType?: string;
  hasAttachments?: boolean;
  requestSource?: string;
}

interface OutputReference {
  outputType?: string;
  outputLength?: number;
  outputTokenCount?: number;
  modelUsed?: string;
  processingTimeMs?: number;
  cached?: boolean;
  storageKey?: string;
}

interface AuditLogParams {
  tenantId: string;
  userId: string;
  roleId?: string;
  featureCode: string;
  action: AiAuditAction;
  inputMetadata?: InputMetadata;
  outputReference?: OutputReference;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  errorCode?: string;
  errorCategory?: string;
  consentRecorded?: boolean;
  dataRetentionDays?: number;
  complianceFlags?: string[];
}

interface AuditQueryParams {
  tenantId: string;
  userId?: string;
  featureCode?: string;
  action?: AiAuditAction;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

const SENSITIVE_PATTERNS = [
  /\b\d{16}\b/g,
  /\b\d{3,4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
  /\b[A-Z]{5}\d{4}[A-Z]\b/gi,
  /\b\d{9,12}\b/g,
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  /\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
  /\bpassword\s*[:=]\s*\S+/gi,
  /\bapi[_-]?key\s*[:=]\s*\S+/gi,
  /\bsecret\s*[:=]\s*\S+/gi,
  /\btoken\s*[:=]\s*\S+/gi,
];

function sanitizeString(input: string | undefined | null): string | undefined {
  if (!input) return undefined;
  
  let sanitized = input;
  for (const pattern of SENSITIVE_PATTERNS) {
    sanitized = sanitized.replace(pattern, "[REDACTED]");
  }
  return sanitized;
}

function sanitizeMetadata<T extends Record<string, any>>(metadata: T | undefined): T | undefined {
  if (!metadata) return undefined;
  
  const sanitized: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(metadata)) {
    const lowerKey = key.toLowerCase();
    if (
      lowerKey.includes("password") ||
      lowerKey.includes("secret") ||
      lowerKey.includes("token") ||
      lowerKey.includes("key") ||
      lowerKey.includes("credential") ||
      lowerKey.includes("auth")
    ) {
      sanitized[key] = "[REDACTED]";
    } else if (typeof value === "string") {
      sanitized[key] = sanitizeString(value);
    } else if (typeof value === "object" && value !== null) {
      sanitized[key] = sanitizeMetadata(value);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized as T;
}

class AiAuditService {
  async logInvocation(params: AuditLogParams): Promise<string> {
    const sanitizedInput = params.inputMetadata 
      ? sanitizeMetadata<InputMetadata>(params.inputMetadata)
      : undefined;
    const sanitizedOutput = params.outputReference 
      ? sanitizeMetadata<OutputReference>(params.outputReference)
      : undefined;
    const sanitizedUserAgent = sanitizeString(params.userAgent);

    const [result] = await db.insert(aiAuditLogs).values([{
      tenantId: params.tenantId,
      userId: params.userId,
      roleId: params.roleId ?? null,
      featureCode: params.featureCode,
      action: params.action,
      inputMetadata: sanitizedInput ?? null,
      outputReference: sanitizedOutput ?? null,
      ipAddress: params.ipAddress ?? null,
      userAgent: sanitizedUserAgent ?? null,
      sessionId: params.sessionId ?? null,
      errorCode: params.errorCode ?? null,
      errorCategory: params.errorCategory ?? null,
      consentRecorded: params.consentRecorded ?? false,
      dataRetentionDays: params.dataRetentionDays ?? 90,
      complianceFlags: params.complianceFlags ?? null,
      triggeredAt: new Date(),
      completedAt: params.action === "complete" || params.action === "error" ? new Date() : null,
    }]).returning({ id: aiAuditLogs.id });
    return result.id;
  }

  async completeLog(
    logId: string,
    outputReference: OutputReference,
    errorCode?: string,
    errorCategory?: string
  ): Promise<void> {
    const sanitizedOutput = sanitizeMetadata<OutputReference>(outputReference);
    
    await db
      .update(aiAuditLogs)
      .set({
        action: errorCode ? "error" : "complete",
        outputReference: sanitizedOutput ?? null,
        errorCode: errorCode ?? null,
        errorCategory: errorCategory ?? null,
        completedAt: new Date(),
      })
      .where(eq(aiAuditLogs.id, logId));
  }

  async queryLogs(params: AuditQueryParams) {
    const conditions = [eq(aiAuditLogs.tenantId, params.tenantId)];

    if (params.userId) {
      conditions.push(eq(aiAuditLogs.userId, params.userId));
    }
    if (params.featureCode) {
      conditions.push(eq(aiAuditLogs.featureCode, params.featureCode));
    }
    if (params.action) {
      conditions.push(eq(aiAuditLogs.action, params.action));
    }
    if (params.startDate) {
      conditions.push(gte(aiAuditLogs.triggeredAt, params.startDate));
    }
    if (params.endDate) {
      conditions.push(lte(aiAuditLogs.triggeredAt, params.endDate));
    }

    const limit = params.limit ?? 50;
    const offset = params.offset ?? 0;

    const logs = await db
      .select()
      .from(aiAuditLogs)
      .where(and(...conditions))
      .orderBy(desc(aiAuditLogs.triggeredAt))
      .limit(limit)
      .offset(offset);

    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(aiAuditLogs)
      .where(and(...conditions));

    return {
      logs,
      total: countResult?.count ?? 0,
      limit,
      offset,
    };
  }

  async getLogById(tenantId: string, logId: string) {
    const [log] = await db
      .select()
      .from(aiAuditLogs)
      .where(and(eq(aiAuditLogs.id, logId), eq(aiAuditLogs.tenantId, tenantId)));

    return log;
  }

  async getAuditSummary(tenantId: string, startDate?: Date, endDate?: Date) {
    const conditions = [eq(aiAuditLogs.tenantId, tenantId)];
    
    if (startDate) {
      conditions.push(gte(aiAuditLogs.triggeredAt, startDate));
    }
    if (endDate) {
      conditions.push(lte(aiAuditLogs.triggeredAt, endDate));
    }

    const summary = await db
      .select({
        featureCode: aiAuditLogs.featureCode,
        action: aiAuditLogs.action,
        count: sql<number>`count(*)::int`,
      })
      .from(aiAuditLogs)
      .where(and(...conditions))
      .groupBy(aiAuditLogs.featureCode, aiAuditLogs.action);

    const userActivity = await db
      .select({
        userId: aiAuditLogs.userId,
        count: sql<number>`count(*)::int`,
      })
      .from(aiAuditLogs)
      .where(and(...conditions))
      .groupBy(aiAuditLogs.userId)
      .orderBy(desc(sql`count(*)`))
      .limit(10);

    return {
      byFeatureAndAction: summary,
      topUsers: userActivity,
    };
  }

  async purgeExpiredLogs(): Promise<number> {
    const result = await db
      .delete(aiAuditLogs)
      .where(
        sql`${aiAuditLogs.triggeredAt} < NOW() - (${aiAuditLogs.dataRetentionDays} || ' days')::interval`
      );

    return result.rowCount ?? 0;
  }

  async exportLogsForCompliance(
    tenantId: string,
    startDate: Date,
    endDate: Date
  ) {
    const logs = await db
      .select({
        id: aiAuditLogs.id,
        userId: aiAuditLogs.userId,
        roleId: aiAuditLogs.roleId,
        featureCode: aiAuditLogs.featureCode,
        action: aiAuditLogs.action,
        inputMetadata: aiAuditLogs.inputMetadata,
        outputReference: aiAuditLogs.outputReference,
        ipAddress: aiAuditLogs.ipAddress,
        userAgent: aiAuditLogs.userAgent,
        sessionId: aiAuditLogs.sessionId,
        errorCode: aiAuditLogs.errorCode,
        errorCategory: aiAuditLogs.errorCategory,
        consentRecorded: aiAuditLogs.consentRecorded,
        dataRetentionDays: aiAuditLogs.dataRetentionDays,
        complianceFlags: aiAuditLogs.complianceFlags,
        triggeredAt: aiAuditLogs.triggeredAt,
        completedAt: aiAuditLogs.completedAt,
      })
      .from(aiAuditLogs)
      .where(
        and(
          eq(aiAuditLogs.tenantId, tenantId),
          gte(aiAuditLogs.triggeredAt, startDate),
          lte(aiAuditLogs.triggeredAt, endDate)
        )
      )
      .orderBy(aiAuditLogs.triggeredAt);

    return {
      exportedAt: new Date().toISOString(),
      tenantId,
      dateRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
      recordCount: logs.length,
      logs,
    };
  }
}

export const aiAuditService = new AiAuditService();
