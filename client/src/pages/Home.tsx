/**
 * Signal Workshop style: industrial editorial layout, graphite typography,
 * warm mineral base and Signal Lime #D7FF34 for decisive actions.
 */
import { FormEvent, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  CircleDot,
  Clock3,
  Layers3,
  Menu,
  MessageCircle,
  MoveRight,
  Phone,
  Plus,
  X,
} from "lucide-react";
import { MapView } from "@/components/Map";

const ASSETS = {
  logo: "/manus-storage/artline-logo-mark_5c6d8d0f.png",
  hero: "/manus-storage/artline-hero-signage_a386fa2d.jpg",
  facade: "/manus-storage/artline-facade-source_e74537db.jpg",
  wayfinding: "/manus-storage/artline-wayfinding-source_5feb915d.jpg",
  workshop: "/manus-storage/artline-workshop-source_fd8a5904.webp",
};

const services = [
  { num: "01", title: "Вывески и объёмные буквы", text: "Световые, контражурные и несветовые решения для фасада и интерьера.", tag: "Фасады" },
  { num: "02", title: "Световые короба", text: "Лайтбоксы и световые панели, которые читаются в городской среде днём и после заката.", tag: "Свет" },
  { num: "03", title: "Оформление витрин", text: "Витрины, пленки, сезонные кампании и брендирование, которые дают бизнесу заметный первый контакт.", tag: "Ритейл" },
  { num: "04", title: "Навигация и таблички", text: "Системы, которые упорядочивают пространство: офисы, торговые точки и общественные зоны.", tag: "Среда" },
  { num: "05", title: "Широкоформатная печать", text: "Баннеры, наклейки и рекламные поверхности для интерьера, улицы и мероприятий.", tag: "Печать" },
  { num: "06", title: "Брендирование", text: "Транспорт, стойки, фотозоны и временные конструкции для событий и активаций.", tag: "Кампания" },
];

const faqs = [
  { q: "С чего начинается расчёт?", a: "С короткого брифа: тип конструкции, адрес или фото объекта, желаемые сроки и контакты. Если данных недостаточно, менеджер согласует удобное время для уточнения или замера." },
  { q: "Можно ли заказать дизайн и монтаж вместе?", a: "Да. Для комплексного проекта мы выстраиваем единый маршрут: задача, замер, макет, согласование, производство и монтаж на объекте." },
  { q: "Какие материалы вы используете?", a: "Материалы подбираются под условия объекта, размер конструкции, тип подсветки и бюджет. В расчёте менеджер фиксирует выбранный вариант и его спецификацию." },
  { q: "Работаете ли вы с сетевыми и корпоративными объектами?", a: "Да. Для многообъектных задач можно подготовить единый набор конструкций, навигации и брендирования с понятной последовательностью запуска." },
];

type FormState = "idle" | "sent";

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function Mark() {
  return <span className="al-module"><span className="al-cross al-cross-x" /><span className="al-cross al-cross-y" /><img src={ASSETS.logo} alt="Art Line" className="h-9 w-9 object-contain" /></span>;
}

