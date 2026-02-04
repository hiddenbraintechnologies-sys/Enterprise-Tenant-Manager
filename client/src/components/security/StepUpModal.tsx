import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface StepUpModalProps {
  purpose: string;
  onClose: () => void;
  onVerified: () => Promise<void>;
}

export function StepUpModal({ purpose, onClose, onVerified }: StepUpModalProps) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleVerify() {
    if (code.length < 6) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const res = await apiRequest("POST", "/api/security/stepup/verify", {
        code,
        purpose,
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Verification failed");
      }
      
      await onVerified();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Verification failed";
      setError(message === "INVALID_OTP" ? "Invalid code. Please try again." : message);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && code.length >= 6 && !loading) {
      handleVerify();
    }
  }

  const purposeLabels: Record<string, string> = {
    revoke_session: "revoke sessions",
    force_logout: "force logout this user",
    ip_rule_change: "modify IP access rules",
    impersonate: "view as another user",
    change_role: "change user role",
    change_permissions: "change user permissions",
    sso_config: "modify SSO configuration",
    billing_change: "modify billing settings",
    data_export: "export data",
    security_settings: "modify security settings",
  };

  const purposeLabel = purposeLabels[purpose] || "perform this action";

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-md" data-testid="dialog-stepup">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Verification Required
          </DialogTitle>
          <DialogDescription>
            Enter your authenticator code to {purposeLabel}.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="otp-code">6-digit code</Label>
            <Input
              id="otp-code"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              onKeyDown={handleKeyDown}
              placeholder="000000"
              className="text-center text-lg tracking-widest"
              autoFocus
              data-testid="input-otp-code"
            />
          </div>
          
          {error && (
            <div className="text-sm text-destructive" data-testid="text-stepup-error">
              {error}
            </div>
          )}
          
          <div className="flex gap-2 justify-end">
            <Button 
              variant="outline" 
              onClick={onClose}
              disabled={loading}
              data-testid="button-stepup-cancel"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleVerify} 
              disabled={loading || code.length < 6}
              data-testid="button-stepup-verify"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Verify
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
