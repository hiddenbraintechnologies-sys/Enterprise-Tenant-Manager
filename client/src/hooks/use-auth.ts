import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { User } from "@shared/models/auth";

export type BusinessType = "clinic" | "salon" | "pg" | "pg_hostel" | "coworking" | "service" | "real_estate" | "tourism" | "education" | "logistics" | "legal" | "furniture_manufacturing" | "software_services" | "consulting";

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
    credentials: "include",
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
  const refreshToken = localStorage.getItem("refreshToken");
  
  console.log("[useAuth] fetchUser called", { 
    hasAccessToken: !!accessToken, 
    hasRefreshToken: !!refreshToken,
    accessTokenPrefix: accessToken ? accessToken.substring(0, 20) + "..." : null 
  });
  
  // JWT Authentication path - primary for registered users
  if (accessToken) {
    const response = await fetch("/api/auth/me", {
      credentials: "include",
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
        try {
          const refreshResponse = await fetch("/api/auth/token/refresh", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refreshToken }),
          });
          
          // Check content-type to avoid parsing HTML as JSON
          const contentType = refreshResponse.headers.get("content-type") || "";
          if (!contentType.includes("application/json")) {
            console.warn("[useAuth] Token refresh returned non-JSON response, clearing tokens");
            localStorage.removeItem("accessToken");
            localStorage.removeItem("refreshToken");
            return null;
          }
          
          if (refreshResponse.ok) {
            const tokens = await refreshResponse.json();
            localStorage.setItem("accessToken", tokens.accessToken);
            localStorage.setItem("refreshToken", tokens.refreshToken);
            return fetchUser();
          }
          
          // Only clear tokens if refresh explicitly failed (not network error)
          if (refreshResponse.status === 401 || refreshResponse.status === 403) {
            console.log("[useAuth] Token refresh rejected by server, clearing tokens");
            localStorage.removeItem("accessToken");
            localStorage.removeItem("refreshToken");
          }
        } catch (err) {
          // Network error during refresh - don't clear tokens, might be temporary
          console.warn("[useAuth] Token refresh network error, keeping tokens:", err);
        }
      } else {
        // No refresh token available - clear access token
        console.log("[useAuth] No refresh token available, clearing access token");
        localStorage.removeItem("accessToken");
      }
      return null;
    }
    
    // Non-401 error from /api/auth/me - return null, don't fallback
    return null;
  }

  // Replit Auth fallback - only used when no JWT tokens exist
  // This is for users who haven't registered yet but might have Replit session
  console.log("[useAuth] No JWT token, falling back to Replit session auth");
  const response = await fetch("/api/auth/user", {
    credentials: "include",
  });

  if (response.status === 401) {
    return null;
  }

  if (!response.ok) {
    return null;
  }

  const userData = await response.json();
  
  // If Replit session is valid, exchange it for JWT tokens for subsequent API calls
  // This ensures all API calls work properly with the JWT auth flow
  if (userData && userData.id) {
    console.log("[useAuth] Replit session valid, exchanging for JWT tokens");
    try {
      const exchangeResponse = await fetch("/api/auth/session/exchange", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      
      if (exchangeResponse.ok) {
        const tokens = await exchangeResponse.json();
        localStorage.setItem("accessToken", tokens.accessToken);
        localStorage.setItem("refreshToken", tokens.refreshToken);
        if (tokens.tenant?.id) {
          localStorage.setItem("tenantId", tokens.tenant.id);
          localStorage.setItem("lastTenantId", tokens.tenant.id);
        }
        console.log("[useAuth] Session exchanged for JWT tokens successfully");
        
        // Use exchange response data as the authoritative source for all fields
        const tenant = tokens.tenant ? {
          id: tokens.tenant.id,
          name: tokens.tenant.name,
          businessType: tokens.tenant.businessType,
          onboardingCompleted: tokens.tenant.onboardingCompleted,
          country: tokens.tenant.country,
          region: tokens.tenant.region,
          currency: tokens.tenant.currency,
          timezone: tokens.tenant.timezone,
        } : userData.tenant;
        
        // Calculate dashboard route from authoritative tenant data
        const businessType = tenant?.businessType || "service";
        const dashboardRoute = `/dashboard/${businessType === "coworking" ? "coworking" : businessType}`;
        
        return {
          id: tokens.user?.id || userData.id,
          email: tokens.user?.email || userData.email,
          firstName: tokens.user?.firstName || userData.firstName,
          lastName: tokens.user?.lastName || userData.lastName,
          profileImageUrl: userData.profileImageUrl,
          tenant,
          dashboardRoute,
        } as AuthUser;
      } else {
        // Exchange failed - this means the session is valid for /api/auth/user but
        // cannot be exchanged for JWT. Force re-login to ensure proper auth state.
        console.error("[useAuth] Session exchange failed - forcing re-login");
        // Clear any stale tokens and redirect to login
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("tenantId");
        // Redirect to logout to clear session and force fresh login
        window.location.href = "/api/logout";
        return null;
      }
    } catch (err) {
      console.error("[useAuth] Session exchange error - forcing re-login:", err);
      // Clear any stale tokens and redirect to login
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("tenantId");
      window.location.href = "/api/logout";
      return null;
    }
  }

  return userData;
}

async function logout(): Promise<void> {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  window.location.href = "/api/logout";
}

// Exported query key for consistent invalidation across components
export const AUTH_QUERY_KEY = ["/api/auth"];

export function useAuth() {
  const queryClient = useQueryClient();
  const { data: user, isLoading } = useQuery<AuthUser | null>({
    queryKey: AUTH_QUERY_KEY,
    queryFn: fetchUser,
    retry: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.setQueryData(AUTH_QUERY_KEY, null);
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
