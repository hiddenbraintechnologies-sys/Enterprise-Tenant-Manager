import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lock, ArrowRight, Sparkles, Package, Globe, Shield, Check } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { trackGateShown, trackGateDismissed, trackCtaClicked, trackTrialStarted } from "@/lib/feature-tracking";
import type { GateReason } from "@/hooks/use-feature-gate";

interface LockedFeatureProps {
  featureKey: string;
  featureDisplayName?: string;
  reason: GateReason;
  requiredPlanTier?: "basic" | "pro" | "enterprise";
  addonCode?: string;
  trialDays?: number;
  countryCode?: string;
  onDismiss?: () => void;
}

const TIER_BENEFIT_KEYS: Record<string, string[]> = {
  basic: [
    "unlimitedCustomers",
    "invoicingGst",
    "smsNotifications",
    "basicAnalytics",
  ],
  pro: [
    "whatsappAutomation",
    "advancedAnalytics",
    "customRoles",
    "prioritySupport",
  ],
};

function getReasonIcon(reason: GateReason) {
  switch (reason) {
    case "PLAN_TOO_LOW":
      return <Lock className="h-5 w-5 text-primary" />;
    case "NOT_INSTALLED":
      return <Package className="h-5 w-5 text-primary" />;
    case "COUNTRY_BLOCKED":
      return <Globe className="h-5 w-5 text-muted-foreground" />;
    case "ROLE_BLOCKED":
      return <Shield className="h-5 w-5 text-muted-foreground" />;
    default:
      return <Lock className="h-5 w-5 text-primary" />;
  }
}

function getReasonTranslationKey(reason: GateReason): string {
  switch (reason) {
    case "PLAN_TOO_LOW":
      return "plan";
    case "NOT_INSTALLED":
      return "addon";
    case "COUNTRY_BLOCKED":
      return "country";
    case "ROLE_BLOCKED":
      return "role";
    default:
      return "plan";
  }
}

