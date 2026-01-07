import { db } from "../db";
import { 
  featureFlags, tenantFeatures, tenants,
  type FeatureFlag, type TenantFeature, type InsertTenantFeature
} from "@shared/schema";
import { eq, and } from "drizzle-orm";

export const FEATURES = {
  BOOKING_SYSTEM: "booking_system",
  CUSTOMER_MANAGEMENT: "customer_management",
  SERVICE_CATALOG: "service_catalog",
  STAFF_MANAGEMENT: "staff_management",
  ANALYTICS_BASIC: "analytics_basic",
  ANALYTICS_ADVANCED: "analytics_advanced",
  INVENTORY: "inventory",
  NOTIFICATIONS_EMAIL: "notifications_email",
  NOTIFICATIONS_SMS: "notifications_sms",
  NOTIFICATIONS_WHATSAPP: "notifications_whatsapp",
  BILLING_INVOICES: "billing_invoices",
  BILLING_SUBSCRIPTIONS: "billing_subscriptions",
  CUSTOM_DOMAINS: "custom_domains",
  WHITE_LABEL: "white_label",
  API_ACCESS: "api_access",
  MULTI_LOCATION: "multi_location",
  // Business-specific modules
  PATIENTS: "patients",
  APPOINTMENTS: "appointments",
  EMR: "emr",
  PRESCRIPTIONS: "prescriptions",
  DESKS: "desks",
  SPACES: "spaces",
  MEMBERSHIPS: "memberships",
  ROOMS: "rooms",
  TENANTS_MANAGEMENT: "tenants_management",
  SERVICES: "services",
  // Real Estate modules
  PROPERTIES: "properties",
  LISTINGS: "listings",
  LEADS: "leads",
  SITE_VISITS: "site_visits",
  AGENTS: "agents",
  // Tourism modules
  PACKAGES: "packages",
  ITINERARIES: "itineraries",
  VENDORS: "vendors",
  // Education modules
  STUDENTS: "students",
  COURSES: "courses",
  EXAMS: "exams",
  ATTENDANCE: "attendance",
  FACULTY: "faculty",
  // Logistics modules
  VEHICLES: "vehicles",
  TRIPS: "trips",
  SHIPMENTS: "shipments",
  DRIVERS: "drivers",
  TRACKING: "tracking",
  // Legal modules
  CASES: "cases",
  CLIENTS: "clients",
  DOCUMENTS: "documents",
  COURT_DATES: "court_dates",
  TIME_TRACKING: "time_tracking",
  // Customer Portal (controlled by super admin/platform managers)
  CUSTOMER_PORTAL: "customer_portal",
} as const;

export type BusinessType = "clinic" | "salon" | "pg" | "coworking" | "service" | "real_estate" | "tourism" | "education" | "logistics" | "legal";

