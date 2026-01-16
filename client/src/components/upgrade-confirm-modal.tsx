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
import { ArrowRight, Check, Loader2, Sparkles, Zap, Coins } from "lucide-react";
import { savingsComparisonText } from "@shared/billing/i18n";

type Lang = "en" | "hi" | "ms" | "ta";

interface NewBenefit {
  label: string;
  description?: string;
}

interface MultilingualBenefit {
  label: { en: string; hi: string; ms: string; ta: string };
  description: { en: string; hi: string; ms: string; ta: string };
}

const DEFAULT_BENEFITS_FREE_TO_BASIC: MultilingualBenefit[] = [
  {
    label: { 
      en: "GST invoicing", 
      hi: "GST इनवॉइसिंग",
      ms: "Invois GST",
      ta: "GST விலைப்பட்டியல்"
    },
    description: {
      en: "Create GST-ready invoices with tax breakup and GSTIN validation.",
      hi: "GST-ready invoices बनाएं, tax breakup और GSTIN validation के साथ।",
      ms: "Cipta invois sedia GST dengan pecahan cukai dan pengesahan GSTIN.",
      ta: "வரி விவரம் மற்றும் GSTIN சரிபார்ப்புடன் GST-தயார் விலைப்பட்டியல்களை உருவாக்கவும்."
    },
  },
  {
    label: { 
      en: "SMS notifications", 
      hi: "SMS नोटिफिकेशन",
      ms: "Pemberitahuan SMS",
      ta: "SMS அறிவிப்புகள்"
    },
    description: {
      en: "Send reminders and updates to customers via SMS (when enabled).",
      hi: "कस्टमर को SMS से reminders और updates भेजें (जब enabled हो)।",
      ms: "Hantar peringatan dan kemas kini kepada pelanggan melalui SMS (apabila didayakan).",
      ta: "வாடிக்கையாளர்களுக்கு SMS மூலம் நினைவூட்டல்கள் மற்றும் புதுப்பிப்புகளை அனுப்புங்கள்."
    },
  },
  {
    label: { 
      en: "Analytics dashboard", 
      hi: "Analytics डैशबोर्ड",
      ms: "Papan pemuka analitik",
      ta: "பகுப்பாய்வு டாஷ்போர்ட்"
    },
    description: {
      en: "Track sales, collections, and performance at a glance.",
      hi: "Sales, collections और performance को एक नज़र में देखें।",
      ms: "Jejaki jualan, kutipan dan prestasi sepintas lalu.",
      ta: "விற்பனை, வசூல் மற்றும் செயல்திறனை ஒரே பார்வையில் கண்காணிக்கவும்."
    },
  },
  {
    label: { 
      en: "More users & limits", 
      hi: "अधिक users और limits",
      ms: "Lebih ramai pengguna & had",
      ta: "கூடுதல் பயனர்கள் & வரம்புகள்"
    },
    description: {
      en: "Add up to 3 users and handle higher customer/record limits.",
      hi: "3 users तक add करें और अधिक customer/record limits पाएं।",
      ms: "Tambah sehingga 3 pengguna dan kendalikan had pelanggan/rekod yang lebih tinggi.",
      ta: "3 பயனர்கள் வரை சேர்க்கவும் மற்றும் அதிக வாடிக்கையாளர்/பதிவு வரம்புகளை கையாளவும்."
    },
  },
];

const DEFAULT_BENEFITS_BASIC_TO_PRO: MultilingualBenefit[] = [
  {
    label: { 
      en: "WhatsApp automation", 
      hi: "WhatsApp ऑटोमेशन",
      ms: "Automasi WhatsApp",
      ta: "WhatsApp ஆட்டோமேஷன்"
    },
    description: {
      en: "Automate reminders, status updates, and payment follow-ups on WhatsApp.",
      hi: "WhatsApp पर reminders, status updates और payment follow-ups ऑटोमेट करें।",
      ms: "Automatikkan peringatan, kemas kini status dan susulan pembayaran di WhatsApp.",
      ta: "WhatsApp-ல் நினைவூட்டல்கள், நிலை புதுப்பிப்புகள் மற்றும் கட்டண தொடர்களை தானியங்குபடுத்துங்கள்."
    },
  },
  {
    label: { 
      en: "Unlimited records & customers", 
      hi: "Unlimited records और customers",
      ms: "Rekod & pelanggan tanpa had",
      ta: "வரம்பற்ற பதிவுகள் & வாடிக்கையாளர்கள்"
    },
    description: {
      en: "No caps on records/customers so you can scale without limits.",
      hi: "Records/customers पर कोई cap नहीं — बिना limits के scale करें।",
      ms: "Tiada had pada rekod/pelanggan supaya anda boleh berkembang tanpa had.",
      ta: "பதிவுகள்/வாடிக்கையாளர்களுக்கு வரம்பு இல்லை - வரம்பற்ற வளர்ச்சி."
    },
  },
  {
    label: { 
      en: "10 users (team-ready)", 
      hi: "10 users (टीम के लिए)",
      ms: "10 pengguna (sedia untuk pasukan)",
      ta: "10 பயனர்கள் (குழு-தயார்)"
    },
    description: {
      en: "Add up to 10 users for staff and managers.",
      hi: "Staff और managers के लिए 10 users तक add करें।",
      ms: "Tambah sehingga 10 pengguna untuk kakitangan dan pengurus.",
      ta: "ஊழியர்கள் மற்றும் மேலாளர்களுக்கு 10 பயனர்கள் வரை சேர்க்கவும்."
    },
  },
  {
    label: { 
      en: "Priority support", 
      hi: "Priority सपोर्ट",
      ms: "Sokongan keutamaan",
      ta: "முன்னுரிமை ஆதரவு"
    },
    description: {
      en: "Faster support response for business-critical issues.",
      hi: "Business-critical issues के लिए तेज़ support response।",
      ms: "Respons sokongan lebih pantas untuk isu kritikal perniagaan.",
      ta: "வணிக-முக்கிய சிக்கல்களுக்கு விரைவான ஆதரவு பதில்."
    },
  },
];

