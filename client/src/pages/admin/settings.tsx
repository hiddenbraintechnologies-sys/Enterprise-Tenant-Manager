import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useAdmin, AdminGuard, SuperAdminGuard } from "@/contexts/admin-context";
import { useState } from "react";
import {
  Cog,
  Shield,
  Lock,
  Key,
  Clock,
  Globe,
  Bell,
  Database,
  Save,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface SecurityConfig {
  maxLoginAttempts: number;
  lockoutDurationMinutes: number;
  sessionTimeoutMinutes: number;
  sessionAbsoluteTimeoutHours: number;
  requireIpWhitelist: boolean;
  require2FA: boolean;
  require2FAForSuperAdmin: boolean;
  passwordExpiryDays: number;
  minPasswordLength: number;
  auditLogRetentionDays: number;
}

interface SystemConfig {
  maintenanceMode: boolean;
  allowNewRegistrations: boolean;
  defaultTrialDays: number;
  maxTenantsPerAccount: number;
  apiRateLimitPerMinute: number;
}

function SettingsContent() {
  const { isSuperAdmin } = useAdmin();
  const { toast } = useToast();

  const { data: securityConfig, isLoading: securityLoading } = useQuery<SecurityConfig>({
    queryKey: ["/api/platform-admin/settings/security"],
    staleTime: 60 * 1000,
  });

  const { data: systemConfig, isLoading: systemLoading } = useQuery<SystemConfig>({
    queryKey: ["/api/platform-admin/settings/system"],
    staleTime: 60 * 1000,
  });

  const [localSecurityConfig, setLocalSecurityConfig] = useState<Partial<SecurityConfig>>({});
  const [localSystemConfig, setLocalSystemConfig] = useState<Partial<SystemConfig>>({});

  const saveSecurityMutation = useMutation({
    mutationFn: async (config: Partial<SecurityConfig>) => {
      return apiRequest("PATCH", "/api/platform-admin/settings/security", config);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/platform-admin/settings/security"] });
      toast({ title: "Security settings saved" });
      setLocalSecurityConfig({});
    },
    onError: () => {
      toast({ title: "Failed to save security settings", variant: "destructive" });
    },
  });

  const saveSystemMutation = useMutation({
    mutationFn: async (config: Partial<SystemConfig>) => {
      return apiRequest("PATCH", "/api/platform-admin/settings/system", config);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/platform-admin/settings/system"] });
      toast({ title: "System settings saved" });
      setLocalSystemConfig({});
    },
    onError: () => {
      toast({ title: "Failed to save system settings", variant: "destructive" });
    },
  });

  const mergedSecurityConfig = { ...securityConfig, ...localSecurityConfig } as SecurityConfig;
  const mergedSystemConfig = { ...systemConfig, ...localSystemConfig } as SystemConfig;

  const hasSecurityChanges = Object.keys(localSecurityConfig).length > 0;
  const hasSystemChanges = Object.keys(localSystemConfig).length > 0;

  if (securityLoading || systemLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-6">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-64" />
              </CardHeader>
              <CardContent className="space-y-4">
                {[...Array(4)].map((_, j) => (
                  <Skeleton key={j} className="h-10 w-full" />
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground" data-testid="text-settings-title">
            System Settings
          </h1>
          <p className="text-muted-foreground">
            Configure platform-wide security and system settings
          </p>
        </div>
        <Badge variant="outline" className="gap-1">
          <Shield className="h-3 w-3" />
          {isSuperAdmin ? "Super Admin Access" : "Limited Access"}
        </Badge>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Security Settings
            </CardTitle>
            <CardDescription>Configure authentication and security policies</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="maxLoginAttempts">Max Login Attempts</Label>
                <Input
                  id="maxLoginAttempts"
                  type="number"
                  value={mergedSecurityConfig?.maxLoginAttempts || 5}
                  onChange={(e) => setLocalSecurityConfig(prev => ({
                    ...prev,
                    maxLoginAttempts: parseInt(e.target.value),
                  }))}
                  data-testid="input-max-login-attempts"
                />
                <p className="text-xs text-muted-foreground">Failed attempts before lockout</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="lockoutDuration">Lockout Duration (minutes)</Label>
                <Input
                  id="lockoutDuration"
                  type="number"
                  value={mergedSecurityConfig?.lockoutDurationMinutes || 30}
                  onChange={(e) => setLocalSecurityConfig(prev => ({
                    ...prev,
                    lockoutDurationMinutes: parseInt(e.target.value),
                  }))}
                  data-testid="input-lockout-duration"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sessionTimeout">Session Timeout (minutes)</Label>
                <Input
                  id="sessionTimeout"
                  type="number"
                  value={mergedSecurityConfig?.sessionTimeoutMinutes || 60}
                  onChange={(e) => setLocalSecurityConfig(prev => ({
                    ...prev,
                    sessionTimeoutMinutes: parseInt(e.target.value),
                  }))}
                  data-testid="input-session-timeout"
                />
                <p className="text-xs text-muted-foreground">Inactivity timeout</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="absoluteTimeout">Absolute Session Timeout (hours)</Label>
                <Input
                  id="absoluteTimeout"
                  type="number"
                  value={mergedSecurityConfig?.sessionAbsoluteTimeoutHours || 24}
                  onChange={(e) => setLocalSecurityConfig(prev => ({
                    ...prev,
                    sessionAbsoluteTimeoutHours: parseInt(e.target.value),
                  }))}
                  data-testid="input-absolute-timeout"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="minPasswordLength">Minimum Password Length</Label>
                <Input
                  id="minPasswordLength"
                  type="number"
                  value={mergedSecurityConfig?.minPasswordLength || 8}
                  onChange={(e) => setLocalSecurityConfig(prev => ({
                    ...prev,
                    minPasswordLength: parseInt(e.target.value),
                  }))}
                  data-testid="input-min-password"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="passwordExpiry">Password Expiry (days)</Label>
                <Input
                  id="passwordExpiry"
                  type="number"
                  value={mergedSecurityConfig?.passwordExpiryDays || 90}
                  onChange={(e) => setLocalSecurityConfig(prev => ({
                    ...prev,
                    passwordExpiryDays: parseInt(e.target.value),
                  }))}
                  data-testid="input-password-expiry"
                />
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Require IP Whitelist</Label>
                  <p className="text-xs text-muted-foreground">Only allow admin access from whitelisted IPs</p>
                </div>
                <Switch
                  checked={mergedSecurityConfig?.requireIpWhitelist || false}
                  onCheckedChange={(checked) => setLocalSecurityConfig(prev => ({
                    ...prev,
                    requireIpWhitelist: checked,
                  }))}
                  data-testid="switch-ip-whitelist"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Require 2FA for All Admins</Label>
                  <p className="text-xs text-muted-foreground">Enforce two-factor authentication</p>
                </div>
                <Switch
                  checked={mergedSecurityConfig?.require2FA || false}
                  onCheckedChange={(checked) => setLocalSecurityConfig(prev => ({
                    ...prev,
                    require2FA: checked,
                  }))}
                  data-testid="switch-require-2fa"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Require 2FA for Super Admins</Label>
                  <p className="text-xs text-muted-foreground">Enforce 2FA specifically for super admins</p>
                </div>
                <Switch
                  checked={mergedSecurityConfig?.require2FAForSuperAdmin || false}
                  onCheckedChange={(checked) => setLocalSecurityConfig(prev => ({
                    ...prev,
                    require2FAForSuperAdmin: checked,
                  }))}
                  data-testid="switch-require-2fa-super"
                />
              </div>
            </div>

            {hasSecurityChanges && (
              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setLocalSecurityConfig({})}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reset
                </Button>
                <Button
                  onClick={() => saveSecurityMutation.mutate(localSecurityConfig)}
                  disabled={saveSecurityMutation.isPending}
                  data-testid="button-save-security"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Security Settings
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cog className="h-5 w-5" />
              System Configuration
            </CardTitle>
            <CardDescription>Platform-wide system settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="trialDays">Default Trial Days</Label>
                <Input
                  id="trialDays"
                  type="number"
                  value={mergedSystemConfig?.defaultTrialDays || 14}
                  onChange={(e) => setLocalSystemConfig(prev => ({
                    ...prev,
                    defaultTrialDays: parseInt(e.target.value),
                  }))}
                  data-testid="input-trial-days"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxTenants">Max Tenants Per Account</Label>
                <Input
                  id="maxTenants"
                  type="number"
                  value={mergedSystemConfig?.maxTenantsPerAccount || 5}
                  onChange={(e) => setLocalSystemConfig(prev => ({
                    ...prev,
                    maxTenantsPerAccount: parseInt(e.target.value),
                  }))}
                  data-testid="input-max-tenants"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="rateLimit">API Rate Limit (per minute)</Label>
                <Input
                  id="rateLimit"
                  type="number"
                  value={mergedSystemConfig?.apiRateLimitPerMinute || 100}
                  onChange={(e) => setLocalSystemConfig(prev => ({
                    ...prev,
                    apiRateLimitPerMinute: parseInt(e.target.value),
                  }))}
                  data-testid="input-rate-limit"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="logRetention">Audit Log Retention (days)</Label>
                <Input
                  id="logRetention"
                  type="number"
                  value={mergedSecurityConfig?.auditLogRetentionDays || 365}
                  onChange={(e) => setLocalSecurityConfig(prev => ({
                    ...prev,
                    auditLogRetentionDays: parseInt(e.target.value),
                  }))}
                  data-testid="input-log-retention"
                />
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-orange-500" />
                    Maintenance Mode
                  </Label>
                  <p className="text-xs text-muted-foreground">Disable all tenant access temporarily</p>
                </div>
                <Switch
                  checked={mergedSystemConfig?.maintenanceMode || false}
                  onCheckedChange={(checked) => setLocalSystemConfig(prev => ({
                    ...prev,
                    maintenanceMode: checked,
                  }))}
                  data-testid="switch-maintenance"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Allow New Registrations</Label>
                  <p className="text-xs text-muted-foreground">Enable new tenant sign-ups</p>
                </div>
                <Switch
                  checked={mergedSystemConfig?.allowNewRegistrations !== false}
                  onCheckedChange={(checked) => setLocalSystemConfig(prev => ({
                    ...prev,
                    allowNewRegistrations: checked,
                  }))}
                  data-testid="switch-registrations"
                />
              </div>
            </div>

            {hasSystemChanges && (
              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setLocalSystemConfig({})}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reset
                </Button>
                <Button
                  onClick={() => saveSystemMutation.mutate(localSystemConfig)}
                  disabled={saveSystemMutation.isPending}
                  data-testid="button-save-system"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save System Settings
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Database & Storage
            </CardTitle>
            <CardDescription>Database health and storage metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Database metrics coming soon</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function AdminSettings() {
  return (
    <SuperAdminGuard>
      <SettingsContent />
    </SuperAdminGuard>
  );
}
