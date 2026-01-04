import { db } from "../../db";
import { eq, and, desc, lt, gte } from "drizzle-orm";
import {
  ukVatConfigurations,
  ukVatInvoices,
  gdprConsentRecords,
  ukDataRetentionPolicies,
  ukDataRetentionLogs,
  gdprDsarRequests,
  gdprDataBreaches,
  ukComplianceSettings,
  type UkVatConfiguration,
  type InsertUkVatConfiguration,
  type UkVatInvoice,
  type InsertUkVatInvoice,
  type GdprConsentRecord,
  type InsertGdprConsentRecord,
  type UkDataRetentionPolicy,
  type InsertUkDataRetentionPolicy,
  type UkDataRetentionLog,
  type InsertUkDataRetentionLog,
  type GdprDsarRequest,
  type InsertGdprDsarRequest,
  type GdprDataBreach,
  type InsertGdprDataBreach,
  type UkComplianceSettings,
  type InsertUkComplianceSettings,
} from "@shared/schema";

const UK_VAT_RATES = {
  standard: 20,
  reduced: 5,
  zero: 0,
  exempt: 0,
};

const LAWFUL_BASES = [
  "consent",
  "contract",
  "legal_obligation",
  "vital_interests",
  "public_task",
  "legitimate_interests",
];

const DSAR_TYPES = [
  "access",
  "rectification",
  "erasure",
  "portability",
  "restriction",
  "objection",
];

class UkComplianceService {
  validateVatNumber(vatNumber: string): { valid: boolean; error?: string; details?: any } {
    const cleanVat = vatNumber.replace(/\s/g, "").toUpperCase();
    
    if (!cleanVat.startsWith("GB")) {
      return { valid: false, error: "UK VAT number must start with GB" };
    }

    const digits = cleanVat.slice(2);
    
    if (!/^\d{9}$/.test(digits) && !/^\d{12}$/.test(digits)) {
      return { valid: false, error: "UK VAT number must have 9 or 12 digits after GB" };
    }

    if (digits.length === 9) {
      const isValid = this.validateMod97(digits);
      if (!isValid) {
        return { valid: false, error: "Invalid VAT number check digits" };
      }
    }

    return {
      valid: true,
      details: {
        vatNumber: cleanVat,
        formatted: this.formatVatNumber(cleanVat),
        type: digits.length === 9 ? "standard" : "group",
      },
    };
  }

  private validateMod97(digits: string): boolean {
    const weights = [8, 7, 6, 5, 4, 3, 2];
    let sum = 0;
    for (let i = 0; i < 7; i++) {
      sum += parseInt(digits[i]) * weights[i];
    }
    const checkDigits = parseInt(digits.slice(7));
    const remainder = sum % 97;
    return checkDigits === (97 - remainder) || checkDigits === (97 - remainder + 55);
  }

  formatVatNumber(vatNumber: string): string {
    const clean = vatNumber.replace(/\s/g, "").toUpperCase();
    if (clean.startsWith("GB")) {
      const digits = clean.slice(2);
      return `GB ${digits.slice(0, 3)} ${digits.slice(3, 7)} ${digits.slice(7)}`;
    }
    return clean;
  }

  getVatRates(): Record<string, number> {
    return { ...UK_VAT_RATES };
  }

  getLawfulBases(): string[] {
    return [...LAWFUL_BASES];
  }

  getDsarTypes(): string[] {
    return [...DSAR_TYPES];
  }

  calculateVat(
    netAmount: number,
    rateType: keyof typeof UK_VAT_RATES = "standard",
    options: {
      isReverseCharge?: boolean;
      isEcSupply?: boolean;
    } = {}
  ): { netAmount: number; vatAmount: number; totalAmount: number; vatRate: number; rateType: string } {
    const vatRate = UK_VAT_RATES[rateType] || UK_VAT_RATES.standard;

    if (options.isReverseCharge || options.isEcSupply) {
      return {
        netAmount,
        vatAmount: 0,
        totalAmount: netAmount,
        vatRate: 0,
        rateType: options.isReverseCharge ? "reverse_charge" : "ec_supply",
      };
    }

    if (rateType === "exempt") {
      return {
        netAmount,
        vatAmount: 0,
        totalAmount: netAmount,
        vatRate: 0,
        rateType: "exempt",
      };
    }

    const vatAmount = (netAmount * vatRate) / 100;
    return {
      netAmount,
      vatAmount,
      totalAmount: netAmount + vatAmount,
      vatRate,
      rateType,
    };
  }

