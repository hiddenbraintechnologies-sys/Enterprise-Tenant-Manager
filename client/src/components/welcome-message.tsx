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
  real_estate: {
    title: "Welcome to Your Real Estate Dashboard",
    subtitle: "Manage properties, leads, and transactions efficiently",
    gradient: "from-slate-500/10 to-zinc-500/10 dark:from-slate-500/20 dark:to-zinc-500/20",
  },
  tourism: {
    title: "Welcome to Your Tourism Dashboard",
    subtitle: "Manage tours, bookings, and travel packages with ease",
    gradient: "from-teal-500/10 to-cyan-500/10 dark:from-teal-500/20 dark:to-cyan-500/20",
  },
  education: {
    title: "Welcome to Your Education Dashboard",
    subtitle: "Manage students, courses, and academic programs efficiently",
    gradient: "from-indigo-500/10 to-blue-500/10 dark:from-indigo-500/20 dark:to-blue-500/20",
  },
  logistics: {
    title: "Welcome to Your Logistics Dashboard",
    subtitle: "Manage vehicles, shipments, and deliveries seamlessly",
    gradient: "from-amber-500/10 to-orange-500/10 dark:from-amber-500/20 dark:to-orange-500/20",
  },
  legal: {
    title: "Welcome to Your Legal Practice Dashboard",
    subtitle: "Manage cases, clients, and legal documents with precision",
    gradient: "from-slate-500/10 to-gray-500/10 dark:from-slate-500/20 dark:to-gray-500/20",
  },
  furniture_manufacturing: {
    title: "Welcome to Your Furniture Manufacturing Dashboard",
    subtitle: "Manage production, inventory, and sales with efficiency",
    gradient: "from-amber-500/10 to-yellow-500/10 dark:from-amber-500/20 dark:to-yellow-500/20",
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
