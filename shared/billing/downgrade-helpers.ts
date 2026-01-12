import {
  FEATURE_CATALOG,
  LIMIT_CATALOG,
  type FeatureCatalogItem,
  type LimitCatalogItem,
} from "./feature-catalog";

export interface LostFeature {
  key: string;
  label: string;
  description: string;
}

export interface ReducedLimit {
  key: string;
  label: string;
  description: string;
  from: number | "Unlimited";
  to: number | "Unlimited";
}

export interface PlanWithFlags {
  featureFlags?: Record<string, boolean>;
  limits?: Record<string, number>;
  maxUsers?: number;
  maxCustomers?: number;
}

function formatLimitValue(value: number | undefined, defaultValue?: number): number | "Unlimited" {
  if (value === undefined) {
    return defaultValue !== undefined ? defaultValue : 0;
  }
  if (value === -1) {
    return "Unlimited";
  }
  return value;
}

export function getLostFeatures(
  currentPlan: PlanWithFlags,
  targetPlan: PlanWithFlags
): LostFeature[] {
  const lostFeatures: LostFeature[] = [];
  const currentFlags = currentPlan.featureFlags || {};
  const targetFlags = targetPlan.featureFlags || {};

  for (const feature of FEATURE_CATALOG) {
    if (feature.key === "record_limit" || feature.key === "unlimited_records") {
      continue;
    }
    
    const currentEnabled = currentFlags[feature.key] === true;
    const targetEnabled = targetFlags[feature.key] === true;
    
    if (currentEnabled && !targetEnabled) {
      lostFeatures.push({
        key: feature.key,
        label: feature.label,
        description: feature.description,
      });
    }
  }

  return lostFeatures;
}

export function getReducedLimits(
  currentPlan: PlanWithFlags,
  targetPlan: PlanWithFlags
): ReducedLimit[] {
  const reducedLimits: ReducedLimit[] = [];
  const currentLimits = currentPlan.limits || {};
  const targetLimits = targetPlan.limits || {};

  for (const limitItem of LIMIT_CATALOG) {
    let currentValue: number | undefined;
    let targetValue: number | undefined;

    if (limitItem.key === "users") {
      currentValue = currentLimits[limitItem.key] ?? currentPlan.maxUsers;
      targetValue = targetLimits[limitItem.key] ?? targetPlan.maxUsers;
    } else if (limitItem.key === "customers") {
      currentValue = currentLimits[limitItem.key] ?? currentPlan.maxCustomers;
      targetValue = targetLimits[limitItem.key] ?? targetPlan.maxCustomers;
    } else {
      currentValue = currentLimits[limitItem.key];
      targetValue = targetLimits[limitItem.key];
    }

    const fromValue = formatLimitValue(currentValue, limitItem.defaultValue);
    const toValue = formatLimitValue(targetValue, limitItem.defaultValue);

    if (fromValue === "Unlimited" && toValue !== "Unlimited") {
      reducedLimits.push({
        key: limitItem.key,
        label: limitItem.label,
        description: limitItem.description,
        from: fromValue,
        to: toValue,
      });
    } else if (
      fromValue !== "Unlimited" &&
      toValue !== "Unlimited" &&
      typeof fromValue === "number" &&
      typeof toValue === "number" &&
      toValue < fromValue
    ) {
      reducedLimits.push({
        key: limitItem.key,
        label: limitItem.label,
        description: limitItem.description,
        from: fromValue,
        to: toValue,
      });
    }
  }

  return reducedLimits;
}

export function formatLimitDisplay(value: number | "Unlimited"): string {
  if (value === "Unlimited") {
    return "Unlimited";
  }
  return value.toLocaleString();
}
