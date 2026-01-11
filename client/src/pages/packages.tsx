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
  Users, Database, MessageCircle, FileText, Headphones, AlertTriangle, RefreshCw
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";

interface Plan {
  id: string;
  code: string;
  name: string;
  description: string | null;
  tier: string;
  basePrice: string;
  localPrice: string;
  currency: string;
  maxUsers: number;
  maxCustomers: number;
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

const PLAN_FEATURES: Record<string, { included: string[]; excluded: string[] }> = {
  free: {
    included: [
      "Up to 50 records",
      "Basic analytics",
      "Email notifications",
      "1 team member",
    ],
    excluded: [
      "WhatsApp automation",
      "GST invoicing",
      "Priority support",
    ],
  },
  basic: {
    included: [
      "Up to 500 records",
      "Advanced analytics",
      "Email + SMS notifications",
      "GST invoicing",
      "3 team members",
    ],
    excluded: [
      "WhatsApp automation",
      "Priority support",
    ],
  },
  pro: {
    included: [
      "Unlimited records",
      "Advanced analytics",
      "All notifications",
      "WhatsApp automation",
      "GST invoicing",
      "Priority support",
      "10 team members",
    ],
    excluded: [],
  },
};

function formatPrice(price: string, currency: string): string {
  const num = parseFloat(price);
  if (num === 0) return "Free";
  if (currency === "INR") return `₹${num}`;
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
  }).format(num);
}

interface SubscriptionData {
  subscription: { id: string; status: string } | null;
  plan: { id: string; tier: string; name: string } | null;
  status: string;
  planCode: string | null;
  isActive: boolean;
  message?: string;
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
  const { tenant, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  const tenantId = tenant?.id || localStorage.getItem("tenantId");
  const accessToken = localStorage.getItem("accessToken");
  
  // Track if we're waiting for tenant context to be available
  const isWaitingForTenant = !!accessToken && !tenantId;

  const { 
    data: subscriptionData, 
    isLoading: isLoadingSubscription, 
    isError: isSubscriptionError, 
    error: subscriptionError,
    refetch: refetchSubscription, 
    isSuccess: isSubscriptionSuccess 
  } = useQuery<SubscriptionData>({
    queryKey: ["/api/billing/subscription", tenantId],
    enabled: !!accessToken && !!tenantId, // Require BOTH auth AND tenant context
    staleTime: 10000,
    retry: 2,
  });

  // Determine if this is a real error vs expected "NONE" state
  const isNoneStatus = subscriptionData?.status === "NONE";
  const hasRealSubscriptionError = isSubscriptionError && !isNoneStatus;

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

  // Show guidance when subscription check succeeded but no active subscription (including NONE status)
  const showNoSubscriptionPrompt = (isSubscriptionSuccess || isNoneStatus) && !isLoadingSubscription && !subscriptionData?.isActive;

  const selectPlanMutation = useMutation({
    mutationFn: async (planCode: string) => {
      const response = await apiRequest("POST", "/api/billing/select-plan", { planCode });
      return response.json();
    },
    onSuccess: async (data) => {
      if (data.requiresPayment) {
        localStorage.setItem("pendingPaymentId", data.payment?.id || "");
        localStorage.setItem("pendingPlanCode", data.plan?.code || "");
        toast({ title: "Plan selected", description: "Proceed to payment to activate your subscription." });
        setLocation("/checkout");
      } else {
        localStorage.setItem("subscriptionStatus", "active");
        localStorage.setItem("subscriptionTier", data.plan?.tier || "free");
        
        // Wait for subscription query to reflect active status before navigating
        // This prevents OnboardingGuard from seeing stale inactive data
        await queryClient.invalidateQueries({ queryKey: ["/api/billing/subscription", tenantId] });
        
        // Refetch and wait for the data to be active
        const result = await refetchSubscription();
        
        toast({ title: "Plan activated", description: `Your ${data.plan?.name || "Free"} plan is now active.` });
        
        // Only navigate once we confirm subscription is active
        if (result.data?.isActive) {
          setLocation(data.redirectUrl || "/dashboard");
        } else {
          // If not active yet, set a flag and let the useEffect handle redirect once active
          localStorage.setItem("subscriptionJustActivated", "true");
        }
      }
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setSelectedPlan(null);
    },
  });

  const handleSelectPlan = (planCode: string) => {
    if (!tenantId || !accessToken) {
      toast({ title: "Please log in", description: "You need to be logged in to select a plan.", variant: "destructive" });
      setLocation("/login");
      return;
    }
    setSelectedPlan(planCode);
    selectPlanMutation.mutate(planCode);
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

        {hasRealSubscriptionError && (
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

        {showNoSubscriptionPrompt && (
          <Alert className="max-w-md mx-auto mb-6 border-primary/50 bg-primary/5">
            <AlertDescription className="text-center">
              <span className="font-medium">Choose a plan to get started.</span>
              <span className="block text-sm text-muted-foreground mt-1">
                Select Free to start immediately, or choose a paid plan for more features.
              </span>
            </AlertDescription>
          </Alert>
        )}

        {isWaitingForTenant ? (
          <div className="flex flex-col items-center justify-center py-12" data-testid="loading-workspace">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mb-4" />
            <p className="text-muted-foreground">Loading your workspace...</p>
          </div>
        ) : (isLoading || isLoadingSubscription) ? (
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
              const isPopular = plan.tier === "basic";
              const features = PLAN_FEATURES[plan.tier] || PLAN_FEATURES.free;
              const isSelected = selectedPlan === plan.code;
              const isFree = plan.tier === "free" || parseFloat(plan.basePrice) === 0;

              return (
                <Card 
                  key={plan.id} 
                  className={cn(
                    "relative flex flex-col",
                    isPopular && "border-primary shadow-lg scale-105 z-10"
                  )}
                  data-testid={`card-package-${plan.tier}`}
                >
                  {isPopular && (
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
                        {formatPrice(plan.localPrice || plan.basePrice, plan.currency || "INR")}
                      </span>
                      {!isFree && (
                        <span className="text-muted-foreground">/month</span>
                      )}
                    </div>

                    <ul className="space-y-3">
                      {features.included.map((feature, idx) => (
                        <li key={idx} className="flex items-center gap-2 text-sm">
                          <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                      {features.excluded.map((feature, idx) => (
                        <li key={idx} className="flex items-center gap-2 text-sm text-muted-foreground">
                          <X className="h-4 w-4 flex-shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                  <CardFooter>
                    <Button 
                      className="w-full" 
                      variant={isPopular ? "default" : "outline"}
                      disabled={selectPlanMutation.isPending}
                      onClick={() => handleSelectPlan(plan.code)}
                      data-testid={`button-select-package-${plan.tier}`}
                    >
                      {isSelected && selectPlanMutation.isPending ? (
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
    </div>
  );
}
