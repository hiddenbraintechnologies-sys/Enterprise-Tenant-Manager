import { SettingsLayout } from "@/components/settings-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { 
  Building2, 
  User, 
  Palette, 
  CreditCard, 
  Shield, 
  Brush,
  Bell,
  Users,
  ChevronRight
} from "lucide-react";

const settingsSections = [
  { 
    href: "/settings/profile", 
    label: "Profile", 
    description: "Your personal account information",
    icon: User 
  },
  { 
    href: "/settings/business", 
    label: "Business", 
    description: "Business name, timezone, and currency",
    icon: Building2 
  },
  { 
    href: "/settings/branding", 
    label: "Branding", 
    description: "Logo, colors, and communication identity",
    icon: Brush 
  },
  { 
    href: "/settings/appearance", 
    label: "Appearance", 
    description: "Theme and display preferences",
    icon: Palette 
  },
  { 
    href: "/settings/notifications", 
    label: "Notifications", 
    description: "Email and push notification preferences",
    icon: Bell 
  },
  { 
    href: "/settings/billing", 
    label: "Billing", 
    description: "Subscription and add-ons",
    icon: CreditCard 
  },
  { 
    href: "/settings/portal", 
    label: "Customer Portal", 
    description: "Customer self-service portal settings",
    icon: Users 
  },
  { 
    href: "/settings/security", 
    label: "Security", 
    description: "Account security settings",
    icon: Shield 
  },
];

export default function SettingsHome() {
  const { user } = useAuth();

  const getInitials = (firstName?: string | null, lastName?: string | null) => {
    const first = firstName?.charAt(0) || "";
    const last = lastName?.charAt(0) || "";
    return (first + last).toUpperCase() || "U";
  };

  return (
    <SettingsLayout title="Settings">
      <div className="space-y-6">
        <Card>
          <CardContent className="flex items-center gap-4 py-6">
            <Avatar className="h-16 w-16">
              <AvatarImage src={user?.profileImageUrl || undefined} alt={user?.firstName || "User"} />
              <AvatarFallback className="text-lg">
                {getInitials(user?.firstName, user?.lastName)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-semibold truncate" data-testid="text-user-name">
                {user?.firstName} {user?.lastName}
              </h2>
              <p className="text-sm text-muted-foreground truncate" data-testid="text-user-email">
                {user?.email}
              </p>
            </div>
            <Link href="/settings/profile">
              <Button variant="ghost" size="sm" data-testid="button-view-profile">
                View profile
              </Button>
            </Link>
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {settingsSections.map((section) => {
            const Icon = section.icon;
            return (
              <Link key={section.href} href={section.href}>
                <Card className="h-full cursor-pointer hover-elevate transition-colors" data-testid={`tile-${section.label.toLowerCase()}`}>
                  <CardContent className="flex items-start gap-4 py-5">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium">{section.label}</h3>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {section.description}
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </SettingsLayout>
  );
}
