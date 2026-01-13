import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageToggle } from "@/components/language-toggle";
import { useTenantLanguage } from "@/hooks/use-tenant-language";
import { 
  Check, X, Zap, Star, Sparkles, ArrowLeft, ArrowRight,
  Users, Database, MessageCircle, FileText, Headphones
} from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { formatPriceOrFree } from "@/lib/formatPrice";
import { BILLING_STRINGS, t as tStr, savingsBadgeText } from "@shared/billing/i18n";
import type { Lang } from "@shared/billing/i18n";
import { CYCLE_LABELS } from "@shared/billing/types";
import type { BillingCycleKey } from "@shared/billing/types";

interface PricingPlan {
  id: string;
  code: string;
  name: string;
  description: string;
  tier: string;
  price: string;
  currency: string;
  currencyCode?: string;
  maxUsers: number;
  maxRecords: number;
  features: Record<string, boolean>;
  isPopular?: boolean;
}

const INDIA_PLANS: PricingPlan[] = [
  {
    id: "free",
    code: "india_free",
    name: "Free",
    description: "Get started with essential features",
    tier: "free",
    price: "0",
    currency: "INR",
    maxUsers: 1,
    maxRecords: 50,
    features: {
      recordLimit: true,
      basicAnalytics: true,
      emailNotifications: true,
      whatsappAutomation: false,
      gstFeatures: false,
      prioritySupport: false,
      unlimitedRecords: false,
    },
  },
  {
    id: "basic",
    code: "india_basic",
    name: "Basic",
    description: "Perfect for growing businesses",
    tier: "basic",
    price: "99",
    currency: "INR",
    maxUsers: 3,
    maxRecords: 500,
    features: {
      recordLimit: true,
      basicAnalytics: true,
      advancedAnalytics: true,
      emailNotifications: true,
      smsNotifications: true,
      gstFeatures: true,
      whatsappAutomation: false,
      prioritySupport: false,
      unlimitedRecords: false,
    },
    isPopular: true,
  },
  {
    id: "pro",
    code: "india_pro",
    name: "Pro",
    description: "For established businesses that need more",
    tier: "pro",
    price: "199",
    currency: "INR",
    maxUsers: 10,
    maxRecords: -1,
    features: {
      unlimitedRecords: true,
      basicAnalytics: true,
      advancedAnalytics: true,
      emailNotifications: true,
      smsNotifications: true,
      whatsappAutomation: true,
      gstFeatures: true,
      prioritySupport: true,
      recordLimit: false,
    },
  },
];

const FEATURE_LABELS: Record<string, { label: { en: string; hi: string }; icon: typeof Check }> = {
  unlimitedRecords: { label: { en: "Unlimited records", hi: "अनलिमिटेड रिकॉर्ड्स" }, icon: Database },
  basicAnalytics: { label: { en: "Basic analytics", hi: "बेसिक एनालिटिक्स" }, icon: Zap },
  advancedAnalytics: { label: { en: "Advanced analytics", hi: "एडवांस्ड एनालिटिक्स" }, icon: Sparkles },
  emailNotifications: { label: { en: "Email notifications", hi: "ईमेल नोटिफिकेशन" }, icon: MessageCircle },
  smsNotifications: { label: { en: "SMS notifications", hi: "SMS नोटिफिकेशन" }, icon: MessageCircle },
  whatsappAutomation: { label: { en: "WhatsApp automation", hi: "WhatsApp ऑटोमेशन" }, icon: MessageCircle },
  gstFeatures: { label: { en: "GST invoicing", hi: "GST इनवॉइसिंग" }, icon: FileText },
  prioritySupport: { label: { en: "Priority support", hi: "Priority सपोर्ट" }, icon: Headphones },
};

const COMPARISON_FEATURES = [
  { key: "maxUsers", label: { en: "Team members", hi: "टीम सदस्य" } },
  { key: "maxRecords", label: { en: "Records", hi: "रिकॉर्ड्स" } },
  { key: "basicAnalytics", label: { en: "Basic analytics", hi: "बेसिक एनालिटिक्स" } },
  { key: "advancedAnalytics", label: { en: "Advanced analytics", hi: "एडवांस्ड एनालिटिक्स" } },
  { key: "emailNotifications", label: { en: "Email notifications", hi: "ईमेल नोटिफिकेशन" } },
  { key: "smsNotifications", label: { en: "SMS notifications", hi: "SMS नोटिफिकेशन" } },
  { key: "whatsappAutomation", label: { en: "WhatsApp automation", hi: "WhatsApp ऑटोमेशन" } },
  { key: "gstFeatures", label: { en: "GST invoicing", hi: "GST इनवॉइसिंग" } },
  { key: "prioritySupport", label: { en: "Priority support", hi: "Priority सपोर्ट" } },
];


