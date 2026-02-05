import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { X, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface ImpersonationState {
  active: boolean;
  sessionId?: string;
  target?: {
    fullName: string;
    email: string;
  };
  expiresAt?: string;
}

const IMPERSONATION_TOKEN_KEY = "impersonation_token";

export function getImpersonationToken(): string | null {
  return sessionStorage.getItem(IMPERSONATION_TOKEN_KEY);
}

export function setImpersonationToken(token: string): void {
  sessionStorage.setItem(IMPERSONATION_TOKEN_KEY, token);
}

export function clearImpersonationToken(): void {
  sessionStorage.removeItem(IMPERSONATION_TOKEN_KEY);
}

export function ImpersonationBanner() {
  const [state, setState] = useState<ImpersonationState>({ active: false });
  const [isExiting, setIsExiting] = useState(false);
  const { toast } = useToast();

  const checkImpersonation = useCallback(async () => {
    const token = getImpersonationToken();
    if (!token) {
      setState({ active: false });
      return;
    }

    try {
      const res = await fetch("/api/security/impersonate/current", {
        credentials: "include",
        headers: {
          "x-impersonation-token": token,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setState(data);
      } else {
        clearImpersonationToken();
        setState({ active: false });
      }
    } catch {
      clearImpersonationToken();
      setState({ active: false });
    }
  }, []);

  useEffect(() => {
    checkImpersonation();
    const interval = setInterval(checkImpersonation, 60000);
    return () => clearInterval(interval);
  }, [checkImpersonation]);

  const handleExit = async () => {
    const token = getImpersonationToken();
    if (!token) return;

    setIsExiting(true);
    try {
      await apiRequest("POST", "/api/security/impersonate/stop", { token });
      clearImpersonationToken();
      setState({ active: false });
      toast({
        title: "Impersonation ended",
        description: "You are now viewing as yourself.",
      });
      window.location.reload();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to end impersonation session.",
        variant: "destructive",
      });
    } finally {
      setIsExiting(false);
    }
  };

  if (!state.active) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[100] bg-amber-500 text-amber-950 py-2 px-4 flex items-center justify-between shadow-lg"
      data-testid="impersonation-banner"
    >
      <div className="flex items-center gap-2">
        <Eye className="h-4 w-4" />
        <span className="font-medium">
          Viewing as: {state.target?.fullName || state.target?.email || "Staff member"}
        </span>
        {state.expiresAt && (
          <span className="text-amber-800 text-sm">
            (expires {new Date(state.expiresAt).toLocaleTimeString()})
          </span>
        )}
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleExit}
        disabled={isExiting}
        className="text-amber-950 hover:bg-amber-600 hover:text-amber-950"
        data-testid="button-exit-impersonation"
      >
        <X className="h-4 w-4 mr-1" />
        Exit
      </Button>
    </div>
  );
}

export async function startImpersonation(staffId: string): Promise<{
  success: boolean;
  impersonationToken?: string;
  target?: { id: string; fullName: string; email: string };
  expiresAt?: string;
  error?: string;
}> {
  try {
    const res = await apiRequest("POST", "/api/security/impersonate/start", { staffId });
    const data = await res.json();
    
    if (data.success && data.impersonationToken) {
      setImpersonationToken(data.impersonationToken);
      window.location.reload();
    }
    
    return data;
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to start impersonation" };
  }
}
