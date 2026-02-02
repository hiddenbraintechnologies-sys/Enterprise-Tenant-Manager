import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle, XCircle, LogIn } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type InviteInfo = {
  email: string;
  tenantName: string;
  expiresAt: string;
};

type AcceptResponse = {
  success: boolean;
  message: string;
  tenant?: {
    id: string;
    name: string;
    slug?: string;
  };
};

export default function InviteAccept() {
  const { token } = useParams();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError("Invalid invite link");
      setLoading(false);
      return;
    }

    fetch(`/api/public/invites/${token}/lookup`)
      .then(async res => {
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Invite not found");
        }
        return res.json();
      })
      .then(data => {
        setInviteInfo(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [token]);

  const acceptMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/public/invites/${token}/accept`);
      return res.json() as Promise<AcceptResponse>;
    },
    onSuccess: (data) => {
      toast({ title: "Welcome!", description: "You've successfully joined the team." });
      setTimeout(() => navigate("/"), 1500);
    },
    onError: (err: any) => {
      if (err.message?.includes("AUTH_REQUIRED")) {
        toast({ 
          title: "Sign in required", 
          description: "Please sign in to accept this invite",
          variant: "destructive"
        });
      } else {
        toast({ title: "Error", description: err.message, variant: "destructive" });
      }
    },
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <CardTitle>Invalid Invite</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => navigate("/")} data-testid="button-go-home">
              Go to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (acceptMutation.isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <CardTitle>Welcome to the Team!</CardTitle>
            <CardDescription>
              You've successfully joined {inviteInfo?.tenantName}.
              Redirecting you to the dashboard...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <CardTitle>You've been invited!</CardTitle>
          <CardDescription>
            You've been invited to join <strong>{inviteInfo?.tenantName}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground text-center">
            This invite is for: <strong>{inviteInfo?.email}</strong>
          </div>
          
          <div className="text-xs text-muted-foreground text-center">
            Expires: {inviteInfo?.expiresAt ? new Date(inviteInfo.expiresAt).toLocaleDateString() : "Unknown"}
          </div>

          <div className="flex flex-col gap-2">
            <Button 
              onClick={() => acceptMutation.mutate()}
              disabled={acceptMutation.isPending}
              className="w-full"
              data-testid="button-accept-invite"
            >
              {acceptMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <LogIn className="h-4 w-4 mr-2" />
              )}
              Accept Invite
            </Button>
            <Button 
              variant="outline" 
              onClick={() => navigate("/")}
              className="w-full"
              data-testid="button-decline-invite"
            >
              Decline
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
