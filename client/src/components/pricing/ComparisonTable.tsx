import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Lang = "en" | "hi";

interface FeatureRow {
  name: { en: string; hi: string };
  free: boolean | string;
  basic: boolean | string;
  pro: boolean | string;
}

interface ComparisonTableProps {
  lang: Lang;
  billingCycle: "monthly" | "yearly";
  prices: {
    free: { monthly: number; yearly: number };
    basic: { monthly: number; yearly: number };
    pro: { monthly: number; yearly: number };
  };
}

const CONTENT = {
  compareTitle: { en: "Compare Plans", hi: "प्लान्स की तुलना करें" },
  feature: { en: "Feature", hi: "विशेषता" },
  free: { en: "Free", hi: "मुफ़्त" },
  basic: { en: "Basic", hi: "बेसिक" },
  pro: { en: "Pro", hi: "प्रो" },
  perMonth: { en: "/mo", hi: "/माह" },
  perYear: { en: "/yr", hi: "/वर्ष" }
};

const FEATURES: FeatureRow[] = [
  { 
    name: { en: "Users", hi: "यूज़र्स" },
    free: "1",
    basic: "5",
    pro: "Unlimited"
  },
  { 
    name: { en: "Records", hi: "रिकॉर्ड्स" },
    free: "Limited",
    basic: "5000",
    pro: "Unlimited"
  },
  { 
    name: { en: "GST Invoicing", hi: "GST इनवॉइसिंग" },
    free: false,
    basic: true,
    pro: true
  },
  { 
    name: { en: "Projects & Timesheets", hi: "Projects और Timesheets" },
    free: false,
    basic: true,
    pro: true
  },
  { 
    name: { en: "SMS Alerts", hi: "SMS अलर्ट्स" },
    free: false,
    basic: true,
    pro: true
  },
  { 
    name: { en: "WhatsApp Automation", hi: "WhatsApp ऑटोमेशन" },
    free: false,
    basic: false,
    pro: true
  },
  { 
    name: { en: "Priority Support", hi: "प्राथमिकता सहायता" },
    free: false,
    basic: false,
    pro: true
  },
  { 
    name: { en: "Advanced Analytics", hi: "एडवांस एनालिटिक्स" },
    free: false,
    basic: "Basic",
    pro: "Advanced"
  },
  { 
    name: { en: "Custom Roles", hi: "कस्टम रोल्स" },
    free: false,
    basic: false,
    pro: true
  },
  { 
    name: { en: "Email Notifications", hi: "ईमेल नोटिफिकेशन" },
    free: true,
    basic: true,
    pro: true
  }
];

function FeatureValue({ value, lang }: { value: boolean | string; lang: Lang }) {
  if (typeof value === "boolean") {
    return value ? (
      <Check className="h-5 w-5 text-green-600 mx-auto" />
    ) : (
      <X className="h-5 w-5 text-muted-foreground mx-auto" />
    );
  }
  
  const translations: Record<string, { en: string; hi: string }> = {
    "Limited": { en: "Limited", hi: "सीमित" },
    "Unlimited": { en: "Unlimited", hi: "अनलिमिटेड" },
    "Basic": { en: "Basic", hi: "बेसिक" },
    "Advanced": { en: "Advanced", hi: "एडवांस" }
  };
  
  const text = translations[value]?.[lang] || value;
  return <span className="text-sm">{text}</span>;
}

export function ComparisonTable({ lang, billingCycle, prices }: ComparisonTableProps) {
  const getPrice = (tier: "free" | "basic" | "pro") => {
    const p = prices[tier];
    return billingCycle === "yearly" ? p.yearly : p.monthly;
  };

  const period = billingCycle === "yearly" ? CONTENT.perYear[lang] : CONTENT.perMonth[lang];

  return (
    <div className="overflow-x-auto" data-testid="comparison-table">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b">
            <th className="text-left py-4 px-4 font-medium">{CONTENT.feature[lang]}</th>
            <th className="text-center py-4 px-4 min-w-[120px]">
              <div className="font-semibold" data-testid="compare-plan-free">{CONTENT.free[lang]}</div>
              <div className="text-sm text-muted-foreground">₹0</div>
            </th>
            <th className="text-center py-4 px-4 min-w-[120px] bg-primary/5">
              <div className="font-semibold" data-testid="compare-plan-basic">{CONTENT.basic[lang]}</div>
              <div className="text-sm text-muted-foreground">₹{getPrice("basic")}{period}</div>
            </th>
            <th className="text-center py-4 px-4 min-w-[120px]">
              <div className="font-semibold" data-testid="compare-plan-pro">{CONTENT.pro[lang]}</div>
              <div className="text-sm text-muted-foreground">₹{getPrice("pro")}{period}</div>
            </th>
          </tr>
        </thead>
        <tbody>
          {FEATURES.map((feature, idx) => (
            <tr 
              key={idx} 
              className={cn("border-b", idx % 2 === 0 && "bg-muted/30")}
              data-testid={`compare-row-${idx}`}
            >
              <td className="py-3 px-4 text-sm">{feature.name[lang]}</td>
              <td className="py-3 px-4 text-center">
                <FeatureValue value={feature.free} lang={lang} />
              </td>
              <td className="py-3 px-4 text-center bg-primary/5">
                <FeatureValue value={feature.basic} lang={lang} />
              </td>
              <td className="py-3 px-4 text-center">
                <FeatureValue value={feature.pro} lang={lang} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
