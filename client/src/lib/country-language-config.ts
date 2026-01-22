export type CountryCode = "IN" | "MY" | "UK" | "AE" | "SG";

export interface LanguageOption {
  code: string;
  name: string;
  nativeName: string;
}

export interface CountryLanguageConfig {
  languages: LanguageOption[];
  defaultLanguage: string;
}

export const COUNTRY_LANGUAGE_MAP: Record<CountryCode, CountryLanguageConfig> = {
  IN: {
    languages: [
      { code: "en", name: "English (India)", nativeName: "English" },
      { code: "hi", name: "Hindi", nativeName: "हिंदी" },
      { code: "ta", name: "Tamil", nativeName: "தமிழ்" },
      { code: "te", name: "Telugu", nativeName: "తెలుగు" },
      { code: "kn", name: "Kannada", nativeName: "ಕನ್ನಡ" },
      { code: "ml", name: "Malayalam", nativeName: "മലയാളം" },
    ],
    defaultLanguage: "en",
  },
  MY: {
    languages: [
      { code: "en", name: "English (Malaysia)", nativeName: "English" },
      { code: "ms", name: "Malay", nativeName: "Bahasa Malaysia" },
      { code: "zh", name: "Chinese (Simplified)", nativeName: "中文（简体）" },
      { code: "ta", name: "Tamil", nativeName: "தமிழ்" },
    ],
    defaultLanguage: "en",
  },
  UK: {
    languages: [
      { code: "en", name: "English (UK)", nativeName: "English" },
    ],
    defaultLanguage: "en",
  },
  AE: {
    languages: [
      { code: "en", name: "English (UAE)", nativeName: "English" },
    ],
    defaultLanguage: "en",
  },
  SG: {
    languages: [
      { code: "en", name: "English (Singapore)", nativeName: "English" },
      { code: "zh", name: "Chinese (Simplified)", nativeName: "中文（简体）" },
      { code: "ms", name: "Malay", nativeName: "Bahasa Melayu" },
      { code: "ta", name: "Tamil", nativeName: "தமிழ்" },
    ],
    defaultLanguage: "en",
  },
};

export const STORAGE_KEY_LANGUAGE = "app:lang";
export const STORAGE_KEY_COUNTRY = "app:country";

export function getLanguagesForCountry(countryCode: CountryCode): LanguageOption[] {
  return COUNTRY_LANGUAGE_MAP[countryCode]?.languages || COUNTRY_LANGUAGE_MAP.IN.languages;
}

export function getDefaultLanguageForCountry(countryCode: CountryCode): string {
  return COUNTRY_LANGUAGE_MAP[countryCode]?.defaultLanguage || "en";
}

export function isLanguageValidForCountry(languageCode: string, countryCode: CountryCode): boolean {
  const config = COUNTRY_LANGUAGE_MAP[countryCode];
  if (!config) return false;
  return config.languages.some((lang) => lang.code === languageCode);
}

export function getStoredLanguage(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(STORAGE_KEY_LANGUAGE);
  } catch {
    return null;
  }
}

export function setStoredLanguage(code: string) {
  try {
    localStorage.setItem(STORAGE_KEY_LANGUAGE, code);
    document.cookie = `language=${code};path=/;max-age=31536000`;
  } catch {
    // ignore storage errors
  }
}

export function getStoredCountryCode(): CountryCode | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(STORAGE_KEY_COUNTRY);
    if (stored && ["IN", "MY", "UK", "AE", "SG"].includes(stored)) {
      return stored as CountryCode;
    }
    return null;
  } catch {
    return null;
  }
}
