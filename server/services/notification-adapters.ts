/**
 * Notification Adapters Barrel Export
 * 
 * Central export for all module notification adapters
 * 
 * @module server/services/notification-adapters
 */

export {
  legalNotificationAdapter,
  registerLegalNotificationAdapter,
  sendLegalAppointmentReminder,
  sendLegalInvoiceNotification,
} from "./legal-notification-adapter";

export {
  educationNotificationAdapter,
  registerEducationNotificationAdapter,
  sendFeeReminder,
  sendFeePaymentConfirmation,
} from "./education-notification-adapter";

export {
  tourismNotificationAdapter,
  registerTourismNotificationAdapter,
  sendBookingConfirmation,
  sendBookingReminder,
} from "./tourism-notification-adapter";

export {
  logisticsNotificationAdapter,
  registerLogisticsNotificationAdapter,
  sendShipmentUpdate,
  sendDeliveryNotification,
} from "./logistics-notification-adapter";

export {
  realestateNotificationAdapter,
  registerRealEstateNotificationAdapter,
  sendSiteVisitReminder,
  sendInquiryNotification,
  sendCommissionInvoiceNotification,
} from "./realestate-notification-adapter";

export function registerAllNotificationAdapters(): void {
  const { registerLegalNotificationAdapter } = require("./legal-notification-adapter");
  const { registerEducationNotificationAdapter } = require("./education-notification-adapter");
  const { registerTourismNotificationAdapter } = require("./tourism-notification-adapter");
  const { registerLogisticsNotificationAdapter } = require("./logistics-notification-adapter");
  const { registerRealEstateNotificationAdapter } = require("./realestate-notification-adapter");
  
  registerLegalNotificationAdapter();
  registerEducationNotificationAdapter();
  registerTourismNotificationAdapter();
  registerLogisticsNotificationAdapter();
  registerRealEstateNotificationAdapter();
}
