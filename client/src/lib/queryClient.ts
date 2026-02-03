import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  
  // Try admin token first, then user token
  const adminToken = localStorage.getItem("mybizstream_admin_token");
  const userToken = localStorage.getItem("accessToken");
  const token = adminToken || userToken;
  
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  } else {
    // Only warn if we're not on a public page
    const publicPaths = ["/", "/login", "/register", "/pricing", "/packages", "/checkout"];
    if (!publicPaths.some(path => window.location.pathname === path || window.location.pathname.startsWith("/portal"))) {
      console.warn("[getAuthHeaders] No token found in localStorage. Path:", window.location.pathname);
      // Log all localStorage keys for debugging
      console.warn("[getAuthHeaders] localStorage keys:", Object.keys(localStorage));
    }
  }
  
  // Include tenant context for API isolation
  const tenantId = localStorage.getItem("lastTenantId") || localStorage.getItem("tenantId");
  if (tenantId) {
    headers["X-Tenant-ID"] = tenantId;
  }
  
  // Include impersonation header if set
  const impersonatedStaffId = sessionStorage.getItem("impersonation_staff_id");
  if (impersonatedStaffId) {
    headers["X-Impersonate-Staff-Id"] = impersonatedStaffId;
  }
  
  return headers;
}

let refreshPromise: Promise<boolean> | null = null;

async function refreshAccessToken(): Promise<boolean> {
  // If a refresh is already in progress, wait for it
  if (refreshPromise) {
    console.log("[queryClient] Token refresh already in progress, waiting...");
    return refreshPromise;
  }

  const refreshToken = localStorage.getItem("refreshToken");
  if (!refreshToken) {
    console.log("[queryClient] No refresh token available");
    return false;
  }
  
  // Create a promise for the refresh operation
  refreshPromise = (async () => {
    try {
      const response = await fetch("/api/auth/token/refresh", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });
      
      // Check content-type to avoid parsing HTML as JSON
      const contentType = response.headers.get("content-type");
      const isJson = contentType && contentType.includes("application/json");
      
      if (response.ok && isJson) {
        const tokens = await response.json();
        localStorage.setItem("accessToken", tokens.accessToken);
        localStorage.setItem("refreshToken", tokens.refreshToken);
        console.log("[queryClient] Token refreshed successfully");
        return true;
      }
      
      // If we got HTML instead of JSON, likely a redirect to login page
      if (!isJson) {
        console.warn("[queryClient] Token refresh returned non-JSON response, redirecting to login");
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        // Don't redirect here - let the calling code handle it
        return false;
      }
      
      // Only clear tokens if server explicitly rejected them
      if (response.status === 401 || response.status === 403) {
        console.log("[queryClient] Token refresh rejected, clearing tokens");
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
      }
      return false;
    } catch (err) {
      // Network error - don't clear tokens, might be temporary
      console.warn("[queryClient] Token refresh network error:", err);
      return false;
    } finally {
      // Clear the promise after a short delay to allow for retry scenarios
      setTimeout(() => { refreshPromise = null; }, 100);
    }
  })();

  return refreshPromise;
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const makeRequest = async () => {
    const headers: Record<string, string> = {
      ...getAuthHeaders(),
      ...(data ? { "Content-Type": "application/json" } : {}),
    };

    return fetch(url, {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
    });
  };

  let res = await makeRequest();

  // If 401, try to refresh token and retry once
  if (res.status === 401) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      res = await makeRequest();
    }
  }

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";

function buildUrl(queryKey: readonly unknown[]): string {
  const pathSegments: string[] = [];
  const mergedParams: Record<string, unknown> = {};
  
  for (const segment of queryKey) {
    if (typeof segment === 'string') {
      pathSegments.push(segment);
    } else if (segment && typeof segment === 'object' && !Array.isArray(segment)) {
      Object.assign(mergedParams, segment);
    }
  }
  
  if (pathSegments.length === 0) {
    throw new Error('queryKey must contain at least one string URL segment');
  }
  
  // Join segments and ensure leading slash for same-origin requests
  const joinedPath = pathSegments.join('/').replace(/^\/+/, '');
  const basePath = '/' + joinedPath;
  
  const paramEntries = Object.entries(mergedParams);
  if (paramEntries.length > 0) {
    const searchParams = new URLSearchParams();
    for (const [key, value] of paramEntries) {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, String(value));
      }
    }
    const queryString = searchParams.toString();
    return queryString ? `${basePath}?${queryString}` : basePath;
  }
  
  return basePath;
}

export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const url = buildUrl(queryKey);
    
    const makeRequest = async () => {
      return fetch(url, {
        credentials: "include",
        headers: getAuthHeaders(),
      });
    };

    let res = await makeRequest();

    // If 401, try to refresh token and retry once
    if (res.status === 401) {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        res = await makeRequest();
      }
    }

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
