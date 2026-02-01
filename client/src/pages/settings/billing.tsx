import { SettingsLayout } from "@/components/settings-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Package, ExternalLink } from "lucide-react";
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
        <Card className="rounded-2xl">
          <CardHeader className="space-y-1 p-4 sm:p-6 pb-0 sm:pb-0">
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              <CardTitle className="text-lg font-semibold">Subscription</CardTitle>
            </div>
            <CardDescription>Manage your subscription and billing</CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 space-y-4">
            {isLoading ? (
              <div className="py-4 text-center text-sm text-muted-foreground">
                Loading subscription...
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium" data-testid="text-plan-name">
                      {subscription?.planName || "Free Plan"}
                    </h3>
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
                  <Button variant="outline" data-testid="button-manage-subscription">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Manage Plan
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        <MyAddons />
      </div>
    </SettingsLayout>
  );
}
