import { useState } from "react";
import { useLocation } from "wouter";
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
import { Lock, ArrowRight, Sparkles, Check } from "lucide-react";
import { getLockedFeatureMessage, getUpgradePath } from "@shared/billing/plan-benefits";
import type { Lang } from "@shared/billing/i18n";

interface LockedFeatureModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  featureKey: string;
  currentTier?: string;
  onStartTrial?: () => void;
  hasTrialOption?: boolean;
}

const FEATURE_TO_TIER: Record<string, string> = {
  invoicing: "basic",
  gst_invoicing: "basic",
  sms_alerts: "basic",
  analytics: "basic",
  payroll: "basic",
  whatsapp_automation: "pro",
  custom_roles: "pro",
  analytics_advanced: "pro",
  priority_support: "pro",
  unlimited_records: "pro",
  api_access: "pro",
  white_label: "enterprise"
};

const PLAN_GIVES_TEXT: Record<Lang, string> = {
  en: "This plan gives you:",
  hi: "इस प्लान में आपको मिलेगा:",
  ms: "Pelan ini memberi anda:",
  ta: "இந்த திட்டம் உங்களுக்கு தருகிறது:"
};

const READY_TO_SCALE_TEXT: Record<Lang, string> = {
  en: "Ready to scale your business?",
  hi: "अपना बिज़नेस बढ़ाने के लिए तैयार?",
  ms: "Bersedia untuk mengembangkan perniagaan anda?",
  ta: "உங்கள் வணிகத்தை விரிவாக்க தயாரா?"
};

const CANCEL_TEXT: Record<Lang, string> = {
  en: "Cancel",
  hi: "रद्द करें",
  ms: "Batal",
  ta: "ரத்துசெய்"
};

const TRIAL_TEXT: Record<Lang, string> = {
  en: "Start Trial",
  hi: "ट्रायल शुरू करें",
  ms: "Mulakan Percubaan",
  ta: "சோதனையைத் தொடங்கு"
};

const COMPARISON_TEXT: Record<Lang, string> = {
  en: "See full comparison",
  hi: "पूरी तुलना देखें",
  ms: "Lihat perbandingan penuh",
  ta: "முழு ஒப்பீட்டைக் காண்க"
};

const UPGRADE_TEXT: Record<Lang, string> = {
  en: "Upgrade",
  hi: "अपग्रेड करें",
  ms: "Naik Taraf",
  ta: "மேம்படுத்து"
};

const TIER_NAMES: Record<string, Record<Lang, string>> = {
  basic: { en: "Basic", hi: "Basic", ms: "Basic", ta: "Basic" },
  pro: { en: "Pro", hi: "Pro", ms: "Pro", ta: "Pro" },
  enterprise: { en: "Enterprise", hi: "Enterprise", ms: "Enterprise", ta: "Enterprise" }
};

const PRO_BENEFITS: Record<Lang, string[]> = {
  en: [
    "Unlimited records & users",
    "WhatsApp automation",
    "Priority support",
    "Advanced reports"
  ],
  hi: [
    "Unlimited records और users",
    "WhatsApp automation",
    "Priority support",
    "Advanced reports"
  ],
  ms: [
    "Rekod & pengguna tanpa had",
    "Automasi WhatsApp",
    "Sokongan keutamaan",
    "Laporan lanjutan"
  ],
  ta: [
    "வரம்பற்ற பதிவுகள் & பயனர்கள்",
    "WhatsApp தன்னியக்கம்",
    "முன்னுரிமை ஆதரவு",
    "மேம்பட்ட அறிக்கைகள்"
  ]
};

const BASIC_BENEFITS: Record<Lang, string[]> = {
  en: [
    "3 team members",
    "GST invoicing",
    "SMS alerts",
    "Business analytics"
  ],
  hi: [
    "3 टीम मेंबर्स",
    "GST invoicing",
    "SMS alerts",
    "Business analytics"
  ],
  ms: [
    "3 ahli pasukan",
    "Invois GST",
    "Makluman SMS",
    "Analitik perniagaan"
  ],
  ta: [
    "3 குழு உறுப்பினர்கள்",
    "GST விலைப்பட்டியல்",
    "SMS எச்சரிக்கைகள்",
    "வணிக பகுப்பாய்வு"
  ]
};

