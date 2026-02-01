import { useState } from "react";
import { SettingsLayout } from "@/components/settings-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Users, Copy, RefreshCw, ExternalLink, Link as LinkIcon } from "lucide-react";

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
      toast({ title: "Settings updated", description: "Customer portal settings saved." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update portal settings.", variant: "destructive" });
    },
  });

  const regenerateTokenMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/customer-portal/regenerate-token"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customer-portal/settings"] });
      toast({ title: "Token regenerated", description: "A new portal link has been created." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to regenerate token.", variant: "destructive" });
    },
  });

  const copyPortalLink = () => {
    if (portalSettings?.portalUrl) {
      navigator.clipboard.writeText(portalSettings.portalUrl);
      toast({ title: "Copied!", description: "Portal link copied to clipboard." });
    }
  };

  return (
    <SettingsLayout title="Customer Portal">
      <Card className="rounded-2xl">
        <CardHeader className="space-y-1 p-4 sm:p-6 pb-0 sm:pb-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              <CardTitle className="text-lg font-semibold">Customer Portal</CardTitle>
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
          </div>
          <CardDescription>
            Allow customers to view their invoices and bookings
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 space-y-4">
          {isLoading ? (
            <div className="py-4 text-center text-sm text-muted-foreground">
              Loading portal settings...
            </div>
          ) : portalSettings ? (
            <>
              <div className="space-y-2">
                <Label>Portal Link</Label>
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
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Self Registration</p>
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
                    <p className="font-medium">Profile Editing</p>
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
                    <p className="font-medium">Invoice Viewing</p>
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
                    <p className="font-medium">Online Payments</p>
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

              <Separator />

              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium">Regenerate Portal Link</p>
                  <p className="text-xs text-muted-foreground">
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
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Portal settings not available.
            </p>
          )}
        </CardContent>
      </Card>
    </SettingsLayout>
  );
}
