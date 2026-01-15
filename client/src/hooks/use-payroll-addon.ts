import { useQuery } from "@tanstack/react-query";
import { useAuth } from "./use-auth";

export interface PayrollAddonStatus {
  hasAccess: boolean;
  subscriptionStatus: "active" | "trialing" | "expired" | "grace_period" | "cancelled" | null;
  tierId: string | null;
  tierName: string | null;
  currentPeriodEnd: string | null;
  graceUntil: string | null;
  employeeLimit: number | null;
  isWithinGracePeriod: boolean;
}

export function usePayrollAddon() {
  const { isAuthenticated, tenant } = useAuth();
  const tenantId = tenant?.id;
  const countryCode = tenant?.country || "IN";

  const { data, isLoading, error, refetch } = useQuery<{
    addon: PayrollAddonStatus | null;
  }>({
    queryKey: ["/api/billing/payroll-addon/status", tenantId],
    enabled: Boolean(isAuthenticated && tenantId),
    staleTime: 60000,
    refetchOnWindowFocus: false,
    retry: (failureCount, error: Error & { status?: number }) => {
      if (error?.status === 401 || error?.status === 403) {
        return false;
      }
      return failureCount < 2;
    },
  });

  const hasPayrollAccess = (): boolean => {
    if (!data?.addon) return false;
    const { subscriptionStatus, isWithinGracePeriod } = data.addon;
    return (
      subscriptionStatus === "active" ||
      subscriptionStatus === "trialing" ||
      isWithinGracePeriod
    );
  };

  const getPayrollStatus = (): PayrollAddonStatus | null => {
    return data?.addon || null;
  };

  const isPayrollTrialing = (): boolean => {
    return data?.addon?.subscriptionStatus === "trialing";
  };

  const isPayrollExpired = (): boolean => {
    if (!data?.addon) return false;
    return (
      data.addon.subscriptionStatus === "expired" ||
      (data.addon.subscriptionStatus === "cancelled" && !data.addon.isWithinGracePeriod)
    );
  };

  const getPayrollExpiryDate = (): Date | null => {
    if (!data?.addon?.currentPeriodEnd) return null;
    return new Date(data.addon.currentPeriodEnd);
  };

  return {
    addon: data?.addon || null,
    isLoading,
    error,
    refetch,
    hasPayrollAccess,
    getPayrollStatus,
    isPayrollTrialing,
    isPayrollExpired,
    getPayrollExpiryDate,
    countryCode,
  };
}
