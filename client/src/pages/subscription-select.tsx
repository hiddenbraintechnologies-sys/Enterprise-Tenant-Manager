import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "@/components/theme-toggle";
import { 
  Building2, Check, Loader2, ArrowRight, Crown, Sparkles, 
  Zap, Star, Users, Database, BarChart3, Shield
} from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

interface Plan {
  id: string;
  code: string;
  name: string;
  description: string;
  tier: string;
  basePrice: string;
  maxUsers: number;
  maxCustomers: number;
  features: {
    modules?: string[];
    addons?: string[];
    multiCurrency?: boolean;
    aiInsights?: boolean;
    whiteLabel?: boolean;
  };
  moduleAccess: Array<{ moduleId: string; access: string }>;
  subscriptionFeatures: {
    modules: string[];
    maxUsers: number;
    maxCustomers: number;
    multiCurrency: boolean;
    aiInsights: boolean;
    whiteLabel: boolean;
    apiRateLimit: number;
  };
  pricing: {
    basePrice: string;
    localPrice: string;
    currency: string;
    taxName: string;
    taxRate: string;
    taxAmount: string;
    totalWithTax: string;
  };
}

interface PlansResponse {
  plans: Plan[];
  countryConfig: {
    country: string;
    currency: string;
    taxName: string;
    taxRate: string;
  } | null;
}

const tierIcons: Record<string, React.ReactNode> = {
  free: <Zap className="h-5 w-5" />,
  starter: <Star className="h-5 w-5" />,
  pro: <Sparkles className="h-5 w-5" />,
  enterprise: <Crown className="h-5 w-5" />,
};

const tierColors: Record<string, string> = {
  free: "border-muted",
  starter: "border-blue-500",
  pro: "border-purple-500",
  enterprise: "border-amber-500",
};

const tierHighlightColors: Record<string, string> = {
  free: "bg-muted",
  starter: "bg-blue-500/10",
  pro: "bg-purple-500/10",
  enterprise: "bg-amber-500/10",
};

function formatCurrency(amount: string, currency: string): string {
  const num = parseFloat(amount);
  const formatter = new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  return formatter.format(num);
}

