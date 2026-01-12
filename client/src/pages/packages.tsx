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

interface Plan {
  id: string;
  code: string;
  name: string;
  description: string | null;
  tier: string;
  basePrice: string;
  localPrice: string;
  currency: string;
  currencyCode?: string;
  billingCycle?: string;
  maxUsers: number;
  maxCustomers: number;
  featureFlags?: Record<string, boolean>;
  limits?: Record<string, number>;
  isRecommended?: boolean;
  features: {
    modules?: string[];
    addons?: string[];
    multiCurrency?: boolean;
    aiInsights?: boolean;
    whiteLabel?: boolean;
  };
}

interface PlansResponse {
  plans: Plan[];
}

function getPlanFeatures(plan: Plan): { included: string[]; excluded: string[] } {
  const included: string[] = [];
  const excluded: string[] = [];
  
  const featureFlags = plan.featureFlags || {};
  const limits = plan.limits || {};
  
  LIMIT_CATALOG.forEach((limitItem: LimitCatalogItem) => {
    const value = limits[limitItem.key];
    if (value === undefined) {
      if (limitItem.key === "users" && plan.maxUsers) {
        const v = plan.maxUsers;
        included.push(v === -1 ? `Unlimited ${limitItem.label.toLowerCase()}` : `${v.toLocaleString()} ${limitItem.label.toLowerCase()}`);
      } else if (limitItem.key === "customers" && plan.maxCustomers) {
        const v = plan.maxCustomers;
        included.push(v === -1 ? `Unlimited ${limitItem.label.toLowerCase()}` : `${v.toLocaleString()} ${limitItem.label.toLowerCase()}`);
      }
      return;
    }
    
    if (value === -1) {
      included.push(`Unlimited ${limitItem.label.toLowerCase()}`);
    } else if (value === 0) {
      // Skip limits set to 0 - not included in plan
    } else {
      included.push(`${value.toLocaleString()} ${limitItem.label.toLowerCase()}`);
    }
  });
  
  FEATURE_CATALOG.forEach((feature: FeatureCatalogItem) => {
    if (feature.key === "record_limit" || feature.key === "unlimited_records") return;
    
    const flagValue = featureFlags[feature.key];
    if (flagValue === true) {
      included.push(feature.label);
    } else if (flagValue === false) {
      excluded.push(feature.label);
    }
  });
  
  return { included, excluded };
}


interface SubscriptionData {
  subscription: { id: string; status: string; pendingPlanId?: string; pendingPaymentId?: string; cancelAtPeriodEnd?: boolean } | null;
  plan: { id: string; tier: string; name: string; basePrice: string } | null;
  pendingPlan?: { id: string; tier: string; name: string; basePrice: string } | null;
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
  const [showCancelUpgradeModal, setShowCancelUpgradeModal] = useState(false);
  const { tenant, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const queryClient = useQueryClient();

  const tenantId = tenant?.id || localStorage.getItem("tenantId");
  
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
    queryKey: ["/api/billing/plans", { country: "india" }],
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
    queryClient.invalidateQueries({ queryKey: ["/api/billing/plans"] });
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
        toast({ title: "Business setup required", description: "Please complete your business details first." });
        setLocation(data.redirectUrl || "/tenant-signup");
        return;
      }
      
