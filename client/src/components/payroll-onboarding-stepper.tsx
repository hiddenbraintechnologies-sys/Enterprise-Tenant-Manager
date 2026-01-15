import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { 
  Settings, Users, Wallet, CalendarCheck, 
  FileSpreadsheet, Download, Check, ChevronRight,
  Building2, PartyPopper
} from "lucide-react";

interface Step {
  id: number;
  title: string;
  description: string;
  icon: React.ReactNode;
  tasks: string[];
  completed: boolean;
}

interface PayrollOnboardingStepperProps {
  currentStep?: number;
  completedSteps?: number[];
  onStepClick?: (stepId: number) => void;
  onComplete?: () => void;
}

const STEPS: Step[] = [
  {
    id: 1,
    title: "Company Payroll Settings",
    description: "Configure your company's payroll preferences",
    icon: <Settings className="h-5 w-5" />,
    tasks: [
      "Set pay cycle (monthly)",
      "Enable PF / ESI (optional)",
      "Choose payout method (bank/UPI export)"
    ],
    completed: false
  },
  {
    id: 2,
    title: "Add Employees",
    description: "Add your team members to payroll",
    icon: <Users className="h-5 w-5" />,
    tasks: [
      "Add employee details",
      "Assign salary structure",
      "Select effective date"
    ],
    completed: false
  },
  {
    id: 3,
    title: "Configure Salary",
    description: "Set up salary components and deductions",
    icon: <Wallet className="h-5 w-5" />,
    tasks: [
      "Basic, HRA, allowances",
      "Deductions (PF, ESI, PT)",
      "Verify CTC"
    ],
    completed: false
  },
  {
    id: 4,
    title: "Review Attendance",
    description: "Check attendance before processing",
    icon: <CalendarCheck className="h-5 w-5" />,
    tasks: [
      "Check attendance & leave summary",
      "Review overtime / unpaid days"
    ],
    completed: false
  },
  {
    id: 5,
    title: "Generate Pay Run",
    description: "Process payroll for the month",
    icon: <FileSpreadsheet className="h-5 w-5" />,
    tasks: [
      "Generate payroll for the month",
      "Review net pay",
      "Approve"
    ],
    completed: false
  },
  {
    id: 6,
    title: "Payslips & Payment",
    description: "Distribute payslips and process payments",
    icon: <Download className="h-5 w-5" />,
    tasks: [
      "Download payslips",
      "Mark as paid",
      "Export bank file (optional)"
    ],
    completed: false
  }
];

export function PayrollOnboardingStepper({
  currentStep = 1,
  completedSteps = [],
  onStepClick,
  onComplete
}: PayrollOnboardingStepperProps) {
  const [expandedStep, setExpandedStep] = useState<number | null>(currentStep);

  const steps = STEPS.map(step => ({
    ...step,
    completed: completedSteps.includes(step.id)
  }));

  const completedCount = completedSteps.length;
  const progress = (completedCount / steps.length) * 100;
  const isAllComplete = completedCount === steps.length;

  const handleStepClick = (stepId: number) => {
    setExpandedStep(expandedStep === stepId ? null : stepId);
    onStepClick?.(stepId);
  };

  if (isAllComplete) {
    return (
      <Card className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30" data-testid="card-onboarding-complete">
        <CardContent className="pt-6 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-4 rounded-full bg-green-100 dark:bg-green-900/50">
              <PartyPopper className="h-8 w-8 text-green-600" />
            </div>
          </div>
          <h3 className="text-xl font-bold text-green-800 dark:text-green-200 mb-2" data-testid="text-complete-title">
            Payroll is ready!
          </h3>
          <p className="text-green-700 dark:text-green-300 mb-4" data-testid="text-complete-message">
            You can now run payroll every month in minutes.
          </p>
          <Button onClick={onComplete} data-testid="button-start-payroll">
            Start Running Payroll
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="card-payroll-onboarding">
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <Building2 className="h-5 w-5 text-primary" />
            <div>
              <CardTitle data-testid="text-onboarding-title">Payroll Setup</CardTitle>
              <CardDescription>Complete these steps to start running payroll</CardDescription>
            </div>
          </div>
          <Badge variant="secondary" data-testid="badge-progress-count">
            <span data-testid="text-completed-count">{completedCount}</span> of <span data-testid="text-total-steps">{steps.length}</span> complete
          </Badge>
        </div>
        <Progress value={progress} className="mt-4" data-testid="progress-onboarding" />
      </CardHeader>

      <CardContent className="space-y-2">
        {steps.map((step, index) => {
          const isExpanded = expandedStep === step.id;
          const isCurrent = step.id === currentStep;
          const isCompleted = step.completed;
          const isPast = step.id < currentStep;

          return (
            <div
              key={step.id}
              className={cn(
                "rounded-lg border transition-colors",
                isCompleted && "border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/20",
                isCurrent && !isCompleted && "border-primary bg-primary/5",
                !isCompleted && !isCurrent && "border-muted"
              )}
              data-testid={`step-${step.id}`}
            >
              <button
                onClick={() => handleStepClick(step.id)}
                className="w-full flex items-center gap-4 p-4 text-left hover-elevate rounded-lg"
                data-testid={`button-step-${step.id}`}
              >
                <div className={cn(
                  "flex items-center justify-center w-10 h-10 rounded-full shrink-0",
                  isCompleted && "bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400",
                  isCurrent && !isCompleted && "bg-primary/10 text-primary",
                  !isCompleted && !isCurrent && "bg-muted text-muted-foreground"
                )}>
                  {isCompleted ? <Check className="h-5 w-5" /> : step.icon}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "font-medium",
                      isCompleted && "text-green-700 dark:text-green-300"
                    )}>
                      Step {step.id}: {step.title}
                    </span>
                    {isCurrent && !isCompleted && (
                      <Badge variant="default" className="text-xs">Current</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {step.description}
                  </p>
                </div>

                <ChevronRight className={cn(
                  "h-5 w-5 text-muted-foreground transition-transform shrink-0",
                  isExpanded && "rotate-90"
                )} />
              </button>

              {isExpanded && (
                <div className="px-4 pb-4 ml-14" data-testid={`tasks-step-${step.id}`}>
                  <ul className="space-y-2">
                    {step.tasks.map((task, taskIndex) => (
                      <li key={taskIndex} className="flex items-center gap-2 text-sm">
                        <Check className={cn(
                          "h-4 w-4 shrink-0",
                          isCompleted ? "text-green-600" : "text-muted-foreground"
                        )} />
                        <span className={isCompleted ? "text-green-700 dark:text-green-300" : ""}>
                          {task}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
