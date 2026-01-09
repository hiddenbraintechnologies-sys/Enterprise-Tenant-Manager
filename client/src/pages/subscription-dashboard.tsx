import { useQuery } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  LayoutDashboard, Users, Briefcase, Calendar, Receipt, BarChart3, 
  Settings, Building2, Plane, GraduationCap, Truck, Scale, Factory,
  UserCog, Store, ArrowRight, AlertTriangle, Crown, Lock
} from "lucide-react";
import { DashboardLayout } from "@/components/dashboard-layout";

interface DashboardData {
  tenant: {
    id: string;
    name: string;
    businessType: string;
    country: string;
    onboardingCompleted: boolean;
  };
  subscription: {
    id: string;
    status: string;
    trialEndsAt: string | null;
    currentPeriodEnd: string;
  } | null;
  plan: {
    id?: string;
    name: string;
    tier: string;
  };
  modules: {
    enabled: string[];
    available: string[];
    addons: string[];
  };
  features: {
    modules: string[];
    maxUsers: number;
    maxCustomers: number;
    multiCurrency: boolean;
    aiInsights: boolean;
    whiteLabel: boolean;
    apiRateLimit: number;
  };
  limits: {
    maxUsers: number;
    maxCustomers: number;
    apiRateLimit: number;
  };
  dashboardRoute: string;
  navigation: Array<{
    id: string;
    label: string;
    path: string;
    icon: string;
  }>;
}

const iconMap: Record<string, React.ReactNode> = {
  LayoutDashboard: <LayoutDashboard className="h-6 w-6" />,
  Users: <Users className="h-6 w-6" />,
  Briefcase: <Briefcase className="h-6 w-6" />,
  Calendar: <Calendar className="h-6 w-6" />,
  Receipt: <Receipt className="h-6 w-6" />,
  BarChart3: <BarChart3 className="h-6 w-6" />,
  Settings: <Settings className="h-6 w-6" />,
  Building2: <Building2 className="h-6 w-6" />,
  Plane: <Plane className="h-6 w-6" />,
  GraduationCap: <GraduationCap className="h-6 w-6" />,
  Truck: <Truck className="h-6 w-6" />,
  Scale: <Scale className="h-6 w-6" />,
  Factory: <Factory className="h-6 w-6" />,
  UserCog: <UserCog className="h-6 w-6" />,
  Store: <Store className="h-6 w-6" />,
};

