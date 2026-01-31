/**
 * RequireAddon Component
 * 
 * Wrapper component that gates access to content based on add-on entitlement.
 * Redirects to marketplace with appropriate messaging when not entitled.
 */

import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAddonEntitlement, type AddonEntitlement } from "@/hooks/use-entitlements";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, Clock, Lock, ShoppingCart } from "lucide-react";
import { Link } from "wouter";

interface RequireAddonProps {
  code: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  redirectOnDenied?: boolean;
  showMessage?: boolean;
}

function EntitlementDeniedCard({ 
  addonCode, 
  entitlement 
}: { 
  addonCode: string; 
  entitlement: AddonEntitlement | null;
}) {
  const state = entitlement?.state || "not_installed";
  const message = entitlement?.message || "Add-on access required";
  const validUntil = entitlement?.validUntil;
  
  let Icon = Lock;
  let title = "Add-on Required";
  let description = "This feature requires an add-on subscription.";
  let actionText = "Browse Add-ons";
  
  if (state === "expired" || state === "cancelled") {
    Icon = AlertTriangle;
    // Check if this was a trial that expired based on reasonCode
    const wasTrialExpired = entitlement?.reasonCode === "ADDON_TRIAL_EXPIRED";
    title = wasTrialExpired ? "Trial Expired" : "Subscription Expired";
    description = validUntil 
      ? wasTrialExpired
        ? `Your trial ended on ${new Date(validUntil).toLocaleDateString()}. Upgrade to continue.`
        : `Your subscription ended on ${new Date(validUntil).toLocaleDateString()}. Renew to continue.`
      : message;
    actionText = wasTrialExpired ? "Upgrade Now" : "Renew Subscription";
  } else if (state === "not_installed") {
    Icon = ShoppingCart;
    title = "Add-on Not Installed";
    description = "Install this add-on to access this feature.";
    actionText = "Install Add-on";
  }
  
  return (
    <div className="flex items-center justify-center min-h-[400px] p-6" data-testid="addon-denied-card">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
            <Icon className="h-6 w-6 text-destructive" />
          </div>
          <CardTitle data-testid="text-addon-denied-title">{title}</CardTitle>
          <CardDescription data-testid="text-addon-denied-description">
            {description}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-3">
          <Link href="/marketplace">
            <Button data-testid="button-addon-action">
              {actionText}
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" data-testid="button-back-dashboard">
              Back to Dashboard
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4 p-6" data-testid="addon-loading-skeleton">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-full max-w-lg" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mt-6">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
    </div>
  );
}

export function RequireAddon({ 
  code, 
  children, 
  fallback,
  redirectOnDenied = false,
  showMessage = true,
}: RequireAddonProps) {
  const { entitlement, isLoading, isEntitled } = useAddonEntitlement(code);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  useEffect(() => {
    if (!isLoading && !isEntitled && redirectOnDenied) {
      const state = entitlement?.state || "not_installed";
      let toastMessage = "Add-on access required";
      
      if (state === "expired") {
        // Distinguish between trial expired and subscription expired
        const isTrialExpired = entitlement?.reasonCode === "ADDON_TRIAL_EXPIRED";
        toastMessage = isTrialExpired 
          ? "Your trial has ended. Please upgrade to continue."
          : "Your subscription has expired. Please renew to continue.";
      } else if (state === "not_installed") {
        toastMessage = "This feature requires an add-on. Visit the marketplace to install.";
      }
      
      toast({
        title: "Access Denied",
        description: toastMessage,
        variant: "destructive",
      });
      
      setLocation("/marketplace");
    }
  }, [isLoading, isEntitled, redirectOnDenied, entitlement, setLocation, toast]);
  
  if (isLoading) {
    return <LoadingSkeleton />;
  }
  
  if (!isEntitled) {
    if (fallback) {
      return <>{fallback}</>;
    }
    
    if (showMessage) {
      return <EntitlementDeniedCard addonCode={code} entitlement={entitlement} />;
    }
    
    return null;
  }
  
  return <>{children}</>;
}

export function RequirePayroll({ children, ...props }: Omit<RequireAddonProps, "code">) {
  return <RequireAddon code="payroll" {...props}>{children}</RequireAddon>;
}

export function RequireHrms({ children, ...props }: Omit<RequireAddonProps, "code">) {
  return <RequireAddon code="hrms" {...props}>{children}</RequireAddon>;
}

export function RequireEmployeeDirectory({ 
  children,
  ...props 
}: Omit<RequireAddonProps, "code">) {
  const hrms = useAddonEntitlement("hrms");
  const payroll = useAddonEntitlement("payroll");
  
  const isLoading = hrms.isLoading || payroll.isLoading;
  const isEntitled = hrms.isEntitled || payroll.isEntitled;
  const entitlement = hrms.isEntitled ? hrms.entitlement : payroll.entitlement;
  
  if (isLoading) {
    return <LoadingSkeleton />;
  }
  
  if (!isEntitled) {
    if (props.fallback) {
      return <>{props.fallback}</>;
    }
    
    if (props.showMessage !== false) {
      return <EntitlementDeniedCard addonCode="hrms" entitlement={entitlement} />;
    }
    
    return null;
  }
  
  return <>{children}</>;
}
