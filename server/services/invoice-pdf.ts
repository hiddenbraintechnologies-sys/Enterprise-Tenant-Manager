import PDFDocument from "pdfkit";
import { db } from "../db";
import {
  furnitureInvoices,
  furnitureInvoiceItems,
  tenantBranding,
  tenants,
} from "@shared/schema";
import { eq } from "drizzle-orm";
import { currencyService } from "./currency";
import { Readable } from "stream";

export interface InvoicePDFData {
  invoice: {
    id: string;
    invoiceNumber: string;
    invoiceType: string;
    status: string;
    invoiceDate: Date;
    dueDate: Date | null;
    currency: string;
    baseCurrency: string;
    exchangeRate: number;
    subtotal: number;
    discountAmount: number;
    deliveryCharges: number;
    installationCharges: number;
    taxAmount: number;
    totalAmount: number;
    paidAmount: number;
    balanceAmount: number;
    taxMetadata: Record<string, unknown>;
    billingName: string | null;
    billingAddress: string | null;
    billingCity: string | null;
    billingState: string | null;
    billingPostalCode: string | null;
    billingCountry: string | null;
    billingEmail: string | null;
    billingPhone: string | null;
    customerTaxId: string | null;
    customerTaxIdType: string | null;
    tenantTaxId: string | null;
    tenantTaxIdType: string | null;
    tenantBusinessName: string | null;
    tenantAddress: string | null;
    notes: string | null;
    termsAndConditions: string | null;
    complianceCountry: string | null;
  };
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    discountAmount: number;
    taxRate: number;
    taxAmount: number;
    totalPrice: number;
    hsnCode: string | null;
    taxBreakdown: Record<string, unknown>;
  }>;
  branding: {
    logoUrl: string | null;
    primaryColor: string;
    secondaryColor: string;
    fontFamily: string;
    emailFromName: string | null;
    supportEmail: string | null;
    supportPhone: string | null;
  } | null;
  tenant: {
    name: string;
    address: string | null;
  };
}

class InvoicePDFService {
  async generateInvoicePDF(invoiceId: string): Promise<Buffer> {
    const data = await this.fetchInvoiceData(invoiceId);
    if (!data) {
      throw new Error("Invoice not found");
    }

    return this.createPDF(data);
  }

