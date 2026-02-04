import type { Permission } from "@shared/rbac";

export type SidebarItem = {
  label: string;
  route: string;
  icon: string;
  permission?: Permission;
  editPermission?: Permission;
  children?: SidebarItem[];
};

export const SIDEBAR_CONFIG: SidebarItem[] = [
  {
    label: "Dashboard",
    route: "/dashboard/overview",
    icon: "home",
    permission: "DASHBOARD_OVERVIEW_VIEW",
  },
  {
    label: "Appointments",
    route: "/dashboard/appointments",
    icon: "calendar",
    permission: "APPOINTMENTS_VIEW",
  },
  {
    label: "Clients",
    route: "/dashboard/clients",
    icon: "users",
    permission: "CLIENTS_VIEW",
  },
  {
    label: "Services",
    route: "/dashboard/services",
    icon: "briefcase",
    permission: "SERVICES_VIEW",
  },
  {
    label: "My Work",
    route: "/dashboard/my-work",
    icon: "clipboard-list",
    permission: "DASHBOARD_MYWORK_VIEW",
  },
  {
    label: "Invoices",
    route: "/dashboard/invoices",
    icon: "file-text",
    permission: "INVOICES_VIEW",
  },
  {
    label: "Reports",
    route: "/dashboard/reports",
    icon: "bar-chart",
    permission: "REPORTS_VIEW",
  },
];

export const SETTINGS_SIDEBAR_CONFIG: SidebarItem[] = [
  {
    label: "Profile",
    route: "/settings/profile",
    icon: "user",
    permission: "SETTINGS_PROFILE_VIEW",
    editPermission: "SETTINGS_PROFILE_EDIT",
  },
  {
    label: "Organization",
    route: "/settings/organization",
    icon: "building",
    permission: "SETTINGS_ORG_VIEW",
    editPermission: "SETTINGS_ORG_EDIT",
  },
  {
    label: "Team & Roles",
    route: "/settings/team",
    icon: "shield",
    permission: "SETTINGS_TEAM_VIEW",
    editPermission: "SETTINGS_TEAM_INVITE",
  },
  {
    label: "Security",
    route: "/settings/security",
    icon: "lock",
    permission: "SETTINGS_SECURITY_VIEW",
    editPermission: "SETTINGS_SECURITY_EDIT",
  },
  {
    label: "Billing",
    route: "/settings/billing",
    icon: "credit-card",
    permission: "SETTINGS_BILLING_VIEW",
    editPermission: "SETTINGS_BILLING_EDIT",
  },
  {
    label: "Client Portal",
    route: "/settings/portal",
    icon: "globe",
    permission: "SETTINGS_CLIENT_PORTAL_VIEW",
    editPermission: "SETTINGS_CLIENT_PORTAL_EDIT",
  },
  {
    label: "Branding",
    route: "/settings/branding",
    icon: "palette",
    permission: "SETTINGS_BRANDING_VIEW",
    editPermission: "SETTINGS_BRANDING_EDIT",
  },
  {
    label: "Theme & Layout",
    route: "/settings/theme",
    icon: "sun",
    permission: "SETTINGS_THEME_VIEW",
    editPermission: "SETTINGS_THEME_EDIT",
  },
  {
    label: "Notifications",
    route: "/settings/notifications",
    icon: "bell",
    permission: "SETTINGS_NOTIFICATIONS_VIEW",
    editPermission: "SETTINGS_NOTIFICATIONS_EDIT",
  },
];
