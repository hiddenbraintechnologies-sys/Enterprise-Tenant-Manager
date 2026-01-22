import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Globe } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  type CountryCode,
  getLanguagesForCountry,
  getDefaultLanguageForCountry,
  isLanguageValidForCountry,
  getStoredLanguage,
  setStoredLanguage,
  getStoredCountryCode,
} from "@/lib/country-language-config";

interface LandingLanguageSelectorProps {
  countryCode: CountryCode | null;
  className?: string;
}

export function LandingLanguageSelector({ countryCode, className = "" }: LandingLanguageSelectorProps) {
  const { i18n } = useTranslation();
  const storedCountry = getStoredCountryCode();
  const effectiveCountry = countryCode || storedCountry || "IN";
  const availableLanguages = getLanguagesForCountry(effectiveCountry);
  const currentLang = i18n.language;
  const currentLanguage = availableLanguages.find((l) => l.code === currentLang) || availableLanguages[0];

  useEffect(() => {
    const targetCountry = countryCode || storedCountry;
    if (!targetCountry) return;

    const storedLang = getStoredLanguage();
    const currentIsValid = isLanguageValidForCountry(currentLang, targetCountry);

    if (!currentIsValid) {
      const defaultLang = getDefaultLanguageForCountry(targetCountry);
      i18n.changeLanguage(defaultLang);
      setStoredLanguage(defaultLang);
    } else if (storedLang && storedLang !== currentLang && isLanguageValidForCountry(storedLang, targetCountry)) {
      i18n.changeLanguage(storedLang);
    }
  }, [countryCode, storedCountry, currentLang, i18n]);

  const handleLanguageChange = (langCode: string) => {
    i18n.changeLanguage(langCode);
    setStoredLanguage(langCode);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={`gap-2 ${className}`}
          data-testid="button-landing-language-selector"
        >
          <Globe className="h-4 w-4" />
          <span className="hidden sm:inline">{currentLanguage?.nativeName || "English"}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" data-testid="dropdown-landing-language-menu">
        {availableLanguages.map((language) => (
          <DropdownMenuItem
            key={language.code}
            onClick={() => handleLanguageChange(language.code)}
            className={currentLang === language.code ? "bg-accent" : ""}
            data-testid={`menu-item-lang-${language.code}`}
          >
            <span className="mr-2">{language.nativeName}</span>
            <span className="text-muted-foreground text-xs">({language.name})</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