  async fetchInvoiceData(invoiceId: string): Promise<InvoicePDFData | null> {
    const invoiceResult = await db
      .select()
      .from(furnitureInvoices)
      .where(eq(furnitureInvoices.id, invoiceId))
      .limit(1);

    if (invoiceResult.length === 0) {
      return null;
    }

    const invoice = invoiceResult[0];

    const itemsResult = await db
      .select()
      .from(furnitureInvoiceItems)
      .where(eq(furnitureInvoiceItems.invoiceId, invoiceId))
      .orderBy(furnitureInvoiceItems.sortOrder);

    const brandingResult = await db
      .select()
      .from(tenantBranding)
      .where(eq(tenantBranding.tenantId, invoice.tenantId))
      .limit(1);

    const tenantResult = await db
      .select()
      .from(tenants)
      .where(eq(tenants.id, invoice.tenantId))
      .limit(1);

    const branding = brandingResult[0];
    const tenant = tenantResult[0];

    return {
      invoice: {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        invoiceType: invoice.invoiceType,
        status: invoice.status,
        invoiceDate: invoice.invoiceDate,
        dueDate: invoice.dueDate,
        currency: invoice.currency,
        baseCurrency: invoice.baseCurrency,
        exchangeRate: parseFloat(invoice.exchangeRate),
        subtotal: parseFloat(invoice.subtotal),
        discountAmount: parseFloat(invoice.discountAmount || "0"),
        deliveryCharges: parseFloat(invoice.deliveryCharges || "0"),
        installationCharges: parseFloat(invoice.installationCharges || "0"),
        taxAmount: parseFloat(invoice.taxAmount || "0"),
        totalAmount: parseFloat(invoice.totalAmount),
        paidAmount: parseFloat(invoice.paidAmount || "0"),
        balanceAmount: parseFloat(invoice.balanceAmount || "0"),
        taxMetadata: (invoice.taxMetadata as Record<string, unknown>) || {},
        billingName: invoice.billingName,
        billingAddress: invoice.billingAddress,
        billingCity: invoice.billingCity,
        billingState: invoice.billingState,
        billingPostalCode: invoice.billingPostalCode,
        billingCountry: invoice.billingCountry,
        billingEmail: invoice.billingEmail,
        billingPhone: invoice.billingPhone,
        customerTaxId: invoice.customerTaxId,
        customerTaxIdType: invoice.customerTaxIdType,
        tenantTaxId: invoice.tenantTaxId,
        tenantTaxIdType: invoice.tenantTaxIdType,
        tenantBusinessName: invoice.tenantBusinessName,
        tenantAddress: invoice.tenantAddress,
        notes: invoice.notes,
        termsAndConditions: invoice.termsAndConditions,
        complianceCountry: invoice.complianceCountry,
      },
      items: itemsResult.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: parseFloat(item.unitPrice),
        discountAmount: parseFloat(item.discountAmount || "0"),
        taxRate: parseFloat(item.taxRate || "0"),
        taxAmount: parseFloat(item.taxAmount || "0"),
        totalPrice: parseFloat(item.totalPrice),
        hsnCode: item.hsnCode,
        taxBreakdown: (item.taxBreakdown as Record<string, unknown>) || {},
      })),
      branding: branding
        ? {
            logoUrl: branding.logoUrl,
            primaryColor: branding.primaryColor || "#3B82F6",
            secondaryColor: branding.secondaryColor || "#1E40AF",
            fontFamily: branding.fontFamily || "Helvetica",
            emailFromName: branding.emailFromName,
            supportEmail: branding.supportEmail,
            supportPhone: branding.supportPhone,
          }
        : null,
      tenant: {
        name: tenant?.name || "Business",
        address: null,
      },
    };
  }

  private async createPDF(data: InvoicePDFData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: "A4",
        margin: 50,
        info: {
          Title: `Invoice ${data.invoice.invoiceNumber}`,
          Author: data.tenant.name,
        },
      });

      const chunks: Buffer[] = [];
      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      const primaryColor = data.branding?.primaryColor || "#3B82F6";
      const currency = data.invoice.currency;

      this.drawHeader(doc, data, primaryColor);
      this.drawAddresses(doc, data);
      this.drawInvoiceDetails(doc, data, primaryColor);
      let currentY = this.drawItemsTable(doc, data, currency);
      currentY = this.drawTotals(doc, data, currency, primaryColor, currentY);
      currentY = this.drawTaxBreakdown(doc, data, currency, currentY);
      currentY = this.drawPaymentStatus(doc, data, currency, currentY);
      this.drawFooter(doc, data, currentY);

      doc.end();
    });
  }

  private drawHeader(
    doc: PDFKit.PDFDocument,
    data: InvoicePDFData,
    primaryColor: string
  ): void {
    doc.fontSize(24).fillColor(primaryColor).text(data.tenant.name, 50, 50);

    doc
      .fontSize(10)
      .fillColor("#666666")
      .text(data.invoice.tenantBusinessName || data.tenant.name, 50, 80);

    if (data.invoice.tenantAddress) {
      doc.text(data.invoice.tenantAddress, 50, 95);
    }

    if (data.invoice.tenantTaxId) {
      const taxLabel = this.getTaxIdLabel(data.invoice.tenantTaxIdType);
      doc.text(`${taxLabel}: ${data.invoice.tenantTaxId}`, 50, 125);
    }

    doc
      .fontSize(28)
      .fillColor(primaryColor)
      .text(this.getInvoiceTypeLabel(data.invoice.invoiceType), 400, 50, {
        align: "right",
      });

    doc
      .fontSize(12)
      .fillColor("#333333")
      .text(`#${data.invoice.invoiceNumber}`, 400, 85, { align: "right" });
  }

  private drawAddresses(doc: PDFKit.PDFDocument, data: InvoicePDFData): void {
    const startY = 160;

    doc.fontSize(11).fillColor("#333333").text("BILL TO:", 50, startY);

    doc.fontSize(10).fillColor("#666666");

    let y = startY + 15;
    if (data.invoice.billingName) {
      doc.fillColor("#333333").text(data.invoice.billingName, 50, y);
      y += 15;
    }

    if (data.invoice.billingAddress) {
      doc.fillColor("#666666").text(data.invoice.billingAddress, 50, y);
      y += 12;
    }

    const cityStateZip = [
      data.invoice.billingCity,
      data.invoice.billingState,
      data.invoice.billingPostalCode,
    ]
      .filter(Boolean)
      .join(", ");

    if (cityStateZip) {
      doc.text(cityStateZip, 50, y);
      y += 12;
    }

    if (data.invoice.billingCountry) {
      doc.text(data.invoice.billingCountry, 50, y);
      y += 12;
    }

    if (data.invoice.customerTaxId) {
      const taxLabel = this.getTaxIdLabel(data.invoice.customerTaxIdType);
      doc.text(`${taxLabel}: ${data.invoice.customerTaxId}`, 50, y);
    }
  }

  private drawInvoiceDetails(
    doc: PDFKit.PDFDocument,
    data: InvoicePDFData,
    primaryColor: string
  ): void {
    const startX = 350;
    const startY = 160;

    doc.fontSize(10).fillColor("#666666");

    const details = [
      { label: "Invoice Date:", value: this.formatDate(data.invoice.invoiceDate) },
      {
        label: "Due Date:",
        value: data.invoice.dueDate
          ? this.formatDate(data.invoice.dueDate)
          : "Upon Receipt",
      },
      { label: "Currency:", value: data.invoice.currency },
    ];

    if (data.invoice.currency !== data.invoice.baseCurrency) {
      details.push({
        label: "Exchange Rate:",
        value: `1 ${data.invoice.currency} = ${data.invoice.exchangeRate.toFixed(4)} ${data.invoice.baseCurrency}`,
      });
    }

    details.forEach((detail, index) => {
      const y = startY + index * 18;
      doc.text(detail.label, startX, y);
      doc.fillColor("#333333").text(detail.value, startX + 100, y);
      doc.fillColor("#666666");
    });

    const statusY = startY + details.length * 18 + 10;
    const statusColor = this.getStatusColor(data.invoice.status);
    doc
      .roundedRect(startX, statusY, 120, 25, 3)
      .fill(statusColor);
    doc
      .fontSize(10)
      .fillColor("#FFFFFF")
      .text(data.invoice.status.toUpperCase(), startX + 10, statusY + 7, {
        width: 100,
        align: "center",
      });
  }

  private drawItemsTable(
    doc: PDFKit.PDFDocument,
    data: InvoicePDFData,
    currency: string
  ): number {
    const tableTop = 290;
    const tableLeft = 50;
    const colWidths = { desc: 200, qty: 50, price: 80, tax: 60, total: 90 };

    doc.rect(tableLeft, tableTop, 500, 25).fill("#F3F4F6");

    doc
      .fontSize(9)
      .fillColor("#333333")
      .text("Description", tableLeft + 10, tableTop + 8)
      .text("Qty", tableLeft + colWidths.desc + 10, tableTop + 8)
      .text("Unit Price", tableLeft + colWidths.desc + colWidths.qty + 10, tableTop + 8)
      .text("Tax", tableLeft + colWidths.desc + colWidths.qty + colWidths.price + 10, tableTop + 8)
      .text("Total", tableLeft + colWidths.desc + colWidths.qty + colWidths.price + colWidths.tax + 10, tableTop + 8);

    let y = tableTop + 30;
    doc.fillColor("#666666");

    data.items.forEach((item, index) => {
      if (y > 700) {
        doc.addPage();
        y = 50;
      }

      if (index % 2 === 0) {
        doc.rect(tableLeft, y - 5, 500, 25).fill("#FAFAFA");
      }

      doc.fillColor("#333333").fontSize(9);
      
      const descLines = doc.heightOfString(item.description, { width: colWidths.desc - 20 });
      const lineHeight = Math.max(20, descLines + 10);

      doc.text(item.description, tableLeft + 10, y, { width: colWidths.desc - 20 });
      doc.text(item.quantity.toString(), tableLeft + colWidths.desc + 10, y);
      doc.text(
        this.formatMoney(item.unitPrice, currency),
        tableLeft + colWidths.desc + colWidths.qty + 10,
        y
      );
      doc.text(
        `${item.taxRate}%`,
        tableLeft + colWidths.desc + colWidths.qty + colWidths.price + 10,
        y
      );
      doc.text(
        this.formatMoney(item.totalPrice, currency),
        tableLeft + colWidths.desc + colWidths.qty + colWidths.price + colWidths.tax + 10,
        y
      );

      y += lineHeight;
    });

    return y;
  }

  private drawTotals(
    doc: PDFKit.PDFDocument,
    data: InvoicePDFData,
    currency: string,
    primaryColor: string,
    startY: number
  ): number {
    const startX = 350;
    let y = startY + 20;

    const totals = [
      { label: "Subtotal:", value: data.invoice.subtotal },
    ];

    if (data.invoice.discountAmount > 0) {
      totals.push({ label: "Discount:", value: -data.invoice.discountAmount });
    }

    if (data.invoice.deliveryCharges > 0) {
      totals.push({ label: "Delivery Charges:", value: data.invoice.deliveryCharges });
    }

    if (data.invoice.installationCharges > 0) {
      totals.push({ label: "Installation Charges:", value: data.invoice.installationCharges });
    }

    if (data.invoice.taxAmount > 0) {
      totals.push({ label: "Tax:", value: data.invoice.taxAmount });
    }

    doc.fontSize(10).fillColor("#666666");

    totals.forEach((item) => {
      doc.text(item.label, startX, y);
      doc.fillColor("#333333").text(
        this.formatMoney(item.value, currency),
        startX + 100,
        y,
        { align: "right", width: 100 }
      );
      doc.fillColor("#666666");
      y += 18;
    });

    y += 5;
    doc.rect(startX, y, 200, 30).fill(primaryColor);

    doc
      .fontSize(11)
      .fillColor("#FFFFFF")
      .text("TOTAL:", startX + 10, y + 9)
      .text(this.formatMoney(data.invoice.totalAmount, currency), startX + 90, y + 9, {
        align: "right",
        width: 100,
      });

    return y + 40;
  }

  private drawTaxBreakdown(
    doc: PDFKit.PDFDocument,
    data: InvoicePDFData,
    currency: string,
    startY: number
  ): number {
    const taxMetadata = data.invoice.taxMetadata;
    if (!taxMetadata || Object.keys(taxMetadata).length === 0) return startY;

    let y = startY + 10;

    doc.fontSize(10).fillColor("#333333").text("Tax Breakdown:", 50, y);
    y += 15;

    doc.fontSize(9).fillColor("#666666");

    const breakdown = taxMetadata.breakdown as Array<{
      taxName: string;
      rate: number;
      taxAmount: number;
    }>;

    if (breakdown && Array.isArray(breakdown)) {
      breakdown.forEach((item) => {
        doc.text(`${item.taxName} (${item.rate}%): ${this.formatMoney(item.taxAmount, currency)}`, 50, y);
        y += 14;
      });
    }

    return y;
  }

  private drawPaymentStatus(
    doc: PDFKit.PDFDocument,
    data: InvoicePDFData,
    currency: string,
    startY: number
  ): number {
    let y = startY + 20;

    if (y > 750) {
      doc.addPage();
      y = 50;
    }

    doc.fontSize(10).fillColor("#333333").text("Payment Status:", 50, y);
    y += 15;

    doc.fontSize(9).fillColor("#666666");
    doc.text(`Amount Paid: ${this.formatMoney(data.invoice.paidAmount, currency)}`, 50, y);
    y += 14;
    doc.text(`Balance Due: ${this.formatMoney(data.invoice.balanceAmount, currency)}`, 50, y);

    return y + 20;
  }

  private drawFooter(doc: PDFKit.PDFDocument, data: InvoicePDFData, startY: number): void {
    let y = startY + 20;

    if (y > 700) {
      doc.addPage();
      y = 50;
    }

    if (data.invoice.notes) {
      doc.fontSize(10).fillColor("#333333").text("Notes:", 50, y);
      y += 15;
      doc.fontSize(9).fillColor("#666666").text(data.invoice.notes, 50, y, { width: 500 });
      y += doc.heightOfString(data.invoice.notes, { width: 500 }) + 15;
    }

    if (data.invoice.termsAndConditions) {
      doc.fontSize(10).fillColor("#333333").text("Terms & Conditions:", 50, y);
      y += 15;
      doc
        .fontSize(8)
        .fillColor("#888888")
        .text(data.invoice.termsAndConditions, 50, y, { width: 500 });
    }

    const pageHeight = doc.page.height;
    doc
      .fontSize(8)
      .fillColor("#999999")
      .text(
        `Generated on ${new Date().toISOString().split("T")[0]}`,
        50,
        pageHeight - 50,
        { align: "center", width: 500 }
      );
  }

  private formatMoney(amount: number, currency: string): string {
    return currencyService.formatAmount(amount, currency);
  }

  private formatDate(date: Date): string {
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  private getTaxIdLabel(type: string | null): string {
    const labels: Record<string, string> = {
      gstin: "GSTIN",
      trn: "TRN",
      vat: "VAT Number",
      sst: "SST Number",
      ein: "EIN",
    };
    return labels[type || ""] || "Tax ID";
  }

  private getInvoiceTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      proforma: "PROFORMA INVOICE",
      tax_invoice: "TAX INVOICE",
      delivery_challan: "DELIVERY CHALLAN",
      advance_receipt: "ADVANCE RECEIPT",
      final_invoice: "INVOICE",
    };
    return labels[type] || "INVOICE";
  }

  private getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      draft: "#6B7280",
      issued: "#3B82F6",
      partially_paid: "#F59E0B",
      paid: "#10B981",
      overdue: "#EF4444",
      cancelled: "#9CA3AF",
      refunded: "#8B5CF6",
    };
    return colors[status] || "#6B7280";
  }

  async generatePDFStream(invoiceId: string): Promise<Readable> {
    const buffer = await this.generateInvoicePDF(invoiceId);
    const readable = new Readable();
    readable.push(buffer);
    readable.push(null);
    return readable;
  }
}

export const invoicePDFService = new InvoicePDFService();
