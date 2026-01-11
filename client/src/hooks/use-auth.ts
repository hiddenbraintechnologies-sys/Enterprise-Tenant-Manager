import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { User } from "@shared/models/auth";

export type BusinessType = "clinic" | "salon" | "pg" | "coworking" | "service";

export interface Tenant {
  id: string;
  name: string;
  businessType: BusinessType | null;
  onboardingCompleted?: boolean;
  country?: string;
  region?: string;
  currency?: string;
  timezone?: string;
}

export interface AuthUser extends User {
  tenant?: Tenant | null;
  dashboardRoute?: string;
}

async function fetchUserTenants(accessToken: string): Promise<{ tenants: Tenant[]; defaultTenantId: string | null }> {
  const response = await fetch("/api/tenants/my", {
    headers: {
      "Authorization": `Bearer ${accessToken}`,
    },
  });
  if (response.ok) {
    return response.json();
  }
  return { tenants: [], defaultTenantId: null };
}

async function fetchUser(): Promise<AuthUser | null> {
  const accessToken = localStorage.getItem("accessToken");
  
  if (accessToken) {
    const response = await fetch("/api/auth/me", {
      headers: {
        "Authorization": `Bearer ${accessToken}`,
      },
    });

    if (response.ok) {
      const data = await response.json();
      
      // If auth/me returned user but no tenant, try to bootstrap from /api/tenants/my
      let tenant = data.tenant;
      if (data.user && !tenant) {
        const tenantsData = await fetchUserTenants(accessToken);
        if (tenantsData.defaultTenantId && tenantsData.tenants.length > 0) {
          const defaultTenant = tenantsData.tenants.find(t => t.id === tenantsData.defaultTenantId);
          if (defaultTenant) {
            tenant = defaultTenant;
            // Persist tenant to localStorage for other components that check it directly
            localStorage.setItem("tenantId", defaultTenant.id);
            localStorage.setItem("lastTenantId", defaultTenant.id);
          }
        }
      }
      
      return {
        id: data.user?.id,
        email: data.user?.email,
        firstName: data.user?.firstName,
        lastName: data.user?.lastName,
        profileImageUrl: data.user?.profileImageUrl,
        tenant: tenant ? {
          id: tenant.id,
          name: tenant.name,
          businessType: tenant.businessType,
          onboardingCompleted: tenant.onboardingCompleted,
          country: tenant.country,
          region: tenant.region,
          currency: tenant.currency,
          timezone: tenant.timezone,
        } : null,
        dashboardRoute: tenant?.businessType ? 
          `/dashboard/${tenant.businessType === "coworking" ? "coworking" : tenant.businessType}` : 
          "/dashboard/service",
      } as AuthUser;
    }
    
    if (response.status === 401) {
      const refreshToken = localStorage.getItem("refreshToken");
      if (refreshToken) {
        const refreshResponse = await fetch("/api/auth/refresh", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken }),
        });
        
        if (refreshResponse.ok) {
          const tokens = await refreshResponse.json();
          localStorage.setItem("accessToken", tokens.accessToken);
          localStorage.setItem("refreshToken", tokens.refreshToken);
          return fetchUser();
        }
      }
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
    }
  }

  const response = await fetch("/api/auth/user", {
    credentials: "include",
  });

  if (response.status === 401) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`${response.status}: ${response.statusText}`);
  }

  return response.json();
}

async function logout(): Promise<void> {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  window.location.href = "/api/logout";
}

export function useAuth() {
  const queryClient = useQueryClient();
  const { data: user, isLoading } = useQuery<AuthUser | null>({
    queryKey: ["/api/auth/user"],
    queryFn: fetchUser,
    retry: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.setQueryData(["/api/auth/user"], null);
    },
  });

  const businessType = user?.tenant?.businessType || "service";

  return {
    user,
    tenant: user?.tenant,
    businessType,
    isLoading,
    isAuthenticated: !!user,
    logout: logoutMutation.mutate,
    isLoggingOut: logoutMutation.isPending,
  };
}
