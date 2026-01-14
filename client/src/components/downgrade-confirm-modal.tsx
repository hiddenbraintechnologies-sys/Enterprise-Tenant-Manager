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

type Lang = "en" | "hi";

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
  lang?: Lang;
}

const LIMIT_ICONS: Record<string, typeof Users> = {
  users: Users,
  records: FileText,
  customers: Users,
};

function t(lang: Lang, en: string, hi: string) {
  return lang === "hi" ? hi : en;
}

function formatDate(d: Date | string) {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" });
}

function getDowngradeTitle(lang: Lang, currentTier: string, targetTier: string) {
  if (currentTier === "pro" && targetTier === "basic") {
    return t(lang, "Confirm downgrade to Basic", "Basic में डाउनग्रेड कन्फर्म करें");
  }
  if (currentTier === "basic" && targetTier === "free") {
    return t(lang, "Confirm downgrade to Free", "Free में डाउनग्रेड कन्फर्म करें");
  }
  return t(lang, "Confirm plan downgrade", "प्लान डाउनग्रेड कन्फर्म करें");
}

function getConfirmLabel(lang: Lang, currentTier: string, targetTier: string) {
  if (currentTier === "pro" && targetTier === "basic") {
    return t(lang, "Confirm downgrade to Basic", "Basic में डाउनग्रेड कन्फर्म करें");
  }
  return t(lang, "Confirm downgrade", "डाउनग्रेड कन्फर्म करें");
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
  lang = "en",
}: DowngradeConfirmModalProps) {
  const lostFeatures = getLostFeatures(currentPlan, targetPlan);
  const reducedLimits = getReducedLimits(currentPlan, targetPlan);
  const formattedDate = formatDate(effectiveAt);

  const hasLostFeatures = lostFeatures.length > 0;
  const hasReducedLimits = reducedLimits.length > 0;

  const subtitle = t(
    lang,
    `Downgrade scheduled. Your plan will change on ${formattedDate}. No data will be lost.`,
    `Downgrade शेड्यूल हो गया है। आपका प्लान ${formattedDate} को बदलेगा। डेटा सुरक्षित रहेगा।`
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle data-testid="modal-title-downgrade-confirm">
            {getDowngradeTitle(lang, currentPlan.tier.toLowerCase(), targetPlan.tier.toLowerCase())}
          </DialogTitle>
          <DialogDescription className="pt-2 space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{currentPlan.name}</Badge>
              <ArrowRight className="h-4 w-4" />
              <Badge variant="outline">{targetPlan.name}</Badge>
            </div>
            <p className="text-sm">{subtitle}</p>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div data-testid="section-lost-features">
            <h4 className="text-sm font-medium mb-3">
              {t(lang, "You'll lose access to these features", "ये फीचर्स उपलब्ध नहीं रहेंगे")}
            </h4>
            {hasLostFeatures ? (
              <ul className="space-y-2">
                {lostFeatures.map((feature) => (
                  <li 
                    key={feature.key} 
                    className="rounded-xl border p-3"
                    data-testid={`lost-feature-${feature.key}`}
                  >
                    <div className="flex items-start gap-2">
                      <X className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                      <div>
                        <span className="font-medium">{feature.label}</span>
                        {feature.description && (
                          <span className="block text-sm text-muted-foreground mt-0.5">
                            {feature.description}
                          </span>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="rounded-xl border p-3 text-sm text-muted-foreground" data-testid="no-lost-features">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  {t(lang, "No features will be removed.", "कोई फीचर हटाया नहीं जाएगा।")}
                </div>
              </div>
            )}
          </div>

          <div data-testid="section-reduced-limits">
            <h4 className="text-sm font-medium mb-3">
              {t(lang, "Your limits will change", "आपकी लिमिट्स बदलेंगी")}
            </h4>
            {hasReducedLimits ? (
              <ul className="space-y-2">
                {reducedLimits.map((limit) => {
                  const Icon = LIMIT_ICONS[limit.key] || FileText;
                  return (
                    <li 
                      key={limit.key} 
                      className="flex items-center justify-between rounded-xl border p-3 text-sm"
                      data-testid={`reduced-limit-${limit.key}`}
                    >
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="font-medium">{limit.label}</span>
                      </div>
                      <span className="text-muted-foreground">
                        {formatLimitDisplay(limit.from)} → {formatLimitDisplay(limit.to)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="rounded-xl border p-3 text-sm text-muted-foreground" data-testid="no-reduced-limits">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  {t(lang, "Your usage limits will remain the same.", "आपकी उपयोग लिमिट्स वही रहेंगी।")}
                </div>
              </div>
            )}
          </div>

          <div className="rounded-xl border p-3">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
              <div className="text-sm">
                <p className="font-medium">
                  {t(lang, "No immediate changes", "अभी कोई बदलाव नहीं")}
                </p>
                <p className="text-muted-foreground mt-1">
                  {t(
                    lang,
                    `You can continue using all current features until ${formattedDate}. You can also cancel or change this downgrade anytime before that date.`,
                    `आप ${formattedDate} तक सभी मौजूदा फीचर्स इस्तेमाल कर सकते हैं। आप उस तारीख से पहले कभी भी डाउनग्रेड को कैंसल या बदल सकते हैं।`
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col gap-3">
          <div className="flex flex-col-reverse gap-2 w-full sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              onClick={onCancel}
              disabled={isLoading}
              data-testid="button-cancel-downgrade-modal"
            >
              {t(lang, "Go back", "वापस जाएँ")}
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
                  {t(lang, "Processing...", "प्रोसेसिंग...")}
                </>
              ) : (
                getConfirmLabel(lang, currentPlan.tier.toLowerCase(), targetPlan.tier.toLowerCase())
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground text-center sm:text-right">
            {t(lang, "Tip: You can upgrade again anytime.", "Tip: आप कभी भी फिर से अपग्रेड कर सकते हैं।")}
          </p>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
