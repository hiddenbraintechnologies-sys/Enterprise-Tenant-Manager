import { db } from "../../db";
import { eq, and, desc, sql } from "drizzle-orm";
import {
  gstConfigurations,
  gstInvoices,
  dltTemplates,
  aadhaarMaskingLogs,
  rbiPaymentCompliance,
  InsertGstConfiguration,
  InsertGstInvoice,
  InsertDltTemplate,
  InsertAadhaarMaskingLog,
  InsertRbiPaymentCompliance,
  GstConfiguration,
  GstInvoice,
  DltTemplate,
  RbiPaymentCompliance,
} from "@shared/schema";

const INDIAN_STATE_CODES: Record<string, string> = {
  "01": "Jammu and Kashmir",
  "02": "Himachal Pradesh",
  "03": "Punjab",
  "04": "Chandigarh",
  "05": "Uttarakhand",
  "06": "Haryana",
  "07": "Delhi",
  "08": "Rajasthan",
  "09": "Uttar Pradesh",
  "10": "Bihar",
  "11": "Sikkim",
  "12": "Arunachal Pradesh",
  "13": "Nagaland",
  "14": "Manipur",
  "15": "Mizoram",
  "16": "Tripura",
  "17": "Meghalaya",
  "18": "Assam",
  "19": "West Bengal",
  "20": "Jharkhand",
  "21": "Odisha",
  "22": "Chhattisgarh",
  "23": "Madhya Pradesh",
  "24": "Gujarat",
  "26": "Dadra and Nagar Haveli and Daman and Diu",
  "27": "Maharashtra",
  "28": "Andhra Pradesh (Old)",
  "29": "Karnataka",
  "30": "Goa",
  "31": "Lakshadweep",
  "32": "Kerala",
  "33": "Tamil Nadu",
  "34": "Puducherry",
  "35": "Andaman and Nicobar",
  "36": "Telangana",
  "37": "Andhra Pradesh",
  "38": "Ladakh",
};

class IndiaComplianceService {
  validateGstin(gstin: string): { valid: boolean; error?: string; details?: any } {
    if (!gstin || gstin.length !== 15) {
      return { valid: false, error: "GSTIN must be exactly 15 characters" };
    }

    const gstinPattern = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    if (!gstinPattern.test(gstin)) {
      return { valid: false, error: "Invalid GSTIN format" };
    }

    const stateCode = gstin.substring(0, 2);
    if (!INDIAN_STATE_CODES[stateCode]) {
      return { valid: false, error: "Invalid state code in GSTIN" };
    }

    const pan = gstin.substring(2, 12);
    const entityType = pan.charAt(3);
    const entityTypes: Record<string, string> = {
      P: "Individual",
      F: "Firm",
      C: "Company",
      H: "HUF",
      A: "AOP",
      T: "Trust",
      B: "BOI",
      L: "Local Authority",
      J: "Artificial Juridical Person",
      G: "Government",
    };

    return {
      valid: true,
      details: {
        stateCode,
        stateName: INDIAN_STATE_CODES[stateCode],
        pan,
        entityType: entityTypes[entityType] || "Unknown",
        entityCode: gstin.charAt(12),
        checksum: gstin.charAt(14),
      },
    };
  }

  async getGstConfiguration(tenantId: string): Promise<GstConfiguration | null> {
    const [config] = await db.select().from(gstConfigurations).where(eq(gstConfigurations.tenantId, tenantId));
    return config || null;
  }

  async saveGstConfiguration(data: InsertGstConfiguration): Promise<GstConfiguration | null> {
    const validation = this.validateGstin(data.gstin);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const existing = await this.getGstConfiguration(data.tenantId);
    if (existing) {
      const [updated] = await db
        .update(gstConfigurations)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(gstConfigurations.tenantId, data.tenantId))
        .returning();
      return updated;
    }

