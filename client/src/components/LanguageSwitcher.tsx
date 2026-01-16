import { useTranslation } from "react-i18next";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const LANGS = [
  { code: "en", labelKey: "language.en" },
  { code: "ms", labelKey: "language.ms" },
  { code: "ta", labelKey: "language.ta" }
];

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
  const value = i18n.language || "en";

  return (
    <Select value={value} onValueChange={(v) => i18n.changeLanguage(v)}>
      <SelectTrigger className="w-[220px]" data-testid="select-language">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {LANGS.map((l) => (
          <SelectItem key={l.code} value={l.code} data-testid={`option-language-${l.code}`}>
            {t(l.labelKey)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
