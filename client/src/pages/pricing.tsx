import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "@/components/theme-toggle";
import { 
  Check, Zap, Star, Sparkles, ArrowLeft,
  Users, FileText, Bell, BarChart3, MessageSquare,
  IndianRupee, Clock, Shield
} from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { ComparisonTable } from "@/components/pricing/ComparisonTable";

type Lang = "en" | "hi";

const CONTENT = {
  header: {
    en: "Simple, Transparent Pricing",
    hi: "सरल, पारदर्शी मूल्य निर्धारण"
  },
  subtitle: {
    en: "Choose the plan that fits your business",
    hi: "अपने व्यवसाय के लिए सही प्लान चुनें"
  },
  monthly: { en: "Monthly", hi: "मासिक" },
  yearly: { en: "Yearly", hi: "वार्षिक" },
  saveYearly: { en: "Save up to ₹189/year", hi: "₹189/वर्ष तक बचाएं" },
  perMonth: { en: "/month", hi: "/माह" },
  perYear: { en: "/year", hi: "/वर्ष" },
  currentPlan: { en: "Current Plan", hi: "वर्तमान प्लान" },
  addonsSection: { en: "Add-Ons", hi: "ऐड-ऑन्स" },
  addonsSubtitle: { en: "Enhance your plan with powerful add-ons", hi: "शक्तिशाली ऐड-ऑन्स के साथ अपने प्लान को बढ़ाएं" },
  employees: { en: "Employees", hi: "कर्मचारी" },
  price: { en: "Price", hi: "मूल्य" },
  footerNote: { en: "All prices in INR. GST as applicable.", hi: "सभी मूल्य INR में। GST यथा लागू।" },
  noCreditCard: { en: "No credit card required", hi: "क्रेडिट कार्ड की आवश्यकता नहीं" },
  cancelAnytime: { en: "Cancel anytime", hi: "कभी भी रद्द करें" },
  securePayments: { en: "Secure payments", hi: "सुरक्षित भुगतान" },
  
  plans: {
    free: {
      name: { en: "FREE", hi: "मुफ़्त" },
      tagline: { en: "Get started with basic business management", hi: "छोटे व्यवसायों के लिए शुरुआत" },
      subtitle: { en: "Perfect for solo founders", hi: "सोलो बिज़नेस के लिए उपयुक्त" },
      features: {
        en: ["1 user", "Limited records", "Email notifications", "No billing required"],
        hi: ["1 यूज़र", "सीमित रिकॉर्ड", "ईमेल नोटिफिकेशन", "कोई भुगतान नहीं"]
      },
      cta: { en: "Start Free", hi: "मुफ़्त शुरू करें" }
    },
    basic: {
      name: { en: "BASIC", hi: "बेसिक" },
      price: 99,
      yearlyPrice: 999,
      tagline: { en: "Everything small businesses need to run smoothly", hi: "छोटे व्यवसायों के लिए सबसे सही प्लान" },
      features: {
        en: ["Consulting & Software Services", "GST-ready invoicing", "Projects & Timesheets", "SMS alerts", "Analytics"],
        hi: ["Consulting और Software Services", "GST इनवॉइसिंग", "Projects और Timesheets", "SMS अलर्ट", "एनालिटिक्स"]
      },
      cta: { en: "Upgrade to Basic", hi: "Basic पर जाएँ" },
      recommended: true
    },
    pro: {
      name: { en: "PRO", hi: "प्रो" },
      price: 199,
      yearlyPrice: 1999,
      tagline: { en: "Built for growing teams and agencies", hi: "बढ़ते बिज़नेस और एजेंसियों के लिए" },
      features: {
        en: ["Unlimited records", "WhatsApp automation", "Priority support", "Advanced analytics", "Custom roles"],
        hi: ["अनलिमिटेड रिकॉर्ड", "WhatsApp ऑटोमेशन", "प्रायोरिटी सपोर्ट", "एडवांस एनालिटिक्स", "कस्टम रोल्स"]
      },
      cta: { en: "Go Pro", hi: "Pro चुनें" }
    }
  },

  payrollAddon: {
    title: { en: "Payroll Add-On", hi: "Payroll ऐड-ऑन" },
    badge: { en: "Optional", hi: "वैकल्पिक" },
    tagline: { en: "Simple payroll for Indian businesses", hi: "भारतीय व्यवसायों के लिए आसान Payroll" },
    subtitle: { en: "Pay only for what you use", hi: "जितना उपयोग करें, उतना भुगतान करें" },
    tiers: [
      { min: 1, max: 5, price: 99 },
      { min: 6, max: 20, price: 199 },
      { min: 21, max: 50, price: 399 }
    ],
    features: {
      en: ["Payslips (PDF)", "Attendance-based payroll", "PF / ESI tracking", "7-day free trial"],
      hi: ["Payslips (PDF)", "Attendance आधारित सैलरी", "PF / ESI ट्रैकिंग", "7 दिन का मुफ़्त ट्रायल"]
    },
    cta: { en: "Add Payroll", hi: "Payroll जोड़ें" }
  }
};

