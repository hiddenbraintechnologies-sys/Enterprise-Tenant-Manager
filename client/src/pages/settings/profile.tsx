import { SettingsLayout } from "@/components/settings-layout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/use-auth";

export default function ProfileSettings() {
  const { user } = useAuth();

  const getInitials = (firstName?: string | null, lastName?: string | null) => {
    const first = firstName?.charAt(0) || "";
    const last = lastName?.charAt(0) || "";
    return (first + last).toUpperCase() || "U";
  };

  return (
    <SettingsLayout title="Profile">
      <div className="space-y-6">
        <header>
          <h1 className="text-xl font-semibold">Profile</h1>
          <p className="text-sm text-muted-foreground">
            Your personal account information
          </p>
        </header>

        <Separator />

        {/* Profile Photo Section */}
        <section className="space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Photo</h2>
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={user?.profileImageUrl || undefined} alt={user?.firstName || "User"} />
              <AvatarFallback className="text-lg">
                {getInitials(user?.firstName, user?.lastName)}
              </AvatarFallback>
            </Avatar>
            <div className="text-sm text-muted-foreground">
              Managed externally
            </div>
          </div>
        </section>

        <Separator />

        {/* Personal Information Section */}
        <section className="space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Personal information</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="firstName">First name</Label>
              <Input
                id="firstName"
                value={user?.firstName || ""}
                disabled
                className="bg-muted"
                data-testid="input-first-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last name</Label>
              <Input
                id="lastName"
                value={user?.lastName || ""}
                disabled
                className="bg-muted"
                data-testid="input-last-name"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              value={user?.email || ""}
              disabled
              className="bg-muted"
              data-testid="input-email"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Profile details are managed externally. Contact support if you need to make changes.
          </p>
        </section>
      </div>
    </SettingsLayout>
  );
}
