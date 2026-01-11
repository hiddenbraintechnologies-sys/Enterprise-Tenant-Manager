import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAdmin, AdminGuard } from "@/contexts/admin-context";
import { Link } from "wouter";
import {
  Shield,
  Smartphone,
  Monitor,
  Globe,
  Trash2,
  Loader2,
  ArrowLeft,
  AlertTriangle,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Session {
  id: string;
  ipAddress: string | null;
  userAgent: string | null;
  deviceInfo: Record<string, unknown> | null;
  createdAt: string;
  lastActivityAt: string | null;
  expiresAt: string;
  isCurrentSession: boolean;
}

function parseUserAgent(ua: string | null): { browser: string; device: string; icon: typeof Monitor } {
  if (!ua) return { browser: "Unknown", device: "Unknown Device", icon: Monitor };
  
  let browser = "Browser";
  if (ua.includes("Chrome") && !ua.includes("Edg")) browser = "Chrome";
  else if (ua.includes("Firefox")) browser = "Firefox";
  else if (ua.includes("Safari") && !ua.includes("Chrome")) browser = "Safari";
  else if (ua.includes("Edg")) browser = "Edge";
  else if (ua.includes("Opera") || ua.includes("OPR")) browser = "Opera";

  let device = "Desktop";
  let icon = Monitor;
  if (ua.includes("Mobile") || ua.includes("Android") || ua.includes("iPhone")) {
    device = "Mobile";
    icon = Smartphone;
  } else if (ua.includes("Tablet") || ua.includes("iPad")) {
    device = "Tablet";
    icon = Smartphone;
  }

  return { browser, device, icon };
}

function formatTimeAgo(dateStr: string | null): string {
  if (!dateStr) return "Unknown";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function SecuritySessions() {
  const { isSuperAdmin, isPlatformAdmin, isTechSupportManager } = useAdmin();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: sessionsData, isLoading } = useQuery<{ sessions: Session[] }>({
    queryKey: ["/api/platform-admin/me/sessions"],
    queryFn: async () => {
      const res = await fetch("/api/platform-admin/me/sessions", {
        headers: { Authorization: `Bearer ${localStorage.getItem("mybizstream_admin_token")}` },
      });
      if (!res.ok) throw new Error("Failed to fetch sessions");
      return res.json();
    },
  });

  const revokeSessionMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const res = await fetch(`/api/platform-admin/me/sessions/${sessionId}/revoke`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("mybizstream_admin_token")}`,
        },
      });
      if (!res.ok) throw new Error((await res.json()).message || "Failed to revoke session");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/platform-admin/me/sessions"] });
      toast({ title: "Session revoked", description: "The session has been terminated." });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to revoke", description: error.message, variant: "destructive" });
    },
  });

  const revokeAllMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/platform-admin/me/sessions/revoke-others", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("mybizstream_admin_token")}`,
        },
      });
      if (!res.ok) throw new Error((await res.json()).message || "Failed to revoke sessions");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/platform-admin/me/sessions"] });
      toast({
        title: "Sessions revoked",
        description: `${data.revokedCount} session(s) have been terminated.`,
      });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to revoke", description: error.message, variant: "destructive" });
    },
  });

  const isAdminRole = isSuperAdmin || isPlatformAdmin || isTechSupportManager;

  if (!isAdminRole) {
    return (
      <AdminGuard>
        <div className="p-6">
          <Card>
            <CardContent className="py-10 text-center">
              <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">You don't have access to session management.</p>
            </CardContent>
          </Card>
        </div>
      </AdminGuard>
    );
  }

  const sessions = sessionsData?.sessions || [];
  const otherSessionsCount = sessions.filter((s) => !s.isCurrentSession).length;

  return (
    <AdminGuard>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/admin/security" data-testid="link-back-to-security">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Active Sessions</h1>
              <p className="text-muted-foreground">Manage your active login sessions</p>
            </div>
          </div>
          {otherSessionsCount > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" data-testid="button-revoke-all-sessions">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Revoke All Other Sessions
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Revoke All Other Sessions?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will log you out from {otherSessionsCount} other device(s).
                    Only your current session will remain active.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => revokeAllMutation.mutate()}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    data-testid="button-confirm-revoke-all"
                  >
                    {revokeAllMutation.isPending ? "Revoking..." : "Revoke All"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Your Sessions</CardTitle>
            <CardDescription>
              These are the devices currently logged into your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : sessions.length === 0 ? (
              <p className="text-center text-muted-foreground py-8" data-testid="text-no-sessions">No active sessions found</p>
            ) : (
              <div className="space-y-4" data-testid="list-sessions">
                {sessions.map((session, index) => {
                  const { browser, device, icon: DeviceIcon } = parseUserAgent(session.userAgent);
                  
                  return (
                    <div
                      key={session.id}
                      className={`flex items-center justify-between p-4 rounded-lg border ${
                        session.isCurrentSession ? "border-primary bg-primary/5" : ""
                      }`}
                      data-testid={`session-item-${index}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-2 rounded-full bg-muted">
                          <DeviceIcon className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium" data-testid={`text-session-device-${index}`}>{browser} on {device}</p>
                            {session.isCurrentSession && (
                              <Badge variant="default" className="text-xs" data-testid={`badge-current-session-${index}`}>
                                Current
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Globe className="h-3 w-3" />
                            <span data-testid={`text-session-ip-${index}`}>{session.ipAddress || "Unknown IP"}</span>
                            <span className="mx-1">-</span>
                            <span data-testid={`text-session-created-${index}`}>Created {formatDate(session.createdAt)}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1" data-testid={`text-session-activity-${index}`}>
                            Last active: {formatTimeAgo(session.lastActivityAt)}
                          </p>
                        </div>
                      </div>
                      
                      {!session.isCurrentSession && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              data-testid={`button-revoke-session-${index}`}
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Revoke
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Revoke this session?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will log you out from {browser} on {device} ({session.ipAddress}).
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => revokeSessionMutation.mutate(session.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                {revokeSessionMutation.isPending ? "Revoking..." : "Revoke"}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                      
                      {session.isCurrentSession && (
                        <Badge variant="outline" className="text-muted-foreground">
                          Cannot revoke
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminGuard>
  );
}
