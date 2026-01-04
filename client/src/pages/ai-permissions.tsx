import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Bot, Settings, BarChart3, RefreshCw, Shield, Zap, Save } from "lucide-react";
import type { Role } from "@shared/schema";

type AiFeature = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  category: string | null;
  isActive: boolean;
  defaultEnabled: boolean;
  defaultUsageLimit: number | null;
  defaultResetWindow: string;
  riskLevel: string;
  requiredTier: string | null;
};

type RoleAiSetting = {
  featureId: string;
  featureCode: string;
  featureName: string;
  category: string | null;
  isEnabled: boolean;
  usageLimit: number | null;
  resetWindow: string;
  currentUsage: number;
  remainingUsage: number | null;
};

type UsageStat = {
  roleId: string;
  roleName: string;
  featureId: string;
  featureCode: string;
  featureName: string;
  usageCount: number;
  usageLimit: number | null;
  periodStart: string;
  periodEnd: string;
};

function FeatureCard({ feature }: { feature: AiFeature }) {
  return (
    <Card data-testid={`card-feature-${feature.code}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">{feature.name}</CardTitle>
          <Badge
            variant={feature.riskLevel === "low" ? "secondary" : feature.riskLevel === "medium" ? "outline" : "destructive"}
            className="text-xs"
            data-testid={`badge-risk-${feature.code}`}
          >
            {feature.riskLevel} risk
          </Badge>
        </div>
        <CardDescription className="text-sm">{feature.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          {feature.category && (
            <Badge variant="outline" className="text-xs" data-testid={`badge-category-${feature.code}`}>
              {feature.category}
            </Badge>
          )}
          <span>Default: {feature.defaultEnabled ? "Enabled" : "Disabled"}</span>
          {feature.defaultUsageLimit && (
            <span>Limit: {feature.defaultUsageLimit}/{feature.defaultResetWindow}</span>
          )}
          {feature.requiredTier && (
            <Badge variant="secondary" className="text-xs">
              {feature.requiredTier}+ tier
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function RoleSettingsPanel({
  roleId,
  roleName,
}: {
  roleId: string;
  roleName: string;
}) {
  const { toast } = useToast();
  const [editingFeature, setEditingFeature] = useState<RoleAiSetting | null>(null);
  const [editValues, setEditValues] = useState<{
    isEnabled: boolean;
    usageLimit: string;
    resetWindow: string;
  }>({ isEnabled: true, usageLimit: "", resetWindow: "monthly" });

  const { data, isLoading } = useQuery<{ settings: RoleAiSetting[] }>({
    queryKey: ["/api/ai/permissions/roles", roleId, "settings"],
    queryFn: async () => {
      const res = await fetch(`/api/ai/permissions/roles/${roleId}/settings`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch settings");
      return res.json();
    },
    enabled: !!roleId,
  });

  const updateMutation = useMutation({
    mutationFn: async (params: { featureId: string; updates: any }) => {
      return apiRequest(
        "PATCH",
        `/api/ai/permissions/roles/${roleId}/features/${params.featureId}`,
        params.updates
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/ai/permissions/roles", roleId, "settings"],
      });
      toast({ title: "Settings updated" });
      setEditingFeature(null);
    },
    onError: (error: any) => {
      toast({ title: "Failed to update", description: error.message, variant: "destructive" });
    },
  });

  const handleEdit = (setting: RoleAiSetting) => {
    setEditingFeature(setting);
    setEditValues({
      isEnabled: setting.isEnabled,
      usageLimit: setting.usageLimit?.toString() || "",
      resetWindow: setting.resetWindow,
    });
  };

  const handleSave = () => {
    if (!editingFeature) return;
    updateMutation.mutate({
      featureId: editingFeature.featureId,
      updates: {
        isEnabled: editValues.isEnabled,
        usageLimit: editValues.usageLimit ? parseInt(editValues.usageLimit) : null,
        resetWindow: editValues.resetWindow,
      },
    });
  };

  const handleToggle = (setting: RoleAiSetting) => {
    updateMutation.mutate({
      featureId: setting.featureId,
      updates: { isEnabled: !setting.isEnabled },
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  return (
    <>
      <Card data-testid={`card-role-settings-${roleId}`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Shield className="h-5 w-5" />
            {roleName} AI Permissions
          </CardTitle>
          <CardDescription>
            Configure which AI features are available to users with this role
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Feature</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Usage</TableHead>
                <TableHead>Limit</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.settings?.map((setting) => (
                <TableRow key={setting.featureId} data-testid={`row-setting-${setting.featureCode}`}>
                  <TableCell className="font-medium">{setting.featureName}</TableCell>
                  <TableCell>
                    {setting.category && (
                      <Badge variant="outline" className="text-xs">
                        {setting.category}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={setting.isEnabled}
                      onCheckedChange={() => handleToggle(setting)}
                      disabled={updateMutation.isPending}
                      data-testid={`switch-enable-${setting.featureCode}`}
                    />
                  </TableCell>
                  <TableCell>
                    <span className="text-sm" data-testid={`text-usage-${setting.featureCode}`}>
                      {setting.currentUsage}
                      {setting.usageLimit != null && ` / ${setting.usageLimit}`}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {setting.usageLimit ?? "Unlimited"} / {setting.resetWindow}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(setting)}
                      data-testid={`button-edit-${setting.featureCode}`}
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!editingFeature} onOpenChange={() => setEditingFeature(null)}>
        <DialogContent data-testid="dialog-edit-settings">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              Edit {editingFeature?.featureName}
            </DialogTitle>
            <DialogDescription>
              Configure AI feature settings for {roleName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="enabled">Enable Feature</Label>
              <Switch
                id="enabled"
                checked={editValues.isEnabled}
                onCheckedChange={(checked) =>
                  setEditValues((prev) => ({ ...prev, isEnabled: checked }))
                }
                data-testid="switch-edit-enabled"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="usageLimit">Usage Limit (leave empty for unlimited)</Label>
              <Input
                id="usageLimit"
                type="number"
                value={editValues.usageLimit}
                onChange={(e) =>
                  setEditValues((prev) => ({ ...prev, usageLimit: e.target.value }))
                }
                placeholder="e.g., 100"
                data-testid="input-usage-limit"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="resetWindow">Reset Window</Label>
              <Select
                value={editValues.resetWindow}
                onValueChange={(value) =>
                  setEditValues((prev) => ({ ...prev, resetWindow: value }))
                }
              >
                <SelectTrigger data-testid="select-reset-window">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingFeature(null)} data-testid="button-cancel-edit">
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={updateMutation.isPending} data-testid="button-save-settings">
              {updateMutation.isPending ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function UsageStatsPanel() {
  const { data, isLoading } = useQuery<{ stats: UsageStat[] }>({
    queryKey: ["/api/ai/permissions/usage-stats"],
    queryFn: async () => {
      const res = await fetch("/api/ai/permissions/usage-stats", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (!data?.stats?.length) {
    return (
      <Card data-testid="card-no-usage">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <BarChart3 className="h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-medium" data-testid="text-no-usage-title">No usage data yet</h3>
          <p className="mt-2 text-sm text-muted-foreground" data-testid="text-no-usage-message">
            Usage statistics will appear here as AI features are used
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="card-usage-stats">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <BarChart3 className="h-5 w-5" />
          AI Usage Statistics
        </CardTitle>
        <CardDescription>View usage patterns across roles and features</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Role</TableHead>
              <TableHead>Feature</TableHead>
              <TableHead>Usage</TableHead>
              <TableHead>Period</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.stats.map((stat, idx) => (
              <TableRow key={idx} data-testid={`row-stat-${stat.roleId}-${stat.featureCode}`}>
                <TableCell className="font-medium">{stat.roleName}</TableCell>
                <TableCell>{stat.featureName}</TableCell>
                <TableCell>
                  <span data-testid={`text-stat-usage-${stat.roleId}-${stat.featureCode}`}>
                    {stat.usageCount}
                    {stat.usageLimit != null && ` / ${stat.usageLimit}`}
                  </span>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {new Date(stat.periodStart).toLocaleDateString()} -{" "}
                  {new Date(stat.periodEnd).toLocaleDateString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export default function AiPermissions() {
  const { toast } = useToast();
  const [selectedRoleId, setSelectedRoleId] = useState<string>("");

  const { data: featuresData, isLoading: featuresLoading } = useQuery<{ features: AiFeature[] }>({
    queryKey: ["/api/ai/permissions/features"],
    queryFn: async () => {
      const res = await fetch("/api/ai/permissions/features", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch features");
      return res.json();
    },
  });

  const { data: rolesData, isLoading: rolesLoading } = useQuery<{ roles: Role[] }>({
    queryKey: ["/api/ai/permissions/roles"],
    queryFn: async () => {
      const res = await fetch("/api/ai/permissions/roles", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch roles");
      return res.json();
    },
  });

  const seedMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/ai/permissions/seed-features", {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai/permissions/features"] });
      toast({ title: "Default AI features seeded" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to seed features", description: error.message, variant: "destructive" });
    },
  });

  const selectedRole = rolesData?.roles?.find((r) => r.id === selectedRoleId);

  return (
    <DashboardLayout
      title="AI Permissions"
      breadcrumbs={[{ label: "Settings" }, { label: "AI Permissions" }]}
    >
      <Tabs defaultValue="features" className="space-y-6">
        <TabsList>
          <TabsTrigger value="features" data-testid="tab-features">
            <Bot className="mr-2 h-4 w-4" />
            Feature Catalog
          </TabsTrigger>
          <TabsTrigger value="roles" data-testid="tab-roles">
            <Shield className="mr-2 h-4 w-4" />
            Role Access
          </TabsTrigger>
          <TabsTrigger value="usage" data-testid="tab-usage">
            <BarChart3 className="mr-2 h-4 w-4" />
            Usage Limits
          </TabsTrigger>
        </TabsList>

        <TabsContent value="features" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">AI Feature Catalog</h2>
              <p className="text-sm text-muted-foreground">
                Available AI features that can be enabled per role
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => seedMutation.mutate()}
              disabled={seedMutation.isPending}
              data-testid="button-seed-features"
            >
              {seedMutation.isPending ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Zap className="mr-2 h-4 w-4" />
              )}
              Seed Default Features
            </Button>
          </div>

          {featuresLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
          ) : featuresData?.features?.length ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {featuresData.features.map((feature) => (
                <FeatureCard key={feature.id} feature={feature} />
              ))}
            </div>
          ) : (
            <Card data-testid="card-no-features">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Bot className="h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-medium" data-testid="text-no-features-title">
                  No AI features configured
                </h3>
                <p className="mt-2 text-sm text-muted-foreground" data-testid="text-no-features-message">
                  Click "Seed Default Features" to add the standard AI features
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="roles" className="space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Role-Based AI Access</h2>
              <p className="text-sm text-muted-foreground">
                Configure AI features for each role in your organization
              </p>
            </div>
            <div className="w-full sm:w-64">
              <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
                <SelectTrigger data-testid="select-role">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {rolesData?.roles?.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {rolesLoading ? (
            <Skeleton className="h-64" />
          ) : selectedRole ? (
            <RoleSettingsPanel
              roleId={selectedRole.id}
              roleName={selectedRole.name}
            />
          ) : (
            <Card data-testid="card-select-role">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Shield className="h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-medium" data-testid="text-select-role-title">
                  Select a role
                </h3>
                <p className="mt-2 text-sm text-muted-foreground" data-testid="text-select-role-message">
                  Choose a role from the dropdown to configure its AI permissions
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="usage" className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold">Usage Limits & Statistics</h2>
            <p className="text-sm text-muted-foreground">
              Monitor AI usage across roles and manage limits
            </p>
          </div>
          <UsageStatsPanel />
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}
