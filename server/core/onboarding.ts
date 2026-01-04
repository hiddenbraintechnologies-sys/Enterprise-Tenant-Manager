import { db } from "../db";
import {
  onboardingFlows,
  onboardingSteps,
  onboardingProgress,
  tenants,
  type OnboardingFlow,
  type OnboardingStep,
  type OnboardingProgress,
  type InsertOnboardingFlow,
  type InsertOnboardingStep,
} from "@shared/schema";
import { eq, and, asc } from "drizzle-orm";
import { BusinessType, BUSINESS_TYPE_MODULES } from "./features";

interface OnboardingStepConfig {
  stepKey: string;
  title: string;
  description: string;
  component: string;
  isRequired?: boolean;
  isSkippable?: boolean;
  config?: Record<string, any>;
}

const COMMON_STEPS: OnboardingStepConfig[] = [
  {
    stepKey: "business_profile",
    title: "Business Profile",
    description: "Set up your business details and branding",
    component: "BusinessProfileStep",
    isRequired: true,
  },
  {
    stepKey: "contact_info",
    title: "Contact Information",
    description: "Add your business contact details",
    component: "ContactInfoStep",
    isRequired: true,
  },
];

const BUSINESS_SPECIFIC_STEPS: Record<BusinessType, OnboardingStepConfig[]> = {
  clinic: [
    { stepKey: "clinic_setup", title: "Clinic Setup", description: "Configure clinic departments and specialties", component: "ClinicSetupStep", isRequired: true },
    { stepKey: "staff_setup", title: "Staff & Doctors", description: "Add your medical staff", component: "StaffSetupStep", isSkippable: true },
    { stepKey: "appointment_slots", title: "Appointment Slots", description: "Set up appointment scheduling", component: "AppointmentSlotsStep", isSkippable: true },
  ],
  salon: [
    { stepKey: "services_setup", title: "Services", description: "Add your salon services and pricing", component: "ServicesSetupStep", isRequired: true },
    { stepKey: "staff_setup", title: "Stylists", description: "Add your team members", component: "StaffSetupStep", isSkippable: true },
    { stepKey: "booking_setup", title: "Booking Settings", description: "Configure booking preferences", component: "BookingSetupStep", isSkippable: true },
  ],
  pg: [
    { stepKey: "rooms_setup", title: "Rooms & Beds", description: "Set up your room inventory", component: "RoomsSetupStep", isRequired: true },
    { stepKey: "amenities", title: "Amenities", description: "List available amenities", component: "AmenitiesStep", isSkippable: true },
    { stepKey: "rent_setup", title: "Rent & Billing", description: "Configure rent and payment settings", component: "RentSetupStep", isRequired: true },
  ],
  coworking: [
    { stepKey: "spaces_setup", title: "Spaces & Desks", description: "Configure your workspace layout", component: "SpacesSetupStep", isRequired: true },
    { stepKey: "membership_plans", title: "Membership Plans", description: "Create membership tiers", component: "MembershipPlansStep", isRequired: true },
    { stepKey: "amenities", title: "Amenities", description: "List available amenities", component: "AmenitiesStep", isSkippable: true },
  ],
  service: [
    { stepKey: "services_setup", title: "Services", description: "Define your service offerings", component: "ServicesSetupStep", isRequired: true },
    { stepKey: "pricing_setup", title: "Pricing", description: "Set up your pricing structure", component: "PricingSetupStep", isRequired: true },
    { stepKey: "staff_setup", title: "Team", description: "Add team members", component: "StaffSetupStep", isSkippable: true },
  ],
  real_estate: [
    { stepKey: "agency_setup", title: "Agency Profile", description: "Set up your real estate agency", component: "AgencySetupStep", isRequired: true },
    { stepKey: "agents_setup", title: "Agents", description: "Add your real estate agents", component: "AgentsSetupStep", isSkippable: true },
    { stepKey: "property_types", title: "Property Types", description: "Configure property categories", component: "PropertyTypesStep", isSkippable: true },
  ],
  tourism: [
    { stepKey: "packages_setup", title: "Tour Packages", description: "Create your first tour packages", component: "PackagesSetupStep", isRequired: true },
    { stepKey: "vendors_setup", title: "Vendors", description: "Add partner vendors", component: "VendorsSetupStep", isSkippable: true },
    { stepKey: "itinerary_templates", title: "Itineraries", description: "Set up itinerary templates", component: "ItineraryTemplatesStep", isSkippable: true },
  ],
  education: [
    { stepKey: "institution_setup", title: "Institution Setup", description: "Configure your educational institution", component: "InstitutionSetupStep", isRequired: true },
    { stepKey: "courses_setup", title: "Courses", description: "Add courses and programs", component: "CoursesSetupStep", isRequired: true },
    { stepKey: "faculty_setup", title: "Faculty", description: "Add faculty members", component: "FacultySetupStep", isSkippable: true },
    { stepKey: "fee_structure", title: "Fee Structure", description: "Set up student fees", component: "FeeStructureStep", isRequired: true },
  ],
  logistics: [
    { stepKey: "fleet_setup", title: "Fleet Setup", description: "Add your vehicles", component: "FleetSetupStep", isRequired: true },
    { stepKey: "drivers_setup", title: "Drivers", description: "Add driver profiles", component: "DriversSetupStep", isSkippable: true },
    { stepKey: "routes_setup", title: "Routes", description: "Configure common routes", component: "RoutesSetupStep", isSkippable: true },
    { stepKey: "tracking_setup", title: "Tracking", description: "Set up GPS tracking", component: "TrackingSetupStep", isSkippable: true },
  ],
  legal: [
    { stepKey: "firm_setup", title: "Firm Profile", description: "Set up your law firm details", component: "FirmSetupStep", isRequired: true },
    { stepKey: "practice_areas", title: "Practice Areas", description: "Define areas of practice", component: "PracticeAreasStep", isRequired: true },
    { stepKey: "attorneys_setup", title: "Attorneys", description: "Add attorneys and staff", component: "AttorneysSetupStep", isSkippable: true },
    { stepKey: "billing_rates", title: "Billing Rates", description: "Set up hourly rates", component: "BillingRatesStep", isRequired: true },
  ],
};

