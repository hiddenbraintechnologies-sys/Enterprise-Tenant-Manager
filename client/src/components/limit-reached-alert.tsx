import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { getLimitUpgradeMessage, getUpgradePath } from "@shared/billing/plan-benefits";
import type { Lang } from "@shared/billing/i18n";

interface LimitReachedAlertProps {
  limitKey: string;
  currentValue: number;
  maxValue: number;
  currentTier?: string;
}

export function LimitReachedAlert({ 
  limitKey, 
  currentValue, 
  maxValue, 
  currentTier = "free"
}: LimitReachedAlertProps) {
  const [, setLocation] = useLocation();
  
  const lang: Lang = (typeof window !== "undefined" && 
    (localStorage.getItem("i18nextLng") || "en").substring(0, 2)) as Lang || "en";

  const message = getLimitUpgradeMessage(limitKey, lang);
  const upgradePath = getUpgradePath(currentTier);
  const isAtLimit = currentValue >= maxValue;
  const isNearLimit = currentValue >= maxValue * 0.8;
  const percentage = maxValue > 0 ? Math.min((currentValue / maxValue) * 100, 100) : 0;

  if (!isNearLimit && !isAtLimit) {
    return null;
  }

  const handleUpgrade = () => {
    setLocation("/packages");
  };

  const getProgressText = () => {
    if (lang === "hi") {
      return `${currentValue} में से ${maxValue} उपयोग किया`;
    }
    return `${currentValue} of ${maxValue} used`;
  };

  const getProgressColor = () => {
    if (isAtLimit) return "bg-destructive";
    if (isNearLimit) return "bg-orange-500";
    return "bg-primary";
  };

  return (
    <Alert 
      className={isAtLimit 
        ? "border-destructive/50 bg-destructive/10" 
        : "border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950"
      }
      data-testid={`alert-limit-${limitKey}`}
    >
      <AlertTriangle className={`h-4 w-4 ${isAtLimit ? "text-destructive" : "text-orange-600 dark:text-orange-400"}`} />
      <AlertTitle 
        className={isAtLimit ? "text-destructive" : "text-orange-800 dark:text-orange-200"}
        data-testid="text-limit-title"
      >
        {message.title}
      </AlertTitle>
      <AlertDescription className="flex flex-col gap-3">
        <div className="space-y-2">
          <p className={isAtLimit ? "text-destructive/80" : "text-orange-700 dark:text-orange-300"}>
            {message.description}
          </p>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
              <div 
                className={`h-full transition-all duration-300 ${getProgressColor()}`}
                style={{ width: `${percentage}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {getProgressText()}
            </span>
          </div>
        </div>
        <div className="flex justify-end">
          <Button 
            size="sm" 
            onClick={handleUpgrade}
            variant={isAtLimit ? "default" : "outline"}
            data-testid="button-upgrade-limit"
          >
            {upgradePath?.cta[lang] || (lang === "hi" ? "अपग्रेड करें" : "Upgrade")}
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}

interface UsageProgressProps {
  limitKey: string;
  currentValue: number;
  maxValue: number;
  showUpgradePrompt?: boolean;
  currentTier?: string;
}

export function UsageProgress({ 
  limitKey, 
  currentValue, 
  maxValue, 
  showUpgradePrompt = true,
  currentTier = "free" 
}: UsageProgressProps) {
  const [, setLocation] = useLocation();
  
  const lang: Lang = (typeof window !== "undefined" && 
    (localStorage.getItem("i18nextLng") || "en").substring(0, 2)) as Lang || "en";

  const percentage = maxValue > 0 ? Math.min((currentValue / maxValue) * 100, 100) : 0;
  const isNearLimit = percentage >= 80;
  const isAtLimit = percentage >= 100;
  const upgradePath = getUpgradePath(currentTier);

  const getStatusColor = () => {
    if (isAtLimit) return "bg-destructive";
    if (isNearLimit) return "bg-orange-500";
    return "bg-primary";
  };

  const getLabel = () => {
    const labels: Record<string, Record<Lang, string>> = {
      users: { en: "Team Members", hi: "टीम मेंबर्स", ms: "Ahli Pasukan", ta: "குழு உறுப்பினர்கள்" },
      clients: { en: "Customers", hi: "ग्राहक", ms: "Pelanggan", ta: "வாடிக்கையாளர்கள்" },
      records: { en: "Records", hi: "रिकॉर्ड्स", ms: "Rekod", ta: "பதிவுகள்" },
      projects: { en: "Projects", hi: "प्रोजेक्ट्स", ms: "Projek", ta: "திட்டங்கள்" },
      invoices_per_month: { en: "Invoices", hi: "इनवॉइस", ms: "Invois", ta: "விலைப்பட்டியல்" },
    };
    return labels[limitKey]?.[lang] || labels[limitKey]?.en || limitKey;
  };

  return (
    <div className="space-y-2" data-testid={`usage-${limitKey}`}>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{getLabel()}</span>
        <span className={isAtLimit ? "text-destructive font-medium" : "text-foreground"}>
          {currentValue} / {maxValue === -1 ? "∞" : maxValue}
        </span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div 
          className={`h-full transition-all duration-300 ${getStatusColor()}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showUpgradePrompt && isNearLimit && (
        <button
          onClick={() => setLocation("/packages")}
          className="text-xs text-primary hover:underline flex items-center gap-1"
          data-testid="link-upgrade-usage"
        >
          {upgradePath?.cta[lang] || (lang === "hi" ? "लिमिट बढ़ाएं" : "Increase limit")}
          <ArrowRight className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
