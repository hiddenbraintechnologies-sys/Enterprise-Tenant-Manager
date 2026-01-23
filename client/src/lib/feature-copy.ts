import i18n from "@/i18n";

export type UsageLevel = "low" | "mid" | "high";

export function tFeatureMicro(featureKey: string, countryCode?: string): string {
  if (countryCode) {
    const countryKey = `featureMicroByCountry.${countryCode}.${featureKey}`;
    if (i18n.exists(countryKey)) {
      return i18n.t(countryKey);
    }
  }
  
  const baseKey = `featureMicro.${featureKey}`;
  if (i18n.exists(baseKey)) {
    return i18n.t(baseKey);
  }
  
  return "";
}

export function tFeatureMicroSmart(opts: {
  featureKey: string;
  countryCode?: string;
  usageLevel?: UsageLevel;
}): string {
  const { featureKey, countryCode, usageLevel } = opts;

  if (usageLevel) {
    const usageKey = `featureMicroByUsage.${featureKey}.${usageLevel}`;
    if (i18n.exists(usageKey)) {
      return i18n.t(usageKey);
    }
  }

  if (countryCode) {
    const countryKey = `featureMicroByCountry.${countryCode}.${featureKey}`;
    if (i18n.exists(countryKey)) {
      return i18n.t(countryKey);
    }
  }

  const baseKey = `featureMicro.${featureKey}`;
  if (i18n.exists(baseKey)) {
    return i18n.t(baseKey);
  }

  return "";
}

export interface UsageMetrics {
  employeeCount?: number;
  unpaidInvoices?: number;
  attendanceEntries?: number;
  invoiceVolume?: number;
}

export function computeUsageLevel(featureKey: string, metrics: UsageMetrics): UsageLevel {
  switch (featureKey) {
    case "payroll":
    case "hrms":
      const empCount = metrics.employeeCount || 0;
      if (empCount <= 5) return "low";
      if (empCount <= 20) return "mid";
      return "high";

    case "whatsappAutomation":
      const unpaid = metrics.unpaidInvoices || 0;
      if (unpaid < 5) return "low";
      if (unpaid <= 25) return "mid";
      return "high";

    case "analytics":
      const volume = metrics.invoiceVolume || 0;
      if (volume < 10) return "low";
      if (volume <= 50) return "mid";
      return "high";

    default:
      return "low";
  }
}

export function getSmartFeatureCopy(
  featureKey: string,
  countryCode?: string,
  metrics?: UsageMetrics
): string {
  const usageLevel = metrics ? computeUsageLevel(featureKey, metrics) : undefined;
  
  return tFeatureMicroSmart({
    featureKey,
    countryCode,
    usageLevel,
  });
}
