import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowRight, Check, FileText, Info, Loader2, Users, X } from "lucide-react";
import {
  getLostFeatures,
  getReducedLimits,
  formatLimitDisplay,
  type PlanWithFlags,
} from "@shared/billing/downgrade-helpers";

interface Plan extends PlanWithFlags {
  id: string;
  name: string;
  tier: string;
}

interface DowngradeConfirmModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPlan: Plan;
  targetPlan: Plan;
  effectiveAt: Date | string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const LIMIT_ICONS: Record<string, typeof Users> = {
  users: Users,
  records: FileText,
  customers: Users,
};

export function DowngradeConfirmModal({
  open,
  onOpenChange,
  currentPlan,
  targetPlan,
  effectiveAt,
  onConfirm,
  onCancel,
  isLoading = false,
}: DowngradeConfirmModalProps) {
  const lostFeatures = getLostFeatures(currentPlan, targetPlan);
  const reducedLimits = getReducedLimits(currentPlan, targetPlan);
  
  const formattedDate = typeof effectiveAt === "string" 
    ? new Date(effectiveAt).toLocaleDateString("en-IN", { 
        day: "numeric", 
        month: "long", 
        year: "numeric" 
      })
    : effectiveAt.toLocaleDateString("en-IN", { 
        day: "numeric", 
        month: "long", 
        year: "numeric" 
      });

  const hasLostFeatures = lostFeatures.length > 0;
  const hasReducedLimits = reducedLimits.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle data-testid="modal-title-downgrade-confirm">
            Confirm plan downgrade
          </DialogTitle>
          <DialogDescription className="pt-2 space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{currentPlan.name}</Badge>
              <ArrowRight className="h-4 w-4" />
              <Badge variant="outline">{targetPlan.name}</Badge>
            </div>
            <p className="text-sm">
              Your downgrade will take effect on <span className="font-medium">{formattedDate}</span>.
              <br />
              You'll continue to enjoy your current plan features until then.
            </p>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div data-testid="section-lost-features">
            <h4 className="text-sm font-medium mb-3">
              You'll lose access to these features
            </h4>
            {hasLostFeatures ? (
              <ul className="space-y-2.5">
                {lostFeatures.map((feature) => (
                  <li 
                    key={feature.key} 
                    className="flex items-start gap-2 text-sm"
                    data-testid={`lost-feature-${feature.key}`}
                  >
                    <X className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                    <div>
                      <span className="font-medium">{feature.label}</span>
                      <span className="text-muted-foreground"> – {feature.description}</span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex items-center gap-2 text-sm text-muted-foreground" data-testid="no-lost-features">
                <Check className="h-4 w-4 text-green-600" />
                No features will be removed.
              </div>
            )}
          </div>

          <Separator />

          <div data-testid="section-reduced-limits">
            <h4 className="text-sm font-medium mb-3">
              Your limits will change
            </h4>
            {hasReducedLimits ? (
              <ul className="space-y-2.5">
                {reducedLimits.map((limit) => {
                  const Icon = LIMIT_ICONS[limit.key] || FileText;
                  return (
                    <li 
                      key={limit.key} 
                      className="flex items-center gap-2 text-sm"
                      data-testid={`reduced-limit-${limit.key}`}
                    >
                      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="font-medium">{limit.label}:</span>
                      <span className="text-muted-foreground">
                        {formatLimitDisplay(limit.from)}
                      </span>
                      <ArrowRight className="h-3 w-3" />
                      <span className="font-medium">
                        {formatLimitDisplay(limit.to)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="flex items-center gap-2 text-sm text-muted-foreground" data-testid="no-reduced-limits">
                <Check className="h-4 w-4 text-green-600" />
                Your usage limits will remain the same.
              </div>
            )}
          </div>

          <div className="p-3 rounded-md bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-blue-700 dark:text-blue-300">
                  No immediate changes
                </p>
                <p className="text-blue-600 dark:text-blue-400 mt-1">
                  You can continue using all your current features until {formattedDate}.
                  You can also cancel or change this downgrade anytime before that date.
                </p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
            data-testid="button-cancel-downgrade-modal"
          >
            Go back
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isLoading}
            data-testid="button-confirm-downgrade"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              "Confirm downgrade"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
