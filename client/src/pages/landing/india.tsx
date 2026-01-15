import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { LandingLayout } from "@/components/landing/LandingLayout";
import { 
  BillingToggle, 
  LanguageToggle, 
  RegionalLanguagePlaceholder,
  PlanCard,
  AddOnCard,
  ComparisonTable,
  FAQ,
  type PlanData,
  type AddOnData
} from "@/components/pricing";
import { Badge } from "@/components/ui/badge";
import { Check, Shield } from "lucide-react";
import { Helmet } from "react-helmet";

type Lang = "en" | "hi";

const PLANS: PlanData[] = [
  {
    id: "free",
    tier: "free",
    name: { en: "FREE", hi: "मुफ़्त" },
    tagline: { en: "Get started with basic business management", hi: "छोटे व्यवसायों के लिए शुरुआत" },
    subtitle: { en: "Perfect for solo founders", hi: "सोलो बिज़नेस के लिए उपयुक्त" },
    monthlyPrice: 0,
    yearlyPrice: 0,
    features: {
      en: ["1 user", "Limited records", "Email notifications", "No billing required"],
      hi: ["1 यूज़र", "सीमित रिकॉर्ड", "ईमेल नोटिफिकेशन", "कोई भुगतान नहीं"]
    },
    cta: { en: "Start Free", hi: "मुफ़्त शुरू करें" }
  },
  {
    id: "basic",
    tier: "basic",
    name: { en: "BASIC", hi: "बेसिक" },
    tagline: { en: "Everything small businesses need to run smoothly", hi: "छोटे व्यवसायों के लिए सबसे सही प्लान" },
    monthlyPrice: 99,
    yearlyPrice: 999,
    features: {
      en: ["Consulting & Software Services", "GST-ready invoicing", "Projects & Timesheets", "SMS alerts", "Analytics"],
      hi: ["Consulting और Software Services", "GST इनवॉइसिंग", "Projects और Timesheets", "SMS अलर्ट", "एनालिटिक्स"]
    },
    cta: { en: "Upgrade to Basic", hi: "Basic पर जाएँ" },
    recommended: true
  },
  {
    id: "pro",
    tier: "pro",
    name: { en: "PRO", hi: "प्रो" },
    tagline: { en: "Built for growing teams and agencies", hi: "बढ़ते बिज़नेस और एजेंसियों के लिए" },
    monthlyPrice: 199,
    yearlyPrice: 1999,
    features: {
      en: ["Unlimited records", "WhatsApp automation", "Priority support", "Advanced analytics", "Custom roles"],
      hi: ["अनलिमिटेड रिकॉर्ड", "WhatsApp ऑटोमेशन", "प्रायोरिटी सपोर्ट", "एडवांस एनालिटिक्स", "कस्टम रोल्स"]
    },
    cta: { en: "Go Pro", hi: "Pro चुनें" }
  }
];

const PAYROLL_ADDON: AddOnData = {
  id: "payroll",
  name: { en: "Payroll Add-On", hi: "Payroll ऐड-ऑन" },
  tagline: { en: "Simple payroll for Indian businesses", hi: "भारतीय व्यवसायों के लिए आसान Payroll" },
  subtitle: { en: "Pay only for what you use", hi: "जितना उपयोग करें, उतना भुगतान करें" },
  badge: { en: "Optional", hi: "वैकल्पिक" },
  tiers: [
    { min: 1, max: 5, monthlyPrice: 99 },
    { min: 6, max: 20, monthlyPrice: 199 },
    { min: 21, max: 50, monthlyPrice: 399 }
  ],
  features: {
    en: ["Payslips (PDF)", "Attendance-based payroll", "PF / ESI tracking", "7-day free trial"],
    hi: ["Payslips (PDF)", "Attendance आधारित सैलरी", "PF / ESI ट्रैकिंग", "7 दिन का मुफ़्त ट्रायल"]
  },
  cta: { en: "Add Payroll", hi: "Payroll जोड़ें" },
  trialDays: 7
};

