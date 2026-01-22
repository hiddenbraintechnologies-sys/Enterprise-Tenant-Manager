import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { Lock, ArrowRight, Sparkles } from "lucide-react";
import { getLockedFeatureMessage, getUpgradePath } from "@shared/billing/plan-benefits";
import type { Lang } from "@shared/billing/i18n";
import { useQuery } from "@tanstack/react-query";

type Props = {
  moduleKey: string;
  currentTier?: string;
};

interface SubscriptionStatusResponse {
  tier?: string;
  plan?: { tier: string } | null;
}

export function LockedFeature({ moduleKey, currentTier }: Props) {
  const [, setLocation] = useLocation();
  const { t, i18n } = useTranslation();
  const lang = (i18n.language?.substring(0, 2) || "en") as Lang;

  const { data: status } = useQuery<SubscriptionStatusResponse>({
    queryKey: ["/api/dashboard/subscription/status"],
    staleTime: 5 * 60 * 1000,
    enabled: !currentTier,
  });

  const tier = currentTier || status?.plan?.tier || status?.tier || "free";
  const upgradePath = getUpgradePath(tier);
  const featureMessage = getLockedFeatureMessage(moduleKey, lang);
  const nextTier = upgradePath?.toTier || "basic";

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <Card className="max-w-xl w-full p-6 space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-primary/10 rounded-full">
            <Lock className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold" data-testid="text-locked-feature-title">
                {featureMessage.title}
              </h2>
              <Badge variant="secondary" className="text-xs">
                {nextTier.toUpperCase()}
              </Badge>
            </div>
          </div>
        </div>
        
        <p className="text-sm text-muted-foreground" data-testid="text-locked-feature-body">
          {featureMessage.description}
        </p>

        {upgradePath && (
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <p className="text-sm font-medium flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              {lang === "hi" ? "अपग्रेड करने पर आपको मिलेगा:" : "What you'll get with upgrade:"}
            </p>
            <ul className="grid grid-cols-2 gap-2">
              {upgradePath.benefits.slice(0, 4).map((benefit, index) => (
                <li key={index} className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-primary" />
                  {benefit.title[lang] || benefit.title.en}
                </li>
              ))}
            </ul>
          </div>
        )}

        <Button
          className="w-full"
          data-testid="button-upgrade-locked"
          onClick={() => setLocation("/packages")}
        >
          {upgradePath?.cta[lang] || t("lockedFeature.upgradeButton")}
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
        
        <p className="text-xs text-center text-muted-foreground">
          {lang === "hi" ? "कभी भी रद्द करें। 14 दिन का मनी-बैक गारंटी।" : "Cancel anytime. 14-day money-back guarantee."}
        </p>
      </Card>
    </div>
  );
}
