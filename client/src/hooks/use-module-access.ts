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

// Core modules that are always accessible for each business type (even on Free)
// Module IDs must match those in tenant-context.tsx BUSINESS_TYPE_MODULES
const CORE_MODULES_BY_BUSINESS_TYPE: Record<string, Set<string>> = {
  clinic: new Set(["customers", "bookings", "services", "analytics", "settings"]),
  clinic_healthcare: new Set(["customers", "bookings", "services", "analytics", "settings"]),
  salon: new Set(["customers", "services", "bookings", "analytics", "settings"]),
  salon_spa: new Set(["customers", "services", "bookings", "analytics", "settings"]),
  service: new Set(["customers", "services", "bookings", "analytics", "settings"]),
  pg: new Set(["customers", "bookings", "analytics", "settings"]),
  pg_hostel: new Set(["customers", "bookings", "analytics", "settings"]),
  coworking: new Set(["spaces", "desks", "bookings", "analytics", "settings"]),
};

export function useModuleAccess() {
  const { isAuthenticated, tenant } = useAuth();
  const tenantId = tenant?.id;
  const businessType = tenant?.businessType || "service";

  const { data, isLoading, error } = useQuery<{ moduleAccess: Record<string, ModuleAccessInfo>; planTier?: string }>({
    queryKey: ["/api/context"],
    enabled: Boolean(isAuthenticated && tenantId),
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });

  const canAccessModule = (moduleId: string): boolean => {
    // Always allow core modules for the business type
    const coreModules = CORE_MODULES_BY_BUSINESS_TYPE[businessType];
    if (coreModules?.has(moduleId.toLowerCase())) {
      return true;
    }

    // If module access data not yet loaded, allow access (non-blocking)
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
