import { db } from "../../db";
import {
  consentRecords,
  dsarRequests,
  dsarActivityLog,
  sensitiveDataAccessLogs,
  dataMaskingRules,
  tenantComplianceSettings,
  complianceConfigs,
  dataBreachRecords,
  dataRetentionPolicies,
  type ConsentRecord,
  type DsarRequest,
  type SensitiveDataAccessLog,
  type DataMaskingRule,
  type TenantComplianceSettings,
} from "@shared/schema";
import { eq, and, desc, gte, lte, sql, or, isNull } from "drizzle-orm";

export type DataCategory = "pii" | "phi" | "financial" | "biometric" | "location" | "authentication";
export type AccessReason = "customer_request" | "support_ticket" | "compliance_audit" | "legal_requirement" | "system_maintenance" | "debugging" | "authorized_investigation";
export type MaskingType = "full" | "partial" | "hash" | "redact" | "tokenize";

interface MaskingConfig {
  type: MaskingType;
  pattern?: string;
  preserveLength?: boolean;
}

interface AccessLogParams {
  tenantId?: string;
  accessorType: "user" | "admin" | "platform_admin" | "system";
  accessorId: string;
  accessorEmail?: string;
  accessorRole?: string;
  dataCategory: DataCategory;
  resourceType: string;
  resourceId: string;
  fieldsAccessed?: string[];
  accessType: "view" | "export" | "modify" | "delete";
  accessReason: AccessReason;
  reasonDetails?: string;
  ticketId?: string;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
}

class ComplianceService {
  private maskingRulesCache: Map<string, DataMaskingRule[]> = new Map();
  private cacheExpiry: number = 0;
  private cacheTTL: number = 5 * 60 * 1000; // 5 minutes

  // ============================================
  // DATA MASKING
  // ============================================

  async getMaskingRulesForRole(tenantId: string | null, roleName: string): Promise<DataMaskingRule[]> {
    const cacheKey = `${tenantId || "global"}-${roleName}`;
    
    if (Date.now() < this.cacheExpiry && this.maskingRulesCache.has(cacheKey)) {
      return this.maskingRulesCache.get(cacheKey) || [];
    }

    try {
      const rules = await db.select()
        .from(dataMaskingRules)
        .where(
          and(
            or(
              eq(dataMaskingRules.tenantId, tenantId || ""),
              isNull(dataMaskingRules.tenantId)
            ),
            or(
              eq(dataMaskingRules.roleName, roleName),
              isNull(dataMaskingRules.roleName)
            ),
            eq(dataMaskingRules.isEnabled, true)
          )
        )
        .orderBy(desc(dataMaskingRules.priority));

      this.maskingRulesCache.set(cacheKey, rules);
      this.cacheExpiry = Date.now() + this.cacheTTL;
      return rules;
    } catch {
      return [];
    }
  }

  maskValue(value: string | null | undefined, config: MaskingConfig): string {
    if (value === null || value === undefined) return "";

    switch (config.type) {
      case "full":
        return config.preserveLength ? "*".repeat(value.length) : "********";

      case "partial":
        if (config.pattern) {
          return config.pattern;
        }
        // Default partial masking: show first 2 and last 2 characters
        if (value.length <= 4) return "*".repeat(value.length);
        return value.slice(0, 2) + "*".repeat(value.length - 4) + value.slice(-2);

      case "hash":
        // Simple hash representation (in production, use proper hashing)
        return `[HASH:${value.slice(0, 4)}...]`;

      case "redact":
        return "[REDACTED]";

      case "tokenize":
        return `[TOKEN:${Math.random().toString(36).slice(2, 10)}]`;

      default:
        return "[MASKED]";
    }
  }

  maskEmail(email: string | null | undefined): string {
    if (!email) return "";
    const [local, domain] = email.split("@");
    if (!domain) return this.maskValue(email, { type: "partial" });
    
    const maskedLocal = local.length <= 2 
      ? "*".repeat(local.length)
      : local[0] + "*".repeat(local.length - 2) + local[local.length - 1];
    
    return `${maskedLocal}@${domain}`;
  }