export default function PricingPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [lang, setLang] = useState<Lang>(() => {
    const stored = localStorage.getItem("pricing_lang");
    return (stored === "hi" ? "hi" : "en") as Lang;
  });
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");

  const handleLangChange = (newLang: Lang) => {
    setLang(newLang);
    localStorage.setItem("pricing_lang", newLang);
  };

  const currentTier = localStorage.getItem("subscriptionTier") || "free";
  const isLoggedIn = !!localStorage.getItem("accessToken");

  const selectPlanMutation = useMutation({
    mutationFn: async (planCode: string) => {
      const tenantId = localStorage.getItem("tenantId");
      const res = await apiRequest("POST", "/api/subscription/select", {
        tenantId,
        planCode,
        billingCycle,
      });
      return res.json();
    },
    onSuccess: (data, planCode) => {
      const tier = planCode.replace("india_", "");
      localStorage.setItem("subscriptionTier", tier);
      queryClient.invalidateQueries({ queryKey: ["/api/auth"] });
      toast({ 
        title: lang === "en" ? "Plan Updated" : "प्लान अपडेट हो गया", 
        description: lang === "en" ? "Your subscription has been updated" : "आपकी सदस्यता अपडेट हो गई" 
      });
      setLocation("/dashboard");
    },
    onError: (error: Error) => {
      toast({ 
        title: lang === "en" ? "Update Failed" : "अपडेट विफल", 
        description: error.message, 
        variant: "destructive" 
      });
    },
  });

  const handleSelectPlan = (tier: string) => {
    if (!isLoggedIn) {
      setLocation("/register");
      return;
    }
    if (tier === currentTier) return;
    selectPlanMutation.mutate(`india_${tier}`);
  };

  const getPrice = (monthly: number, yearly: number) => {
    return billingCycle === "yearly" ? yearly : monthly;
  };

  const getSavings = (monthly: number, yearly: number) => {
    return (monthly * 12) - yearly;
  };

  const tierIcons: Record<string, React.ReactNode> = {
    free: <Zap className="h-6 w-6" />,
    basic: <Star className="h-6 w-6" />,
    pro: <Sparkles className="h-6 w-6" />,
  };

  const featureIcons = [Users, FileText, BarChart3, Bell, MessageSquare];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b sticky top-0 bg-background/95 backdrop-blur z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {isLoggedIn && (
              <Button variant="ghost" size="icon" asChild>
                <Link href="/dashboard" data-testid="link-back-dashboard">
                  <ArrowLeft className="h-5 w-5" />
                </Link>
              </Button>
            )}
            <h1 className="text-xl font-bold">MyBizStream</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex rounded-lg border p-1" data-testid="lang-toggle">
              <Button
                variant={lang === "en" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => handleLangChange("en")}
                className="h-7 px-3"
                data-testid="button-lang-en"
              >
                EN
              </Button>
              <Button
                variant={lang === "hi" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => handleLangChange("hi")}
                className="h-7 px-3"
                data-testid="button-lang-hi"
              >
                हिंदी
              </Button>
            </div>
            <ThemeToggle />
            {!isLoggedIn && (
              <Button asChild data-testid="button-login">
                <Link href="/login">{lang === "en" ? "Login" : "लॉगिन"}</Link>
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold mb-4" data-testid="text-pricing-title">
            {CONTENT.header[lang]}
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8" data-testid="text-pricing-subtitle">
            {CONTENT.subtitle[lang]}
          </p>

          <div className="flex items-center justify-center gap-2 mb-2" data-testid="billing-cycle-toggle">
            <Button
              variant={billingCycle === "monthly" ? "default" : "outline"}
              size="sm"
              onClick={() => setBillingCycle("monthly")}
              data-testid="button-cycle-monthly"
            >
              {CONTENT.monthly[lang]}
            </Button>
            <Button
              variant={billingCycle === "yearly" ? "default" : "outline"}
              size="sm"
              onClick={() => setBillingCycle("yearly")}
              data-testid="button-cycle-yearly"
            >
              {CONTENT.yearly[lang]}
            </Button>
          </div>
          {billingCycle === "yearly" && (
            <Badge variant="secondary" className="text-green-600" data-testid="badge-yearly-savings">
              {CONTENT.saveYearly[lang]}
            </Badge>
          )}
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-20">
          {(["free", "basic", "pro"] as const).map((tier) => {
            const plan = CONTENT.plans[tier];
            const isRecommended = "recommended" in plan && plan.recommended;
            const isCurrent = currentTier === tier;
            const price = "price" in plan ? getPrice(plan.price, plan.yearlyPrice) : 0;
            const savings = "price" in plan ? getSavings(plan.price, plan.yearlyPrice) : 0;

            return (
              <Card 
                key={tier}
                className={cn(
                  "relative flex flex-col",
                  isRecommended && "border-primary shadow-lg md:scale-105 z-10"
                )}
                data-testid={`card-plan-${tier}`}
              >
                {isRecommended && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground">
                      {lang === "en" ? "Recommended" : "अनुशंसित"}
                    </Badge>
                  </div>
                )}

                <CardHeader className="text-center pb-2">
                  <div className="flex justify-center mb-3">
                    <div className={cn(
                      "p-3 rounded-full",
                      tier === "free" ? "bg-muted" :
                      tier === "basic" ? "bg-blue-100 dark:bg-blue-900/50" :
                      "bg-purple-100 dark:bg-purple-900/50"
                    )}>
                      {tierIcons[tier]}
                    </div>
                  </div>
                  <CardTitle className="text-xl" data-testid={`text-plan-name-${tier}`}>
                    {plan.name[lang]}
                  </CardTitle>
                  <CardDescription className="min-h-[40px]" data-testid={`text-plan-tagline-${tier}`}>
                    {plan.tagline[lang]}
                    {"subtitle" in plan && (
                      <span className="block text-xs mt-1">{plan.subtitle[lang]}</span>
                    )}
                  </CardDescription>
                </CardHeader>

                <CardContent className="flex-1 pb-4">
                  <div className="text-center mb-6">
                    {price === 0 ? (
                      <span className="text-4xl font-bold" data-testid={`text-plan-price-${tier}`}>
                        {lang === "en" ? "Free" : "मुफ़्त"}
                      </span>
                    ) : (
                      <>
                        <span className="text-4xl font-bold" data-testid={`text-plan-price-${tier}`}>
                          ₹{price}
                        </span>
                        <span className="text-muted-foreground">
                          {billingCycle === "yearly" ? CONTENT.perYear[lang] : CONTENT.perMonth[lang]}
                        </span>
                        {billingCycle === "yearly" && savings > 0 && (
                          <div className="mt-2">
                            <Badge variant="secondary" className="text-green-600 text-xs" data-testid={`badge-savings-${tier}`}>
                              {lang === "en" ? `Save ₹${savings}` : `₹${savings} बचाएं`}
                            </Badge>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  <ul className="space-y-3">
                    {plan.features[lang].map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>

                <CardFooter>
                  <Button 
                    className="w-full" 
                    variant={isRecommended ? "default" : "outline"}
                    disabled={isCurrent || selectPlanMutation.isPending}
                    onClick={() => handleSelectPlan(tier)}
                    data-testid={`button-select-${tier}`}
                  >
                    {isCurrent ? CONTENT.currentPlan[lang] : plan.cta[lang]}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>

        <div className="max-w-5xl mx-auto mb-16">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-2" data-testid="text-compare-title">
              {lang === "en" ? "Compare Plans" : "प्लान्स की तुलना करें"}
            </h2>
            <p className="text-muted-foreground">
              {lang === "en" ? "See what's included in each plan" : "देखें हर प्लान में क्या शामिल है"}
            </p>
          </div>
          <Card className="p-6">
            <ComparisonTable 
              lang={lang} 
              billingCycle={billingCycle} 
              prices={{
                free: { monthly: 0, yearly: 0 },
                basic: { monthly: CONTENT.plans.basic.price, yearly: CONTENT.plans.basic.yearlyPrice },
                pro: { monthly: CONTENT.plans.pro.price, yearly: CONTENT.plans.pro.yearlyPrice }
              }}
            />
          </Card>
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

          <Card className="overflow-hidden" data-testid="card-payroll-addon">
            <CardHeader className="bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30 border-b">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/50">
                    <IndianRupee className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg" data-testid="text-payroll-title">
                      {CONTENT.payrollAddon.title[lang]}
                    </CardTitle>
                    <CardDescription data-testid="text-payroll-tagline">
                      {CONTENT.payrollAddon.tagline[lang]}
                    </CardDescription>
                  </div>
                </div>
                <Badge variant="outline" data-testid="badge-optional">
                  {CONTENT.payrollAddon.badge[lang]}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                {CONTENT.payrollAddon.subtitle[lang]}
              </p>
            </CardHeader>

            <CardContent className="pt-6">
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h4 className="font-medium mb-4 flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    {lang === "en" ? "Employee-Based Pricing" : "कर्मचारी-आधारित मूल्य निर्धारण"}
                  </h4>
                  <div className="rounded-lg border overflow-hidden">
                    <table className="w-full text-sm" data-testid="table-payroll-tiers">
                      <thead>
                        <tr className="bg-muted/50">
                          <th className="text-left py-2 px-4 font-medium">{CONTENT.employees[lang]}</th>
                          <th className="text-right py-2 px-4 font-medium">{CONTENT.price[lang]}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {CONTENT.payrollAddon.tiers.map((tier, idx) => (
                          <tr key={idx} className="border-t" data-testid={`row-tier-${idx}`}>
                            <td className="py-3 px-4">{tier.min}–{tier.max}</td>
                            <td className="py-3 px-4 text-right font-medium">
                              ₹{tier.price}{CONTENT.perMonth[lang]}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-4 flex items-center gap-2">
                    <Check className="h-4 w-4" />
                    {lang === "en" ? "Features Included" : "शामिल विशेषताएं"}
                  </h4>
                  <ul className="space-y-3">
                    {CONTENT.payrollAddon.features[lang].map((feature, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-sm">
                        {idx === 3 ? (
                          <Clock className="h-4 w-4 text-blue-600" />
                        ) : (
                          <Check className="h-4 w-4 text-green-600" />
                        )}
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>

            <CardFooter className="border-t bg-muted/30">
              <Button 
                className="w-full md:w-auto" 
                onClick={() => setLocation("/hr/billing")}
                data-testid="button-add-payroll"
              >
                {CONTENT.payrollAddon.cta[lang]}
              </Button>
            </CardFooter>
          </Card>
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

        <div className="mt-12 pt-8 border-t text-center" data-testid="regional-languages-placeholder">
          <p className="text-sm text-muted-foreground mb-2">
            {lang === "en" ? "Coming soon in:" : "जल्द ही उपलब्ध:"}
          </p>
          <p className="text-sm text-muted-foreground font-medium">
            தமிழ் | తెలుగు | ಕನ್ನಡ | മലയാളം | मराठी | বাংলা
          </p>
        </div>
      </main>
    </div>
  );
}
