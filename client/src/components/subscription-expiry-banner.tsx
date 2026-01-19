import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Clock, CreditCard, X } from "lucide-react";
import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

interface SubscriptionStatusResponse {
  hasSubscription: boolean;
  tier?: string;
  status?: string;
  isExpired?: boolean;
  isExpiringSoon?: boolean;
  daysUntilExpiry?: number | null;
  isCancelled?: boolean;
  canAccess?: boolean;
  showExpiryBanner?: boolean;
  expiryMessage?: string | null;
  redirectUrl?: string | null;
  subscription?: {
    id: string;
    status: string;
    trialEndsAt?: string;
    currentPeriodEnd?: string;
    cancelAtPeriodEnd?: boolean;
  };
  plan?: {
    id: string;
    name: string;
    tier: string;
  } | null;
}

export function SubscriptionExpiryBanner() {
  const [, navigate] = useLocation();
  const [dismissed, setDismissed] = useState(false);

  const { data: status } = useQuery<SubscriptionStatusResponse>({
    queryKey: ["/api/dashboard/subscription/status"],
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: true,
    retry: false,
  });

  if (!status || !status.showExpiryBanner || dismissed) {
    return null;
  }

  const getVariant = () => {
    if (status.isExpired || status.subscription?.status === "suspended") {
      return "destructive";
    }
    if (status.subscription?.status === "past_due") {
      return "destructive";
    }
    return "default";
  };

  const getIcon = () => {
    if (status.isExpired) {
      return <AlertTriangle className="h-4 w-4" />;
    }
    if (status.subscription?.status === "past_due") {
      return <CreditCard className="h-4 w-4" />;
    }
    return <Clock className="h-4 w-4" />;
  };

  const getTitle = () => {
    if (status.isExpired) {
      return "Subscription Expired";
    }
    if (status.subscription?.status === "past_due") {
      return "Payment Past Due";
    }
    if (status.isExpiringSoon) {
      return "Subscription Expiring Soon";
    }
    return "Subscription Notice";
  };

  const handleRenew = () => {
    navigate(status.redirectUrl || "/billing");
  };

  const variant = getVariant();

  return (
    <Alert 
      variant={variant} 
      className="mb-4 relative"
      data-testid="alert-subscription-expiry"
    >
      {getIcon()}
      <AlertTitle className="flex items-center justify-between">
        <span>{getTitle()}</span>
        {!status.isExpired && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 absolute top-2 right-2"
            onClick={() => setDismissed(true)}
            data-testid="button-dismiss-expiry-banner"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </AlertTitle>
      <AlertDescription className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mt-2">
        <span className="flex-1">{status.expiryMessage}</span>
        <Button
          variant={variant === "destructive" ? "secondary" : "default"}
          size="sm"
          onClick={handleRenew}
          data-testid="button-renew-subscription"
        >
          {status.isExpired ? "Renew Now" : "Manage Subscription"}
        </Button>
      </AlertDescription>
    </Alert>
  );
}

export function useSubscriptionStatus() {
  return useQuery<SubscriptionStatusResponse>({
    queryKey: ["/api/dashboard/subscription/status"],
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: true,
    retry: false,
  });
}

export function SubscriptionGuard({ children }: { children: React.ReactNode }) {
  const [, navigate] = useLocation();
  const { data: status, isLoading } = useSubscriptionStatus();

  if (isLoading) {
    return <>{children}</>;
  }

  if (status?.isExpired && status?.canAccess === false) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
        <AlertTriangle className="h-16 w-16 text-destructive mb-4" />
        <h2 className="text-2xl font-bold mb-2">Subscription Expired</h2>
        <p className="text-muted-foreground text-center mb-6 max-w-md">
          Your subscription has expired. Please renew your subscription to continue using the platform.
        </p>
        <div className="flex gap-3">
          <Button
            variant="default"
            onClick={() => navigate("/billing/renew")}
            data-testid="button-renew-expired"
          >
            Renew Subscription
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate("/pricing")}
            data-testid="button-view-plans"
          >
            View Plans
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
