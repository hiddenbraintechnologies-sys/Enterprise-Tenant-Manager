export type AddonStatus = "draft" | "published" | "archived";
export type AddonCategory = "analytics" | "automation" | "billing" | "booking" | "communication" | "compliance" | "crm" | "healthcare" | "integration" | "inventory" | "marketing" | "payments" | "reporting" | "scheduling" | "security" | "utilities";

export type AddonDto = {
  id: string;
  slug: string;
  name: string;
  shortDescription?: string | null;
  fullDescription?: string | null;
  category: AddonCategory;
  status: AddonStatus;
  iconUrl?: string | null;
  bannerUrl?: string | null;
  trialDays?: number;
  features?: string[];
  tags?: string[];
  createdAt: string;
  updatedAt: string;
};

export type CountryDto = {
  countryCode: string;
  countryName: string;
  currencyCode: string;
};

export type AddonCountryConfigDto = {
  id: string;
  addonId: string;
  countryCode: string;
  isActive: boolean;
  currencyCode: string;
  trialDays: number;
  trialEnabled?: boolean;
  monthlyPrice?: string | null;
  yearlyPrice?: string | null;
  complianceNotes?: string | null;
  updatedAt: string;
};

export type AddonPricingTierDto = {
  id: string;
  addonId: string;
  name: string;
  pricingType: string;
  price?: string;
  currency?: string;
  billingPeriod?: string;
  trialDays?: number;
  isActive?: boolean;
  isDefault?: boolean;
};

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    credentials: "include",
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const msg = data?.error || data?.message || `Request failed: ${res.status}`;
    throw new Error(msg);
  }
  return data as T;
}

export const superAdminMarketplaceApi = {
  listAddons: (params?: { status?: string; category?: string; search?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set("status", params.status);
    if (params?.category) searchParams.set("category", params.category);
    if (params?.search) searchParams.set("search", params.search);
    const query = searchParams.toString();
    return api<{ addons: AddonDto[]; pagination: { page: number; limit: number; total: number; totalPages: number } }>(
      `/api/super-admin/marketplace/addons${query ? `?${query}` : ""}`
    );
  },
  createAddon: (payload: {
    slug: string;
    name: string;
    category: AddonCategory;
    shortDescription?: string;
    fullDescription?: string;
    iconUrl?: string;
    bannerUrl?: string;
    trialDays?: number;
    features?: string[];
    tags?: string[];
  }) =>
    api<AddonDto>("/api/super-admin/marketplace/addons", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateAddon: (addonId: string, payload: Partial<{
    slug: string;
    name: string;
    category: AddonCategory;
    shortDescription?: string;
    fullDescription?: string;
    iconUrl?: string;
    bannerUrl?: string;
    trialDays?: number;
    features?: string[];
    tags?: string[];
  }>) =>
    api<AddonDto>(`/api/super-admin/marketplace/addons/${addonId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  publishAddon: (addonId: string) =>
    api<AddonDto>(`/api/super-admin/marketplace/addons/${addonId}/publish`, {
      method: "POST",
    }),
  archiveAddon: (addonId: string) =>
    api<AddonDto>(`/api/super-admin/marketplace/addons/${addonId}/archive`, {
      method: "POST",
    }),
  restoreAddon: (addonId: string) =>
    api<AddonDto>(`/api/super-admin/marketplace/addons/${addonId}/restore`, {
      method: "POST",
    }),

  listCountries: () => api<{ countries: CountryDto[] }>("/api/super-admin/marketplace/countries"),
  listAddonCountryConfigs: () =>
    api<{ configs: AddonCountryConfigDto[] }>("/api/super-admin/marketplace/country-configs"),
  upsertAddonCountryConfig: (addonId: string, countryCode: string, payload: {
    isActive: boolean;
    currencyCode: string;
    trialDays: number;
    trialEnabled?: boolean;
    monthlyPrice?: string;
    yearlyPrice?: string;
    complianceNotes?: string;
  }) =>
    api<{ config: AddonCountryConfigDto }>(`/api/super-admin/marketplace/addons/${addonId}/countries/${countryCode}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  getAddonDetails: (addonId: string) =>
    api<{ addon: AddonDto; countryConfigs: AddonCountryConfigDto[]; pricing: AddonPricingTierDto[] }>(`/api/super-admin/marketplace/addons/${addonId}`),
};
