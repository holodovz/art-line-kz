/** Signal Workshop homepage: industrial editorial layout with accessible actions and resilient media. */
import { FormEvent, TouchEvent, useCallback, useEffect, useRef, useState } from "react";
import { ArrowDownRight, ArrowUpRight, Check, ChevronLeft, ChevronRight, CircleDot, MapPinned, Menu, MessageCircle, MoveRight, Phone, Plus, X } from "lucide-react";
import { MapView } from "@/components/Map";
import { ModalFrame } from "@/components/ModalFrame";
import { LanguageSwitch } from "@/components/LanguageSwitch";
import SeoHead from "@/components/SeoHead";
import { getCircularIndex } from "@/lib/interaction";
import { copy, Language, languageMeta } from "@/lib/i18n";
import { trackMarketingEvent } from "@/lib/analytics";

const ASSETS = {
  logo: "/manus-storage/artline-logo-gold-cropped_db33abe9.png",
  hero: "/manus-storage/artline-hero-signage_a386fa2d.jpg",
};
const isExternalStaticHost = typeof window !== "undefined" && !(
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1" ||
  window.location.hostname.endsWith(".manus.space") ||
  window.location.hostname.endsWith(".manus.computer") ||
  window.location.hostname.endsWith(".manuspre.computer")
);
const CONTACT = {
  phoneHref: "+77760063819",
  phoneLabel: "+7 776 006 38 19",
  whatsapp: "77760063819",
  location: { lat: 43.270438, lng: 76.924892 },
  coordinateLabel: "43.2704, 76.9249",
};
const FORMAT_BLUEPRINTS = [
  "/manus-storage/artline-format-facade-blueprint_8ba9774c.png",
  "/manus-storage/artline-format-retail-blueprint_0e25df61.png",
  "/manus-storage/artline-format-interior-blueprint_e7f238df.png",
] as const;
const PORTFOLIO = [
  ["/manus-storage/portfolio-city-installation_d8b55221.jpg", "City installation"],
  ["/manus-storage/portfolio-shell-facade_2cc4a56b.jpg", "Shell façade"],
  ["/manus-storage/portfolio-service-station_27c29742.jpg", "Service station"],
  ["/manus-storage/portfolio-cinema-sign_8df63e59.jpg", "Cinema signage"],
  ["/manus-storage/portfolio-window-installation_8b8d6717.jpg", "Window installation"],
  ["/manus-storage/portfolio-art-illuminated-letters_88b6b458.jpg", "Illuminated letters"],
  ["/manus-storage/portfolio-art-asia-sign_b6a12ee6.jpg", "Art Asia sign"],
  ["/manus-storage/portfolio-retail-cubex_7b51312f.jpg", "Retail branding"],
  ["/manus-storage/portfolio-retail-wall-branding_bdfecc9d.jpg", "Retail wall"],
  ["/manus-storage/portfolio-retail-display_2d0e5b4d.jpg", "Retail display"],
  ["/manus-storage/portfolio-floor-logo_11ed0c61.jpg", "Floor logo"],
  ["/manus-storage/portfolio-reception-branding_1f95530d.jpg", "Reception branding"],
  ["/manus-storage/portfolio-event-wall_9c086a8e.jpg", "Event wall"],
] as const;
const portfolioText = {
  ru: { kicker: "03 / ПОРТФОЛИО", title: ["Работы,", "которые уже видны."], text: "Реальные проекты из архива Art Line: фасадные вывески, световые буквы, оформление ритейла и интерьерные решения.", all: "Открыть фото", close: "Закрыть фото", previous: "Предыдущее фото", next: "Следующее фото", archive: "Архив Art Line", proof: "Реальная работа", labels: ["Городская инсталляция", "Фасадная вывеска", "Оформление АЗС", "Вывеска кинотеатра", "Оформление витрины", "Световые буквы", "Световой знак", "Брендирование ритейла", "Брендированная стена", "Торговая стойка", "Логотип в интерьере", "Ресепшен", "Пресс-волл"] },
  kz: { kicker: "03 / ПОРТФОЛИО", title: ["Көрінетін", "жұмыстар."], text: "Art Line мұрағатындағы нақты жобалар: қасбеттік маңдайшалар, жарық әріптер, ритейл және интерьер шешімдері.", all: "Фотосуретті ашу", close: "Фотосуретті жабу", previous: "Алдыңғы фото", next: "Келесі фото", archive: "Art Line мұрағаты", proof: "Нақты жұмыс", labels: ["Қалалық инсталляция", "Қасбеттік маңдайша", "АЗС безендіру", "Кинотеатр маңдайшасы", "Витрина безендіру", "Жарық әріптер", "Жарық белгі", "Ритейл брендтеуі", "Брендтелген қабырға", "Сауда сөресі", "Интерьердегі логотип", "Ресепшен", "Пресс-волл"] },
  en: { kicker: "03 / PORTFOLIO", title: ["Work that", "gets noticed."], text: "Real projects from the Art Line archive: façade signs, illuminated letters, retail branding and interior solutions.", all: "Open photo", close: "Close photo", previous: "Previous photo", next: "Next photo", archive: "Art Line archive", proof: "Built work", labels: ["City installation", "Façade sign", "Service station", "Cinema signage", "Window design", "Illuminated letters", "Light sign", "Retail branding", "Branded wall", "Retail display", "Interior logo", "Reception", "Event wall"] },
} as const;
type FormState = "idle" | "sent";
type PortfolioCopy = (typeof portfolioText)[Language];

