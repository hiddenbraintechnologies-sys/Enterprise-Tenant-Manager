import type { Lang } from "@/hooks/use-tenant-language";

export function LanguageToggle({
  lang,
  onChange,
  className = "",
}: {
  lang: Lang;
  onChange: (lang: Lang) => void;
  className?: string;
}) {
  return (
    <div className={`inline-flex rounded-xl border p-1 ${className}`} data-testid="language-toggle">
      <button
        type="button"
        onClick={() => onChange("en")}
        className={`rounded-lg px-3 py-1 text-sm transition-colors ${
          lang === "en" ? "bg-primary text-primary-foreground" : "hover:bg-muted"
        }`}
        aria-pressed={lang === "en"}
        data-testid="button-lang-en"
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => onChange("hi")}
        className={`rounded-lg px-3 py-1 text-sm transition-colors ${
          lang === "hi" ? "bg-primary text-primary-foreground" : "hover:bg-muted"
        }`}
        aria-pressed={lang === "hi"}
        data-testid="button-lang-hi"
      >
        हिंदी
      </button>
    </div>
  );
}
