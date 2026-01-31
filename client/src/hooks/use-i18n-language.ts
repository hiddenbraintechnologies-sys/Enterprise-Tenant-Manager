import { useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { SupportedLanguage } from "@/i18n";

function storageKey(tenantId?: string) {
  return tenantId ? `tenant:${tenantId}:lang` : "app:lang";
}

interface TenantSettingsResponse {
  language?: string;
}

export function useI18nLanguage(tenantId?: string) {
  const { i18n } = useTranslation();
  const key = storageKey(tenantId);

  const { data: tenantSettings } = useQuery<TenantSettingsResponse>({
    queryKey: ["/api/tenant/settings"],
    enabled: !!tenantId,
    retry: false,
    staleTime: 1000 * 60 * 5,
  });

  const updateLanguageMutation = useMutation({
    mutationFn: async (language: string) => {
      return apiRequest("PATCH", "/api/tenant/settings", { language });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tenant/settings"] });
    },
  });

  useEffect(() => {
    let targetLang: string | null = null;

    if (tenantSettings?.language) {
      targetLang = tenantSettings.language;
    } else if (typeof window !== "undefined") {
      // Check tenant-specific storage first
      targetLang = window.localStorage.getItem(key);
      
      // If no tenant-specific language and we have a tenantId, 
      // fall back to app-level language for consistency
      if (!targetLang && tenantId) {
        const appLang = window.localStorage.getItem("app:lang");
        if (appLang) {
          targetLang = appLang;
          // Also sync it to tenant-specific storage for future use
          window.localStorage.setItem(key, appLang);
        }
      }
    }

    if (targetLang && targetLang !== i18n.language) {
      i18n.changeLanguage(targetLang);
    }
  }, [tenantSettings, i18n, key, tenantId]);

  const setLanguage = useCallback(
    (lang: SupportedLanguage) => {
      i18n.changeLanguage(lang);
      
      if (typeof window !== "undefined") {
        // Always store to the current key (tenant or app level)
        window.localStorage.setItem(key, lang);
        // Also always sync to app-level for consistency across flows
        window.localStorage.setItem("app:lang", lang);
      }

      if (tenantId) {
        updateLanguageMutation.mutate(lang);
      }
    },
    [i18n, key, tenantId, updateLanguageMutation]
  );

  return { 
    lang: i18n.language as SupportedLanguage, 
    setLanguage,
    isUpdating: updateLanguageMutation.isPending 
  };
}

export type { SupportedLanguage };
