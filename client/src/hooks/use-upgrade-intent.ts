import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Lang } from "@shared/billing/i18n";

export interface TenantUsage {
  users: number;
  customers: number;
  records: number;
  projects: number;
  invoicesThisMonth: number;
  daysActive?: number;
}

export interface PlanLimits {
  users: number;
  customers: number;
  records: number;
  projects: number;
  invoicesPerMonth: number;
}

export type UpgradeReason = 
  | "users_limit"
  | "customers_limit"
  | "records_limit"
  | "projects_limit"
  | "invoices_limit"
  | "whatsapp_intent"
  | "payroll_intent"
  | "analytics_intent"
  | "custom_roles_intent"
  | "active_user_threshold";

export interface UpgradeIntent {
  reason: UpgradeReason;
  fromTier: string;
  toTier: string;
  urgency: "low" | "medium" | "high";
  message: Record<Lang, string>;
}

const UPGRADE_INTENT_MESSAGES: Record<UpgradeReason, Record<Lang, string>> = {
  users_limit: {
    en: "You've reached your team member limit",
    hi: "आपने टीम मेंबर्स की सीमा पूरी कर ली है",
    ms: "Anda telah mencapai had ahli pasukan",
    ta: "நீங்கள் குழு உறுப்பினர் வரம்பை எட்டிவிட்டீர்கள்"
  },
  customers_limit: {
    en: "You've reached your customer limit",
    hi: "आपने ग्राहकों की सीमा पूरी कर ली है",
    ms: "Anda telah mencapai had pelanggan",
    ta: "நீங்கள் வாடிக்கையாளர் வரம்பை எட்டிவிட்டீர்கள்"
  },
  records_limit: {
    en: "You've reached your records limit",
    hi: "आपने रिकॉर्ड्स की सीमा पूरी कर ली है",
    ms: "Anda telah mencapai had rekod",
    ta: "நீங்கள் பதிவு வரம்பை எட்டிவிட்டீர்கள்"
  },
  projects_limit: {
    en: "You've reached your projects limit",
    hi: "आपने प्रोजेक्ट्स की सीमा पूरी कर ली है",
    ms: "Anda telah mencapai had projek",
    ta: "நீங்கள் திட்ட வரம்பை எட்டிவிட்டீர்கள்"
  },
  invoices_limit: {
    en: "You've reached your monthly invoice limit",
    hi: "आपने मासिक इनवॉइस की सीमा पूरी कर ली है",
    ms: "Anda telah mencapai had invois bulanan",
    ta: "நீங்கள் மாதாந்திர விலைப்பட்டியல் வரம்பை எட்டிவிட்டீர்கள்"
  },
  whatsapp_intent: {
    en: "WhatsApp automation is available on Pro",
    hi: "WhatsApp ऑटोमेशन Pro में उपलब्ध है",
    ms: "Automasi WhatsApp tersedia pada Pro",
    ta: "WhatsApp தன்னியக்கம் Pro-ல் கிடைக்கும்"
  },
  payroll_intent: {
    en: "Payroll features require Basic plan or higher",
    hi: "Payroll फ़ीचर्स के लिए Basic प्लान या उससे ऊपर चाहिए",
    ms: "Ciri gaji memerlukan pelan Basic atau lebih tinggi",
    ta: "சம்பள அம்சங்களுக்கு Basic திட்டம் அல்லது அதற்கு மேல் தேவை"
  },
  analytics_intent: {
    en: "Advanced analytics is available on Pro",
    hi: "Advanced Analytics Pro में उपलब्ध है",
    ms: "Analitik lanjutan tersedia pada Pro",
    ta: "மேம்பட்ட பகுப்பாய்வு Pro-ல் கிடைக்கும்"
  },
  custom_roles_intent: {
    en: "Custom roles are available on Pro",
    hi: "Custom Roles Pro में उपलब्ध है",
    ms: "Peranan tersuai tersedia pada Pro",
    ta: "தனிப்பயன் பாத்திரங்கள் Pro-ல் கிடைக்கும்"
  },
  active_user_threshold: {
    en: "Your business is growing! Consider upgrading",
    hi: "आपका बिज़नेस बढ़ रहा है! अपग्रेड करें",
    ms: "Perniagaan anda berkembang! Pertimbangkan naik taraf",
    ta: "உங்கள் வணிகம் வளர்கிறது! மேம்படுத்துவதைக் கருத்தில் கொள்ளுங்கள்"
  }
};

