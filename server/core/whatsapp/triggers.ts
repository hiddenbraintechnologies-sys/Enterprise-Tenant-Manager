import { whatsappService } from "./whatsapp-service";
import { getTemplateByTrigger, type BusinessTemplateCategory } from "./templates";
import { db } from "../../db";
import { tenants, whatsappOptIns, whatsappTemplates } from "@shared/schema";
import { eq, and } from "drizzle-orm";

interface TriggerContext {
  tenantId: string;
  phoneNumber: string;
  countryCode?: string;
  customerId?: string;
  params: Record<string, string>;
}

interface TriggerResult {
  success: boolean;
  messageId?: string;
  skipped?: boolean;
  skipReason?: string;
  errorMessage?: string;
}

async function ensureOptIn(
  tenantId: string,
  phoneNumber: string,
  countryCode: string,
  source: string,
  customerId?: string
): Promise<boolean> {
  const isOptedIn = await whatsappService.checkOptIn(tenantId, phoneNumber);
  if (isOptedIn) return true;

  return false;
}

async function getApprovedTemplate(templateName: string): Promise<{ id: string; name: string } | null> {
  const [template] = await db.select()
    .from(whatsappTemplates)
    .where(and(
      eq(whatsappTemplates.name, templateName),
      eq(whatsappTemplates.status, "approved")
    ))
    .limit(1);

  return template ? { id: template.id, name: template.name } : null;
}

async function getTenantBusinessType(tenantId: string): Promise<BusinessTemplateCategory | null> {
  const [tenant] = await db.select()
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);

  return tenant?.businessType as BusinessTemplateCategory || null;
}

class WhatsappTriggerService {
  async triggerRealEstateNewLead(context: TriggerContext): Promise<TriggerResult> {
    return this.executeTrigger("real_estate", "lead.created", context);
  }

  async triggerRealEstateSiteVisitReminder(context: TriggerContext): Promise<TriggerResult> {
    return this.executeTrigger("real_estate", "site_visit.reminder", context);
  }

  async triggerRealEstateDealFollowup(context: TriggerContext): Promise<TriggerResult> {
    return this.executeTrigger("real_estate", "deal.followup", context);
  }

  async triggerRealEstateNewListingAlert(context: TriggerContext): Promise<TriggerResult> {
    return this.executeTrigger("real_estate", "listing.matching", context);
  }

  async triggerTourismBookingConfirmation(context: TriggerContext): Promise<TriggerResult> {
    return this.executeTrigger("tourism", "booking.confirmed", context);
  }

  async triggerTourismTravelReminder(context: TriggerContext): Promise<TriggerResult> {
    return this.executeTrigger("tourism", "booking.travel_reminder", context);
  }

  async triggerTourismItineraryShare(context: TriggerContext): Promise<TriggerResult> {
    return this.executeTrigger("tourism", "itinerary.shared", context);
  }

  async triggerTourismPaymentReminder(context: TriggerContext): Promise<TriggerResult> {
    return this.executeTrigger("tourism", "booking.payment_due", context);
  }

  async triggerTourismFeedbackRequest(context: TriggerContext): Promise<TriggerResult> {
    return this.executeTrigger("tourism", "booking.completed", context);
  }

