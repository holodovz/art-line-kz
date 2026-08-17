/** Signal Workshop component: a compact, high-contrast RU/KZ route switch designed as a technical toggle. */
import { Languages } from "lucide-react";
import { Language, languageMeta } from "@/lib/i18n";

export function LanguageSwitch({ lang, compact = false }: { lang: Language; compact?: boolean }) {
  const currentHash = typeof window === "undefined" ? "" : window.location.hash;
  const target = lang === "ru" ? "kz" : "ru";
  const url = `${languageMeta[target].path}${currentHash}`;

  return (
    <div className={`language-switch ${compact ? "language-switch--compact" : ""}`} aria-label="Language selector">
      {!compact && <Languages size={14} aria-hidden="true" />}
      <a href={`${languageMeta.ru.path}${currentHash}`} className={lang === "ru" ? "is-active" : ""} aria-current={lang === "ru" ? "page" : undefined}>RU</a>
      <span aria-hidden="true">/</span>
      <a href={url} className={lang === "kz" ? "is-active" : ""} aria-current={lang === "kz" ? "page" : undefined}>KZ</a>
    </div>
  );
}