const CONTENT = {
  header: {
    en: "Simple, Transparent Pricing",
    hi: "सरल, पारदर्शी मूल्य निर्धारण"
  },
  subtitle: {
    en: "Choose the plan that fits your business",
    hi: "अपने व्यवसाय के लिए सही प्लान चुनें"
  },
  addonsSection: { en: "Add-Ons", hi: "ऐड-ऑन्स" },
  addonsSubtitle: { en: "Enhance your plan with powerful add-ons", hi: "शक्तिशाली ऐड-ऑन्स के साथ अपने प्लान को बढ़ाएं" },
  footerNote: { en: "All prices in INR. GST as applicable.", hi: "सभी मूल्य INR में। GST यथा लागू।" },
  noCreditCard: { en: "No credit card required", hi: "क्रेडिट कार्ड की आवश्यकता नहीं" },
  cancelAnytime: { en: "Cancel anytime", hi: "कभी भी रद्द करें" },
  securePayments: { en: "Secure payments", hi: "सुरक्षित भुगतान" }
};

export default function IndiaLandingPage() {
  const [, setLocation] = useLocation();
  const [lang, setLang] = useState<Lang>(() => {
    const stored = localStorage.getItem("pricing_lang");
    return (stored === "hi" ? "hi" : "en") as Lang;
  });
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");

  const handleLangChange = (newLang: Lang) => {
    setLang(newLang);
    localStorage.setItem("pricing_lang", newLang);
  };

  const handleSelectPlan = (tier: string) => {
    setLocation("/register");
  };

  const handleCountryChange = (country: string) => {
    setLocation(`/${country}`);
  };

  return (
    <>
      <Helmet>
        <title>MyBizStream India - Business Management Software | Pricing from ₹99/month</title>
        <meta name="description" content="All-in-one business management platform for Indian SMBs. GST invoicing, payroll, projects & more. Start free, upgrade anytime. Plans from ₹99/month." />
        <link rel="canonical" href="https://mybizstream.com/in" />
        <meta property="og:title" content="MyBizStream India - Business Management Software" />
        <meta property="og:description" content="All-in-one business management for Indian SMBs. GST invoicing, payroll, projects & more. Start free!" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://mybizstream.com/in" />
      </Helmet>

      <LandingLayout currentCountry="in" onCountryChange={handleCountryChange}>
        <div className="container mx-auto px-4 py-12">
          <div className="flex justify-end mb-4">
            <LanguageToggle lang={lang} onLangChange={handleLangChange} />
          </div>

          <div className="text-center mb-12">
            <Badge className="mb-4" data-testid="badge-country">India</Badge>
            <h1 className="text-3xl md:text-4xl font-bold mb-4" data-testid="text-pricing-title">
              {CONTENT.header[lang]}
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8" data-testid="text-pricing-subtitle">
              {CONTENT.subtitle[lang]}
            </p>
            <BillingToggle 
              billingCycle={billingCycle} 
              onCycleChange={setBillingCycle} 
              lang={lang} 
            />
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-20">
            {PLANS.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                lang={lang}
                billingCycle={billingCycle}
                isCurrent={false}
                onSelect={handleSelectPlan}
              />
            ))}
          </div>

          <div className="max-w-4xl mx-auto mb-16">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold mb-2" data-testid="text-addons-title">
                {CONTENT.addonsSection[lang]}
              </h2>
              <p className="text-muted-foreground">
                {CONTENT.addonsSubtitle[lang]}
              </p>
            </div>
            <AddOnCard
              addon={PAYROLL_ADDON}
              lang={lang}
              billingCycle={billingCycle}
              onAdd={() => setLocation("/register")}
            />
          </div>

          <div className="max-w-5xl mx-auto mb-16">
            <ComparisonTable
              lang={lang}
              billingCycle={billingCycle}
              prices={{
                free: { monthly: 0, yearly: 0 },
                basic: { monthly: 99, yearly: 999 },
                pro: { monthly: 199, yearly: 1999 }
              }}
            />
          </div>

          <div className="mb-16">
            <FAQ lang={lang} />
          </div>

          <div className="text-center space-y-4">
            <p className="text-muted-foreground text-sm" data-testid="text-footer-note">
              {CONTENT.footerNote[lang]}
            </p>
            <div className="flex flex-wrap justify-center gap-4 md:gap-6 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Check className="h-4 w-4 text-green-600" />
                {CONTENT.noCreditCard[lang]}
              </span>
              <span className="flex items-center gap-1">
                <Check className="h-4 w-4 text-green-600" />
                {CONTENT.cancelAnytime[lang]}
              </span>
              <span className="flex items-center gap-1">
                <Shield className="h-4 w-4 text-green-600" />
                {CONTENT.securePayments[lang]}
              </span>
            </div>
          </div>

          <RegionalLanguagePlaceholder lang={lang} />
        </div>
      </LandingLayout>
    </>
  );
}
