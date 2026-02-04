import { useEffect, useCallback } from "react";
import { useLocation } from "wouter";

interface SessionInvalidatedResponse {
  error: string;
  code: string;
  message: string;
}

/**
 * Hook to handle session invalidation (force logout) globally.
 * 
 * Intercepts 401 responses with SESSION_INVALIDATED code and redirects to login.
 */
export function useSessionValidation() {
  const [, setLocation] = useLocation();

  const handleSessionInvalidated = useCallback(() => {
    setLocation("/login?reason=session_invalidated");
  }, [setLocation]);

  useEffect(() => {
    const originalFetch = window.fetch;

    window.fetch = async (...args) => {
      const response = await originalFetch(...args);

      if (response.status === 401) {
        try {
          const clonedResponse = response.clone();
          const data: SessionInvalidatedResponse = await clonedResponse.json();
          
          if (data.code === "SESSION_INVALIDATED") {
            handleSessionInvalidated();
          }
        } catch {
          // Not JSON or parsing failed, ignore
        }
      }

      return response;
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, [handleSessionInvalidated]);
}