function LeadModal({ onClose }: { onClose: () => void }) {
  const [status, setStatus] = useState<FormState>("idle");
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("sent");
  };

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-[#111613]/65 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="lead-title">
      <div className="w-full max-w-xl overflow-hidden bg-[#f6f4ef] shadow-2xl">
        <div className="flex items-start justify-between border-b border-black/10 px-6 py-5 sm:px-8">
          <div>
            <p className="eyebrow">ART LINE / ЗАЯВКА</p>
            <h2 id="lead-title" className="mt-2 text-3xl font-bold tracking-[-0.06em] text-[#111613]">Рассчитать проект</h2>
          </div>
          <button onClick={onClose} className="rounded-full p-2 transition hover:bg-black/5" aria-label="Закрыть форму"><X size={22} /></button>
        </div>
        {status === "sent" ? (
          <div className="px-6 py-16 text-center sm:px-8">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#d7ff34]"><Check size={25} /></div>
            <h3 className="mt-6 text-3xl font-bold tracking-[-0.05em]">Заявка принята.</h3>
            <p className="mx-auto mt-3 max-w-sm text-base leading-6 text-[#5c625e]">Спасибо. Менеджер Art Line свяжется с вами, чтобы уточнить задачу и подготовить расчёт.</p>
            <button onClick={onClose} className="mt-8 border-b border-[#111613] pb-1 text-sm font-bold uppercase tracking-[0.12em]">Вернуться на сайт</button>
          </div>
        ) : (
          <form onSubmit={submit} className="grid gap-5 px-6 py-7 sm:grid-cols-2 sm:px-8">
            <label className="form-label">Ваше имя<input required name="name" placeholder="Например, Арман" className="form-input" /></label>
            <label className="form-label">Телефон<input required name="phone" type="tel" placeholder="+7 (___) ___-__-__" className="form-input" /></label>
            <label className="form-label sm:col-span-2">Что нужно сделать?<select name="service" className="form-input"><option>Выберите услугу</option><option>Вывеска / объёмные буквы</option><option>Световой короб</option><option>Оформление витрины</option><option>Навигация / таблички</option><option>Печать / брендирование</option><option>Комплексное оформление</option></select></label>
            <label className="form-label sm:col-span-2">Коротко о задаче<textarea name="comment" rows={3} placeholder="Размер, фото объекта, желаемый срок — всё, что уже известно." className="form-input resize-none" /></label>
            <div className="sm:col-span-2 flex flex-col gap-4 border-t border-black/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="max-w-xs text-xs leading-5 text-[#68706a]">Отправляя форму, вы соглашаетесь с обработкой персональных данных.</p>
              <button className="signal-button justify-center" type="submit">Отправить заявку <ArrowUpRight size={18} /></button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const nav = [
    ["Услуги", "services"],
    ["Форматы", "formats"],
    ["Процесс", "process"],
    ["Контакты", "contacts"],
  ];

  const navigate = (id: string) => {
    setMenuOpen(false);
    scrollTo(id);
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f6f4ef] text-[#111613]">
      {modalOpen && <LeadModal onClose={() => setModalOpen(false)} />}
      <header className="absolute inset-x-0 top-0 z-30 text-white">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between px-5 py-5 lg:px-10">
          <button className="flex items-center gap-3" onClick={() => scrollTo("top")} aria-label="На главную">
            <Mark />
            <span className="text-sm font-extrabold uppercase tracking-[0.14em]">ART LINE</span>
          </button>
          <nav className="hidden items-center gap-8 text-sm font-semibold lg:flex">
            {nav.map(([label, id]) => <button key={id} onClick={() => navigate(id)} className="nav-link">{label}</button>)}
          </nav>
          <div className="hidden items-center gap-5 lg:flex">
            <a className="font-mono text-xs font-medium tracking-[0.1em]" href="tel:+77771505662">+7 777 150 56 62</a>
            <button onClick={() => setModalOpen(true)} className="rounded-full bg-[#d7ff34] px-5 py-3 text-xs font-extrabold uppercase tracking-[0.1em] text-[#111613] transition hover:bg-white">Рассчитать</button>
          </div>
          <button onClick={() => setMenuOpen(!menuOpen)} className="rounded-full border border-white/35 p-3 lg:hidden" aria-label="Открыть меню"><Menu size={20} /></button>
        </div>
        {menuOpen && <div className="absolute inset-x-4 top-[76px] border border-white/15 bg-[#111613]/95 p-5 shadow-2xl backdrop-blur-lg lg:hidden">
          <div className="grid gap-1">
            {nav.map(([label, id]) => <button key={id} onClick={() => navigate(id)} className="flex items-center justify-between border-b border-white/10 py-4 text-left text-xl font-bold"><span>{label}</span><MoveRight size={18} /></button>)}
          </div>
          <button onClick={() => { setMenuOpen(false); setModalOpen(true); }} className="mt-5 w-full rounded-full bg-[#d7ff34] px-5 py-4 text-sm font-extrabold uppercase tracking-[0.1em] text-[#111613]">Рассчитать проект</button>
        </div>}
      </header>

      <main id="top">
        <section className="relative min-h-[760px] overflow-hidden bg-[#151b18] text-white lg:min-h-[860px]">
          <img src={ASSETS.hero} alt="Иллюстративный фасад со световой вывеской" className="absolute inset-0 h-full w-full object-cover object-[65%_center]" />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(12,17,14,.91)_0%,rgba(12,17,14,.66)_39%,rgba(12,17,14,.09)_72%),linear-gradient(0deg,rgba(12,17,14,.68)_0%,transparent_45%)]" />
          <div className="hero-axis hero-axis-x" /><div className="hero-axis hero-axis-y" /><div className="hero-crosshair" aria-hidden="true"><span>AL</span></div>
          <div className="relative mx-auto flex min-h-[760px] max-w-[1440px] flex-col justify-end px-5 pb-8 pt-32 sm:px-8 lg:min-h-[860px] lg:px-10 lg:pb-12">
            <div className="grid gap-10 lg:grid-cols-12 lg:items-end">
              <div className="lg:col-span-8">
                <div className="reveal-up flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.16em] text-[#d7ff34]"><CircleDot size={14} /> Алматы / наружная реклама</div>
                <h1 className="reveal-up delay-1 mt-6 max-w-4xl text-[clamp(3.4rem,8.3vw,8.3rem)] font-extrabold leading-[.86] tracking-[-0.085em]">Делаем бизнес<br />видимым.</h1>
                <p className="reveal-up delay-2 mt-7 max-w-xl text-lg leading-7 text-white/74 lg:text-xl">Вывески, световые конструкции, навигация и брендирование — от первого эскиза до точного монтажа на объекте.</p>
                <div className="reveal-up delay-3 mt-9 flex flex-wrap gap-3"><button onClick={() => setModalOpen(true)} className="signal-button">Рассчитать стоимость <ArrowUpRight size={19} /></button><button onClick={() => scrollTo("formats")} className="ghost-button">Смотреть форматы <ArrowDownRight size={19} /></button></div>
              </div>
              <div className="reveal-up delay-4 grid grid-cols-2 gap-x-8 border-t border-white/25 pt-5 font-mono text-[10px] uppercase tracking-[0.12em] text-white/60 lg:col-span-3 lg:col-start-10">
                <div><span className="block text-[#d7ff34]">01 / 04</span><span className="mt-2 block">Фасадные<br />решения</span></div>
                <div><span className="block text-[#d7ff34]">AL / KZ</span><span className="mt-2 block">Проект —<br />в производство</span></div>
              </div>
            </div>
          </div>
        </section>

        <section id="services" className="section-shell technical-grid bg-[#f6f4ef]">
          <div className="section-heading-grid">
            <div><p className="eyebrow">01 / УСЛУГИ</p><h2 className="section-title">Изготавливаем<br />то, что замечают.</h2></div>
            <p className="mt-5 max-w-sm text-base leading-7 text-[#5e655f] lg:mt-14">Art Line собирает рекламную среду целиком — от заметной вывески на фасаде до точной навигации внутри пространства.</p>
          </div>
          <div className="mt-14 border-t border-[#111613]/15">
            {services.map((service) => <button key={service.num} onClick={() => setModalOpen(true)} className="service-row group">
              <span className="font-mono text-xs text-[#8c928c]">{service.num}</span>
              <h3>{service.title}</h3>
              <p>{service.text}</p>
              <span className="hidden font-mono text-[10px] uppercase tracking-[0.12em] text-[#6b726c] lg:block">{service.tag}</span>
              <span className="service-arrow"><ArrowUpRight size={21} /></span>
            </button>)}
          </div>
        </section>

        <section id="formats" className="bg-[#202824] px-5 py-20 text-white sm:px-8 lg:px-10 lg:py-28">
          <div className="mx-auto max-w-[1360px]">
            <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end"><div><p className="eyebrow text-[#d7ff34]">02 / ФОРМАТЫ РАБОТ</p><h2 className="section-title mt-4 text-white">У каждого объекта<br />свой язык.</h2></div><button onClick={() => setModalOpen(true)} className="ghost-button">Обсудить задачу <ArrowUpRight size={18} /></button></div>
            <div className="mt-14 grid gap-4 lg:grid-cols-12">
              <article className="format-card group lg:col-span-5"><img src={ASSETS.facade} alt="Иллюстрация фасадной вывески" /><div className="format-overlay"><p className="font-mono text-[10px] uppercase tracking-[0.15em] text-[#d7ff34]">Фасады / 01</p><h3>Вывеска —<br />первая встреча.</h3><span><ArrowUpRight size={20} /></span></div></article>
              <article className="format-card group lg:col-span-3"><img src={ASSETS.wayfinding} alt="Иллюстрация навигационной системы" /><div className="format-overlay"><p className="font-mono text-[10px] uppercase tracking-[0.15em] text-[#d7ff34]">Среда / 02</p><h3>Навигация,<br />которая ведёт.</h3><span><ArrowUpRight size={20} /></span></div></article>
              <article className="format-card group lg:col-span-4"><img src={ASSETS.workshop} alt="Иллюстрация производственного процесса" /><div className="format-overlay"><p className="font-mono text-[10px] uppercase tracking-[0.15em] text-[#d7ff34]">Цех / 03</p><h3>Точность<br />в детали.</h3><span><ArrowUpRight size={20} /></span></div></article>
            </div>
            <p className="mt-5 text-xs leading-5 text-white/45">Визуальные материалы на странице носят иллюстративный характер. Реальные кейсы Art Line добавляются в портфолио после подтверждения заказчиком.</p>
          </div>
        </section>

        <section id="process" className="section-shell technical-grid bg-[#e7e6df]">
          <div className="section-heading-grid"><div><p className="eyebrow">03 / МАРШРУТ ПРОЕКТА</p><h2 className="section-title">Видимый результат —<br />это точный процесс.</h2></div><p className="mt-5 max-w-sm text-base leading-7 text-[#5e655f] lg:mt-14">Без разрозненных подрядчиков: собираем работу в один понятный маршрут и остаёмся на связи на каждом этапе.</p></div>
          <div className="mt-14 grid gap-px bg-[#111613]/15 md:grid-cols-2 lg:grid-cols-5">
            {["Задача и объект", "Замер и макет", "Согласование", "Производство", "Монтаж"].map((step, index) => <div key={step} className="process-cell"><span className="font-mono text-xs text-[#68706a]">0{index + 1}</span><h3>{step}</h3><p>{["Собираем исходные данные и смотрим, что уже есть.", "Фиксируем размеры, подбираем форму и материалы.", "Утверждаем решение до запуска в работу.", "Собираем конструкцию с контролем на каждом узле.", "Устанавливаем на объекте и передаём готовый результат."][index]}</p></div>)}
          </div>
        </section>

        <section className="cta-sheet relative overflow-hidden bg-[#d7ff34] px-5 py-20 sm:px-8 lg:px-10 lg:py-28">
          <div className="absolute right-[-8vw] top-[-8vw] h-[34vw] w-[34vw] rounded-full border-[1.6vw] border-[#111613]/90" />
          <div className="cta-rule cta-rule-top" /><div className="cta-rule cta-rule-bottom" />
          <div className="relative mx-auto grid max-w-[1360px] gap-8 lg:grid-cols-12 lg:items-end"><div className="lg:col-span-8"><p className="eyebrow">04 / БЫСТРЫЙ СТАРТ <span className="ml-4 text-[#111613]/55">КАРТА ПРОЕКТА</span></p><h2 className="mt-5 text-[clamp(3.4rem,7vw,7.8rem)] font-extrabold leading-[.86] tracking-[-0.085em]">Есть объект?<br />Давайте считать.</h2></div><div className="lg:col-span-4"><p className="max-w-sm text-lg leading-7 text-[#111613]/76">Отправьте фото, размеры или просто опишите задачу. Подскажем следующий шаг и соберём расчёт.</p><button onClick={() => setModalOpen(true)} className="mt-8 inline-flex items-center gap-3 rounded-full bg-[#111613] px-6 py-4 text-sm font-extrabold uppercase tracking-[0.1em] text-white transition hover:translate-y-[-2px]">Получить расчёт <ArrowUpRight size={18} /></button></div></div>
        </section>

        <section className="section-shell bg-[#f6f4ef]"><div className="grid gap-12 lg:grid-cols-12"><div className="lg:col-span-5"><p className="eyebrow">05 / ВОПРОСЫ</p><h2 className="section-title">Коротко<br />о главном.</h2><p className="mt-6 max-w-sm text-base leading-7 text-[#5e655f]">Если вопроса нет в списке, напишите в WhatsApp — обсудим задачу в удобном формате.</p><a href="https://wa.me/77771505662" className="mt-8 inline-flex items-center gap-2 border-b border-[#111613] pb-1 text-sm font-bold"><MessageCircle size={17} /> Написать в WhatsApp</a></div><div className="lg:col-span-7">{faqs.map((faq, index) => <div key={faq.q} className="border-t border-[#111613]/15"><button className="flex w-full items-center justify-between gap-6 py-6 text-left" onClick={() => setOpenFaq(openFaq === index ? null : index)}><span className="text-xl font-bold tracking-[-0.04em] sm:text-2xl">{faq.q}</span><span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border border-[#111613]/20 transition ${openFaq === index ? "rotate-45 bg-[#d7ff34]" : ""}`}><Plus size={17} /></span></button>{openFaq === index && <p className="faq-answer">{faq.a}</p>}</div>)}</div></div></section>

        <section id="contacts" className="bg-[#151b18] px-5 py-20 text-white sm:px-8 lg:px-10 lg:py-28"><div className="mx-auto grid max-w-[1360px] gap-14 lg:grid-cols-12"><div className="lg:col-span-5"><p className="eyebrow text-[#d7ff34]">06 / КОНТАКТЫ</p><h2 className="section-title mt-4 text-white">Давайте сделаем<br />вас заметнее.</h2><div className="mt-12 grid gap-7 text-white/72"><div><p className="contact-label">Телефон / WhatsApp</p><a href="tel:+77771505662" className="contact-link">+7 777 150 56 62</a></div><div><p className="contact-label">Адрес</p><p className="text-lg leading-7">Алматы, ул. Бекежанова, 29<br />Пн–Сб, 08:00–18:00</p></div><div className="flex gap-3"><a href="https://wa.me/77771505662" className="contact-chip"><MessageCircle size={17} /> WhatsApp</a><button onClick={() => setModalOpen(true)} className="contact-chip"><Phone size={16} /> Заявка</button></div></div></div><div className="relative min-h-[360px] overflow-hidden border border-white/10 bg-[#202824] lg:col-span-7"><MapView initialCenter={{ lat: 43.206748, lng: 76.805062 }} initialZoom={14} className="h-[420px] w-full grayscale-[.35] opacity-35" onMapReady={(map) => { new google.maps.marker.AdvancedMarkerElement({ map, position: { lat: 43.206748, lng: 76.805062 }, title: "Art Line" }); }} /><div className="map-grid" aria-hidden="true" /><div className="pointer-events-none absolute inset-6 flex flex-col justify-between border border-[#d7ff34]/35 p-5"><div className="flex items-start justify-between"><span className="font-mono text-[10px] uppercase tracking-[0.15em] text-[#d7ff34]">AL / 43.2067, 76.8050</span><span className="grid h-9 w-9 place-items-center rounded-full border border-[#d7ff34] bg-[#151b18] text-xs font-bold text-[#d7ff34]">AL</span></div><div className="max-w-[250px] border-l border-[#d7ff34] pl-4"><p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#d7ff34]">Производство и офис</p><p className="mt-2 text-lg font-bold leading-6 text-white">Бекежанова, 29<br />Алматы</p></div></div><div className="pointer-events-none absolute bottom-5 left-5 bg-[#151b18] px-4 py-3 font-mono text-[10px] uppercase tracking-[0.12em] text-[#d7ff34]">AL / Алматы</div></div></div></section>
      </main>

      <footer className="bg-[#111613] px-5 py-6 text-white/50 sm:px-8 lg:px-10"><div className="mx-auto flex max-w-[1360px] flex-col justify-between gap-4 text-xs sm:flex-row sm:items-center"><div className="flex items-center gap-3"><Mark /><span className="font-bold tracking-[0.12em] text-white">ART LINE</span></div><p>Наружная и интерьерная реклама в Алматы</p><p>© {new Date().getFullYear()} Art Line</p></div></footer>
    </div>
  );
}
