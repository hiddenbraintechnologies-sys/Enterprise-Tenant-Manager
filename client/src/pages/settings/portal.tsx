import { SettingsLayout } from "@/components/settings-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Copy, RefreshCw, ExternalLink } from "lucide-react";

interface PortalSettings {
  id: string;
  tenantId: string;
  portalToken: string;
  isEnabled: boolean;
  allowSelfRegistration: boolean;
  allowProfileEdit: boolean;
  allowInvoiceView: boolean;
  allowPayments: boolean;
  welcomeMessage: string | null;
  portalUrl: string;
}

export default function PortalSettings() {
  const { tenant } = useAuth();
  const { toast } = useToast();

  const { data: portalSettings, isLoading } = useQuery<PortalSettings>({
    queryKey: ["/api/customer-portal/settings"],
    enabled: !!tenant,
  });

  const updatePortalMutation = useMutation({
    mutationFn: (data: Partial<PortalSettings>) =>
      apiRequest("PATCH", "/api/customer-portal/settings", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customer-portal/settings"] });
      toast({ title: "Settings updated" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update portal settings.", variant: "destructive" });
    },
  });

  const regenerateTokenMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/customer-portal/regenerate-token"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customer-portal/settings"] });
      toast({ title: "Token regenerated" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to regenerate token.", variant: "destructive" });
    },
  });

  const copyPortalLink = () => {
    if (portalSettings?.portalUrl) {
      navigator.clipboard.writeText(portalSettings.portalUrl);
      toast({ title: "Copied to clipboard" });
    }
  };

  return (
    <SettingsLayout title="Customer Portal">
      <div className="space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Customer Portal</h1>
            <p className="text-sm text-muted-foreground">
              Allow customers to view their invoices and bookings
            </p>
          </div>
          {portalSettings && (
            <Switch
              checked={portalSettings.isEnabled}
              onCheckedChange={(checked) =>
                updatePortalMutation.mutate({ isEnabled: checked })
              }
              disabled={updatePortalMutation.isPending}
              data-testid="switch-portal-enabled"
            />
          )}
        </header>

        <Separator />

        {isLoading ? (
          <div className="py-4 text-sm text-muted-foreground">
            Loading portal settings...
          </div>
        ) : portalSettings ? (
          <>
            {/* Portal Link Section */}
            <section className="space-y-4">
              <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Portal link</h2>
              <div className="flex gap-2">
                <Input
                  value={portalSettings.portalUrl}
                  readOnly
                  className="font-mono text-sm"
                  data-testid="input-portal-url"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={copyPortalLink}
                  data-testid="button-copy-portal-link"
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => window.open(portalSettings.portalUrl, "_blank")}
                  data-testid="button-open-portal"
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </section>

            <Separator />

            {/* Permissions Section */}
            <section className="space-y-4">
              <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Permissions</h2>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Self registration</p>
                    <p className="text-sm text-muted-foreground">
                      Allow customers to create accounts
                    </p>
                  </div>
                  <Switch
                    checked={portalSettings.allowSelfRegistration}
                    onCheckedChange={(checked) =>
                      updatePortalMutation.mutate({ allowSelfRegistration: checked })
                    }
                    disabled={updatePortalMutation.isPending}
                    data-testid="switch-self-registration"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Profile editing</p>
                    <p className="text-sm text-muted-foreground">
                      Allow customers to edit their profile
                    </p>
                  </div>
                  <Switch
                    checked={portalSettings.allowProfileEdit}
                    onCheckedChange={(checked) =>
                      updatePortalMutation.mutate({ allowProfileEdit: checked })
                    }
                    disabled={updatePortalMutation.isPending}
                    data-testid="switch-profile-edit"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Invoice viewing</p>
                    <p className="text-sm text-muted-foreground">
                      Allow customers to view invoices
                    </p>
                  </div>
                  <Switch
                    checked={portalSettings.allowInvoiceView}
                    onCheckedChange={(checked) =>
                      updatePortalMutation.mutate({ allowInvoiceView: checked })
                    }
                    disabled={updatePortalMutation.isPending}
                    data-testid="switch-invoice-view"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Online payments</p>
                    <p className="text-sm text-muted-foreground">
                      Allow customers to pay online
                    </p>
                  </div>
                  <Switch
                    checked={portalSettings.allowPayments}
                    onCheckedChange={(checked) =>
                      updatePortalMutation.mutate({ allowPayments: checked })
                    }
                    disabled={updatePortalMutation.isPending}
                    data-testid="switch-payments"
                  />
                </div>
              </div>
            </section>

            <Separator />

            {/* Regenerate Section */}
            <section className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium">Regenerate portal link</p>
                  <p className="text-sm text-muted-foreground">
                    This will invalidate the current link
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => regenerateTokenMutation.mutate()}
                  disabled={regenerateTokenMutation.isPending}
                  data-testid="button-regenerate-token"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Regenerate
                </Button>
              </div>
            </section>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Portal settings not available.
          </p>
        )}
      </div>
    </SettingsLayout>
  );
}
