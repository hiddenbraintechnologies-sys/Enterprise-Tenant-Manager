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
      {/* Mobile: Horizontal scrollable tabs */}
      <div className="lg:hidden mb-4 -mx-4 px-4 overflow-x-auto border-b">
        <nav className="flex gap-1 pb-2 min-w-max">
          {settingsNavItems.map((item) => {
            const isActive = location === item.href || 
              (location.startsWith(item.href) && item.href !== "/settings");
            const Icon = item.icon;
            
            return (
              <Link key={item.href} href={item.href}>
                <div
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap cursor-pointer transition-colors",
                    isActive 
                      ? "bg-primary text-primary-foreground" 
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </div>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Desktop: Two-column layout */}
      <div className="flex gap-6">
        {/* Left Settings Nav - Desktop only */}
        <aside className="hidden lg:block w-52 shrink-0">
          <nav className="sticky top-4 space-y-1">
            {settingsNavItems.map((item) => {
              const isActive = location === item.href || 
                (location.startsWith(item.href) && item.href !== "/settings");
              const Icon = item.icon;
              
              return (
                <Link key={item.href} href={item.href}>
                  <div
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium cursor-pointer transition-colors",
                      isActive 
                        ? "bg-primary text-primary-foreground" 
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
        
        {/* Right Content Panel */}
        <main className="flex-1 min-w-0 max-w-3xl">
          {children}
        </main>
      </div>
    </DashboardLayout>
  );
}
