import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";
import { NotificationBell } from "@/components/notification-bell";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, ArrowLeft, ChevronLeft } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

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
  const [location, setLocation] = useLocation();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();

  // Show loading state while checking authentication
  if (isAuthLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-background">
      {/* Settings Sidebar - Single sidebar replacing main nav */}
      <aside className="hidden lg:flex w-64 flex-col border-r bg-muted/30">
        {/* Back to Dashboard Header */}
        <div className="flex items-center gap-2 p-4 border-b">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setLocation("/dashboard")}
            className="gap-2"
            data-testid="button-back-to-dashboard"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>

        {/* Settings Title */}
        <div className="px-4 py-3">
          <h2 className="text-lg font-semibold">Settings</h2>
        </div>

        {/* Settings Navigation */}
        <nav className="flex-1 overflow-y-auto px-2 pb-4">
          <div className="space-y-1">
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
          </div>
        </nav>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="sticky top-0 z-50 flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4">
          {/* Mobile: Back button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/dashboard")}
            className="lg:hidden -ml-1"
            data-testid="button-back-mobile"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          
          {/* Mobile: Settings title */}
          <span className="lg:hidden font-medium">Settings</span>
          
          {/* Desktop: Current page title */}
          <span className="hidden lg:block font-medium">{title}</span>
          
          <div className="flex items-center gap-2 ml-auto">
            <NotificationBell />
            <ThemeToggle />
          </div>
        </header>

        {/* Mobile Settings Navigation */}
        <div className="lg:hidden border-b overflow-x-auto">
          <nav className="flex gap-1 p-2 min-w-max">
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

        {/* Content */}
        <main className="flex-1 overflow-auto p-4 lg:p-6">
          <div className="max-w-3xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
