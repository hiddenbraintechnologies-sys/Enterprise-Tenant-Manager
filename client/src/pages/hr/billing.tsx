import { DashboardLayout } from "@/components/dashboard-layout";
import { PayrollAddonCard } from "@/components/payroll-addon-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Settings2, CreditCard } from "lucide-react";

export default function HRBillingPage() {
  return (
    <DashboardLayout title="HR Add-ons & Billing">
      <div className="space-y-6 p-6" data-testid="page-hr-billing">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2" data-testid="heading-hr-billing">
            <CreditCard className="h-6 w-6" />
            HR Add-ons & Billing
          </h1>
          <p className="text-muted-foreground mt-1" data-testid="text-hr-billing-description">
            Manage your HR module subscriptions and add-ons
          </p>
        </div>

        <Separator />

        <div className="grid gap-6 md:grid-cols-2" data-testid="grid-addon-cards">
          <PayrollAddonCard />

          <Card data-testid="card-more-addons">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings2 className="h-5 w-5 text-muted-foreground" />
                More Add-ons Coming Soon
              </CardTitle>
              <CardDescription>
                Additional HR modules will be available soon
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-lg border border-dashed p-4 text-center text-muted-foreground" data-testid="addon-recruitment">
                <p className="text-sm">Recruitment Add-on</p>
                <p className="text-xs mt-1">Coming soon</p>
              </div>
              <div className="rounded-lg border border-dashed p-4 text-center text-muted-foreground" data-testid="addon-performance">
                <p className="text-sm">Performance Management Add-on</p>
                <p className="text-xs mt-1">Coming soon</p>
              </div>
              <div className="rounded-lg border border-dashed p-4 text-center text-muted-foreground" data-testid="addon-attendance">
                <p className="text-sm">Time & Attendance Add-on</p>
                <p className="text-xs mt-1">Coming soon</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
