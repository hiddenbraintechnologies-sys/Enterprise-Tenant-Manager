import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "@/components/theme-toggle";
import { 
  Check, X, Zap, Star, Sparkles, ArrowRight, Loader2,
  Users, Database, MessageCircle, FileText, Headphones, AlertTriangle, RefreshCw,
  ArrowUp, ArrowDown, Clock, XCircle, CreditCard
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { formatPriceOrFree } from "@/lib/formatPrice";
import {
  FEATURE_CATALOG,
  LIMIT_CATALOG,
  type FeatureCatalogItem,
  type LimitCatalogItem,
} from "@shared/billing/feature-catalog";
import { DowngradeConfirmModal } from "@/components/downgrade-confirm-modal";
import { UpgradeConfirmModal } from "@/components/upgrade-confirm-modal";
import { LanguageToggle } from "@/components/language-toggle";
import { useTenantLanguage } from "@/hooks/use-tenant-language";
import { getGainedFeatures, getIncreasedLimits, getLostFeatures, getReducedLimits } from "@shared/billing/language-helpers";
import type { BillingCycleKey } from "@shared/billing/types";
import { CYCLE_LABELS } from "@shared/billing/types";
import { 
  BILLING_STRINGS, 
  savingsAmountBadge,
  yearlySavingsToggleLabel,
  downgradeBannerText, 
  t as tStr,
  getFeatureLabel,
  getLimitChangeText,
  getLimitText,
  formatDateLocalized 
} from "@shared/billing/i18n";
import { getCurrencySymbol } from "@/lib/currency-service";
import type { Lang } from "@shared/billing/i18n";

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
  billingCycle?: string;
  maxUsers: number;
  maxCustomers: number;
  featureFlags?: Record<string, boolean>;
  limits?: Record<string, number>;
  isRecommended?: boolean;
  cycles?: PlanCycle[];
  yearlySavingsAmount?: number;
  features?: {
    modules?: string[];
    addons?: string[];
    multiCurrency?: boolean;
    aiInsights?: boolean;
    whiteLabel?: boolean;
  };
}

interface PlansResponse {
  plans: Plan[];
  countryCode?: string;
  currencyCode?: string;
}

function getPlanFeatures(plan: Plan, lang: Lang): { included: string[]; excluded: string[] } {
  const included: string[] = [];
  const excluded: string[] = [];
  
  const featureFlags = plan.featureFlags || {};
  const limits = plan.limits || {};
  
  LIMIT_CATALOG.forEach((limitItem: LimitCatalogItem) => {
    const value = limits[limitItem.key];
    if (value === undefined) {
      if (limitItem.key === "users" && plan.maxUsers) {
        included.push(getLimitText(lang, limitItem.key, plan.maxUsers));
      } else if (limitItem.key === "customers" && plan.maxCustomers) {
        included.push(getLimitText(lang, limitItem.key, plan.maxCustomers));
      }
      return;
    }
    
    if (value === -1) {
      included.push(getLimitText(lang, limitItem.key, value));
    } else if (value === 0) {
      // Skip limits set to 0 - not included in plan
    } else {
      included.push(getLimitText(lang, limitItem.key, value));
    }
  });
  
  FEATURE_CATALOG.forEach((feature: FeatureCatalogItem) => {
    if (feature.key === "record_limit" || feature.key === "unlimited_records") return;
    
    const flagValue = featureFlags[feature.key];
    if (flagValue === true) {
      included.push(getFeatureLabel(lang, feature.key));
    } else if (flagValue === false) {
      excluded.push(getFeatureLabel(lang, feature.key));
    }
  });
  
  return { included, excluded };
}


interface SubscriptionPlanDetails {
  id: string;
  tier: string;
  name: string;
  basePrice: string;
  featureFlags?: Record<string, boolean>;
  limits?: Record<string, number>;
  maxUsers?: number;
  maxCustomers?: number;
}

interface SubscriptionData {
  subscription: { id: string; status: string; pendingPlanId?: string; pendingPaymentId?: string; cancelAtPeriodEnd?: boolean } | null;
  plan: SubscriptionPlanDetails | null;
  pendingPlan?: SubscriptionPlanDetails | null;
  status: string;
  planCode: string | null;
  isActive: boolean;
  isDowngrading?: boolean;
  isPendingPayment?: boolean;
  currentPeriodEnd?: string;
  pendingPlanId?: string;
  pendingPaymentId?: string;
  cancelAtPeriodEnd?: boolean;
  message?: string;
  tenantId?: string;
  canSelectPlan?: boolean;
}

