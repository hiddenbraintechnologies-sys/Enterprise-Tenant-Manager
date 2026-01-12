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
import { AlertTriangle, ArrowRight, Calendar, Loader2, Minus, XCircle } from "lucide-react";
import {
  getLostFeatures,
  getReducedLimits,
  formatLimitDisplay,
  type LostFeature,
  type ReducedLimit,
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

  const hasChanges = lostFeatures.length > 0 || reducedLimits.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2" data-testid="modal-title-downgrade-confirm">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Confirm Downgrade
          </DialogTitle>
          <DialogDescription className="pt-2">
            <div className="flex items-center gap-2 text-base">
              <Badge variant="secondary">{currentPlan.name}</Badge>
              <ArrowRight className="h-4 w-4" />
              <Badge variant="outline">{targetPlan.name}</Badge>
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex items-start gap-2 p-3 rounded-md bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800">
            <Calendar className="h-4 w-4 text-orange-600 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-orange-700 dark:text-orange-300">
                Effective on {formattedDate}
              </p>
              <p className="text-muted-foreground mt-0.5">
                You keep all current features until then.
              </p>
            </div>
          </div>

          {lostFeatures.length > 0 && (
            <div data-testid="section-lost-features">
              <h4 className="text-sm font-medium mb-2 flex items-center gap-1.5">
                <XCircle className="h-4 w-4 text-destructive" />
                Features you will lose
              </h4>
              <ul className="space-y-2">
                {lostFeatures.map((feature) => (
                  <li 
                    key={feature.key} 
                    className="text-sm pl-5 border-l-2 border-destructive/30"
                    data-testid={`lost-feature-${feature.key}`}
                  >
                    <span className="font-medium">{feature.label}</span>
                    <span className="block text-xs text-muted-foreground">
                      {feature.description}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {reducedLimits.length > 0 && (
            <>
              {lostFeatures.length > 0 && <Separator />}
              <div data-testid="section-reduced-limits">
                <h4 className="text-sm font-medium mb-2 flex items-center gap-1.5">
                  <Minus className="h-4 w-4 text-orange-500" />
                  Limits that will decrease
                </h4>
                <ul className="space-y-2">
                  {reducedLimits.map((limit) => (
                    <li 
                      key={limit.key} 
                      className="text-sm pl-5 border-l-2 border-orange-300"
                      data-testid={`reduced-limit-${limit.key}`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{limit.label}:</span>
                        <span className="text-muted-foreground">
                          {formatLimitDisplay(limit.from)}
                        </span>
                        <ArrowRight className="h-3 w-3" />
                        <span className="text-orange-600 dark:text-orange-400 font-medium">
                          {formatLimitDisplay(limit.to)}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}

          {!hasChanges && (
            <div className="text-sm text-muted-foreground text-center py-2" data-testid="no-changes-message">
              No feature removals or limit reductions with this plan change.
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
            data-testid="button-cancel-downgrade-modal"
          >
            Cancel
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
              "Confirm Downgrade"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
