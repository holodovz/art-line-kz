# Art Line — сайт наружной рекламы в Алматы

Одностраничный маркетинговый сайт компании Art Line (наружная и интерьерная реклама):
вывески, световые буквы, лайтбоксы, навигация, широкоформатная печать и брендирование.

- Языки: RU (`/`), KZ (`/kz/`), EN (`/en/`)
- Дизайн-система: «Signal Workshop» — тёмный графит, золотой акцент `#E0C070`,
  шрифты Manrope / Onest / IBM Plex Mono
- Заявки работают без бэкенда: форма собирает сообщение и открывает WhatsApp
- Контакты: +7 776 006 38 19, Алматы, ул. Торетай, 43

## Стек

React 19 · TypeScript · Vite 7 · Tailwind CSS 4 · wouter · Radix UI (shadcn) · Vitest
Express + tRPC + Drizzle (скаффолд от шаблона, сайтом не используется)

## Команды

```bash
pnpm install          # установка зависимостей (pnpm 10)
pnpm dev              # dev-сервер на http://localhost:3000
pnpm check            # проверка типов (tsc --noEmit)
pnpm test             # юнит-тесты (Vitest)
pnpm build            # production-сборка: клиент в dist/public, сервер в dist/index.js
pnpm start            # запуск production-сервера (NODE_ENV=production)
```

## Структура

| Путь | Назначение |
|---|---|
| `client/src/pages/Home.tsx` | Весь лендинг: hero, услуги, форматы, портфолио, процесс, FAQ, контакты, форма заявки |
| `client/src/lib/i18n.ts` | Словарь интерфейса RU/KZ/EN |
| `client/src/components/SeoHead.tsx` | Title, description, canonical, hreflang, OG, JSON-LD LocalBusiness |
| `client/src/lib/analytics.ts` | События `artline:marketing` / `dataLayer` / `gtag` |
| `client/public/images/` | Все изображения сайта (логотип, hero, blueprint, портфолио) |
| `client/public/robots.txt`, `sitemap.xml` | Техническое SEO |
| `server/` | Express/tRPC-скаффолд шаблона (аутентификация, хранилище) |
| `ARTLINE-*.md` | Маркетинговая база: SEO-карта, стратегия, реклама, аналитика |

## Деплой

Статический вариант — содержимое `dist/public` (HTML + ассеты) на любой хостинг;
форма заявки и карта работают без сервера. Полный вариант — `pnpm build && pnpm start` (Node 22).

### Что обновить при деплое на боевой домен

1. **Домен-заглушка**: `https://artline.kz` в `client/public/robots.txt` и
   `client/public/sitemap.xml` заменить на фактический домен (canonical/hreflang
   на страницах подставляются автоматически из `window.location.origin`).
2. **Фото портфолио**: изображения в `client/public/images/` — сгенерированные
   заглушки в фирменном стиле. Замените их реальными фото из архива проектов,
   сохранив имена файлов, — изменения кода не потребуются.
3. **Логотип**: `client/public/images/logo.svg` и `favicon.svg` — векторная
   реконструкция знака AL; при наличии оригинального логотипа замените файлы.

## CI

`.github/workflows/ci.yml`: на каждый push/PR в `main` — установка pnpm по
`packageManager`, `pnpm check`, `pnpm test`, `pnpm build`.
