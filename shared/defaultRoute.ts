import type { Permission, Role } from "./rbac";

export type BusinessType = 
  | "clinic" 
  | "salon" 
  | "spa" 
  | "pg" 
  | "hostel" 
  | "coworking" 
  | "service" 
  | "realestate" 
  | "tourism" 
  | "education" 
  | "logistics" 
  | "legal" 
  | "furniture"
  | "CLINIC"
  | "GENERIC";

export type UserLike = {
  role: Role;
  businessType?: BusinessType | string;
  permissions: Permission[];
  onboardingCompleted?: boolean;
};

function can(u: UserLike, p: Permission): boolean {
  return u.permissions.includes(p);
}

export function getDefaultDashboardRoute(user: UserLike): string {
  if (user.onboardingCompleted === false) {
    return "/onboarding";
  }

  const bt = (user.businessType || "").toLowerCase();
  const isClinic = bt === "clinic";
  const isSalon = bt === "salon" || bt === "spa";

  if (isClinic || isSalon) {
    if ((user.role === "OWNER" || user.role === "ADMIN") && can(user, "DASHBOARD_OVERVIEW_VIEW")) {
      return "/dashboard/overview";
    }
    if (user.role === "MANAGER" && can(user, "DASHBOARD_OPERATIONS_VIEW")) {
      return "/dashboard/operations";
    }
    if (user.role === "STAFF" && can(user, "DASHBOARD_MYWORK_VIEW")) {
      return "/dashboard/my-work";
    }
    if (can(user, "APPOINTMENTS_VIEW")) {
      return "/dashboard/appointments";
    }
  }

  if (can(user, "DASHBOARD_OVERVIEW_VIEW")) {
    return "/dashboard/overview";
  }
  if (can(user, "DASHBOARD_OPERATIONS_VIEW")) {
    return "/dashboard/operations";
  }
  if (can(user, "DASHBOARD_MYWORK_VIEW")) {
    return "/dashboard/my-work";
  }
  if (can(user, "CLIENTS_VIEW")) {
    return "/dashboard/clients";
  }
  if (can(user, "SERVICES_VIEW")) {
    return "/dashboard/services";
  }

  return "/dashboard";
}
