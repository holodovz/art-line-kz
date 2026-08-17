/** Signal Workshop component: a compact, high-contrast RU/KZ/EN route switch designed as a technical toggle. */
import { Languages } from "lucide-react";
import { Language, languageMeta } from "@/lib/i18n";

export function LanguageSwitch({ lang, compact = false }: { lang: Language; compact?: boolean }) {
  const currentHash = typeof window === "undefined" ? "" : window.location.hash;
  const languages: Language[] = ["ru", "kz", "en"];

  return (
    <div className={`language-switch ${compact ? "language-switch--compact" : ""}`} aria-label="Language selector">
      {!compact && <Languages size={14} aria-hidden="true" />}
      {languages.map((language, index) => <span key={language} className="contents">{index > 0 && <span aria-hidden="true">/</span>}<a href={`${languageMeta[language].path}${currentHash}`} className={lang === language ? "is-active" : ""} aria-current={lang === language ? "page" : undefined}>{languageMeta[language].code}</a></span>)}
    </div>
  );
}
