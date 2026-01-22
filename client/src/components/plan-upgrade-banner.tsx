import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { X, Unlock, ArrowRight } from "lucide-react";
import { getUpgradePath } from "@shared/billing/plan-benefits";
import type { Lang } from "@shared/billing/i18n";
import { cn } from "@/lib/utils";

interface PlanUpgradeBannerProps {
  currentPlan?: string;
  requiredPlan?: string;
  reason?: string;
  className?: string;
  onDismiss?: () => void;
}

const BANNER_COPY = {
  freeToBasic: {
    en: "You've reached the Free plan limit. Upgrade to Basic to unlock GST, Analytics, and more users.",
    hi: "आपने Free प्लान की सीमा पूरी कर ली है। Basic पर अपग्रेड करें और GST, Analytics पाएं।",
    ms: "Anda telah mencapai had pelan Percuma. Naik taraf ke Basic untuk membuka GST, Analitik, dan lebih ramai pengguna.",
    ta: "நீங்கள் இலவச திட்ட வரம்பை எட்டிவிட்டீர்கள். GST, பகுப்பாய்வு மற்றும் மேலும் பயனர்களைத் திறக்க Basic-க்கு மேம்படுத்தவும்."
  },
  basicToPro: {
    en: "Ready to scale? Upgrade to Pro for unlimited records, WhatsApp automation, and priority support.",
    hi: "बढ़ने के लिए तैयार? Pro में अपग्रेड करें और पाएं unlimited records, WhatsApp automation, priority support।",
    ms: "Bersedia untuk berkembang? Naik taraf ke Pro untuk rekod tanpa had, automasi WhatsApp, dan sokongan keutamaan.",
    ta: "விரிவாக்க தயாரா? வரம்பற்ற பதிவுகள், WhatsApp தன்னியக்கம் மற்றும் முன்னுரிமை ஆதரவுக்கு Pro-க்கு மேம்படுத்தவும்."
  }
};

const CTA_UPGRADE_BASIC: Record<Lang, string> = {
  en: "Upgrade to Basic",
  hi: "Basic में अपग्रेड करें",
  ms: "Naik taraf ke Basic",
  ta: "Basic-க்கு மேம்படுத்தவும்"
};

const CTA_UPGRADE_PRO: Record<Lang, string> = {
  en: "Upgrade to Pro",
  hi: "Pro में अपग्रेड करें",
  ms: "Naik taraf ke Pro",
  ta: "Pro-க்கு மேம்படுத்தவும்"
};

const COMPARE_PLANS_TEXT: Record<Lang, string> = {
  en: "Compare plans",
  hi: "प्लान्स की तुलना करें",
  ms: "Bandingkan pelan",
  ta: "திட்டங்களை ஒப்பிடுக"
};

const LIMIT_REACHED_TEXT: Record<Lang, string> = {
  en: "You've reached the plan limit",
  hi: "आपने प्लान की सीमा पूरी कर ली है",
  ms: "Anda telah mencapai had pelan",
  ta: "நீங்கள் திட்ட வரம்பை எட்டிவிட்டீர்கள்"
};

interface SubscriptionStatusResponse {
  tier?: string;
  plan?: { tier: string } | null;
}

export function PlanUpgradeBanner({ 
  currentPlan,
  requiredPlan,
  reason,
  className,
  onDismiss 
}: PlanUpgradeBannerProps) {
  const [, setLocation] = useLocation();
  const [dismissed, setDismissed] = useState(false);

  const lang: Lang = (typeof window !== "undefined" && 
    (localStorage.getItem("i18nextLng") || "en").substring(0, 2)) as Lang || "en";

  const { data: status } = useQuery<SubscriptionStatusResponse>({
    queryKey: ["/api/dashboard/subscription/status"],
    staleTime: 5 * 60 * 1000,
    enabled: !currentPlan,
  });

  const tier = currentPlan || status?.plan?.tier || status?.tier || "free";
  const normalizedTier = tier.toLowerCase();

  useEffect(() => {
    const key = `upgrade_banner_dismissed_${normalizedTier}`;
    const isDismissed = localStorage.getItem(key) === "true";
    setDismissed(isDismissed);
  }, [normalizedTier]);

  if (dismissed) return null;
  if (normalizedTier === "pro" || normalizedTier === "enterprise") return null;

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem(`upgrade_banner_dismissed_${normalizedTier}`, "true");
    onDismiss?.();
  };

  const handleUpgrade = () => {
    setLocation("/packages");
  };

  const handleCompare = () => {
    setLocation("/packages#comparison");
  };

  const getMessage = () => {
    if (reason) return reason;
    if (normalizedTier === "free") {
      return BANNER_COPY.freeToBasic[lang] || BANNER_COPY.freeToBasic.en;
    }
    if (normalizedTier === "basic") {
      return BANNER_COPY.basicToPro[lang] || BANNER_COPY.basicToPro.en;
    }
    return "";
  };

  const getCtaText = () => {
    if (normalizedTier === "free") {
      return CTA_UPGRADE_BASIC[lang] || CTA_UPGRADE_BASIC.en;
    }
    return CTA_UPGRADE_PRO[lang] || CTA_UPGRADE_PRO.en;
  };

  const getCompareText = () => {
    return COMPARE_PLANS_TEXT[lang] || COMPARE_PLANS_TEXT.en;
  };

  return (
    <div 
      className={cn(
        "relative bg-primary/10 border-b border-primary/20 px-4 py-3",
        className
      )}
      data-testid="banner-plan-upgrade"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Unlock className="h-4 w-4 text-primary shrink-0" />
          <p className="text-sm text-foreground truncate">
            {getMessage()}
          </p>
        </div>
        
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCompare}
            className="hidden sm:inline-flex"
            data-testid="button-compare-plans"
          >
            {getCompareText()}
          </Button>
          <Button
            size="sm"
            onClick={handleUpgrade}
            data-testid="button-banner-upgrade"
          >
            {getCtaText()}
            <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={handleDismiss}
            data-testid="button-dismiss-banner"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export function InlinePlanUpgradeBanner({
  limitKey,
  currentValue,
  maxValue,
  currentTier = "free"
}: {
  limitKey: string;
  currentValue: number;
  maxValue: number;
  currentTier?: string;
}) {
  const [, setLocation] = useLocation();
  const [dismissed, setDismissed] = useState(false);
  
  const lang: Lang = (typeof window !== "undefined" && 
    (localStorage.getItem("i18nextLng") || "en").substring(0, 2)) as Lang || "en";

  const upgradePath = getUpgradePath(currentTier);
  const isAtLimit = currentValue >= maxValue && maxValue !== -1;

  if (dismissed || !isAtLimit || !upgradePath) return null;

  const getMessage = () => {
    return LIMIT_REACHED_TEXT[lang] || LIMIT_REACHED_TEXT.en;
  };

  return (
    <div 
      className="flex items-center gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20"
      data-testid={`inline-banner-${limitKey}`}
    >
      <Unlock className="h-4 w-4 text-destructive shrink-0" />
      <p className="text-sm text-destructive flex-1">{getMessage()}</p>
      <Button
        size="sm"
        variant="outline"
        onClick={() => setLocation("/packages")}
        data-testid="button-inline-upgrade"
      >
        {upgradePath.cta[lang] || upgradePath.cta.en}
        <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6"
        onClick={() => setDismissed(true)}
        data-testid="button-dismiss-inline-banner"
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
