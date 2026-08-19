import { useEffect } from "react";
import { copy, Language, languageMeta } from "@/lib/i18n";

const SITE_NAME = "Art Line";
const descriptions: Record<Language, string> = {
  ru: "Изготовление вывесок, световых букв, лайтбоксов, навигации и брендирования в Алматы — от замера и макета до производства и монтажа.",
  kz: "Алматыда маңдайша, жарық әріптер, лайтбокс, навигация және брендтеу жасау — өлшеуден макет пен монтажға дейін.",
  en: "Signage, illuminated letters, lightboxes, wayfinding and branding in Almaty — from survey and layout to production and installation.",
};

function setMeta(name: string, content: string) {
  let element = document.head.querySelector(`meta[name="${name}"]`);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute("name", name);
    document.head.appendChild(element);
  }
  element.setAttribute("content", content);
}

function setProperty(property: string, content: string) {
  let element = document.head.querySelector(`meta[property="${property}"]`);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute("property", property);
    document.head.appendChild(element);
  }
  element.setAttribute("content", content);
}

function setLink(rel: string, href: string, hreflang?: string) {
  const selector = hreflang ? `link[rel="${rel}"][hreflang="${hreflang}"]` : `link[rel="${rel}"]`;
  let element = document.head.querySelector(selector);
  if (!element) {
    element = document.createElement("link");
    element.setAttribute("rel", rel);
    if (hreflang) element.setAttribute("hreflang", hreflang);
    document.head.appendChild(element);
  }
  element.setAttribute("href", href);
}

export default function SeoHead({ lang }: { lang: Language }) {
  useEffect(() => {
    const origin = window.location.origin;
    const path = languageMeta[lang].path;
    const canonical = `${origin}${path}`;
    const title = copy[lang].seoTitle;
    const description = descriptions[lang];
    document.documentElement.lang = languageMeta[lang].htmlLang;
    document.title = title;
    setMeta("description", description);
    setMeta("robots", "index,follow");
    setProperty("og:type", "website");
    setProperty("og:site_name", SITE_NAME);
    setProperty("og:title", title);
    setProperty("og:description", description);
    setProperty("og:url", canonical);
    setProperty("og:locale", lang === "ru" ? "ru_RU" : lang === "kz" ? "kk_KZ" : "en_US");
    setProperty("og:image", `${origin}/manus-storage/artline-hero-signage_a386fa2d.jpg`);
    setMeta("twitter:card", "summary_large_image");
    setMeta("twitter:title", title);
    setMeta("twitter:description", description);
    setLink("canonical", canonical);
    Object.values(languageMeta).forEach((meta) => setLink("alternate", `${origin}${meta.path}`, meta.htmlLang));
    setLink("alternate", `${origin}/`, "x-default");

    const scriptId = "artline-local-business-jsonld";
    document.getElementById(scriptId)?.remove();
    const script = document.createElement("script");
    script.id = scriptId;
    script.type = "application/ld+json";
    script.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      name: SITE_NAME,
      url: canonical,
      telephone: "+7 776 006 38 19",
      image: `${origin}/manus-storage/artline-hero-signage_a386fa2d.jpg`,
      address: {
        "@type": "PostalAddress",
        streetAddress: "Торетай, 43",
        addressLocality: "Алматы",
        addressCountry: "KZ",
      },
      openingHours: "Mo-Sa 08:00-18:00",
      areaServed: "Almaty",
      sameAs: [],
    });
    document.head.appendChild(script);
  }, [lang]);

  return null;
}
