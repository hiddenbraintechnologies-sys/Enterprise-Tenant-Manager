import { useAuth } from "@/hooks/use-auth";
import type { Permission } from "@shared/rbac";

export function useCan() {
  const { permissions } = useAuth();
  const typedPermissions = permissions as readonly Permission[];

  return {
    can: (perm: Permission): boolean => typedPermissions?.includes(perm) ?? false,
    canAny: (...perms: Permission[]): boolean => perms.some(p => typedPermissions?.includes(p)),
    canAll: (...perms: Permission[]): boolean => perms.every(p => typedPermissions?.includes(p)),
  };
}

export function useCanViewSettings() {
  const { can } = useCan();
  
  return {
    canViewProfile: can("SETTINGS_PROFILE_VIEW"),
    canEditProfile: can("SETTINGS_PROFILE_EDIT"),
    canViewOrg: can("SETTINGS_ORG_VIEW"),
    canEditOrg: can("SETTINGS_ORG_EDIT"),
    canViewTeam: can("SETTINGS_TEAM_VIEW"),
    canInviteTeam: can("SETTINGS_TEAM_INVITE"),
    canEditRoles: can("SETTINGS_TEAM_EDIT_ROLES"),
    canViewSecurity: can("SETTINGS_SECURITY_VIEW"),
    canEditSecurity: can("SETTINGS_SECURITY_EDIT"),
    canViewBilling: can("SETTINGS_BILLING_VIEW"),
    canEditBilling: can("SETTINGS_BILLING_EDIT"),
    canViewPortal: can("SETTINGS_CLIENT_PORTAL_VIEW"),
    canEditPortal: can("SETTINGS_CLIENT_PORTAL_EDIT"),
    canViewBranding: can("SETTINGS_BRANDING_VIEW"),
    canEditBranding: can("SETTINGS_BRANDING_EDIT"),
    canViewTheme: can("SETTINGS_THEME_VIEW"),
    canEditTheme: can("SETTINGS_THEME_EDIT"),
    canViewNotifications: can("SETTINGS_NOTIFICATIONS_VIEW"),
    canEditNotifications: can("SETTINGS_NOTIFICATIONS_EDIT"),
  };
}
