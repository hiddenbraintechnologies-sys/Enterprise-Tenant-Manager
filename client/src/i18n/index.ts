import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import en from "./locales/en.json";
import hi from "./locales/hi.json";
import te from "./locales/te.json";
import ta from "./locales/ta.json";
import kn from "./locales/kn.json";
import ml from "./locales/ml.json";
import ms from "./locales/ms.json";
import zh from "./locales/zh.json";

export const SUPPORTED_LANGUAGES = [
  { code: "en", name: "English", nativeName: "English" },
  { code: "hi", name: "Hindi", nativeName: "हिंदी" },
  { code: "te", name: "Telugu", nativeName: "తెలుగు" },
  { code: "ta", name: "Tamil", nativeName: "தமிழ்" },
  { code: "kn", name: "Kannada", nativeName: "ಕನ್ನಡ" },
  { code: "ml", name: "Malayalam", nativeName: "മലയാളം" },
  { code: "ms", name: "Malay", nativeName: "Bahasa Malaysia" },
  { code: "zh", name: "Chinese", nativeName: "中文（简体）" },
] as const;

export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number]["code"];

const resources = {
  en: { translation: en },
  hi: { translation: hi },
  te: { translation: te },
  ta: { translation: ta },
  kn: { translation: kn },
  ml: { translation: ml },
  ms: { translation: ms },
  zh: { translation: zh },
};

const supportedCodes = SUPPORTED_LANGUAGES.map((l) => l.code);
const raw = localStorage.getItem("app:lang") || "";
const normalized = raw.split("-")[0];
if (raw && raw !== normalized) {
  localStorage.setItem("app:lang", normalized);
}
const isSupported = supportedCodes.includes(normalized as SupportedLanguage);
const validLng: SupportedLanguage = isSupported ? (normalized as SupportedLanguage) : "en";
if (raw && !isSupported) {
  localStorage.setItem("app:lang", "en");
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    lng: validLng,
    fallbackLng: "en",
    load: "languageOnly",
    supportedLngs: SUPPORTED_LANGUAGES.map((l) => l.code),
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
      lookupLocalStorage: "app:lang",
    },
    react: {
      useSuspense: false,
    },
  });

if (import.meta.env.DEV) {
  (window as any).__i18n = i18n;
}

export default i18n;
