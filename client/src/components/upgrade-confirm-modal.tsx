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
import { ArrowRight, Check, Loader2, Sparkles, Zap } from "lucide-react";

type Lang = "en" | "hi";

interface NewBenefit {
  label: string;
  description?: string;
}

interface UpgradeConfirmModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPlan: { name: string; tier: string };
  targetPlan: { name: string; tier: string };
  priceLabel: string;
  newBenefits: NewBenefit[];
  onProceedToPay: () => void;
  onCancel: () => void;
  isLoading?: boolean;
  lang?: Lang;
}

function t(lang: Lang, en: string, hi: string) {
  return lang === "hi" ? hi : en;
}

function getUpgradeTitle(lang: Lang, currentTier: string, targetTier: string) {
  if (currentTier === "free" && targetTier === "basic") {
    return t(lang, "Upgrade to Basic", "Basic में अपग्रेड करें");
  }
  if (currentTier === "basic" && targetTier === "pro") {
    return t(lang, "Upgrade to Pro", "Pro में अपग्रेड करें");
  }
  if (currentTier === "free" && targetTier === "pro") {
    return t(lang, "Upgrade to Pro", "Pro में अपग्रेड करें");
  }
  return t(lang, "Confirm upgrade", "अपग्रेड कन्फर्म करें");
}

function getUpgradeSubtitle(lang: Lang, currentTier: string, targetTier: string, priceLabel: string) {
  if (currentTier === "free" && targetTier === "basic") {
    return t(
      lang,
      `Unlock GST + SMS + Analytics for just ${priceLabel}/month. You can cancel anytime.`,
      `सिर्फ ${priceLabel}/महीना में GST + SMS + Analytics अनलॉक करें। आप कभी भी कैंसल कर सकते हैं।`
    );
  }
  if (currentTier === "basic" && targetTier === "pro") {
    return t(
      lang,
      `Get WhatsApp automation, unlimited records, and priority support for ${priceLabel}/month.`,
      `${priceLabel}/महीना में WhatsApp ऑटोमेशन, अनलिमिटेड रिकॉर्ड्स और प्राथमिकता सपोर्ट पाएँ।`
    );
  }
  return t(
    lang,
    `You'll be redirected to payment. Your plan activates only after payment success.`,
    `आपको पेमेंट पेज पर भेजा जाएगा। पेमेंट सफल होने के बाद ही प्लान एक्टिव होगा।`
  );
}

export function UpgradeConfirmModal({
  open,
  onOpenChange,
  currentPlan,
  targetPlan,
  priceLabel,
  newBenefits,
  onProceedToPay,
  onCancel,
  isLoading = false,
  lang = "en",
}: UpgradeConfirmModalProps) {
  const currentTier = currentPlan.tier.toLowerCase();
  const targetTier = targetPlan.tier.toLowerCase();

  const primaryLabel =
    currentTier === "free" && targetTier === "basic"
      ? t(lang, `Proceed to pay ${priceLabel}`, `पेमेंट करें ${priceLabel}`)
      : t(lang, "Proceed to payment", "पेमेंट के लिए आगे बढ़ें");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2" data-testid="modal-title-upgrade-confirm">
            <Zap className="h-5 w-5 text-primary" />
            {getUpgradeTitle(lang, currentTier, targetTier)}
          </DialogTitle>
          <DialogDescription className="pt-2 space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline">{currentPlan.name}</Badge>
              <ArrowRight className="h-4 w-4" />
              <Badge variant="default">{targetPlan.name}</Badge>
            </div>
            <p className="text-sm">{getUpgradeSubtitle(lang, currentTier, targetTier, priceLabel)}</p>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div data-testid="section-new-benefits">
            <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              {t(lang, "What you'll get", "आपको क्या मिलेगा")}
            </h4>
            {newBenefits.length > 0 ? (
              <ul className="space-y-2">
                {newBenefits.map((benefit) => (
                  <li 
                    key={benefit.label} 
                    className="rounded-xl border p-3 border-primary/20 bg-primary/5"
                    data-testid={`benefit-${benefit.label.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <div className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <div>
                        <span className="font-medium">{benefit.label}</span>
                        {benefit.description && (
                          <span className="block text-sm text-muted-foreground mt-0.5">
                            {benefit.description}
                          </span>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="rounded-xl border p-3 text-sm text-muted-foreground">
                {t(lang, "Enhanced limits and priority support.", "बेहतर लिमिट्स और प्राथमिकता सपोर्ट।")}
              </div>
            )}
          </div>

          <div className="rounded-xl border p-3 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
            <div className="flex items-start gap-2">
              <Check className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-green-700 dark:text-green-300">
                  {t(lang, "Instant activation", "तुरंत एक्टिवेशन")}
                </p>
                <p className="text-green-600 dark:text-green-400 mt-1">
                  {t(
                    lang,
                    "Your new features will be available immediately after payment.",
                    "पेमेंट के तुरंत बाद आपके नए फीचर्स उपलब्ध हो जाएंगे।"
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
              data-testid="button-cancel-upgrade-modal"
            >
              {t(lang, "Go back", "वापस जाएँ")}
            </Button>
            <Button
              onClick={onProceedToPay}
              disabled={isLoading}
              data-testid="button-proceed-to-pay"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t(lang, "Processing...", "प्रोसेसिंग...")}
                </>
              ) : (
                primaryLabel
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground text-center sm:text-right">
            {t(lang, "Secure payment powered by Razorpay", "Razorpay द्वारा सुरक्षित पेमेंट")}
          </p>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