  async executeTrigger(
    businessType: BusinessTemplateCategory,
    triggerEvent: string,
    context: TriggerContext
  ): Promise<TriggerResult> {
    try {
      const tenantBusinessType = await getTenantBusinessType(context.tenantId);
      if (tenantBusinessType !== businessType) {
        return {
          success: false,
          skipped: true,
          skipReason: `Tenant business type mismatch: expected ${businessType}, got ${tenantBusinessType}`,
        };
      }

      const isOptedIn = await whatsappService.checkOptIn(context.tenantId, context.phoneNumber);
      if (!isOptedIn) {
        return {
          success: false,
          skipped: true,
          skipReason: "Phone number not opted in for WhatsApp messages",
        };
      }

      const templateDef = getTemplateByTrigger(businessType, triggerEvent);
      if (!templateDef) {
        return {
          success: false,
          errorMessage: `No template defined for trigger: ${businessType}/${triggerEvent}`,
        };
      }

      const approvedTemplate = await getApprovedTemplate(templateDef.name);
      if (!approvedTemplate) {
        return {
          success: false,
          skipped: true,
          skipReason: `Template "${templateDef.name}" not approved or not found`,
        };
      }

      const result = await whatsappService.sendMessage({
        tenantId: context.tenantId,
        toPhoneNumber: context.phoneNumber,
        templateId: approvedTemplate.id,
        templateParams: context.params,
        messageType: "template",
        metadata: {
          triggerEvent,
          businessType,
          customerId: context.customerId,
        },
      });

      return {
        success: result.success,
        messageId: result.messageId,
        errorMessage: result.errorMessage,
      };
    } catch (error) {
      return {
        success: false,
        errorMessage: error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  async triggerByEvent(
    tenantId: string,
    triggerEvent: string,
    phoneNumber: string,
    params: Record<string, string>,
    customerId?: string
  ): Promise<TriggerResult> {
    const businessType = await getTenantBusinessType(tenantId);
    if (!businessType) {
      return {
        success: false,
        errorMessage: "Tenant not found or business type not set",
      };
    }

    return this.executeTrigger(businessType, triggerEvent, {
      tenantId,
      phoneNumber,
      params,
      customerId,
    });
  }
}

export const whatsappTriggerService = new WhatsappTriggerService();

export async function onRealEstateLeadCreated(
  tenantId: string,
  lead: {
    name: string;
    phone: string;
    email?: string;
    propertyName?: string;
    propertyLocation?: string;
    agentName?: string;
    businessName?: string;
    agentPhone?: string;
    propertyUrl?: string;
  }
): Promise<TriggerResult> {
  return whatsappTriggerService.triggerRealEstateNewLead({
    tenantId,
    phoneNumber: lead.phone,
    params: {
      "1": lead.name,
      "2": lead.businessName || "our company",
      "3": lead.propertyName || "the property",
      "4": lead.propertyLocation || "to be shared",
      "5": lead.agentName || "our team",
      "6": lead.agentPhone || "",
      "7": lead.propertyUrl || "",
    },
  });
}

export async function onRealEstateSiteVisitScheduled(
  tenantId: string,
  visit: {
    customerName: string;
    customerPhone: string;
    propertyName: string;
    propertyAddress: string;
    visitDate: string;
    visitTime: string;
    agentName: string;
    businessName: string;
    directionsUrl?: string;
  }
): Promise<TriggerResult> {
  return whatsappTriggerService.triggerRealEstateSiteVisitReminder({
    tenantId,
    phoneNumber: visit.customerPhone,
    params: {
      "1": visit.customerName,
      "2": visit.propertyName,
      "3": visit.propertyAddress,
      "4": visit.visitDate,
      "5": visit.visitTime,
      "6": visit.agentName,
      "7": visit.businessName,
      "8": visit.directionsUrl || "",
    },
  });
}

export async function onRealEstateDealFollowup(
  tenantId: string,
  deal: {
    customerName: string;
    customerPhone: string;
    propertyName: string;
    dealStatus: string;
    nextSteps: string;
    agentName: string;
    businessName: string;
    agentPhone?: string;
  }
): Promise<TriggerResult> {
  return whatsappTriggerService.triggerRealEstateDealFollowup({
    tenantId,
    phoneNumber: deal.customerPhone,
    params: {
      "1": deal.customerName,
      "2": deal.propertyName,
      "3": deal.dealStatus,
      "4": deal.nextSteps,
      "5": deal.agentName,
      "6": deal.businessName,
      "7": deal.agentPhone || "",
    },
  });
}

export async function onTourismBookingConfirmed(
  tenantId: string,
  booking: {
    customerName: string;
    customerPhone: string;
    bookingNumber: string;
    packageName: string;
    departureDate: string;
    returnDate: string;
    travelerCount: number;
    totalAmount: string;
    paymentStatus: string;
    businessName: string;
    bookingUrl?: string;
    contactPhone?: string;
  }
): Promise<TriggerResult> {
  return whatsappTriggerService.triggerTourismBookingConfirmation({
    tenantId,
    phoneNumber: booking.customerPhone,
    params: {
      "1": booking.customerName,
      "2": booking.bookingNumber,
      "3": booking.packageName,
      "4": booking.departureDate,
      "5": booking.returnDate,
      "6": booking.travelerCount.toString(),
      "7": booking.totalAmount,
      "8": booking.paymentStatus,
      "9": booking.businessName,
      "10": booking.bookingUrl || "",
      "11": booking.contactPhone || "",
    },
  });
}

export async function onTourismTravelReminder(
  tenantId: string,
  reminder: {
    customerName: string;
    customerPhone: string;
    daysUntilTravel: number;
    packageName: string;
    departureDate: string;
    departureCity: string;
    contactNumber: string;
    businessName: string;
    itineraryUrl?: string;
  }
): Promise<TriggerResult> {
  return whatsappTriggerService.triggerTourismTravelReminder({
    tenantId,
    phoneNumber: reminder.customerPhone,
    params: {
      "1": reminder.customerName,
      "2": `${reminder.daysUntilTravel} days`,
      "3": reminder.packageName,
      "4": reminder.departureDate,
      "5": reminder.departureCity,
      "6": reminder.contactNumber,
      "7": reminder.businessName,
      "8": reminder.itineraryUrl || "",
    },
  });
}

export async function onTourismItineraryShared(
  tenantId: string,
  itinerary: {
    customerName: string;
    customerPhone: string;
    packageName: string;
    duration: string;
    destinations: string;
    highlightsSummary: string;
    guideName: string;
    emergencyContact: string;
    businessName: string;
    itineraryPdfUrl?: string;
    downloadUrl?: string;
  }
): Promise<TriggerResult> {
  return whatsappTriggerService.triggerTourismItineraryShare({
    tenantId,
    phoneNumber: itinerary.customerPhone,
    params: {
      "1": itinerary.customerName,
      "2": itinerary.packageName,
      "3": itinerary.duration,
      "4": itinerary.destinations,
      "5": itinerary.highlightsSummary,
      "6": itinerary.guideName,
      "7": itinerary.emergencyContact,
      "8": itinerary.businessName,
      "9": itinerary.downloadUrl || itinerary.itineraryPdfUrl || "",
      itinerary_pdf_url: itinerary.itineraryPdfUrl || "",
    },
  });
}

export {
  TriggerContext,
  TriggerResult,
};
