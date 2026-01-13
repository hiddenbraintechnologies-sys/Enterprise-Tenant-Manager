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

interface LanguageSelectorProps {
  tenantId?: string;
  onLanguageChange?: (lang: SupportedLanguage) => void;
  className?: string;
}

export function LanguageSelector({ tenantId, onLanguageChange, className = "" }: LanguageSelectorProps) {
  const { lang, setLanguage } = useI18nLanguage(tenantId);
  const currentLanguage = SUPPORTED_LANGUAGES.find(l => l.code === lang) || SUPPORTED_LANGUAGES[0];

  const handleLanguageChange = (langCode: SupportedLanguage) => {
    setLanguage(langCode);
    onLanguageChange?.(langCode);
  };

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
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" data-testid="dropdown-language-menu">
        {SUPPORTED_LANGUAGES.map((language) => (
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
