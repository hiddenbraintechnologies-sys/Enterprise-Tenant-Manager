import { db } from "../../db";
import { eq, and, desc } from "drizzle-orm";
import {
  uaeVatConfigurations,
  uaeVatInvoices,
  traTemplates,
  dataResidencyLogs,
  uaeComplianceSettings,
  type UaeVatConfiguration,
  type InsertUaeVatConfiguration,
  type UaeVatInvoice,
  type InsertUaeVatInvoice,
  type TraTemplate,
  type InsertTraTemplate,
  type DataResidencyLog,
  type InsertDataResidencyLog,
  type UaeComplianceSettings,
  type InsertUaeComplianceSettings,
} from "@shared/schema";

const UAE_EMIRATES = {
  "AZ": "Abu Dhabi",
  "DU": "Dubai",
  "SH": "Sharjah",
  "AJ": "Ajman",
  "FU": "Fujairah",
  "RK": "Ras Al Khaimah",
  "UQ": "Umm Al Quwain",
};

const FREE_ZONES = [
  "JAFZA", "DAFZA", "DMCC", "DIFC", "DHCC", "DSO", "DWC", "KIZAD", "ADGM",
  "SAIF", "RAK FTZ", "SHFZ", "HFZ", "UAQ FTZ", "AFZ", "IFZA", "TECOM"
];

class UaeComplianceService {
  validateTrn(trn: string): { valid: boolean; error?: string; details?: any } {
    const cleanTrn = trn.replace(/\s/g, "");
    
    if (!/^\d{15}$/.test(cleanTrn)) {
      return { valid: false, error: "TRN must be exactly 15 digits" };
    }

    if (!cleanTrn.startsWith("100")) {
      return { valid: false, error: "UAE TRN must start with 100" };
    }

    const checkDigit = this.calculateTrnCheckDigit(cleanTrn.slice(0, 14));
    if (checkDigit !== parseInt(cleanTrn[14])) {
      return { valid: false, error: "Invalid TRN check digit" };
    }

    return {
      valid: true,
      details: {
        trn: cleanTrn,
        formatted: this.formatTrn(cleanTrn),
      },
    };
  }

  private calculateTrnCheckDigit(trn14: string): number {
    const weights = [1, 3, 1, 3, 1, 3, 1, 3, 1, 3, 1, 3, 1, 3];
    let sum = 0;
    for (let i = 0; i < 14; i++) {
      sum += parseInt(trn14[i]) * weights[i];
    }
    const remainder = sum % 10;
    return remainder === 0 ? 0 : 10 - remainder;
  }

  formatTrn(trn: string): string {
    const clean = trn.replace(/\s/g, "");
    return `${clean.slice(0, 3)} ${clean.slice(3, 6)} ${clean.slice(6, 9)} ${clean.slice(9, 12)} ${clean.slice(12)}`;
  }

  getEmirates(): Record<string, string> {
    return { ...UAE_EMIRATES };
  }

  getFreeZones(): string[] {
    return [...FREE_ZONES];
  }

  calculateVat(
    amount: number,
    vatRate: number = 5,
    options: {
      isZeroRated?: boolean;
      isExempt?: boolean;
      isReverseCharge?: boolean;
    } = {}
  ): { taxableAmount: number; vatAmount: number; total: number; vatRate: number } {
    if (options.isZeroRated || options.isExempt) {
      return {
        taxableAmount: amount,
        vatAmount: 0,
        total: amount,
        vatRate: 0,
      };
    }

    if (options.isReverseCharge) {
      return {
        taxableAmount: amount,
        vatAmount: 0,
        total: amount,
        vatRate: vatRate,
      };
    }

    const vatAmount = (amount * vatRate) / 100;
    return {
      taxableAmount: amount,
      vatAmount: vatAmount,
      total: amount + vatAmount,
      vatRate: vatRate,
    };
  }

  async getVatConfiguration(tenantId: string): Promise<UaeVatConfiguration | null> {
    const [config] = await db
      .select()
      .from(uaeVatConfigurations)
      .where(eq(uaeVatConfigurations.tenantId, tenantId));
    return config || null;
  }

