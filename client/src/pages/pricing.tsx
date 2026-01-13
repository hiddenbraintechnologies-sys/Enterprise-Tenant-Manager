import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageSelector } from "@/components/language-selector";
import { useTranslation } from "react-i18next";
import { 
  Check, X, Zap, Star, Sparkles, ArrowLeft, ArrowRight,
  Users, Database
} from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { formatPriceOrFree } from "@/lib/formatPrice";
import { BILLING_STRINGS, t as tStr, savingsAmountBadge, yearlySavingsToggleLabel } from "@shared/billing/i18n";
import type { Lang } from "@shared/billing/i18n";
import { CYCLE_LABELS } from "@shared/billing/types";
import type { BillingCycleKey } from "@shared/billing/types";
import { getCurrencySymbol } from "@/lib/currency-service";

interface PlanCycle {
  key: BillingCycleKey;
  price: number;
  months: number;
  badge?: string;
  savings: { amount: number; percent: number };
  effectiveMonthlyPrice: number;
}

interface Plan {
  id: string;
  code: string;
  name: string;
  description: string | null;
  tier: string;
  basePrice: number;
  localPrice?: string;
  currency?: string;
  currencyCode?: string;
  maxUsers: number;
  maxCustomers?: number;
  featureFlags?: Record<string, boolean>;
  limits?: Record<string, number>;
  isRecommended?: boolean;
  cycles?: PlanCycle[];
  yearlySavingsAmount?: number;
}

interface PlansResponse {
  plans: Plan[];
  countryCode?: string;
  currencyCode?: string;
}

type FeatureKey = "basicAnalytics" | "advancedAnalytics" | "emailNotifications" | "smsNotifications" | "whatsappAutomation" | "gstFeatures" | "prioritySupport";

const FEATURE_I18N_KEYS: Record<FeatureKey, keyof typeof BILLING_STRINGS> = {
  basicAnalytics: "basicAnalytics",
  advancedAnalytics: "advancedAnalytics",
  emailNotifications: "emailNotifications",
  smsNotifications: "smsNotifications",
  whatsappAutomation: "whatsappAutomation",
  gstFeatures: "gstInvoicing",
  prioritySupport: "prioritySupport",
};

const COMPARISON_FEATURE_KEYS: Array<{ key: string; i18nKey: keyof typeof BILLING_STRINGS }> = [
  { key: "maxUsers", i18nKey: "teamMembers" },
  { key: "maxRecords", i18nKey: "records" },
  { key: "basicAnalytics", i18nKey: "basicAnalytics" },
  { key: "advancedAnalytics", i18nKey: "advancedAnalytics" },
  { key: "emailNotifications", i18nKey: "emailNotifications" },
  { key: "smsNotifications", i18nKey: "smsNotifications" },
  { key: "whatsappAutomation", i18nKey: "whatsappAutomation" },
  { key: "gstFeatures", i18nKey: "gstInvoicing" },
  { key: "prioritySupport", i18nKey: "prioritySupport" },
];

