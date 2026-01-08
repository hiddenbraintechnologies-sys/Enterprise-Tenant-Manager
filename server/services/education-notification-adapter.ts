/**
 * Education Module Notification Adapter
 * 
 * Provides notification handling for the Education module:
 * - Fee reminders
 * - Payment confirmations
 * - Class notifications
 * 
 * @module server/services/education-notification-adapter
 */

import {
  INotificationAdapter,
  NotificationEventType,
  NotificationChannel,
  NotificationVariables,
  baseNotificationService,
} from "./base-notification";

class EducationNotificationAdapter implements INotificationAdapter {
  getModuleName(): string {
    return "education";
  }

  mapEventToLegacyType(eventType: NotificationEventType): string {
    const mapping: Partial<Record<NotificationEventType, string>> = {
      INVOICE_CREATED: "fee_created",
      PAYMENT_REMINDER: "fee_reminder",
      PAYMENT_RECEIVED: "fee_payment_received",
      INVOICE_OVERDUE: "fee_overdue",
    };
    return mapping[eventType] || "custom";
  }

  buildVariables(data: Record<string, unknown>): NotificationVariables {
    return {
      customerName: String(data.studentName || "Student"),
      parentName: String(data.parentName || ""),
      invoiceNumber: String(data.feeId || ""),
      totalAmount: String(data.totalAmount || "0"),
      currency: String(data.currency || "INR"),
      dueDate: String(data.dueDate || ""),
      paidAmount: String(data.paidAmount || "0"),
      balanceAmount: String(data.balanceAmount || "0"),
      tenantName: String(data.institutionName || ""),
      feeType: String(data.feeType || ""),
      courseName: String(data.courseName || ""),
      batchName: String(data.batchName || ""),
    };
  }

  getDefaultChannels(eventType: NotificationEventType): NotificationChannel[] {
    switch (eventType) {
      case "PAYMENT_REMINDER":
      case "INVOICE_OVERDUE":
        return ["email", "whatsapp"];
      case "PAYMENT_RECEIVED":
        return ["email"];
      default:
        return ["email"];
    }
  }
}

export const educationNotificationAdapter = new EducationNotificationAdapter();

export function registerEducationNotificationAdapter(): void {
  baseNotificationService.registerAdapter(educationNotificationAdapter);
}

export async function sendFeeReminder(
  tenantId: string,
  feeData: {
    studentName: string;
    parentName?: string;
    parentEmail?: string;
    parentPhone?: string;
    feeId: string;
    totalAmount: string;
    currency: string;
    dueDate: string;
    balanceAmount: string;
    feeType?: string;
  }
): Promise<void> {
  const variables = educationNotificationAdapter.buildVariables({
    studentName: feeData.studentName,
    parentName: feeData.parentName,
    feeId: feeData.feeId,
    totalAmount: feeData.totalAmount,
    currency: feeData.currency,
    dueDate: feeData.dueDate,
    balanceAmount: feeData.balanceAmount,
    feeType: feeData.feeType,
  });

  await baseNotificationService.dispatch({
    tenantId,
    eventType: "PAYMENT_REMINDER",
    channels: educationNotificationAdapter.getDefaultChannels("PAYMENT_REMINDER"),
    recipient: {
      name: feeData.parentName || feeData.studentName,
      email: feeData.parentEmail,
      phone: feeData.parentPhone,
    },
    variables,
    referenceId: feeData.feeId,
    referenceType: "fee",
    moduleContext: "education",
  });
}

export async function sendFeePaymentConfirmation(
  tenantId: string,
  paymentData: {
    studentName: string;
    parentName?: string;
    parentEmail?: string;
    parentPhone?: string;
    feeId: string;
    paymentAmount: string;
    totalAmount: string;
    balanceAmount: string;
    currency: string;
  }
): Promise<void> {
  const variables = educationNotificationAdapter.buildVariables({
    studentName: paymentData.studentName,
    parentName: paymentData.parentName,
    feeId: paymentData.feeId,
    totalAmount: paymentData.totalAmount,
    paidAmount: paymentData.paymentAmount,
    balanceAmount: paymentData.balanceAmount,
    currency: paymentData.currency,
  });

  await baseNotificationService.dispatch({
    tenantId,
    eventType: "PAYMENT_RECEIVED",
    channels: educationNotificationAdapter.getDefaultChannels("PAYMENT_RECEIVED"),
    recipient: {
      name: paymentData.parentName || paymentData.studentName,
      email: paymentData.parentEmail,
      phone: paymentData.parentPhone,
    },
    variables,
    referenceId: paymentData.feeId,
    referenceType: "fee",
    moduleContext: "education",
  });
}
