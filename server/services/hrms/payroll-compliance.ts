/**
 * Country-Specific Payroll Compliance Configuration
 * 
 * Defines statutory components and compliance rules for each supported country.
 * Controls which features are available (tracking, calculation, auto-filing).
 */

export interface StatutoryComponent {
  code: string;
  name: string;
  localName?: string;
  type: "deduction" | "contribution";
  payer: "employee" | "employer" | "both";
  calculationType: "percentage" | "fixed" | "tiered";
  defaultRate?: string;
  employeeRate?: string;
  employerRate?: string;
  trackingEnabled: boolean;
  calculationEnabled: boolean;
  autoFilingEnabled: boolean;
  description: string;
}

export interface PayrollComplianceConfig {
  countryCode: string;
  countryName: string;
  currencyCode: string;
  isBeta: boolean;
  betaMessage?: string;
  disclaimerBanner?: string;
  statutoryComponents: StatutoryComponent[];
  features: {
    payslipGeneration: boolean;
    payoutExport: boolean;
    statutoryFiling: boolean;
    autoTaxCalculation: boolean;
  };
}

export const PAYROLL_COMPLIANCE_CONFIGS: Record<string, PayrollComplianceConfig> = {
  IN: {
    countryCode: "IN",
    countryName: "India",
    currencyCode: "INR",
    isBeta: false,
    statutoryComponents: [
      {
        code: "PF",
        name: "Provident Fund",
        localName: "EPF",
        type: "deduction",
        payer: "both",
        calculationType: "percentage",
        employeeRate: "12.00",
        employerRate: "12.00",
        trackingEnabled: true,
        calculationEnabled: true,
        autoFilingEnabled: false,
        description: "Employee Provident Fund contribution",
      },
      {
        code: "ESI",
        name: "Employee State Insurance",
        type: "deduction",
        payer: "both",
        calculationType: "percentage",
        employeeRate: "0.75",
        employerRate: "3.25",
        trackingEnabled: true,
        calculationEnabled: true,
        autoFilingEnabled: false,
        description: "ESI contribution for medical benefits",
      },
      {
        code: "PT",
        name: "Professional Tax",
        type: "deduction",
        payer: "employee",
        calculationType: "tiered",
        trackingEnabled: true,
        calculationEnabled: true,
        autoFilingEnabled: false,
        description: "State-level professional tax",
      },
      {
        code: "TDS",
        name: "Tax Deducted at Source",
        type: "deduction",
        payer: "employee",
        calculationType: "tiered",
        trackingEnabled: true,
        calculationEnabled: true,
        autoFilingEnabled: false,
        description: "Income tax deduction at source",
      },
    ],
    features: {
      payslipGeneration: true,
      payoutExport: true,
      statutoryFiling: false,
      autoTaxCalculation: true,
    },
  },

  MY: {
    countryCode: "MY",
    countryName: "Malaysia",
    currencyCode: "MYR",
    isBeta: true,
    betaMessage: "Malaysia Payroll (Beta)",
    disclaimerBanner: "Malaysia Payroll is in beta. Statutory calculations (EPF, SOCSO, EIS, PCB) are for tracking purposes only. Please verify all calculations with your accountant before filing. Auto-submission to statutory bodies is not available.",
    statutoryComponents: [
      {
        code: "EPF",
        name: "Employees Provident Fund",
        localName: "KWSP",
        type: "deduction",
        payer: "both",
        calculationType: "percentage",
        employeeRate: "11.00",
        employerRate: "13.00",
        trackingEnabled: true,
        calculationEnabled: true,
        autoFilingEnabled: false,
        description: "KWSP/EPF retirement savings contribution",
      },
      {
        code: "SOCSO",
        name: "Social Security Organization",
        localName: "PERKESO",
        type: "deduction",
        payer: "both",
        calculationType: "tiered",
        trackingEnabled: true,
        calculationEnabled: true,
        autoFilingEnabled: false,
        description: "PERKESO/SOCSO social security contribution",
      },
      {
        code: "EIS",
        name: "Employment Insurance System",
        localName: "SIP",
        type: "deduction",
        payer: "both",
        calculationType: "percentage",
        employeeRate: "0.20",
        employerRate: "0.20",
        trackingEnabled: true,
        calculationEnabled: true,
        autoFilingEnabled: false,
        description: "SIP/EIS employment insurance contribution",
      },
      {
        code: "PCB",
        name: "Monthly Tax Deduction",
        localName: "Potongan Cukai Bulanan",
        type: "deduction",
        payer: "employee",
        calculationType: "tiered",
        trackingEnabled: true,
        calculationEnabled: true,
        autoFilingEnabled: false,
        description: "PCB monthly tax deduction (MTD)",
      },
    ],
    features: {
      payslipGeneration: true,
      payoutExport: true,
      statutoryFiling: false,
      autoTaxCalculation: false,
    },
  },

  GB: {
    countryCode: "GB",
    countryName: "United Kingdom",
    currencyCode: "GBP",
    isBeta: false,
    betaMessage: "UK Payroll (Coming Soon)",
    disclaimerBanner: "UK Payroll is not yet available. Please check back later.",
    statutoryComponents: [
      {
        code: "NI",
        name: "National Insurance",
        type: "deduction",
        payer: "both",
        calculationType: "tiered",
        trackingEnabled: false,
        calculationEnabled: false,
        autoFilingEnabled: false,
        description: "National Insurance contributions",
      },
      {
        code: "PAYE",
        name: "Pay As You Earn",
        type: "deduction",
        payer: "employee",
        calculationType: "tiered",
        trackingEnabled: false,
        calculationEnabled: false,
        autoFilingEnabled: false,
        description: "Income tax deduction",
      },
    ],
    features: {
      payslipGeneration: false,
      payoutExport: false,
      statutoryFiling: false,
      autoTaxCalculation: false,
    },
  },
};

export function getPayrollComplianceConfig(countryCode: string): PayrollComplianceConfig | null {
  return PAYROLL_COMPLIANCE_CONFIGS[countryCode] || null;
}

export function isPayrollAvailableForCountry(countryCode: string): boolean {
  const config = PAYROLL_COMPLIANCE_CONFIGS[countryCode];
  if (!config) return false;
  return config.features.payslipGeneration || config.features.payoutExport;
}