function ModuleCard({ 
  id, 
  label, 
  icon, 
  path, 
  isEnabled, 
  isAddon 
}: { 
  id: string; 
  label: string; 
  icon: string; 
  path: string; 
  isEnabled: boolean;
  isAddon: boolean;
}) {
  const [, setLocation] = useLocation();

  return (
    <Card 
      className={`group relative cursor-pointer transition-all hover-elevate ${!isEnabled ? 'opacity-60' : ''}`}
      onClick={() => isEnabled && setLocation(path)}
      data-testid={`card-module-${id}`}
    >
      {!isEnabled && (
        <div className="absolute right-2 top-2">
          <Lock className="h-4 w-4 text-muted-foreground" />
        </div>
      )}
      {isAddon && isEnabled && (
        <div className="absolute right-2 top-2">
          <Badge variant="outline" className="text-xs">Add-on</Badge>
        </div>
      )}
      <CardContent className="flex flex-col items-center justify-center gap-3 p-6">
        <div className={`rounded-lg p-3 ${isEnabled ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
          {iconMap[icon] || <Briefcase className="h-6 w-6" />}
        </div>
        <span className="text-sm font-medium">{label}</span>
        {isEnabled && (
          <ArrowRight className="h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100" />
        )}
      </CardContent>
    </Card>
  );
}

export default function SubscriptionDashboardPage() {
  const [, setLocation] = useLocation();
  const accessToken = localStorage.getItem("accessToken");

  const { data: dashboardData, isLoading, error } = useQuery<DashboardData>({
    queryKey: ["/api/dashboard"],
    queryFn: async () => {
      const response = await fetch("/api/dashboard", {
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      if (response.status === 402) {
        setLocation("/subscription/select");
        throw new Error("Subscription required");
      }

      if (response.status === 401) {
        setLocation("/login");
        throw new Error("Authentication required");
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to load dashboard");
      }

      return response.json();
    },
    enabled: !!accessToken,
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              <CardTitle>Error Loading Dashboard</CardTitle>
            </div>
            <CardDescription>{error.message}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setLocation("/login")} data-testid="button-retry-login">
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!dashboardData) {
    return null;
  }

  const { tenant, subscription, plan, modules, features, limits, navigation } = dashboardData;

  const enabledModuleSet = new Set(modules.enabled);
  const addonModuleSet = new Set(modules.addons);

  const allModules = [
    ...navigation.map(nav => ({
      id: nav.id,
      label: nav.label,
      icon: nav.icon,
      path: nav.path,
    })),
    ...modules.available
      .filter(m => !navigation.find(n => n.id === m))
      .map(m => ({
        id: m,
        label: m.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        icon: 'Briefcase',
        path: `/${m}`,
      })),
  ];

  const uniqueModules = allModules.filter((m, i, arr) => 
    arr.findIndex(x => x.id === m.id) === i
  );

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-dashboard-title">
            Welcome back, {tenant.name}
          </h1>
          <p className="text-muted-foreground">
            Manage your {tenant.businessType?.replace(/_/g, ' ')} business modules
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={plan.tier === 'enterprise' ? 'default' : 'secondary'} className="gap-1">
            {plan.tier === 'enterprise' && <Crown className="h-3 w-3" />}
            {plan.name || plan.tier.charAt(0).toUpperCase() + plan.tier.slice(1)} Plan
          </Badge>
          {subscription?.status === 'trialing' && (
            <Badge variant="outline">Trial</Badge>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card data-testid="card-stats-modules">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Modules</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{modules.enabled.length}</div>
            <p className="text-xs text-muted-foreground">
              {modules.available.length} more available
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-stats-users">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">User Limit</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {limits.maxUsers === -1 ? 'Unlimited' : limits.maxUsers}
            </div>
            <p className="text-xs text-muted-foreground">
              {plan.tier} plan limit
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-stats-customers">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Customer Limit</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {limits.maxCustomers === -1 ? 'Unlimited' : limits.maxCustomers}
            </div>
            <p className="text-xs text-muted-foreground">
              {plan.tier} plan limit
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-stats-features">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Features</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1">
              {features.multiCurrency && <Badge variant="secondary" className="text-xs">Multi-Currency</Badge>}
              {features.aiInsights && <Badge variant="secondary" className="text-xs">AI</Badge>}
              {features.whiteLabel && <Badge variant="secondary" className="text-xs">White-Label</Badge>}
              {!features.multiCurrency && !features.aiInsights && !features.whiteLabel && (
                <span className="text-sm text-muted-foreground">Basic features</span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="mb-4 text-lg font-semibold">Your Modules</h2>
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {uniqueModules.map((module) => (
            <ModuleCard
              key={module.id}
              id={module.id}
              label={module.label}
              icon={module.icon}
              path={module.path}
              isEnabled={enabledModuleSet.has(module.id) || module.id === 'dashboard'}
              isAddon={addonModuleSet.has(module.id)}
            />
          ))}
        </div>
      </div>

      {modules.available.length > 0 && (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-lg">Upgrade Your Plan</CardTitle>
            <CardDescription>
              Get access to {modules.available.length} more modules by upgrading your subscription
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => setLocation('/subscription/select')} data-testid="button-upgrade-plan">
              View Plans
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      {!tenant.onboardingCompleted && (
        <Card className="border-primary/50 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-lg">Complete Your Setup</CardTitle>
            <CardDescription>
              Finish setting up your business to unlock all features
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setLocation('/onboarding')} data-testid="button-complete-onboarding">
              Continue Setup
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
