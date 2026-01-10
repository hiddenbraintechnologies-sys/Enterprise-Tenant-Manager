import { useState } from "react";
import { useLocation, Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Shield, Eye, EyeOff, Loader2, ShieldCheck, ArrowLeft, KeyRound } from "lucide-react";

const ROLE_DASHBOARDS: Record<string, string> = {
  SUPER_ADMIN: "/super-admin/dashboard",
  PLATFORM_ADMIN: "/platform-admin/dashboard",
  TECH_SUPPORT_MANAGER: "/tech-support/dashboard",
  MANAGER: "/manager/dashboard",
  SUPPORT_TEAM: "/support/dashboard",
};

function getRoleDashboard(role?: string): string {
  return role ? ROLE_DASHBOARDS[role] || "/admin" : "/admin";
}

interface TwoFactorState {
  tempToken: string;
  adminEmail: string;
}

export default function AdminLogin() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [twoFactorState, setTwoFactorState] = useState<TwoFactorState | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const [useBackupCode, setUseBackupCode] = useState(false);

  const handleLoginSuccess = (data: { accessToken?: string; refreshToken?: string; forcePasswordReset?: boolean; admin?: { role?: string }; redirectPath?: string }) => {
    if (data.accessToken) {
      localStorage.setItem("mybizstream_admin_token", data.accessToken);
    }
    if (data.refreshToken) {
      localStorage.setItem("mybizstream_refresh_token", data.refreshToken);
    }

    toast({
      title: "Login successful",
      description: "Redirecting to dashboard...",
    });

    if (data.forcePasswordReset) {
      toast({
        title: "Password reset required",
        description: "Please change your password after logging in.",
        variant: "destructive",
      });
    }

    const redirectPath = data.redirectPath || getRoleDashboard(data.admin?.role);
    setLocation(redirectPath);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch("/api/platform-admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.code === "TWO_FACTOR_REQUIRED" && data.tempToken) {
          setTwoFactorState({ tempToken: data.tempToken, adminEmail: email });
          toast({
            title: "Two-factor authentication required",
            description: "Please enter the code from your authenticator app.",
          });
          return;
        }
        throw new Error(data.message || "Login failed");
      }

      handleLoginSuccess(data);
    } catch (error) {
      toast({
        title: "Login failed",
        description: error instanceof Error ? error.message : "Invalid credentials",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTwoFactorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!twoFactorState) return;

    setIsLoading(true);

    try {
      const endpoint = useBackupCode ? "/api/auth/admin/login/backup" : "/api/auth/admin/login/2fa";
      const body = useBackupCode 
        ? { tempToken: twoFactorState.tempToken, backupCode: otpCode }
        : { tempToken: twoFactorState.tempToken, code: otpCode };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Verification failed");
      }

      handleLoginSuccess(data);
    } catch (error) {
      toast({
        title: "Verification failed",
        description: error instanceof Error ? error.message : "Invalid code",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToLogin = () => {
    setTwoFactorState(null);
    setOtpCode("");
    setUseBackupCode(false);
    setPassword("");
  };

  if (twoFactorState) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary">
              <ShieldCheck className="h-6 w-6 text-primary-foreground" />
            </div>
            <CardTitle className="text-2xl">Two-Factor Authentication</CardTitle>
            <CardDescription>
              {useBackupCode 
                ? "Enter one of your backup codes"
                : "Enter the 6-digit code from your authenticator app"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleTwoFactorSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="otp">
                  {useBackupCode ? "Backup Code" : "Verification Code"}
                </Label>
                <Input
                  id="otp"
                  type="text"
                  placeholder={useBackupCode ? "XXXX-XXXX" : "000000"}
                  value={otpCode}
                  onChange={(e) => {
                    if (useBackupCode) {
                      setOtpCode(e.target.value.toUpperCase());
                    } else {
                      setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6));
                    }
                  }}
                  required
                  disabled={isLoading}
                  className={useBackupCode ? "" : "text-center text-2xl tracking-widest"}
                  maxLength={useBackupCode ? 9 : 6}
                  autoComplete="one-time-code"
                  data-testid="input-otp-code"
                />
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading || (useBackupCode ? otpCode.length < 8 : otpCode.length !== 6)}
                data-testid="button-verify-otp"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Verify"
                )}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button
              variant="ghost"
              onClick={() => {
                setUseBackupCode(!useBackupCode);
                setOtpCode("");
              }}
              className="text-sm"
              data-testid="button-toggle-backup-code"
            >
              <KeyRound className="h-4 w-4 mr-2" />
              {useBackupCode ? "Use authenticator code" : "Use backup code instead"}
            </Button>
            <Button
              variant="ghost"
              onClick={handleBackToLogin}
              className="text-sm text-muted-foreground"
              data-testid="button-back-to-login"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to login
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary">
            <Shield className="h-6 w-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">Admin Login</CardTitle>
          <CardDescription>
            Sign in to access the MyBizStream admin panel
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                data-testid="input-admin-email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  className="pr-10"
                  data-testid="input-admin-password"
                />
                <button
                  type="button"
                  className="absolute right-0 top-0 h-full px-3 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                  data-testid="button-toggle-password"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
              data-testid="button-admin-login"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Link href="/admin-forgot-password" className="text-sm text-muted-foreground hover:text-primary transition-colors" data-testid="link-forgot-password">
            Forgot your password?
          </Link>
          <div className="text-sm text-muted-foreground">
            Looking for tenant login?{" "}
            <Link href="/login" className="text-primary hover:underline" data-testid="link-tenant-login">
              Sign in here
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
