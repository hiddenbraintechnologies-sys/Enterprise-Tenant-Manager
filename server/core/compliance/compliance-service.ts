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
  compliancePacks,
  complianceChecklistItems,
  tenantCompliancePacks,
  tenantComplianceProgress,
  type ConsentRecord,
  type DsarRequest,
  type SensitiveDataAccessLog,
  type DataMaskingRule,
  type TenantComplianceSettings,
  type CompliancePack,
  type ComplianceChecklistItem,
  type TenantCompliancePack,
  type TenantComplianceProgress,
  type InsertCompliancePack,
  type InsertComplianceChecklistItem,
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

export class ComplianceService {
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

  // ============================================
  // COMPLIANCE PACKS & CHECKLISTS
  // ============================================

  async getAvailablePacks(
    regulation?: string,
    country?: string,
    businessType?: string
  ): Promise<CompliancePack[]> {
    try {
      const packs = await db.select()
        .from(compliancePacks)
        .where(eq(compliancePacks.isActive, true))
        .orderBy(desc(compliancePacks.createdAt));

      return packs.filter((pack) => {
        if (regulation && pack.regulation !== regulation) return false;
        if (country) {
          const countries = pack.applicableCountries as string[];
          if (countries.length > 0 && !countries.includes(country)) return false;
        }
        if (businessType) {
          const types = pack.applicableBusinessTypes as string[];
          if (types.length > 0 && !types.includes(businessType)) return false;
        }
        return true;
      });
    } catch {
      return [];
    }
  }

  async getPackById(packId: string): Promise<CompliancePack | null> {
    try {
      const [pack] = await db
        .select()
        .from(compliancePacks)
        .where(eq(compliancePacks.id, packId))
        .limit(1);
      return pack || null;
    } catch {
      return null;
    }
  }

  async getPackByCode(code: string): Promise<CompliancePack | null> {
    try {
      const [pack] = await db
        .select()
        .from(compliancePacks)
        .where(eq(compliancePacks.code, code))
        .limit(1);
      return pack || null;
    } catch {
      return null;
    }
  }

  async createPack(data: InsertCompliancePack): Promise<CompliancePack | null> {
    try {
      const [pack] = await db.insert(compliancePacks).values(data).returning();
      return pack || null;
    } catch (error) {
      console.error("Failed to create compliance pack:", error);
      return null;
    }
  }

