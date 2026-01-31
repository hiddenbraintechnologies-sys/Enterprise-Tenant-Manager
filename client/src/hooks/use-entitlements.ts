/**
 * useEntitlements Hook
 * 
 * Provides entitlement data for add-ons in the current tenant.
 * Single source of truth for frontend add-on access checking.
 */

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "./use-auth";

export type EntitlementState = "active" | "trial" | "grace" | "expired" | "not_installed" | "cancelled";

export type EntitlementReasonCode = 
  | "ADDON_ACTIVE"
  | "ADDON_TRIAL_ACTIVE"
  | "ADDON_GRACE_PERIOD"
  | "ADDON_EXPIRED"
  | "ADDON_TRIAL_EXPIRED"
  | "ADDON_NOT_INSTALLED"
  | "ADDON_CANCELLED"
  | "ADDON_DEPENDENCY_MISSING"
  | "ADDON_DEPENDENCY_EXPIRED";

export interface AddonEntitlement {
  entitled: boolean;
  state: EntitlementState;
  validUntil: string | null;
  reasonCode: EntitlementReasonCode;
  addonName?: string;
  message?: string;
  daysRemaining?: number;
}

export interface TenantEntitlements {
  addons: Record<string, AddonEntitlement>;
}

export function useEntitlements() {
  const { isAuthenticated, tenant } = useAuth();
  const tenantId = tenant?.id;

  const { data, isLoading, error, refetch, isError } = useQuery<TenantEntitlements>({
    queryKey: ["/api/billing/entitlements"],
    enabled: Boolean(isAuthenticated && tenantId),
    staleTime: 30000,
    refetchOnWindowFocus: true,
  });

  return {
    entitlements: data?.addons || {},
    isLoading,
    isError,
    error,
    refetch,
  };
}

export function useAddonEntitlement(addonCode: string) {
  const { entitlements, isLoading, isError, error } = useEntitlements();
  
  // Fail-closed: if loading or error, treat as not entitled
  if (isLoading || isError) {
    return {
      entitlement: null,
      isLoading,
      isError,
      error,
      isEntitled: false, // Fail-closed until entitlement confirmed
    };
  }
  
  const entitlement = entitlements[addonCode];
  
  const hrmsVariants = ["hrms", "hrms-india", "hrms-malaysia", "hrms-uk"];
  const payrollVariants = ["payroll", "payroll-india", "payroll-malaysia", "payroll-uk"];
  
  if (!entitlement && addonCode === "hrms") {
    for (const variant of hrmsVariants) {
      if (entitlements[variant]?.entitled) {
        return {
          entitlement: entitlements[variant],
          isLoading,
          isError,
          error,
          isEntitled: true,
        };
      }
    }
  }
  
  if (!entitlement && addonCode === "payroll") {
    for (const variant of payrollVariants) {
      if (entitlements[variant]?.entitled) {
        return {
          entitlement: entitlements[variant],
          isLoading,
          isError,
          error,
          isEntitled: true,
        };
      }
    }
  }
  
  return {
    entitlement: entitlement || null,
    isLoading,
    isError,
    error,
    isEntitled: entitlement?.entitled || false,
  };
}

export function useHrmsEntitlement() {
  return useAddonEntitlement("hrms");
}

export function usePayrollEntitlement() {
  return useAddonEntitlement("payroll");
}

export function useEmployeeDirectoryEntitlement() {
  const hrms = useAddonEntitlement("hrms");
  const payroll = useAddonEntitlement("payroll");
  
  const isLoading = hrms.isLoading || payroll.isLoading;
  const isError = hrms.isError || payroll.isError;
  // Fail-closed: if loading or error, treat as not entitled
  const isEntitled = !isLoading && !isError && (hrms.isEntitled || payroll.isEntitled);
  const entitlement = hrms.isEntitled ? hrms.entitlement : payroll.entitlement;
  
  return {
    entitlement,
    isLoading,
    isError,
    isEntitled,
  };
}
