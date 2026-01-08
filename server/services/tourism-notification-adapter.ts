/**
 * Tourism Module Notification Adapter
 * 
 * Provides notification handling for the Tourism module:
 * - Booking confirmations
 * - Booking reminders
 * - Payment notifications
 * 
 * @module server/services/tourism-notification-adapter
 */

import {
  INotificationAdapter,
  NotificationEventType,
  NotificationChannel,
  NotificationVariables,
  baseNotificationService,
} from "./base-notification";

class TourismNotificationAdapter implements INotificationAdapter {
  getModuleName(): string {
    return "tourism";
  }

  mapEventToLegacyType(eventType: NotificationEventType): string {
    const mapping: Partial<Record<NotificationEventType, string>> = {
      ORDER_CREATED: "booking_created",
      ORDER_UPDATED: "booking_updated",
      ORDER_COMPLETED: "booking_completed",
      PAYMENT_RECEIVED: "booking_payment_received",
      PAYMENT_REMINDER: "booking_payment_reminder",
    };
    return mapping[eventType] || "custom";
  }

  buildVariables(data: Record<string, unknown>): NotificationVariables {
    return {
      customerName: String(data.travelerName || "Traveler"),
      invoiceNumber: String(data.bookingNumber || ""),
      totalAmount: String(data.totalAmount || "0"),
      currency: String(data.currency || "INR"),
      dueDate: String(data.dueDate || ""),
      paidAmount: String(data.paidAmount || "0"),
      balanceAmount: String(data.balanceAmount || "0"),
      tenantName: String(data.agencyName || ""),
      packageName: String(data.packageName || ""),
      departureDate: String(data.departureDate || ""),
      returnDate: String(data.returnDate || ""),
      travelersCount: String(data.travelersCount || "1"),
      destination: String(data.destination || ""),
    };
  }

  getDefaultChannels(eventType: NotificationEventType): NotificationChannel[] {
    switch (eventType) {
      case "ORDER_CREATED":
      case "ORDER_COMPLETED":
        return ["email", "whatsapp"];
      case "PAYMENT_REMINDER":
        return ["email", "whatsapp"];
      case "PAYMENT_RECEIVED":
        return ["email"];
      default:
        return ["email"];
    }
  }
}

export const tourismNotificationAdapter = new TourismNotificationAdapter();

export function registerTourismNotificationAdapter(): void {
  baseNotificationService.registerAdapter(tourismNotificationAdapter);
}

export async function sendBookingConfirmation(
  tenantId: string,
  bookingData: {
    travelerName: string;
    travelerEmail?: string;
    travelerPhone?: string;
    bookingNumber: string;
    packageName?: string;
    totalAmount: string;
    currency: string;
    departureDate: string;
    destination?: string;
    travelersCount?: number;
  }
): Promise<void> {
  const variables = tourismNotificationAdapter.buildVariables({
    travelerName: bookingData.travelerName,
    bookingNumber: bookingData.bookingNumber,
    packageName: bookingData.packageName,
    totalAmount: bookingData.totalAmount,
    currency: bookingData.currency,
    departureDate: bookingData.departureDate,
    destination: bookingData.destination,
    travelersCount: bookingData.travelersCount?.toString(),
  });

  await baseNotificationService.dispatch({
    tenantId,
    eventType: "ORDER_CREATED",
    channels: tourismNotificationAdapter.getDefaultChannels("ORDER_CREATED"),
    recipient: {
      name: bookingData.travelerName,
      email: bookingData.travelerEmail,
      phone: bookingData.travelerPhone,
    },
    variables,
    referenceId: bookingData.bookingNumber,
    referenceType: "tour_booking",
    moduleContext: "tourism",
  });
}

export async function sendBookingReminder(
  tenantId: string,
  bookingData: {
    travelerName: string;
    travelerEmail?: string;
    travelerPhone?: string;
    bookingNumber: string;
    packageName?: string;
    departureDate: string;
    destination?: string;
  }
): Promise<void> {
  const variables = tourismNotificationAdapter.buildVariables({
    travelerName: bookingData.travelerName,
    bookingNumber: bookingData.bookingNumber,
    packageName: bookingData.packageName,
    departureDate: bookingData.departureDate,
    destination: bookingData.destination,
  });

  await baseNotificationService.dispatch({
    tenantId,
    eventType: "ORDER_UPDATED",
    channels: ["email", "whatsapp"],
    recipient: {
      name: bookingData.travelerName,
      email: bookingData.travelerEmail,
      phone: bookingData.travelerPhone,
    },
    variables,
    referenceId: bookingData.bookingNumber,
    referenceType: "tour_booking",
    moduleContext: "tourism",
  });
}