export default function PricingPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedCycle, setSelectedCycle] = useState<BillingCycleKey>("monthly");

  const tenantId = localStorage.getItem("tenantId");
  const { t: tBilling, i18n } = useTranslation();
  const lang = (i18n.language || "en") as Lang;
  const t = (key: string): string => tBilling(`billing.${key}`, { defaultValue: key });

  const currentTier = localStorage.getItem("subscriptionTier") || "free";
  const isLoggedIn = !!localStorage.getItem("accessToken");

  const billingInterval = selectedCycle === "yearly" ? t("perYear") : t("perMonth");

  const { data: plansData, isLoading } = useQuery<PlansResponse>({
    queryKey: ["/api/billing/plans-with-cycles"],
    retry: 2,
  });

  const plans = plansData?.plans || [];

  const getMaxYearlySavingsAmount = (): number => {
    if (!plans.length) return 189;
    const maxPlan = plans.reduce((max, p) => 
      (p.yearlySavingsAmount || 0) > (max?.yearlySavingsAmount || 0) ? p : max
    , plans[0]);
    return maxPlan?.yearlySavingsAmount || 189;
  };

  const getPlanCyclePrice = (plan: Plan): { price: number; savings: number } => {
    if (!plan.cycles?.length) {
      return { price: plan.basePrice, savings: 0 };
    }
    const cycle = plan.cycles.find(c => c.key === selectedCycle) || plan.cycles[0];
    const savingsAmount = cycle.key === "yearly" && plan.yearlySavingsAmount 
      ? plan.yearlySavingsAmount 
      : cycle.savings.amount;
    return { price: cycle.price, savings: savingsAmount };
  };

  const selectPlanMutation = useMutation({
    mutationFn: async (planCode: string) => {
      const tenantId = localStorage.getItem("tenantId");
      const res = await apiRequest("POST", "/api/subscription/select", {
        tenantId,
        planCode,
        billingCycle: selectedCycle,
      });
      return res.json();
    },
    onSuccess: (data, planCode) => {
      const tier = planCode.replace("india_", "");
      localStorage.setItem("subscriptionTier", tier);
      queryClient.invalidateQueries({ queryKey: ["/api/auth"] });
      toast({ title: t("planUpdated"), description: t("planUpdatedDesc") });
      setLocation("/dashboard");
    },
    onError: (error: Error) => {
      toast({ title: t("planUpdateFailed"), description: error.message, variant: "destructive" });
    },
  });

  const handleSelectPlan = (plan: Plan) => {
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

  const getTeamMembersText = (maxUsers: number): string => {
    if (maxUsers === -1) return t("unlimitedTeamMembers");
    return `${maxUsers} ${t("teamMembers")}`;
  };

  const getRecordsText = (plan: Plan): string => {
    const maxRecords = plan.limits?.records ?? -1;
    if (maxRecords === -1) return t("unlimitedRecords");
    return `${maxRecords} ${t("records")}`;
  };

  const getFeatureEnabled = (plan: Plan, key: string): boolean => {
    const featureFlags = plan.featureFlags || {};
    const snakeCaseKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
    return featureFlags[key] || featureFlags[snakeCaseKey] || false;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-4">
            <h1 className="text-xl font-bold">MyBizStream</h1>
            <div className="flex items-center gap-3">
              <ThemeToggle />
            </div>
          </div>
        </header>
        <main className="container mx-auto px-4 py-12">
          <div className="text-center mb-12">
            <Skeleton className="h-10 w-64 mx-auto mb-4" />
            <Skeleton className="h-6 w-96 mx-auto" />
          </div>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="flex flex-col">
                <CardHeader>
                  <Skeleton className="h-12 w-12 rounded-full mx-auto mb-2" />
                  <Skeleton className="h-6 w-24 mx-auto" />
                  <Skeleton className="h-4 w-32 mx-auto" />
                </CardHeader>
                <CardContent className="flex-1">
                  <Skeleton className="h-10 w-20 mx-auto mb-6" />
                  <div className="space-y-3">
                    {[1, 2, 3, 4, 5].map((j) => (
                      <Skeleton key={j} className="h-5 w-full" />
                    ))}
                  </div>
                </CardContent>
                <CardFooter>
                  <Skeleton className="h-10 w-full" />
                </CardFooter>
              </Card>
            ))}
          </div>
        </main>
      </div>
    );
  }

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
            <LanguageSelector tenantId={tenantId || undefined} />
            <ThemeToggle />
            {!isLoggedIn && (
              <Button asChild data-testid="button-login">
                <Link href="/login">{t("login")}</Link>
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold mb-4" data-testid="text-pricing-title">
            {t("pricingTitle")}
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-6" data-testid="text-pricing-subtitle">
            {t("pricingSubtitle")}
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
              {selectedCycle !== "yearly" 
                ? yearlySavingsToggleLabel(lang as Lang, getMaxYearlySavingsAmount(), getCurrencySymbol("INR"))
                : (lang === "hi" ? CYCLE_LABELS.yearly.hi : CYCLE_LABELS.yearly.en)
              }
            </Button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-16">
          {plans.map((plan) => {
            const { price, savings } = getPlanCyclePrice(plan);
            const currSymbol = getCurrencySymbol(plan.currencyCode || "INR");
            
            return (
              <Card 
                key={plan.id} 
                className={cn(
                  "relative flex flex-col",
                  plan.isRecommended && "border-primary shadow-lg scale-105 z-10"
                )}
                data-testid={`card-plan-${plan.tier}`}
              >
                {plan.isRecommended && (
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
                      {formatPriceOrFree(String(price), plan.currencyCode || "INR")}
                    </span>
                    {price > 0 && (
                      <span className="text-muted-foreground">{billingInterval}</span>
                    )}
                    {selectedCycle === "yearly" && savings > 0 && (
                      <div className="mt-2">
                        <Badge variant="secondary" className="text-green-600" data-testid={`badge-savings-${plan.tier}`}>
                          {savingsAmountBadge(lang, savings, currSymbol)}
                        </Badge>
                      </div>
                    )}
                  </div>

                  <ul className="space-y-3">
                    <li className="flex items-center gap-2 text-sm">
                      <Users className="h-4 w-4 text-primary" />
                      <span data-testid={`text-plan-users-${plan.tier}`}>
                        {getTeamMembersText(plan.maxUsers)}
                      </span>
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <Database className="h-4 w-4 text-primary" />
                      <span data-testid={`text-plan-records-${plan.tier}`}>
                        {getRecordsText(plan)}
                      </span>
                    </li>
                    {(["basicAnalytics", "advancedAnalytics", "emailNotifications", "smsNotifications", "whatsappAutomation", "gstFeatures", "prioritySupport"] as FeatureKey[]).map((key) => {
                      const enabled = getFeatureEnabled(plan, key);
                      const i18nKey = FEATURE_I18N_KEYS[key];
                      return (
                        <li key={key} className="flex items-center gap-2 text-sm">
                          {enabled ? (
                            <Check className="h-4 w-4 text-green-600" />
                          ) : (
                            <X className="h-4 w-4 text-muted-foreground" />
                          )}
                          <span className={!enabled ? "text-muted-foreground" : ""}>
                            {t(i18nKey)}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button 
                    className="w-full" 
                    variant={plan.isRecommended ? "default" : "outline"}
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
                        {t("getPlan")} {plan.name}
                        <ArrowRight className="h-4 w-4 ml-1" />
                      </>
                    )}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>

        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">
            {t("comparePlans")}
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full" data-testid="table-comparison">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-4 px-2 font-medium">{t("feature")}</th>
                  {plans.map((plan) => (
                    <th key={plan.id} className="text-center py-4 px-4 font-medium">
                      {plan.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPARISON_FEATURE_KEYS.map((feature) => (
                  <tr key={feature.key} className="border-b">
                    <td className="py-3 px-2 text-sm">{t(feature.i18nKey)}</td>
                    {plans.map((plan) => {
                      let value: React.ReactNode;
                      if (feature.key === "maxUsers") {
                        value = plan.maxUsers === -1 ? t("unlimited") : plan.maxUsers;
                      } else if (feature.key === "maxRecords") {
                        const records = plan.limits?.records ?? -1;
                        value = records === -1 ? t("unlimited") : records;
                      } else {
                        const enabled = getFeatureEnabled(plan, feature.key);
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
            {t("allPricesInrWithGst")}
          </p>
          <div className="flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Check className="h-4 w-4 text-green-600" />
              {t("noCreditCardRequired")}
            </span>
            <span className="flex items-center gap-1">
              <Check className="h-4 w-4 text-green-600" />
              {t("cancelAnytime")}
            </span>
            <span className="flex items-center gap-1">
              <Check className="h-4 w-4 text-green-600" />
              {t("securePayments")}
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}
