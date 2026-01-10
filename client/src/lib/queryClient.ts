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
  }
  
  // Include tenant context for API isolation
  const tenantId = localStorage.getItem("lastTenantId") || localStorage.getItem("tenantId");
  if (tenantId) {
    headers["X-Tenant-ID"] = tenantId;
  }
  
  return headers;
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const headers: Record<string, string> = {
    ...getAuthHeaders(),
    ...(data ? { "Content-Type": "application/json" } : {}),
  };

  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

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
  
  const basePath = pathSegments.length === 1 ? pathSegments[0] : pathSegments.join('/');
  
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
    const res = await fetch(url, {
      credentials: "include",
      headers: getAuthHeaders(),
    });

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
