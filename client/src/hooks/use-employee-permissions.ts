export interface EmployeePermissions {
  canView: boolean;
  canEdit: boolean;
  canDeactivate: boolean;
  canDelete: boolean;
}

export function useEmployeePermissions(employeeStatus?: string): EmployeePermissions {
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
