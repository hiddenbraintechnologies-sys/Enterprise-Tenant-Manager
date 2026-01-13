import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertCircle, CheckCircle, AlertTriangle, Clock, DollarSign } from "lucide-react";

interface ProjectHealthProps {
  budget?: string | number | null;
  spentBudget?: string | number | null;
  estimatedHours?: string | number | null;
  actualHours?: string | number | null;
  hourlyRate?: string | number | null;
  startDate?: string | null;
  endDate?: string | null;
  status?: string;
  compact?: boolean;
}

type HealthStatus = "healthy" | "warning" | "critical" | "unknown";

interface HealthResult {
  status: HealthStatus;
  percentage: number;
  label: string;
}

function parseNumber(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const num = typeof value === "string" ? parseFloat(value) : value;
  return isNaN(num) ? null : num;
}

function calculateBudgetHealth(props: ProjectHealthProps): HealthResult {
  const budget = parseNumber(props.budget);
  const estimatedHours = parseNumber(props.estimatedHours);
  const actualHours = parseNumber(props.actualHours) || 0;
  const hourlyRate = parseNumber(props.hourlyRate);
  const spentBudget = parseNumber(props.spentBudget);

  let spent = spentBudget;
  let total = budget;

  if (spent === null && actualHours > 0 && hourlyRate) {
    spent = actualHours * hourlyRate;
  }

  if (total === null && estimatedHours && hourlyRate) {
    total = estimatedHours * hourlyRate;
  }

  if (total === null && estimatedHours) {
    total = estimatedHours;
    spent = actualHours;
  }

  if (total === null || total <= 0) {
    return { status: "unknown", percentage: 0, label: "No budget set" };
  }

  spent = spent || 0;
  const rawPercentage = (spent / total) * 100;
  const displayPercentage = Math.min(rawPercentage, 100);
  
  let status: HealthStatus = "healthy";
  if (rawPercentage >= 100) {
    status = "critical";
  } else if (rawPercentage >= 80) {
    status = "warning";
  }

  const label = rawPercentage > 100 
    ? `${Math.round(rawPercentage)}% over budget` 
    : `${Math.round(rawPercentage)}% of budget used`;

  return {
    status,
    percentage: Math.round(displayPercentage),
    label,
  };
}