const COMPLETION_STEP: OnboardingStepConfig = {
  stepKey: "completion",
  title: "All Set!",
  description: "Your account is ready to use",
  component: "CompletionStep",
  isRequired: true,
};

export class OnboardingService {
  async getFlowForBusinessType(businessType: BusinessType): Promise<OnboardingFlow | null> {
    const [flow] = await db.select()
      .from(onboardingFlows)
      .where(and(
        eq(onboardingFlows.businessType, businessType),
        eq(onboardingFlows.isActive, true)
      ))
      .orderBy(asc(onboardingFlows.version))
      .limit(1);
    
    return flow || null;
  }

  async getFlowSteps(flowId: string): Promise<OnboardingStep[]> {
    return db.select()
      .from(onboardingSteps)
      .where(eq(onboardingSteps.flowId, flowId))
      .orderBy(asc(onboardingSteps.stepOrder));
  }

  async getTenantProgress(tenantId: string): Promise<{
    progress: OnboardingProgress | null;
    flow: OnboardingFlow | null;
    steps: OnboardingStep[];
    currentStep: OnboardingStep | null;
  }> {
    const [progressRecord] = await db.select()
      .from(onboardingProgress)
      .where(eq(onboardingProgress.tenantId, tenantId));

    if (!progressRecord) {
      return { progress: null, flow: null, steps: [], currentStep: null };
    }

    const [flow] = await db.select()
      .from(onboardingFlows)
      .where(eq(onboardingFlows.id, progressRecord.flowId));

    const steps = await this.getFlowSteps(progressRecord.flowId);
    const currentStep = steps[progressRecord.currentStepIndex || 0] || null;

    return { progress: progressRecord, flow, steps, currentStep };
  }

  async initializeOnboarding(tenantId: string, businessType: BusinessType): Promise<OnboardingProgress> {
    let flow = await this.getFlowForBusinessType(businessType);
    
    if (!flow) {
      flow = await this.createFlowForBusinessType(businessType);
    }

    const [existing] = await db.select()
      .from(onboardingProgress)
      .where(eq(onboardingProgress.tenantId, tenantId));

    if (existing) {
      return existing;
    }

    const [progress] = await db.insert(onboardingProgress)
      .values({
        tenantId,
        flowId: flow.id,
        currentStepIndex: 0,
        status: "in_progress",
        stepData: {},
        startedAt: new Date(),
        lastActivityAt: new Date(),
      })
      .returning();

    return progress;
  }