function localizeBenefits(
  benefits: Array<{ label: { en: string; hi: string; ms: string; ta: string }; description?: { en: string; hi: string; ms: string; ta: string } }>,
  lang: Lang
): NewBenefit[] {
  return benefits.map((b) => ({
    label: b.label[lang] || b.label.en,
    description: b.description ? (b.description[lang] || b.description.en) : undefined,
  }));
}

function getDefaultUpgradeBenefits(currentKey: string, targetKey: string): BilingualBenefit[] {
  if (currentKey === "free" && targetKey === "basic") return DEFAULT_BENEFITS_FREE_TO_BASIC;
  if (currentKey === "basic" && targetKey === "pro") return DEFAULT_BENEFITS_BASIC_TO_PRO;
  if (currentKey === "free" && targetKey === "pro") return DEFAULT_BENEFITS_BASIC_TO_PRO;
  return [];
}

function getDefaultBenefits(lang: Lang, currentTier: string, targetTier: string): NewBenefit[] {
  const benefits = getDefaultUpgradeBenefits(currentTier, targetTier);
  return localizeBenefits(benefits, lang);
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
  billingCycle?: "monthly" | "yearly";
  yearlySavingsAmount?: number;
  currencySymbol?: string;
}

function t(lang: Lang, en: string, hi: string, ms?: string, ta?: string) {
  if (lang === "hi") return hi;
  if (lang === "ms") return ms || en;
  if (lang === "ta") return ta || en;
  return en;
}

function getUpgradeTitle(lang: Lang, currentTier: string, targetTier: string) {
  if (currentTier === "free" && targetTier === "basic") {
    return t(lang, "Upgrade to Basic", "Basic में अपग्रेड करें", "Naik taraf ke Asas", "அடிப்படைக்கு மேம்படுத்துங்கள்");
  }
  if (currentTier === "basic" && targetTier === "pro") {
    return t(lang, "Upgrade to Pro", "Pro में अपग्रेड करें", "Naik taraf ke Pro", "புரோவுக்கு மேம்படுத்துங்கள்");
  }
  if (currentTier === "free" && targetTier === "pro") {
    return t(lang, "Upgrade to Pro", "Pro में अपग्रेड करें", "Naik taraf ke Pro", "புரோவுக்கு மேம்படுத்துங்கள்");
  }
  return t(lang, "Confirm upgrade", "अपग्रेड कन्फर्म करें", "Sahkan naik taraf", "மேம்படுத்தலை உறுதிப்படுத்துங்கள்");
}