function calculateTimelineHealth(props: ProjectHealthProps): HealthResult {
  if (!props.startDate || !props.endDate) {
    return { status: "unknown", percentage: 0, label: "No timeline set" };
  }

  const start = new Date(props.startDate);
  const end = new Date(props.endDate);
  const now = new Date();
  
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return { status: "unknown", percentage: 0, label: "Invalid dates" };
  }

  const totalDuration = end.getTime() - start.getTime();
  if (totalDuration <= 0) {
    return { status: "unknown", percentage: 0, label: "Invalid timeline" };
  }

  const elapsed = now.getTime() - start.getTime();
  const percentage = Math.max(0, Math.min((elapsed / totalDuration) * 100, 100));

  let status: HealthStatus = "healthy";
  
  if (now > end) {
    status = "critical";
  } else if (percentage >= 90) {
    status = "warning";
  } else if (now < start) {
    status = "healthy";
  }

  if (props.status === "completed") {
    return { status: "healthy", percentage: 100, label: "Completed" };
  }

  if (now > end) {
    const daysOverdue = Math.ceil((now.getTime() - end.getTime()) / (1000 * 60 * 60 * 24));
    return { status: "critical", percentage: 100, label: `${daysOverdue} days overdue` };
  }

  if (now < start) {
    const daysUntilStart = Math.ceil((start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return { status: "healthy", percentage: 0, label: `Starts in ${daysUntilStart} days` };
  }

  const daysRemaining = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return {
    status,
    percentage: Math.round(percentage),
    label: `${daysRemaining} days remaining`,
  };
}

function getStatusColor(status: HealthStatus): string {
  switch (status) {
    case "healthy":
      return "text-emerald-600 dark:text-emerald-400";
    case "warning":
      return "text-amber-600 dark:text-amber-400";
    case "critical":
      return "text-destructive dark:text-red-400";
    default:
      return "text-muted-foreground";
  }
}

function getProgressColor(status: HealthStatus): string {
  switch (status) {
    case "healthy":
      return "bg-emerald-500";
    case "warning":
      return "bg-amber-500";
    case "critical":
      return "bg-destructive";
    default:
      return "bg-muted";
  }
}

function StatusIcon({ status, className }: { status: HealthStatus; className?: string }) {
  switch (status) {
    case "healthy":
      return <CheckCircle className={cn("h-4 w-4", className)} />;
    case "warning":
      return <AlertTriangle className={cn("h-4 w-4", className)} />;
    case "critical":
      return <AlertCircle className={cn("h-4 w-4", className)} />;
    default:
      return null;
  }
}

export function ProjectHealthIndicator(props: ProjectHealthProps) {
  const budgetHealth = calculateBudgetHealth(props);
  const timelineHealth = calculateTimelineHealth(props);
  
  const overallStatus: HealthStatus = 
    budgetHealth.status === "critical" || timelineHealth.status === "critical"
      ? "critical"
      : budgetHealth.status === "warning" || timelineHealth.status === "warning"
      ? "warning"
      : budgetHealth.status === "healthy" || timelineHealth.status === "healthy"
      ? "healthy"
      : "unknown";

  if (props.compact) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn("flex items-center gap-1", getStatusColor(overallStatus))} data-testid="project-health-compact">
            <StatusIcon status={overallStatus} />
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <DollarSign className="h-3 w-3" />
              <span>Budget: {budgetHealth.label}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-3 w-3" />
              <span>Timeline: {timelineHealth.label}</span>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <div className="space-y-3" data-testid="project-health-full">
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <DollarSign className="h-3.5 w-3.5" />
            Budget
          </span>
          <span className={cn("flex items-center gap-1", getStatusColor(budgetHealth.status))}>
            <StatusIcon status={budgetHealth.status} className="h-3.5 w-3.5" />
            {budgetHealth.label}
          </span>
        </div>
        <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className={cn("h-full transition-all", getProgressColor(budgetHealth.status))}
            style={{ width: `${budgetHealth.percentage}%` }}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            Timeline
          </span>
          <span className={cn("flex items-center gap-1", getStatusColor(timelineHealth.status))}>
            <StatusIcon status={timelineHealth.status} className="h-3.5 w-3.5" />
            {timelineHealth.label}
          </span>
        </div>
        <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className={cn("h-full transition-all", getProgressColor(timelineHealth.status))}
            style={{ width: `${timelineHealth.percentage}%` }}
          />
        </div>
      </div>
    </div>
  );
}

export function ProjectHealthBadge(props: ProjectHealthProps) {
  const budgetHealth = calculateBudgetHealth(props);
  const timelineHealth = calculateTimelineHealth(props);
  
  const overallStatus: HealthStatus = 
    budgetHealth.status === "critical" || timelineHealth.status === "critical"
      ? "critical"
      : budgetHealth.status === "warning" || timelineHealth.status === "warning"
      ? "warning"
      : budgetHealth.status === "healthy" || timelineHealth.status === "healthy"
      ? "healthy"
      : "unknown";

  const badgeClass = {
    healthy: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20",
    warning: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/20",
    critical: "bg-destructive/15 text-destructive dark:text-red-400 border border-destructive/20",
    unknown: "bg-muted text-muted-foreground border border-border",
  };

  const label = {
    healthy: "On Track",
    warning: "At Risk",
    critical: "Critical",
    unknown: "No Data",
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span 
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
            badgeClass[overallStatus]
          )}
          data-testid="project-health-badge"
        >
          <StatusIcon status={overallStatus} className="h-3 w-3" />
          {label[overallStatus]}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <DollarSign className="h-3 w-3" />
            <span>Budget: {budgetHealth.label}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-3 w-3" />
            <span>Timeline: {timelineHealth.label}</span>
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
