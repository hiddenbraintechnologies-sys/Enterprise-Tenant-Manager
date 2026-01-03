import { createContext, useContext, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";

type PlatformAdminRole = "SUPER_ADMIN" | "PLATFORM_ADMIN";

interface PlatformAdmin {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: PlatformAdminRole;
  isActive: boolean;
}

interface AdminContextType {
  admin: PlatformAdmin | null;
  permissions: string[];
  isLoading: boolean;
  isSuperAdmin: boolean;
  isPlatformAdmin: boolean;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
}

const AdminContext = createContext<AdminContextType | null>(null);

export function useAdmin() {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error("useAdmin must be used within an AdminProvider");
  }
  return context;
}

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [, setLocation] = useLocation();

  const { data, isLoading, error } = useQuery<{
    platformAdmin: PlatformAdmin;
    permissions: string[];
  }>({
    queryKey: ["/api/platform-admin/me"],
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const admin = data?.platformAdmin || null;
  const permissions = data?.permissions || [];
  const isSuperAdmin = admin?.role === "SUPER_ADMIN";
  const isPlatformAdmin = admin?.role === "PLATFORM_ADMIN";

  const hasPermission = (permission: string): boolean => {
    if (isSuperAdmin) return true;
    return permissions.includes(permission);
  };

  const hasAnyPermission = (perms: string[]): boolean => {
    if (isSuperAdmin) return true;
    return perms.some(p => permissions.includes(p));
  };

  useEffect(() => {
    if (!isLoading && error) {
      setLocation("/");
    }
  }, [isLoading, error, setLocation]);

  return (
    <AdminContext.Provider
      value={{
        admin,
        permissions,
        isLoading,
        isSuperAdmin,
        isPlatformAdmin,
        hasPermission,
        hasAnyPermission,
      }}
    >
      {children}
    </AdminContext.Provider>
  );
}

interface AdminGuardProps {
  children: React.ReactNode;
  requiredRole?: PlatformAdminRole;
  requiredPermission?: string;
  requiredPermissions?: string[];
  fallback?: React.ReactNode;
}

export function AdminGuard({
  children,
  requiredRole,
  requiredPermission,
  requiredPermissions,
  fallback,
}: AdminGuardProps) {
  const { admin, isLoading, isSuperAdmin, hasPermission, hasAnyPermission } = useAdmin();
  const [, setLocation] = useLocation();
  const [shouldRedirect, setShouldRedirect] = useState(false);

  useEffect(() => {
    if (!isLoading && !admin) {
      setShouldRedirect(true);
    }
  }, [isLoading, admin]);

  useEffect(() => {
    if (shouldRedirect) {
      setLocation("/");
    }
  }, [shouldRedirect, setLocation]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading admin context...</p>
        </div>
      </div>
    );
  }

  if (!admin || shouldRedirect) {
    return null;
  }

  if (requiredRole === "SUPER_ADMIN" && !isSuperAdmin) {
    return fallback || (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive">Access Denied</h1>
          <p className="text-muted-foreground mt-2">Super Admin access required</p>
        </div>
      </div>
    );
  }

  if (requiredPermission && !hasPermission(requiredPermission)) {
    return fallback || (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive">Access Denied</h1>
          <p className="text-muted-foreground mt-2">You do not have permission to access this page</p>
        </div>
      </div>
    );
  }

  if (requiredPermissions && !hasAnyPermission(requiredPermissions)) {
    return fallback || (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive">Access Denied</h1>
          <p className="text-muted-foreground mt-2">You do not have permission to access this page</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export function SuperAdminGuard({ children }: { children: React.ReactNode }) {
  return <AdminGuard requiredRole="SUPER_ADMIN">{children}</AdminGuard>;
}

export function PermissionGuard({ 
  permission, 
  children,
  fallback,
}: { 
  permission: string; 
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  return (
    <AdminGuard requiredPermission={permission} fallback={fallback}>
      {children}
    </AdminGuard>
  );
}
