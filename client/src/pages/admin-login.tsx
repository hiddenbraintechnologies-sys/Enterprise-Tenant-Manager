import { useState } from "react";
import { useLocation, Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Shield, Eye, EyeOff, Loader2, ShieldCheck, ArrowLeft, KeyRound, QrCode, Copy, Check } from "lucide-react";

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

interface TwoFactorSetupState {
  setupToken: string;
  adminId: string;
  step: "loading" | "scan" | "verify" | "backup";
  otpauthUrl?: string;
  secret?: string;
  backupCodes?: string[];
  tempToken?: string;
}

export default function AdminLogin() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [twoFactorState, setTwoFactorState] = useState<TwoFactorState | null>(null);
  const [twoFactorSetupState, setTwoFactorSetupState] = useState<TwoFactorSetupState | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedBackupCodes, setCopiedBackupCodes] = useState(false);

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
        throw new Error(data.message || "Login failed");
      }

      // Handle 2FA verification required (2FA already set up)
      if (data.code === "TWO_FACTOR_REQUIRED" && data.tempToken) {
        setTwoFactorState({ tempToken: data.tempToken, adminEmail: email });
        toast({
          title: "Two-factor authentication required",
          description: "Please enter the code from your authenticator app.",
        });
        return;
      }
      
      // Handle 2FA setup required (first-time SUPER_ADMIN)
      if (data.code === "TWO_FACTOR_SETUP_REQUIRED" && data.setupToken) {
        setTwoFactorSetupState({
          setupToken: data.setupToken,
          adminId: data.adminId,
          step: "loading",
        });
        toast({
          title: "Two-factor authentication setup required",
          description: "Please set up 2FA to secure your account.",
        });
        // Start the 2FA setup process
        startTwoFactorSetup(data.setupToken);
        return;
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
    setTwoFactorSetupState(null);
    setOtpCode("");
    setUseBackupCode(false);
    setPassword("");
    setCopiedSecret(false);
    setCopiedBackupCodes(false);
  };

  const startTwoFactorSetup = async (setupToken: string) => {
    try {
      const response = await fetch("/api/auth/admin/2fa/self-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ setupToken }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to start 2FA setup");
      }

      setTwoFactorSetupState(prev => prev ? {
        ...prev,
        step: "scan",
        otpauthUrl: data.otpauthUrl,
        secret: data.secret,
      } : null);
    } catch (error) {
      toast({
        title: "Setup failed",
        description: error instanceof Error ? error.message : "Failed to start 2FA setup",
        variant: "destructive",
      });
      handleBackToLogin();
    }
  };

  const handleSetupVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!twoFactorSetupState) return;

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/admin/2fa/self-confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          setupToken: twoFactorSetupState.setupToken, 
          code: otpCode 
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Verification failed");
      }

      setTwoFactorSetupState(prev => prev ? {
        ...prev,
        step: "backup",
        backupCodes: data.backupCodes,
        tempToken: data.tempToken,
      } : null);
      setOtpCode("");
      
      toast({
        title: "2FA enabled successfully",
        description: "Save your backup codes, then verify to complete login.",
      });
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

  const handleCompleteSetupAndLogin = () => {
    if (!twoFactorSetupState?.tempToken) return;
    
    // Move to 2FA verification with the new temp token
    setTwoFactorState({
      tempToken: twoFactorSetupState.tempToken,
      adminEmail: email,
    });
    setTwoFactorSetupState(null);
    setOtpCode("");
    
    toast({
      title: "Now verify your login",
      description: "Enter a new code from your authenticator app.",
    });
  };

  const copyToClipboard = async (text: string, type: "secret" | "backup") => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === "secret") {
        setCopiedSecret(true);
        setTimeout(() => setCopiedSecret(false), 2000);
      } else {
        setCopiedBackupCodes(true);
        setTimeout(() => setCopiedBackupCodes(false), 2000);
      }
    } catch {
      toast({
        title: "Copy failed",
        description: "Please copy manually",
        variant: "destructive",
      });
    }
  };

  // 2FA Setup Flow
  if (twoFactorSetupState) {
    // Loading state
    if (twoFactorSetupState.step === "loading") {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary">
                <Loader2 className="h-6 w-6 text-primary-foreground animate-spin" />
              </div>
              <CardTitle className="text-2xl">Setting up 2FA</CardTitle>
              <CardDescription>Please wait while we prepare your authenticator...</CardDescription>
            </CardHeader>
          </Card>
        </div>
      );
    }

    // Scan QR code step
    if (twoFactorSetupState.step === "scan") {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary">
                <QrCode className="h-6 w-6 text-primary-foreground" />
              </div>
              <CardTitle className="text-2xl">Set Up Two-Factor Authentication</CardTitle>
              <CardDescription>
                Scan the QR code with your authenticator app (Google Authenticator, Authy, etc.)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {twoFactorSetupState.otpauthUrl && (
                <div className="flex justify-center p-4 bg-white rounded-lg">
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(twoFactorSetupState.otpauthUrl)}`}
                    alt="2FA QR Code"
                    className="w-48 h-48"
                    data-testid="img-2fa-qr"
                  />
                </div>
              )}
              
              {twoFactorSetupState.secret && (
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Or enter this code manually:</Label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 p-2 bg-muted rounded text-sm font-mono break-all">
                      {twoFactorSetupState.secret}
                    </code>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => copyToClipboard(twoFactorSetupState.secret!, "secret")}
                      data-testid="button-copy-secret"
                    >
                      {copiedSecret ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              )}

              <form onSubmit={handleSetupVerify} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="setup-code">Enter the 6-digit code from your app</Label>
                  <Input
                    id="setup-code"
                    type="text"
                    placeholder="000000"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    required
                    disabled={isLoading}
                    className="text-center text-2xl tracking-widest"
                    maxLength={6}
                    autoComplete="one-time-code"
                    data-testid="input-setup-otp"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading || otpCode.length !== 6}
                  data-testid="button-verify-setup"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    "Verify & Enable 2FA"
                  )}
                </Button>
              </form>
            </CardContent>
            <CardFooter>
              <Button
                variant="ghost"
                onClick={handleBackToLogin}
                className="w-full text-sm text-muted-foreground"
                data-testid="button-cancel-setup"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Cancel and return to login
              </Button>
            </CardFooter>
          </Card>
        </div>
      );
    }

    // Backup codes step
    if (twoFactorSetupState.step === "backup" && twoFactorSetupState.backupCodes) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-500">
                <ShieldCheck className="h-6 w-6 text-white" />
              </div>
              <CardTitle className="text-2xl">Save Your Backup Codes</CardTitle>
              <CardDescription>
                Store these codes safely. Each code can only be used once if you lose access to your authenticator.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-2 p-4 bg-muted rounded-lg">
                {twoFactorSetupState.backupCodes.map((code, index) => (
                  <code key={index} className="text-sm font-mono text-center py-1" data-testid={`text-backup-code-${index}`}>
                    {code}
                  </code>
                ))}
              </div>
              
              <Button
                variant="outline"
                className="w-full"
                onClick={() => copyToClipboard(twoFactorSetupState.backupCodes!.join("\n"), "backup")}
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
              
              <Button
                className="w-full"
                onClick={handleCompleteSetupAndLogin}
                data-testid="button-continue-to-login"
              >
                Continue to Login
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }
  }

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
