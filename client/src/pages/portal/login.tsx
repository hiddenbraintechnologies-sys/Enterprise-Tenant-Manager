import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Building2, UserPlus } from "lucide-react";

interface PortalInfo {
  tenantId: string;
  businessName: string;
  logoUrl: string | null;
  primaryColor: string | null;
  welcomeMessage: string | null;
  allowSelfRegistration: boolean;
}

export default function PortalLogin() {
  const { token } = useParams<{ token: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showRegister, setShowRegister] = useState(false);
  const [registerName, setRegisterName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState("");

  const { data: portalInfo, isLoading, error } = useQuery<PortalInfo>({
    queryKey: ["/api/portal", token, "info"],
    queryFn: async () => {
      const res = await fetch(`/api/portal/${token}/info`);
      if (!res.ok) throw new Error("Portal not available");
      return res.json();
    },
    enabled: !!token,
    retry: false,
  });

  const loginMutation = useMutation({
    mutationFn: async (data: { email: string; password: string }) => {
      const res = await fetch(`/api/portal/${token}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Login failed");
      }
      return res.json();
    },
    onSuccess: (data) => {
      localStorage.setItem("portalToken", data.sessionToken);
      localStorage.setItem("portalBaseToken", token!);
      setLocation("/portal/dashboard");
    },
    onError: (error: Error) => {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const selfRegisterMutation = useMutation({
    mutationFn: async (data: { name: string; email: string; password: string }) => {
      const res = await fetch(`/api/portal/${token}/self-register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Registration failed");
      }
      return res.json();
    },
    onSuccess: (data) => {
      localStorage.setItem("portalToken", data.sessionToken);
      localStorage.setItem("portalBaseToken", token!);
      toast({ title: "Account created!", description: "Welcome to your customer portal." });
      setLocation("/portal/dashboard");
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate({ email, password });
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (registerPassword.length < 8) {
      toast({
        title: "Password too short",
        description: "Password must be at least 8 characters.",
        variant: "destructive",
      });
      return;
    }
    if (registerPassword !== registerConfirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure your passwords match.",
        variant: "destructive",
      });
      return;
    }
    selfRegisterMutation.mutate({
      name: registerName,
      email: registerEmail,
      password: registerPassword,
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !portalInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Portal Unavailable</CardTitle>
            <CardDescription>
              This customer portal is not available or has been disabled.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          {portalInfo.logoUrl ? (
            <img
              src={portalInfo.logoUrl}
              alt={portalInfo.businessName}
              className="h-12 mx-auto mb-4 object-contain"
            />
          ) : (
            <Building2 className="h-12 w-12 mx-auto mb-4 text-primary" />
          )}
          <CardTitle className="text-2xl">{portalInfo.businessName}</CardTitle>
          <CardDescription>
            {portalInfo.welcomeMessage || "Sign in to your customer portal"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!showRegister ? (
            <>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    data-testid="input-portal-email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    data-testid="input-portal-password"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={loginMutation.isPending}
                  data-testid="button-portal-login"
                >
                  {loginMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    "Sign In"
                  )}
                </Button>
              </form>
              {portalInfo.allowSelfRegistration && (
                <>
                  <Separator className="my-4" />
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-3">New customer?</p>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => setShowRegister(true)}
                      data-testid="button-show-register"
                    >
                      <UserPlus className="mr-2 h-4 w-4" />
                      Create an Account
                    </Button>
                  </div>
                </>
              )}
            </>
          ) : (
            <>
              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="registerName">Full Name</Label>
                  <Input
                    id="registerName"
                    placeholder="Your full name"
                    value={registerName}
                    onChange={(e) => setRegisterName(e.target.value)}
                    required
                    data-testid="input-register-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="registerEmail">Email</Label>
                  <Input
                    id="registerEmail"
                    type="email"
                    placeholder="Your email address"
                    value={registerEmail}
                    onChange={(e) => setRegisterEmail(e.target.value)}
                    required
                    data-testid="input-register-email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="registerPassword">Password</Label>
                  <Input
                    id="registerPassword"
                    type="password"
                    placeholder="Create a password (min 8 characters)"
                    value={registerPassword}
                    onChange={(e) => setRegisterPassword(e.target.value)}
                    required
                    minLength={8}
                    data-testid="input-register-password"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="registerConfirmPassword">Confirm Password</Label>
                  <Input
                    id="registerConfirmPassword"
                    type="password"
                    placeholder="Confirm your password"
                    value={registerConfirmPassword}
                    onChange={(e) => setRegisterConfirmPassword(e.target.value)}
                    required
                    data-testid="input-register-confirm-password"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={selfRegisterMutation.isPending}
                  data-testid="button-register"
                >
                  {selfRegisterMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    "Create Account"
                  )}
                </Button>
              </form>
              <Separator className="my-4" />
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-3">Already have an account?</p>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowRegister(false)}
                  data-testid="button-show-login"
                >
                  Sign In
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
