import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, X, Minus } from "lucide-react";
import type { Lang } from "@shared/billing/i18n";

interface ComparisonFeature {
  key: string;
  label: Record<Lang, string>;
  free: string | boolean | number;
  basic: string | boolean | number;
  pro: string | boolean | number;
}

const COMPARISON_FEATURES: ComparisonFeature[] = [
  {
    key: "users",
    label: { en: "Users", hi: "उपयोगकर्ता", ms: "Pengguna", ta: "பயனர்கள்" },
    free: 1,
    basic: 3,
    pro: "Unlimited"
  },
  {
    key: "records",
    label: { en: "Records", hi: "रिकॉर्ड्स", ms: "Rekod", ta: "பதிவுகள்" },
    free: 50,
    basic: 500,
    pro: "Unlimited"
  },
  {
    key: "gst",
    label: { en: "GST Invoicing", hi: "GST इनवॉइसिंग", ms: "Invois GST", ta: "GST விலைப்பட்டியல்" },
    free: false,
    basic: true,
    pro: true
  },
  {
    key: "software_services",
    label: { en: "Software Services", hi: "सॉफ्टवेयर सर्विसेज", ms: "Perkhidmatan Perisian", ta: "மென்பொருள் சேவைகள்" },
    free: false,
    basic: false,
    pro: true
  },
  {
    key: "whatsapp",
    label: { en: "WhatsApp Automation", hi: "WhatsApp ऑटोमेशन", ms: "Automasi WhatsApp", ta: "WhatsApp தன்னியக்கம்" },
    free: false,
    basic: false,
    pro: true
  },
  {
    key: "payroll",
    label: { en: "Payroll / HRMS", hi: "Payroll / HRMS", ms: "Gaji / HRMS", ta: "சம்பளம் / HRMS" },
    free: false,
    basic: "Add-on",
    pro: "Add-on"
  },
  {
    key: "analytics",
    label: { en: "Business Analytics", hi: "बिज़नेस एनालिटिक्स", ms: "Analitik Perniagaan", ta: "வணிக பகுப்பாய்வு" },
    free: false,
    basic: true,
    pro: true
  },
  {
    key: "advanced_analytics",
    label: { en: "Advanced Reports", hi: "Advanced रिपोर्ट्स", ms: "Laporan Lanjutan", ta: "மேம்பட்ட அறிக்கைகள்" },
    free: false,
    basic: false,
    pro: true
  },
  {
    key: "priority_support",
    label: { en: "Priority Support", hi: "प्रायोरिटी सपोर्ट", ms: "Sokongan Keutamaan", ta: "முன்னுரிமை ஆதரவு" },
    free: false,
    basic: false,
    pro: true
  },
  {
    key: "custom_roles",
    label: { en: "Custom Roles", hi: "कस्टम रोल्स", ms: "Peranan Tersuai", ta: "தனிப்பயன் பாத்திரங்கள்" },
    free: false,
    basic: false,
    pro: true
  }
];

const UNLIMITED_TEXT: Record<Lang, string> = {
  en: "Unlimited",
  hi: "अनलिमिटेड",
  ms: "Tanpa Had",
  ta: "வரம்பற்ற"
};

const ADD_ON_TEXT: Record<Lang, string> = {
  en: "Add-on",
  hi: "Add-on",
  ms: "Tambahan",
  ta: "கூடுதல்"
};

const TIER_NAMES: Record<string, Record<Lang, string>> = {
  free: { en: "Free", hi: "मुफ़्त", ms: "Percuma", ta: "இலவசம்" },
  basic: { en: "Basic", hi: "Basic", ms: "Basic", ta: "Basic" },
  pro: { en: "Pro", hi: "Pro", ms: "Pro", ta: "Pro" }
};

const TABLE_LABELS: Record<string, Record<Lang, string>> = {
  feature: { en: "Feature", hi: "फ़ीचर", ms: "Ciri", ta: "அம்சம்" },
  compare: { en: "Compare Plans", hi: "प्लान्स की तुलना", ms: "Bandingkan Pelan", ta: "திட்டங்களை ஒப்பிடுக" },
  perMonth: { en: "/month", hi: "/महीना", ms: "/bulan", ta: "/மாதம்" }
};

interface PlanComparisonTableProps {
  lang?: Lang;
  currentTier?: string;
  highlightTier?: string;
}