function getUpgradeSubtitle(lang: Lang, currentTier: string, targetTier: string, priceLabel: string) {
  if (currentTier === "free" && targetTier === "basic") {
    return t(
      lang,
      `Unlock Software Services. Get GST invoicing, projects, and analytics for just ${priceLabel}/month.`,
      `Software Services अनलॉक करें। ${priceLabel}/महीने में GST, Projects और Analytics पाएं।`,
      `Buka kunci Perkhidmatan Perisian. Dapatkan invois GST, projek dan analitik dengan hanya ${priceLabel}/bulan.`,
      `மென்பொருள் சேவைகளை திறக்கவும். ${priceLabel}/மாதத்திற்கு GST விலைப்பட்டியல், திட்டங்கள் மற்றும் பகுப்பாய்வு பெறுங்கள்.`
    );
  }
  if (currentTier === "basic" && targetTier === "pro") {
    return t(
      lang,
      `Unlock WhatsApp automation and unlimited growth for ${priceLabel}/month. Everything unlocked.`,
      `${priceLabel}/महीना में WhatsApp automation और unlimited growth अनलॉक करें। सब कुछ अनलॉक।`,
      `Buka kunci automasi WhatsApp dan pertumbuhan tanpa had untuk ${priceLabel}/bulan. Semuanya dibuka kunci.`,
      `${priceLabel}/மாதத்திற்கு WhatsApp ஆட்டோமேஷன் மற்றும் வரம்பற்ற வளர்ச்சியைத் திறக்கவும். எல்லாம் திறக்கப்பட்டது.`
    );
  }
  if (currentTier === "free" && targetTier === "pro") {
    return t(
      lang,
      `Get all premium features for ${priceLabel}/month. Everything unlocked.`,
      `${priceLabel}/महीना में सभी premium features पाएँ। सब कुछ अनलॉक।`,
      `Dapatkan semua ciri premium untuk ${priceLabel}/bulan. Semuanya dibuka kunci.`,
      `${priceLabel}/மாதத்திற்கு அனைத்து பிரீமியம் அம்சங்களையும் பெறுங்கள். எல்லாம் திறக்கப்பட்டது.`
    );
  }
  return t(
    lang,
    `You'll be redirected to payment. Your plan activates only after payment success.`,
    `आपको पेमेंट पेज पर भेजा जाएगा। पेमेंट सफल होने के बाद ही प्लान एक्टिव होगा।`,
    `Anda akan dialihkan ke pembayaran. Pelan anda aktif hanya selepas pembayaran berjaya.`,
    `நீங்கள் கட்டணத்திற்கு திருப்பி அனுப்பப்படுவீர்கள். கட்டணம் வெற்றியடைந்த பின்னரே உங்கள் திட்டம் செயல்படும்.`
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
  billingCycle,
  yearlySavingsAmount,
  currencySymbol = "₹",
}: UpgradeConfirmModalProps) {
  const currentTier = currentPlan.tier.toLowerCase();
  const targetTier = targetPlan.tier.toLowerCase();

  const displayBenefits = newBenefits.length > 0 
    ? newBenefits 
    : getDefaultBenefits(lang, currentTier, targetTier);

  const primaryLabel =
    currentTier === "free" && targetTier === "basic"
      ? t(lang, `Proceed to pay ${priceLabel}`, `पेमेंट करें ${priceLabel}`, `Teruskan untuk membayar ${priceLabel}`, `${priceLabel} கட்டணத்திற்கு தொடரவும்`)
      : t(lang, "Proceed to payment", "पेमेंट के लिए आगे बढ़ें", "Teruskan ke pembayaran", "கட்டணத்திற்கு தொடரவும்");

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
              {t(lang, "What you'll get", "आपको क्या मिलेगा", "Apa yang anda akan dapat", "நீங்கள் என்ன பெறுவீர்கள்")}
            </h4>
            {displayBenefits.length > 0 ? (
              <ul className="space-y-2">
                {displayBenefits.map((benefit) => (
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
                {t(lang, "Enhanced limits and priority support.", "बेहतर लिमिट्स और प्राथमिकता सपोर्ट।", "Had yang dipertingkat dan sokongan keutamaan.", "மேம்படுத்தப்பட்ட வரம்புகள் மற்றும் முன்னுரிமை ஆதரவு.")}
              </div>
            )}
          </div>

          <div className="rounded-xl border p-3 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
            <div className="flex items-start gap-2">
              <Check className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-green-700 dark:text-green-300">
                  {t(lang, "Instant activation", "तुरंत एक्टिवेशन", "Pengaktifan segera", "உடனடி செயல்படுத்தல்")}
                </p>
                <p className="text-green-600 dark:text-green-400 mt-1">
                  {t(
                    lang,
                    "Your new features will be available immediately after payment.",
                    "पेमेंट के तुरंत बाद आपके नए फीचर्स उपलब्ध हो जाएंगे।",
                    "Ciri baharu anda akan tersedia serta-merta selepas pembayaran.",
                    "கட்டணத்திற்குப் பிறகு உங்கள் புதிய அம்சங்கள் உடனடியாகக் கிடைக்கும்."
                  )}
                </p>
              </div>
            </div>
          </div>

          {billingCycle === "yearly" && yearlySavingsAmount && yearlySavingsAmount > 0 && (
            <div className="rounded-xl border p-3 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
              <div className="flex items-start gap-2">
                <Coins className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-blue-700 dark:text-blue-300">
                    {t(lang, "Yearly savings", "वार्षिक बचत", "Penjimatan tahunan", "வருடாந்திர சேமிப்பு")}
                  </p>
                  <p className="text-blue-600 dark:text-blue-400 mt-1">
                    {savingsComparisonText(lang, yearlySavingsAmount, currencySymbol)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col gap-3">
          <div className="flex flex-col-reverse gap-2 w-full sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              onClick={onCancel}
              disabled={isLoading}
              data-testid="button-cancel-upgrade-modal"
            >
              {t(lang, "Go back", "वापस जाएँ", "Kembali", "திரும்பிச் செல்லுங்கள்")}
            </Button>
            <Button
              onClick={onProceedToPay}
              disabled={isLoading}
              data-testid="button-proceed-to-pay"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t(lang, "Processing...", "प्रोसेसिंग...", "Memproses...", "செயலாக்குகிறது...")}
                </>
              ) : (
                primaryLabel
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground text-center sm:text-right">
            {t(lang, "Secure payment powered by Razorpay", "Razorpay द्वारा सुरक्षित पेमेंट", "Pembayaran selamat oleh Razorpay", "Razorpay மூலம் பாதுகாப்பான கட்டணம்")}
          </p>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
