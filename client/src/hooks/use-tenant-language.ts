import { useState, useCallback } from "react";

export type Lang = "en" | "hi";

function storageKey(tenantId?: string) {
  return tenantId ? `tenant:${tenantId}:lang` : "app:lang";
}

export function useTenantLanguage(tenantId?: string) {
  const key = storageKey(tenantId);

  const [lang, setLangState] = useState<Lang>(() => {
    const saved = typeof window !== "undefined" ? window.localStorage.getItem(key) : null;
    return saved === "hi" || saved === "en" ? (saved as Lang) : "en";
  });

  const setLang = useCallback(
    (next: Lang) => {
      setLangState(next);
      if (typeof window !== "undefined") window.localStorage.setItem(key, next);
    },
    [key]
  );

  return { lang, setLang };
}
