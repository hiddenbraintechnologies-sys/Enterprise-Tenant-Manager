import type { TemplateSubmitParams } from "./types";

export type BusinessTemplateCategory = "real_estate" | "tourism" | "clinic" | "salon" | "pg" | "coworking" | "service";

export interface BusinessTemplate {
  name: string;
  businessType: BusinessTemplateCategory;
  triggerEvent: string;
  category: "marketing" | "utility" | "authentication";
  language: string;
  headerType?: "text" | "image" | "video" | "document";
  headerContent?: string;
  bodyText: string;
  footerText?: string;
  placeholders: string[];
  buttons?: Array<{
    type: "quick_reply" | "url" | "call";
    text: string;
    url?: string;
    phoneNumber?: string;
  }>;
}

export const REAL_ESTATE_TEMPLATES: BusinessTemplate[] = [
  {
    name: "real_estate_new_lead",
    businessType: "real_estate",
    triggerEvent: "lead.created",
    category: "utility",
    language: "en",
    bodyText: `Hello {{1}},

Thank you for your interest in {{2}}! We've received your inquiry and one of our property consultants will contact you shortly.

Property: {{3}}
Location: {{4}}

If you have any questions, feel free to reply to this message.

Best regards,
{{5}}`,
    footerText: "Reply STOP to opt out",
    placeholders: ["customer_name", "business_name", "property_name", "property_location", "agent_name"],
    buttons: [
      { type: "call", text: "Call Now", phoneNumber: "{{6}}" },
      { type: "url", text: "View Property", url: "{{7}}" },
    ],
  },
  {
    name: "real_estate_site_visit_reminder",
    businessType: "real_estate",
    triggerEvent: "site_visit.reminder",
    category: "utility",
    language: "en",
    bodyText: `Hi {{1}},

This is a reminder for your upcoming site visit:

Property: {{2}}
Address: {{3}}
Date: {{4}}
Time: {{5}}

Your property consultant {{6}} will be waiting for you at the location.

Please confirm your attendance by replying YES or reschedule by replying RESCHEDULE.

See you soon!
{{7}}`,
    footerText: "Reply STOP to opt out",
    placeholders: ["customer_name", "property_name", "property_address", "visit_date", "visit_time", "agent_name", "business_name"],
    buttons: [
      { type: "quick_reply", text: "Confirm" },
      { type: "quick_reply", text: "Reschedule" },
      { type: "url", text: "Get Directions", url: "{{8}}" },
    ],
  },
  {
    name: "real_estate_deal_followup",
    businessType: "real_estate",
    triggerEvent: "deal.followup",
    category: "utility",
    language: "en",
    bodyText: `Hello {{1}},

Following up on your interest in {{2}}.

We wanted to check if you have any questions or need additional information about the property.

Current Status: {{3}}
Next Steps: {{4}}

Our team is here to help you find your perfect property.

Best regards,
{{5}}
{{6}}`,
    footerText: "Reply STOP to opt out",
    placeholders: ["customer_name", "property_name", "deal_status", "next_steps", "agent_name", "business_name"],
    buttons: [
      { type: "call", text: "Schedule Call", phoneNumber: "{{7}}" },
      { type: "quick_reply", text: "Interested" },
      { type: "quick_reply", text: "Not Now" },
    ],
  },
  {
    name: "real_estate_new_listing_alert",
    businessType: "real_estate",
    triggerEvent: "listing.matching",
    category: "marketing",
    language: "en",
    bodyText: `Hi {{1}},

Great news! A new property matching your preferences is now available:

{{2}}
Location: {{3}}
Price: {{4}}
Type: {{5}}

Would you like to schedule a viewing?

Best regards,
{{6}}`,
    footerText: "Reply STOP to opt out",
    placeholders: ["customer_name", "property_name", "location", "price", "property_type", "business_name"],
    buttons: [
      { type: "quick_reply", text: "Schedule Visit" },
      { type: "url", text: "View Details", url: "{{7}}" },
    ],
  },
];