export function PlanComparisonTable({ 
  lang = "en", 
  currentTier,
  highlightTier = "basic"
}: PlanComparisonTableProps) {
  
  const renderValue = (value: string | boolean | number) => {
    if (typeof value === "boolean") {
      return value ? (
        <Check className="h-5 w-5 text-green-600 mx-auto" />
      ) : (
        <X className="h-5 w-5 text-muted-foreground mx-auto" />
      );
    }
    if (value === "Unlimited") {
      return <span className="font-medium text-primary">{UNLIMITED_TEXT[lang]}</span>;
    }
    if (value === "Add-on") {
      return <span className="text-muted-foreground">{ADD_ON_TEXT[lang]}</span>;
    }
    return <span>{value}</span>;
  };

  const getColumnClass = (tier: string) => {
    if (tier === highlightTier) {
      return "bg-primary/5 font-medium";
    }
    if (tier === currentTier) {
      return "bg-green-50 dark:bg-green-950/20";
    }
    return "";
  };

  const getTierName = (tier: string) => {
    return TIER_NAMES[tier]?.[lang] || TIER_NAMES[tier]?.en || tier;
  };

  return (
    <Card id="comparison" data-testid="card-plan-comparison">
      <CardHeader>
        <CardTitle className="text-center">
          {TABLE_LABELS.compare[lang] || TABLE_LABELS.compare.en}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">
                  {TABLE_LABELS.feature[lang] || TABLE_LABELS.feature.en}
                </TableHead>
                <TableHead className={`text-center ${getColumnClass("free")}`}>
                  <div className="space-y-1">
                    <div>{getTierName("free")}</div>
                  </div>
                </TableHead>
                <TableHead className={`text-center ${getColumnClass("basic")}`}>
                  <div className="space-y-1">
                    <div>{getTierName("basic")}</div>
                  </div>
                </TableHead>
                <TableHead className={`text-center ${getColumnClass("pro")}`}>
                  <div className="space-y-1">
                    <div>{getTierName("pro")}</div>
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {COMPARISON_FEATURES.map((feature) => (
                <TableRow key={feature.key}>
                  <TableCell className="font-medium">
                    {feature.label[lang] || feature.label.en}
                  </TableCell>
                  <TableCell className={`text-center ${getColumnClass("free")}`}>
                    {renderValue(feature.free)}
                  </TableCell>
                  <TableCell className={`text-center ${getColumnClass("basic")}`}>
                    {renderValue(feature.basic)}
                  </TableCell>
                  <TableCell className={`text-center ${getColumnClass("pro")}`}>
                    {renderValue(feature.pro)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

interface WhyUpgradeSectionProps {
  tier: "basic" | "pro";
  lang?: Lang;
}

const WHY_UPGRADE_CONTENT = {
  basic: {
    title: {
      en: "Why upgrade to Basic?",
      hi: "Basic में क्यों अपग्रेड करें?",
      ms: "Mengapa naik taraf ke Basic?",
      ta: "ஏன் Basic-க்கு மேம்படுத்த வேண்டும்?"
    },
    points: {
      en: [
        "Add 3 team members to share workload",
        "Create GST-compliant invoices",
        "Get business insights with analytics",
        "Send automated SMS reminders"
      ],
      hi: [
        "3 टीम मेंबर जोड़ें और काम बाँटें",
        "GST-compliant इनवॉइस बनाएं",
        "Analytics से बिज़नेस इनसाइट्स पाएं",
        "ऑटोमैटिक SMS रिमाइंडर भेजें"
      ],
      ms: [
        "Tambah 3 ahli pasukan untuk berkongsi beban kerja",
        "Cipta invois mematuhi GST",
        "Dapatkan pandangan perniagaan dengan analitik",
        "Hantar peringatan SMS automatik"
      ],
      ta: [
        "பணிச்சுமையைப் பகிர 3 குழு உறுப்பினர்களைச் சேர்க்கவும்",
        "GST-இணக்கமான விலைப்பட்டியல்களை உருவாக்கவும்",
        "பகுப்பாய்வுடன் வணிக நுண்ணறிவைப் பெறுங்கள்",
        "தானியங்கு SMS நினைவூட்டல்களை அனுப்பவும்"
      ]
    }
  },
  pro: {
    title: {
      en: "Why upgrade to Pro?",
      hi: "Pro में क्यों अपग्रेड करें?",
      ms: "Mengapa naik taraf ke Pro?",
      ta: "ஏன் Pro-க்கு மேம்படுத்த வேண்டும்?"
    },
    points: {
      en: [
        "Unlimited users and records - no limits",
        "WhatsApp automation for customer engagement",
        "Advanced reports and custom dashboards",
        "Priority support with faster response times"
      ],
      hi: [
        "Unlimited users और records - कोई लिमिट नहीं",
        "WhatsApp automation से ग्राहकों से जुड़ें",
        "Advanced reports और custom dashboards",
        "Priority support और तेज़ रिस्पॉन्स"
      ],
      ms: [
        "Pengguna dan rekod tanpa had - tiada had",
        "Automasi WhatsApp untuk penglibatan pelanggan",
        "Laporan lanjutan dan papan pemuka tersuai",
        "Sokongan keutamaan dengan masa respons lebih cepat"
      ],
      ta: [
        "வரம்பற்ற பயனர்கள் மற்றும் பதிவுகள் - வரம்புகள் இல்லை",
        "வாடிக்கையாளர் ஈடுபாட்டிற்கான WhatsApp தன்னியக்கம்",
        "மேம்பட்ட அறிக்கைகள் மற்றும் தனிப்பயன் டாஷ்போர்டுகள்",
        "விரைவான பதில் நேரங்களுடன் முன்னுரிமை ஆதரவு"
      ]
    }
  }
};

export function WhyUpgradeSection({ tier, lang = "en" }: WhyUpgradeSectionProps) {
  const content = WHY_UPGRADE_CONTENT[tier];
  
  return (
    <Card data-testid={`card-why-upgrade-${tier}`}>
      <CardHeader>
        <CardTitle className="text-lg">
          {content.title[lang] || content.title.en}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {(content.points[lang] || content.points.en).map((point, index) => (
            <li key={index} className="flex items-start gap-2 text-sm">
              <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <span>{point}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
