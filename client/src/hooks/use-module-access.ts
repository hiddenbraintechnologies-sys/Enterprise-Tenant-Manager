import { useQuery } from "@tanstack/react-query";
import { useAuth } from "./use-auth";

export interface ModuleAccessInfo {
  access: "included" | "addon" | "unavailable";
  reason?: string;
}

export interface ModuleAccessData {
  moduleAccess: Record<string, ModuleAccessInfo>;
  planTier?: string;
}

export function useModuleAccess() {
  const { isAuthenticated, tenant } = useAuth();
  const tenantId = tenant?.id;

  const { data, isLoading, error } = useQuery<{ moduleAccess: Record<string, ModuleAccessInfo>; planTier?: string }>({
    queryKey: ["/api/context"],
    enabled: Boolean(isAuthenticated && tenantId),
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });

  const canAccessModule = (moduleId: string): boolean => {
    if (!data?.moduleAccess) return true;
    const access = data.moduleAccess[moduleId];
    return access?.access === "included" || access?.access === "addon";
  };

  const getModuleAccessInfo = (moduleId: string): ModuleAccessInfo | undefined => {
    return data?.moduleAccess?.[moduleId];
  };

  const isFreePlan = (): boolean => {
    return data?.planTier === "free";
  };

  return {
    moduleAccess: data?.moduleAccess || {},
    planTier: data?.planTier,
    isLoading,
    error,
    canAccessModule,
    getModuleAccessInfo,
    isFreePlan,
  };
}
