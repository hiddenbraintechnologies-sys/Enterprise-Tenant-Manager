import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface PayrollComplianceConfig {
  countryCode: string;
  countryName: string;
  currencyCode: string;
  isBeta: boolean;
  betaMessage?: string;
  disclaimerBanner?: string;
  features: {
    payslipGeneration: boolean;
    payoutExport: boolean;
    statutoryFiling: boolean;
    autoTaxCalculation: boolean;
  };
}

export function PayrollComplianceBanner() {
  const { data: config, isLoading } = useQuery<PayrollComplianceConfig>({
    queryKey: ["/api/hr/payroll/compliance-config"],
  });

  if (isLoading || !config) {
    return null;
  }

  if (!config.isBeta && !config.disclaimerBanner) {
    return null;
  }

  return (
    <Alert variant="default" className="mb-4 border-amber-500/50 bg-amber-50 dark:bg-amber-950/20" data-testid="payroll-compliance-banner">
      <AlertTriangle className="h-4 w-4 text-amber-600" />
      <AlertTitle className="text-amber-800 dark:text-amber-200" data-testid="text-payroll-beta-title">
        {config.betaMessage || `${config.countryName} Payroll`}
      </AlertTitle>
      {config.disclaimerBanner && (
        <AlertDescription className="text-amber-700 dark:text-amber-300" data-testid="text-payroll-disclaimer">
          {config.disclaimerBanner}
        </AlertDescription>
      )}
    </Alert>
  );
}

export function PayrollFeatureStatus() {
  const { data: config, isLoading } = useQuery<PayrollComplianceConfig>({
    queryKey: ["/api/hr/payroll/compliance-config"],
  });

  if (isLoading || !config) {
    return null;
  }

  const features = [
    { key: "payslipGeneration", label: "Payslip Generation", enabled: config.features.payslipGeneration },
    { key: "payoutExport", label: "Payout Export", enabled: config.features.payoutExport },
    { key: "statutoryFiling", label: "Statutory Filing", enabled: config.features.statutoryFiling },
    { key: "autoTaxCalculation", label: "Auto Tax Calculation", enabled: config.features.autoTaxCalculation },
  ];

  return (
    <div className="flex flex-wrap gap-2" data-testid="payroll-feature-status">
      {features.map((feature) => (
        <span
          key={feature.key}
          className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${
            feature.enabled
              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
              : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
          }`}
          data-testid={`badge-feature-${feature.key}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${feature.enabled ? "bg-green-500" : "bg-gray-400"}`} />
          {feature.label}
        </span>
      ))}
    </div>
  );
}