const DASHBOARD_ROUTES: Record<string, string> = {
  clinic: "/dashboard/clinic",
  salon: "/dashboard/salon",
  pg: "/dashboard/pg",
  coworking: "/dashboard/coworking",
  service: "/dashboard/service",
  real_estate: "/dashboard/real-estate",
  tourism: "/dashboard/tourism",
  education: "/dashboard/education",
  logistics: "/dashboard/logistics",
  legal: "/dashboard/legal",
  furniture_manufacturing: "/dashboard/furniture",
  software_services: "/dashboard/software-services",
  consulting: "/dashboard/consulting",
};

export default function PackagesPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [showDowngradeModal, setShowDowngradeModal] = useState(false);
  const [pendingDowngradePlan, setPendingDowngradePlan] = useState<Plan | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [pendingUpgradePlan, setPendingUpgradePlan] = useState<Plan | null>(null);
  const [showCancelUpgradeModal, setShowCancelUpgradeModal] = useState(false);
  const [selectedCycle, setSelectedCycle] = useState<BillingCycleKey>("monthly");
  const { tenant, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const queryClient = useQueryClient();

  const tenantId = tenant?.id || localStorage.getItem("tenantId");
  const { lang, setLang } = useTenantLanguage(tenantId || undefined);
  
  // Fetch subscription when user is authenticated and auth is not loading
  // This prevents using stale tokens from previous sessions
  const canFetchSubscription = isAuthenticated && !isAuthLoading;
  
  // Clear stale subscription cache on mount to avoid cached 401 errors
  useEffect(() => {
    if (canFetchSubscription) {
      queryClient.invalidateQueries({ queryKey: ["/api/billing/subscription"] });
    }
  }, [canFetchSubscription, queryClient]);
  
  // Use custom queryFn that returns null on 401 instead of throwing
  // This handles the case where user is authenticated but server returns 401 for some reason
  const { 
    data: subscriptionData, 
    isLoading: isLoadingSubscription, 
    isError: isSubscriptionError, 
    error: subscriptionError,
    refetch: refetchSubscription, 
    isSuccess: isSubscriptionSuccess 
  } = useQuery<SubscriptionData | null>({
    queryKey: ["/api/billing/subscription"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: canFetchSubscription,
    staleTime: 10000,
    retry: 2,
  });

  // Determine if this is a real error vs expected onboarding states
  // NO_TENANT and NO_SUBSCRIPTION are valid onboarding states, not errors
  // null from 401 is also treated as onboarding state (user can select plan)
  const isOnboardingState = subscriptionData === null || ["NO_TENANT", "NO_SUBSCRIPTION", "NONE"].includes(subscriptionData?.status || "");
  const hasRealSubscriptionError = isSubscriptionError && !isOnboardingState;

  const { data: plansData, isLoading, isError: isPlansError, refetch: refetchPlans } = useQuery<PlansResponse>({
    queryKey: ["/api/billing/plans-with-cycles"],
    retry: 2,
  });

  // Redirect to dashboard if already has active subscription
  // Only redirect after subscription query has succeeded and we have valid data
  useEffect(() => {
    // Don't redirect while still loading subscription data
    if (isLoadingSubscription || !isSubscriptionSuccess) {
      return;
    }
    // Only redirect if subscription is confirmed active and we have a valid business type
    if (subscriptionData?.isActive === true && tenant?.businessType) {
      const dashboardRoute = DASHBOARD_ROUTES[tenant.businessType] || "/dashboard/service";
      setLocation(dashboardRoute);
    }
  }, [subscriptionData, tenant, setLocation, isLoadingSubscription, isSubscriptionSuccess]);

  // Use refetch directly - invalidation happens automatically with staleTime
  const handleRetrySubscription = () => {
    refetchSubscription();
  };

  const handleRetryPlans = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/billing/plans-with-cycles"] });
    refetchPlans();
  };

  // Show guidance when subscription check completed but no active subscription
  // This includes NO_TENANT, NO_SUBSCRIPTION, NONE states, and 401 (null) response
  const showNoSubscriptionPrompt = !isLoadingSubscription && (isSubscriptionSuccess || subscriptionData === null) && !subscriptionData?.isActive;

  const selectPlanMutation = useMutation({
    mutationFn: async (planCode: string) => {
      const response = await apiRequest("POST", "/api/billing/select-plan", { planCode });
      return response.json();
    },
    onSuccess: async (data) => {
      // Handle case where user needs to create tenant first
      if (data.requiresTenantSetup) {
        localStorage.setItem("pendingPlanCode", data.pendingPlanCode || "");
        toast({ title: tStr(lang as Lang, "businessSetupRequired"), description: tStr(lang as Lang, "completeBusinessDetails") });
        setLocation(data.redirectUrl || "/tenant-signup");
        return;
      }
      
      if (data.requiresPayment) {
        localStorage.setItem("pendingPaymentId", data.payment?.id || "");
        localStorage.setItem("pendingPlanCode", data.plan?.code || "");
        toast({ title: tStr(lang as Lang, "planSelectedTitle"), description: tStr(lang as Lang, "planSelectedDesc") });
        setLocation("/checkout");
      } else if (data.success) {
        localStorage.setItem("subscriptionStatus", "active");
        localStorage.setItem("subscriptionTier", data.plan?.tier || "free");
        
        // Refresh auth data to get updated tenant info
        await queryClient.invalidateQueries({ queryKey: ["/api/auth"] });
        
        // Wait for subscription query to reflect active status before navigating
        await queryClient.invalidateQueries({ queryKey: ["/api/billing/subscription"] });
        
        // Refetch and wait for the data to be active
        const result = await refetchSubscription();
        
        toast({ title: tStr(lang as Lang, "planActivated"), description: `${data.plan?.name || tStr(lang as Lang, "planNameFree")} ${tStr(lang as Lang, "planIsNowActive")}` });
        
        // Navigate to business-type-specific dashboard
        const businessType = tenant?.businessType || "service";
        const dashboardRoute = DASHBOARD_ROUTES[businessType] || "/dashboard/service";
        
        // Only navigate once we confirm subscription is active
        if (result.data?.isActive) {
          setLocation(dashboardRoute);
        } else {
          // If not active yet, set a flag and let the useEffect handle redirect once active
          localStorage.setItem("subscriptionJustActivated", "true");
          // Still navigate - the subscription should be active
          setLocation(dashboardRoute);
        }
      }
    },
    onError: (error: Error) => {
      toast({ title: tStr(lang as Lang, "errorTitle"), description: error.message, variant: "destructive" });
      setSelectedPlan(null);
    },
  });

  const handleSelectPlan = (planCode: string) => {
    if (!isAuthenticated) {
      toast({ title: tStr(lang as Lang, "pleaseLogIn"), description: tStr(lang as Lang, "needToLogInSelect"), variant: "destructive" });
      setLocation("/login");
      return;
    }
    
    // Backend will create tenant if needed during plan selection
    setSelectedPlan(planCode);
    selectPlanMutation.mutate(planCode);
  };

  const changeSubscriptionMutation = useMutation({
    mutationFn: async ({ planId, action, billingCycle }: { planId: string; action: "upgrade" | "downgrade"; billingCycle?: BillingCycleKey }) => {
      const response = await apiRequest("POST", "/api/billing/subscription/change", { planId, action, billingCycle: billingCycle || selectedCycle });
      return response.json();
    },
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: ["/api/billing/subscription"] });
      
      if (data.requiresPayment) {
        toast({ title: tStr(lang as Lang, "upgradeInitiated"), description: tStr(lang as Lang, "proceedToPayment") });
        setLocation("/checkout");
      } else if (data.effectiveAt) {
        const effectiveDate = formatDateLocalized(lang as Lang, data.effectiveAt);
        const targetPlanName = pendingDowngradePlan?.name || "";
        toast({ 
          title: tStr(lang as Lang, "downgradeScheduled"), 
          description: downgradeBannerText(lang as Lang, targetPlanName, effectiveDate)
        });
        setShowDowngradeModal(false);
        setPendingDowngradePlan(null);
      } else {
        toast({ title: tStr(lang as Lang, "planChanged"), description: tStr(lang as Lang, "subscriptionUpdated") });
      }
      setSelectedPlan(null);
    },
    onError: (error: Error) => {
      toast({ title: tStr(lang as Lang, "errorTitle"), description: error.message, variant: "destructive" });
      setSelectedPlan(null);
      setShowDowngradeModal(false);
    },
  });

  const cancelDowngradeMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/billing/subscription/cancel-downgrade", {});
      return response.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/billing/subscription"] });
      toast({ title: tStr(lang as Lang, "downgradeCancelledTitle"), description: tStr(lang as Lang, "downgradeCancelledDesc") });
    },
    onError: (error: Error) => {
      toast({ title: tStr(lang as Lang, "errorTitle"), description: error.message, variant: "destructive" });
    },
  });

  const cancelUpgradeMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/billing/subscription/cancel-pending-upgrade", {});
      return response.json();
    },
    onSuccess: async () => {
      setShowCancelUpgradeModal(false);
      await queryClient.invalidateQueries({ queryKey: ["/api/billing/subscription"] });
      toast({ title: tStr(lang as Lang, "upgradeCancelledTitle"), description: tStr(lang as Lang, "upgradeCancelledDesc") });
    },
    onError: (error: Error) => {
      toast({ title: tStr(lang as Lang, "errorTitle"), description: error.message, variant: "destructive" });
    },
  });

  const handleUpgrade = (plan: Plan) => {
    if (!isAuthenticated) {
      toast({ title: tStr(lang as Lang, "pleaseLogIn"), description: tStr(lang as Lang, "needToLogInUpgrade"), variant: "destructive" });
      return;
    }
    
    const isPaidPlan = plan.basePrice > 0 || plan.tier !== "free";
    
    if (isPaidPlan) {
      setPendingUpgradePlan(plan);
      setShowUpgradeModal(true);
    } else {
      setSelectedPlan(plan.id);
      changeSubscriptionMutation.mutate({ planId: plan.id, action: "upgrade" });
    }
  };

  const confirmUpgrade = () => {
    if (!pendingUpgradePlan) return;
    setSelectedPlan(pendingUpgradePlan.id);
    setShowUpgradeModal(false);
    changeSubscriptionMutation.mutate({ planId: pendingUpgradePlan.id, action: "upgrade", billingCycle: selectedCycle });
  };

  const getPlanCyclePrice = (plan: Plan): { price: number; cycle: PlanCycle | null; savingsBadge?: string } => {
    if (!plan.cycles || plan.cycles.length === 0) {
      return { price: plan.basePrice, cycle: null };
    }
    const cycle = plan.cycles.find(c => c.key === selectedCycle) || plan.cycles[0];
    const savingsAmount = cycle.key === "yearly" && plan.yearlySavingsAmount 
      ? plan.yearlySavingsAmount 
      : cycle.savings.amount;
    const currSymbol = getCurrencySymbol(plan.currencyCode || "INR");
    return { 
      price: cycle.price, 
      cycle,
      savingsBadge: savingsAmount > 0 ? savingsAmountBadge(lang as Lang, savingsAmount, currSymbol) : undefined
    };
  };

  const getMaxYearlySavingsInfo = (): { amount: number; currencySymbol: string } => {
    const plans = plansData?.plans || [];
    const paidPlans = plans.filter(p => p.basePrice > 0);
    if (paidPlans.length === 0) return { amount: 0, currencySymbol: "₹" };
    
    const maxPlan = paidPlans.reduce((max, p) => 
      (p.yearlySavingsAmount || 0) > (max?.yearlySavingsAmount || 0) ? p : max
    , paidPlans[0]);
    
    return { 
      amount: maxPlan?.yearlySavingsAmount || 0, 
      currencySymbol: getCurrencySymbol(maxPlan?.currencyCode || "INR")
    };
  };

  const t = (key: keyof typeof BILLING_STRINGS): string => tStr(lang as Lang, key);
  const billingInterval = selectedCycle === "yearly" ? t("perYear") : t("perMonth");
  const maxYearlySavingsInfo = getMaxYearlySavingsInfo();

  const getComputedBenefits = (currentPlan: Plan | null, targetPlan: Plan): { label: string; description?: string }[] => {
    const benefits: { label: string; description?: string }[] = [];
    const currentFlags = currentPlan?.featureFlags || {};
    const targetFlags = targetPlan.featureFlags || {};
    const currentLimits = currentPlan?.limits || {};
    const targetLimits = targetPlan.limits || {};
    
    FEATURE_CATALOG.forEach((feature) => {
      if (feature.key === "record_limit" || feature.key === "unlimited_records") return;
      if (targetFlags[feature.key] === true && currentFlags[feature.key] !== true) {
        benefits.push({ label: getFeatureLabel(lang as Lang, feature.key) });
      }
    });
    
    const currentUsers = currentLimits.users ?? currentPlan?.maxUsers ?? 1;
    const targetUsers = targetLimits.users ?? targetPlan.maxUsers;
    if (targetUsers > currentUsers || targetUsers === -1) {
      benefits.push({ label: getLimitChangeText(lang as Lang, "users", currentUsers, targetUsers) });
    }
    
    const currentRecords = currentLimits.records ?? 50;
    const targetRecords = targetLimits.records ?? 50;
    if (targetRecords > currentRecords || targetRecords === -1) {
      benefits.push({ label: getLimitChangeText(lang as Lang, "records", currentRecords, targetRecords) });
    }
    
    return benefits;
  };

  const getNewBenefits = (currentPlan: Plan | null, targetPlan: Plan): { label: string; description?: string }[] => {
    const computedGains = getComputedBenefits(currentPlan, targetPlan);
    
    if (computedGains.length >= 2) {
      return computedGains.slice(0, 5);
    }
    
    return [];
  };

  const handleDowngrade = (plan: Plan) => {
    if (!isAuthenticated) {
      toast({ title: tStr(lang as Lang, "pleaseLogIn"), description: tStr(lang as Lang, "needToLogInDowngrade"), variant: "destructive" });
      return;
    }
    setPendingDowngradePlan(plan);
    setShowDowngradeModal(true);
  };

  const confirmDowngrade = () => {
    if (!pendingDowngradePlan) return;
    setSelectedPlan(pendingDowngradePlan.id);
    changeSubscriptionMutation.mutate({ planId: pendingDowngradePlan.id, action: "downgrade" });
  };

  const currentPlanPrice = subscriptionData?.plan?.basePrice ? parseFloat(subscriptionData.plan.basePrice) : 0;
  const currentPlanTier = subscriptionData?.plan?.tier || null;

  const getPlanAction = (plan: Plan): "current" | "upgrade" | "downgrade" | "select" => {
    if (!subscriptionData?.isActive) return "select";
    if (plan.id === subscriptionData?.plan?.id) return "current";
    
    const planPrice = plan.basePrice;
    if (planPrice > currentPlanPrice) return "upgrade";
    if (planPrice < currentPlanPrice) return "downgrade";
    return "current";
  };

  const tierIcons: Record<string, React.ReactNode> = {
    free: <Zap className="h-5 w-5" />,
    basic: <Star className="h-5 w-5" />,
    pro: <Sparkles className="h-5 w-5" />,
  };

  const tierColors: Record<string, string> = {
    free: "bg-muted",
    basic: "bg-blue-100 dark:bg-blue-900",
    pro: "bg-purple-100 dark:bg-purple-900",
  };

  const displayPlans = plansData?.plans || [];

  // 🔑 EARLY RETURN: Show loading state while waiting for subscription check
  // This applies when user is authenticated but we're still checking subscription status
  if (isLoadingSubscription && !subscriptionData) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <h1 className="text-xl font-bold" data-testid="text-packages-logo">MyBizStream</h1>
            <ThemeToggle />
          </div>
        </header>
        <main className="container mx-auto px-4 py-12">
          <div className="flex flex-col items-center justify-center py-24" data-testid="loading-workspace">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent mb-4" />
            <h2 className="text-xl font-semibold mb-2">{t("settingUpWorkspace")}</h2>
            <p className="text-muted-foreground">{t("justAMoment")}</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <h1 className="text-xl font-bold" data-testid="text-packages-logo">MyBizStream</h1>
          <div className="flex items-center gap-3">
            <LanguageToggle lang={lang} onChange={setLang} />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold mb-4" data-testid="text-packages-title">
            {t("pageTitle")}
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-6" data-testid="text-packages-subtitle">
            {t("pageSubtitle")}
          </p>
          
          <div className="flex items-center justify-center gap-2" data-testid="billing-cycle-toggle">
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
                ? yearlySavingsToggleLabel(lang as Lang, maxYearlySavingsInfo.amount, maxYearlySavingsInfo.currencySymbol)
                : (lang === "hi" ? CYCLE_LABELS.yearly.hi : CYCLE_LABELS.yearly.en)
              }
            </Button>
          </div>
        </div>

        {/* Only show real subscription errors AFTER tenant is resolved */}
        {hasRealSubscriptionError && canFetchSubscription && (
          <Alert variant="destructive" className="max-w-md mx-auto mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>{t("errorLoadingSubscription")}</span>
              <Button variant="outline" size="sm" onClick={handleRetrySubscription} data-testid="button-retry-subscription">
                <RefreshCw className="h-4 w-4 mr-1" />
                {t("retry")}
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {isPlansError && (
          <Alert variant="destructive" className="max-w-md mx-auto mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>{t("errorLoadingPlans")}</span>
              <Button variant="outline" size="sm" onClick={handleRetryPlans} data-testid="button-retry-plans">
                <RefreshCw className="h-4 w-4 mr-1" />
                {t("retry")}
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Status: DOWNGRADING - show scheduled downgrade banner */}
        {subscriptionData?.isDowngrading && subscriptionData?.pendingPlan && (
          <Alert className="max-w-2xl mx-auto mb-6 border-orange-500/50 bg-orange-50 dark:bg-orange-900/20">
            <ArrowDown className="h-4 w-4 text-orange-600" />
            <AlertDescription>
              <div className="flex flex-col gap-3">
                <div>
                  <span className="font-medium text-orange-700 dark:text-orange-300">
                    {t("downgradeBannerTitle")}
                  </span>
                  <span className="block text-sm text-muted-foreground mt-1">
                    {downgradeBannerText(
                      lang as Lang,
                      subscriptionData.pendingPlan.name,
                      subscriptionData.currentPeriodEnd 
                        ? formatDateLocalized(lang as Lang, subscriptionData.currentPeriodEnd)
                        : t("effectiveOn")
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="text-orange-700 hover:text-orange-800 hover:bg-orange-100 dark:text-orange-300 dark:hover:bg-orange-900/40"
                    onClick={() => {
                      const plansSection = document.getElementById("plans-section");
                      plansSection?.scrollIntoView({ behavior: "smooth" });
                    }}
                    data-testid="button-change-downgrade-plan"
                  >
                    {t("changeDowngradePlan")}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => cancelDowngradeMutation.mutate()}
                    disabled={cancelDowngradeMutation.isPending}
                    data-testid="button-cancel-downgrade"
                  >
                    {cancelDowngradeMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      t("cancelDowngrade")
                    )}
                  </Button>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Status: ACTIVE - show current plan with dashboard link */}
        {subscriptionData?.isActive && !subscriptionData?.isDowngrading && (
          <Alert className="max-w-md mx-auto mb-6 border-green-500/50 bg-green-50 dark:bg-green-900/20">
            <AlertDescription className="flex items-center justify-between">
              <div>
                <span className="font-medium text-green-700 dark:text-green-300">
                  {t("currentPlan")}: {subscriptionData?.plan?.name || "Active"}
                </span>
                <span className="block text-sm text-muted-foreground mt-1">
                  {t("subscriptionActive")}
                </span>
              </div>
              <Link href={DASHBOARD_ROUTES[tenant?.businessType || "service"] || "/dashboard/service"}>
                <Button variant="outline" size="sm" data-testid="button-go-to-dashboard">
                  {t("goToDashboard")}
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </AlertDescription>
          </Alert>
        )}

        {/* Status: PENDING_PAYMENT - show payment required message */}
        {(subscriptionData?.isPendingPayment || subscriptionData?.status?.toLowerCase() === "pending_payment") && (
          <Alert className="max-w-md mx-auto mb-6 border-yellow-500/50 bg-yellow-50 dark:bg-yellow-900/20">
            <CreditCard className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="flex flex-col gap-3">
              <div>
                <span className="font-medium text-yellow-700 dark:text-yellow-300">
                  {t("upgradePendingFor")} {subscriptionData?.pendingPlan?.name || t("upgrade")}
                </span>
                <span className="block text-sm text-muted-foreground mt-1">
                  {t("completePaymentToActivate")}
                </span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Link href={subscriptionData?.pendingPaymentId ? `/checkout?paymentId=${subscriptionData.pendingPaymentId}` : "/checkout"}>
                  <Button variant="default" size="sm" data-testid="button-continue-checkout">
                    {t("continuePayment")}
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </Link>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setShowCancelUpgradeModal(true)}
                  data-testid="button-cancel-upgrade"
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  {t("cancelUpgrade")}
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Status: NONE - show choose plan prompt */}
        {showNoSubscriptionPrompt && !subscriptionData?.isActive && subscriptionData?.status?.toLowerCase() !== "pending_payment" && (
          <Alert className="max-w-md mx-auto mb-6 border-primary/50 bg-primary/5">
            <AlertDescription className="text-center">
              <span className="font-medium">{t("chooseToGetStarted")}</span>
              <span className="block text-sm text-muted-foreground mt-1">
                {t("selectFreeOrPaid")}
              </span>
            </AlertDescription>
          </Alert>
        )}

        {(isLoading || isLoadingSubscription) ? (
          <div id="plans-section" className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-12 w-12 rounded-full mx-auto" />
                  <Skeleton className="h-6 w-24 mx-auto mt-4" />
                  <Skeleton className="h-4 w-32 mx-auto mt-2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-10 w-20 mx-auto mb-6" />
                  <div className="space-y-2">
                    {[1, 2, 3, 4].map((j) => (
                      <Skeleton key={j} className="h-4 w-full" />
                    ))}
                  </div>
                </CardContent>
                <CardFooter>
                  <Skeleton className="h-10 w-full" />
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <div id="plans-section" className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {displayPlans.map((plan) => {
              const isPopular = plan.isRecommended || plan.tier === "basic";
              const features = getPlanFeatures(plan, lang as Lang);
              const isSelected = selectedPlan === plan.code || selectedPlan === plan.id;
              const isFree = plan.tier === "free" || plan.basePrice === 0;
              const { price: cyclePrice, cycle: activeCycle, savingsBadge } = getPlanCyclePrice(plan);
              const planAction = getPlanAction(plan);
              const isCurrentPlan = planAction === "current";
              const isPending = selectPlanMutation.isPending || changeSubscriptionMutation.isPending;
              const savingsAmount = selectedCycle === "yearly" && plan.yearlySavingsAmount 
                ? plan.yearlySavingsAmount 
                : (activeCycle?.savings?.amount || 0);
              const currSymbol = getCurrencySymbol(plan.currencyCode || "INR");
              const localizedSavingsBadge = savingsAmount > 0 
                ? savingsAmountBadge(lang as Lang, savingsAmount, currSymbol) 
                : null;

              return (
                <Card 
                  key={plan.id} 
                  className={cn(
                    "relative flex flex-col",
                    isPopular && "border-primary shadow-lg scale-105 z-10",
                    isCurrentPlan && "ring-2 ring-green-500"
                  )}
                  data-testid={`card-package-${plan.tier}`}
                >
                  {isCurrentPlan && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-green-600 text-white">{t("currentPlan")}</Badge>
                    </div>
                  )}
                  {!isCurrentPlan && isPopular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-primary text-primary-foreground">{t("recommended")}</Badge>
                    </div>
                  )}
                  <CardHeader className="text-center pb-2">
                    <div className="flex justify-center mb-2">
                      <div className={cn("p-3 rounded-full", tierColors[plan.tier] || tierColors.free)}>
                        {tierIcons[plan.tier] || tierIcons.free}
                      </div>
                    </div>
                    <CardTitle className="text-xl" data-testid={`text-package-name-${plan.tier}`}>
                      {plan.name}
                    </CardTitle>
                    <CardDescription data-testid={`text-package-desc-${plan.tier}`}>
                      {plan.description || t("perfectForUsers")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1 pb-4">
                    <div className="text-center mb-6">
                      <span className="text-4xl font-bold" data-testid={`text-package-price-${plan.tier}`}>
                        {formatPriceOrFree(cyclePrice, plan.currencyCode || "INR")}
                      </span>
                      {!isFree && (
                        <span className="text-muted-foreground">{billingInterval}</span>
                      )}
                      {localizedSavingsBadge && !isFree && (
                        <Badge variant="secondary" className="ml-2 bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                          {localizedSavingsBadge}
                        </Badge>
                      )}
                    </div>

                    <ul className="space-y-3">
                      {features.included.map((feature: string, idx: number) => (
                        <li key={idx} className="flex items-center gap-2 text-sm">
                          <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                      {features.excluded.slice(0, 3).map((feature: string, idx: number) => (
                        <li key={idx} className="flex items-center gap-2 text-sm text-muted-foreground">
                          <X className="h-4 w-4 flex-shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                  <CardFooter>
                    {planAction === "current" ? (
                      <Button 
                        className="w-full" 
                        variant="secondary"
                        disabled
                        data-testid={`button-current-plan-${plan.tier}`}
                      >
                        <Check className="h-4 w-4 mr-2" />
                        {t("currentPlan")}
                      </Button>
                    ) : planAction === "upgrade" ? (
                      <Button 
                        className="w-full" 
                        variant="default"
                        disabled={isPending}
                        onClick={() => handleUpgrade(plan)}
                        data-testid={`button-upgrade-${plan.tier}`}
                      >
                        {isSelected && isPending ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            {t("processing")}
                          </>
                        ) : (
                          <>
                            <ArrowUp className="h-4 w-4 mr-2" />
                            {t("upgrade")}
                          </>
                        )}
                      </Button>
                    ) : planAction === "downgrade" ? (
                      plan.id === subscriptionData?.pendingPlanId ? (
                        <Button 
                          className="w-full" 
                          variant="secondary"
                          disabled
                          data-testid={`button-pending-downgrade-${plan.tier}`}
                        >
                          <Clock className="h-4 w-4 mr-2" />
                          {t("pendingDowngrade")}
                        </Button>
                      ) : (
                        <Button 
                          className="w-full" 
                          variant="outline"
                          disabled={isPending}
                          onClick={() => handleDowngrade(plan)}
                          data-testid={`button-downgrade-${plan.tier}`}
                        >
                          {isSelected && isPending ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              {t("processing")}
                            </>
                          ) : subscriptionData?.isDowngrading ? (
                            <>
                              <ArrowDown className="h-4 w-4 mr-2" />
                              {t("changeToThisPlan")}
                            </>
                          ) : (
                            <>
                              <ArrowDown className="h-4 w-4 mr-2" />
                              {t("downgrade")}
                            </>
                          )}
                        </Button>
                      )
                    ) : (
                      <Button 
                        className="w-full" 
                        variant={isPopular ? "default" : "outline"}
                        disabled={isPending}
                        onClick={() => handleSelectPlan(plan.code)}
                        data-testid={`button-select-package-${plan.tier}`}
                      >
                        {isSelected && isPending ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            {t("processing")}
                          </>
                        ) : isFree ? (
                          t("startFree")
                        ) : (
                          <>
                            {t("getPlan")} {plan.name}
                            <ArrowRight className="h-4 w-4 ml-1" />
                          </>
                        )}
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}

        <div className="mt-12 text-center text-sm text-muted-foreground">
          <p>{t("allPricesInr")}</p>
          <p className="mt-1">{t("upgradeDowngradeAnytime")}</p>
        </div>
      </main>

      {subscriptionData?.plan && pendingDowngradePlan && (
        <DowngradeConfirmModal
          open={showDowngradeModal}
          onOpenChange={setShowDowngradeModal}
          currentPlan={{
            id: subscriptionData.plan.id,
            name: subscriptionData.plan.name,
            tier: subscriptionData.plan.tier,
            featureFlags: subscriptionData.plan.featureFlags,
            limits: subscriptionData.plan.limits,
            maxUsers: subscriptionData.plan.maxUsers,
            maxCustomers: subscriptionData.plan.maxCustomers,
          }}
          targetPlan={{
            id: pendingDowngradePlan.id,
            name: pendingDowngradePlan.name,
            tier: pendingDowngradePlan.tier,
            featureFlags: pendingDowngradePlan.featureFlags,
            limits: pendingDowngradePlan.limits,
            maxUsers: pendingDowngradePlan.maxUsers,
            maxCustomers: pendingDowngradePlan.maxCustomers,
          }}
          effectiveAt={subscriptionData.currentPeriodEnd || new Date()}
          onConfirm={confirmDowngrade}
          onCancel={() => {
            setShowDowngradeModal(false);
            setPendingDowngradePlan(null);
          }}
          isLoading={changeSubscriptionMutation.isPending}
          lang={lang}
        />
      )}

      {pendingUpgradePlan && (
        <UpgradeConfirmModal
          open={showUpgradeModal}
          onOpenChange={setShowUpgradeModal}
          currentPlan={{
            name: subscriptionData?.plan?.name || "Free",
            tier: subscriptionData?.plan?.tier || "free",
          }}
          targetPlan={{
            name: pendingUpgradePlan.name,
            tier: pendingUpgradePlan.tier,
          }}
          priceLabel={formatPriceOrFree(getPlanCyclePrice(pendingUpgradePlan).price, pendingUpgradePlan.currencyCode || "INR") + billingInterval}
          newBenefits={getNewBenefits(
            subscriptionData?.plan ? {
              id: subscriptionData.plan.id,
              code: "",
              name: subscriptionData.plan.name,
              description: null,
              tier: subscriptionData.plan.tier,
              basePrice: parseFloat(subscriptionData.plan.basePrice) || 0,
              currency: "INR",
              maxUsers: subscriptionData.plan.maxUsers ?? 1,
              maxCustomers: subscriptionData.plan.maxCustomers ?? 25,
              featureFlags: subscriptionData.plan.featureFlags,
              limits: subscriptionData.plan.limits,
            } : null,
            pendingUpgradePlan
          )}
          onProceedToPay={confirmUpgrade}
          onCancel={() => {
            setShowUpgradeModal(false);
            setPendingUpgradePlan(null);
          }}
          isLoading={changeSubscriptionMutation.isPending}
          lang={lang}
          billingCycle={selectedCycle === "yearly" ? "yearly" : "monthly"}
          yearlySavingsAmount={pendingUpgradePlan.yearlySavingsAmount}
          currencySymbol={getCurrencySymbol(pendingUpgradePlan.currencyCode || "INR")}
        />
      )}

      <Dialog open={showCancelUpgradeModal} onOpenChange={setShowCancelUpgradeModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("cancelUpgradeConfirmTitle")}</DialogTitle>
            <DialogDescription>
              {t("cancelUpgradeConfirmDesc")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => setShowCancelUpgradeModal(false)}
              data-testid="button-dismiss-cancel-upgrade-modal"
            >
              {t("keepUpgrade")}
            </Button>
            <Button 
              variant="destructive"
              onClick={() => cancelUpgradeMutation.mutate()}
              disabled={cancelUpgradeMutation.isPending}
              data-testid="button-confirm-cancel-upgrade"
            >
              {cancelUpgradeMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t("cancelling")}
                </>
              ) : (
                t("cancelUpgrade")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
