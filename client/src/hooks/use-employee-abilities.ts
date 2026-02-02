/**
 * useEmployeeAbilities Hook
 * 
 * Provides computed abilities for Employee Directory based on:
 * 1. Add-on entitlements (HRMS or Payroll)
 * 2. Role-based permissions (staff:read, staff:create, staff:update, staff:delete)
 * 3. Employee status (for canDeactivate - already exited employees can't be deactivated)
 */

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "./use-auth";

export interface EmployeeAbilities {
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDeactivate: boolean;
  canDelete: boolean;
  hasModuleAccess: boolean;
  isAddonExpired: boolean;
}

const defaultAbilities: EmployeeAbilities = {
  canView: false,
  canCreate: false,
  canEdit: false,
  canDeactivate: false,
  canDelete: false,
  hasModuleAccess: false,
  isAddonExpired: true,
};

export function useEmployeeAbilities() {
  const { isAuthenticated, tenant } = useAuth();
  const tenantId = tenant?.id;

  const { data, isLoading, error, isError } = useQuery<EmployeeAbilities>({
    queryKey: ["/api/hr/employees/abilities"],
    enabled: Boolean(isAuthenticated && tenantId),
    staleTime: 30000, // Cache for 30 seconds
    refetchOnWindowFocus: true,
  });

  // Fail-closed: if loading or error, return no abilities
  if (isLoading || isError || !data) {
    return {
      abilities: defaultAbilities,
      isLoading,
      isError,
      error,
    };
  }

  return {
    abilities: data,
    isLoading,
    isError,
    error,
  };
}

/**
 * Get abilities for a specific employee (accounts for status)
 * Use this when you need to check if actions are available for a specific employee
 */
export function useEmployeeAbilitiesForEmployee(employeeStatus?: string) {
  const { abilities, isLoading, isError, error } = useEmployeeAbilities();

  // Deactivate is only available if employee is not already exited
  const canDeactivate = abilities.canDeactivate && employeeStatus !== "exited";

  return {
    abilities: {
      ...abilities,
      canDeactivate,
    },
    isLoading,
    isError,
    error,
  };
}
