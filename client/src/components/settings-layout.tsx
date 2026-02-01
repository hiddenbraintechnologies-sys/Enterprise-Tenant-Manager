import { DashboardLayout } from "@/components/dashboard-layout";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { 
  Building2, 
  User, 
  Palette, 
  CreditCard, 
  Shield, 
  Brush,
  Bell,
  Users
} from "lucide-react";

interface SettingsLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}

const settingsNavItems = [
  { href: "/settings/profile", label: "Profile", icon: User },
  { href: "/settings/business", label: "Business", icon: Building2 },
  { href: "/settings/branding", label: "Branding", icon: Brush },
  { href: "/settings/appearance", label: "Appearance", icon: Palette },
  { href: "/settings/notifications", label: "Notifications", icon: Bell },
  { href: "/settings/billing", label: "Billing", icon: CreditCard },
  { href: "/settings/portal", label: "Customer Portal", icon: Users },
  { href: "/settings/security", label: "Security", icon: Shield },
];

export function SettingsLayout({ children, title, subtitle }: SettingsLayoutProps) {
  const [location] = useLocation();

  return (
    <DashboardLayout 
      title="Settings" 
      breadcrumbs={[
        { label: "Settings", href: "/settings" },
        { label: title }
      ]}
    >
      <div className="flex flex-col lg:flex-row min-h-[calc(100vh-180px)]">
        {/* Left Settings Nav - Zoho-style */}
        <aside className="w-full lg:w-56 shrink-0 border-b lg:border-b-0 lg:border-r bg-muted/30">
          <nav className="flex lg:flex-col gap-0.5 p-2 overflow-x-auto lg:overflow-visible">
            {settingsNavItems.map((item) => {
              const isActive = location === item.href || 
                (location.startsWith(item.href) && item.href !== "/settings");
              const Icon = item.icon;
              
              return (
                <Link key={item.href} href={item.href}>
                  <div
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap cursor-pointer transition-colors",
                      isActive 
                        ? "bg-primary/10 text-primary" 
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                    data-testid={`nav-settings-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </div>
                </Link>
              );
            })}
          </nav>
        </aside>
        
        {/* Right Content Panel - Zoho-style */}
        <main className="flex-1 min-w-0 p-4 lg:p-6 max-w-4xl">
          {children}
        </main>
      </div>
    </DashboardLayout>
  );
}