  async getVatConfiguration(tenantId: string): Promise<UkVatConfiguration | null> {
    const [config] = await db
      .select()
      .from(ukVatConfigurations)
      .where(eq(ukVatConfigurations.tenantId, tenantId));
    return config || null;
  }

  async createVatConfiguration(data: InsertUkVatConfiguration): Promise<UkVatConfiguration | null> {
    const validation = this.validateVatNumber(data.vatNumber);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const [config] = await db.insert(ukVatConfigurations).values(data).returning();
    return config;
  }

  async updateVatConfiguration(tenantId: string, data: Partial<InsertUkVatConfiguration>): Promise<UkVatConfiguration | null> {
    if (data.vatNumber) {
      const validation = this.validateVatNumber(data.vatNumber);
      if (!validation.valid) {
        throw new Error(validation.error);
      }
    }

    const [updated] = await db
      .update(ukVatConfigurations)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(ukVatConfigurations.tenantId, tenantId))
      .returning();
    return updated || null;
  }

  async createVatInvoice(data: InsertUkVatInvoice): Promise<UkVatInvoice | null> {
    const lineItems = data.lineItems as any[] || [];
    let netTotal = 0;
    let vatTotal = 0;

    const processedItems = lineItems.map((item: any) => {
      const itemNet = parseFloat(item.quantity || 1) * parseFloat(item.unitPrice || 0);
      const rateType = item.vatRateType || "standard";
      const calc = this.calculateVat(itemNet, rateType as keyof typeof UK_VAT_RATES, {
        isReverseCharge: data.isReverseCharge === true,
        isEcSupply: data.isEcSupply === true,
      });

      netTotal += calc.netAmount;
      vatTotal += calc.vatAmount;

      return {
        ...item,
        netAmount: calc.netAmount,
        vatAmount: calc.vatAmount,
        vatRate: calc.vatRate,
        total: calc.totalAmount,
      };
    });

    const invoiceData: InsertUkVatInvoice = {
      ...data,
      lineItems: processedItems,
      netAmount: String(netTotal),
      vatAmount: String(vatTotal),
      totalAmount: String(netTotal + vatTotal),
    };

    const [invoice] = await db.insert(ukVatInvoices).values(invoiceData).returning();
    return invoice;
  }

  async getVatInvoices(tenantId: string, filters?: { status?: string }): Promise<UkVatInvoice[]> {
    const conditions = [eq(ukVatInvoices.tenantId, tenantId)];
    
    if (filters?.status) {
      conditions.push(eq(ukVatInvoices.status, filters.status));
    }

    const whereClause = conditions.length === 1 ? conditions[0] : and(...conditions);
    return db.select().from(ukVatInvoices).where(whereClause).orderBy(desc(ukVatInvoices.createdAt));
  }

  async getVatInvoice(tenantId: string, invoiceId: string): Promise<UkVatInvoice | null> {
    const [invoice] = await db
      .select()
      .from(ukVatInvoices)
      .where(and(eq(ukVatInvoices.tenantId, tenantId), eq(ukVatInvoices.id, invoiceId)));
    return invoice || null;
  }

  async recordConsent(data: InsertGdprConsentRecord): Promise<GdprConsentRecord | null> {
    if (!LAWFUL_BASES.includes(data.lawfulBasis)) {
      throw new Error(`Invalid lawful basis. Must be one of: ${LAWFUL_BASES.join(", ")}`);
    }

    const [record] = await db.insert(gdprConsentRecords).values(data).returning();
    return record;
  }

  async getConsentRecords(tenantId: string, filters?: { dataSubjectId?: string; consentType?: string }): Promise<GdprConsentRecord[]> {
    const conditions = [eq(gdprConsentRecords.tenantId, tenantId)];
    
    if (filters?.dataSubjectId) {
      conditions.push(eq(gdprConsentRecords.dataSubjectId, filters.dataSubjectId));
    }
    if (filters?.consentType) {
      conditions.push(eq(gdprConsentRecords.consentType, filters.consentType));
    }

    const whereClause = conditions.length === 1 ? conditions[0] : and(...conditions);
    return db.select().from(gdprConsentRecords).where(whereClause).orderBy(desc(gdprConsentRecords.createdAt));
  }

  async withdrawConsent(tenantId: string, consentId: string, reason?: string): Promise<GdprConsentRecord | null> {
    const [updated] = await db
      .update(gdprConsentRecords)
      .set({ 
        withdrawnAt: new Date(),
        withdrawalReason: reason,
        consentGiven: false,
        updatedAt: new Date(),
      })
      .where(and(eq(gdprConsentRecords.tenantId, tenantId), eq(gdprConsentRecords.id, consentId)))
      .returning();
    return updated || null;
  }

  async getActiveConsents(tenantId: string, dataSubjectId: string): Promise<GdprConsentRecord[]> {
    const now = new Date();
    return db
      .select()
      .from(gdprConsentRecords)
      .where(
        and(
          eq(gdprConsentRecords.tenantId, tenantId),
          eq(gdprConsentRecords.dataSubjectId, dataSubjectId),
          eq(gdprConsentRecords.consentGiven, true)
        )
      )
      .orderBy(desc(gdprConsentRecords.createdAt));
  }

  async createRetentionPolicy(data: InsertUkDataRetentionPolicy): Promise<UkDataRetentionPolicy | null> {
    const nextReview = new Date();
    nextReview.setDate(nextReview.getDate() + (data.reviewFrequencyDays || 365));

    const [policy] = await db.insert(ukDataRetentionPolicies).values({
      ...data,
      nextReviewAt: nextReview,
    }).returning();
    return policy;
  }

  async getRetentionPolicies(tenantId: string): Promise<UkDataRetentionPolicy[]> {
    return db
      .select()
      .from(ukDataRetentionPolicies)
      .where(eq(ukDataRetentionPolicies.tenantId, tenantId))
      .orderBy(desc(ukDataRetentionPolicies.createdAt));
  }

  async updateRetentionPolicy(tenantId: string, policyId: string, data: Partial<InsertUkDataRetentionPolicy>): Promise<UkDataRetentionPolicy | null> {
    const [updated] = await db
      .update(ukDataRetentionPolicies)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(ukDataRetentionPolicies.tenantId, tenantId), eq(ukDataRetentionPolicies.id, policyId)))
      .returning();
    return updated || null;
  }

  async logRetentionAction(data: InsertUkDataRetentionLog): Promise<UkDataRetentionLog | null> {
    const [log] = await db.insert(ukDataRetentionLogs).values(data).returning();
    return log;
  }

  async getRetentionLogs(tenantId: string, filters?: { policyId?: string; action?: string }): Promise<UkDataRetentionLog[]> {
    const conditions = [eq(ukDataRetentionLogs.tenantId, tenantId)];
    
    if (filters?.policyId) {
      conditions.push(eq(ukDataRetentionLogs.policyId, filters.policyId));
    }
    if (filters?.action) {
      conditions.push(eq(ukDataRetentionLogs.action, filters.action));
    }

    const whereClause = conditions.length === 1 ? conditions[0] : and(...conditions);
    return db.select().from(ukDataRetentionLogs).where(whereClause).orderBy(desc(ukDataRetentionLogs.createdAt));
  }

  generateDsarRequestNumber(): string {
    const date = new Date();
    const year = date.getFullYear();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `DSAR-${year}-${random}`;
  }

  async createDsarRequest(data: InsertGdprDsarRequest): Promise<GdprDsarRequest | null> {
    if (!DSAR_TYPES.includes(data.requestType)) {
      throw new Error(`Invalid request type. Must be one of: ${DSAR_TYPES.join(", ")}`);
    }

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);

    const [request] = await db.insert(gdprDsarRequests).values({
      ...data,
      requestNumber: data.requestNumber || this.generateDsarRequestNumber(),
      dueDate,
      receivedAt: new Date(),
    }).returning();
    return request;
  }

  async getDsarRequests(tenantId: string, filters?: { status?: string; requestType?: string }): Promise<GdprDsarRequest[]> {
    const conditions = [eq(gdprDsarRequests.tenantId, tenantId)];
    
    if (filters?.status) {
      conditions.push(eq(gdprDsarRequests.status, filters.status));
    }
    if (filters?.requestType) {
      conditions.push(eq(gdprDsarRequests.requestType, filters.requestType));
    }

    const whereClause = conditions.length === 1 ? conditions[0] : and(...conditions);
    return db.select().from(gdprDsarRequests).where(whereClause).orderBy(desc(gdprDsarRequests.createdAt));
  }

  async updateDsarRequest(tenantId: string, requestId: string, data: Partial<InsertGdprDsarRequest>): Promise<GdprDsarRequest | null> {
    const [updated] = await db
      .update(gdprDsarRequests)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(gdprDsarRequests.tenantId, tenantId), eq(gdprDsarRequests.id, requestId)))
      .returning();
    return updated || null;
  }

  async getDsarRequest(tenantId: string, requestId: string): Promise<GdprDsarRequest | null> {
    const [request] = await db
      .select()
      .from(gdprDsarRequests)
      .where(and(eq(gdprDsarRequests.tenantId, tenantId), eq(gdprDsarRequests.id, requestId)));
    return request || null;
  }

  generateBreachNumber(): string {
    const date = new Date();
    const year = date.getFullYear();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `BREACH-${year}-${random}`;
  }

  assessBreachSeverity(breach: {
    dataTypesAffected: string[];
    dataSubjectsAffected: number;
    breachType: string;
  }): { severity: string; icoNotificationRequired: boolean; riskToRights: string } {
    let severity = "low";
    let riskToRights = "unlikely";
    let icoNotificationRequired = false;

    const sensitiveDataTypes = ["financial", "health", "criminal", "biometric", "genetic"];
    const hasSensitiveData = breach.dataTypesAffected.some(t => sensitiveDataTypes.includes(t));

    if (breach.dataSubjectsAffected > 1000 || hasSensitiveData) {
      severity = "high";
      riskToRights = "likely";
      icoNotificationRequired = true;
    } else if (breach.dataSubjectsAffected > 100) {
      severity = "medium";
      riskToRights = "possible";
      icoNotificationRequired = true;
    } else if (breach.breachType === "confidentiality" && breach.dataSubjectsAffected > 0) {
      severity = "medium";
      riskToRights = "possible";
    }

    if (breach.dataTypesAffected.length === 0 && breach.dataSubjectsAffected === 0) {
      severity = "low";
      riskToRights = "unlikely";
      icoNotificationRequired = false;
    }

    return { severity, icoNotificationRequired, riskToRights };
  }

  async reportDataBreach(data: InsertGdprDataBreach): Promise<GdprDataBreach | null> {
    const assessment = this.assessBreachSeverity({
      dataTypesAffected: (data.dataTypesAffected as string[]) || [],
      dataSubjectsAffected: data.dataSubjectsAffected || 0,
      breachType: data.breachType,
    });

    const [breach] = await db.insert(gdprDataBreaches).values({
      ...data,
      breachNumber: data.breachNumber || this.generateBreachNumber(),
      severity: data.severity || assessment.severity,
      riskToRights: data.riskToRights || assessment.riskToRights,
      icoNotificationRequired: data.icoNotificationRequired ?? assessment.icoNotificationRequired,
    }).returning();
    return breach;
  }

  async getDataBreaches(tenantId: string, filters?: { status?: string; severity?: string }): Promise<GdprDataBreach[]> {
    const conditions = [eq(gdprDataBreaches.tenantId, tenantId)];
    
    if (filters?.status) {
      conditions.push(eq(gdprDataBreaches.status, filters.status));
    }
    if (filters?.severity) {
      conditions.push(eq(gdprDataBreaches.severity, filters.severity));
    }

    const whereClause = conditions.length === 1 ? conditions[0] : and(...conditions);
    return db.select().from(gdprDataBreaches).where(whereClause).orderBy(desc(gdprDataBreaches.createdAt));
  }

  async updateDataBreach(tenantId: string, breachId: string, data: Partial<InsertGdprDataBreach>): Promise<GdprDataBreach | null> {
    const [updated] = await db
      .update(gdprDataBreaches)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(gdprDataBreaches.tenantId, tenantId), eq(gdprDataBreaches.id, breachId)))
      .returning();
    return updated || null;
  }

  async getComplianceSettings(tenantId: string): Promise<UkComplianceSettings | null> {
    const [settings] = await db
      .select()
      .from(ukComplianceSettings)
      .where(eq(ukComplianceSettings.tenantId, tenantId));
    return settings || null;
  }

  async createOrUpdateComplianceSettings(data: InsertUkComplianceSettings): Promise<UkComplianceSettings | null> {
    const existing = await this.getComplianceSettings(data.tenantId);
    
    if (existing) {
      const [updated] = await db
        .update(ukComplianceSettings)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(ukComplianceSettings.tenantId, data.tenantId))
        .returning();
      return updated;
    }

    const [created] = await db.insert(ukComplianceSettings).values(data).returning();
    return created;
  }

  getUkComplianceChecklist(): { category: string; items: { id: string; title: string; priority: string; mandatory: boolean }[] }[] {
    return [
      {
        category: "GDPR Compliance",
        items: [
          { id: "ico_registration", title: "Register with ICO (Information Commissioner's Office)", priority: "critical", mandatory: true },
          { id: "privacy_policy", title: "Publish GDPR-compliant privacy policy", priority: "critical", mandatory: true },
          { id: "lawful_basis", title: "Document lawful basis for all data processing", priority: "critical", mandatory: true },
          { id: "consent_records", title: "Maintain consent records with proof", priority: "high", mandatory: true },
          { id: "dsar_process", title: "Implement DSAR handling process (30-day response)", priority: "high", mandatory: true },
          { id: "breach_procedure", title: "Establish data breach notification procedure (72 hours)", priority: "high", mandatory: true },
          { id: "dpo_appointment", title: "Appoint DPO if required", priority: "medium", mandatory: false },
          { id: "dpia", title: "Conduct Data Protection Impact Assessments", priority: "medium", mandatory: false },
        ],
      },
      {
        category: "Data Retention",
        items: [
          { id: "retention_policy", title: "Define data retention policies per category", priority: "high", mandatory: true },
          { id: "retention_schedule", title: "Create retention schedule with legal basis", priority: "high", mandatory: true },
          { id: "deletion_process", title: "Implement secure data deletion process", priority: "medium", mandatory: true },
          { id: "retention_review", title: "Schedule regular retention policy reviews", priority: "medium", mandatory: true },
          { id: "hmrc_records", title: "Retain financial records for 6 years (HMRC)", priority: "high", mandatory: true },
        ],
      },
      {
        category: "VAT Compliance",
        items: [
          { id: "vat_registration", title: "Register for VAT if threshold exceeded", priority: "critical", mandatory: false },
          { id: "mtd_compliance", title: "Enable Making Tax Digital (MTD) for VAT", priority: "high", mandatory: true },
          { id: "vat_invoices", title: "Issue VAT-compliant invoices", priority: "high", mandatory: true },
          { id: "vat_returns", title: "Submit VAT returns on time", priority: "critical", mandatory: true },
          { id: "vat_records", title: "Maintain VAT records for 6 years", priority: "high", mandatory: true },
          { id: "reverse_charge", title: "Apply reverse charge where applicable", priority: "medium", mandatory: false },
        ],
      },
      {
        category: "Consent Management",
        items: [
          { id: "explicit_consent", title: "Obtain explicit consent for marketing", priority: "high", mandatory: true },
          { id: "consent_mechanism", title: "Implement granular consent mechanism", priority: "high", mandatory: true },
          { id: "consent_withdrawal", title: "Provide easy consent withdrawal option", priority: "high", mandatory: true },
          { id: "cookie_consent", title: "Implement cookie consent (PECR compliance)", priority: "high", mandatory: true },
          { id: "consent_audit", title: "Maintain consent audit trail", priority: "medium", mandatory: true },
        ],
      },
    ];
  }

  getDefaultRetentionPolicies(): { name: string; category: string; days: number; basis: string; reference: string }[] {
    return [
      { name: "Financial Records", category: "financial_records", days: 2190, basis: "legal_requirement", reference: "HMRC requires 6 years" },
      { name: "Customer Data", category: "customer_data", days: 1095, basis: "legitimate_interests", reference: "3 years after last transaction" },
      { name: "Marketing Data", category: "marketing_data", days: 730, basis: "consent", reference: "2 years from consent" },
      { name: "Employee Records", category: "employee_data", days: 2555, basis: "legal_requirement", reference: "7 years after employment ends" },
      { name: "Health Records", category: "health_records", days: 2920, basis: "legal_requirement", reference: "8 years (NHS guidelines)" },
      { name: "Booking History", category: "booking_data", days: 1095, basis: "legitimate_interests", reference: "3 years from booking date" },
    ];
  }
}

export const ukComplianceService = new UkComplianceService();
