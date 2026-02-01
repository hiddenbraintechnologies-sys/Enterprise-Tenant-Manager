import { SettingsLayout } from "@/components/settings-layout";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Key, Smartphone, History } from "lucide-react";

export default function SecuritySettings() {
  return (
    <SettingsLayout title="Security">
      <div className="space-y-6">
        <header>
          <h1 className="text-xl font-semibold">Security</h1>
          <p className="text-sm text-muted-foreground">
            Manage your account security settings
          </p>
        </header>

        <Separator />

        {/* Password Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <Key className="h-4 w-4" />
              </div>
              <div>
                <p className="font-medium">Password</p>
                <p className="text-sm text-muted-foreground">
                  Managed externally
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" disabled data-testid="button-change-password">
              Change
            </Button>
          </div>
        </section>

        <Separator />

        {/* 2FA Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <Smartphone className="h-4 w-4" />
              </div>
              <div>
                <p className="font-medium">Two-factor authentication</p>
                <p className="text-sm text-muted-foreground">
                  Add an extra layer of security
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" disabled data-testid="button-enable-2fa">
              Enable
            </Button>
          </div>
        </section>

        <Separator />

        {/* Login History Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <History className="h-4 w-4" />
              </div>
              <div>
                <p className="font-medium">Login history</p>
                <p className="text-sm text-muted-foreground">
                  View recent login activity
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" disabled data-testid="button-view-history">
              View
            </Button>
          </div>
        </section>

        <div className="rounded-lg bg-muted/50 p-4 mt-4">
          <p className="text-sm text-muted-foreground">
            Security settings are managed externally. Contact support if you need assistance.
          </p>
        </div>
      </div>
    </SettingsLayout>
  );
}