export function LockedFeatureModal({
  open,
  onOpenChange,
  featureKey,
  currentTier = "free",
  onStartTrial,
  hasTrialOption = false
}: LockedFeatureModalProps) {
  const [, setLocation] = useLocation();
  
  const lang: Lang = (typeof window !== "undefined" && 
    (localStorage.getItem("i18nextLng") || "en").substring(0, 2)) as Lang || "en";

  const normalizedTier = currentTier.toLowerCase();
  const requiredTier = FEATURE_TO_TIER[featureKey] || "basic";
  const message = getLockedFeatureMessage(featureKey, lang);
  const upgradePath = getUpgradePath(normalizedTier);
  
  const targetTier = requiredTier === "pro" || normalizedTier === "basic" ? "pro" : "basic";
  const benefits = targetTier === "pro" ? PRO_BENEFITS : BASIC_BENEFITS;

  const handleUpgrade = () => {
    onOpenChange(false);
    setLocation("/packages");
  };

  const handleCompare = () => {
    onOpenChange(false);
    setLocation("/packages#comparison");
  };

  const getModalTitle = () => {
    if (lang === "hi") return "इस फ़ीचर को अनलॉक करें";
    return "Unlock this feature";
  };

  const getReadyToScale = () => {
    return READY_TO_SCALE_TEXT[lang] || READY_TO_SCALE_TEXT.en;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid="modal-locked-feature">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-full bg-primary/10">
              <Lock className="h-5 w-5 text-primary" />
            </div>
            <Badge variant="secondary" className="text-xs">
              {TIER_NAMES[targetTier]?.[lang] || TIER_NAMES[targetTier]?.en || targetTier}
            </Badge>
          </div>
          <DialogTitle data-testid="text-locked-feature-title">
            {message.title}
          </DialogTitle>
          <DialogDescription data-testid="text-locked-feature-desc">
            {message.description}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <p className="text-sm font-medium text-foreground mb-3">
            {getReadyToScale()}
          </p>
          <p className="text-sm text-muted-foreground mb-4">
            {PLAN_GIVES_TEXT[lang] || PLAN_GIVES_TEXT.en}
          </p>
          
          <ul className="space-y-2">
            {(benefits[lang] || benefits.en).map((benefit, index) => (
              <li key={index} className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 text-primary shrink-0" />
                <span>{benefit}</span>
              </li>
            ))}
          </ul>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto"
            data-testid="button-cancel-modal"
          >
            {CANCEL_TEXT[lang] || CANCEL_TEXT.en}
          </Button>
          {hasTrialOption && onStartTrial && (
            <Button
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                onStartTrial();
              }}
              className="w-full sm:w-auto"
              data-testid="button-start-trial"
            >
              <Sparkles className="mr-1.5 h-4 w-4" />
              {TRIAL_TEXT[lang] || TRIAL_TEXT.en}
            </Button>
          )}
          <Button
            variant="outline"
            onClick={handleCompare}
            className="w-full sm:w-auto"
            data-testid="button-see-comparison"
          >
            {COMPARISON_TEXT[lang] || COMPARISON_TEXT.en}
          </Button>
          <Button 
            onClick={handleUpgrade}
            className="w-full sm:w-auto"
            data-testid="button-upgrade-modal"
          >
            {upgradePath?.cta[lang] || UPGRADE_TEXT[lang] || UPGRADE_TEXT.en}
            <ArrowRight className="ml-1.5 h-4 w-4" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function useLockedFeatureModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [featureKey, setFeatureKey] = useState("");

  const showLockedModal = (feature: string) => {
    setFeatureKey(feature);
    setIsOpen(true);
  };

  const hideLockedModal = () => {
    setIsOpen(false);
    setFeatureKey("");
  };

  return {
    isOpen,
    featureKey,
    showLockedModal,
    hideLockedModal,
    setIsOpen
  };
}
