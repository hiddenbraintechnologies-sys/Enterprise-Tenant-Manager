import { useQuery } from "@tanstack/react-query";

interface PublicRollout {
  countryCode: string;
  isActive: boolean;
  status: "coming_soon" | "beta" | "live";
  comingSoonMessage: string | null;
  enabledBusinessTypes: string[];
}

interface PublicRolloutsResponse {
  rollouts: PublicRollout[];
}

export function usePublicRollouts() {
  return useQuery<PublicRolloutsResponse>({
    queryKey: ["/api/public/rollouts"],
    queryFn: async () => {
      const res = await fetch("/api/public/rollouts");
      if (!res.ok) throw new Error("Failed to fetch rollouts");
      return res.json();
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}

/**
 * Helper to check if a country is active from rollout data
 */
export function isCountryActive(rollouts: PublicRollout[], countryCode: string): boolean {
  const rollout = rollouts.find(r => r.countryCode === countryCode);
  return rollout?.isActive ?? false;
}

/**
 * Helper to get coming soon message for a country
 */
export function getComingSoonMessage(rollouts: PublicRollout[], countryCode: string): string | null {
  const rollout = rollouts.find(r => r.countryCode === countryCode);
  return rollout?.comingSoonMessage ?? null;
}

/**
 * Helper to get enabled business types for a country
 */
export function getEnabledBusinessTypes(rollouts: PublicRollout[], countryCode: string): string[] {
  const rollout = rollouts.find(r => r.countryCode === countryCode);
  return rollout?.enabledBusinessTypes ?? [];
}