export function LockedFeaturePage({
  featureKey,
  featureDisplayName,
  reason,
  requiredPlanTier,
  addonCode,
  trialDays = 7,
  countryCode,
}: LockedFeatureProps) {
  const [, setLocation] = useLocation();
  const { t } = useTranslation();
  const { toast } = useToast();
  const displayName = featureDisplayName || featureKey;
  const translationKey = getReasonTranslationKey(reason);

  useEffect(() => {
    trackGateShown(featureKey, reason);
  }, [featureKey, reason]);

  const startTrialMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/billing/marketplace-addon/subscribe`, {
        addonCode,
        trial: true,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/context"] });
      trackTrialStarted(featureKey, addonCode || featureKey);
      toast({ title: t("lockedFeature.addon.cta"), description: `${trialDays}-day trial started` });
      setLocation("/dashboard");
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleCTA = () => {
    trackCtaClicked(featureKey, reason);
    switch (reason) {
      case "PLAN_TOO_LOW":
        setLocation("/packages");
        break;
      case "NOT_INSTALLED":
        if (addonCode) {
          startTrialMutation.mutate();
        } else {
          setLocation("/marketplace");
        }
        break;
      case "COUNTRY_BLOCKED":
        setLocation("/coming-soon");
        break;
      case "ROLE_BLOCKED":
        window.location.href = "mailto:admin@company.com?subject=Access Request";
        break;
    }
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <Card className="max-w-xl w-full p-6 space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-primary/10 rounded-full">
            {getReasonIcon(reason)}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold" data-testid="text-locked-feature-title">
                {t(`lockedFeature.${translationKey}.title`, { feature: displayName, country: countryCode, days: trialDays })}
              </h2>
              {requiredPlanTier && (
                <Badge variant="secondary" className="text-xs uppercase">
                  {requiredPlanTier}
                </Badge>
              )}
            </div>
          </div>
        </div>
        
        <p className="text-sm text-muted-foreground" data-testid="text-locked-feature-body">
          {t(`lockedFeature.${translationKey}.body`, { feature: displayName, country: countryCode, days: trialDays })}
        </p>

        {reason === "PLAN_TOO_LOW" && requiredPlanTier && TIER_BENEFIT_KEYS[requiredPlanTier] && (
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <p className="text-sm font-medium flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              {t("lockedFeature.whatYouGet")}
            </p>
            <ul className="grid grid-cols-2 gap-2">
              {TIER_BENEFIT_KEYS[requiredPlanTier].map((benefitKey) => (
                <li key={benefitKey} className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Check className="h-3 w-3 text-primary" />
                  {t(`lockedFeature.benefits.${benefitKey}`)}
                </li>
              ))}
            </ul>
          </div>
        )}

        {reason === "NOT_INSTALLED" && (
          <div className="bg-muted/50 rounded-lg p-4">
            <p className="text-sm font-medium flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              {t("lockedFeature.trialIncluded", { days: trialDays })}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {t("lockedFeature.noCreditCard")}
            </p>
          </div>
        )}

        <Button
          className="w-full"
          data-testid="button-locked-cta"
          onClick={handleCTA}
          disabled={startTrialMutation.isPending}
        >
          {startTrialMutation.isPending ? t("lockedFeature.startingTrial") : t(`lockedFeature.${translationKey}.cta`)}
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
        
        {(reason === "PLAN_TOO_LOW" || reason === "NOT_INSTALLED") && (
          <p className="text-xs text-center text-muted-foreground">
            {t("lockedFeature.cancelAnytime")}
          </p>
        )}
      </Card>
    </div>
  );
}

export function LockedFeatureModal({
  open,
  onOpenChange,
  featureKey,
  featureDisplayName,
  reason,
  requiredPlanTier,
  addonCode,
  trialDays = 7,
  countryCode,
  onDismiss,
}: LockedFeatureProps & { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [, setLocation] = useLocation();
  const { t } = useTranslation();
  const { toast } = useToast();
  const displayName = featureDisplayName || featureKey;
  const translationKey = getReasonTranslationKey(reason);
  const [hasTracked, setHasTracked] = useState(false);

  useEffect(() => {
    if (open && !hasTracked && featureKey) {
      trackGateShown(featureKey, reason);
      setHasTracked(true);
    }
    if (!open) {
      setHasTracked(false);
    }
  }, [open, hasTracked, featureKey, reason]);

  const startTrialMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/billing/marketplace-addon/subscribe`, {
        addonCode,
        trial: true,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/context"] });
      trackTrialStarted(featureKey, addonCode || featureKey);
      toast({ title: t("lockedFeature.trialStarted"), description: t("lockedFeature.trialStartedDesc", { days: trialDays, feature: displayName }) });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleCTA = () => {
    trackCtaClicked(featureKey, reason);
    switch (reason) {
      case "PLAN_TOO_LOW":
        onOpenChange(false);
        setLocation("/packages");
        break;
      case "NOT_INSTALLED":
        if (addonCode) {
          startTrialMutation.mutate();
        } else {
          onOpenChange(false);
          setLocation("/marketplace");
        }
        break;
      case "COUNTRY_BLOCKED":
        onOpenChange(false);
        setLocation("/coming-soon");
        break;
      case "ROLE_BLOCKED":
        window.location.href = "mailto:admin@company.com?subject=Access Request";
        break;
    }
  };

  const handleDismiss = () => {
    trackGateDismissed(featureKey);
    onDismiss?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-full">
              {getReasonIcon(reason)}
            </div>
            <div>
              <DialogTitle data-testid="text-locked-modal-title">
                {t(`lockedFeature.${translationKey}.title`, { feature: displayName, country: countryCode, days: trialDays })}
              </DialogTitle>
              {requiredPlanTier && (
                <Badge variant="secondary" className="text-xs uppercase mt-1">
                  {requiredPlanTier}
                </Badge>
              )}
            </div>
          </div>
        </DialogHeader>
        
        <DialogDescription data-testid="text-locked-modal-body">
          {t(`lockedFeature.${translationKey}.body`, { feature: displayName, country: countryCode, days: trialDays })}
        </DialogDescription>

        {reason === "PLAN_TOO_LOW" && requiredPlanTier && TIER_BENEFIT_KEYS[requiredPlanTier] && (
          <div className="bg-muted/50 rounded-lg p-3 space-y-2">
            <p className="text-sm font-medium flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              {t("lockedFeature.whatYouGetShort")}
            </p>
            <ul className="grid grid-cols-2 gap-1.5">
              {TIER_BENEFIT_KEYS[requiredPlanTier].slice(0, 4).map((benefitKey) => (
                <li key={benefitKey} className="text-xs text-muted-foreground flex items-center gap-1">
                  <Check className="h-3 w-3 text-primary" />
                  {t(`lockedFeature.benefits.${benefitKey}`)}
                </li>
              ))}
            </ul>
          </div>
        )}

        {reason === "NOT_INSTALLED" && (
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-sm font-medium flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              {t("lockedFeature.trialIncluded", { days: trialDays })}
            </p>
            <p className="text-xs text-muted-foreground">{t("lockedFeature.noCreditCard")}</p>
          </div>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={handleDismiss} data-testid="button-locked-dismiss">
            {reason === "ROLE_BLOCKED" ? t("lockedFeature.cancel") : t("lockedFeature.maybeLater")}
          </Button>
          <Button
            onClick={handleCTA}
            disabled={startTrialMutation.isPending}
            data-testid="button-locked-modal-cta"
          >
            {startTrialMutation.isPending ? t("lockedFeature.startingTrial") : t(`lockedFeature.${translationKey}.cta`)}
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
