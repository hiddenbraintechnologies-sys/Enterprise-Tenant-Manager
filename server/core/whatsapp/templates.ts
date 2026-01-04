import type { TemplateSubmitParams } from "./types";

export type BusinessTemplateCategory = "real_estate" | "tourism" | "clinic" | "salon" | "pg" | "coworking" | "service" | "education" | "logistics" | "legal";

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

export const EDUCATION_TEMPLATES: BusinessTemplate[] = [
  {
    name: "education_fee_reminder",
    businessType: "education",
    triggerEvent: "fee.reminder",
    category: "utility",
    language: "en",
    bodyText: `Dear {{1}},

This is a reminder that the fee payment for {{2}} is due.

Student: {{3}}
Amount Due: {{4}}
Due Date: {{5}}
Fee Type: {{6}}

Please make the payment at the earliest to avoid late fees.

For any queries, contact us at {{7}}.

Thank you,
{{8}}`,
    footerText: "Reply STOP to opt out",
    placeholders: ["parent_name", "student_name", "student_id", "amount_due", "due_date", "fee_type", "contact_number", "institution_name", "payment_url"],
    buttons: [
      { type: "url", text: "Pay Now", url: "{{9}}" },
      { type: "call", text: "Contact Us", phoneNumber: "{{7}}" },
    ],
  },
  {
    name: "education_attendance_alert",
    businessType: "education",
    triggerEvent: "attendance.alert",
    category: "utility",
    language: "en",
    bodyText: `Dear {{1}},

This is to inform you about the attendance status of {{2}}.

Date: {{3}}
Status: {{4}}
Subject/Class: {{5}}

{{6}}

If you have any concerns, please contact us.

Regards,
{{7}}`,
    footerText: "Reply STOP to opt out",
    placeholders: ["parent_name", "student_name", "date", "attendance_status", "class_name", "additional_note", "institution_name", "contact_number"],
    buttons: [
      { type: "quick_reply", text: "Acknowledged" },
      { type: "call", text: "Contact School", phoneNumber: "{{8}}" },
    ],
  },
  {
    name: "education_exam_schedule",
    businessType: "education",
    triggerEvent: "exam.schedule",
    category: "utility",
    language: "en",
    bodyText: `Dear {{1}},

Exam schedule notification for {{2}}:

Exam: {{3}}
Subject: {{4}}
Date: {{5}}
Time: {{6}}
Venue: {{7}}

Important Instructions:
- Bring valid ID card
- Arrive 15 minutes early
- Bring necessary stationery

Best of luck!
{{8}}`,
    footerText: "Reply STOP to opt out",
    placeholders: ["student_name", "course_name", "exam_name", "subject", "exam_date", "exam_time", "venue", "institution_name", "schedule_url"],
    buttons: [
      { type: "quick_reply", text: "Confirmed" },
      { type: "url", text: "View Schedule", url: "{{9}}" },
    ],
  },
];

export const LOGISTICS_TEMPLATES: BusinessTemplate[] = [
  {
    name: "logistics_shipment_status",
    businessType: "logistics",
    triggerEvent: "shipment.status_update",
    category: "utility",
    language: "en",
    bodyText: `Hello {{1}},

Your shipment status has been updated:

Tracking Number: {{2}}
Status: {{3}}
Current Location: {{4}}
Expected Delivery: {{5}}

{{6}}

Track your shipment anytime using the link below.

{{7}}`,
    footerText: "Reply STOP to opt out",
    placeholders: ["customer_name", "tracking_number", "status", "current_location", "expected_delivery", "additional_info", "company_name", "tracking_url", "support_number"],
    buttons: [
      { type: "url", text: "Track Shipment", url: "{{8}}" },
      { type: "call", text: "Contact Support", phoneNumber: "{{9}}" },
    ],
  },
  {
    name: "logistics_delivery_confirmation",
    businessType: "logistics",
    triggerEvent: "shipment.delivered",
    category: "utility",
    language: "en",
    bodyText: `Hello {{1}},

Great news! Your shipment has been delivered.

Tracking Number: {{2}}
Delivered To: {{3}}
Delivery Time: {{4}}
Received By: {{5}}

Thank you for choosing {{6}}!

Please rate your delivery experience:`,
    footerText: "Reply STOP to opt out",
    placeholders: ["customer_name", "tracking_number", "delivery_address", "delivery_time", "received_by", "company_name", "rating_url"],
    buttons: [
      { type: "url", text: "Rate Delivery", url: "{{7}}" },
      { type: "quick_reply", text: "Report Issue" },
    ],
  },
  {
    name: "logistics_driver_alert",
    businessType: "logistics",
    triggerEvent: "trip.driver_alert",
    category: "utility",
    language: "en",
    bodyText: `Alert for Driver {{1}}:

Trip: {{2}}
Assignment: {{3}}

Details:
From: {{4}}
To: {{5}}
Pickup Time: {{6}}
Cargo Type: {{7}}

Special Instructions:
{{8}}

Contact dispatch at {{9}} for assistance.`,
    footerText: "Reply STOP to opt out",
    placeholders: ["driver_name", "trip_number", "assignment_type", "origin", "destination", "pickup_time", "cargo_type", "special_instructions", "dispatch_number"],
    buttons: [
      { type: "quick_reply", text: "Accept" },
      { type: "quick_reply", text: "Decline" },
      { type: "call", text: "Call Dispatch", phoneNumber: "{{9}}" },
    ],
  },
];