  async saveStepData(
    tenantId: string, 
    stepKey: string, 
    data: Record<string, any>
  ): Promise<OnboardingProgress> {
    const { progress } = await this.getTenantProgress(tenantId);
    
    if (!progress) {
      throw new Error("No onboarding progress found for tenant");
    }

    const currentStepData = (progress.stepData as Record<string, any>) || {};
    const updatedStepData = {
      ...currentStepData,
      [stepKey]: data,
    };

    const [updated] = await db.update(onboardingProgress)
      .set({
        stepData: updatedStepData,
        lastActivityAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(onboardingProgress.id, progress.id))
      .returning();

    return updated;
  }

  async advanceStep(tenantId: string): Promise<{
    progress: OnboardingProgress;
    isComplete: boolean;
    nextStep: OnboardingStep | null;
  }> {
    const { progress, steps } = await this.getTenantProgress(tenantId);
    
    if (!progress) {
      throw new Error("No onboarding progress found for tenant");
    }

    const currentIndex = progress.currentStepIndex || 0;
    const nextIndex = currentIndex + 1;
    const isComplete = nextIndex >= steps.length;

    if (isComplete) {
      const [updated] = await db.update(onboardingProgress)
        .set({
          status: "completed",
          completedAt: new Date(),
          lastActivityAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(onboardingProgress.id, progress.id))
        .returning();

      await db.update(tenants)
        .set({
          onboardingCompleted: true,
          businessTypeLocked: true,
          updatedAt: new Date(),
        })
        .where(eq(tenants.id, tenantId));

      return { progress: updated, isComplete: true, nextStep: null };
    }

    const [updated] = await db.update(onboardingProgress)
      .set({
        currentStepIndex: nextIndex,
        lastActivityAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(onboardingProgress.id, progress.id))
      .returning();

    return { progress: updated, isComplete: false, nextStep: steps[nextIndex] };
  }

  async skipStep(tenantId: string): Promise<{
    progress: OnboardingProgress;
    isComplete: boolean;
    nextStep: OnboardingStep | null;
  }> {
    const { progress, steps } = await this.getTenantProgress(tenantId);
    
    if (!progress) {
      throw new Error("No onboarding progress found for tenant");
    }

    const currentIndex = progress.currentStepIndex || 0;
    const currentStep = steps[currentIndex];

    if (currentStep && !currentStep.isSkippable) {
      throw new Error("This step cannot be skipped");
    }

    return this.advanceStep(tenantId);
  }

  async canModifyBusinessType(tenantId: string): Promise<boolean> {
    const [tenant] = await db.select()
      .from(tenants)
      .where(eq(tenants.id, tenantId));

    return tenant ? !tenant.businessTypeLocked : false;
  }

  async isOnboardingRequired(tenantId: string): Promise<boolean> {
    const [tenant] = await db.select()
      .from(tenants)
      .where(eq(tenants.id, tenantId));

    return tenant ? !tenant.onboardingCompleted : true;
  }

  private async createFlowForBusinessType(businessType: BusinessType): Promise<OnboardingFlow> {
    const [flow] = await db.insert(onboardingFlows)
      .values({
        businessType,
        name: `${businessType.charAt(0).toUpperCase() + businessType.slice(1)} Onboarding`,
        description: `Onboarding flow for ${businessType} businesses`,
        version: 1,
        isActive: true,
      })
      .returning();

    const allSteps = [
      ...COMMON_STEPS,
      ...(BUSINESS_SPECIFIC_STEPS[businessType] || []),
      COMPLETION_STEP,
    ];

    for (let i = 0; i < allSteps.length; i++) {
      const step = allSteps[i];
      await db.insert(onboardingSteps).values({
        flowId: flow.id,
        stepOrder: i,
        stepKey: step.stepKey,
        title: step.title,
        description: step.description || "",
        component: step.component,
        isRequired: step.isRequired ?? true,
        isSkippable: step.isSkippable ?? false,
        config: step.config || {},
      });
    }

    return flow;
  }

  async seedDefaultFlows(): Promise<void> {
    const businessTypes: BusinessType[] = [
      "clinic", "salon", "pg", "coworking", "service",
      "real_estate", "tourism", "education", "logistics", "legal"
    ];

    for (const businessType of businessTypes) {
      const existing = await this.getFlowForBusinessType(businessType);
      if (!existing) {
        await this.createFlowForBusinessType(businessType);
        console.log(`  [ADD] Created onboarding flow for ${businessType}`);
      }
    }
  }
}

export const onboardingService = new OnboardingService();
