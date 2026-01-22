type LockReason = "planLocked" | "addonLocked" | "countryLocked" | "roleLocked";
type Tone = "friendly" | "formal";
type AbVariant = "A" | "B";
type CopyField = "title" | "description" | "cta";

const AB_STORAGE_KEY = "app:ab:lockedFeature";

export function getOrCreateAbVariant(): AbVariant {
  if (typeof window === "undefined") return "A";
  
  const stored = localStorage.getItem(AB_STORAGE_KEY);
  if (stored === "A" || stored === "B") {
    return stored;
  }
  
  const variant: AbVariant = Math.random() < 0.5 ? "A" : "B";
  localStorage.setItem(AB_STORAGE_KEY, variant);
  return variant;
}

export function setAbVariant(variant: AbVariant): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(AB_STORAGE_KEY, variant);
  }
}

interface LockedCopyKeyOptions {
  tone?: Tone;
  ab?: AbVariant | null;
  reason: LockReason;
  field: CopyField;
}

export function getLockedCopyKey({
  tone = "friendly",
  ab = null,
  reason,
  field,
}: LockedCopyKeyOptions): string {
  if (ab) {
    return `lockedFeature.ab.${ab}.${reason}.${field}`;
  }
  return `lockedFeature.tones.${tone}.${reason}.${field}`;
}

export function getFeatureNameKey(featureKey: string): string {
  return `features.${featureKey}`;
}

export function shouldUseFormalTone(options: {
  isAdminArea?: boolean;
  isEnterprise?: boolean;
  isSuperAdmin?: boolean;
}): boolean {
  return !!(options.isAdminArea || options.isEnterprise || options.isSuperAdmin);
}

export function shouldUseAbVariantB(options: {
  limitReached?: boolean;
  usagePercent?: number;
}): boolean {
  if (options.limitReached) return true;
  if (options.usagePercent && options.usagePercent >= 80) return true;
  return false;
}

export const FEATURE_KEYS = {
  payroll: "payroll",
  hrms: "hrms",
  attendance: "attendance",
  leave: "leave",
  timesheets: "timesheets",
  whatsappAutomation: "whatsappAutomation",
  smsAutomation: "smsAutomation",
  invoicing: "invoicing",
  gst: "gst",
  analytics: "analytics",
  projects: "projects",
  softwareServices: "softwareServices",
  consulting: "consulting",
  marketplace: "marketplace",
  multiBranch: "multiBranch",
  apiAccess: "apiAccess",
  customerPortal: "customerPortal",
} as const;

export type FeatureKey = keyof typeof FEATURE_KEYS;