export default function PricingPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedCycle, setSelectedCycle] = useState<BillingCycleKey>("monthly");

  const tenantId = localStorage.getItem("tenantId");
  const { lang, setLang } = useTenantLanguage(tenantId || undefined);
  const t = (key: keyof typeof BILLING_STRINGS): string => tStr(lang as Lang, key);

  const currentTier = localStorage.getItem("subscriptionTier") || "free";
  const isLoggedIn = !!localStorage.getItem("accessToken");

  const billingInterval = selectedCycle === "yearly" 
    ? (lang === "hi" ? "/वर्ष" : "/year") 
    : (lang === "hi" ? "/महीना" : "/month");

  const selectPlanMutation = useMutation({
    mutationFn: async (planCode: string) => {
      const tenantId = localStorage.getItem("tenantId");
      const res = await apiRequest("POST", "/api/subscription/select", {
        tenantId,
        planCode,
      });
      return res.json();
    },
    onSuccess: (data, planCode) => {
      const tier = planCode.replace("india_", "");
      localStorage.setItem("subscriptionTier", tier);
      queryClient.invalidateQueries({ queryKey: ["/api/auth"] });
      toast({ title: lang === "hi" ? "प्लान अपडेट हुआ" : "Plan updated", description: lang === "hi" ? "आपकी सदस्यता अपडेट हो गई।" : "Your subscription has been updated." });
      setLocation("/dashboard");
    },
    onError: (error: Error) => {
      toast({ title: lang === "hi" ? "प्लान अपडेट विफल" : "Failed to update plan", description: error.message, variant: "destructive" });
    },
  });

  const handleSelectPlan = (plan: PricingPlan) => {
    if (!isLoggedIn) {
      setLocation("/register");
      return;
    }
    if (plan.tier === currentTier) {
      return;
    }
    selectPlanMutation.mutate(plan.code);
  };

  const tierIcons: Record<string, React.ReactNode> = {
    free: <Zap className="h-5 w-5" />,
    basic: <Star className="h-5 w-5" />,
    pro: <Sparkles className="h-5 w-5" />,
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
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
            <LanguageToggle lang={lang} onChange={setLang} />
            <ThemeToggle />
            {!isLoggedIn && (
              <Button asChild data-testid="button-login">
                <Link href="/login">{lang === "hi" ? "लॉगिन" : "Log in"}</Link>
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold mb-4" data-testid="text-pricing-title">
            {lang === "hi" ? "सरल, पारदर्शी कीमतें" : "Simple, transparent pricing"}
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-6" data-testid="text-pricing-subtitle">
            {lang === "hi" ? "मुफ्त में शुरू करें। जब जरूरत हो तब अपग्रेड करें। कभी भी रद्द करें।" : "Start free. Upgrade only when you need to. Cancel anytime."}
          </p>

          <div className="flex items-center justify-center gap-2 mb-6" data-testid="billing-cycle-toggle">
            <Button
              variant={selectedCycle === "monthly" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCycle("monthly")}
              data-testid="button-cycle-monthly"
            >
              {lang === "hi" ? CYCLE_LABELS.monthly.hi : CYCLE_LABELS.monthly.en}
            </Button>
            <Button
              variant={selectedCycle === "yearly" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCycle("yearly")}
              className="relative"
              data-testid="button-cycle-yearly"
            >
              {lang === "hi" ? CYCLE_LABELS.yearly.hi : CYCLE_LABELS.yearly.en}
              {selectedCycle !== "yearly" && (
                <Badge variant="secondary" className="absolute -top-2 -right-2 text-xs bg-green-500 text-white">
                  {savingsBadgeText(lang as Lang, 20)}
                </Badge>
              )}
            </Button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-16">
          {INDIA_PLANS.map((plan) => (
            <Card 
              key={plan.id} 
              className={cn(
                "relative flex flex-col",
                plan.isPopular && "border-primary shadow-lg scale-105 z-10"
              )}
              data-testid={`card-plan-${plan.tier}`}
            >
              {plan.isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground">{t("popular")}</Badge>
                </div>
              )}
              <CardHeader className="text-center pb-2">
                <div className="flex justify-center mb-2">
                  <div className={cn(
                    "p-3 rounded-full",
                    plan.tier === "free" ? "bg-muted" :
                    plan.tier === "basic" ? "bg-blue-100 dark:bg-blue-900" :
                    "bg-purple-100 dark:bg-purple-900"
                  )}>
                    {tierIcons[plan.tier]}
                  </div>
                </div>
                <CardTitle className="text-xl" data-testid={`text-plan-name-${plan.tier}`}>{plan.name}</CardTitle>
                <CardDescription data-testid={`text-plan-desc-${plan.tier}`}>{plan.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 pb-4">
                <div className="text-center mb-6">
                  <span className="text-4xl font-bold" data-testid={`text-plan-price-${plan.tier}`}>
                    {formatPriceOrFree(plan.price, plan.currencyCode || plan.currency)}
                  </span>
                  {parseFloat(plan.price) > 0 && (
                    <span className="text-muted-foreground">{billingInterval}</span>
                  )}
                </div>

                <ul className="space-y-3">
                  <li className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4 text-primary" />
                    <span data-testid={`text-plan-users-${plan.tier}`}>
                      {plan.maxUsers === -1 
                        ? (lang === "hi" ? "अनलिमिटेड टीम सदस्य" : "Unlimited team members")
                        : (lang === "hi" ? `${plan.maxUsers} टीम सदस्य तक` : `Up to ${plan.maxUsers} team member${plan.maxUsers !== 1 ? "s" : ""}`)}
                    </span>
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <Database className="h-4 w-4 text-primary" />
                    <span data-testid={`text-plan-records-${plan.tier}`}>
                      {plan.maxRecords === -1 
                        ? (lang === "hi" ? "अनलिमिटेड रिकॉर्ड्स" : "Unlimited records")
                        : (lang === "hi" ? `${plan.maxRecords} रिकॉर्ड्स तक` : `Up to ${plan.maxRecords} records`)}
                    </span>
                  </li>
                  {Object.entries(plan.features).map(([key, enabled]) => {
                    if (key === "recordLimit" || key === "unlimitedRecords") return null;
                    const feature = FEATURE_LABELS[key];
                    if (!feature) return null;
                    return (
                      <li key={key} className="flex items-center gap-2 text-sm">
                        {enabled ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : (
                          <X className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className={!enabled ? "text-muted-foreground" : ""}>
                          {lang === "hi" ? feature.label.hi : feature.label.en}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </CardContent>
              <CardFooter>
                <Button 
                  className="w-full" 
                  variant={plan.isPopular ? "default" : "outline"}
                  disabled={plan.tier === currentTier || selectPlanMutation.isPending}
                  onClick={() => handleSelectPlan(plan)}
                  data-testid={`button-select-${plan.tier}`}
                >
                  {plan.tier === currentTier ? (
                    t("currentPlan")
                  ) : plan.tier === "free" ? (
                    t("startFree")
                  ) : (
                    <>
                      {lang === "hi" ? `${plan.name} लें` : `Get ${plan.name}`}
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">
            {lang === "hi" ? "प्लान तुलना करें" : "Compare plans"}
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full" data-testid="table-comparison">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-4 px-2 font-medium">{lang === "hi" ? "फीचर" : "Feature"}</th>
                  {INDIA_PLANS.map((plan) => (
                    <th key={plan.id} className="text-center py-4 px-4 font-medium">
                      {plan.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPARISON_FEATURES.map((feature) => (
                  <tr key={feature.key} className="border-b">
                    <td className="py-3 px-2 text-sm">{lang === "hi" ? feature.label.hi : feature.label.en}</td>
                    {INDIA_PLANS.map((plan) => {
                      let value: React.ReactNode;
                      if (feature.key === "maxUsers") {
                        value = plan.maxUsers === -1 ? (lang === "hi" ? "अनलिमिटेड" : "Unlimited") : plan.maxUsers;
                      } else if (feature.key === "maxRecords") {
                        value = plan.maxRecords === -1 ? (lang === "hi" ? "अनलिमिटेड" : "Unlimited") : plan.maxRecords;
                      } else {
                        const enabled = plan.features[feature.key];
                        value = enabled ? (
                          <Check className="h-5 w-5 text-green-600 mx-auto" />
                        ) : (
                          <X className="h-5 w-5 text-muted-foreground mx-auto" />
                        );
                      }
                      return (
                        <td key={plan.id} className="py-3 px-4 text-center text-sm">
                          {value}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="text-center mt-16 space-y-4">
          <p className="text-muted-foreground">
            {lang === "hi" 
              ? "सभी कीमतें भारतीय रुपए (INR) में हैं। GST सरकारी नियमों के अनुसार लागू।" 
              : "All prices are in Indian Rupees (INR). GST applicable as per government regulations."}
          </p>
          <div className="flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Check className="h-4 w-4 text-green-600" />
              {lang === "hi" ? "क्रेडिट कार्ड की जरूरत नहीं" : "No credit card required"}
            </span>
            <span className="flex items-center gap-1">
              <Check className="h-4 w-4 text-green-600" />
              {lang === "hi" ? "कभी भी रद्द करें" : "Cancel anytime"}
            </span>
            <span className="flex items-center gap-1">
              <Check className="h-4 w-4 text-green-600" />
              {lang === "hi" ? "सुरक्षित पेमेंट" : "Secure payments"}
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}