function getNextTier(currentTier: string): string {
  const tierOrder = ["free", "basic", "pro"];
  const index = tierOrder.indexOf(currentTier.toLowerCase());
  if (index === -1 || index >= tierOrder.length - 1) return currentTier;
  return tierOrder[index + 1];
}

export function useUpgradeIntent(
  usage: TenantUsage | null,
  limits: PlanLimits | null,
  currentTier: string = "free"
): UpgradeIntent | null {
  return useMemo(() => {
    if (!usage || !limits) return null;

    const normalizedTier = currentTier.toLowerCase();
    if (normalizedTier === "pro" || normalizedTier === "enterprise") return null;

    const checkLimit = (
      current: number,
      max: number,
      reason: UpgradeReason,
      urgency: "low" | "medium" | "high"
    ): UpgradeIntent | null => {
      if (max === -1) return null;
      if (current >= max) {
        return {
          reason,
          fromTier: normalizedTier,
          toTier: getNextTier(normalizedTier),
          urgency: "high",
          message: UPGRADE_INTENT_MESSAGES[reason]
        };
      }
      if (current >= max * 0.8) {
        return {
          reason,
          fromTier: normalizedTier,
          toTier: getNextTier(normalizedTier),
          urgency,
          message: UPGRADE_INTENT_MESSAGES[reason]
        };
      }
      return null;
    };

    const userIntent = checkLimit(usage.users, limits.users, "users_limit", "medium");
    if (userIntent?.urgency === "high") return userIntent;

    const customerIntent = checkLimit(usage.customers, limits.customers, "customers_limit", "medium");
    if (customerIntent?.urgency === "high") return customerIntent;

    const recordIntent = checkLimit(usage.records, limits.records, "records_limit", "medium");
    if (recordIntent?.urgency === "high") return recordIntent;

    const invoiceIntent = checkLimit(usage.invoicesThisMonth, limits.invoicesPerMonth, "invoices_limit", "medium");
    if (invoiceIntent?.urgency === "high") return invoiceIntent;

    if (usage.daysActive && usage.daysActive >= 5 && normalizedTier === "free") {
      return {
        reason: "active_user_threshold",
        fromTier: normalizedTier,
        toTier: "basic",
        urgency: "low",
        message: UPGRADE_INTENT_MESSAGES.active_user_threshold
      };
    }

    return userIntent || customerIntent || recordIntent || invoiceIntent || null;
  }, [usage, limits, currentTier]);
}

export function checkFeatureIntent(
  featureKey: string,
  currentTier: string
): UpgradeIntent | null {
  const normalizedTier = currentTier.toLowerCase();
  
  const featureMap: Record<string, { minTier: string; reason: UpgradeReason }> = {
    whatsapp_automation: { minTier: "pro", reason: "whatsapp_intent" },
    payroll: { minTier: "basic", reason: "payroll_intent" },
    analytics_advanced: { minTier: "pro", reason: "analytics_intent" },
    custom_roles: { minTier: "pro", reason: "custom_roles_intent" }
  };

  const config = featureMap[featureKey];
  if (!config) return null;

  const tierOrder = ["free", "basic", "pro", "enterprise"];
  const currentIndex = tierOrder.indexOf(normalizedTier);
  const requiredIndex = tierOrder.indexOf(config.minTier);

  if (currentIndex < requiredIndex) {
    return {
      reason: config.reason,
      fromTier: normalizedTier,
      toTier: config.minTier,
      urgency: "medium",
      message: UPGRADE_INTENT_MESSAGES[config.reason]
    };
  }

  return null;
}
