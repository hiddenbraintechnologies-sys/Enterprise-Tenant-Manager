import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAdmin, AdminGuard } from "@/contexts/admin-context";
import { Link } from "wouter";
import {
  Shield,
  ShieldCheck,
  ShieldOff,
  Key,
  KeyRound,
  Activity,
  AlertTriangle,
  Copy,
  Check,
  Loader2,
  QrCode,
  Smartphone,
  RefreshCw,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface TwoFactorStatus {
  isEnabled: boolean;
  isVerified: boolean;
  method: string | null;
  verifiedAt: string | null;
}

interface SecurityActivity {
  id: string;
  action: string;
  category: string;
  resource: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  riskLevel: string | null;
  createdAt: string;
}

function formatAction(action: string): string {
  return action
    .replace(/^ADMIN_/, "")
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

function formatUserAgent(ua: string | null): string {
  if (!ua) return "Unknown";
  if (ua.includes("Chrome")) return "Chrome";
  if (ua.includes("Firefox")) return "Firefox";
  if (ua.includes("Safari")) return "Safari";
  if (ua.includes("Edge")) return "Edge";
  return "Browser";
}

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

export default function SecuritySettings() {
  const { admin, isSuperAdmin, isPlatformAdmin, isTechSupportManager } = useAdmin();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showSetupDialog, setShowSetupDialog] = useState(false);
  const [showDisableDialog, setShowDisableDialog] = useState(false);
  const [showBackupCodesDialog, setShowBackupCodesDialog] = useState(false);
  const [setupStep, setSetupStep] = useState<"scan" | "verify">("scan");
  const [setupData, setSetupData] = useState<{ otpauthUrl: string; secret: string } | null>(null);
  const [verifyCode, setVerifyCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [copiedBackupCodes, setCopiedBackupCodes] = useState(false);

  const adminId = admin?.id;

  const { data: twoFactorStatus, isLoading: is2FALoading } = useQuery<TwoFactorStatus>({
    queryKey: ["/api/platform-admin/admins", adminId, "2fa", "status"],
    queryFn: async () => {
      const res = await fetch(`/api/platform-admin/admins/${adminId}/2fa/status`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("mybizstream_admin_token")}` },
      });
      if (!res.ok) throw new Error("Failed to fetch 2FA status");
      return res.json();
    },
    enabled: !!adminId,
  });

  const { data: securityActivity, isLoading: isActivityLoading } = useQuery<{ activities: SecurityActivity[] }>({
    queryKey: ["/api/platform-admin/me/security-activity"],
    queryFn: async () => {
      const res = await fetch("/api/platform-admin/me/security-activity?limit=10", {
        headers: { Authorization: `Bearer ${localStorage.getItem("mybizstream_admin_token")}` },
      });
      if (!res.ok) throw new Error("Failed to fetch security activity");
      return res.json();
    },
  });

  const setupMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/platform-admin/admins/${adminId}/2fa/setup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("mybizstream_admin_token")}`,
        },
      });
      if (!res.ok) throw new Error((await res.json()).message || "Failed to start 2FA setup");
      return res.json();
    },
    onSuccess: (data) => {
      setSetupData(data);
      setSetupStep("scan");
      setShowSetupDialog(true);
    },
    onError: (error: Error) => {
      toast({ title: "Setup failed", description: error.message, variant: "destructive" });
    },
  });

  const confirmMutation = useMutation({
    mutationFn: async (code: string) => {
      const res = await fetch(`/api/platform-admin/admins/${adminId}/2fa/confirm`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("mybizstream_admin_token")}`,
        },
        body: JSON.stringify({ code }),
      });
      if (!res.ok) throw new Error((await res.json()).message || "Failed to confirm 2FA");
      return res.json();
    },
    onSuccess: (data) => {
      setBackupCodes(data.backupCodes || []);
      setShowSetupDialog(false);
      setShowBackupCodesDialog(true);
      setVerifyCode("");
      queryClient.invalidateQueries({ queryKey: ["/api/platform-admin/admins", adminId, "2fa", "status"] });
      toast({ title: "2FA enabled", description: "Two-factor authentication has been enabled." });
    },
    onError: (error: Error) => {
      toast({ title: "Verification failed", description: error.message, variant: "destructive" });
    },
  });

  const disableMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/platform-admin/admins/${adminId}/2fa/disable`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("mybizstream_admin_token")}`,
        },
      });
      if (!res.ok) throw new Error((await res.json()).message || "Failed to disable 2FA");
      return res.json();
    },
    onSuccess: () => {
      setShowDisableDialog(false);
      queryClient.invalidateQueries({ queryKey: ["/api/platform-admin/admins", adminId, "2fa", "status"] });
      toast({ title: "2FA disabled", description: "Two-factor authentication has been disabled." });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to disable 2FA", description: error.message, variant: "destructive" });
    },
  });

  const regenerateBackupCodesMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/platform-admin/me/2fa/regenerate-backup-codes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("mybizstream_admin_token")}`,
        },
      });
      if (!res.ok) throw new Error((await res.json()).message || "Failed to regenerate backup codes");
      return res.json();
    },
    onSuccess: (data) => {
      setBackupCodes(data.backupCodes || []);
      setShowBackupCodesDialog(true);
      toast({ title: "Backup codes regenerated", description: "Save your new backup codes." });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to regenerate", description: error.message, variant: "destructive" });
    },
  });

  const copyBackupCodes = async () => {
    try {
      await navigator.clipboard.writeText(backupCodes.join("\n"));
      setCopiedBackupCodes(true);
      setTimeout(() => setCopiedBackupCodes(false), 2000);
    } catch {
      toast({ title: "Copy failed", description: "Please copy manually", variant: "destructive" });
    }
  };

  const isAdminRole = isSuperAdmin || isPlatformAdmin || isTechSupportManager;

  if (!isAdminRole) {
    return (
      <AdminGuard>
        <div className="p-6">
          <Card>
            <CardContent className="py-10 text-center">
              <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">You don't have access to security settings.</p>
            </CardContent>
          </Card>
        </div>
      </AdminGuard>
    );
  }

  return (
    <AdminGuard>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Security Settings</h1>
          <p className="text-muted-foreground">Manage your account security and authentication</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5" />
                Two-Factor Authentication
              </CardTitle>
              <CardDescription>
                Add an extra layer of security to your account
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {is2FALoading ? (
                <Skeleton className="h-20 w-full" />
              ) : (
                <>
                  <div className="flex items-center justify-between" data-testid="section-2fa-status">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${twoFactorStatus?.isEnabled ? "bg-green-100 dark:bg-green-900" : "bg-muted"}`}>
                        {twoFactorStatus?.isEnabled ? (
                          <ShieldCheck className="h-5 w-5 text-green-600 dark:text-green-400" />
                        ) : (
                          <ShieldOff className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium" data-testid="text-2fa-status">
                          {twoFactorStatus?.isEnabled ? "Enabled" : "Disabled"}
                        </p>
                        <p className="text-sm text-muted-foreground" data-testid="text-2fa-method">
                          {twoFactorStatus?.isEnabled ? "Authenticator app" : "Not configured"}
                        </p>
                      </div>
                    </div>
                    <Badge variant={twoFactorStatus?.isEnabled ? "default" : "secondary"} data-testid="badge-2fa-status">
                      {twoFactorStatus?.isEnabled ? "Active" : "Inactive"}
                    </Badge>
                  </div>

                  {twoFactorStatus?.isEnabled ? (
                    <div className="flex gap-2">
                      {!isSuperAdmin && (
                        <Button
                          variant="destructive"
                          onClick={() => setShowDisableDialog(true)}
                          disabled={disableMutation.isPending}
                          data-testid="button-disable-2fa"
                        >
                          Disable 2FA
                        </Button>
                      )}
                      {isSuperAdmin && (
                        <p className="text-sm text-muted-foreground">
                          Super Admin accounts cannot disable 2FA
                        </p>
                      )}
                    </div>
                  ) : (
                    <Button
                      onClick={() => setupMutation.mutate()}
                      disabled={setupMutation.isPending}
                      data-testid="button-enable-2fa"
                    >
                      {setupMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Setting up...
                        </>
                      ) : (
                        <>
                          <Smartphone className="h-4 w-4 mr-2" />
                          Enable 2FA
                        </>
                      )}
                    </Button>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <KeyRound className="h-5 w-5" />
                Backup Codes
              </CardTitle>
              <CardDescription>
                Use these codes if you lose access to your authenticator
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!twoFactorStatus?.isEnabled ? (
                <p className="text-sm text-muted-foreground">
                  Enable 2FA to generate backup codes
                </p>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    Regenerating will invalidate all existing backup codes
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => regenerateBackupCodesMutation.mutate()}
                    disabled={regenerateBackupCodesMutation.isPending}
                    data-testid="button-regenerate-backup-codes"
                  >
                    {regenerateBackupCodesMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Regenerating...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Regenerate Backup Codes
                      </>
                    )}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Recent Security Activity
              </CardTitle>
              <CardDescription>
                Last 10 security-related events on your account
              </CardDescription>
            </div>
            <Button variant="outline" asChild>
              <Link href="/admin/security/sessions" data-testid="link-manage-sessions">
                <Key className="h-4 w-4 mr-2" />
                Manage Sessions
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {isActivityLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : securityActivity?.activities?.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No recent security activity
              </p>
            ) : (
              <div className="space-y-2" data-testid="list-security-activity">
                {securityActivity?.activities?.map((activity, index) => (
                  <div
                    key={activity.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    data-testid={`activity-item-${index}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-1.5 rounded-full ${
                        activity.riskLevel === "high" ? "bg-red-100 dark:bg-red-900" :
                        activity.riskLevel === "medium" ? "bg-orange-100 dark:bg-orange-900" :
                        "bg-muted"
                      }`}>
                        {activity.action.includes("LOGIN") ? (
                          <Key className="h-4 w-4" />
                        ) : activity.action.includes("2FA") ? (
                          <ShieldCheck className="h-4 w-4" />
                        ) : (
                          <Activity className="h-4 w-4" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium" data-testid={`text-activity-action-${index}`}>{formatAction(activity.action)}</p>
                        <p className="text-xs text-muted-foreground" data-testid={`text-activity-details-${index}`}>
                          {activity.ipAddress || "Unknown IP"} - {formatUserAgent(activity.userAgent)}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground" data-testid={`text-activity-time-${index}`}>
                      {formatTimeAgo(activity.createdAt)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={showSetupDialog} onOpenChange={setShowSetupDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Set Up Two-Factor Authentication</DialogTitle>
            <DialogDescription>
              {setupStep === "scan"
                ? "Scan the QR code with your authenticator app"
                : "Enter the 6-digit code from your app"}
            </DialogDescription>
          </DialogHeader>
          {setupStep === "scan" && setupData && (
            <div className="space-y-4">
              <div className="flex justify-center p-4 bg-white rounded-lg">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(setupData.otpauthUrl)}`}
                  alt="2FA QR Code"
                  className="w-48 h-48"
                  data-testid="img-2fa-qr"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Manual entry code:</Label>
                <code className="block p-2 bg-muted rounded text-sm font-mono break-all">
                  {setupData.secret}
                </code>
              </div>
              <Button className="w-full" onClick={() => setSetupStep("verify")}>
                Continue
              </Button>
            </div>
          )}
          {setupStep === "verify" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="verify-code">Verification Code</Label>
                <Input
                  id="verify-code"
                  type="text"
                  placeholder="000000"
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="text-center text-2xl tracking-widest"
                  maxLength={6}
                  data-testid="input-verify-2fa"
                />
              </div>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setSetupStep("scan")}>
                  Back
                </Button>
                <Button
                  onClick={() => confirmMutation.mutate(verifyCode)}
                  disabled={verifyCode.length !== 6 || confirmMutation.isPending}
                  data-testid="button-confirm-2fa"
                >
                  {confirmMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    "Verify & Enable"
                  )}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showBackupCodesDialog} onOpenChange={setShowBackupCodesDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Save Your Backup Codes</DialogTitle>
            <DialogDescription>
              Store these codes safely. Each can only be used once.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 p-4 bg-muted rounded-lg">
              {backupCodes.map((code, index) => (
                <code key={index} className="text-sm font-mono text-center py-1" data-testid={`text-backup-code-${index}`}>
                  {code}
                </code>
              ))}
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={copyBackupCodes}
              data-testid="button-copy-backup-codes"
            >
              {copiedBackupCodes ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy all codes
                </>
              )}
            </Button>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowBackupCodesDialog(false)}>
              I've saved my codes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDisableDialog} onOpenChange={setShowDisableDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disable Two-Factor Authentication?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the extra layer of security from your account.
              You'll need to set it up again if you want to re-enable it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => disableMutation.mutate()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-disable-2fa"
            >
              {disableMutation.isPending ? "Disabling..." : "Disable 2FA"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminGuard>
  );
}
