import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertTriangle, ArrowRight, Lock, Sparkles, Users, Database, Zap } from "lucide-react";
import { Link } from "wouter";

interface UpgradeNudgeProps {
  type: "record_limit" | "user_limit" | "pro_feature";
  currentTier: string;
  featureName?: string;
  limit?: number;
  current?: number;
  onClose?: () => void;
  isOpen?: boolean;
}

export function UpgradeNudgeBanner({ type, currentTier, featureName, limit, current }: Omit<UpgradeNudgeProps, "isOpen" | "onClose">) {
  const getMessage = () => {
    switch (type) {
      case "record_limit":
        return {
          icon: Database,
          title: "Record limit reached",
          description: `You've used ${current || 0} of ${limit || 50} records on the ${currentTier} plan.`,
          cta: "Upgrade to create more records",
        };
      case "user_limit":
        return {
          icon: Users,
          title: "User limit reached",
          description: `You've added ${current || 0} of ${limit || 1} users on the ${currentTier} plan.`,
          cta: "Upgrade to add more team members",
        };
      case "pro_feature":
        return {
          icon: Lock,
          title: `${featureName || "This feature"} requires Pro`,
          description: `Upgrade to Pro to unlock ${featureName || "this feature"} and more.`,
          cta: "Upgrade to Pro",
        };
      default:
        return {
          icon: Sparkles,
          title: "Upgrade your plan",
          description: "Get access to more features and higher limits.",
          cta: "View plans",
        };
    }
  };

  const msg = getMessage();
  const Icon = msg.icon;

  return (
    <Alert className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950" data-testid={`alert-upgrade-${type}`}>
      <Icon className="h-4 w-4 text-orange-600 dark:text-orange-400" />
      <AlertTitle className="text-orange-800 dark:text-orange-200" data-testid="text-upgrade-title">{msg.title}</AlertTitle>
      <AlertDescription className="flex items-center justify-between gap-4">
        <span className="text-orange-700 dark:text-orange-300" data-testid="text-upgrade-description">{msg.description}</span>
        <Button size="sm" asChild data-testid="button-upgrade-cta">
          <Link href="/pricing">
            {msg.cta}
            <ArrowRight className="h-4 w-4 ml-1" />
          </Link>
        </Button>
      </AlertDescription>
    </Alert>
  );
}

export function UpgradeNudgeModal({ type, currentTier, featureName, limit, current, isOpen, onClose }: UpgradeNudgeProps) {
  const getContent = () => {
    switch (type) {
      case "record_limit":
        return {
          icon: Database,
          title: "You've hit your record limit",
          description: `Your ${currentTier} plan allows up to ${limit || 50} records. You've used ${current || 0}.`,
          benefits: [
            "Create unlimited records",
            "Advanced analytics",
            "Priority support",
          ],
          recommendedPlan: "Pro",
          price: "₹199",
        };
      case "user_limit":
        return {
          icon: Users,
          title: "Team size limit reached",
          description: `Your ${currentTier} plan allows ${limit || 1} user${(limit || 1) > 1 ? "s" : ""}. Upgrade to add more team members.`,
          benefits: [
            "Add up to 10 team members",
            "Role-based access control",
            "Team collaboration features",
          ],
          recommendedPlan: "Basic",
          price: "₹99",
        };
      case "pro_feature":
        return {
          icon: Lock,
          title: `${featureName || "This feature"} is a Pro feature`,
          description: `Upgrade to Pro to unlock ${featureName || "this feature"} and supercharge your business.`,
          benefits: [
            "WhatsApp automation",
            "GST invoicing",
            "Unlimited records",
            "Priority support",
          ],
          recommendedPlan: "Pro",
          price: "₹199",
        };
      default:
        return {
          icon: Sparkles,
          title: "Upgrade your plan",
          description: "Get access to more features and higher limits.",
          benefits: ["More records", "More users", "Advanced features"],
          recommendedPlan: "Pro",
          price: "₹199",
        };
    }
  };

  const content = getContent();
  const Icon = content.icon;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose?.()}>
      <DialogContent className="sm:max-w-md" data-testid="dialog-upgrade-nudge">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-full bg-orange-100 dark:bg-orange-900">
              <Icon className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
            <Badge variant="secondary" className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
              {content.recommendedPlan} Plan
            </Badge>
          </div>
          <DialogTitle data-testid="text-modal-title">{content.title}</DialogTitle>
          <DialogDescription data-testid="text-modal-description">{content.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          <p className="text-sm font-medium">What you'll get:</p>
          <ul className="space-y-2">
            {content.benefits.map((benefit, index) => (
              <li key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                <Zap className="h-4 w-4 text-primary" />
                <span data-testid={`text-benefit-${index}`}>{benefit}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-muted/50 rounded-lg p-4 text-center">
          <p className="text-sm text-muted-foreground">Starting at just</p>
          <p className="text-2xl font-bold" data-testid="text-price">{content.price}<span className="text-sm font-normal text-muted-foreground">/month</span></p>
          <p className="text-xs text-muted-foreground mt-1">Cancel anytime</p>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} data-testid="button-maybe-later">
            Maybe later
          </Button>
          <Button asChild data-testid="button-view-plans">
            <Link href="/pricing">
              View all plans
              <ArrowRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ProFeatureLock({ featureName, currentTier }: { featureName: string; currentTier: string }) {
  if (currentTier === "pro" || currentTier === "enterprise") {
    return null;
  }

  return (
    <div className="relative group" data-testid={`lock-${featureName.toLowerCase().replace(/\s+/g, "-")}`}>
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm rounded-lg flex items-center justify-center z-10">
        <div className="text-center p-4">
          <Lock className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="font-medium text-sm">{featureName}</p>
          <p className="text-xs text-muted-foreground mb-2">Pro feature</p>
          <Button size="sm" asChild data-testid="button-unlock-feature">
            <Link href="/pricing">Unlock</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
