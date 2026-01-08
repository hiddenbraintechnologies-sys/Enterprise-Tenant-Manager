/**
 * Real Estate Module Notification Adapter
 * 
 * Provides notification handling for the Real Estate module:
 * - Commission notifications
 * - Deal closure notifications
 * - Lead follow-up reminders
 * 
 * @module server/services/real-estate-notification-adapter
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
    return "real_estate";
  }

  mapEventToLegacyType(eventType: NotificationEventType): string {
    const mapping: Partial<Record<NotificationEventType, string>> = {
      INVOICE_CREATED: "commission_created",
      PAYMENT_REMINDER: "commission_reminder",
      PAYMENT_RECEIVED: "commission_paid",
      INVOICE_OVERDUE: "commission_overdue",
    };
    return mapping[eventType] || "custom";
  }

  buildVariables(data: Record<string, unknown>): NotificationVariables {
    return {
      agentName: String(data.agentName || "Agent"),
      clientName: String(data.clientName || "Client"),
      propertyAddress: String(data.propertyAddress || ""),
      dealValue: String(data.dealValue || "0"),
      commissionAmount: String(data.commissionAmount || "0"),
      netAmount: String(data.netAmount || "0"),
      currency: String(data.currency || "INR"),
      commissionNumber: String(data.commissionNumber || ""),
      dealClosedDate: String(data.dealClosedDate || ""),
      paymentDueDate: String(data.paymentDueDate || ""),
      commissionType: String(data.commissionType || "sale"),
      tenantName: String(data.tenantName || ""),
    };
  }

  getDefaultChannels(eventType: NotificationEventType): NotificationChannel[] {
    switch (eventType) {
      case "PAYMENT_REMINDER":
      case "INVOICE_OVERDUE":
        return ["email", "whatsapp"];
      case "PAYMENT_RECEIVED":
        return ["email"];
      case "INVOICE_CREATED":
        return ["email"];
      default:
        return ["email"];
    }
  }
}

export const realEstateNotificationAdapter = new RealEstateNotificationAdapter();

export function registerRealEstateNotificationAdapter(): void {
  baseNotificationService.registerAdapter(realEstateNotificationAdapter);
}

export async function sendCommissionNotification(
  tenantId: string,
  commissionData: {
    agentName: string;
    agentEmail?: string;
    agentPhone?: string;
    clientName?: string;
    propertyAddress?: string;
    dealValue: string;
    commissionAmount: string;
    netAmount: string;
    currency: string;
    commissionNumber: string;
    dealClosedDate?: string;
    paymentDueDate?: string;
    commissionType?: string;
    tenantName?: string;
  },
  eventType: NotificationEventType = "INVOICE_CREATED"
): Promise<void> {
  const variables = realEstateNotificationAdapter.buildVariables({
    agentName: commissionData.agentName,
    clientName: commissionData.clientName,
    propertyAddress: commissionData.propertyAddress,
    dealValue: commissionData.dealValue,
    commissionAmount: commissionData.commissionAmount,
    netAmount: commissionData.netAmount,
    currency: commissionData.currency,
    commissionNumber: commissionData.commissionNumber,
    dealClosedDate: commissionData.dealClosedDate,
    paymentDueDate: commissionData.paymentDueDate,
    commissionType: commissionData.commissionType,
    tenantName: commissionData.tenantName,
  });

  await baseNotificationService.dispatch({
    tenantId,
    eventType,
    channels: realEstateNotificationAdapter.getDefaultChannels(eventType),
    recipient: {
      name: commissionData.agentName,
      email: commissionData.agentEmail,
      phone: commissionData.agentPhone,
    },
    variables,
    referenceId: commissionData.commissionNumber,
    referenceType: "commission",
    moduleContext: "real_estate",
  });
}

export async function sendDealClosedNotification(
  tenantId: string,
  dealData: {
    agentName: string;
    agentEmail?: string;
    agentPhone?: string;
    clientName: string;
    propertyAddress: string;
    dealValue: string;
    commissionAmount: string;
    currency: string;
    commissionNumber: string;
    dealClosedDate: string;
  }
): Promise<void> {
  const variables = realEstateNotificationAdapter.buildVariables({
    agentName: dealData.agentName,
    clientName: dealData.clientName,
    propertyAddress: dealData.propertyAddress,
    dealValue: dealData.dealValue,
    commissionAmount: dealData.commissionAmount,
    currency: dealData.currency,
    commissionNumber: dealData.commissionNumber,
    dealClosedDate: dealData.dealClosedDate,
  });

  await baseNotificationService.dispatch({
    tenantId,
    eventType: "INVOICE_CREATED",
    channels: ["email", "whatsapp"],
    recipient: {
      name: dealData.agentName,
      email: dealData.agentEmail,
      phone: dealData.agentPhone,
    },
    variables,
    referenceId: dealData.commissionNumber,
    referenceType: "commission",
    moduleContext: "real_estate",
  });
}