      if (data.requiresPayment) {
        localStorage.setItem("pendingPaymentId", data.payment?.id || "");
        localStorage.setItem("pendingPlanCode", data.plan?.code || "");
        toast({ title: "Plan selected", description: "Proceed to payment to activate your subscription." });
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
        
        toast({ title: "Plan activated", description: `Your ${data.plan?.name || "Free"} plan is now active.` });
        
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
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setSelectedPlan(null);
    },
  });

  const handleSelectPlan = (planCode: string) => {
    if (!isAuthenticated) {
      toast({ title: "Please log in", description: "You need to be logged in to select a plan.", variant: "destructive" });
      setLocation("/login");
      return;
    }
    
    // Backend will create tenant if needed during plan selection
    setSelectedPlan(planCode);
    selectPlanMutation.mutate(planCode);
  };

  const changeSubscriptionMutation = useMutation({
    mutationFn: async ({ planId, action }: { planId: string; action: "upgrade" | "downgrade" }) => {
      const response = await apiRequest("POST", "/api/billing/subscription/change", { planId, action });
      return response.json();
    },
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: ["/api/billing/subscription"] });
      
      if (data.requiresPayment) {
        toast({ title: "Upgrade initiated", description: "Proceed to payment to complete upgrade." });
        setLocation("/checkout");
      } else if (data.effectiveAt) {
        const effectiveDate = new Date(data.effectiveAt).toLocaleDateString();
        toast({ 
          title: "Downgrade scheduled", 
          description: `Your plan will change on ${effectiveDate}.` 
        });
        setShowDowngradeModal(false);
        setPendingDowngradePlan(null);
      } else {
        toast({ title: "Plan changed", description: "Your subscription has been updated." });
      }
      setSelectedPlan(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
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
      toast({ title: "Downgrade cancelled", description: "Your subscription will continue on the current plan." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
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
      toast({ title: "Upgrade cancelled", description: "Your current plan remains active. You can upgrade again anytime." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleUpgrade = (plan: Plan) => {
    if (!isAuthenticated) {
      toast({ title: "Please log in", description: "You need to be logged in to upgrade.", variant: "destructive" });
      return;
    }
    setSelectedPlan(plan.id);
    changeSubscriptionMutation.mutate({ planId: plan.id, action: "upgrade" });
  };

  const handleDowngrade = (plan: Plan) => {
    if (!isAuthenticated) {
      toast({ title: "Please log in", description: "You need to be logged in to downgrade.", variant: "destructive" });
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
    
    const planPrice = parseFloat(plan.basePrice);
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
            <h2 className="text-xl font-semibold mb-2">Setting up your workspace</h2>
            <p className="text-muted-foreground">Just a moment while we prepare your account</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold" data-testid="text-packages-logo">MyBizStream</h1>
          <ThemeToggle />
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold mb-4" data-testid="text-packages-title">
            Choose your plan
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto" data-testid="text-packages-subtitle">
            Start free and upgrade as your business grows. All plans include a 14-day trial.
          </p>
        </div>

        {/* Only show real subscription errors AFTER tenant is resolved */}
        {hasRealSubscriptionError && canFetchSubscription && (
          <Alert variant="destructive" className="max-w-md mx-auto mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>Unable to verify subscription status.</span>
              <Button variant="outline" size="sm" onClick={handleRetrySubscription} data-testid="button-retry-subscription">
                <RefreshCw className="h-4 w-4 mr-1" />
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {isPlansError && (
          <Alert variant="destructive" className="max-w-md mx-auto mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>Unable to load pricing plans.</span>
              <Button variant="outline" size="sm" onClick={handleRetryPlans} data-testid="button-retry-plans">
                <RefreshCw className="h-4 w-4 mr-1" />
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Status: DOWNGRADING - show scheduled downgrade banner */}
        {subscriptionData?.isDowngrading && subscriptionData?.pendingPlan && (
          <Alert className="max-w-2xl mx-auto mb-6 border-orange-500/50 bg-orange-50 dark:bg-orange-900/20">
            <Clock className="h-4 w-4 text-orange-600" />
            <AlertDescription className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <span className="font-medium text-orange-700 dark:text-orange-300">
                  Downgrade scheduled
                </span>
                <span className="block text-sm text-muted-foreground mt-1">
                  Your plan will change to {subscriptionData.pendingPlan.name} on {subscriptionData.currentPeriodEnd ? new Date(subscriptionData.currentPeriodEnd).toLocaleDateString() : "end of billing period"}
                </span>
              </div>
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
                  <>
                    <XCircle className="h-4 w-4 mr-1" />
                    Cancel downgrade
                  </>
                )}
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Status: ACTIVE - show current plan with dashboard link */}
        {subscriptionData?.isActive && !subscriptionData?.isDowngrading && (
          <Alert className="max-w-md mx-auto mb-6 border-green-500/50 bg-green-50 dark:bg-green-900/20">
            <AlertDescription className="flex items-center justify-between">
              <div>
                <span className="font-medium text-green-700 dark:text-green-300">
                  Current plan: {subscriptionData?.plan?.name || "Active"}
                </span>
                <span className="block text-sm text-muted-foreground mt-1">
                  Your subscription is active.
                </span>
              </div>
              <Link href={DASHBOARD_ROUTES[tenant?.businessType || "service"] || "/dashboard/service"}>
                <Button variant="outline" size="sm" data-testid="button-go-to-dashboard">
                  Go to dashboard
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
                  Upgrade pending for {subscriptionData?.pendingPlan?.name || "upgrade"}
                </span>
                <span className="block text-sm text-muted-foreground mt-1">
                  Complete payment to activate your subscription.
                </span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Link href={subscriptionData?.pendingPaymentId ? `/checkout?paymentId=${subscriptionData.pendingPaymentId}` : "/checkout"}>
                  <Button variant="default" size="sm" data-testid="button-continue-checkout">
                    Continue to payment
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
                  Cancel upgrade
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Status: NONE - show choose plan prompt */}
        {showNoSubscriptionPrompt && !subscriptionData?.isActive && subscriptionData?.status?.toLowerCase() !== "pending_payment" && (
          <Alert className="max-w-md mx-auto mb-6 border-primary/50 bg-primary/5">
            <AlertDescription className="text-center">
              <span className="font-medium">Choose a plan to get started.</span>
              <span className="block text-sm text-muted-foreground mt-1">
                Select Free to start immediately, or choose a paid plan for more features.
              </span>
            </AlertDescription>
          </Alert>
        )}

        {(isLoading || isLoadingSubscription) ? (
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
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
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {displayPlans.map((plan) => {
              const isPopular = plan.isRecommended || plan.tier === "basic";
              const features = getPlanFeatures(plan);
              const isSelected = selectedPlan === plan.code || selectedPlan === plan.id;
              const isFree = plan.tier === "free" || parseFloat(plan.basePrice) === 0;
              const planAction = getPlanAction(plan);
              const isCurrentPlan = planAction === "current";
              const isPending = selectPlanMutation.isPending || changeSubscriptionMutation.isPending;
              const billingInterval = plan.billingCycle === "yearly" ? "/year" : "/month";

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
                      <Badge className="bg-green-600 text-white">Current Plan</Badge>
                    </div>
                  )}
                  {!isCurrentPlan && isPopular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-primary text-primary-foreground">Recommended</Badge>
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
                      {plan.description || `Perfect for ${plan.tier} users`}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1 pb-4">
                    <div className="text-center mb-6">
                      <span className="text-4xl font-bold" data-testid={`text-package-price-${plan.tier}`}>
                        {formatPriceOrFree(plan.localPrice || plan.basePrice, plan.currencyCode || plan.currency || "INR")}
                      </span>
                      {!isFree && (
                        <span className="text-muted-foreground">{billingInterval}</span>
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
                        Current Plan
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
                            Processing...
                          </>
                        ) : (
                          <>
                            <ArrowUp className="h-4 w-4 mr-2" />
                            Upgrade
                          </>
                        )}
                      </Button>
                    ) : planAction === "downgrade" ? (
                      <Button 
                        className="w-full" 
                        variant="outline"
                        disabled={isPending || subscriptionData?.isDowngrading}
                        onClick={() => handleDowngrade(plan)}
                        data-testid={`button-downgrade-${plan.tier}`}
                      >
                        {isSelected && isPending ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <ArrowDown className="h-4 w-4 mr-2" />
                            Downgrade
                          </>
                        )}
                      </Button>
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
                            Processing...
                          </>
                        ) : isFree ? (
                          "Start free"
                        ) : (
                          <>
                            Get {plan.name}
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
          <p>All prices are in INR and include GST where applicable.</p>
          <p className="mt-1">You can upgrade or downgrade at any time.</p>
        </div>
      </main>

      <Dialog open={showDowngradeModal} onOpenChange={setShowDowngradeModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Downgrade</DialogTitle>
            <DialogDescription>
              {pendingDowngradePlan && subscriptionData?.currentPeriodEnd && (
                <>
                  You are about to downgrade to the <strong>{pendingDowngradePlan.name}</strong> plan.
                  <br /><br />
                  Your current plan will remain active until{" "}
                  <strong>{new Date(subscriptionData.currentPeriodEnd).toLocaleDateString()}</strong>.
                  After that date, your plan will automatically switch to {pendingDowngradePlan.name}.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowDowngradeModal(false);
                setPendingDowngradePlan(null);
              }}
              data-testid="button-cancel-downgrade-modal"
            >
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={confirmDowngrade}
              disabled={changeSubscriptionMutation.isPending}
              data-testid="button-confirm-downgrade"
            >
              {changeSubscriptionMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                "Confirm Downgrade"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showCancelUpgradeModal} onOpenChange={setShowCancelUpgradeModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel upgrade?</DialogTitle>
            <DialogDescription>
              Your current plan will remain active. You can upgrade again anytime.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => setShowCancelUpgradeModal(false)}
              data-testid="button-dismiss-cancel-upgrade-modal"
            >
              Keep upgrade
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
                  Cancelling...
                </>
              ) : (
                "Cancel upgrade"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
