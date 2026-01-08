/**
 * Real Estate Module Notification Adapter
 * 
 * Provides notification handling for the Real Estate module:
 * - Site visit reminders
 * - Inquiry notifications
 * - Commission/invoice notifications
 * 
 * @module server/services/realestate-notification-adapter
 */

import {
  INotificationAdapter,
  NotificationEventType,
  NotificationChannel,
  NotificationVariables,
  baseNotificationService,
} from "./base-notification";

class RealEstateNotificationAdapter implements INotificationAdapter {
  getModuleName(): string {
    return "realestate";
  }

  mapEventToLegacyType(eventType: NotificationEventType): string {
    const mapping: Partial<Record<NotificationEventType, string>> = {
      APPOINTMENT_CREATED: "site_visit_scheduled",
      APPOINTMENT_REMINDER: "site_visit_reminder",
      APPOINTMENT_CANCELLED: "site_visit_cancelled",
      INVOICE_CREATED: "commission_invoice_created",
      PAYMENT_RECEIVED: "commission_payment_received",
    };
    return mapping[eventType] || "custom";
  }

  buildVariables(data: Record<string, unknown>): NotificationVariables {
    return {
      customerName: String(data.clientName || "Client"),
      agentName: String(data.agentName || ""),
      invoiceNumber: String(data.invoiceNumber || ""),
      totalAmount: String(data.totalAmount || "0"),
      currency: String(data.currency || "INR"),
      tenantName: String(data.agencyName || ""),
      propertyTitle: String(data.propertyTitle || ""),
      propertyAddress: String(data.propertyAddress || ""),
      visitDate: String(data.visitDate || ""),
      visitTime: String(data.visitTime || ""),
      listingType: String(data.listingType || ""),
      price: String(data.price || "0"),
      commissionAmount: String(data.commissionAmount || "0"),
    };
  }

  getDefaultChannels(eventType: NotificationEventType): NotificationChannel[] {
    switch (eventType) {
      case "APPOINTMENT_REMINDER":
        return ["email", "whatsapp"];
      case "APPOINTMENT_CREATED":
        return ["email", "whatsapp"];
      case "INVOICE_CREATED":
      case "PAYMENT_RECEIVED":
        return ["email"];
      default:
        return ["email"];
    }
  }
}

export const realestateNotificationAdapter = new RealEstateNotificationAdapter();

export function registerRealEstateNotificationAdapter(): void {
  baseNotificationService.registerAdapter(realestateNotificationAdapter);
}

export async function sendSiteVisitReminder(
  tenantId: string,
  visitData: {
    clientName: string;
    clientEmail?: string;
    clientPhone?: string;
    agentName?: string;
    propertyTitle?: string;
    propertyAddress?: string;
    visitDate: string;
    visitTime?: string;
    visitId: string;
  }
): Promise<void> {
  const variables = realestateNotificationAdapter.buildVariables({
    clientName: visitData.clientName,
    agentName: visitData.agentName,
    propertyTitle: visitData.propertyTitle,
    propertyAddress: visitData.propertyAddress,
    visitDate: visitData.visitDate,
    visitTime: visitData.visitTime,
  });

  await baseNotificationService.dispatch({
    tenantId,
    eventType: "APPOINTMENT_REMINDER",
    channels: realestateNotificationAdapter.getDefaultChannels("APPOINTMENT_REMINDER"),
    recipient: {
      name: visitData.clientName,
      email: visitData.clientEmail,
      phone: visitData.clientPhone,
    },
    variables,
    referenceId: visitData.visitId,
    referenceType: "site_visit",
    moduleContext: "realestate",
  });
}

export async function sendInquiryNotification(
  tenantId: string,
  inquiryData: {
    agentName: string;
    agentEmail?: string;
    clientName: string;
    propertyTitle: string;
    listingType?: string;
    inquiryId: string;
  }
): Promise<void> {
  const variables = realestateNotificationAdapter.buildVariables({
    agentName: inquiryData.agentName,
    clientName: inquiryData.clientName,
    propertyTitle: inquiryData.propertyTitle,
    listingType: inquiryData.listingType,
  });

  await baseNotificationService.dispatch({
    tenantId,
    eventType: "CUSTOM",
    channels: ["email"],
    recipient: {
      name: inquiryData.agentName,
      email: inquiryData.agentEmail,
    },
    variables,
    referenceId: inquiryData.inquiryId,
    referenceType: "inquiry",
    moduleContext: "realestate",
  });
}

export async function sendCommissionInvoiceNotification(
  tenantId: string,
  invoiceData: {
    agentName: string;
    agentEmail?: string;
    invoiceNumber: string;
    commissionAmount: string;
    currency: string;
    propertyTitle?: string;
    invoiceId: string;
  }
): Promise<void> {
  const variables = realestateNotificationAdapter.buildVariables({
    agentName: invoiceData.agentName,
    invoiceNumber: invoiceData.invoiceNumber,
    commissionAmount: invoiceData.commissionAmount,
    totalAmount: invoiceData.commissionAmount,
    currency: invoiceData.currency,
    propertyTitle: invoiceData.propertyTitle,
  });

  await baseNotificationService.dispatch({
    tenantId,
    eventType: "INVOICE_CREATED",
    channels: realestateNotificationAdapter.getDefaultChannels("INVOICE_CREATED"),
    recipient: {
      name: invoiceData.agentName,
      email: invoiceData.agentEmail,
    },
    variables,
    referenceId: invoiceData.invoiceId,
    referenceType: "commission_invoice",
    moduleContext: "realestate",
  });
}