export const LEGAL_TEMPLATES: BusinessTemplate[] = [
  {
    name: "legal_appointment_reminder",
    businessType: "legal",
    triggerEvent: "appointment.reminder",
    category: "utility",
    language: "en",
    bodyText: `Dear {{1}},

This is a reminder for your upcoming appointment:

Date: {{2}}
Time: {{3}}
Attorney: {{4}}
Location: {{5}}
Case Reference: {{6}}

Please bring all relevant documents. If you need to reschedule, contact us at least 24 hours in advance.

Regards,
{{7}}`,
    footerText: "Reply STOP to opt out",
    placeholders: ["client_name", "appointment_date", "appointment_time", "attorney_name", "location", "case_reference", "firm_name", "office_number"],
    buttons: [
      { type: "quick_reply", text: "Confirm" },
      { type: "quick_reply", text: "Reschedule" },
      { type: "call", text: "Call Office", phoneNumber: "{{8}}" },
    ],
  },
  {
    name: "legal_case_update",
    businessType: "legal",
    triggerEvent: "case.update",
    category: "utility",
    language: "en",
    bodyText: `Dear {{1}},

Important update regarding your case:

Case Number: {{2}}
Case Title: {{3}}
Update: {{4}}

Next Steps: {{5}}

For questions, please contact your attorney {{6}}.

Regards,
{{7}}`,
    footerText: "Reply STOP to opt out",
    placeholders: ["client_name", "case_number", "case_title", "update_description", "next_steps", "attorney_name", "firm_name", "details_url", "attorney_phone"],
    buttons: [
      { type: "url", text: "View Details", url: "{{8}}" },
      { type: "call", text: "Contact Attorney", phoneNumber: "{{9}}" },
    ],
  },
  {
    name: "legal_invoice_notification",
    businessType: "legal",
    triggerEvent: "invoice.created",
    category: "utility",
    language: "en",
    bodyText: `Dear {{1}},

A new invoice has been generated for your account:

Invoice Number: {{2}}
Amount: {{3}}
Due Date: {{4}}
Services: {{5}}

Payment Options:
- Online: {{6}}
- Bank Transfer: Details in invoice

For any billing queries, contact our accounts team.

Regards,
{{7}}`,
    footerText: "Reply STOP to opt out",
    placeholders: ["client_name", "invoice_number", "amount", "due_date", "services_description", "payment_link", "firm_name", "invoice_url"],
    buttons: [
      { type: "url", text: "Pay Now", url: "{{6}}" },
      { type: "url", text: "View Invoice", url: "{{8}}" },
    ],
  },
];

export const ALL_BUSINESS_TEMPLATES: BusinessTemplate[] = [
  ...REAL_ESTATE_TEMPLATES,
  ...TOURISM_TEMPLATES,
  ...EDUCATION_TEMPLATES,
  ...LOGISTICS_TEMPLATES,
  ...LEGAL_TEMPLATES,
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
