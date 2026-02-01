import { SettingsLayout } from "@/components/settings-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ExternalLink } from "lucide-react";
import { MyAddons } from "@/components/my-addons";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";

interface Subscription {
  planName: string;
  status: string;
  currentPeriodEnd?: string;
}

export default function BillingSettings() {
  const { data: subscription, isLoading } = useQuery<Subscription>({
    queryKey: ["/subscription"],
  });

  return (
    <SettingsLayout title="Billing">
      <div className="space-y-6">
        <header>
          <h1 className="text-xl font-semibold">Billing</h1>
          <p className="text-sm text-muted-foreground">
            Manage your subscription and billing
          </p>
        </header>

        <Separator />

        {/* Current Plan Section */}
        <section className="space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Current plan</h2>
          {isLoading ? (
            <div className="py-4 text-sm text-muted-foreground">
              Loading subscription...
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium" data-testid="text-plan-name">
                    {subscription?.planName || "Free Plan"}
                  </span>
                  <Badge variant={subscription?.status === "active" ? "default" : "secondary"}>
                    {subscription?.status || "Active"}
                  </Badge>
                </div>
                {subscription?.currentPeriodEnd && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Renews on {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                  </p>
                )}
              </div>
              <Link href="/pricing">
                <Button variant="outline" size="sm" data-testid="button-manage-subscription">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Manage plan
                </Button>
              </Link>
            </div>
          )}
        </section>

        <Separator />

        {/* Add-ons Section */}
        <section className="space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Add-ons</h2>
          <MyAddons />
        </section>
      </div>
    </SettingsLayout>
  );
}