    const [created] = await db.insert(gstConfigurations).values(data).returning();
    return created;
  }

  calculateGst(
    amount: number,
    gstRate: number,
    isInterState: boolean
  ): { cgst: number; sgst: number; igst: number; total: number } {
    const taxAmount = (amount * gstRate) / 100;

    if (isInterState) {
      return {
        cgst: 0,
        sgst: 0,
        igst: taxAmount,
        total: amount + taxAmount,
      };
    }

    return {
      cgst: taxAmount / 2,
      sgst: taxAmount / 2,
      igst: 0,
      total: amount + taxAmount,
    };
  }

  generateInvoiceNumber(prefix: string, sequence: number, date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const financialYear =
      date.getMonth() >= 3
        ? `${year}-${(year + 1).toString().slice(-2)}`
        : `${year - 1}-${year.toString().slice(-2)}`;
    return `${prefix}/${financialYear}/${String(sequence).padStart(6, "0")}`;
  }

  async createGstInvoice(data: InsertGstInvoice): Promise<GstInvoice | null> {
    const config = await this.getGstConfiguration(data.tenantId);
    if (!config) {
      throw new Error("GST configuration not found for tenant");
    }

    if (data.customerGstin) {
      const validation = this.validateGstin(data.customerGstin);
      if (!validation.valid) {
        throw new Error(`Invalid customer GSTIN: ${validation.error}`);
      }
    }

    const isInterState = data.placeOfSupply !== config.stateCode;
    const lineItems = data.lineItems as any[];
    let taxableAmount = 0;

    const processedItems = lineItems.map((item) => {
      const itemTaxable = item.quantity * item.unitPrice - (item.discount || 0);
      taxableAmount += itemTaxable;
      const gstRate = item.gstRate || 18;
      const gst = this.calculateGst(itemTaxable, gstRate, isInterState);

      return {
        ...item,
        taxableAmount: itemTaxable,
        cgstRate: isInterState ? 0 : gstRate / 2,
        sgstRate: isInterState ? 0 : gstRate / 2,
        igstRate: isInterState ? gstRate : 0,
        cgstAmount: gst.cgst,
        sgstAmount: gst.sgst,
        igstAmount: gst.igst,
      };
    });

    const totalGst = this.calculateGst(taxableAmount, 18, isInterState);

    const invoiceData: InsertGstInvoice = {
      ...data,
      lineItems: processedItems,
      taxableAmount: String(taxableAmount),
      cgstAmount: String(totalGst.cgst),
      sgstAmount: String(totalGst.sgst),
      igstAmount: String(totalGst.igst),
      totalAmount: String(totalGst.total),
      supplyType: data.customerGstin ? "B2B" : "B2C",
    };

    const [invoice] = await db.insert(gstInvoices).values(invoiceData).returning();
    return invoice;
  }

  async getGstInvoices(tenantId: string, filters?: { status?: string; fromDate?: Date; toDate?: Date }): Promise<GstInvoice[]> {
    const conditions = [eq(gstInvoices.tenantId, tenantId)];
    
    if (filters?.status) {
      conditions.push(eq(gstInvoices.status, filters.status));
    }

    return db.select().from(gstInvoices).where(and(...conditions)).orderBy(desc(gstInvoices.createdAt));
  }

  async getGstInvoice(tenantId: string, invoiceId: string): Promise<GstInvoice | null> {
    const [invoice] = await db
      .select()
      .from(gstInvoices)
      .where(and(eq(gstInvoices.tenantId, tenantId), eq(gstInvoices.id, invoiceId)));
    return invoice || null;
  }

  validateDltTemplateId(templateId: string): boolean {
    return /^[0-9]{19}$/.test(templateId);
  }

  validatePeId(peId: string): boolean {
    return /^[0-9]{19}$/.test(peId);
  }

  validateSenderId(senderId: string): boolean {
    return /^[A-Z]{6}$/.test(senderId.toUpperCase());
  }

  async registerDltTemplate(data: InsertDltTemplate): Promise<DltTemplate | null> {
    if (!this.validateSenderId(data.senderId)) {
      throw new Error("Sender ID must be exactly 6 uppercase alphabetic characters");
    }

    if (!this.validatePeId(data.principalEntityId)) {
      throw new Error("Principal Entity ID must be a 19-digit number");
    }

    const variables = this.extractTemplateVariables(data.templateContent);

    const [template] = await db
      .insert(dltTemplates)
      .values({
        ...data,
        senderId: data.senderId.toUpperCase(),
        variables: variables,
      })
      .returning();
    return template;
  }

  extractTemplateVariables(content: string): string[] {
    const matches = content.match(/\{#var#\}|\{#[^}]+#\}/g) || [];
    return matches.map((m, i) => `VAR${i + 1}`);
  }

  async getDltTemplates(tenantId: string, category?: string): Promise<DltTemplate[]> {
    const conditions = [eq(dltTemplates.tenantId, tenantId)];
    
    if (category) {
      conditions.push(eq(dltTemplates.category, category));
    }

    return db.select().from(dltTemplates).where(and(...conditions)).orderBy(desc(dltTemplates.createdAt));
  }

  async updateDltTemplateStatus(
    tenantId: string,
    templateId: string,
    status: string,
    approvedAt?: Date
  ): Promise<DltTemplate | null> {
    const [template] = await db
      .update(dltTemplates)
      .set({ status, approvedAt, updatedAt: new Date() })
      .where(and(eq(dltTemplates.tenantId, tenantId), eq(dltTemplates.id, templateId)))
      .returning();
    return template || null;
  }

  validateAadhaar(aadhaar: string): { valid: boolean; error?: string } {
    const cleaned = aadhaar.replace(/\s+/g, "");

    if (cleaned.length !== 12) {
      return { valid: false, error: "Aadhaar must be exactly 12 digits" };
    }

    if (!/^\d{12}$/.test(cleaned)) {
      return { valid: false, error: "Aadhaar must contain only digits" };
    }

    if (/^[01]/.test(cleaned)) {
      return { valid: false, error: "Aadhaar cannot start with 0 or 1" };
    }

    const verhoeffTable = {
      d: [
        [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
        [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
        [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
        [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
        [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
        [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
        [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
        [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
        [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
        [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
      ],
      p: [
        [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
        [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
        [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
        [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
        [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
        [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
        [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
        [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
      ],
    };

    let c = 0;
    const digits = cleaned.split("").reverse().map(Number);

    for (let i = 0; i < digits.length; i++) {
      c = verhoeffTable.d[c][verhoeffTable.p[i % 8][digits[i]]];
    }

    if (c !== 0) {
      return { valid: false, error: "Invalid Aadhaar checksum" };
    }

    return { valid: true };
  }

  maskAadhaar(aadhaar: string): string {
    const cleaned = aadhaar.replace(/\s+/g, "");
    if (cleaned.length !== 12) return "XXXX-XXXX-XXXX";
    return `XXXX-XXXX-${cleaned.slice(-4)}`;
  }

  async logAadhaarAccess(data: InsertAadhaarMaskingLog): Promise<void> {
    await db.insert(aadhaarMaskingLogs).values({
      ...data,
      maskedValue: this.maskAadhaar(data.maskedValue),
    });
  }

  async getAadhaarAccessLogs(
    tenantId: string,
    filters?: { entityType?: string; entityId?: string }
  ): Promise<any[]> {
    const conditions = [eq(aadhaarMaskingLogs.tenantId, tenantId)];
    
    if (filters?.entityId) {
      conditions.push(eq(aadhaarMaskingLogs.entityId, filters.entityId));
    }
    
    if (filters?.entityType) {
      conditions.push(eq(aadhaarMaskingLogs.entityType, filters.entityType));
    }

    return db.select().from(aadhaarMaskingLogs).where(and(...conditions)).orderBy(desc(aadhaarMaskingLogs.accessedAt));
  }

  async getRbiCompliance(tenantId: string): Promise<RbiPaymentCompliance | null> {
    const [compliance] = await db
      .select()
      .from(rbiPaymentCompliance)
      .where(eq(rbiPaymentCompliance.tenantId, tenantId));
    return compliance || null;
  }

  async saveRbiCompliance(data: InsertRbiPaymentCompliance): Promise<RbiPaymentCompliance | null> {
    const existing = await this.getRbiCompliance(data.tenantId);
    if (existing) {
      const [updated] = await db
        .update(rbiPaymentCompliance)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(rbiPaymentCompliance.tenantId, data.tenantId))
        .returning();
      return updated;
    }

    const [created] = await db.insert(rbiPaymentCompliance).values(data).returning();
    return created;
  }

  validateRbiCompliance(compliance: RbiPaymentCompliance): {
    compliant: boolean;
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];

    if (!compliance.tokenizationEnabled) {
      issues.push("Card tokenization is not enabled (RBI mandate effective Oct 2022)");
    }

    if (!compliance.cardStorageCompliant) {
      issues.push("Card storage is not compliant with RBI CoF guidelines");
    }

    if (compliance.recurringPaymentCompliant && !compliance.eMandate2faEnabled) {
      issues.push("2FA is required for e-mandate recurring payments above Rs. 15,000");
    }

    if (!compliance.nodalOfficerEmail || !compliance.nodalOfficerPhone) {
      recommendations.push("Designate a Nodal Officer for payment dispute resolution");
    }

    if ((compliance.refundPolicyDays ?? 7) > 7) {
      recommendations.push("Consider reducing refund policy to 7 days or less for better customer experience");
    }

    if (!compliance.lastAuditDate) {
      recommendations.push("Schedule a payment security audit");
    }

    return {
      compliant: issues.length === 0,
      issues,
      recommendations,
    };
  }

  getIndiaComplianceChecklist(): any[] {
    return [
      {
        category: "GST Compliance",
        items: [
          { id: "gst_registration", title: "Register for GST", priority: "critical", mandatory: true },
          { id: "gst_invoicing", title: "Issue GST-compliant invoices", priority: "critical", mandatory: true },
          { id: "gst_filing", title: "File GSTR-1, GSTR-3B monthly/quarterly", priority: "high", mandatory: true },
          { id: "e_invoice", title: "Enable e-Invoice for B2B (if turnover > 5 Cr)", priority: "high", mandatory: false },
          { id: "e_way_bill", title: "Generate e-Way bill for goods > Rs. 50,000", priority: "medium", mandatory: false },
          { id: "hsn_sac", title: "Use correct HSN/SAC codes", priority: "medium", mandatory: true },
        ],
      },
      {
        category: "WhatsApp/SMS DLT Compliance",
        items: [
          { id: "dlt_registration", title: "Register as Principal Entity with telecom operators", priority: "critical", mandatory: true },
          { id: "sender_id", title: "Register Sender IDs (headers)", priority: "critical", mandatory: true },
          { id: "template_registration", title: "Register message templates", priority: "critical", mandatory: true },
          { id: "consent_scrubbing", title: "Implement consent/preference scrubbing", priority: "high", mandatory: true },
          { id: "opt_out", title: "Provide opt-out mechanism", priority: "high", mandatory: true },
        ],
      },
      {
        category: "Aadhaar Data Protection",
        items: [
          { id: "aadhaar_masking", title: "Mask Aadhaar numbers (show only last 4 digits)", priority: "critical", mandatory: true },
          { id: "aadhaar_storage", title: "Encrypt Aadhaar data at rest", priority: "critical", mandatory: true },
          { id: "aadhaar_access_log", title: "Log all Aadhaar access with reason", priority: "high", mandatory: true },
          { id: "aadhaar_purpose", title: "Collect Aadhaar only for valid purposes", priority: "critical", mandatory: true },
          { id: "aadhaar_retention", title: "Define Aadhaar data retention policy", priority: "medium", mandatory: true },
        ],
      },
      {
        category: "RBI Payment Guidelines",
        items: [
          { id: "card_tokenization", title: "Enable card tokenization (no raw card storage)", priority: "critical", mandatory: true },
          { id: "2fa_payments", title: "Implement 2FA for online payments", priority: "critical", mandatory: true },
          { id: "recurring_mandate", title: "e-Mandate compliance for recurring payments", priority: "high", mandatory: false },
          { id: "refund_policy", title: "Process refunds within 7 business days", priority: "high", mandatory: true },
          { id: "dispute_resolution", title: "Resolve disputes within 30 days", priority: "high", mandatory: true },
          { id: "nodal_officer", title: "Designate payment Nodal Officer", priority: "medium", mandatory: true },
          { id: "pa_registration", title: "PA/PG license if aggregate > 50 Cr/year", priority: "critical", mandatory: false },
        ],
      },
      {
        category: "DPDP Act 2023",
        items: [
          { id: "consent_manager", title: "Implement consent manager", priority: "high", mandatory: true },
          { id: "data_principal_rights", title: "Enable data principal rights (access, correction, erasure)", priority: "high", mandatory: true },
          { id: "data_fiduciary", title: "Register as Data Fiduciary (if applicable)", priority: "medium", mandatory: false },
          { id: "breach_notification", title: "Implement 72-hour breach notification", priority: "high", mandatory: true },
          { id: "children_data", title: "Parental consent for children's data (under 18)", priority: "critical", mandatory: true },
        ],
      },
    ];
  }
}

export const indiaComplianceService = new IndiaComplianceService();