export const BUSINESS_TYPE_MODULES: Record<BusinessType, string[]> = {
  clinic: [
    FEATURES.PATIENTS,
    FEATURES.APPOINTMENTS,
    FEATURES.BILLING_INVOICES,
    FEATURES.EMR,
    FEATURES.PRESCRIPTIONS,
    FEATURES.STAFF_MANAGEMENT,
    FEATURES.NOTIFICATIONS_EMAIL,
    FEATURES.ANALYTICS_BASIC,
  ],
  salon: [
    FEATURES.APPOINTMENTS,
    FEATURES.SERVICES,
    FEATURES.CUSTOMER_MANAGEMENT,
    FEATURES.BILLING_INVOICES,
    FEATURES.STAFF_MANAGEMENT,
    FEATURES.NOTIFICATIONS_EMAIL,
    FEATURES.ANALYTICS_BASIC,
  ],
  pg: [
    FEATURES.ROOMS,
    FEATURES.TENANTS_MANAGEMENT,
    FEATURES.BILLING_INVOICES,
    FEATURES.BILLING_SUBSCRIPTIONS,
    FEATURES.NOTIFICATIONS_EMAIL,
    FEATURES.ANALYTICS_BASIC,
  ],
  coworking: [
    FEATURES.DESKS,
    FEATURES.SPACES,
    FEATURES.BOOKING_SYSTEM,
    FEATURES.MEMBERSHIPS,
    FEATURES.BILLING_INVOICES,
    FEATURES.BILLING_SUBSCRIPTIONS,
    FEATURES.CUSTOMER_MANAGEMENT,
    FEATURES.NOTIFICATIONS_EMAIL,
    FEATURES.ANALYTICS_BASIC,
  ],
  service: [
    FEATURES.BOOKING_SYSTEM,
    FEATURES.CUSTOMER_MANAGEMENT,
    FEATURES.SERVICE_CATALOG,
    FEATURES.STAFF_MANAGEMENT,
    FEATURES.BILLING_INVOICES,
    FEATURES.NOTIFICATIONS_EMAIL,
    FEATURES.ANALYTICS_BASIC,
  ],
  real_estate: [
    FEATURES.PROPERTIES,
    FEATURES.LISTINGS,
    FEATURES.LEADS,
    FEATURES.SITE_VISITS,
    FEATURES.AGENTS,
    FEATURES.CUSTOMER_MANAGEMENT,
    FEATURES.BILLING_INVOICES,
    FEATURES.STAFF_MANAGEMENT,
    FEATURES.NOTIFICATIONS_EMAIL,
    FEATURES.NOTIFICATIONS_SMS,
    FEATURES.ANALYTICS_BASIC,
    FEATURES.ANALYTICS_ADVANCED,
  ],
  tourism: [
    FEATURES.PACKAGES,
    FEATURES.BOOKING_SYSTEM,
    FEATURES.CUSTOMER_MANAGEMENT,
    FEATURES.ITINERARIES,
    FEATURES.VENDORS,
    FEATURES.BILLING_INVOICES,
    FEATURES.NOTIFICATIONS_EMAIL,
    FEATURES.NOTIFICATIONS_SMS,
    FEATURES.ANALYTICS_BASIC,
  ],
  education: [
    FEATURES.STUDENTS,
    FEATURES.COURSES,
    FEATURES.EXAMS,
    FEATURES.ATTENDANCE,
    FEATURES.FACULTY,
    FEATURES.BILLING_INVOICES,
    FEATURES.BILLING_SUBSCRIPTIONS,
    FEATURES.CUSTOMER_MANAGEMENT,
    FEATURES.NOTIFICATIONS_EMAIL,
    FEATURES.NOTIFICATIONS_SMS,
    FEATURES.ANALYTICS_BASIC,
    FEATURES.ANALYTICS_ADVANCED,
  ],
  logistics: [
    FEATURES.VEHICLES,
    FEATURES.TRIPS,
    FEATURES.SHIPMENTS,
    FEATURES.DRIVERS,
    FEATURES.TRACKING,
    FEATURES.CUSTOMER_MANAGEMENT,
    FEATURES.BILLING_INVOICES,
    FEATURES.NOTIFICATIONS_EMAIL,
    FEATURES.NOTIFICATIONS_SMS,
    FEATURES.NOTIFICATIONS_WHATSAPP,
    FEATURES.ANALYTICS_BASIC,
    FEATURES.ANALYTICS_ADVANCED,
  ],
  legal: [
    FEATURES.CASES,
    FEATURES.CLIENTS,
    FEATURES.DOCUMENTS,
    FEATURES.COURT_DATES,
    FEATURES.TIME_TRACKING,
    FEATURES.BILLING_INVOICES,
    FEATURES.CUSTOMER_MANAGEMENT,
    FEATURES.NOTIFICATIONS_EMAIL,
    FEATURES.NOTIFICATIONS_SMS,
    FEATURES.ANALYTICS_BASIC,
    FEATURES.ANALYTICS_ADVANCED,
  ],
};

export type FeatureCode = typeof FEATURES[keyof typeof FEATURES];

const featureCache = new Map<string, { features: string[]; expiresAt: number }>();
const CACHE_TTL = 60 * 1000;

export class FeatureService {
  async getAllFeatures(): Promise<FeatureFlag[]> {
    return db.select().from(featureFlags);
  }

  async getFeaturesByCategory(category: string): Promise<FeatureFlag[]> {
    return db.select().from(featureFlags).where(eq(featureFlags.category, category));
  }