export default function SubscriptionSelectPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  const tenantId = localStorage.getItem("tenantId");
  const country = "india";

  const { data: plansData, isLoading } = useQuery<PlansResponse>({
    queryKey: ["/api/subscription/plans-with-pricing", { country }],
    queryFn: async () => {
      const response = await fetch(`/api/subscription/plans-with-pricing?country=${country}`);
      if (!response.ok) throw new Error("Failed to fetch plans");
      return response.json();
    },
  });

  const selectMutation = useMutation({
    mutationFn: async (planId: string) => {
      const accessToken = localStorage.getItem("accessToken");
      const response = await fetch("/api/subscription/select", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          tenantId,
          planId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to select subscription");
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Subscription activated",
        description: `You're now on the ${data.plan.name} plan!`,
      });

      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });

      setTimeout(() => {
        setLocation(data.nextStep || "/dashboard");
      }, 100);
    },
    onError: (error: Error) => {
      toast({
        title: "Subscription failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSelectPlan = (planId: string) => {
    setSelectedPlan(planId);
    selectMutation.mutate(planId);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const plans = plansData?.plans || [];
  const countryConfig = plansData?.countryConfig;

  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-6">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Building2 className="h-5 w-5" />
            </div>
            <span className="text-xl font-semibold" data-testid="text-logo">MyBizStream</span>
          </Link>
          <ThemeToggle />
        </div>
      </nav>

      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="mb-12 text-center">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl" data-testid="text-subscription-title">
            Choose Your Plan
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Select the plan that best fits your business needs. Upgrade or downgrade anytime.
          </p>
          {countryConfig && (
            <p className="mt-2 text-sm text-muted-foreground">
              Prices shown in {countryConfig.currency} including {countryConfig.taxName} ({countryConfig.taxRate}%)
            </p>
          )}
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {plans.map((plan) => {
            const isPopular = plan.tier === "pro";
            const isSelected = selectedPlan === plan.id;
            const isMutating = selectMutation.isPending && isSelected;

            return (
              <Card
                key={plan.id}
                className={cn(
                  "relative flex flex-col transition-all",
                  tierColors[plan.tier],
                  isPopular && "border-2 shadow-lg",
                  isSelected && "ring-2 ring-primary"
                )}
                data-testid={`card-plan-${plan.tier}`}
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-purple-500 hover:bg-purple-500">
                      Most Popular
                    </Badge>
                  </div>
                )}

                <CardHeader className={cn("pb-4", tierHighlightColors[plan.tier])}>
                  <div className="flex items-center gap-2">
                    {tierIcons[plan.tier]}
                    <CardTitle className="text-xl">{plan.name}</CardTitle>
                  </div>
                  <CardDescription className="min-h-[2.5rem]">
                    {plan.description || `Perfect for ${plan.tier === "free" ? "getting started" : plan.tier + " businesses"}`}
                  </CardDescription>
                </CardHeader>

                <CardContent className="flex-1 space-y-6">
                  <div className="space-y-1">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold">
                        {formatCurrency(plan.pricing.totalWithTax, plan.pricing.currency)}
                      </span>
                      <span className="text-muted-foreground">/month</span>
                    </div>
                    {plan.pricing.taxAmount !== "0.00" && (
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(plan.pricing.localPrice, plan.pricing.currency)} + {plan.pricing.taxName}
                      </p>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span>
                        {plan.subscriptionFeatures.maxUsers === -1
                          ? "Unlimited users"
                          : `Up to ${plan.subscriptionFeatures.maxUsers} users`}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Database className="h-4 w-4 text-muted-foreground" />
                      <span>
                        {plan.subscriptionFeatures.maxCustomers === -1
                          ? "Unlimited customers"
                          : `Up to ${plan.subscriptionFeatures.maxCustomers} customers`}
                      </span>
                    </div>
                    {plan.subscriptionFeatures.multiCurrency && (
                      <div className="flex items-center gap-2 text-sm">
                        <BarChart3 className="h-4 w-4 text-muted-foreground" />
                        <span>Multi-currency support</span>
                      </div>
                    )}
                    {plan.subscriptionFeatures.aiInsights && (
                      <div className="flex items-center gap-2 text-sm">
                        <Sparkles className="h-4 w-4 text-muted-foreground" />
                        <span>AI-powered insights</span>
                      </div>
                    )}
                    {plan.subscriptionFeatures.whiteLabel && (
                      <div className="flex items-center gap-2 text-sm">
                        <Shield className="h-4 w-4 text-muted-foreground" />
                        <span>White-label branding</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium">Included modules:</p>
                    <div className="flex flex-wrap gap-1">
                      {plan.moduleAccess
                        .filter((m) => m.access === "included")
                        .slice(0, 6)
                        .map((m) => (
                          <Badge key={m.moduleId} variant="secondary" className="text-xs">
                            {m.moduleId.replace(/_/g, " ")}
                          </Badge>
                        ))}
                      {plan.moduleAccess.filter((m) => m.access === "included").length > 6 && (
                        <Badge variant="outline" className="text-xs">
                          +{plan.moduleAccess.filter((m) => m.access === "included").length - 6} more
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>

                <CardFooter>
                  <Button
                    className="w-full"
                    variant={isPopular ? "default" : "outline"}
                    onClick={() => handleSelectPlan(plan.id)}
                    disabled={selectMutation.isPending}
                    data-testid={`button-select-${plan.tier}`}
                  >
                    {isMutating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Activating...
                      </>
                    ) : (
                      <>
                        {plan.tier === "free" ? "Start Free" : "Select Plan"}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>

        <div className="mt-12 text-center">
          <p className="text-sm text-muted-foreground">
            All plans include a 14-day free trial. No credit card required for Free plan.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Need a custom plan?{" "}
            <a href="mailto:sales@mybizstream.com" className="font-medium text-primary hover:underline">
              Contact our sales team
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
