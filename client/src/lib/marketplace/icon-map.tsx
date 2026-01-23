import { BadgeDollarSign, Users, MessageSquareText, Boxes, ShieldCheck, BarChart3, HardDrive, FileText, GitBranch, Code } from "lucide-react";
import type { ReactNode } from "react";

export function getAddonIcon(iconKey?: string | null): ReactNode {
  switch ((iconKey || "").toLowerCase()) {
    case "payroll":
      return <BadgeDollarSign className="h-5 w-5" />;
    case "hrms":
      return <Users className="h-5 w-5" />;
    case "whatsapp":
    case "whatsapp_automation":
      return <MessageSquareText className="h-5 w-5" />;
    case "compliance":
      return <ShieldCheck className="h-5 w-5" />;
    case "analytics":
    case "advanced_analytics":
      return <BarChart3 className="h-5 w-5" />;
    case "storage":
    case "extra_storage":
      return <HardDrive className="h-5 w-5" />;
    case "documents":
    case "document_management":
      return <FileText className="h-5 w-5" />;
    case "multi_branch":
      return <GitBranch className="h-5 w-5" />;
    case "api":
    case "api_access":
      return <Code className="h-5 w-5" />;
    default:
      return <Boxes className="h-5 w-5" />;
  }
}

export function getAddonScreenshotUrl(screenshotKey?: string | null): string | null {
  if (!screenshotKey) return null;
  return `/marketplace/${screenshotKey}.png`;
}
