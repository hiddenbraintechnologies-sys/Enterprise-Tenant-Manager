import { SettingsLayout } from "@/components/settings-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/use-auth";
import { User } from "lucide-react";

export default function ProfileSettings() {
  const { user } = useAuth();

  const getInitials = (firstName?: string | null, lastName?: string | null) => {
    const first = firstName?.charAt(0) || "";
    const last = lastName?.charAt(0) || "";
    return (first + last).toUpperCase() || "U";
  };

  return (
    <SettingsLayout title="Profile">
      <Card className="rounded-2xl">
        <CardHeader className="space-y-1 p-4 sm:p-6 pb-0 sm:pb-0">
          <div className="flex items-center gap-2">
            <User className="h-5 w-5" />
            <CardTitle className="text-lg font-semibold">Profile</CardTitle>
          </div>
          <CardDescription>Your personal account information</CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 space-y-4">
          <div className="flex items-center gap-6">
            <Avatar className="h-20 w-20">
              <AvatarImage src={user?.profileImageUrl || undefined} alt={user?.firstName || "User"} />
              <AvatarFallback className="text-lg">
                {getInitials(user?.firstName, user?.lastName)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="text-lg font-medium" data-testid="text-profile-name">
                {user?.firstName} {user?.lastName}
              </h3>
              <p className="text-sm text-muted-foreground" data-testid="text-profile-email">
                {user?.email}
              </p>
            </div>
          </div>
          <Separator />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                defaultValue={user?.firstName || ""}
                placeholder="First name"
                disabled
                data-testid="input-first-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                defaultValue={user?.lastName || ""}
                placeholder="Last name"
                disabled
                data-testid="input-last-name"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                defaultValue={user?.email || ""}
                placeholder="Email"
                disabled
                data-testid="input-email"
              />
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Profile information is managed through your account provider.
          </p>
        </CardContent>
      </Card>
    </SettingsLayout>
  );
}
