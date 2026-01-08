/**
 * Legal Services Notification Adapter
 * 
 * Provides notification handling for the Legal Services module:
 * - Appointment reminders
 * - Invoice notifications
 * - Payment confirmations
 * 
 * @module server/services/legal-notification-adapter
 */

import {
  INotificationAdapter,
  NotificationEventType,
  NotificationChannel,
  NotificationVariables,
  baseNotificationService,
} from "./base-notification";

class LegalNotificationAdapter implements INotificationAdapter {
  getModuleName(): string {
    return "legal";
  }

  mapEventToLegacyType(eventType: NotificationEventType): string {
    const mapping: Partial<Record<NotificationEventType, string>> = {
      INVOICE_CREATED: "invoice_created",
      INVOICE_ISSUED: "invoice_issued",
      PAYMENT_REMINDER: "payment_reminder",
      PAYMENT_RECEIVED: "payment_received",
      PAYMENT_PARTIAL: "payment_partial",
      INVOICE_OVERDUE: "invoice_overdue",
      INVOICE_CANCELLED: "invoice_cancelled",
      APPOINTMENT_CREATED: "legal_appointment_created",
      APPOINTMENT_REMINDER: "legal_appointment_reminder",
      APPOINTMENT_CANCELLED: "legal_appointment_cancelled",
    };
    return mapping[eventType] || "custom";
  }

  buildVariables(data: Record<string, unknown>): NotificationVariables {
    return {
      customerName: String(data.clientName || "Valued Client"),
      invoiceNumber: String(data.invoiceNumber || ""),
      totalAmount: String(data.totalAmount || "0"),
      currency: String(data.currency || "INR"),
      dueDate: String(data.dueDate || ""),
      taxAmount: String(data.taxAmount || "0"),
      paidAmount: String(data.paidAmount || "0"),
      balanceAmount: String(data.balanceAmount || "0"),
      tenantName: String(data.tenantName || ""),
      appointmentDate: String(data.appointmentDate || ""),
      appointmentTime: String(data.appointmentTime || ""),
      caseName: String(data.caseName || ""),
      lawyerName: String(data.lawyerName || ""),
      location: String(data.location || ""),
    };
  }

  getDefaultChannels(eventType: NotificationEventType): NotificationChannel[] {
    switch (eventType) {
      case "APPOINTMENT_REMINDER":
        return ["email", "whatsapp"];
      case "INVOICE_OVERDUE":
      case "PAYMENT_REMINDER":
        return ["email", "whatsapp"];
      case "PAYMENT_RECEIVED":
        return ["email"];
      default:
        return ["email"];
    }
  }
}

export const legalNotificationAdapter = new LegalNotificationAdapter();

export function registerLegalNotificationAdapter(): void {
  baseNotificationService.registerAdapter(legalNotificationAdapter);
}

export async function sendLegalAppointmentReminder(
  tenantId: string,
  appointmentData: {
    clientName: string;
    clientEmail?: string;
    clientPhone?: string;
    appointmentDate: string;
    appointmentTime: string;
    caseName?: string;
    lawyerName?: string;
    location?: string;
  }
): Promise<void> {
  const variables = legalNotificationAdapter.buildVariables({
    clientName: appointmentData.clientName,
    appointmentDate: appointmentData.appointmentDate,
    appointmentTime: appointmentData.appointmentTime,
    caseName: appointmentData.caseName,
    lawyerName: appointmentData.lawyerName,
    location: appointmentData.location,
  });

  await baseNotificationService.dispatch({
    tenantId,
    eventType: "APPOINTMENT_REMINDER",
    channels: legalNotificationAdapter.getDefaultChannels("APPOINTMENT_REMINDER"),
    recipient: {
      name: appointmentData.clientName,
      email: appointmentData.clientEmail,
      phone: appointmentData.clientPhone,
    },
    variables,
    referenceType: "legal_appointment",
    moduleContext: "legal",
  });
}

export async function sendLegalInvoiceNotification(
  tenantId: string,
  eventType: NotificationEventType,
  invoiceData: {
    clientName: string;
    clientEmail?: string;
    clientPhone?: string;
    invoiceNumber: string;
    totalAmount: string;
    currency: string;
    dueDate?: string;
    paidAmount?: string;
    balanceAmount?: string;
    invoiceId: string;
  }
): Promise<void> {
  const variables = legalNotificationAdapter.buildVariables({
    clientName: invoiceData.clientName,
    invoiceNumber: invoiceData.invoiceNumber,
    totalAmount: invoiceData.totalAmount,
    currency: invoiceData.currency,
    dueDate: invoiceData.dueDate,
    paidAmount: invoiceData.paidAmount,
    balanceAmount: invoiceData.balanceAmount,
  });

  await baseNotificationService.dispatch({
    tenantId,
    eventType,
    channels: legalNotificationAdapter.getDefaultChannels(eventType),
    recipient: {
      name: invoiceData.clientName,
      email: invoiceData.clientEmail,
      phone: invoiceData.clientPhone,
    },
    variables,
    referenceId: invoiceData.invoiceId,
    referenceType: "legal_invoice",
    moduleContext: "legal",
  });
}