  async getTenantFeatures(tenantId: string, useCache = true): Promise<string[]> {
    if (useCache) {
      const cached = featureCache.get(tenantId);
      if (cached && cached.expiresAt > Date.now()) {
        return cached.features;
      }
    }

    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId));
    if (!tenant) {
      return [];
    }

    const allFeatures = await db.select().from(featureFlags);
    const enabledOverrides = await db.select()
      .from(tenantFeatures)
      .where(and(
        eq(tenantFeatures.tenantId, tenantId),
        eq(tenantFeatures.isEnabled, true)
      ));
    const disabledOverrides = await db.select()
      .from(tenantFeatures)
      .where(and(
        eq(tenantFeatures.tenantId, tenantId),
        eq(tenantFeatures.isEnabled, false)
      ));

    const tier = tenant.subscriptionTier || "free";
    const tierOrder = ["free", "pro", "enterprise"];
    const tierIndex = tierOrder.indexOf(tier);

    const enabledCodes = new Set<string>();

    for (const feature of allFeatures) {
      if (feature.isGlobal) {
        enabledCodes.add(feature.code);
        continue;
      }

      const requiredTierIndex = tierOrder.indexOf(feature.requiredTier || "free");
      if (tierIndex >= requiredTierIndex && feature.defaultEnabled) {
        enabledCodes.add(feature.code);
      }
    }

    for (const override of enabledOverrides) {
      enabledCodes.add(override.featureCode);
    }

    for (const override of disabledOverrides) {
      enabledCodes.delete(override.featureCode);
    }

    const features = Array.from(enabledCodes);
    
    featureCache.set(tenantId, {
      features,
      expiresAt: Date.now() + CACHE_TTL,
    });

    return features;
  }

  async isFeatureEnabled(tenantId: string, featureCode: string): Promise<boolean> {
    const features = await this.getTenantFeatures(tenantId);
    return features.includes(featureCode);
  }

  async enableFeature(tenantId: string, featureCode: string, enabledBy?: string): Promise<TenantFeature> {
    const [existing] = await db.select()
      .from(tenantFeatures)
      .where(and(
        eq(tenantFeatures.tenantId, tenantId),
        eq(tenantFeatures.featureCode, featureCode)
      ));

    if (existing) {
      const [updated] = await db.update(tenantFeatures)
        .set({ isEnabled: true, enabledBy, enabledAt: new Date() })
        .where(eq(tenantFeatures.id, existing.id))
        .returning();
      
      featureCache.delete(tenantId);
      return updated;
    }

    const [created] = await db.insert(tenantFeatures)
      .values({
        tenantId,
        featureCode,
        isEnabled: true,
        enabledBy,
      })
      .returning();

    featureCache.delete(tenantId);
    return created;
  }

  async disableFeature(tenantId: string, featureCode: string): Promise<void> {
    const [existing] = await db.select()
      .from(tenantFeatures)
      .where(and(
        eq(tenantFeatures.tenantId, tenantId),
        eq(tenantFeatures.featureCode, featureCode)
      ));

    if (existing) {
      await db.update(tenantFeatures)
        .set({ isEnabled: false })
        .where(eq(tenantFeatures.id, existing.id));
    } else {
      await db.insert(tenantFeatures)
        .values({
          tenantId,
          featureCode,
          isEnabled: false,
        });
    }

    featureCache.delete(tenantId);
  }

  async setFeatureConfig(tenantId: string, featureCode: string, config: Record<string, any>): Promise<void> {
    const [existing] = await db.select()
      .from(tenantFeatures)
      .where(and(
        eq(tenantFeatures.tenantId, tenantId),
        eq(tenantFeatures.featureCode, featureCode)
      ));

    if (existing) {
      await db.update(tenantFeatures)
        .set({ config })
        .where(eq(tenantFeatures.id, existing.id));
    } else {
      await db.insert(tenantFeatures)
        .values({
          tenantId,
          featureCode,
          isEnabled: true,
          config,
        });
    }

    featureCache.delete(tenantId);
  }

  async getFeatureConfig(tenantId: string, featureCode: string): Promise<Record<string, any> | null> {
    const [result] = await db.select()
      .from(tenantFeatures)
      .where(and(
        eq(tenantFeatures.tenantId, tenantId),
        eq(tenantFeatures.featureCode, featureCode)
      ));

    return result?.config as Record<string, any> || null;
  }

  clearCache(tenantId?: string): void {
    if (tenantId) {
      featureCache.delete(tenantId);
    } else {
      featureCache.clear();
    }
  }

  async seedFeatureFlags(): Promise<void> {
    const featureDefinitions = [
      { code: FEATURES.BOOKING_SYSTEM, name: "Booking System", category: "core", defaultEnabled: true },
      { code: FEATURES.CUSTOMER_MANAGEMENT, name: "Customer Management", category: "core", defaultEnabled: true },
      { code: FEATURES.SERVICE_CATALOG, name: "Service Catalog", category: "core", defaultEnabled: true },
      { code: FEATURES.STAFF_MANAGEMENT, name: "Staff Management", category: "core", defaultEnabled: true },
      { code: FEATURES.ANALYTICS_BASIC, name: "Basic Analytics", category: "analytics", defaultEnabled: true },
      { code: FEATURES.ANALYTICS_ADVANCED, name: "Advanced Analytics", category: "analytics", requiredTier: "pro" },
      { code: FEATURES.INVENTORY, name: "Inventory Management", category: "operations", requiredTier: "pro" },
      { code: FEATURES.NOTIFICATIONS_EMAIL, name: "Email Notifications", category: "notifications", defaultEnabled: true },
      { code: FEATURES.NOTIFICATIONS_SMS, name: "SMS Notifications", category: "notifications", requiredTier: "pro" },
      { code: FEATURES.NOTIFICATIONS_WHATSAPP, name: "WhatsApp Notifications", category: "notifications", requiredTier: "enterprise" },
      { code: FEATURES.BILLING_INVOICES, name: "Invoicing", category: "billing", defaultEnabled: true },
      { code: FEATURES.BILLING_SUBSCRIPTIONS, name: "Subscription Billing", category: "billing", requiredTier: "pro" },
      { code: FEATURES.CUSTOM_DOMAINS, name: "Custom Domains", category: "branding", requiredTier: "enterprise" },
      { code: FEATURES.WHITE_LABEL, name: "White Label", category: "branding", requiredTier: "enterprise" },
      { code: FEATURES.API_ACCESS, name: "API Access", category: "developer", requiredTier: "pro" },
      { code: FEATURES.MULTI_LOCATION, name: "Multi-Location", category: "operations", requiredTier: "enterprise" },
      { code: FEATURES.PATIENTS, name: "Patient Management", category: "healthcare", defaultEnabled: false },
      { code: FEATURES.APPOINTMENTS, name: "Appointments", category: "scheduling", defaultEnabled: true },
      { code: FEATURES.EMR, name: "Electronic Medical Records", category: "healthcare", requiredTier: "enterprise" },
      { code: FEATURES.PRESCRIPTIONS, name: "Prescriptions", category: "healthcare", requiredTier: "enterprise" },
      { code: FEATURES.DESKS, name: "Desk Management", category: "coworking", defaultEnabled: false },
      { code: FEATURES.SPACES, name: "Space Management", category: "coworking", defaultEnabled: false },
      { code: FEATURES.MEMBERSHIPS, name: "Membership Plans", category: "billing", defaultEnabled: false },
      { code: FEATURES.ROOMS, name: "Room Management", category: "accommodation", defaultEnabled: false },
      { code: FEATURES.TENANTS_MANAGEMENT, name: "Tenant Management", category: "accommodation", defaultEnabled: false },
      { code: FEATURES.SERVICES, name: "Services", category: "core", defaultEnabled: true },
      // Education modules
      { code: FEATURES.STUDENTS, name: "Student Management", category: "education", defaultEnabled: false },
      { code: FEATURES.COURSES, name: "Course Management", category: "education", defaultEnabled: false },
      { code: FEATURES.EXAMS, name: "Exam Management", category: "education", defaultEnabled: false },
      { code: FEATURES.ATTENDANCE, name: "Attendance Tracking", category: "education", defaultEnabled: false },
      { code: FEATURES.FACULTY, name: "Faculty Management", category: "education", defaultEnabled: false },
      // Logistics modules
      { code: FEATURES.VEHICLES, name: "Vehicle Management", category: "logistics", defaultEnabled: false },
      { code: FEATURES.TRIPS, name: "Trip Management", category: "logistics", defaultEnabled: false },
      { code: FEATURES.SHIPMENTS, name: "Shipment Tracking", category: "logistics", defaultEnabled: false },
      { code: FEATURES.DRIVERS, name: "Driver Management", category: "logistics", defaultEnabled: false },
      { code: FEATURES.TRACKING, name: "GPS Tracking", category: "logistics", requiredTier: "pro" },
      // Legal modules
      { code: FEATURES.CASES, name: "Case Management", category: "legal", defaultEnabled: false },
      { code: FEATURES.CLIENTS, name: "Client Management", category: "legal", defaultEnabled: false },
      { code: FEATURES.DOCUMENTS, name: "Document Management", category: "legal", defaultEnabled: false },
      { code: FEATURES.COURT_DATES, name: "Court Date Tracking", category: "legal", defaultEnabled: false },
      { code: FEATURES.TIME_TRACKING, name: "Time Tracking", category: "legal", requiredTier: "pro" },
      // Customer Portal (admin controlled)
      { code: FEATURES.CUSTOMER_PORTAL, name: "Customer Portal", category: "customer_experience", defaultEnabled: false, requiredTier: "pro" },
    ];

    for (const feature of featureDefinitions) {
      const [existing] = await db.select().from(featureFlags).where(eq(featureFlags.code, feature.code));
      if (!existing) {
        await db.insert(featureFlags).values(feature);
      }
    }
  }
}

export const featureService = new FeatureService();