  async createVatConfiguration(data: InsertUaeVatConfiguration): Promise<UaeVatConfiguration | null> {
    const validation = this.validateTrn(data.trn);
    if (!validation.valid) {
      throw new Error(`Invalid TRN: ${validation.error}`);
    }

    const [created] = await db.insert(uaeVatConfigurations).values(data).returning();
    return created;
  }

  async updateVatConfiguration(tenantId: string, data: Partial<InsertUaeVatConfiguration>): Promise<UaeVatConfiguration | null> {
    if (data.trn) {
      const validation = this.validateTrn(data.trn);
      if (!validation.valid) {
        throw new Error(`Invalid TRN: ${validation.error}`);
      }
    }

    const [updated] = await db
      .update(uaeVatConfigurations)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(uaeVatConfigurations.tenantId, tenantId))
      .returning();
    return updated || null;
  }

  generateInvoiceNumber(prefix: string, sequence: number, date: Date): string {
    const year = date.getFullYear();
    return `${prefix}-${year}-${String(sequence).padStart(6, "0")}`;
  }

  async createVatInvoice(data: InsertUaeVatInvoice): Promise<UaeVatInvoice | null> {
    const config = await this.getVatConfiguration(data.tenantId);
    if (!config) {
      throw new Error("VAT configuration not found for tenant");
    }

    if (data.customerTrn) {
      const validation = this.validateTrn(data.customerTrn);
      if (!validation.valid) {
        throw new Error(`Invalid customer TRN: ${validation.error}`);
      }
    }

    const lineItems = data.lineItems as any[];
    let taxableAmount = 0;
    let totalVat = 0;

    const processedItems = lineItems.map((item) => {
      const itemTaxable = item.quantity * item.unitPrice - (item.discount || 0);
      taxableAmount += itemTaxable;
      
      const vatRate = item.vatRate ?? parseFloat(config.defaultVatRate || "5");
      const itemVat = this.calculateVat(itemTaxable, vatRate, {
        isZeroRated: data.isZeroRated === true || item.isZeroRated === true,
        isExempt: data.isExempt === true || item.isExempt === true,
        isReverseCharge: data.isReverseCharge === true,
      });

      totalVat += itemVat.vatAmount;

      return {
        ...item,
        taxableAmount: itemTaxable,
        vatRate: itemVat.vatRate,
        vatAmount: itemVat.vatAmount,
        total: itemVat.total,
      };
    });

    const totalAmount = taxableAmount + totalVat;

    const invoiceData: InsertUaeVatInvoice = {
      ...data,
      lineItems: processedItems,
      taxableAmount: String(taxableAmount),
      vatAmount: String(totalVat),
      totalAmount: String(totalAmount),
    };

    const [invoice] = await db.insert(uaeVatInvoices).values(invoiceData).returning();
    return invoice;
  }

  async getVatInvoices(tenantId: string, filters?: { status?: string; fromDate?: Date; toDate?: Date }): Promise<UaeVatInvoice[]> {
    const conditions = [eq(uaeVatInvoices.tenantId, tenantId)];
    
    if (filters?.status) {
      conditions.push(eq(uaeVatInvoices.status, filters.status));
    }

    return db.select().from(uaeVatInvoices).where(and(...conditions)).orderBy(desc(uaeVatInvoices.createdAt));
  }

  async getVatInvoice(tenantId: string, invoiceId: string): Promise<UaeVatInvoice | null> {
    const [invoice] = await db
      .select()
      .from(uaeVatInvoices)
      .where(and(eq(uaeVatInvoices.tenantId, tenantId), eq(uaeVatInvoices.id, invoiceId)));
    return invoice || null;
  }

  validateTraSenderId(senderId: string): boolean {
    return /^[A-Za-z0-9]{3,11}$/.test(senderId);
  }

  async registerTraTemplate(data: InsertTraTemplate): Promise<TraTemplate | null> {
    if (!this.validateTraSenderId(data.senderId)) {
      throw new Error("Sender ID must be 3-11 alphanumeric characters");
    }

    const variables = this.extractTemplateVariables(data.templateContentEn);

    const [template] = await db
      .insert(traTemplates)
      .values({
        ...data,
        variables: variables,
      })
      .returning();
    return template;
  }

  extractTemplateVariables(content: string): string[] {
    const matches = content.match(/\{[^}]+\}/g) || [];
    return matches.map((m) => m.replace(/[{}]/g, ""));
  }

  async getTraTemplates(tenantId: string, category?: string): Promise<TraTemplate[]> {
    const conditions = [eq(traTemplates.tenantId, tenantId)];
    
    if (category) {
      conditions.push(eq(traTemplates.category, category));
    }

    return db.select().from(traTemplates).where(and(...conditions)).orderBy(desc(traTemplates.createdAt));
  }

  async updateTraTemplate(tenantId: string, templateId: string, data: Partial<InsertTraTemplate>): Promise<TraTemplate | null> {
    if (data.senderId && !this.validateTraSenderId(data.senderId)) {
      throw new Error("Sender ID must be 3-11 alphanumeric characters");
    }

    const [updated] = await db
      .update(traTemplates)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(traTemplates.tenantId, tenantId), eq(traTemplates.id, templateId)))
      .returning();
    return updated || null;
  }

  async logDataResidency(data: InsertDataResidencyLog): Promise<DataResidencyLog | null> {
    const [log] = await db.insert(dataResidencyLogs).values(data).returning();
    return log;
  }

  async getDataResidencyLogs(tenantId: string, filters?: { dataType?: string; storageLocation?: string }): Promise<DataResidencyLog[]> {
    const conditions = [eq(dataResidencyLogs.tenantId, tenantId)];
    
    if (filters?.dataType) {
      conditions.push(eq(dataResidencyLogs.dataType, filters.dataType));
    }
    if (filters?.storageLocation) {
      conditions.push(eq(dataResidencyLogs.storageLocation, filters.storageLocation));
    }

    return db.select().from(dataResidencyLogs).where(and(...conditions)).orderBy(desc(dataResidencyLogs.createdAt));
  }

  checkDataResidencyCompliance(
    dataType: string,
    storageLocation: string,
    isUaeResident: boolean
  ): { compliant: boolean; warnings: string[]; requirements: string[] } {
    const warnings: string[] = [];
    const requirements: string[] = [];
    let compliant = true;

    const sensitiveTypes = ["personal", "financial", "health", "government"];
    
    if (sensitiveTypes.includes(dataType) && storageLocation !== "uae") {
      if (isUaeResident) {
        compliant = false;
        requirements.push(`${dataType} data for UAE residents should be stored in UAE`);
      } else {
        warnings.push(`${dataType} data stored outside UAE requires additional compliance measures`);
      }
    }

    if (dataType === "government" && storageLocation !== "uae") {
      compliant = false;
      requirements.push("Government-related data must be stored within UAE");
    }

    if (storageLocation === "international" && isUaeResident) {
      warnings.push("Cross-border data transfer requires explicit consent");
      requirements.push("Obtain data subject consent for international transfer");
    }

    return { compliant, warnings, requirements };
  }

  async getComplianceSettings(tenantId: string): Promise<UaeComplianceSettings | null> {
    const [settings] = await db
      .select()
      .from(uaeComplianceSettings)
      .where(eq(uaeComplianceSettings.tenantId, tenantId));
    return settings || null;
  }

  async createOrUpdateComplianceSettings(data: InsertUaeComplianceSettings): Promise<UaeComplianceSettings | null> {
    const existing = await this.getComplianceSettings(data.tenantId);
    
    if (existing) {
      const [updated] = await db
        .update(uaeComplianceSettings)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(uaeComplianceSettings.tenantId, data.tenantId))
        .returning();
      return updated;
    }

    const [created] = await db.insert(uaeComplianceSettings).values(data).returning();
    return created;
  }

  validateEmiratesId(emiratesId: string): { valid: boolean; error?: string; details?: any } {
    const cleanId = emiratesId.replace(/[-\s]/g, "");
    
    if (!/^\d{15}$/.test(cleanId)) {
      return { valid: false, error: "Emirates ID must be exactly 15 digits" };
    }

    if (!cleanId.startsWith("784")) {
      return { valid: false, error: "Emirates ID must start with 784 (UAE country code)" };
    }

    const yearDigits = cleanId.substring(3, 7);
    const year = parseInt(yearDigits);
    const currentYear = new Date().getFullYear();
    
    if (year < 1900 || year > currentYear + 1) {
      return { valid: false, error: "Invalid year in Emirates ID" };
    }

    return {
      valid: true,
      details: {
        emiratesId: cleanId,
        formatted: this.formatEmiratesId(cleanId),
        birthYear: yearDigits,
      },
    };
  }

  formatEmiratesId(emiratesId: string): string {
    const clean = emiratesId.replace(/[-\s]/g, "");
    return `${clean.slice(0, 3)}-${clean.slice(3, 7)}-${clean.slice(7, 14)}-${clean.slice(14)}`;
  }

  maskEmiratesId(emiratesId: string): string {
    const clean = emiratesId.replace(/[-\s]/g, "");
    return `784-XXXX-XXXXXXX-${clean.slice(-1)}`;
  }

  getUaeComplianceChecklist(): { category: string; items: any[] }[] {
    return [
      {
        category: "VAT Compliance",
        items: [
          { id: "vat_registration", title: "Register for VAT with FTA", priority: "critical", mandatory: true },
          { id: "vat_invoicing", title: "Issue VAT-compliant tax invoices", priority: "critical", mandatory: true },
          { id: "vat_return", title: "File VAT returns (monthly/quarterly)", priority: "high", mandatory: true },
          { id: "vat_records", title: "Maintain VAT records for 5 years", priority: "high", mandatory: true },
          { id: "trn_display", title: "Display TRN on all invoices", priority: "critical", mandatory: true },
          { id: "reverse_charge", title: "Apply reverse charge for imports", priority: "medium", mandatory: false },
        ],
      },
      {
        category: "TRA Messaging Compliance",
        items: [
          { id: "tra_registration", title: "Register with Telecom Regulatory Authority", priority: "critical", mandatory: true },
          { id: "sender_id", title: "Register sender IDs for SMS/WhatsApp", priority: "critical", mandatory: true },
          { id: "template_approval", title: "Get TRA approval for message templates", priority: "high", mandatory: true },
          { id: "opt_out", title: "Provide opt-out mechanism in messages", priority: "high", mandatory: true },
          { id: "content_restrictions", title: "Follow TRA content restrictions", priority: "high", mandatory: true },
        ],
      },
      {
        category: "Data Residency & Protection",
        items: [
          { id: "data_localization", title: "Store UAE resident data within UAE", priority: "high", mandatory: false },
          { id: "consent_management", title: "Obtain explicit consent for data processing", priority: "high", mandatory: true },
          { id: "data_classification", title: "Classify data by sensitivity level", priority: "medium", mandatory: true },
          { id: "cross_border", title: "Document cross-border data transfers", priority: "medium", mandatory: false },
          { id: "retention_policy", title: "Define data retention policies", priority: "medium", mandatory: true },
          { id: "breach_notification", title: "Implement breach notification process", priority: "high", mandatory: true },
        ],
      },
      {
        category: "Arabic Language Support",
        items: [
          { id: "arabic_invoices", title: "Provide Arabic language invoices (optional)", priority: "low", mandatory: false },
          { id: "arabic_communications", title: "Support Arabic in customer communications", priority: "low", mandatory: false },
          { id: "rtl_support", title: "Enable RTL (right-to-left) display support", priority: "low", mandatory: false },
          { id: "bilingual_contracts", title: "Prepare bilingual contracts where needed", priority: "low", mandatory: false },
        ],
      },
    ];
  }

  translateToArabic(text: string): { original: string; arabic: string; note: string } {
    const commonTranslations: Record<string, string> = {
      "Invoice": "فاتورة",
      "Tax Invoice": "فاتورة ضريبية",
      "Date": "التاريخ",
      "Invoice Number": "رقم الفاتورة",
      "Customer": "العميل",
      "Description": "الوصف",
      "Quantity": "الكمية",
      "Unit Price": "سعر الوحدة",
      "Amount": "المبلغ",
      "VAT": "ضريبة القيمة المضافة",
      "Total": "المجموع",
      "Subtotal": "المجموع الفرعي",
      "Tax Registration Number": "رقم التسجيل الضريبي",
      "Payment Terms": "شروط الدفع",
      "Due Date": "تاريخ الاستحقاق",
      "Thank you for your business": "شكرا لتعاملكم معنا",
    };

    return {
      original: text,
      arabic: commonTranslations[text] || text,
      note: commonTranslations[text] ? "Translation available" : "Translation not available - please provide",
    };
  }
}

export const uaeComplianceService = new UaeComplianceService();