  maskPhone(phone: string | null | undefined): string {
    if (!phone) return "";
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length < 4) return "*".repeat(cleaned.length);
    return "*".repeat(cleaned.length - 4) + cleaned.slice(-4);
  }

  maskPAN(pan: string | null | undefined): string {
    if (!pan) return "";
    if (pan.length !== 10) return this.maskValue(pan, { type: "partial" });
    return pan.slice(0, 2) + "****" + pan.slice(-2);
  }

  maskAadhaar(aadhaar: string | null | undefined): string {
    if (!aadhaar) return "";
    const cleaned = aadhaar.replace(/\D/g, "");
    if (cleaned.length !== 12) return this.maskValue(aadhaar, { type: "full" });
    return "XXXX-XXXX-" + cleaned.slice(-4);
  }

  maskCreditCard(card: string | null | undefined): string {
    if (!card) return "";
    const cleaned = card.replace(/\D/g, "");
    if (cleaned.length < 4) return "*".repeat(cleaned.length);
    return "**** **** **** " + cleaned.slice(-4);
  }

  async applyMasking<T extends Record<string, unknown>>(
    data: T,
    resourceType: string,
    roleName: string,
    tenantId?: string
  ): Promise<T> {
    const rules = await this.getMaskingRulesForRole(tenantId || null, roleName);
    const applicableRules = rules.filter(r => r.resourceType === resourceType);
    
    if (applicableRules.length === 0) return data;

    const masked = { ...data };
    
    for (const rule of applicableRules) {
      const fieldName = rule.fieldName as keyof T;
      if (fieldName in masked && masked[fieldName] !== undefined) {
        const value = String(masked[fieldName]);
        
        // Apply appropriate masking based on field type
        if (fieldName === "email" || String(fieldName).includes("email")) {
          (masked as Record<string, unknown>)[fieldName as string] = this.maskEmail(value);
        } else if (fieldName === "phone" || String(fieldName).includes("phone")) {
          (masked as Record<string, unknown>)[fieldName as string] = this.maskPhone(value);
        } else if (fieldName === "pan" || String(fieldName).includes("pan")) {
          (masked as Record<string, unknown>)[fieldName as string] = this.maskPAN(value);
        } else if (fieldName === "aadhaar" || String(fieldName).includes("aadhaar")) {
          (masked as Record<string, unknown>)[fieldName as string] = this.maskAadhaar(value);
        } else if (String(fieldName).includes("card")) {
          (masked as Record<string, unknown>)[fieldName as string] = this.maskCreditCard(value);
        } else {
          (masked as Record<string, unknown>)[fieldName as string] = this.maskValue(value, {
            type: (rule.maskingType as MaskingType) || "partial",
            pattern: rule.maskingPattern || undefined,
            preserveLength: rule.preserveLength ?? true,
          });
        }
      }
    }

    return masked;
  }

  // ============================================
  // SENSITIVE DATA ACCESS LOGGING
  // ============================================

  async logSensitiveAccess(params: AccessLogParams): Promise<string | null> {
    try {
      // Determine risk level based on data category and access type
      let riskLevel = "low";
      if (params.dataCategory === "phi" || params.dataCategory === "financial") {
        riskLevel = "medium";
      }
      if (params.accessType === "export" || params.accessType === "delete") {
        riskLevel = params.dataCategory === "phi" ? "high" : "medium";
      }
      if (params.accessorType === "platform_admin" && params.dataCategory === "phi") {
        riskLevel = "high";
      }

      const [log] = await db.insert(sensitiveDataAccessLogs).values({
        tenantId: params.tenantId,
        accessorType: params.accessorType,
        accessorId: params.accessorId,
        accessorEmail: params.accessorEmail,
        accessorRole: params.accessorRole,
        dataCategory: params.dataCategory,
        resourceType: params.resourceType,
        resourceId: params.resourceId,
        fieldsAccessed: params.fieldsAccessed || [],
        accessType: params.accessType,
        accessReason: params.accessReason,
        reasonDetails: params.reasonDetails,
        ticketId: params.ticketId,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        sessionId: params.sessionId,
        riskLevel,
        wasDataMasked: false,
      }).returning();

      return log?.id || null;
    } catch (error) {
      console.error("Failed to log sensitive data access:", error);
      return null;
    }
  }

  async getAccessLogs(params: {
    tenantId?: string;
    accessorId?: string;
    resourceType?: string;
    resourceId?: string;
    dataCategory?: DataCategory;
    riskLevel?: string;
    flagged?: boolean;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }): Promise<{ logs: SensitiveDataAccessLog[]; total: number }> {
    try {
      const conditions = [];
      
      if (params.tenantId) conditions.push(eq(sensitiveDataAccessLogs.tenantId, params.tenantId));
      if (params.accessorId) conditions.push(eq(sensitiveDataAccessLogs.accessorId, params.accessorId));
      if (params.resourceType) conditions.push(eq(sensitiveDataAccessLogs.resourceType, params.resourceType));
      if (params.resourceId) conditions.push(eq(sensitiveDataAccessLogs.resourceId, params.resourceId));
      if (params.dataCategory) conditions.push(eq(sensitiveDataAccessLogs.dataCategory, params.dataCategory));
      if (params.riskLevel) conditions.push(eq(sensitiveDataAccessLogs.riskLevel, params.riskLevel));
      if (params.flagged !== undefined) conditions.push(eq(sensitiveDataAccessLogs.flagged, params.flagged));
      if (params.startDate) conditions.push(gte(sensitiveDataAccessLogs.createdAt, params.startDate));
      if (params.endDate) conditions.push(lte(sensitiveDataAccessLogs.createdAt, params.endDate));

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const [countResult] = await db.select({ count: sql<number>`count(*)` })
        .from(sensitiveDataAccessLogs)
        .where(whereClause);

      const logs = await db.select()
        .from(sensitiveDataAccessLogs)
        .where(whereClause)
        .orderBy(desc(sensitiveDataAccessLogs.createdAt))
        .limit(params.limit || 50)
        .offset(params.offset || 0);

      return { logs, total: Number(countResult?.count || 0) };
    } catch {
      return { logs: [], total: 0 };
    }
  }

  async flagAccessLog(logId: string, reason: string, reviewerId: string): Promise<boolean> {
    try {
      await db.update(sensitiveDataAccessLogs)
        .set({
          flagged: true,
          flagReason: reason,
          reviewedBy: reviewerId,
          reviewedAt: new Date(),
        })
        .where(eq(sensitiveDataAccessLogs.id, logId));
      return true;
    } catch {
      return false;
    }
  }

  // ============================================
  // CONSENT MANAGEMENT
  // ============================================

  async recordConsent(params: {
    tenantId: string;
    subjectType: string;
    subjectId: string;
    subjectEmail?: string;
    consentType: "marketing" | "data_processing" | "data_sharing" | "profiling" | "cross_border_transfer" | "health_data" | "biometric" | "location_tracking";
    purpose: string;
    legalBasis?: string;
    consentText?: string;
    version?: string;
    expiresAt?: Date;
    collectionMethod?: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<ConsentRecord | null> {
    try {
      // Check for existing consent and withdraw it
      await db.update(consentRecords)
        .set({
          status: "withdrawn",
          withdrawnAt: new Date(),
          withdrawalReason: "Superseded by new consent",
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(consentRecords.tenantId, params.tenantId),
            eq(consentRecords.subjectType, params.subjectType),
            eq(consentRecords.subjectId, params.subjectId),
            eq(consentRecords.consentType, params.consentType),
            eq(consentRecords.status, "granted")
          )
        );

      const [record] = await db.insert(consentRecords).values({
        tenantId: params.tenantId,
        subjectType: params.subjectType,
        subjectId: params.subjectId,
        subjectEmail: params.subjectEmail,
        consentType: params.consentType,
        status: "granted",
        purpose: params.purpose,
        legalBasis: params.legalBasis,
        consentText: params.consentText,
        version: params.version,
        expiresAt: params.expiresAt,
        collectionMethod: params.collectionMethod,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      }).returning();

      return record || null;
    } catch (error) {
      console.error("Failed to record consent:", error);
      return null;
    }
  }

  async withdrawConsent(
    tenantId: string,
    subjectType: string,
    subjectId: string,
    consentType: string,
    reason?: string
  ): Promise<boolean> {
    try {
      await db.update(consentRecords)
        .set({
          status: "withdrawn",
          withdrawnAt: new Date(),
          withdrawalReason: reason,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(consentRecords.tenantId, tenantId),
            eq(consentRecords.subjectType, subjectType),
            eq(consentRecords.subjectId, subjectId),
            eq(consentRecords.consentType, consentType as "marketing" | "data_processing" | "data_sharing" | "profiling" | "cross_border_transfer" | "health_data" | "biometric" | "location_tracking"),
            eq(consentRecords.status, "granted")
          )
        );
      return true;
    } catch {
      return false;
    }
  }

  async checkConsent(
    tenantId: string,
    subjectType: string,
    subjectId: string,
    consentType: string
  ): Promise<{ hasConsent: boolean; record: ConsentRecord | null }> {
    try {
      const [record] = await db.select()
        .from(consentRecords)
        .where(
          and(
            eq(consentRecords.tenantId, tenantId),
            eq(consentRecords.subjectType, subjectType),
            eq(consentRecords.subjectId, subjectId),
            eq(consentRecords.consentType, consentType as "marketing" | "data_processing" | "data_sharing" | "profiling" | "cross_border_transfer" | "health_data" | "biometric" | "location_tracking"),
            eq(consentRecords.status, "granted"),
            or(
              isNull(consentRecords.expiresAt),
              gte(consentRecords.expiresAt, new Date())
            )
          )
        )
        .orderBy(desc(consentRecords.grantedAt))
        .limit(1);

      return { hasConsent: !!record, record: record || null };
    } catch {
      return { hasConsent: false, record: null };
    }
  }

  async getSubjectConsents(
    tenantId: string,
    subjectType: string,
    subjectId: string
  ): Promise<ConsentRecord[]> {
    try {
      return await db.select()
        .from(consentRecords)
        .where(
          and(
            eq(consentRecords.tenantId, tenantId),
            eq(consentRecords.subjectType, subjectType),
            eq(consentRecords.subjectId, subjectId)
          )
        )
        .orderBy(desc(consentRecords.grantedAt));
    } catch {
      return [];
    }
  }

  // ============================================
  // DSAR (Data Subject Access Request) MANAGEMENT
  // ============================================

  async createDSAR(params: {
    tenantId: string;
    requestType: "access" | "rectification" | "erasure" | "portability" | "restriction" | "objection";
    subjectEmail: string;
    subjectName?: string;
    subjectPhone?: string;
    subjectIdType?: string;
    subjectIdNumber?: string;
    requestDetails?: string;
    dataCategories?: string[];
    ipAddress?: string;
    regulation?: "gdpr" | "pdpa_sg" | "pdpa_my" | "dpdp" | "uae_dpl";
  }): Promise<DsarRequest | null> {
    try {
      // Calculate response deadline based on regulation (default 30 days for GDPR)
      const deadlineDays = params.regulation === "gdpr" ? 30 : 30;
      const responseDeadline = new Date();
      responseDeadline.setDate(responseDeadline.getDate() + deadlineDays);

      const [request] = await db.insert(dsarRequests).values({
        tenantId: params.tenantId,
        requestType: params.requestType,
        subjectEmail: params.subjectEmail,
        subjectName: params.subjectName,
        subjectPhone: params.subjectPhone,
        subjectIdType: params.subjectIdType,
        subjectIdNumber: params.subjectIdNumber,
        requestDetails: params.requestDetails,
        dataCategories: params.dataCategories || [],
        responseDeadline,
        ipAddress: params.ipAddress,
        regulation: params.regulation,
        status: "submitted",
      }).returning();

      if (request) {
        await db.insert(dsarActivityLog).values({
          dsarId: request.id,
          action: "DSAR_CREATED",
          newStatus: "submitted",
          notes: `${params.requestType} request submitted by ${params.subjectEmail}`,
        });
      }

      return request || null;
    } catch (error) {
      console.error("Failed to create DSAR:", error);
      return null;
    }
  }

  async updateDSARStatus(
    dsarId: string,
    newStatus: "submitted" | "acknowledged" | "in_progress" | "pending_verification" | "completed" | "rejected" | "expired",
    performedBy: string,
    performedByEmail: string,
    notes?: string
  ): Promise<boolean> {
    try {
      const [existing] = await db.select()
        .from(dsarRequests)
        .where(eq(dsarRequests.id, dsarId))
        .limit(1);

      if (!existing) return false;

      const updateData: Record<string, unknown> = {
        status: newStatus,
        updatedAt: new Date(),
      };

      if (newStatus === "acknowledged") {
        updateData.acknowledgedAt = new Date();
      } else if (newStatus === "completed") {
        updateData.completedAt = new Date();
      }

      await db.update(dsarRequests)
        .set(updateData)
        .where(eq(dsarRequests.id, dsarId));

      await db.insert(dsarActivityLog).values({
        dsarId,
        action: `STATUS_CHANGED_TO_${newStatus.toUpperCase()}`,
        previousStatus: existing.status,
        newStatus,
        performedBy,
        performedByEmail,
        notes,
      });

      return true;
    } catch {
      return false;
    }
  }

  async getDSARs(params: {
    tenantId?: string;
    status?: string;
    subjectEmail?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }): Promise<{ requests: DsarRequest[]; total: number }> {
    try {
      const conditions = [];
      
      if (params.tenantId) conditions.push(eq(dsarRequests.tenantId, params.tenantId));
      if (params.status) conditions.push(eq(dsarRequests.status, params.status as "submitted" | "acknowledged" | "in_progress" | "pending_verification" | "completed" | "rejected" | "expired"));
      if (params.subjectEmail) conditions.push(eq(dsarRequests.subjectEmail, params.subjectEmail));
      if (params.startDate) conditions.push(gte(dsarRequests.createdAt, params.startDate));
      if (params.endDate) conditions.push(lte(dsarRequests.createdAt, params.endDate));

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const [countResult] = await db.select({ count: sql<number>`count(*)` })
        .from(dsarRequests)
        .where(whereClause);

      const requests = await db.select()
        .from(dsarRequests)
        .where(whereClause)
        .orderBy(desc(dsarRequests.createdAt))
        .limit(params.limit || 50)
        .offset(params.offset || 0);

      return { requests, total: Number(countResult?.count || 0) };
    } catch {
      return { requests: [], total: 0 };
    }
  }

  async getDSARActivityLog(dsarId: string): Promise<unknown[]> {
    try {
      return await db.select()
        .from(dsarActivityLog)
        .where(eq(dsarActivityLog.dsarId, dsarId))
        .orderBy(desc(dsarActivityLog.createdAt));
    } catch {
      return [];
    }
  }

  // ============================================
  // COMPLIANCE SETTINGS
  // ============================================

  async getTenantComplianceSettings(tenantId: string): Promise<TenantComplianceSettings | null> {
    try {
      const [settings] = await db.select()
        .from(tenantComplianceSettings)
        .where(eq(tenantComplianceSettings.tenantId, tenantId))
        .limit(1);
      return settings || null;
    } catch {
      return null;
    }
  }

  async updateTenantComplianceSettings(
    tenantId: string,
    settings: Partial<Omit<TenantComplianceSettings, "id" | "tenantId" | "createdAt" | "updatedAt">>
  ): Promise<boolean> {
    try {
      const existing = await this.getTenantComplianceSettings(tenantId);
      
      if (existing) {
        await db.update(tenantComplianceSettings)
          .set({ ...settings, updatedAt: new Date() })
          .where(eq(tenantComplianceSettings.tenantId, tenantId));
      } else {
        await db.insert(tenantComplianceSettings).values({
          tenantId,
          primaryRegulation: settings.primaryRegulation || "gdpr",
          ...settings,
        });
      }
      return true;
    } catch {
      return false;
    }
  }

  async getComplianceConfig(regulation: "gdpr" | "pdpa_sg" | "pdpa_my" | "dpdp" | "uae_dpl"): Promise<unknown | null> {
    try {
      const [config] = await db.select()
        .from(complianceConfigs)
        .where(eq(complianceConfigs.regulation, regulation))
        .limit(1);
      return config || null;
    } catch {
      return null;
    }
  }

  async getAllComplianceConfigs(): Promise<unknown[]> {
    try {
      return await db.select()
        .from(complianceConfigs)
        .where(eq(complianceConfigs.isActive, true));
    } catch {
      return [];
    }
  }

  // ============================================
  // DATA BREACH MANAGEMENT
  // ============================================

  async reportDataBreach(params: {
    tenantId?: string;
    breachType: string;
    severity: string;
    regulation?: "gdpr" | "pdpa_sg" | "pdpa_my" | "dpdp" | "uae_dpl";
    discoveredAt: Date;
    occurredAt?: Date;
    affectedDataCategories?: string[];
    affectedSubjectsCount?: number;
    description?: string;
    impactAssessment?: string;
    containmentActions?: string;
  }): Promise<string | null> {
    try {
      // Calculate report deadline (typically 72 hours for GDPR)
      const deadlineHours = 72;
      const reportDeadline = new Date(params.discoveredAt);
      reportDeadline.setHours(reportDeadline.getHours() + deadlineHours);

      const [breach] = await db.insert(dataBreachRecords).values({
        tenantId: params.tenantId,
        breachType: params.breachType,
        severity: params.severity,
        regulation: params.regulation,
        discoveredAt: params.discoveredAt,
        occurredAt: params.occurredAt,
        reportDeadline,
        affectedDataCategories: params.affectedDataCategories || [],
        affectedSubjectsCount: params.affectedSubjectsCount,
        description: params.description,
        impactAssessment: params.impactAssessment,
        containmentActions: params.containmentActions,
        status: "investigating",
      }).returning();

      return breach?.id || null;
    } catch (error) {
      console.error("Failed to report data breach:", error);
      return null;
    }
  }

  // ============================================
  // UNUSUAL ACCESS DETECTION
  // ============================================

  async detectUnusualAccess(accessorId: string, tenantId?: string): Promise<{
    isUnusual: boolean;
    reasons: string[];
    riskScore: number;
  }> {
    try {
      const now = new Date();
      const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // Get access counts in the last hour and day
      const conditions = [
        eq(sensitiveDataAccessLogs.accessorId, accessorId),
      ];
      if (tenantId) conditions.push(eq(sensitiveDataAccessLogs.tenantId, tenantId));

      const [hourCount] = await db.select({ count: sql<number>`count(*)` })
        .from(sensitiveDataAccessLogs)
        .where(and(...conditions, gte(sensitiveDataAccessLogs.createdAt, hourAgo)));

      const [dayCount] = await db.select({ count: sql<number>`count(*)` })
        .from(sensitiveDataAccessLogs)
        .where(and(...conditions, gte(sensitiveDataAccessLogs.createdAt, dayAgo)));

      const [phiCount] = await db.select({ count: sql<number>`count(*)` })
        .from(sensitiveDataAccessLogs)
        .where(and(
          ...conditions,
          eq(sensitiveDataAccessLogs.dataCategory, "phi"),
          gte(sensitiveDataAccessLogs.createdAt, hourAgo)
        ));

      const reasons: string[] = [];
      let riskScore = 0;

      // Check for unusual patterns
      if (Number(hourCount?.count || 0) > 50) {
        reasons.push("High volume of access in the last hour");
        riskScore += 30;
      }
      if (Number(dayCount?.count || 0) > 200) {
        reasons.push("High volume of access in the last 24 hours");
        riskScore += 20;
      }
      if (Number(phiCount?.count || 0) > 10) {
        reasons.push("Multiple PHI accesses in short period");
        riskScore += 40;
      }

      return {
        isUnusual: reasons.length > 0,
        reasons,
        riskScore: Math.min(riskScore, 100),
      };
    } catch {
      return { isUnusual: false, reasons: [], riskScore: 0 };
    }
  }
}

export const complianceService = new ComplianceService();