function scrollTo(id: string) { document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" }); }
function Mark({ compact = false }: { compact?: boolean }) { return <span className={`al-module ${compact ? "al-module--compact" : ""}`}><img src={ASSETS.logo} alt="Art Line" className="h-auto w-full object-contain" /></span>; }
function Lines({ lines }: { lines: readonly string[] }) { return <>{lines.map((line, index) => <span key={line}>{line}{index < lines.length - 1 && <br />}</span>)}</>; }
function cleanPortfolioText(value: string) { return value.replace(/\\n/g, "").replace(/\s{2,}/g, " ").trim(); }

function useHorizontalSwipe(onPrevious: () => void, onNext: () => void) {
  const touchStart = useRef<{ x: number; y: number; time: number } | null>(null);
  const swiped = useRef(false);
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const snapTimer = useRef<number | null>(null);
  const onTouchStart = (event: TouchEvent<HTMLButtonElement>) => { const touch = event.touches[0]; if (touch) { touchStart.current = { x: touch.clientX, y: touch.clientY, time: Date.now() }; swiped.current = false; setDragging(true); } };
  const onTouchMove = (event: TouchEvent<HTMLButtonElement>) => { const start = touchStart.current; const touch = event.touches[0]; if (!start || !touch) return; const dx = touch.clientX - start.x; const dy = touch.clientY - start.y; if (Math.abs(dx) <= Math.abs(dy) * 1.15) return; event.preventDefault(); setOffset(dx * 0.82); };
  const finishSwipe = (clientX: number, clientY: number) => { const start = touchStart.current; touchStart.current = null; setDragging(false); if (!start) { setOffset(0); return; } const dx = clientX - start.x; const dy = clientY - start.y; const elapsed = Math.max(Date.now() - start.time, 1); const distance = Math.abs(dx); const velocity = distance / elapsed; const horizontal = Math.abs(dx) > Math.abs(dy) * 1.15; if (!horizontal || (distance < 48 && velocity < 0.45)) { setOffset(0); return; } swiped.current = true; const direction = dx > 0 ? 1 : -1; setOffset(direction * 120); snapTimer.current = window.setTimeout(() => { if (direction > 0) onPrevious(); else onNext(); window.requestAnimationFrame(() => setOffset(0)); }, 180); };
  const onTouchEnd = (event: TouchEvent<HTMLButtonElement>) => { const touch = event.changedTouches[0]; if (touch) finishSwipe(touch.clientX, touch.clientY); };
  const onTouchCancel = () => { touchStart.current = null; setDragging(false); if (snapTimer.current !== null) window.clearTimeout(snapTimer.current); setOffset(0); };
  const consumeSwipeClick = () => { const wasSwipe = swiped.current; swiped.current = false; return wasSwipe; };
  return { handlers: { onTouchStart, onTouchMove, onTouchEnd, onTouchCancel }, offset, dragging, consumeSwipeClick };
}

function LeadModal({ onClose, lang }: { onClose: () => void; lang: Language }) {
  const [status, setStatus] = useState<FormState>("idle");
  const t = copy[lang].form;
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const message = [
      `Заявка Art Line: ${String(form.get("name") || "")}`,
      `Телефон: ${String(form.get("phone") || "")}`,
      `Услуга: ${String(form.get("service") || "")}`,
      `Комментарий: ${String(form.get("comment") || "")}`,
    ].join("\n");
    trackMarketingEvent("quote_submit", { language: lang, service: String(form.get("service") || "") });
    window.open(`https://wa.me/${CONTACT.whatsapp}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
    setStatus("sent");
  };
  return (
    <ModalFrame onClose={onClose} labelledBy="lead-title" className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-[#202124]/65 p-3 backdrop-blur-sm sm:p-4" contentClassName="my-auto flex max-h-[calc(100dvh-1.5rem)] w-full max-w-xl flex-col overflow-hidden bg-[#17181a] text-white shadow-2xl sm:max-h-[calc(100dvh-2rem)]">
      <div className="flex shrink-0 items-start justify-between border-b border-white/10 px-5 py-4 sm:px-8 sm:py-5">
        <div><p className="eyebrow">{t.kicker}</p><h2 id="lead-title" className="mt-1 text-2xl font-bold tracking-[-0.06em] text-white sm:mt-2 sm:text-3xl">{t.title}</h2></div>
        <button onClick={onClose} className="rounded-full p-2 transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-[#e0c070]" aria-label={t.close}><X size={22} /></button>
      </div>
      {status === "sent" ? (
        <div className="min-h-0 overflow-y-auto px-5 py-10 text-center sm:px-8 sm:py-16"><div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#e0c070]"><Check size={25} /></div><h3 className="mt-6 text-3xl font-bold tracking-[-0.05em]">{t.successTitle}</h3><p className="mx-auto mt-3 max-w-sm text-base leading-6 text-white/75">{t.successText}</p><button onClick={onClose} className="mt-8 border-b border-[#e0c070] pb-1 text-sm font-bold uppercase tracking-[0.12em] text-[#e0c070]">{t.back}</button></div>
      ) : (
        <form onSubmit={submit} className="grid min-h-0 flex-1 gap-4 overflow-y-auto px-5 py-5 overscroll-contain sm:grid-cols-2 sm:gap-5 sm:px-8 sm:py-7">
          <label className="form-label">{t.name}<input required name="name" placeholder={t.namePlaceholder} className="form-input" /></label>
          <label className="form-label">{t.phone}<input required name="phone" type="tel" placeholder="+7 (___) ___-__-__" className="form-input" /></label>
          <label className="form-label sm:col-span-2">{t.service}<select name="service" className="form-input"><option>{t.servicePlaceholder}</option>{t.services.map((service) => <option key={service}>{service}</option>)}</select></label>
          <label className="form-label sm:col-span-2">{t.comment}<textarea name="comment" rows={3} placeholder={t.commentPlaceholder} className="form-input resize-none" /></label>
          <div className="sticky bottom-[-1.25rem] -mx-5 flex flex-col gap-3 border-t border-white/10 bg-[#17181a] px-5 pb-5 pt-4 sm:col-span-2 sm:bottom-[-1.75rem] sm:-mx-8 sm:flex-row sm:items-center sm:justify-between sm:px-8 sm:pb-7 sm:pt-5"><p className="max-w-xs text-xs leading-5 text-[#aeb4af]">{t.consent}</p><button className="signal-button justify-center" type="submit">{t.submit} <ArrowUpRight size={18} /></button></div>
        </form>
      )}
    </ModalFrame>
  );
}

function PortfolioLightbox({ activeIndex, pt, onClose, onPrevious, onNext }: { activeIndex: number; pt: PortfolioCopy; onClose: () => void; onPrevious: () => void; onNext: () => void }) {
  return (
    <ModalFrame onClose={onClose} label={pt.close} closeOnBackdrop className="fixed inset-0 z-[70] flex items-center justify-center bg-[#090b0a]/90 p-4 backdrop-blur-md" contentClassName="relative max-h-[92vh] max-w-5xl">
      <img src={PORTFOLIO[activeIndex][0]} alt={pt.labels[activeIndex]} className="max-h-[82vh] max-w-full object-contain" />
      <div className="mt-4 flex items-center justify-between gap-4 text-white"><p className="font-mono text-xs uppercase tracking-[0.14em] text-[#e0c070]">{String(activeIndex + 1).padStart(2, "0")} / {String(PORTFOLIO.length).padStart(2, "0")} — {pt.labels[activeIndex]}</p><button onClick={onClose} className="rounded-full border border-white/25 p-2 focus-visible:outline-2 focus-visible:outline-[#e0c070]" aria-label={pt.close}><X size={18} /></button></div>
      <button onClick={onPrevious} className="absolute left-[-1rem] top-1/2 -translate-y-1/2 rounded-full border border-white/30 bg-[#17181a] p-2 text-white sm:left-[-3.5rem]" aria-label={pt.previous}><ChevronLeft size={20} /></button>
      <button onClick={onNext} className="absolute right-[-1rem] top-1/2 -translate-y-1/2 rounded-full border border-white/30 bg-[#17181a] p-2 text-white sm:right-[-3.5rem]" aria-label={pt.next}><ChevronRight size={20} /></button>
    </ModalFrame>
  );
}

export default function Home({ lang }: { lang: Language }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [portfolioActive, setPortfolioActive] = useState<number | null>(null);
  const [formatSlide, setFormatSlide] = useState(0);
  const [portfolioSlide, setPortfolioSlide] = useState(0);
  const [formatImageLoaded, setFormatImageLoaded] = useState(false);
  const [portfolioImageLoaded, setPortfolioImageLoaded] = useState(false);
  const t = copy[lang];
  const pt = portfolioText[lang];
  const serviceNumbers = ["01", "02", "03", "04", "05", "06"];
  const closeLead = useCallback(() => setModalOpen(false), []);
  const openQuote = useCallback((placement: string) => { trackMarketingEvent("quote_open", { language: lang, placement }); setModalOpen(true); }, [lang]);
  const closePortfolio = useCallback(() => setPortfolioActive(null), []);
  const formatPrevious = useCallback(() => setFormatSlide(value => getCircularIndex(value, -1, FORMAT_BLUEPRINTS.length)), []);
  const formatNext = useCallback(() => setFormatSlide(value => getCircularIndex(value, 1, FORMAT_BLUEPRINTS.length)), []);
  const portfolioPrevious = useCallback(() => setPortfolioSlide(value => getCircularIndex(value, -1, PORTFOLIO.length)), []);
  const portfolioNext = useCallback(() => setPortfolioSlide(value => getCircularIndex(value, 1, PORTFOLIO.length)), []);
  const lightboxPrevious = useCallback(() => setPortfolioActive(value => value === null ? null : getCircularIndex(value, -1, PORTFOLIO.length)), []);
  const lightboxNext = useCallback(() => setPortfolioActive(value => value === null ? null : getCircularIndex(value, 1, PORTFOLIO.length)), []);
  const handleMapReady = useCallback((map: google.maps.Map) => {
    const markerSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="56" height="68" viewBox="0 0 56 68"><path d="M28 67C28 67 51 43 51 25A23 23 0 1 0 5 25C5 43 28 67 28 67Z" fill="#151617" stroke="#e0c070" stroke-width="1.5"/><circle cx="28" cy="25" r="15" fill="#e0c070"/><text x="28" y="29" text-anchor="middle" font-family="Arial,sans-serif" font-size="10" font-weight="700" fill="#151617">AL</text></svg>`;
    new google.maps.Marker({
      map,
      position: CONTACT.location,
      title: "Art Line — Торетай, 43",
      icon: {
        url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(markerSvg)}`,
        scaledSize: new google.maps.Size(56, 68),
        anchor: new google.maps.Point(28, 68),
      },
    });
    map.panBy(-120, 42);
  }, []);
  const formatSwipe = useHorizontalSwipe(formatPrevious, formatNext);
  const portfolioSwipe = useHorizontalSwipe(portfolioPrevious, portfolioNext);
  const routeHref = `https://www.google.com/maps/dir/?api=1&destination=${CONTACT.location.lat},${CONTACT.location.lng}`;

  useEffect(() => { document.documentElement.lang = languageMeta[lang].htmlLang; document.title = t.seoTitle; }, [lang, t.seoTitle]);
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const elements = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    if (prefersReducedMotion) { elements.forEach((element) => element.classList.add("is-visible")); return; }
    const observer = new IntersectionObserver((entries) => entries.forEach((entry) => { if (entry.isIntersecting) { entry.target.classList.add("is-visible"); observer.unobserve(entry.target); } }), { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [lang]);
  useEffect(() => { setFormatImageLoaded(false); }, [formatSlide]);
  useEffect(() => { setPortfolioImageLoaded(false); }, [portfolioSlide]);
  const navigate = (id: string) => { setMenuOpen(false); scrollTo(id); };

  return <div className="min-h-screen overflow-x-hidden bg-[#0f1012] text-[#f3f0e8]">
    <SeoHead lang={lang} />
    {modalOpen && <LeadModal lang={lang} onClose={closeLead} />}
    {portfolioActive !== null && <PortfolioLightbox activeIndex={portfolioActive} pt={pt} onClose={closePortfolio} onPrevious={lightboxPrevious} onNext={lightboxNext} />}
    <header className="absolute inset-x-0 top-0 z-30 text-white"><div className="mx-auto flex max-w-[1440px] items-center justify-between px-5 py-5 xl:px-10"><button className="flex items-center" onClick={() => scrollTo("top")} aria-label={t.home}><Mark /></button><nav className="hidden items-center gap-8 text-sm font-semibold xl:flex">{t.nav.map(([label, id]) => <button key={id} onClick={() => navigate(id)} className="nav-link">{label}</button>)}</nav><div className="hidden items-center gap-5 xl:flex"><LanguageSwitch lang={lang} /><a className="font-mono text-xs font-medium tracking-[0.1em]" href={`tel:${CONTACT.phoneHref}`}>{CONTACT.phoneLabel}</a><button onClick={() => setModalOpen(true)} className="rounded-full bg-[#e0c070] px-5 py-3 text-xs font-extrabold uppercase tracking-[0.1em] text-[#202124] transition hover:bg-white">{t.calcShort}</button></div><div className="hidden items-center gap-3 lg:flex xl:hidden"><LanguageSwitch lang={lang} /><button onClick={() => setModalOpen(true)} className="rounded-full bg-[#e0c070] px-4 py-3 text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#202124]">{t.calcShort}</button></div><button onClick={() => setMenuOpen(!menuOpen)} className="rounded-full border border-white/35 p-3 xl:hidden" aria-label={menuOpen ? t.closeMenu : t.openMenu}><Menu size={20} /></button></div>{menuOpen && <div className="absolute inset-x-4 top-[76px] border border-white/15 bg-[#202124]/95 p-5 shadow-2xl backdrop-blur-lg xl:hidden"><div className="mb-6 flex items-center justify-between"><span className="font-mono text-[10px] uppercase tracking-[0.15em] text-white/70">{t.language}</span><LanguageSwitch lang={lang} /></div><div className="grid gap-1">{t.nav.map(([label, id]) => <button key={id} onClick={() => navigate(id)} className="flex items-center justify-between border-b border-white/10 py-4 text-left text-xl font-bold"><span>{label}</span><MoveRight size={18} /></button>)}</div><a href={`tel:${CONTACT.phoneHref}`} className="mt-5 flex items-center gap-2 font-mono text-xs font-medium tracking-[0.1em] text-white/85"><Phone size={16} /> {CONTACT.phoneLabel}</a><button onClick={() => { setMenuOpen(false); setModalOpen(true); }} className="mt-5 w-full rounded-full bg-[#e0c070] px-5 py-4 text-sm font-extrabold uppercase tracking-[0.1em] text-[#202124]">{t.calcProject}</button></div>}</header>
    <main id="top"><section className="relative min-h-[760px] overflow-hidden bg-[#17181a] text-white lg:min-h-[860px]"><img src={ASSETS.hero} alt={t.hero.alt} className="absolute inset-0 h-full w-full object-cover object-[65%_center]" /><div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(7,8,10,.91)_0%,rgba(7,8,10,.66)_39%,rgba(7,8,10,.09)_72%),linear-gradient(0deg,rgba(7,8,10,.68)_0%,transparent_45%)]" /><div className="hero-axis hero-axis-x" /><div className="hero-axis hero-axis-y" /><div className="hero-crosshair" aria-hidden="true"><span>AL</span></div><div className="relative mx-auto flex min-h-[760px] max-w-[1440px] flex-col justify-end px-5 pb-8 pt-32 sm:px-8 lg:min-h-[860px] lg:px-10 lg:pb-12"><div className="grid gap-10 lg:grid-cols-12 lg:items-end"><div className="lg:col-span-8"><div className="reveal-up flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.16em] text-[#e0c070]"><CircleDot size={14} /> {t.hero.label}</div><h1 className="reveal-up delay-1 mt-6 max-w-4xl text-[clamp(3.4rem,8.3vw,8.3rem)] font-extrabold leading-[.86] tracking-[-0.085em]"><Lines lines={t.hero.title} /></h1><p className="reveal-up delay-2 mt-7 max-w-xl text-lg leading-7 text-white/80 lg:text-xl">{t.hero.text}</p><div className="reveal-up delay-3 mt-9 flex flex-wrap gap-3"><button onClick={() => openQuote("hero") } className="signal-button">{t.hero.primary} <ArrowUpRight size={19} /></button><button onClick={() => scrollTo("formats")} className="ghost-button">{t.hero.secondary} <ArrowDownRight size={19} /></button></div></div><div className="reveal-up delay-4 grid grid-cols-2 gap-x-8 border-t border-white/25 pt-5 font-mono text-[10px] uppercase tracking-[0.12em] text-white/70 lg:col-span-3 lg:col-start-10"><div><span className="block text-[#e0c070]">01 / 04</span><span className="mt-2 block">{t.hero.facade}</span></div><div><span className="block text-[#e0c070]">AL / KZ</span><span className="mt-2 block">{t.hero.production}</span></div></div></div></div></section>
    <section id="services" data-reveal className="section-shell technical-grid bg-[#141518]"><div className="section-heading-grid"><div><p className="eyebrow">{t.services.kicker}</p><h2 className="section-title"><Lines lines={t.services.title} /></h2></div><p className="mt-5 max-w-sm text-base leading-7 text-white/70 lg:mt-14">{t.services.text}</p></div><div className="mt-14 border-t border-white/15">{t.services.items.map(([title, text, tag], index) => <button key={title} onClick={() => setModalOpen(true)} className="service-row group"><span className="font-mono text-xs text-white/50">{serviceNumbers[index]}</span><h3>{title}</h3><p>{text}</p><span className="hidden font-mono text-[10px] uppercase tracking-[0.12em] text-white/55 lg:block">{tag}</span><span className="service-arrow"><ArrowUpRight size={21} /></span></button>)}</div></section>
    <section id="formats" data-reveal className="bg-[#202124] px-5 py-20 text-white sm:px-8 lg:px-10 lg:py-28"><div className="mx-auto max-w-[1360px]"><div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end"><div><p className="eyebrow text-[#e0c070]">{t.formats.kicker}</p><h2 className="section-title mt-4 text-white"><Lines lines={t.formats.title} /></h2></div><button onClick={() => setModalOpen(true)} className="ghost-button">{t.formats.action} <ArrowUpRight size={18} /></button></div><div className="mt-14"><div className="format-slider-shell"><button type="button" className="format-slider-arrow" onClick={formatPrevious} aria-label={pt.previous}><ChevronLeft size={22} /></button><button key={`format-slide-${formatSlide}`} type="button" className="format-slide group slider-frame" {...formatSwipe.handlers} style={{ transform: formatSwipe.offset ? `translateX(${formatSwipe.offset}px)` : undefined, transition: formatSwipe.dragging ? "none" : "transform 180ms cubic-bezier(.23,1,.32,1)" }} onClick={() => { if (!formatSwipe.consumeSwipeClick()) setPortfolioActive([1, 9, 4][formatSlide]); }} onKeyDown={(event) => { if (event.key === "ArrowLeft") formatPrevious(); if (event.key === "ArrowRight") formatNext(); }} aria-label={`${pt.all}: ${pt.labels[[1, 9, 4][formatSlide]]}`}><div className={`slider-loading-indicator ${formatImageLoaded ? "is-loaded" : ""}`} aria-hidden={formatImageLoaded}><span /></div><img src={FORMAT_BLUEPRINTS[formatSlide]} alt={t.formats.cards[formatSlide][2]} onLoad={() => setFormatImageLoaded(true)} onError={() => setFormatImageLoaded(true)} className={formatImageLoaded ? "is-loaded" : ""} /><div className="format-overlay"><p className="font-mono text-[10px] uppercase tracking-[0.15em] text-[#e0c070]">{t.formats.cards[formatSlide][0]}</p><h3><Lines lines={t.formats.cards[formatSlide][1]} /></h3><span><ArrowUpRight size={20} /></span></div></button><button type="button" className="format-slider-arrow" onClick={formatNext} aria-label={pt.next}><ChevronRight size={22} /></button></div><div className="format-slider-controls" aria-label={t.formats.kicker}><span className="format-slider-count">0{formatSlide + 1} / 03</span><div className="format-slider-dots">{[0, 1, 2].map((index) => <button key={index} type="button" onClick={() => setFormatSlide(index)} className={`format-slider-dot ${formatSlide === index ? "is-active" : ""}`} aria-label={`${t.formats.kicker} ${index + 1}`} aria-current={formatSlide === index ? "true" : undefined} />)}</div><span className="format-slider-hint">{pt.all} <ArrowUpRight size={14} /></span></div></div><p className="mt-5 text-xs leading-5 text-white/60">{cleanPortfolioText(t.formats.note)}</p></div></section>
    <section id="portfolio" data-reveal className="section-shell bg-[#0f1012]"><div className="section-heading-grid"><div><p className="eyebrow">{pt.kicker}</p><h2 className="section-title"><Lines lines={pt.title} /></h2></div><p className="mt-5 max-w-sm text-base leading-7 text-white/70 lg:mt-14">{cleanPortfolioText(pt.text)}</p></div><div className="mt-14"><div className="portfolio-slider-shell"><button type="button" className="format-slider-arrow" onClick={portfolioPrevious} aria-label={pt.previous}><ChevronLeft size={22} /></button><button key={`portfolio-slide-${portfolioSlide}`} type="button" className="portfolio-slide group slider-frame" {...portfolioSwipe.handlers} style={{ transform: portfolioSwipe.offset ? `translateX(${portfolioSwipe.offset}px)` : undefined, transition: portfolioSwipe.dragging ? "none" : "transform 180ms cubic-bezier(.23,1,.32,1)" }} onClick={() => { if (!portfolioSwipe.consumeSwipeClick()) { trackMarketingEvent("portfolio_open", { language: lang, index: portfolioSlide }); setPortfolioActive(portfolioSlide); } }} onKeyDown={(event) => { if (event.key === "ArrowLeft") portfolioPrevious(); if (event.key === "ArrowRight") portfolioNext(); }} aria-label={`${pt.all}: ${pt.labels[portfolioSlide]}`}><div className={`slider-loading-indicator ${portfolioImageLoaded ? "is-loaded" : ""}`} aria-hidden={portfolioImageLoaded}><span /></div><img src={PORTFOLIO[portfolioSlide][0]} alt={pt.labels[portfolioSlide] || PORTFOLIO[portfolioSlide][1]} loading={portfolioSlide === 0 ? "eager" : "lazy"} fetchPriority={portfolioSlide === 0 ? "high" : "auto"} onLoad={() => setPortfolioImageLoaded(true)} onError={() => setPortfolioImageLoaded(true)} className={portfolioImageLoaded ? "is-loaded" : ""} /><span className="portfolio-slide-caption"><span><span className="mb-2 block text-[#e0c070]">{pt.archive} / {pt.proof}</span>{String(portfolioSlide + 1).padStart(2, "0")} / {cleanPortfolioText(pt.labels[portfolioSlide])}</span><ArrowUpRight size={20} /></span></button><button type="button" className="format-slider-arrow" onClick={portfolioNext} aria-label={pt.next}><ChevronRight size={22} /></button></div><div className="format-slider-controls" aria-label={pt.kicker}><span className="format-slider-count">{String(portfolioSlide + 1).padStart(2, "0")} / {String(PORTFOLIO.length).padStart(2, "0")}</span><div className="format-slider-dots portfolio-slider-dots">{PORTFOLIO.map((_, index) => <button key={index} type="button" onClick={() => setPortfolioSlide(index)} className={`format-slider-dot ${portfolioSlide === index ? "is-active" : ""}`} aria-label={`${pt.all}: ${pt.labels[index]}`} aria-current={portfolioSlide === index ? "true" : undefined} />)}</div><span className="format-slider-hint">{pt.all} <ArrowUpRight size={14} /></span></div></div></section>
    <section id="process" data-reveal className="section-shell technical-grid bg-[#17181a]"><div className="section-heading-grid"><div><p className="eyebrow">{t.process.kicker}</p><h2 className="section-title"><Lines lines={t.process.title} /></h2></div><p className="mt-5 max-w-sm text-base leading-7 text-white/70 lg:mt-14">{t.process.text}</p></div><div className="mt-14 grid gap-px bg-white/10 md:grid-cols-2 lg:grid-cols-5">{t.process.steps.map(([title, text], index) => <div key={title} className="process-cell"><span className="font-mono text-xs text-white/55">0{index + 1}</span><h3>{title}</h3><p>{text}</p></div>)}</div></section>
    <section data-reveal className="cta-sheet relative overflow-hidden bg-[#202124] px-5 py-20 text-white sm:px-8 lg:px-10 lg:py-28"><div className="absolute right-[-8vw] top-[-8vw] h-[34vw] w-[34vw] rounded-full border-[1.6vw] border-[#e0c070]/80" /><div className="cta-rule cta-rule-top" /><div className="cta-rule cta-rule-bottom" /><div className="relative mx-auto grid max-w-[1360px] gap-8 lg:grid-cols-12 lg:items-end"><div className="lg:col-span-8"><p className="eyebrow text-[#e0c070]">{t.cta.kicker} <span className="ml-4 text-white/60">{t.cta.marker}</span></p><h2 className="mt-5 text-[clamp(3.4rem,7vw,7.8rem)] font-extrabold leading-[.86] tracking-[-0.085em]"><Lines lines={t.cta.title} /></h2></div><div className="lg:col-span-4"><p className="max-w-sm text-lg leading-7 text-white/75">{t.cta.text}</p><button onClick={() => openQuote("cta") } className="signal-button mt-8">{t.cta.action} <ArrowUpRight size={18} /></button></div></div></section>
    <section data-reveal className="section-shell bg-[#141518]"><div className="grid gap-12 lg:grid-cols-12"><div className="lg:col-span-5"><p className="eyebrow">{t.faq.kicker}</p><h2 className="section-title"><Lines lines={t.faq.title} /></h2><p className="mt-6 max-w-sm text-base leading-7 text-white/70">{t.faq.text}</p><a href={`https://wa.me/${CONTACT.whatsapp}`} onClick={() => trackMarketingEvent("whatsapp_click", { language: lang, placement: "faq" })} className="mt-8 inline-flex items-center gap-2 border-b border-[#e0c070] pb-1 text-sm font-bold text-[#e0c070]"><MessageCircle size={17} /> {t.faq.action}</a></div><div className="lg:col-span-7">{t.faq.items.map(([question, answer], index) => <div key={question} className="border-t border-white/15"><button className="flex w-full items-center justify-between gap-6 py-6 text-left" onClick={() => setOpenFaq(openFaq === index ? null : index)} aria-expanded={openFaq === index}><span className="text-xl font-bold tracking-[-0.04em] sm:text-2xl">{question}</span><span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/25 transition ${openFaq === index ? "rotate-45 bg-[#e0c070] text-[#202124]" : ""}`}><Plus size={17} /></span></button>{openFaq === index && <p className="faq-answer">{answer}</p>}</div>)}</div></div></section>
    <section id="contacts" data-reveal className="bg-[#17181a] px-5 py-20 text-white sm:px-8 lg:px-10 lg:py-28"><div className="mx-auto grid max-w-[1360px] gap-14 lg:grid-cols-12"><div className="lg:col-span-5"><p className="eyebrow text-[#e0c070]">{t.contacts.kicker}</p><h2 className="section-title mt-4 text-white"><Lines lines={t.contacts.title} /></h2><div className="mt-12 grid gap-7 text-white/80"><div><p className="contact-label">{t.contacts.channel}</p><a href={`tel:${CONTACT.phoneHref}`} onClick={() => trackMarketingEvent("phone_click", { language: lang, placement: "contacts" })} className="contact-link">{CONTACT.phoneLabel}</a></div><div><p className="contact-label">{t.contacts.address}</p><p className="whitespace-pre-line text-lg leading-7">{t.contacts.schedule}</p></div><div className="flex gap-3"><a href={`https://wa.me/${CONTACT.whatsapp}`} className="contact-chip"><MessageCircle size={17} /> WhatsApp</a><button onClick={() => setModalOpen(true)} className="contact-chip"><Phone size={16} /> {t.contacts.request}</button></div></div></div><div className="relative min-h-[360px] overflow-hidden border border-white/10 bg-[#202124] lg:col-span-7"><MapView initialCenter={CONTACT.location} initialZoom={14} className="h-[420px] w-full grayscale-[.35] opacity-45" onMapReady={handleMapReady} staticFallback={isExternalStaticHost} fallback={<div className="map-fallback-content"><p className="eyebrow">{t.contacts.mapKicker}</p><h3 className="mt-3 text-3xl font-extrabold tracking-[-0.06em] text-white">{t.contacts.office}</h3><p className="mt-3 text-sm leading-6">{t.contacts.mapFallback}<br />Торетай, 43 · {t.contacts.city}</p><a href={routeHref} onClick={() => trackMarketingEvent("route_open", { language: lang, placement: "map" })} target="_blank" rel="noreferrer" className="map-route"><MapPinned size={16} /> {t.contacts.route}</a></div>} /><div className="map-grid pointer-events-none" aria-hidden="true" /><div className="pointer-events-none absolute inset-6 flex flex-col justify-between border border-[#e0c070]/35 p-5"><div className="flex items-start justify-between"><span className="font-mono text-[10px] uppercase tracking-[0.15em] text-[#e0c070]">AL / {CONTACT.coordinateLabel}</span><span className="grid h-9 w-9 place-items-center rounded-full border border-[#e0c070] bg-[#17181a] text-xs font-bold text-[#e0c070]">AL</span></div><div className="max-w-[250px] border-l border-[#e0c070] pl-4"><p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#e0c070]">{t.contacts.office}</p><p className="mt-2 text-lg font-bold leading-6 text-white">Торетай, 43<br />{t.contacts.city}</p></div></div><div className="pointer-events-none absolute bottom-5 left-5 bg-[#17181a] px-4 py-3 font-mono text-[10px] uppercase tracking-[0.12em] text-[#e0c070]">AL / {t.contacts.city}</div></div></div></section></main>
    <footer className="bg-[#202124] px-5 py-6 text-white/60 sm:px-8 lg:px-10"><div className="mx-auto flex max-w-[1360px] flex-col justify-between gap-4 text-xs sm:flex-row sm:items-center"><div className="flex items-center gap-3"><Mark compact /></div><p>{t.contacts.footer}</p><p>© {new Date().getFullYear()} Art Line</p></div></footer>
  </div>;
}
