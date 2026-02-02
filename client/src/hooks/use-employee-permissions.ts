import { useAuth } from "@/hooks/use-auth";

export interface EmployeePermissions {
  canView: boolean;
  canEdit: boolean;
  canDeactivate: boolean;
  canDelete: boolean;
}

export function useEmployeePermissions(employeeStatus?: string): EmployeePermissions {
  const { user, isAuthenticated } = useAuth();
  
  if (!isAuthenticated || !user) {
    return {
      canView: false,
      canEdit: false,
      canDeactivate: false,
      canDelete: false,
    };
  }
  
  const canView = true;
  const canEdit = true;
  const canDeactivate = employeeStatus !== "exited";
  const canDelete = true;
  
  return {
    canView,
    canEdit,
    canDeactivate,
    canDelete,
  };
}
