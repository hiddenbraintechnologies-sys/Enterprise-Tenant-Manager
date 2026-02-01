import { DashboardLayout } from "@/components/dashboard-layout";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { 
  Building2, 
  User, 
  Palette, 
  CreditCard, 
  Shield, 
  Brush,
  Bell,
  Users,
  Settings
} from "lucide-react";

interface SettingsLayoutProps {
  children: React.ReactNode;
  title: string;
}

const settingsNavItems = [
  { href: "/settings", label: "Overview", icon: Settings },
  { href: "/settings/profile", label: "Profile", icon: User },
  { href: "/settings/business", label: "Business", icon: Building2 },
  { href: "/settings/branding", label: "Branding", icon: Brush },
  { href: "/settings/appearance", label: "Appearance", icon: Palette },
  { href: "/settings/notifications", label: "Notifications", icon: Bell },
  { href: "/settings/billing", label: "Billing", icon: CreditCard },
  { href: "/settings/portal", label: "Customer Portal", icon: Users },
  { href: "/settings/security", label: "Security", icon: Shield },
];

export function SettingsLayout({ children, title }: SettingsLayoutProps) {
  const [location] = useLocation();

  return (
    <DashboardLayout 
      title={title} 
      breadcrumbs={[
        { label: "Settings", href: "/settings" },
        ...(location !== "/settings" ? [{ label: title }] : [])
      ]}
    >
      <div className="flex flex-col lg:flex-row gap-6">
        <aside className="w-full lg:w-56 shrink-0">
          <nav className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
            {settingsNavItems.map((item) => {
              const isActive = location === item.href || 
                (item.href !== "/settings" && location.startsWith(item.href));
              const Icon = item.icon;
              
              return (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "w-full justify-start gap-3 whitespace-nowrap",
                      isActive && "bg-primary/10 text-primary"
                    )}
                    data-testid={`nav-settings-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Button>
                </Link>
              );
            })}
          </nav>
        </aside>
        
        <main className="flex-1 min-w-0">
          {children}
        </main>
      </div>
    </DashboardLayout>
  );
}
