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
      targetLang = window.localStorage.getItem(key);
    }

    if (targetLang && targetLang !== i18n.language) {
      i18n.changeLanguage(targetLang);
    }
  }, [tenantSettings, i18n, key]);

  const setLanguage = useCallback(
    (lang: SupportedLanguage) => {
      i18n.changeLanguage(lang);
      
      if (typeof window !== "undefined") {
        window.localStorage.setItem(key, lang);
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
