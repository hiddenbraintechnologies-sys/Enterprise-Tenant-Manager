import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Check, Users, Calculator, Building2, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { getQueryFn } from "@/lib/queryClient";

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

interface AddonSelection {
  addonCode: string;
  tierId: string;
  tierName: string;
  amount: number;
  billingCycle: "monthly" | "yearly";
}

interface AddonSelectorProps {
  countryCode: string;
  billingCycle: "monthly" | "yearly";
  currencySymbol: string;
  onSelectionChange: (addons: AddonSelection[]) => void;
  className?: string;
}

export function AddonSelector({ 
  countryCode, 
  billingCycle, 
  currencySymbol,
  onSelectionChange,
  className 
}: AddonSelectorProps) {
  const [selectedTierId, setSelectedTierId] = useState<string | null>(null);
  const [payrollEnabled, setPayrollEnabled] = useState(false);

  const { data: payrollData, isLoading, isError } = useQuery<PayrollAccessResponse>({
    queryKey: ["/api/billing/payroll-addon/access", countryCode],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!countryCode,
  });

  const handleTierChange = (tierId: string) => {
    setSelectedTierId(tierId);
    if (payrollData?.tiers) {
      const tier = payrollData.tiers.find(t => t.id === tierId);
      if (tier) {
        const amount = billingCycle === "yearly" 
          ? parseFloat(tier.yearlyPrice) 
          : parseFloat(tier.monthlyPrice);
        onSelectionChange([{
          addonCode: "payroll",
          tierId: tier.id,
          tierName: tier.tierName,
          amount,
          billingCycle,
        }]);
      }
    }
  };

  const handlePayrollToggle = (enabled: boolean) => {
    setPayrollEnabled(enabled);
    if (!enabled) {
      setSelectedTierId(null);
      onSelectionChange([]);
    } else if (payrollData?.tiers?.[0]) {
      handleTierChange(payrollData.tiers[0].id);
    }
  };

  if (isLoading) {
    return (
      <div className={cn("space-y-4", className)} data-testid="addon-selector-loading">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (isError || !payrollData?.allowed) {
    return null;
  }

  const tiers = payrollData.tiers || [];
  if (tiers.length === 0) return null;

  const formatPrice = (price: string, isYearly: boolean) => {
    const numPrice = parseFloat(price);
    if (isYearly) {
      return `${currencySymbol}${numPrice.toLocaleString()}/${billingCycle === "yearly" ? "yr" : "mo"}`;
    }
    return `${currencySymbol}${numPrice.toLocaleString()}/mo`;
  };

  const getEmployeeRange = (tier: PayrollTier) => {
    if (tier.maxEmployees === null || tier.maxEmployees === -1) {
      return `${tier.minEmployees}+ employees`;
    }
    return `${tier.minEmployees}-${tier.maxEmployees} employees`;
  };

  return (
    <div className={cn("space-y-4", className)} data-testid="addon-selector">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Add-ons</h3>
          <p className="text-sm text-muted-foreground">Enhance your plan with additional features</p>
        </div>
      </div>

      <Card className={cn(
        "border-2 transition-colors",
        payrollEnabled ? "border-primary" : "border-transparent"
      )} data-testid="addon-payroll-card">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Calculator className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Payroll Module</CardTitle>
                <CardDescription>Complete payroll management for your team</CardDescription>
              </div>
            </div>
            <Button
              variant={payrollEnabled ? "default" : "outline"}
              size="sm"
              onClick={() => handlePayrollToggle(!payrollEnabled)}
              data-testid="button-toggle-payroll"
            >
              {payrollEnabled ? "Added" : "Add"}
            </Button>
          </div>
        </CardHeader>
        
        {payrollEnabled && (
          <CardContent className="pt-0">
            <div className="space-y-4">
              <Alert className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950">
                <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <AlertDescription className="text-blue-700 dark:text-blue-300 text-sm">
                  Select a tier based on your current employee count. You can upgrade anytime as your team grows.
                </AlertDescription>
              </Alert>

              <RadioGroup
                value={selectedTierId || ""}
                onValueChange={handleTierChange}
                className="space-y-3"
              >
                {tiers.map((tier) => {
                  const price = billingCycle === "yearly" 
                    ? parseFloat(tier.yearlyPrice) 
                    : parseFloat(tier.monthlyPrice);
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
                      onClick={() => handleTierChange(tier.id)}
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
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}

export type { AddonSelection };
