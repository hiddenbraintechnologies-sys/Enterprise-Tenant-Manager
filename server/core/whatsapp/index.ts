export * from "./types";
export * from "./adapters";
export { whatsappProviderSelector, initializeWhatsappProviders } from "./provider-selector";
export { whatsappService } from "./whatsapp-service";
export * from "./templates";
export {
  whatsappTriggerService,
  onRealEstateLeadCreated,
  onRealEstateSiteVisitScheduled,
  onRealEstateDealFollowup,
  onTourismBookingConfirmed,
  onTourismTravelReminder,
  onTourismItineraryShared,
  type TriggerContext,
  type TriggerResult,
} from "./triggers";
