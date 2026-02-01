import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, ArrowRight, Users, FileText, Bell, BarChart3, MessageCircle, Shield, Headphones, Sparkles } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { getUpgradePath, type UpgradePath } from "@shared/billing/plan-benefits";
import type { Lang } from "@shared/billing/i18n";

const iconMap: Record<string, React.ElementType> = {
  Users,
  FileText,
  Bell,
  BarChart3,
  MessageCircle,
  Shield,
  Headphones,
  Infinity: Sparkles,
};

interface SubscriptionStatusResponse {
  tier?: string;
  status?: string;
  plan?: {
    tier: string;
    name: string;
  } | null;
}

export function PlanUpgradeNudge() {
  const [location, setLocation] = useLocation();
  const { tenant } = useAuth();
  
  const isSettingsPage = location.startsWith("/settings");
  
  const lang: Lang = (typeof window !== "undefined" && 
    (localStorage.getItem("i18nextLng") || "en").substring(0, 2)) as Lang || "en";

  const { data: status } = useQuery<SubscriptionStatusResponse>({
    queryKey: ["/api/dashboard/subscription/status"],
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: false,
  });

  const currentTier = status?.plan?.tier || status?.tier || "free";
  const upgradePath = getUpgradePath(currentTier);
  
  const [dismissed, setDismissed] = useState(false);
  
  useEffect(() => {
    if (typeof window !== "undefined" && currentTier) {
      const isDismissed = sessionStorage.getItem(`upgrade_nudge_dismissed_${currentTier}`) === "true";
      setDismissed(isDismissed);
    }
  }, [currentTier]);

  if (dismissed || !upgradePath || currentTier === "pro" || currentTier === "enterprise" || isSettingsPage) {
    return null;
  }

  const handleUpgrade = () => {
    setLocation("/packages");
  };

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem(`upgrade_nudge_dismissed_${currentTier}`, "true");
  };

  const displayedBenefits = upgradePath.benefits.slice(0, 3);

  return (
    <Card className="mb-6 border-primary/20 bg-gradient-to-r from-primary/5 to-transparent" data-testid="card-upgrade-nudge">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="secondary" className="text-xs">
                {upgradePath.toTier.toUpperCase()}
              </Badge>
              <span className="text-sm font-medium text-foreground">
                {upgradePath.headline[lang] || upgradePath.headline.en}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              {upgradePath.subheadline[lang] || upgradePath.subheadline.en}
            </p>
            
            <div className="flex flex-wrap gap-3 mb-3">
              {displayedBenefits.map((benefit, index) => {
                const IconComponent = iconMap[benefit.icon] || Sparkles;
                return (
                  <div key={index} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <IconComponent className="h-3.5 w-3.5 text-primary" />
                    <span>{benefit.title[lang] || benefit.title.en}</span>
                  </div>
                );
              })}
            </div>
            
            <Button 
              size="sm" 
              onClick={handleUpgrade}
              data-testid="button-upgrade-nudge"
            >
              {upgradePath.cta[lang] || upgradePath.cta.en}
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          </div>
          
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 h-6 w-6"
            onClick={handleDismiss}
            data-testid="button-dismiss-upgrade-nudge"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function CompactUpgradePrompt({ 
  reason,
  featureKey,
  limitKey,
}: { 
  reason?: string;
  featureKey?: string;
  limitKey?: string;
}) {
  const [, setLocation] = useLocation();
  
  const lang: Lang = (typeof window !== "undefined" && 
    (localStorage.getItem("i18nextLng") || "en").substring(0, 2)) as Lang || "en";

  const handleUpgrade = () => {
    setLocation("/packages");
  };

  const getMessage = () => {
    if (reason) return reason;
    if (featureKey) {
      return lang === "hi" 
        ? "इस फ़ीचर को अनलॉक करने के लिए अपग्रेड करें"
        : "Upgrade to unlock this feature";
    }
    if (limitKey) {
      return lang === "hi"
        ? "लिमिट बढ़ाने के लिए अपग्रेड करें"
        : "Upgrade to increase your limit";
    }
    return lang === "hi" ? "अपग्रेड करें" : "Upgrade your plan";
  };

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
      <div className="flex-1">
        <p className="text-sm text-muted-foreground">{getMessage()}</p>
      </div>
      <Button size="sm" variant="outline" onClick={handleUpgrade} data-testid="button-compact-upgrade">
        {lang === "hi" ? "अपग्रेड करें" : "Upgrade"}
        <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
