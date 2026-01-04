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
    { stepKey: "agency_details", title: "Agency Details", description: "Enter your real estate agency info", component: "AgencyDetailsStep", isRequired: true },
    { stepKey: "property_categories", title: "Property Categories", description: "Define property types you deal with", component: "PropertyCategoriesStep", isRequired: true },
    { stepKey: "agent_onboarding", title: "Agent Onboarding", description: "Add your real estate agents", component: "AgentOnboardingStep", isSkippable: true },
  ],
  tourism: [
    { stepKey: "package_templates", title: "Package Templates", description: "Create tour package templates", component: "PackageTemplatesStep", isRequired: true },
    { stepKey: "vendor_setup", title: "Vendor Setup", description: "Add partner hotels, transport, guides", component: "VendorSetupStep", isSkippable: true },
  ],
  education: [
    { stepKey: "institution_setup", title: "Institution Details", description: "Enter your institution name, type, and basic info", component: "InstitutionSetupStep", isRequired: true },
    { stepKey: "courses_batches", title: "Courses & Batches", description: "Add your courses and student batches", component: "CoursesBatchesStep", isRequired: true },
    { stepKey: "fee_structure", title: "Fee Structure", description: "Set up fee categories and amounts", component: "FeeStructureStep", isRequired: true },
    { stepKey: "admin_staff", title: "Admin Staff", description: "Add administrative staff members", component: "AdminStaffStep", isSkippable: true },
  ],
  logistics: [
    { stepKey: "fleet_details", title: "Fleet Details", description: "Add your vehicles and fleet info", component: "FleetDetailsStep", isRequired: true },
    { stepKey: "driver_onboarding", title: "Driver Onboarding", description: "Add driver profiles and licenses", component: "DriverOnboardingStep", isSkippable: true },
    { stepKey: "service_areas", title: "Service Areas", description: "Define your delivery zones and regions", component: "ServiceAreasStep", isRequired: true },
    { stepKey: "pricing_rules", title: "Pricing Rules", description: "Set up distance and weight-based pricing", component: "PricingRulesStep", isRequired: true },
  ],
  legal: [
    { stepKey: "firm_profile", title: "Firm Profile", description: "Enter your law firm details", component: "FirmProfileStep", isRequired: true },
    { stepKey: "practice_areas", title: "Practice Areas", description: "Select your areas of legal practice", component: "PracticeAreasStep", isRequired: true },
    { stepKey: "lawyer_staff", title: "Lawyers & Staff", description: "Add attorneys and support staff", component: "LawyerStaffStep", isSkippable: true },
    { stepKey: "case_templates", title: "Case Templates", description: "Create reusable case templates", component: "CaseTemplatesStep", isSkippable: true },
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
