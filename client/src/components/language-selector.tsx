import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Globe } from "lucide-react";
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from "@/i18n";
import { useI18nLanguage } from "@/hooks/use-i18n-language";
import { useCountry } from "@/contexts/country-context";
import { useMemo, useEffect } from "react";

// Country-specific language mappings
const COUNTRY_LANGUAGES: Record<string, SupportedLanguage[]> = {
  IN: ["en", "hi", "te", "ta", "kn", "ml"], // India: English + Indian languages
  MY: ["en", "ms", "zh"], // Malaysia: English, Malay, Chinese
  GB: ["en"], // UK: English only
  UK: ["en"], // UK alternate code
  AE: ["en"], // UAE: English
  SG: ["en", "zh", "ms"], // Singapore: English, Chinese, Malay
  US: ["en"], // US: English
};

interface LanguageSelectorProps {
  tenantId?: string;
  onLanguageChange?: (lang: SupportedLanguage) => void;
  className?: string;
}

export function LanguageSelector({ tenantId, onLanguageChange, className = "" }: LanguageSelectorProps) {
  const { lang, setLanguage } = useI18nLanguage(tenantId);
  const { country } = useCountry();
  
  // Get languages available for current country
  const availableLanguages = useMemo(() => {
    const countryLangCodes = COUNTRY_LANGUAGES[country.code] || ["en"];
    return SUPPORTED_LANGUAGES.filter(l => countryLangCodes.includes(l.code as SupportedLanguage));
  }, [country.code]);
  
  const currentLanguage = availableLanguages.find(l => l.code === lang) || availableLanguages[0];

  // Auto-switch to valid language if current language is not available for this country
  useEffect(() => {
    const countryLangCodes = COUNTRY_LANGUAGES[country.code] || ["en"];
    if (!countryLangCodes.includes(lang as SupportedLanguage)) {
      setLanguage("en");
    }
  }, [country.code, lang, setLanguage]);

  const handleLanguageChange = (langCode: SupportedLanguage) => {
    setLanguage(langCode);
    onLanguageChange?.(langCode);
  };

  // Don't show selector if only one language available
  if (availableLanguages.length <= 1) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className={`gap-2 ${className}`}
          data-testid="button-language-selector"
        >
          <Globe className="h-4 w-4" />
          <span className="hidden sm:inline">{currentLanguage.nativeName}</span>
          <span className="text-muted-foreground text-xs hidden sm:inline">({currentLanguage.code.toUpperCase()})</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" data-testid="dropdown-language-menu">
        {availableLanguages.map((language) => (
          <DropdownMenuItem
            key={language.code}
            onClick={() => handleLanguageChange(language.code as SupportedLanguage)}
            className={lang === language.code ? "bg-accent" : ""}
            data-testid={`menu-item-lang-${language.code}`}
          >
            <span className="mr-2">{language.nativeName}</span>
            <span className="text-muted-foreground text-xs">({language.code.toUpperCase()})</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
