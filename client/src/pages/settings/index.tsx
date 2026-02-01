import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { 
  Building2, 
  Palette, 
  User, 
  Bell, 
  Shield, 
  Users,
  ChevronRight,
  Sparkles
} from "lucide-react";

const settingsSections = [
  {
    title: "Profile",
    description: "Your personal account information",
    href: "/settings/profile",
    icon: User,
  },
  {
    title: "Business",
    description: "Business name, type, timezone, and currency",
    href: "/settings/business",
    icon: Building2,
  },
  {
    title: "Branding",
    description: "Logo, colors, and email branding",
    href: "/settings/branding",
    icon: Palette,
  },
  {
    title: "Appearance",
    description: "Theme and display preferences",
    href: "/settings/appearance",
    icon: Sparkles,
  },
  {
    title: "Notifications",
    description: "Email and push notification preferences",
    href: "/settings/notifications",
    icon: Bell,
  },
  {
    title: "Customer Portal",
    description: "Self-service portal for your customers",
    href: "/settings/portal",
    icon: Users,
  },
  {
    title: "Security",
    description: "Account security and access",
    href: "/settings/security",
    icon: Shield,
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
    <DashboardLayout title="Settings" breadcrumbs={[{ label: "Settings" }]}>
      <div className="space-y-6">
        <Card>
          <CardContent className="flex items-center gap-4 py-6">
            <Avatar className="h-16 w-16">
              <AvatarImage src={user?.profileImageUrl || undefined} alt={user?.firstName || "User"} />
              <AvatarFallback className="text-xl">
                {getInitials(user?.firstName, user?.lastName)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h2 className="text-xl font-semibold" data-testid="text-profile-name">
                {user?.firstName} {user?.lastName}
              </h2>
              <p className="text-sm text-muted-foreground" data-testid="text-profile-email">
                {user?.email}
              </p>
            </div>
            <Link href="/settings/profile">
              <span className="text-sm text-primary hover:underline cursor-pointer" data-testid="link-edit-profile">
                Edit profile
              </span>
            </Link>
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {settingsSections.map((section) => (
            <Link key={section.href} href={section.href}>
              <Card className="h-full cursor-pointer hover-elevate transition-colors" data-testid={`card-settings-${section.title.toLowerCase().replace(/\s+/g, "-")}`}>
                <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                      <section.icon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-medium">{section.title}</CardTitle>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </CardHeader>
                <CardContent className="pt-0">
                  <CardDescription>{section.description}</CardDescription>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
