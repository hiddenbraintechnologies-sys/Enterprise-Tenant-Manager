import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "@/components/theme-toggle";
import { 
  Check, X, Zap, Star, Sparkles, ArrowLeft, ArrowRight,
  Users, Database, MessageCircle, FileText, Headphones
} from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

interface PricingPlan {
  id: string;
  code: string;
  name: string;
  description: string;
  tier: string;
  price: string;
  currency: string;
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

const FEATURE_LABELS: Record<string, { label: string; icon: typeof Check }> = {
  unlimitedRecords: { label: "Unlimited records", icon: Database },
  basicAnalytics: { label: "Basic analytics", icon: Zap },
  advancedAnalytics: { label: "Advanced analytics", icon: Sparkles },
  emailNotifications: { label: "Email notifications", icon: MessageCircle },
  smsNotifications: { label: "SMS notifications", icon: MessageCircle },
  whatsappAutomation: { label: "WhatsApp automation", icon: MessageCircle },
  gstFeatures: { label: "GST invoicing", icon: FileText },
  prioritySupport: { label: "Priority support", icon: Headphones },
};

const COMPARISON_FEATURES = [
  { key: "maxUsers", label: "Team members" },
  { key: "maxRecords", label: "Records" },
  { key: "basicAnalytics", label: "Basic analytics" },
  { key: "advancedAnalytics", label: "Advanced analytics" },
  { key: "emailNotifications", label: "Email notifications" },
  { key: "smsNotifications", label: "SMS notifications" },
  { key: "whatsappAutomation", label: "WhatsApp automation" },
  { key: "gstFeatures", label: "GST invoicing" },
  { key: "prioritySupport", label: "Priority support" },
];

function formatPrice(price: string, currency: string): string {
  const num = parseFloat(price);
  if (num === 0) return "Free";
  return `₹${num}`;
}

export default function PricingPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const currentTier = localStorage.getItem("subscriptionTier") || "free";
  const isLoggedIn = !!localStorage.getItem("accessToken");

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
      toast({ title: "Plan updated", description: "Your subscription has been updated." });
      setLocation("/dashboard");
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update plan", description: error.message, variant: "destructive" });
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
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
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
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {!isLoggedIn && (
              <Button asChild data-testid="button-login">
                <Link href="/login">Log in</Link>
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold mb-4" data-testid="text-pricing-title">
            Simple, transparent pricing
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto" data-testid="text-pricing-subtitle">
            Start free. Upgrade only when you need to. Cancel anytime.
          </p>
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
                  <Badge className="bg-primary text-primary-foreground">Most Popular</Badge>
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
                    {formatPrice(plan.price, plan.currency)}
                  </span>
                  {parseFloat(plan.price) > 0 && (
                    <span className="text-muted-foreground">/month</span>
                  )}
                </div>

                <ul className="space-y-3">
                  <li className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4 text-primary" />
                    <span data-testid={`text-plan-users-${plan.tier}`}>
                      {plan.maxUsers === -1 ? "Unlimited" : `Up to ${plan.maxUsers}`} team member{plan.maxUsers !== 1 ? "s" : ""}
                    </span>
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <Database className="h-4 w-4 text-primary" />
                    <span data-testid={`text-plan-records-${plan.tier}`}>
                      {plan.maxRecords === -1 ? "Unlimited records" : `Up to ${plan.maxRecords} records`}
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
                          {feature.label}
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
                    "Current plan"
                  ) : plan.tier === "free" ? (
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
          ))}
        </div>

        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">Compare plans</h2>
          <div className="overflow-x-auto">
            <table className="w-full" data-testid="table-comparison">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-4 px-2 font-medium">Feature</th>
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
                    <td className="py-3 px-2 text-sm">{feature.label}</td>
                    {INDIA_PLANS.map((plan) => {
                      let value: React.ReactNode;
                      if (feature.key === "maxUsers") {
                        value = plan.maxUsers === -1 ? "Unlimited" : plan.maxUsers;
                      } else if (feature.key === "maxRecords") {
                        value = plan.maxRecords === -1 ? "Unlimited" : plan.maxRecords;
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
            All prices are in Indian Rupees (INR). GST applicable as per government regulations.
          </p>
          <div className="flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Check className="h-4 w-4 text-green-600" />
              No credit card required
            </span>
            <span className="flex items-center gap-1">
              <Check className="h-4 w-4 text-green-600" />
              Cancel anytime
            </span>
            <span className="flex items-center gap-1">
              <Check className="h-4 w-4 text-green-600" />
              Secure payments
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}
