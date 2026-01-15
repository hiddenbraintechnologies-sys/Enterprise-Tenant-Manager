import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { 
  Calculator, Users, Check, ArrowLeft, Loader2, CheckCircle, 
  Clock, Info, Building2, CreditCard
} from "lucide-react";
import { cn } from "@/lib/utils";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { getCurrencySymbol } from "@/lib/currency-service";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface PayrollTier {
  id: string;
  tierName: string;
  minEmployees: number;
  maxEmployees: number | null;
  monthlyPrice: string;
  yearlyPrice: string;
  isActive: boolean;
}

interface PayrollAccessResponse {
  allowed: boolean;
  status: string;
  message?: string;
  tiers?: PayrollTier[];
}

interface AddonAccessResponse {
  success: boolean;
  addons: {
    payroll: {
      hasAccess: boolean;
      tierId?: string;
      status: string;
    };
  };
}

interface SubscriptionData {
  plan?: {
    id: string;
    name: string;
    tier: string;
    currencyCode: string;
  };
  currentBillingCycle?: string;
  isActive: boolean;
}

export default function BillingAddonsPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { tenant } = useAuth();
  const [selectedTierId, setSelectedTierId] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const countryCode = tenant?.country || "IN";
  const currencySymbol = getCurrencySymbol(countryCode);

  const { data: subscription, isLoading: isLoadingSubscription } = useQuery<SubscriptionData>({
    queryKey: ["/api/billing/subscription"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const { data: addonAccess, isLoading: isLoadingAccess } = useQuery<AddonAccessResponse>({
    queryKey: ["/api/billing/addons/access"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const { data: payrollData, isLoading: isLoadingPayroll } = useQuery<PayrollAccessResponse>({
    queryKey: ["/api/billing/payroll-addon/access", countryCode],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!countryCode,
  });

  const subscribeMutation = useMutation({
    mutationFn: async (data: { tierId: string; billingCycle: "monthly" | "yearly" }) => {
      const response = await apiRequest("POST", "/api/billing/payroll-addon/subscribe", data);
      return response.json();
    },
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: ["/api/billing/addons/access"] });
      
      if (data.requiresPayment) {
        localStorage.setItem("pendingPaymentId", data.payment?.id || "");
        toast({ title: "Payroll add-on selected", description: "Proceed to payment to complete your purchase." });
        setLocation("/checkout");
      } else if (data.success) {
        toast({ title: "Payroll add-on activated!", description: "You now have access to payroll features." });
        setShowConfirmDialog(false);
      }
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleSubscribe = () => {
    if (!selectedTierId) return;
    setShowConfirmDialog(true);
  };

  const confirmSubscribe = () => {
    if (!selectedTierId) return;
    subscribeMutation.mutate({ tierId: selectedTierId, billingCycle });
  };

  const isLoading = isLoadingSubscription || isLoadingAccess || isLoadingPayroll;

  if (isLoading) {
    return (
      <div className="container max-w-4xl py-8 space-y-6" data-testid="billing-addons-loading">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const hasPayrollAccess = addonAccess?.addons?.payroll?.hasAccess;
  const payrollStatus = addonAccess?.addons?.payroll?.status;
  const tiers = payrollData?.tiers || [];
  const isPayrollAvailable = payrollData?.allowed && tiers.length > 0;

  const getEmployeeRange = (tier: PayrollTier) => {
    if (tier.maxEmployees === null || tier.maxEmployees === -1) {
      return `${tier.minEmployees}+ employees`;
    }
    return `${tier.minEmployees}-${tier.maxEmployees} employees`;
  };

  const getSelectedTier = () => tiers.find(t => t.id === selectedTierId);
  const getPrice = (tier: PayrollTier) => {
    return billingCycle === "yearly" 
      ? parseFloat(tier.yearlyPrice) 
      : parseFloat(tier.monthlyPrice);
  };

  return (
    <div className="container max-w-4xl py-8 space-y-6" data-testid="billing-addons-page">
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => setLocation("/billing")}
          data-testid="button-back-to-billing"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Billing
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold">Add-ons</h1>
        <p className="text-muted-foreground">Enhance your subscription with additional features</p>
      </div>

      {hasPayrollAccess ? (
        <Card className="border-primary" data-testid="payroll-active-card">
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Calculator className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="flex items-center gap-2">
                    Payroll Module
                    <Badge variant="default" className="text-xs">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Active
                    </Badge>
                  </CardTitle>
                  <CardDescription>Complete payroll management for your team</CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Alert className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950">
              <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
              <AlertDescription className="text-green-700 dark:text-green-300">
                You have an active payroll subscription. Access payroll features from your dashboard.
              </AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter>
            <Button onClick={() => setLocation("/dashboard/hrms")} data-testid="button-go-to-payroll">
              Go to Payroll
            </Button>
          </CardFooter>
        </Card>
      ) : isPayrollAvailable ? (
        <Card data-testid="payroll-subscribe-card">
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Calculator className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Payroll Module</CardTitle>
                  <CardDescription>Complete payroll management for your team</CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-4">
              <Label className="font-medium">Billing Cycle:</Label>
              <div className="flex gap-2">
                <Button
                  variant={billingCycle === "monthly" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setBillingCycle("monthly")}
                  data-testid="button-cycle-monthly"
                >
                  Monthly
                </Button>
                <Button
                  variant={billingCycle === "yearly" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setBillingCycle("yearly")}
                  data-testid="button-cycle-yearly"
                >
                  Yearly
                  <Badge variant="secondary" className="ml-2 text-xs">Save ~2 months</Badge>
                </Button>
              </div>
            </div>

            <Separator />

            <Alert className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950">
              <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <AlertDescription className="text-blue-700 dark:text-blue-300 text-sm">
                Select a tier based on your current employee count. You can upgrade anytime as your team grows.
              </AlertDescription>
            </Alert>

            <RadioGroup
              value={selectedTierId || ""}
              onValueChange={setSelectedTierId}
              className="space-y-3"
            >
              {tiers.map((tier) => {
                const price = getPrice(tier);
                const isSelected = selectedTierId === tier.id;

                return (
                  <div
                    key={tier.id}
                    className={cn(
                      "flex items-center space-x-3 rounded-lg border p-4 transition-colors cursor-pointer",
                      isSelected 
                        ? "border-primary bg-primary/5" 
                        : "border-border hover:border-primary/50"
                    )}
                    onClick={() => setSelectedTierId(tier.id)}
                    data-testid={`addon-tier-${tier.tierName.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <RadioGroupItem value={tier.id} id={tier.id} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Label htmlFor={tier.id} className="font-medium cursor-pointer">
                          {tier.tierName}
                        </Label>
                        <Badge variant="secondary" className="text-xs">
                          <Users className="h-3 w-3 mr-1" />
                          {getEmployeeRange(tier)}
                        </Badge>
                      </div>
                      <div className="mt-1 flex items-baseline gap-2">
                        <span className="text-lg font-bold">
                          {currencySymbol}{price.toLocaleString()}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          /{billingCycle === "yearly" ? "year" : "month"}
                        </span>
                      </div>
                    </div>
                    {isSelected && (
                      <Check className="h-5 w-5 text-primary" />
                    )}
                  </div>
                );
              })}
            </RadioGroup>

            <div className="pt-2 text-xs text-muted-foreground">
              <p className="flex items-center gap-1">
                <Building2 className="h-3 w-3" />
                Includes: Employee management, attendance, leave, payslips, tax compliance
              </p>
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              onClick={handleSubscribe} 
              disabled={!selectedTierId || subscribeMutation.isPending}
              className="w-full"
              data-testid="button-subscribe-payroll"
            >
              {subscribeMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CreditCard className="h-4 w-4 mr-2" />
                  Subscribe to Payroll
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      ) : (
        <Card data-testid="payroll-unavailable-card">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <Calculator className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <CardTitle className="text-muted-foreground">Payroll Module</CardTitle>
                <CardDescription>Not available for your region</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Alert>
              <Clock className="h-4 w-4" />
              <AlertDescription>
                Payroll add-on is not currently available for your region. Check back soon!
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}

      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Payroll Subscription</DialogTitle>
            <DialogDescription>
              You're about to subscribe to the Payroll Module
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            {getSelectedTier() && (
              <div className="rounded-lg bg-muted p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tier</span>
                  <span className="font-medium">{getSelectedTier()!.tierName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Employees</span>
                  <span className="font-medium">{getEmployeeRange(getSelectedTier()!)}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-lg">
                  <span className="font-medium">Total</span>
                  <span className="font-bold">
                    {currencySymbol}{getPrice(getSelectedTier()!).toLocaleString()}/{billingCycle === "yearly" ? "yr" : "mo"}
                  </span>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              Cancel
            </Button>
            <Button onClick={confirmSubscribe} disabled={subscribeMutation.isPending}>
              {subscribeMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                "Confirm & Pay"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