  async updatePack(packId: string, data: Partial<InsertCompliancePack>): Promise<CompliancePack | null> {
    try {
      const [updated] = await db
        .update(compliancePacks)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(compliancePacks.id, packId))
        .returning();
      return updated || null;
    } catch {
      return null;
    }
  }

  async deletePack(packId: string): Promise<boolean> {
    try {
      await db.delete(compliancePacks).where(eq(compliancePacks.id, packId));
      return true;
    } catch {
      return false;
    }
  }

  async getChecklistItems(packId: string): Promise<ComplianceChecklistItem[]> {
    try {
      return await db
        .select()
        .from(complianceChecklistItems)
        .where(eq(complianceChecklistItems.packId, packId))
        .orderBy(complianceChecklistItems.sortOrder);
    } catch {
      return [];
    }
  }

  async createChecklistItem(data: InsertComplianceChecklistItem): Promise<ComplianceChecklistItem | null> {
    try {
      const [item] = await db.insert(complianceChecklistItems).values(data).returning();

      await db
        .update(compliancePacks)
        .set({
          totalItems: sql`${compliancePacks.totalItems} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(compliancePacks.id, data.packId));

      return item || null;
    } catch (error) {
      console.error("Failed to create checklist item:", error);
      return null;
    }
  }

  async updateChecklistItem(
    itemId: string,
    data: Partial<InsertComplianceChecklistItem>
  ): Promise<ComplianceChecklistItem | null> {
    try {
      const [updated] = await db
        .update(complianceChecklistItems)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(complianceChecklistItems.id, itemId))
        .returning();
      return updated || null;
    } catch {
      return null;
    }
  }

  async deleteChecklistItem(itemId: string): Promise<boolean> {
    try {
      const [item] = await db
        .select()
        .from(complianceChecklistItems)
        .where(eq(complianceChecklistItems.id, itemId))
        .limit(1);

      if (item) {
        await db.delete(complianceChecklistItems).where(eq(complianceChecklistItems.id, itemId));
        await db
          .update(compliancePacks)
          .set({
            totalItems: sql`GREATEST(${compliancePacks.totalItems} - 1, 0)`,
            updatedAt: new Date(),
          })
          .where(eq(compliancePacks.id, item.packId));
      }
      return true;
    } catch {
      return false;
    }
  }

  async assignPackToTenant(
    tenantId: string,
    packId: string,
    assignedBy: string,
    dueDate?: Date
  ): Promise<TenantCompliancePack | null> {
    try {
      const existing = await db
        .select()
        .from(tenantCompliancePacks)
        .where(
          and(eq(tenantCompliancePacks.tenantId, tenantId), eq(tenantCompliancePacks.packId, packId))
        )
        .limit(1);

      if (existing.length > 0) {
        throw new Error("Pack already assigned to this tenant");
      }

      const [assignment] = await db
        .insert(tenantCompliancePacks)
        .values({
          tenantId,
          packId,
          assignedBy,
          dueDate,
          status: "active",
        })
        .returning();

      const items = await this.getChecklistItems(packId);
      if (items.length > 0) {
        await db.insert(tenantComplianceProgress).values(
          items.map((item) => ({
            tenantId,
            packId,
            itemId: item.id,
            status: "not_started" as const,
            dueDate: item.dueDays && dueDate
              ? new Date(dueDate.getTime() - (item.dueDays * 24 * 60 * 60 * 1000))
              : dueDate,
          }))
        );
      }

      return assignment || null;
    } catch (error) {
      console.error("Failed to assign pack to tenant:", error);
      return null;
    }
  }

  async unassignPackFromTenant(tenantId: string, packId: string): Promise<boolean> {
    try {
      await db
        .delete(tenantComplianceProgress)
        .where(
          and(
            eq(tenantComplianceProgress.tenantId, tenantId),
            eq(tenantComplianceProgress.packId, packId)
          )
        );

      await db
        .delete(tenantCompliancePacks)
        .where(
          and(eq(tenantCompliancePacks.tenantId, tenantId), eq(tenantCompliancePacks.packId, packId))
        );

      return true;
    } catch {
      return false;
    }
  }

  async getTenantPacks(tenantId: string): Promise<(TenantCompliancePack & { pack: CompliancePack })[]> {
    try {
      const assignments = await db
        .select()
        .from(tenantCompliancePacks)
        .where(eq(tenantCompliancePacks.tenantId, tenantId))
        .orderBy(desc(tenantCompliancePacks.assignedAt));

      const result = [];
      for (const assignment of assignments) {
        const pack = await this.getPackById(assignment.packId);
        if (pack) {
          result.push({ ...assignment, pack });
        }
      }
      return result;
    } catch {
      return [];
    }
  }

  async getTenantProgress(
    tenantId: string,
    packId: string
  ): Promise<(TenantComplianceProgress & { item: ComplianceChecklistItem })[]> {
    try {
      const progress = await db
        .select()
        .from(tenantComplianceProgress)
        .where(
          and(
            eq(tenantComplianceProgress.tenantId, tenantId),
            eq(tenantComplianceProgress.packId, packId)
          )
        )
        .orderBy(tenantComplianceProgress.createdAt);

      const result = [];
      for (const p of progress) {
        const [item] = await db
          .select()
          .from(complianceChecklistItems)
          .where(eq(complianceChecklistItems.id, p.itemId))
          .limit(1);

        if (item) {
          result.push({ ...p, item });
        }
      }
      return result;
    } catch {
      return [];
    }
  }

  async updateItemProgress(
    tenantId: string,
    packId: string,
    itemId: string,
    data: {
      status?: "not_started" | "in_progress" | "completed" | "not_applicable" | "overdue";
      notes?: string;
      evidenceUrl?: string;
      evidenceDescription?: string;
      assignedTo?: string;
    },
    userId: string
  ): Promise<TenantComplianceProgress | null> {
    try {
      const updates: Record<string, unknown> = {
        ...data,
        updatedAt: new Date(),
      };

      if (data.status === "in_progress") {
        updates.startedAt = new Date();
      }

      if (data.status === "completed") {
        updates.completedAt = new Date();
        updates.completedBy = userId;
      }

      const [updated] = await db
        .update(tenantComplianceProgress)
        .set(updates)
        .where(
          and(
            eq(tenantComplianceProgress.tenantId, tenantId),
            eq(tenantComplianceProgress.packId, packId),
            eq(tenantComplianceProgress.itemId, itemId)
          )
        )
        .returning();

      if (updated) {
        await this.updatePackCompletionPercentage(tenantId, packId);
      }

      return updated || null;
    } catch {
      return null;
    }
  }

  async updatePackCompletionPercentage(tenantId: string, packId: string): Promise<void> {
    try {
      const progress = await db
        .select()
        .from(tenantComplianceProgress)
        .where(
          and(
            eq(tenantComplianceProgress.tenantId, tenantId),
            eq(tenantComplianceProgress.packId, packId)
          )
        );

      const total = progress.length;
      const completed = progress.filter(
        (p) => p.status === "completed" || p.status === "not_applicable"
      ).length;

      const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

      await db
        .update(tenantCompliancePacks)
        .set({
          completionPercentage: percentage,
          completedAt: percentage === 100 ? new Date() : null,
          status: percentage === 100 ? "completed" : "active",
          updatedAt: new Date(),
        })
        .where(
          and(eq(tenantCompliancePacks.tenantId, tenantId), eq(tenantCompliancePacks.packId, packId))
        );
    } catch (error) {
      console.error("Failed to update pack completion percentage:", error);
    }
  }

  async getComplianceSummary(tenantId: string): Promise<{
    totalPacks: number;
    completedPacks: number;
    totalItems: number;
    completedItems: number;
    inProgressItems: number;
    overdueItems: number;
    overallPercentage: number;
  }> {
    try {
      const packs = await db
        .select()
        .from(tenantCompliancePacks)
        .where(eq(tenantCompliancePacks.tenantId, tenantId));

      const progress = await db
        .select()
        .from(tenantComplianceProgress)
        .where(eq(tenantComplianceProgress.tenantId, tenantId));

      const totalPacks = packs.length;
      const completedPacks = packs.filter((p) => p.status === "completed").length;
      const totalItems = progress.length;
      const completedItems = progress.filter(
        (p) => p.status === "completed" || p.status === "not_applicable"
      ).length;
      const inProgressItems = progress.filter((p) => p.status === "in_progress").length;
      const overdueItems = progress.filter((p) => p.status === "overdue").length;
      const overallPercentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

      return {
        totalPacks,
        completedPacks,
        totalItems,
        completedItems,
        inProgressItems,
        overdueItems,
        overallPercentage,
      };
    } catch {
      return {
        totalPacks: 0,
        completedPacks: 0,
        totalItems: 0,
        completedItems: 0,
        inProgressItems: 0,
        overdueItems: 0,
        overallPercentage: 0,
      };
    }
  }

  async seedDefaultPacks(): Promise<void> {
    try {
      const existingPacks = await db.select().from(compliancePacks).limit(1);
      if (existingPacks.length > 0) {
        return;
      }

      const packs = [
        {
          name: "GDPR Essentials",
          code: "gdpr_essentials",
          regulation: "gdpr" as const,
          description: "Essential GDPR compliance requirements for UK/EU businesses",
          applicableCountries: ["gb", "eu"],
          tier: "standard",
          version: "1.0",
          isActive: true,
          isDefault: true,
        },
        {
          name: "DPDP Act Compliance",
          code: "dpdp_india",
          regulation: "dpdp" as const,
          description: "India Digital Personal Data Protection Act 2023 compliance",
          applicableCountries: ["in"],
          tier: "standard",
          version: "1.0",
          isActive: true,
          isDefault: true,
        },
        {
          name: "PDPA Singapore",
          code: "pdpa_singapore",
          regulation: "pdpa_sg" as const,
          description: "Singapore Personal Data Protection Act compliance",
          applicableCountries: ["sg"],
          tier: "standard",
          version: "1.0",
          isActive: true,
          isDefault: true,
        },
        {
          name: "UAE Data Protection",
          code: "uae_dpl",
          regulation: "uae_dpl" as const,
          description: "UAE Data Protection Law compliance",
          applicableCountries: ["ae"],
          tier: "standard",
          version: "1.0",
          isActive: true,
          isDefault: true,
        },
      ];

      for (const pack of packs) {
        const [createdPack] = await db.insert(compliancePacks).values(pack).returning();

        const items = this.getDefaultChecklistItems(pack.regulation);
        let sortOrder = 0;
        for (const item of items) {
          await db.insert(complianceChecklistItems).values({
            ...item,
            packId: createdPack.id,
            sortOrder: sortOrder++,
          });
        }

        await db
          .update(compliancePacks)
          .set({ totalItems: items.length })
          .where(eq(compliancePacks.id, createdPack.id));
      }
    } catch (error) {
      console.error("Failed to seed default compliance packs:", error);
    }
  }

  private getDefaultChecklistItems(regulation: string): Omit<InsertComplianceChecklistItem, "packId" | "sortOrder">[] {
    const commonItems: Omit<InsertComplianceChecklistItem, "packId" | "sortOrder">[] = [
      {
        category: "Data Collection",
        title: "Document all personal data collected",
        description: "Create and maintain a comprehensive inventory of all personal data collected from customers",
        guidance: "List all data points collected including name, email, phone, address, payment info, etc.",
        priority: "high",
        isMandatory: true,
        requiresEvidence: true,
        evidenceTypes: ["document"],
        tags: ["documentation"],
      },
      {
        category: "Consent Management",
        title: "Implement consent collection mechanism",
        description: "Set up clear consent checkboxes for data collection at registration and booking",
        guidance: "Ensure consent is explicit, informed, and granular",
        priority: "critical",
        isMandatory: true,
        requiresEvidence: true,
        evidenceTypes: ["screenshot"],
        tags: ["technical"],
      },
      {
        category: "Privacy Policy",
        title: "Create and publish privacy policy",
        description: "Draft a comprehensive privacy policy covering data collection, use, and sharing",
        guidance: "Include sections on data rights, retention, security measures",
        priority: "critical",
        isMandatory: true,
        requiresEvidence: true,
        evidenceTypes: ["policy_link"],
        tags: ["policy"],
      },
      {
        category: "Data Security",
        title: "Enable data encryption",
        description: "Ensure all sensitive data is encrypted at rest and in transit",
        guidance: "Verify SSL/TLS is enabled, database encryption is active",
        priority: "high",
        isMandatory: true,
        requiresEvidence: false,
        tags: ["technical", "security"],
      },
      {
        category: "Access Control",
        title: "Configure role-based access control",
        description: "Set up appropriate access levels for different staff roles",
        guidance: "Ensure only authorized personnel can access personal data",
        priority: "high",
        isMandatory: true,
        requiresEvidence: true,
        evidenceTypes: ["screenshot"],
        tags: ["technical"],
      },
      {
        category: "Data Subject Rights",
        title: "Enable data export functionality",
        description: "Allow customers to request and download their personal data",
        guidance: "Provide a mechanism for data portability requests",
        priority: "medium",
        isMandatory: true,
        requiresEvidence: false,
        tags: ["technical"],
      },
      {
        category: "Data Subject Rights",
        title: "Enable data deletion requests",
        description: "Implement process to handle right to erasure requests",
        guidance: "Set up workflow to receive, verify, and process deletion requests",
        priority: "high",
        isMandatory: true,
        requiresEvidence: true,
        evidenceTypes: ["document"],
        tags: ["process"],
      },
      {
        category: "Staff Training",
        title: "Conduct data protection training",
        description: "Train all staff on data protection principles and procedures",
        guidance: "Cover data handling, security practices, and incident reporting",
        priority: "medium",
        isMandatory: true,
        requiresEvidence: true,
        evidenceTypes: ["document"],
        tags: ["training"],
      },
    ];

    const regulationSpecific: Record<string, typeof commonItems> = {
      gdpr: [
        {
          category: "DPO",
          title: "Appoint Data Protection Officer (if required)",
          description: "Designate a DPO if your organization meets the criteria",
          guidance: "Required for public authorities or organizations processing special categories of data at scale",
          priority: "medium",
          isMandatory: false,
          requiresEvidence: true,
          evidenceTypes: ["document"],
          tags: ["governance"],
        },
        {
          category: "Legal Basis",
          title: "Document lawful basis for processing",
          description: "Identify and document the legal basis for each processing activity",
          guidance: "GDPR requires one of: consent, contract, legal obligation, vital interests, public task, or legitimate interests",
          priority: "critical",
          isMandatory: true,
          requiresEvidence: true,
          evidenceTypes: ["document"],
          tags: ["documentation"],
        },
      ],
      dpdp: [
        {
          category: "Data Fiduciary",
          title: "Register as Data Fiduciary (if required)",
          description: "Complete registration with the Data Protection Board of India",
          guidance: "Required for significant data fiduciaries processing large volumes of data",
          priority: "high",
          isMandatory: false,
          requiresEvidence: true,
          evidenceTypes: ["document"],
          tags: ["governance"],
        },
        {
          category: "Consent Manager",
          title: "Implement Consent Manager",
          description: "Use an approved consent manager for collecting and managing user consent",
          guidance: "DPDP requires consent managers to be registered with the Board",
          priority: "high",
          isMandatory: true,
          requiresEvidence: true,
          evidenceTypes: ["screenshot"],
          tags: ["technical"],
        },
      ],
      pdpa_sg: [
        {
          category: "PDPC",
          title: "Register with PDPC",
          description: "Register your organization with the Personal Data Protection Commission",
          guidance: "All organizations handling personal data in Singapore should register",
          priority: "high",
          isMandatory: true,
          requiresEvidence: true,
          evidenceTypes: ["document"],
          tags: ["governance"],
        },
      ],
      uae_dpl: [
        {
          category: "Data Controller",
          title: "Register as Data Controller",
          description: "Complete registration with the UAE Data Office",
          guidance: "Required for organizations processing personal data in the UAE",
          priority: "high",
          isMandatory: true,
          requiresEvidence: true,
          evidenceTypes: ["document"],
          tags: ["governance"],
        },
      ],
    };

    return [...commonItems, ...(regulationSpecific[regulation] || [])];
  }

  // Patient access history for clinic/healthcare module
  async getPatientAccessHistory(tenantId: string, patientId: string): Promise<unknown[]> {
    try {
      const logs = await db.select()
        .from(sensitiveDataAccessLogs)
        .where(
          and(
            eq(sensitiveDataAccessLogs.tenantId, tenantId),
            eq(sensitiveDataAccessLogs.resourceType, "patient"),
            eq(sensitiveDataAccessLogs.resourceId, patientId)
          )
        )
        .orderBy(desc(sensitiveDataAccessLogs.createdAt))
        .limit(100);
      return logs;
    } catch {
      return [];
    }
  }

  // Unusual access pattern detection
  async getUnusualAccessPatterns(
    tenantId: string,
    options: { windowHours?: number; threshold?: number }
  ): Promise<{ patterns: unknown[]; alerts: unknown[] }> {
    try {
      const windowHours = options.windowHours || 24;
      const threshold = options.threshold || 50;
      const windowStart = new Date(Date.now() - windowHours * 60 * 60 * 1000);

      const accessCounts = await db.select({
        accessorId: sensitiveDataAccessLogs.accessorId,
        accessorEmail: sensitiveDataAccessLogs.accessorEmail,
        count: sql<number>`count(*)`.as("count"),
      })
        .from(sensitiveDataAccessLogs)
        .where(
          and(
            eq(sensitiveDataAccessLogs.tenantId, tenantId),
            gte(sensitiveDataAccessLogs.createdAt, windowStart)
          )
        )
        .groupBy(sensitiveDataAccessLogs.accessorId, sensitiveDataAccessLogs.accessorEmail);

      const unusualPatterns = accessCounts.filter(ac => ac.count > threshold);

      return {
        patterns: unusualPatterns,
        alerts: unusualPatterns.map(p => ({
          type: "high_access_volume",
          accessorId: p.accessorId,
          accessorEmail: p.accessorEmail,
          accessCount: p.count,
          threshold,
          windowHours,
        })),
      };
    } catch {
      return { patterns: [], alerts: [] };
    }
  }
}

export const complianceService = new ComplianceService();
