import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import type { BusinessType } from "@/contexts/tenant-context";

const WELCOME_CONFIG: Record<BusinessType, { title: string; subtitle: string; gradient: string }> = {
  clinic: {
    title: "Welcome to Your Clinic Dashboard",
    subtitle: "Manage patients, appointments, and medical records efficiently",
    gradient: "from-blue-500/10 to-cyan-500/10 dark:from-blue-500/20 dark:to-cyan-500/20",
  },
  salon: {
    title: "Welcome to Your Salon Dashboard",
    subtitle: "Manage clients, services, and appointments with ease",
    gradient: "from-pink-500/10 to-purple-500/10 dark:from-pink-500/20 dark:to-purple-500/20",
  },
  pg: {
    title: "Welcome to Your PG Dashboard",
    subtitle: "Manage tenants, rooms, and payments seamlessly",
    gradient: "from-orange-500/10 to-amber-500/10 dark:from-orange-500/20 dark:to-amber-500/20",
  },
  coworking: {
    title: "Welcome to Your Coworking Dashboard",
    subtitle: "Manage spaces, desks, and bookings effortlessly",
    gradient: "from-green-500/10 to-emerald-500/10 dark:from-green-500/20 dark:to-emerald-500/20",
  },
  service: {
    title: "Welcome to Your Business Dashboard",
    subtitle: "Manage customers, services, and bookings all in one place",
    gradient: "from-violet-500/10 to-indigo-500/10 dark:from-violet-500/20 dark:to-indigo-500/20",
  },
};

interface WelcomeMessageProps {
  businessType?: BusinessType;
}

export function WelcomeMessage({ businessType }: WelcomeMessageProps) {
  const { user, businessType: authBusinessType, tenant } = useAuth();
  const effectiveType = (businessType || authBusinessType || "service") as BusinessType;
  const config = WELCOME_CONFIG[effectiveType] || WELCOME_CONFIG.service;

  const firstName = user?.firstName || "there";
  const businessName = tenant?.name || "your business";

  return (
    <Card className={`mb-6 overflow-hidden border-0 bg-gradient-to-r ${config.gradient}`}>
      <CardContent className="p-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-semibold" data-testid="text-welcome-title">
            Hello, {firstName}!
          </h2>
          <p className="text-muted-foreground" data-testid="text-welcome-subtitle">
            {config.subtitle} at <span className="font-medium text-foreground">{businessName}</span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
