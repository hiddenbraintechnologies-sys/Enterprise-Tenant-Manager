import { db } from "../db";
import { 
  auditLogs, users, tenants,
  type AuditLog, type InsertAuditLog
} from "@shared/schema";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";

export type AuditAction = "create" | "update" | "delete" | "login" | "logout" | "access";

export interface AuditLogEntry {
  tenantId?: string | null;
  userId?: string | null;
  action: AuditAction;
  resource: string;
  resourceId?: string | null;
  oldValue?: Record<string, any> | null;
  newValue?: Record<string, any> | null;
  metadata?: Record<string, any>;
  ipAddress?: string | null;
  userAgent?: string | null;
  correlationId?: string | null;
}

export class AuditService {
  async log(entry: AuditLogEntry): Promise<AuditLog> {
    const [created] = await db.insert(auditLogs).values({
      tenantId: entry.tenantId,
      userId: entry.userId,
      action: entry.action,
      resource: entry.resource,
      resourceId: entry.resourceId,
      oldValue: entry.oldValue,
      newValue: entry.newValue,
      metadata: entry.metadata || {},
      ipAddress: entry.ipAddress,
      userAgent: entry.userAgent,
      correlationId: entry.correlationId,
    }).returning();
    return created;
  }

  async logAsync(entry: AuditLogEntry): Promise<void> {
    setImmediate(async () => {
      try {
        await this.log(entry);
      } catch (error) {
        console.error("Failed to log audit entry:", error);
      }
    });
  }

  async getAuditLogs(options: {
    tenantId?: string;
    userId?: string;
    resource?: string;
    resourceId?: string;
    action?: AuditAction;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }): Promise<{ logs: AuditLog[]; total: number }> {
    const conditions = [];

    if (options.tenantId) {
      conditions.push(eq(auditLogs.tenantId, options.tenantId));
    }
    if (options.userId) {
      conditions.push(eq(auditLogs.userId, options.userId));
    }
    if (options.resource) {
      conditions.push(eq(auditLogs.resource, options.resource));
    }
    if (options.resourceId) {
      conditions.push(eq(auditLogs.resourceId, options.resourceId));
    }
    if (options.action) {
      conditions.push(eq(auditLogs.action, options.action));
    }
    if (options.startDate) {
      conditions.push(gte(auditLogs.createdAt, options.startDate));
    }
    if (options.endDate) {
      conditions.push(lte(auditLogs.createdAt, options.endDate));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [countResult] = await db.select({ count: sql<number>`count(*)` })
      .from(auditLogs)
      .where(whereClause);

    const logs = await db.select()
      .from(auditLogs)
      .where(whereClause)
      .orderBy(desc(auditLogs.createdAt))
      .limit(options.limit || 50)
      .offset(options.offset || 0);

    return {
      logs,
      total: Number(countResult?.count || 0),
    };
  }

  async getAuditLogsWithUsers(options: {
    tenantId?: string;
    limit?: number;
    offset?: number;
  }): Promise<{
    logs: (AuditLog & { user: { id: string; email: string | null; firstName: string | null; lastName: string | null } | null })[];
    total: number;
  }> {
    const conditions = [];

    if (options.tenantId) {
      conditions.push(eq(auditLogs.tenantId, options.tenantId));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [countResult] = await db.select({ count: sql<number>`count(*)` })
      .from(auditLogs)
      .where(whereClause);

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
    .where(whereClause)
    .orderBy(desc(auditLogs.createdAt))
    .limit(options.limit || 50)
    .offset(options.offset || 0);

    return {
      logs: results.map(r => ({
        ...r.log,
        user: r.user,
      })),
      total: Number(countResult?.count || 0),
    };
  }

  async getResourceHistory(resource: string, resourceId: string): Promise<AuditLog[]> {
    return db.select()
      .from(auditLogs)
      .where(and(
        eq(auditLogs.resource, resource),
        eq(auditLogs.resourceId, resourceId)
      ))
      .orderBy(desc(auditLogs.createdAt));
  }

  async getUserActivity(userId: string, limit = 50): Promise<AuditLog[]> {
    return db.select()
      .from(auditLogs)
      .where(eq(auditLogs.userId, userId))
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit);
  }

  async getTenantActivity(tenantId: string, limit = 50): Promise<AuditLog[]> {
    return db.select()
      .from(auditLogs)
      .where(eq(auditLogs.tenantId, tenantId))
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit);
  }

  async getRecentLogins(tenantId?: string, limit = 20): Promise<AuditLog[]> {
    const conditions = [eq(auditLogs.action, "login")];
    if (tenantId) {
      conditions.push(eq(auditLogs.tenantId, tenantId));
    }

    return db.select()
      .from(auditLogs)
      .where(and(...conditions))
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit);
  }

  logFromRequest(action: string, req: any, resource?: string): void {
    const tenantId = req.context?.tenant?.id || req.headers?.["x-tenant-id"];
    const userId = req.context?.user?.id;
    
    setImmediate(async () => {
      try {
        await this.log({
          tenantId,
          userId,
          action: action as AuditAction,
          resource: resource || action,
          ipAddress: req.ip,
          userAgent: req.headers?.["user-agent"],
        });
      } catch (error) {
        console.error("Failed to log audit entry:", error);
      }
    });
  }
}

export const auditService = new AuditService();
