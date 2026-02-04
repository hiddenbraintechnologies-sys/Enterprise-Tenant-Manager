import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { StepUpModal } from "@/components/security/StepUpModal";
import { apiRequest } from "@/lib/queryClient";
import { 
  Monitor, 
  Smartphone, 
  Tablet,
  Globe,
  Clock,
  MapPin,
  Loader2,
  Shield,
  LogOut
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface SessionData {
  id: string;
  createdAt: string;
  lastSeenAt: string;
  ip: string | null;
  country: string | null;
  city: string | null;
  userAgent: string | null;
  deviceType: string | null;
  browser: string | null;
  os: string | null;
  isCurrent: boolean;
  revokedAt: string | null;
}

interface SessionsResponse {
  sessions: SessionData[];
  currentSessionId: string;
}

function getDeviceIcon(deviceType: string | null) {
  switch (deviceType?.toLowerCase()) {
    case "mobile":
      return <Smartphone className="h-5 w-5" />;
    case "tablet":
      return <Tablet className="h-5 w-5" />;
    default:
      return <Monitor className="h-5 w-5" />;
  }
}

function SessionCard({ 
  session, 
  currentSessionId,
  onRevoke,
  isRevoking 
}: { 
  session: SessionData; 
  currentSessionId: string;
  onRevoke: (sessionId: string) => void;
  isRevoking: boolean;
}) {
  const isCurrent = session.id === currentSessionId;
  const isRevoked = !!session.revokedAt;

  const location = [session.city, session.country].filter(Boolean).join(", ");
  const deviceInfo = [session.browser, session.os].filter(Boolean).join(" on ");

  return (
    <Card 
      className={`relative ${isRevoked ? "opacity-50" : ""}`}
      data-testid={`card-session-${session.id}`}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="mt-1 text-muted-foreground">
              {getDeviceIcon(session.deviceType)}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">
                  {deviceInfo || "Unknown Device"}
                </span>
                {isCurrent && (
                  <Badge variant="secondary" className="text-xs" data-testid="badge-current-session">
                    <Shield className="h-3 w-3 mr-1" />
                    Current
                  </Badge>
                )}
                {isRevoked && (
                  <Badge variant="destructive" className="text-xs">
                    Revoked
                  </Badge>
                )}
              </div>
              
              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                {location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {location}
                  </span>
                )}
                {session.ip && (
                  <span className="flex items-center gap-1">
                    <Globe className="h-3 w-3" />
                    {session.ip}
                  </span>
                )}
              </div>
              
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                Last active {formatDistanceToNow(new Date(session.lastSeenAt), { addSuffix: true })}
              </div>
            </div>
          </div>
          
          {!isRevoked && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onRevoke(session.id)}
              disabled={isRevoking}
              data-testid={`button-revoke-session-${session.id}`}
            >
              {isRevoking ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <LogOut className="h-4 w-4 mr-1" />
                  {isCurrent ? "Sign Out" : "Revoke"}
                </>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function ActiveSessionsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [stepUp, setStepUp] = useState<{ 
    purpose: string; 
    onVerified: () => Promise<void>;
  } | null>(null);
  const [revokingSessionId, setRevokingSessionId] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery<SessionsResponse>({
    queryKey: ["/api/security/sessions"],
  });

  const revokeSessionMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const res = await apiRequest("POST", `/api/security/sessions/${sessionId}/revoke`);
      if (res.status === 428) {
        throw new Error("STEP_UP_REQUIRED");
      }
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to revoke session");
      }
      return res.json();
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["/api/security/sessions"] });
      if (result.currentRevoked) {
        window.location.href = "/login";
      } else {
        toast({
          title: "Session revoked",
          description: "The session has been successfully revoked.",
        });
      }
    },
    onError: (err: Error) => {
      if (err.message !== "STEP_UP_REQUIRED") {
        toast({
          title: "Error",
          description: err.message,
          variant: "destructive",
        });
      }
    },
    onSettled: () => {
      setRevokingSessionId(null);
    },
  });

  const revokeAllMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/security/sessions/revoke-all", {
        exceptCurrent: true,
      });
      if (res.status === 428) {
        throw new Error("STEP_UP_REQUIRED");
      }
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to revoke sessions");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/security/sessions"] });
      toast({
        title: "Sessions revoked",
        description: "All other sessions have been successfully revoked.",
      });
    },
    onError: (err: Error) => {
      if (err.message !== "STEP_UP_REQUIRED") {
        toast({
          title: "Error",
          description: err.message,
          variant: "destructive",
        });
      }
    },
  });

  const handleRevokeSession = useCallback((sessionId: string) => {
    setRevokingSessionId(sessionId);
    
    const attemptRevoke = async () => {
      try {
        await revokeSessionMutation.mutateAsync(sessionId);
      } catch (err: unknown) {
        if (err instanceof Error && err.message === "STEP_UP_REQUIRED") {
          setStepUp({
            purpose: "revoke_session",
            onVerified: async () => {
              await revokeSessionMutation.mutateAsync(sessionId);
            },
          });
        }
      }
    };
    
    attemptRevoke();
  }, [revokeSessionMutation]);

  const handleRevokeAll = useCallback(() => {
    const attemptRevokeAll = async () => {
      try {
        await revokeAllMutation.mutateAsync();
      } catch (err: unknown) {
        if (err instanceof Error && err.message === "STEP_UP_REQUIRED") {
          setStepUp({
            purpose: "revoke_session",
            onVerified: async () => {
              await revokeAllMutation.mutateAsync();
            },
          });
        }
      }
    };
    
    attemptRevokeAll();
  }, [revokeAllMutation]);

  const activeSessions = data?.sessions.filter(s => !s.revokedAt) || [];
  const otherSessions = activeSessions.filter(s => s.id !== data?.currentSessionId);

  if (error) {
    return (
      <div className="p-6">
        <Card className="border-destructive">
          <CardContent className="p-6">
            <p className="text-destructive">Failed to load sessions. Please try again.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Active Sessions
              </CardTitle>
              <CardDescription>
                Manage your active sessions across all devices. You can revoke access to any session.
              </CardDescription>
            </div>
            {otherSessions.length > 0 && (
              <Button
                variant="destructive"
                onClick={handleRevokeAll}
                disabled={revokeAllMutation.isPending}
                data-testid="button-revoke-all-sessions"
              >
                {revokeAllMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Revoke All Other Sessions
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <>
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </>
          ) : activeSessions.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No active sessions found.
            </p>
          ) : (
            activeSessions.map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                currentSessionId={data?.currentSessionId || ""}
                onRevoke={handleRevokeSession}
                isRevoking={revokingSessionId === session.id}
              />
            ))
          )}
        </CardContent>
      </Card>

      {stepUp && (
        <StepUpModal
          purpose={stepUp.purpose}
          onClose={() => setStepUp(null)}
          onVerified={async () => {
            await stepUp.onVerified();
            setStepUp(null);
          }}
        />
      )}
    </div>
  );
}
