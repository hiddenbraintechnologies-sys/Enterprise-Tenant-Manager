/**
 * Logistics Module Notification Adapter
 * 
 * Provides notification handling for the Logistics module:
 * - Shipment updates
 * - Delivery notifications
 * - Invoice notifications
 * 
 * @module server/services/logistics-notification-adapter
 */

import {
  INotificationAdapter,
  NotificationEventType,
  NotificationChannel,
  NotificationVariables,
  baseNotificationService,
} from "./base-notification";

class LogisticsNotificationAdapter implements INotificationAdapter {
  getModuleName(): string {
    return "logistics";
  }

  mapEventToLegacyType(eventType: NotificationEventType): string {
    const mapping: Partial<Record<NotificationEventType, string>> = {
      ORDER_CREATED: "shipment_created",
      ORDER_UPDATED: "shipment_updated",
      DELIVERY_SCHEDULED: "delivery_scheduled",
      DELIVERY_COMPLETED: "delivery_completed",
      INVOICE_CREATED: "shipment_invoice_created",
      PAYMENT_RECEIVED: "shipment_payment_received",
    };
    return mapping[eventType] || "custom";
  }

  buildVariables(data: Record<string, unknown>): NotificationVariables {
    return {
      customerName: String(data.receiverName || "Recipient"),
      senderName: String(data.senderName || ""),
      invoiceNumber: String(data.trackingNumber || ""),
      totalAmount: String(data.totalAmount || "0"),
      currency: String(data.currency || "INR"),
      tenantName: String(data.companyName || ""),
      trackingNumber: String(data.trackingNumber || ""),
      shipmentStatus: String(data.status || ""),
      estimatedDelivery: String(data.estimatedDelivery || ""),
      pickupDate: String(data.pickupDate || ""),
      senderCity: String(data.senderCity || ""),
      receiverCity: String(data.receiverCity || ""),
      trackingUrl: String(data.trackingUrl || ""),
    };
  }

  getDefaultChannels(eventType: NotificationEventType): NotificationChannel[] {
    switch (eventType) {
      case "DELIVERY_SCHEDULED":
      case "DELIVERY_COMPLETED":
        return ["email", "whatsapp"];
      case "ORDER_UPDATED":
        return ["email", "whatsapp"];
      default:
        return ["email"];
    }
  }
}

export const logisticsNotificationAdapter = new LogisticsNotificationAdapter();

export function registerLogisticsNotificationAdapter(): void {
  baseNotificationService.registerAdapter(logisticsNotificationAdapter);
}

export async function sendShipmentUpdate(
  tenantId: string,
  shipmentData: {
    receiverName: string;
    receiverEmail?: string;
    receiverPhone?: string;
    senderName?: string;
    trackingNumber: string;
    status: string;
    estimatedDelivery?: string;
    senderCity?: string;
    receiverCity?: string;
  }
): Promise<void> {
  const variables = logisticsNotificationAdapter.buildVariables({
    receiverName: shipmentData.receiverName,
    senderName: shipmentData.senderName,
    trackingNumber: shipmentData.trackingNumber,
    status: shipmentData.status,
    estimatedDelivery: shipmentData.estimatedDelivery,
    senderCity: shipmentData.senderCity,
    receiverCity: shipmentData.receiverCity,
  });

  await baseNotificationService.dispatch({
    tenantId,
    eventType: "ORDER_UPDATED",
    channels: logisticsNotificationAdapter.getDefaultChannels("ORDER_UPDATED"),
    recipient: {
      name: shipmentData.receiverName,
      email: shipmentData.receiverEmail,
      phone: shipmentData.receiverPhone,
    },
    variables,
    referenceId: shipmentData.trackingNumber,
    referenceType: "shipment",
    moduleContext: "logistics",
  });
}

export async function sendDeliveryNotification(
  tenantId: string,
  eventType: "DELIVERY_SCHEDULED" | "DELIVERY_COMPLETED",
  deliveryData: {
    receiverName: string;
    receiverEmail?: string;
    receiverPhone?: string;
    trackingNumber: string;
    estimatedDelivery?: string;
    actualDelivery?: string;
  }
): Promise<void> {
  const variables = logisticsNotificationAdapter.buildVariables({
    receiverName: deliveryData.receiverName,
    trackingNumber: deliveryData.trackingNumber,
    estimatedDelivery: deliveryData.estimatedDelivery || deliveryData.actualDelivery,
  });

  await baseNotificationService.dispatch({
    tenantId,
    eventType,
    channels: logisticsNotificationAdapter.getDefaultChannels(eventType),
    recipient: {
      name: deliveryData.receiverName,
      email: deliveryData.receiverEmail,
      phone: deliveryData.receiverPhone,
    },
    variables,
    referenceId: deliveryData.trackingNumber,
    referenceType: "shipment",
    moduleContext: "logistics",
  });
}
