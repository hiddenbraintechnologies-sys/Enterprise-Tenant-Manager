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

export type ScreenshotVariant = 
  | "overview" 
  | "detail" 
  | "create" 
  | "preview" 
  | "list" 
  | "log" 
  | "dashboard";

export interface FeatureScreenshots {
  primary: string;
  variants?: Partial<Record<ScreenshotVariant, string>>;
}

export interface FeatureVideo {
  src: string;
  poster?: string;
  duration?: number;
}

const ASSETS_BASE = "/src/assets/features";

export const FEATURE_SCREENSHOTS: Partial<Record<FeatureKey, FeatureScreenshots>> = {
  payroll: {
    primary: `${ASSETS_BASE}/payroll/payroll-overview.png`,
    variants: {
      overview: `${ASSETS_BASE}/payroll/payroll-overview.png`,
      detail: `${ASSETS_BASE}/payroll/payroll-payslip.png`,
      create: `${ASSETS_BASE}/payroll/payroll-run.png`,
    },
  },
  hrms: {
    primary: `${ASSETS_BASE}/hrms/hrms-employees.png`,
    variants: {
      list: `${ASSETS_BASE}/hrms/hrms-employees.png`,
      detail: `${ASSETS_BASE}/hrms/hrms-profile.png`,
      overview: `${ASSETS_BASE}/hrms/hrms-attendance.png`,
    },
  },
  attendance: {
    primary: `${ASSETS_BASE}/hrms/hrms-attendance.png`,
  },
  leave: {
    primary: `${ASSETS_BASE}/hrms/hrms-leave.png`,
  },
  whatsappAutomation: {
    primary: `${ASSETS_BASE}/whatsapp/whatsapp-reminder.png`,
    variants: {
      list: `${ASSETS_BASE}/whatsapp/whatsapp-templates.png`,
      preview: `${ASSETS_BASE}/whatsapp/whatsapp-reminder.png`,
      log: `${ASSETS_BASE}/whatsapp/whatsapp-log.png`,
    },
  },
  analytics: {
    primary: `${ASSETS_BASE}/analytics/analytics-dashboard.png`,
    variants: {
      dashboard: `${ASSETS_BASE}/analytics/analytics-dashboard.png`,
      detail: `${ASSETS_BASE}/analytics/analytics-payments.png`,
      overview: `${ASSETS_BASE}/analytics/analytics-growth.png`,
    },
  },
  invoicing: {
    primary: `${ASSETS_BASE}/invoicing/invoice-preview.png`,
    variants: {
      create: `${ASSETS_BASE}/invoicing/invoice-create.png`,
      preview: `${ASSETS_BASE}/invoicing/invoice-preview.png`,
      detail: `${ASSETS_BASE}/invoicing/invoice-payment.png`,
    },
  },
  projects: {
    primary: `${ASSETS_BASE}/projects/projects-list.png`,
    variants: {
      list: `${ASSETS_BASE}/projects/projects-list.png`,
      detail: `${ASSETS_BASE}/projects/project-detail.png`,
      log: `${ASSETS_BASE}/projects/timesheet-log.png`,
    },
  },
  customerPortal: {
    primary: `${ASSETS_BASE}/customer-portal/portal-invoices.png`,
    variants: {
      overview: `${ASSETS_BASE}/customer-portal/portal-login.png`,
      list: `${ASSETS_BASE}/customer-portal/portal-invoices.png`,
      detail: `${ASSETS_BASE}/customer-portal/portal-pay.png`,
    },
  },
  marketplace: {
    primary: `${ASSETS_BASE}/marketplace/marketplace-browse.png`,
    variants: {
      list: `${ASSETS_BASE}/marketplace/marketplace-browse.png`,
      detail: `${ASSETS_BASE}/marketplace/marketplace-addon.png`,
      overview: `${ASSETS_BASE}/marketplace/marketplace-installed.png`,
    },
  },
  timesheets: {
    primary: `${ASSETS_BASE}/projects/timesheet-log.png`,
    variants: {
      log: `${ASSETS_BASE}/projects/timesheet-log.png`,
      overview: `${ASSETS_BASE}/projects/timesheet-summary.png`,
    },
  },
  gst: {
    primary: `${ASSETS_BASE}/invoicing/invoice-tax.png`,
  },
};

export const FEATURE_VIDEOS: Partial<Record<FeatureKey, FeatureVideo>> = {
  payroll: {
    src: `${ASSETS_BASE}/payroll/payroll-run.mp4`,
    poster: `${ASSETS_BASE}/payroll/payroll-run.png`,
    duration: 7,
  },
  hrms: {
    src: `${ASSETS_BASE}/hrms/hrms-attendance.mp4`,
    poster: `${ASSETS_BASE}/hrms/hrms-attendance.png`,
    duration: 5,
  },
  whatsappAutomation: {
    src: `${ASSETS_BASE}/whatsapp/whatsapp-send.mp4`,
    poster: `${ASSETS_BASE}/whatsapp/whatsapp-reminder.png`,
    duration: 6,
  },
  analytics: {
    src: `${ASSETS_BASE}/analytics/analytics-drilldown.mp4`,
    poster: `${ASSETS_BASE}/analytics/analytics-dashboard.png`,
    duration: 5,
  },
  invoicing: {
    src: `${ASSETS_BASE}/invoicing/invoice-create.mp4`,
    poster: `${ASSETS_BASE}/invoicing/invoice-preview.png`,
    duration: 8,
  },
  projects: {
    src: `${ASSETS_BASE}/projects/timesheet-log.mp4`,
    poster: `${ASSETS_BASE}/projects/timesheet-log.png`,
    duration: 6,
  },
  customerPortal: {
    src: `${ASSETS_BASE}/customer-portal/portal-pay.mp4`,
    poster: `${ASSETS_BASE}/customer-portal/portal-pay.png`,
    duration: 5,
  },
  marketplace: {
    src: `${ASSETS_BASE}/marketplace/marketplace-install.mp4`,
    poster: `${ASSETS_BASE}/marketplace/marketplace-browse.png`,
    duration: 6,
  },
};

export function getFeatureIcon(featureKey: string): LucideIcon | null {
  return FEATURE_ICONS[featureKey as FeatureKey] || null;
}

export function getFeatureScreenshot(
  featureKey: string, 
  variant?: ScreenshotVariant
): string | null {
  const screenshots = FEATURE_SCREENSHOTS[featureKey as FeatureKey];
  if (!screenshots) return null;
  
  if (variant && screenshots.variants?.[variant]) {
    return screenshots.variants[variant]!;
  }
  return screenshots.primary;
}

export function getFeatureVideo(featureKey: string): FeatureVideo | null {
  return FEATURE_VIDEOS[featureKey as FeatureKey] || null;
}

export function getAllFeatureScreenshots(featureKey: string): string[] {
  const screenshots = FEATURE_SCREENSHOTS[featureKey as FeatureKey];
  if (!screenshots) return [];
  
  const all = [screenshots.primary];
  if (screenshots.variants) {
    all.push(...Object.values(screenshots.variants).filter(Boolean) as string[]);
  }
  return Array.from(new Set(all));
}
