import { Button } from "@/components/ui/button";

type Lang = "en" | "hi";

interface LanguageToggleProps {
  lang: Lang;
  onLangChange: (lang: Lang) => void;
}

const REGIONAL_LANGUAGES = [
  { code: "ta", name: "தமிழ்" },
  { code: "te", name: "తెలుగు" },
  { code: "kn", name: "ಕನ್ನಡ" },
  { code: "ml", name: "മലയാളം" },
  { code: "mr", name: "मराठी" },
  { code: "bn", name: "বাংলা" }
];

export function LanguageToggle({ lang, onLangChange }: LanguageToggleProps) {
  return (
    <div className="flex rounded-lg border p-1" data-testid="lang-toggle">
      <Button
        variant={lang === "en" ? "secondary" : "ghost"}
        size="sm"
        onClick={() => onLangChange("en")}
        className="h-7 px-3"
        data-testid="button-lang-en"
      >
        EN
      </Button>
      <Button
        variant={lang === "hi" ? "secondary" : "ghost"}
        size="sm"
        onClick={() => onLangChange("hi")}
        className="h-7 px-3"
        data-testid="button-lang-hi"
      >
        हिंदी
      </Button>
    </div>
  );
}

export function RegionalLanguagePlaceholder({ lang }: { lang: Lang }) {
  return (
    <div className="pt-8 border-t text-center" data-testid="regional-languages-placeholder">
      <p className="text-sm text-muted-foreground mb-2">
        {lang === "en" ? "Coming soon in:" : "जल्द ही उपलब्ध:"}
      </p>
      <p className="text-sm text-muted-foreground font-medium">
        {REGIONAL_LANGUAGES.map(l => l.name).join(" | ")}
      </p>
    </div>
  );
}
