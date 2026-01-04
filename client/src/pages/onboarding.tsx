import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Loader2, ChevronRight, Check, SkipForward, Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { BusinessProfileStep } from "@/components/onboarding/business-profile-step";
import { ContactInfoStep } from "@/components/onboarding/contact-info-step";
import { GenericSetupStep } from "@/components/onboarding/generic-setup-step";
import { CompletionStep } from "@/components/onboarding/completion-step";

interface OnboardingStep {
  id: string;
  flowId: string;
  stepOrder: number;
  stepKey: string;
  title: string;
  description: string;
  component: string;
  isRequired: boolean;
  isSkippable: boolean;
  config: Record<string, any>;
}

interface OnboardingProgress {
  id: string;
  tenantId: string;
  flowId: string;
  currentStepIndex: number;
  status: "not_started" | "in_progress" | "completed" | "skipped";
  stepData: Record<string, any>;
  startedAt: string | null;
  completedAt: string | null;
}

interface OnboardingStatus {
  isRequired: boolean;
  progress: OnboardingProgress | null;
  flow: { id: string; name: string; businessType: string } | null;
  steps: OnboardingStep[];
  currentStep: OnboardingStep | null;
  totalSteps: number;
  completedSteps: number;
}

const STEP_COMPONENTS: Record<string, any> = {
  BusinessProfileStep,
  ContactInfoStep,
  CompletionStep,
  ClinicSetupStep: GenericSetupStep,
  StaffSetupStep: GenericSetupStep,
  AppointmentSlotsStep: GenericSetupStep,
  ServicesSetupStep: GenericSetupStep,
  BookingSetupStep: GenericSetupStep,
  RoomsSetupStep: GenericSetupStep,
  AmenitiesStep: GenericSetupStep,
  RentSetupStep: GenericSetupStep,
  SpacesSetupStep: GenericSetupStep,
  MembershipPlansStep: GenericSetupStep,
  PricingSetupStep: GenericSetupStep,
  AgencySetupStep: GenericSetupStep,
  AgentsSetupStep: GenericSetupStep,
  PropertyTypesStep: GenericSetupStep,
  PackagesSetupStep: GenericSetupStep,
  VendorsSetupStep: GenericSetupStep,
  ItineraryTemplatesStep: GenericSetupStep,
  InstitutionSetupStep: GenericSetupStep,
  CoursesSetupStep: GenericSetupStep,
  FacultySetupStep: GenericSetupStep,
  FeeStructureStep: GenericSetupStep,
  FleetSetupStep: GenericSetupStep,
  DriversSetupStep: GenericSetupStep,
  RoutesSetupStep: GenericSetupStep,
  TrackingSetupStep: GenericSetupStep,
  FirmSetupStep: GenericSetupStep,
  PracticeAreasStep: GenericSetupStep,
  AttorneysSetupStep: GenericSetupStep,
  BillingRatesStep: GenericSetupStep,
};

export default function OnboardingPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const { data: status, isLoading, refetch } = useQuery<OnboardingStatus>({
    queryKey: ["/api/onboarding/status"],
  });

  const initializeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/onboarding/initialize");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/onboarding/status"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to initialize onboarding",
        variant: "destructive",
      });
    },
  });

  const saveStepMutation = useMutation({
    mutationFn: async ({ stepKey, data }: { stepKey: string; data: any }) => {
      const res = await apiRequest("POST", `/api/onboarding/step/${stepKey}`, { data });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/onboarding/status"] });
    },
  });

  const advanceMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/onboarding/advance");
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/onboarding/status"] });
      if (data.isComplete) {
        toast({
          title: "Onboarding Complete",
          description: "Welcome to your dashboard!",
        });
        navigate("/dashboard");
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to advance step",
        variant: "destructive",
      });
    },
  });

  const skipMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/onboarding/skip");
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/onboarding/status"] });
      if (data.isComplete) {
        toast({
          title: "Onboarding Complete",
          description: "Welcome to your dashboard!",
        });
        navigate("/dashboard");
      }
    },
    onError: (error: any) => {
      toast({
        title: "Cannot Skip",
        description: error.message || "This step cannot be skipped",
        variant: "destructive",
      });
    },
  });

  const handleStepComplete = async (stepKey: string, data: any) => {
    await saveStepMutation.mutateAsync({ stepKey, data });
    await advanceMutation.mutateAsync();
  };

  const handleSkip = () => {
    skipMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen" data-testid="loading-onboarding">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!status?.isRequired) {
    navigate("/dashboard");
    return null;
  }

  if (!status.progress) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Card className="w-full max-w-md mx-4">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <CardTitle data-testid="text-welcome-title">Welcome to BizFlow</CardTitle>
            <CardDescription>
              Let's set up your business in just a few steps
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => initializeMutation.mutate()}
              disabled={initializeMutation.isPending}
              className="w-full"
              data-testid="button-start-onboarding"
            >
              {initializeMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Get Started
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { progress, steps, currentStep, totalSteps, completedSteps } = status;
  const progressPercent = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

  const StepComponent = currentStep ? STEP_COMPONENTS[currentStep.component] || GenericSetupStep : null;
  const stepData = (progress?.stepData as Record<string, any>) || {};

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl font-semibold" data-testid="text-onboarding-title">
              {status.flow?.name || "Setup Your Account"}
            </h1>
            <Badge variant="secondary" data-testid="badge-step-counter">
              Step {completedSteps + 1} of {totalSteps}
            </Badge>
          </div>
          <Progress value={progressPercent} className="h-2" data-testid="progress-onboarding" />
        </div>

        <div className="flex gap-4 mb-6 overflow-x-auto pb-2">
          {steps.map((step, index) => {
            const isCompleted = index < completedSteps;
            const isCurrent = index === completedSteps;
            
            return (
              <div
                key={step.id}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm whitespace-nowrap ${
                  isCurrent
                    ? "bg-primary text-primary-foreground"
                    : isCompleted
                    ? "bg-muted text-muted-foreground"
                    : "text-muted-foreground"
                }`}
                data-testid={`step-indicator-${step.stepKey}`}
              >
                {isCompleted ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <span className="h-4 w-4 flex items-center justify-center text-xs font-medium">
                    {index + 1}
                  </span>
                )}
                <span>{step.title}</span>
              </div>
            );
          })}
        </div>

        {currentStep && StepComponent && (
          <Card>
            <CardHeader>
              <CardTitle data-testid="text-current-step-title">{currentStep.title}</CardTitle>
              <CardDescription>{currentStep.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <StepComponent
                step={currentStep}
                stepData={stepData[currentStep.stepKey] || {}}
                onComplete={(data: any) => handleStepComplete(currentStep.stepKey, data)}
                isLoading={saveStepMutation.isPending || advanceMutation.isPending}
              />
              
              {currentStep.isSkippable && (
                <div className="mt-4 pt-4 border-t">
                  <Button
                    variant="ghost"
                    onClick={handleSkip}
                    disabled={skipMutation.isPending}
                    className="w-full"
                    data-testid="button-skip-step"
                  >
                    {skipMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <SkipForward className="h-4 w-4 mr-2" />
                    )}
                    Skip this step
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
