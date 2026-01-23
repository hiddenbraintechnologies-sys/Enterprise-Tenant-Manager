import {
  Users,
  Wallet,
  MessageCircle,
  BarChart3,
  FileText,
  ClipboardList,
  Clock,
  Building2,
  PlugZap,
  ShieldCheck,
  Calendar,
  Briefcase,
  Globe,
  CreditCard,
  Receipt,
  type LucideIcon,
} from "lucide-react";

export type FeatureKey =
  | "payroll"
  | "hrms"
  | "attendance"
  | "leave"
  | "timesheets"
  | "whatsappAutomation"
  | "smsAutomation"
  | "analytics"
  | "invoicing"
  | "projects"
  | "customerPortal"
  | "softwareServices"
  | "consulting"
  | "marketplace"
  | "multiBranch"
  | "apiAccess"
  | "gst"
  | "bookings"
  | "crm"
  | "inventory";

export const FEATURE_ICONS: Record<FeatureKey, LucideIcon> = {
  payroll: Wallet,
  hrms: Users,
  attendance: ClipboardList,
  leave: Calendar,
  timesheets: Clock,
  whatsappAutomation: MessageCircle,
  smsAutomation: MessageCircle,
  analytics: BarChart3,
  invoicing: FileText,
  projects: Briefcase,
  customerPortal: Building2,
  softwareServices: PlugZap,
  consulting: ShieldCheck,
  marketplace: PlugZap,
  multiBranch: Building2,
  apiAccess: Globe,
  gst: Receipt,
  bookings: Calendar,
  crm: Users,
  inventory: ClipboardList,
};

export const FEATURE_SCREENSHOTS: Partial<Record<FeatureKey, string>> = {
  payroll: "/src/assets/features/payroll.png",
  hrms: "/src/assets/features/hrms.png",
  whatsappAutomation: "/src/assets/features/whatsapp.png",
  analytics: "/src/assets/features/analytics.png",
  invoicing: "/src/assets/features/invoicing.png",
  projects: "/src/assets/features/projects.png",
  attendance: "/src/assets/features/attendance.png",
  bookings: "/src/assets/features/bookings.png",
  crm: "/src/assets/features/crm.png",
};

export function getFeatureIcon(featureKey: string): LucideIcon | null {
  return FEATURE_ICONS[featureKey as FeatureKey] || null;
}

export function getFeatureScreenshot(featureKey: string): string | null {
  return FEATURE_SCREENSHOTS[featureKey as FeatureKey] || null;
}