export const TOURISM_TEMPLATES: BusinessTemplate[] = [
  {
    name: "tourism_booking_confirmation",
    businessType: "tourism",
    triggerEvent: "booking.confirmed",
    category: "utility",
    language: "en",
    bodyText: `Hello {{1}},

Your booking has been confirmed!

Booking Number: {{2}}
Package: {{3}}
Departure: {{4}}
Return: {{5}}
Travelers: {{6}}

Total Amount: {{7}}
Payment Status: {{8}}

Your travel documents and detailed itinerary will be shared closer to the departure date.

Thank you for choosing {{9}}!`,
    footerText: "Reply STOP to opt out",
    placeholders: ["customer_name", "booking_number", "package_name", "departure_date", "return_date", "traveler_count", "total_amount", "payment_status", "business_name"],
    buttons: [
      { type: "url", text: "View Booking", url: "{{10}}" },
      { type: "call", text: "Contact Us", phoneNumber: "{{11}}" },
    ],
  },
  {
    name: "tourism_travel_reminder",
    businessType: "tourism",
    triggerEvent: "booking.travel_reminder",
    category: "utility",
    language: "en",
    bodyText: `Hi {{1}},

Your trip is just {{2}} away!

Package: {{3}}
Departure: {{4}}
From: {{5}}

Important Reminders:
- Check your passport validity
- Review your itinerary
- Pack according to weather at destination

Documents to carry:
- Valid ID/Passport
- Booking confirmation
- Travel insurance (if applicable)

For any assistance, contact us at {{6}}.

Have a wonderful trip!
{{7}}`,
    footerText: "Reply STOP to opt out",
    placeholders: ["customer_name", "days_until_travel", "package_name", "departure_date", "departure_city", "contact_number", "business_name"],
    buttons: [
      { type: "url", text: "View Itinerary", url: "{{8}}" },
      { type: "quick_reply", text: "Contact Support" },
    ],
  },
  {
    name: "tourism_itinerary_share",
    businessType: "tourism",
    triggerEvent: "itinerary.shared",
    category: "utility",
    language: "en",
    headerType: "document",
    headerContent: "{{itinerary_pdf_url}}",
    bodyText: `Hello {{1}},

Please find attached your detailed travel itinerary for {{2}}.

Trip Duration: {{3}}
Destinations: {{4}}

Day-by-Day Highlights:
{{5}}

Your tour guide: {{6}}
Emergency Contact: {{7}}

We hope you have an amazing journey!

Best regards,
{{8}}`,
    footerText: "Reply STOP to opt out",
    placeholders: ["customer_name", "package_name", "duration", "destinations", "highlights_summary", "guide_name", "emergency_contact", "business_name"],
    buttons: [
      { type: "url", text: "Download Itinerary", url: "{{9}}" },
      { type: "quick_reply", text: "Ask Question" },
    ],
  },
  {
    name: "tourism_payment_reminder",
    businessType: "tourism",
    triggerEvent: "booking.payment_due",
    category: "utility",
    language: "en",
    bodyText: `Hi {{1}},

This is a friendly reminder about your pending payment for:

Booking: {{2}}
Package: {{3}}
Amount Due: {{4}}
Due Date: {{5}}

Please complete the payment to confirm your reservation.

Payment Link: {{6}}

If you've already paid, please ignore this message.

Thank you!
{{7}}`,
    footerText: "Reply STOP to opt out",
    placeholders: ["customer_name", "booking_number", "package_name", "amount_due", "due_date", "payment_link", "business_name"],
    buttons: [
      { type: "url", text: "Pay Now", url: "{{6}}" },
      { type: "call", text: "Call Support", phoneNumber: "{{8}}" },
    ],
  },
  {
    name: "tourism_feedback_request",
    businessType: "tourism",
    triggerEvent: "booking.completed",
    category: "marketing",
    language: "en",
    bodyText: `Hi {{1}},

Welcome back! We hope you had an amazing time on your {{2}} trip.

We'd love to hear about your experience. Your feedback helps us improve and serve you better.

Please take a moment to rate your trip:

{{3}}

Thank you for traveling with us!

Best regards,
{{4}}`,
    footerText: "Reply STOP to opt out",
    placeholders: ["customer_name", "package_name", "feedback_link", "business_name"],
    buttons: [
      { type: "url", text: "Give Feedback", url: "{{3}}" },
      { type: "quick_reply", text: "Book Again" },
    ],
  },
];

export const ALL_BUSINESS_TEMPLATES: BusinessTemplate[] = [
  ...REAL_ESTATE_TEMPLATES,
  ...TOURISM_TEMPLATES,
];

export function getTemplatesForBusinessType(businessType: BusinessTemplateCategory): BusinessTemplate[] {
  return ALL_BUSINESS_TEMPLATES.filter(t => t.businessType === businessType);
}

export function getTemplateByTrigger(businessType: BusinessTemplateCategory, triggerEvent: string): BusinessTemplate | undefined {
  return ALL_BUSINESS_TEMPLATES.find(
    t => t.businessType === businessType && t.triggerEvent === triggerEvent
  );
}

export function convertToSubmitParams(template: BusinessTemplate): TemplateSubmitParams {
  return {
    name: template.name,
    category: template.category,
    language: template.language,
    headerType: template.headerType,
    headerContent: template.headerContent,
    bodyText: template.bodyText,
    footerText: template.footerText,
    buttons: template.buttons,
    placeholders: template.placeholders,
  };
}
