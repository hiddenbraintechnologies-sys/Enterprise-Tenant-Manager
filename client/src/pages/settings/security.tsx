import { SettingsLayout } from "@/components/settings-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Key, Smartphone, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export default function SecuritySettings() {
  return (
    <SettingsLayout title="Security">
      <Card className="rounded-2xl">
        <CardHeader className="space-y-1 p-4 sm:p-6 pb-0 sm:pb-0">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            <CardTitle className="text-lg font-semibold">Security</CardTitle>
          </div>
          <CardDescription>Manage your account security settings</CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 space-y-4">
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
            <Button variant="outline" disabled data-testid="button-change-password">
              Change
            </Button>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <Smartphone className="h-4 w-4" />
              </div>
              <div>
                <p className="font-medium">Two-Factor Authentication</p>
                <p className="text-sm text-muted-foreground">
                  Add an extra layer of security to your account
                </p>
              </div>
            </div>
            <Button variant="outline" disabled data-testid="button-enable-2fa">
              Enable
            </Button>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <History className="h-4 w-4" />
              </div>
              <div>
                <p className="font-medium">Login History</p>
                <p className="text-sm text-muted-foreground">
                  View recent login activity on your account
                </p>
              </div>
            </div>
            <Button variant="outline" disabled data-testid="button-view-history">
              View
            </Button>
          </div>

          <div className="rounded-lg bg-muted/50 p-4">
            <p className="text-sm text-muted-foreground">
              Security settings are managed externally. Contact support if you need assistance.
            </p>
          </div>
        </CardContent>
      </Card>
    </SettingsLayout>
  );
}
