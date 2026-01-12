import type { FeatureCatalogItem, LimitCatalogItem } from "./feature-catalog";

export type Plan = {
  id?: string;
  code: string;
  name: string;
  featureFlags: Record<string, boolean | undefined>;
  limits: Record<string, number | undefined>;
};

export type LostFeature = { key: string; label: string; description?: string };
export type LimitChange = { key: string; label: string; from: string; to: string };

function isEnabled(plan: Plan, key: string) {
  return plan.featureFlags?.[key] === true;
}

function normLimit(v: number | undefined) {
  if (v === undefined || v === null) return 0;
  return v;
}

function limitToLabel(v: number) {
  return v === -1 ? "Unlimited" : String(v);
}

function isUnlimited(v: number) {
  return v === -1;
}

export function getLostFeatures(
  current: Plan,
  target: Plan,
  FEATURE_CATALOG: FeatureCatalogItem[]
): LostFeature[] {
  return FEATURE_CATALOG.filter((f) => isEnabled(current, f.key) && !isEnabled(target, f.key)).map((f) => ({
    key: f.key,
    label: f.label,
    description: f.description,
  }));
}

export function getGainedFeatures(
  current: Plan,
  target: Plan,
  FEATURE_CATALOG: FeatureCatalogItem[]
): LostFeature[] {
  return FEATURE_CATALOG.filter((f) => !isEnabled(current, f.key) && isEnabled(target, f.key)).map((f) => ({
    key: f.key,
    label: f.label,
    description: f.description,
  }));
}

export function getReducedLimits(
  current: Plan,
  target: Plan,
  LIMIT_CATALOG: LimitCatalogItem[]
): LimitChange[] {
  const out: LimitChange[] = [];

  for (const l of LIMIT_CATALOG) {
    const cur = normLimit(current.limits?.[l.key]);
    const nxt = normLimit(target.limits?.[l.key]);

    if (isUnlimited(cur) && !isUnlimited(nxt)) {
      out.push({ key: l.key, label: l.label, from: limitToLabel(cur), to: limitToLabel(nxt) });
      continue;
    }

    if (!isUnlimited(cur) && !isUnlimited(nxt) && nxt > 0 && cur > 0 && nxt < cur) {
      out.push({ key: l.key, label: l.label, from: limitToLabel(cur), to: limitToLabel(nxt) });
      continue;
    }

    if (!isUnlimited(cur) && cur > 0 && nxt === 0) {
      out.push({ key: l.key, label: l.label, from: limitToLabel(cur), to: limitToLabel(nxt) });
      continue;
    }
  }

  return out;
}

export function getIncreasedLimits(
  current: Plan,
  target: Plan,
  LIMIT_CATALOG: LimitCatalogItem[]
): LimitChange[] {
  const out: LimitChange[] = [];

  for (const l of LIMIT_CATALOG) {
    const cur = normLimit(current.limits?.[l.key]);
    const nxt = normLimit(target.limits?.[l.key]);

    if (!isUnlimited(cur) && isUnlimited(nxt)) {
      out.push({ key: l.key, label: l.label, from: limitToLabel(cur), to: limitToLabel(nxt) });
      continue;
    }

    if (!isUnlimited(cur) && !isUnlimited(nxt) && nxt > cur) {
      out.push({ key: l.key, label: l.label, from: limitToLabel(cur), to: limitToLabel(nxt) });
      continue;
    }
  }

  return out;
}
