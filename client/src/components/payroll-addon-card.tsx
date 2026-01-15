import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { 
  Users, Sparkles, Clock, ArrowUpRight, AlertTriangle, 
  Check, Crown, Gift, Loader2 
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";

interface PayrollTier {
  id: string;
  tierName: string;
  minEmployees: number;
  maxEmployees: number;
  monthlyPrice: string;
  yearlyPrice: string;
  currencyCode: string;
}

interface PayrollStatus {
  enabled: boolean;
  tierId: string | null;
  tierName: string | null;
  billingCycle: "monthly" | "yearly" | null;
  price: string | null;
  discountApplied: string | null;
  trialActive: boolean;
  trialEndsAt: string | null;
  trialEligible: boolean;
  trialUsed: boolean;
  graceUntil: string | null;
  graceEmployeeCount: number | null;
  inGracePeriod: boolean;
  subscriptionStatus: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

interface TiersResponse {
  tiers: PayrollTier[];
  employeeCount: number;
  recommendedTierId: string | null;
}

interface BundleDiscountResponse {
  hasDiscount: boolean;
  discount?: {
    name: string;
    type: string;
    amount: string;
    currency: string;
  };
}

export function PayrollAddonCard() {
  const { toast } = useToast();
  const [selectedTierId, setSelectedTierId] = useState<string>("");
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [useTrial, setUseTrial] = useState(true);

  const { data: statusData, isLoading: statusLoading, refetch: refetchStatus } = useQuery<PayrollStatus>({
    queryKey: ["/api/billing/payroll-addon/status"],
  });

  const { data: tiersData, isLoading: tiersLoading } = useQuery<TiersResponse>({
    queryKey: ["/api/billing/payroll-addon/tiers", { country: "IN" }],
  });

  useEffect(() => {
    if (tiersData) {
      if (tiersData.recommendedTierId && !selectedTierId) {
        setSelectedTierId(tiersData.recommendedTierId);
      } else if (tiersData.tiers.length > 0 && !selectedTierId) {
        setSelectedTierId(tiersData.tiers[0].id);
      }
    }
  }, [tiersData, selectedTierId]);

  const { data: discountData } = useQuery<BundleDiscountResponse>({
    queryKey: ["/api/billing/payroll-addon/bundle-discount", { tierId: selectedTierId }],
    enabled: !!selectedTierId,
  });

  const enableMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/billing/payroll-addon/enable", {
        tierId: selectedTierId,
        billingCycle,
        useTrial: useTrial && statusData?.trialEligible,
      });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/billing/payroll-addon/status"] });
      if (data.trial?.active) {
        toast({
          title: "Trial Started!",
          description: `Your 7-day free trial is now active. Enjoy full payroll features!`,
        });
      } else if (data.requiresPayment) {
        toast({
          title: "Payment Required",
          description: `Complete payment of ${data.paymentDetails.currency} ${data.paymentDetails.amount}`,
        });
      } else {
        toast({ title: "Payroll Add-on Enabled" });
      }
      refetchStatus();
    },
    onError: () => {
      toast({
        title: "Failed to enable",
        description: "Could not enable payroll add-on. Please try again.",
        variant: "destructive",
      });
    },
  });

  const disableMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/billing/payroll-addon/disable", {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/billing/payroll-addon/status"] });
      toast({
        title: "Cancellation Scheduled",
        description: "Payroll add-on will be disabled at the end of your billing period.",
      });
      refetchStatus();
    },
    onError: () => {
      toast({
        title: "Failed to disable",
        description: "Could not disable payroll add-on. Please try again.",
        variant: "destructive",
      });
    },
  });

  if (statusLoading || tiersLoading) {
    return (
      <Card data-testid="card-payroll-addon-skeleton">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  const selectedTier = tiersData?.tiers.find((t: PayrollTier) => t.id === selectedTierId);
  const selectedPrice = selectedTier
    ? parseFloat(billingCycle === "yearly" ? selectedTier.yearlyPrice : selectedTier.monthlyPrice)
    : 0;

  const discount = discountData?.hasDiscount ? discountData.discount : null;
  let finalPrice = selectedPrice;
  let savings = 0;
  if (discount) {
    if (discount.type === "percentage") {
      savings = selectedPrice * (parseFloat(discount.amount) / 100);
    } else {
      savings = Math.min(selectedPrice, parseFloat(discount.amount));
    }
    finalPrice = selectedPrice - savings;
  }

  if (statusData?.enabled) {
    return (
      <Card data-testid="card-payroll-addon-enabled">
        <CardHeader>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-primary" />
              Payroll Add-on
            </CardTitle>
            <div className="flex items-center gap-2">
              {statusData.trialActive && (
                <Badge variant="secondary" className="gap-1">
                  <Gift className="h-3 w-3" />
                  Trial
                </Badge>
              )}
              {statusData.inGracePeriod && (
                <Badge variant="outline" className="border-amber-500 text-amber-600 gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Grace Period
                </Badge>
              )}
              <Badge variant="default">Active</Badge>
            </div>
          </div>
          <CardDescription>
            {statusData.tierName} - {statusData.billingCycle === "yearly" ? "Yearly" : "Monthly"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Current Tier</span>
              <span className="font-medium">{statusData.tierName}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Price</span>
              <span className="font-medium">
                ₹{statusData.price}/{statusData.billingCycle === "yearly" ? "year" : "month"}
              </span>
            </div>
            {statusData.discountApplied && parseFloat(statusData.discountApplied) > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Bundle Discount</span>
                <span className="font-medium text-green-600">-₹{statusData.discountApplied}</span>
              </div>
            )}
            {statusData.trialActive && statusData.trialEndsAt && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Trial Ends</span>
                <span className="font-medium text-primary">
                  {formatDistanceToNow(new Date(statusData.trialEndsAt), { addSuffix: true })}
                </span>
              </div>
            )}
            {statusData.currentPeriodEnd && !statusData.trialActive && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Renews On</span>
                <span className="font-medium">
                  {format(new Date(statusData.currentPeriodEnd), "MMM d, yyyy")}
                </span>
              </div>
            )}
          </div>

          {statusData.inGracePeriod && statusData.graceUntil && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-700 dark:text-amber-400">Upgrade Required</p>
                  <p className="text-sm text-amber-600 dark:text-amber-500 mt-1">
                    Your employee count ({statusData.graceEmployeeCount}) exceeds tier limit. 
                    Upgrade by {format(new Date(statusData.graceUntil), "MMM d")} to continue using payroll.
                  </p>
                </div>
              </div>
            </div>
          )}

          {statusData.cancelAtPeriodEnd && (
            <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/20 p-4">
              <p className="text-sm text-red-600 dark:text-red-400">
                Cancellation scheduled. Add-on will be disabled on{" "}
                {statusData.currentPeriodEnd && format(new Date(statusData.currentPeriodEnd), "MMM d, yyyy")}
              </p>
            </div>
          )}
        </CardContent>
        <CardFooter className="gap-2 flex-wrap">
          {!statusData.cancelAtPeriodEnd && (
            <Button
              variant="outline"
              onClick={() => disableMutation.mutate()}
              disabled={disableMutation.isPending}
              data-testid="button-disable-payroll"
            >
              {disableMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Cancel Add-on
            </Button>
          )}
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card data-testid="card-payroll-addon">
      <CardHeader>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Payroll Add-on
          </CardTitle>
          {statusData?.trialEligible && (
            <Badge variant="secondary" className="gap-1">
              <Gift className="h-3 w-3" />
              7-Day Free Trial
            </Badge>
          )}
        </div>
        <CardDescription>
          Automate payroll processing, generate payslips, and manage salary structures
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {tiersData && tiersData.employeeCount > 0 && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>You have {tiersData.employeeCount} active employee(s)</span>
          </div>
        )}

        <div className="space-y-3">
          <Label className="text-sm font-medium">Select a Tier</Label>
          <RadioGroup
            value={selectedTierId}
            onValueChange={setSelectedTierId}
            className="space-y-2"
          >
            {tiersData?.tiers.map((tier: PayrollTier) => {
              const isRecommended = tier.id === tiersData.recommendedTierId;
              const monthlyPrice = parseFloat(tier.monthlyPrice);
              const yearlyPrice = parseFloat(tier.yearlyPrice);
              const price = billingCycle === "yearly" ? yearlyPrice : monthlyPrice;

              return (
                <label
                  key={tier.id}
                  className={`flex items-center justify-between rounded-lg border p-4 cursor-pointer transition-colors hover-elevate ${
                    selectedTierId === tier.id ? "border-primary bg-primary/5" : ""
                  }`}
                  data-testid={`tier-${tier.tierName.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  <div className="flex items-center gap-3">
                    <RadioGroupItem value={tier.id} id={tier.id} />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{tier.tierName}</span>
                        {isRecommended && (
                          <Badge variant="secondary" className="text-xs">Recommended</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {tier.minEmployees}-{tier.maxEmployees} employees
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">
                      {tier.currencyCode === "INR" ? "₹" : tier.currencyCode} {price}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      /{billingCycle === "yearly" ? "year" : "month"}
                    </p>
                  </div>
                </label>
              );
            })}
          </RadioGroup>
        </div>

        <div className="space-y-3">
          <Label className="text-sm font-medium">Billing Cycle</Label>
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
              className="gap-1"
              data-testid="button-cycle-yearly"
            >
              Yearly
              <Badge variant="secondary" className="ml-1 text-xs">Save 16%</Badge>
            </Button>
          </div>
        </div>

        {statusData?.trialEligible && (
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">Start with 7-day free trial</p>
                <p className="text-xs text-muted-foreground">
                  No payment required. Cancel anytime.
                </p>
              </div>
            </div>
            <Switch
              checked={useTrial}
              onCheckedChange={setUseTrial}
              data-testid="switch-use-trial"
            />
          </div>
        )}

        {discount && !useTrial && (
          <div className="flex items-center gap-2 rounded-lg bg-green-50 dark:bg-green-950/20 p-3 text-green-700 dark:text-green-400">
            <Check className="h-4 w-4 shrink-0" />
            <p className="text-sm">
              Bundle discount: Save {discount.type === "percentage" ? `${discount.amount}%` : `₹${discount.amount}`}
            </p>
          </div>
        )}

        <div className="rounded-lg border p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Tier Price</span>
            <span>₹{selectedPrice}</span>
          </div>
          {discount && !useTrial && (
            <div className="flex justify-between text-sm text-green-600">
              <span>Bundle Discount</span>
              <span>-₹{savings.toFixed(0)}</span>
            </div>
          )}
          {useTrial && statusData?.trialEligible && (
            <div className="flex justify-between text-sm text-primary">
              <span>Trial Discount</span>
              <span>-₹{selectedPrice} (7 days free)</span>
            </div>
          )}
          <div className="flex justify-between font-medium pt-2 border-t">
            <span>
              {useTrial && statusData?.trialEligible ? "Due Today" : "Total"}
            </span>
            <span>
              ₹{useTrial && statusData?.trialEligible ? "0" : finalPrice.toFixed(0)}
            </span>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button
          className="w-full gap-2"
          onClick={() => enableMutation.mutate()}
          disabled={enableMutation.isPending || !selectedTierId}
          data-testid="button-enable-payroll"
        >
          {enableMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ArrowUpRight className="h-4 w-4" />
          )}
          {useTrial && statusData?.trialEligible
            ? "Start Free Trial"
            : "Enable Payroll Add-on"}
        </Button>
      </CardFooter>
    </Card>
  );
}
