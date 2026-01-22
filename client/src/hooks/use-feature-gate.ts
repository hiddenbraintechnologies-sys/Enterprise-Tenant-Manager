import { useQuery } from "@tanstack/react-query";
import { useAuth } from "./use-auth";

export type GateReason = "PLAN_TOO_LOW" | "NOT_INSTALLED" | "COUNTRY_BLOCKED" | "ROLE_BLOCKED";

export interface FeatureGateResult {
  allowed: boolean;
  reason?: GateReason;
  requiredPlanTier?: "basic" | "pro" | "enterprise";
  addonCode?: string;
  trialDays?: number;
  countryCode?: string;
  featureDisplayName?: string;
}

interface ContextResponse {
  moduleAccess?: Record<string, { access: string; reason?: string }>;
  planTier?: string;
  addonAccess?: Record<string, {
    canUse: boolean;
    canPurchase: boolean;
    reason?: string;
    installStatus?: string;
    subscriptionStatus?: string;
    trialDays?: number;
  }>;
  tenant?: {
    id: string;
    countryCode?: string;
  } | null;
  permissions?: string[];
}

const FEATURE_TO_PLAN_TIER: Record<string, "basic" | "pro"> = {
  invoicing: "basic",
  gst_invoicing: "basic",
  sms_alerts: "basic",
  analytics: "basic",
  software_services: "basic",
  consulting: "basic",
  hrms: "basic",
  whatsapp_automation: "pro",
  custom_roles: "pro",
  analytics_advanced: "pro",
  priority_support: "pro",
  unlimited_records: "pro",
  api_access: "pro",
};

const ADDON_FEATURES: Record<string, { addonCode: string; trialDays: number }> = {
  payroll: { addonCode: "payroll", trialDays: 7 },
  whatsapp_automation: { addonCode: "whatsapp_automation", trialDays: 7 },
  advanced_analytics: { addonCode: "advanced_analytics", trialDays: 14 },
  document_management: { addonCode: "document_management", trialDays: 7 },
  multi_branch: { addonCode: "multi_branch", trialDays: 14 },
  api_access: { addonCode: "api_access", trialDays: 14 },
};

const COUNTRY_RESTRICTED_FEATURES: Record<string, string[]> = {
  payroll: ["IN", "MY", "UK"],
  gst_filing: ["IN"],
};

const FEATURE_DISPLAY_NAMES: Record<string, string> = {
  payroll: "Payroll",
  whatsapp_automation: "WhatsApp Automation",
  advanced_analytics: "Advanced Analytics",
  analytics: "Analytics",
  software_services: "Software Services",
  consulting: "Consulting",
  hrms: "HR Management",
  hrms_it_extensions: "IT Projects & Timesheets",
  invoicing: "Invoicing",
  gst_invoicing: "GST Invoicing",
  document_management: "Document Management",
  multi_branch: "Multi-Branch Support",
  api_access: "API Access",
};

export function useFeatureGate(featureKey: string, addonCode?: string): FeatureGateResult {
  const { isAuthenticated, tenant } = useAuth();
  const tenantId = tenant?.id;

  const { data } = useQuery<ContextResponse>({
    queryKey: ["/api/context"],
    enabled: Boolean(isAuthenticated && tenantId),
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });

  const featureDisplayName = FEATURE_DISPLAY_NAMES[featureKey] || featureKey;
  const currentTier = data?.planTier || "free";
  const countryCode = (data?.tenant as any)?.countryCode || "IN";

  if (!data) {
    return { allowed: false, reason: "PLAN_TOO_LOW", featureDisplayName };
  }

  const addonConfig = addonCode ? ADDON_FEATURES[addonCode] : ADDON_FEATURES[featureKey];
  if (addonConfig) {
    const addonAccess = data.addonAccess?.[addonConfig.addonCode];
    if (addonAccess) {
      if (addonAccess.canUse) {
        return { allowed: true, featureDisplayName };
      }
      
      const countryRestrictions = COUNTRY_RESTRICTED_FEATURES[featureKey];
      if (countryRestrictions && !countryRestrictions.includes(countryCode)) {
        return {
          allowed: false,
          reason: "COUNTRY_BLOCKED",
          countryCode,
          featureDisplayName,
        };
      }
      
      return {
        allowed: false,
        reason: "NOT_INSTALLED",
        addonCode: addonConfig.addonCode,
        trialDays: addonConfig.trialDays,
        featureDisplayName,
      };
    }
  }

  const moduleAccess = data.moduleAccess?.[featureKey];
  if (moduleAccess) {
    if (moduleAccess.access === "included" || moduleAccess.access === "addon") {
      return { allowed: true, featureDisplayName };
    }

    const countryRestrictions = COUNTRY_RESTRICTED_FEATURES[featureKey];
    if (countryRestrictions && !countryRestrictions.includes(countryCode)) {
      return {
        allowed: false,
        reason: "COUNTRY_BLOCKED",
        countryCode,
        featureDisplayName,
      };
    }

    const requiredTier = FEATURE_TO_PLAN_TIER[featureKey];
    if (requiredTier) {
      const tierOrder = ["free", "basic", "pro", "enterprise"];
      const currentTierIndex = tierOrder.indexOf(currentTier);
      const requiredTierIndex = tierOrder.indexOf(requiredTier);
      
      if (currentTierIndex < requiredTierIndex) {
        return {
          allowed: false,
          reason: "PLAN_TOO_LOW",
          requiredPlanTier: requiredTier,
          featureDisplayName,
        };
      }
    }

    return {
      allowed: false,
      reason: "PLAN_TOO_LOW",
      requiredPlanTier: "basic",
      featureDisplayName,
    };
  }

  return { allowed: true, featureDisplayName };
}

export function isDismissed(tenantId: string, featureKey: string): boolean {
  const key = `gate:dismissed:${tenantId}:${featureKey}`;
  const dismissedAt = localStorage.getItem(key);
  if (!dismissedAt) return false;
  
  const dismissedTime = parseInt(dismissedAt, 10);
  const twentyFourHours = 24 * 60 * 60 * 1000;
  return Date.now() - dismissedTime < twentyFourHours;
}

export function setDismissed(tenantId: string, featureKey: string): void {
  const key = `gate:dismissed:${tenantId}:${featureKey}`;
  localStorage.setItem(key, Date.now().toString());
}
