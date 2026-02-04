import { useEffect } from "react";
import { useAuthStore } from "@/stores/authStore";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { status, refreshUser } = useAuthStore();

  useEffect(() => {
    if (status === "idle") {
      refreshUser();
    }
  }, [status, refreshUser]);

  if (status === "idle" || status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen" data-testid="loading-dashboard">
        <div className="text-muted-foreground">Loading dashboard...</div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    window.location.href = "/login";
    return null;
  }

  return <>{children}</>;
}
