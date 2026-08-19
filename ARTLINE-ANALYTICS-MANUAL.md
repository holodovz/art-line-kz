# Art Line — analytics contract

## Browser/CRM API

После загрузки сайта доступен глобальный API `window.ArtLineMarketing`:

```js
window.ArtLineMarketing.trackQualifiedLead({
  language: "ru",
  source: "google",
  service: "Вывеска / объёмные буквы",
  value: 0
});
```

Событие публикуется одновременно в `window.dataLayer`, при наличии вызывает `gtag('event', ...)`, и отправляет `artline:marketing` CustomEvent. Поле `value` необязательно и должно использоваться только при согласованной модели ценности лида.

Менеджер вызывает событие только после проверки, что контакт содержит задачу, услугу, объект/город и ориентир по срокам. События `quote_submit` и `whatsapp_click` сами по себе qualified lead не означают.

## CTA matrix

| CTA/точка | Event | Placement |
|---|---|---|
| Hero «Рассчитать стоимость» | `quote_open` | `hero` |
| Desktop header phone | `phone_click` | `desktop_header` |
| Desktop/tablet header quote | `quote_open` | `desktop_header` / `tablet_header` |
| Mobile menu phone | `phone_click` | `mobile_menu` |
| Mobile menu quote | `quote_open` | `mobile_menu` |
| Service row | `quote_open` | `service` |
| Formats CTA | `quote_open` | `formats` |
| Portfolio slide | `portfolio_open` | `index` |
| CTA sheet | `quote_open` | `cta` |
| FAQ WhatsApp | `whatsapp_click` | `faq` |
| Contacts phone | `phone_click` | `contacts` |
| Contacts WhatsApp | `whatsapp_click` | `contacts` |
| Contacts request | `quote_open` | `contacts` |
| Map route | `route_open` | `map` |
| Lead form handoff | `quote_submit` | selected language |
| Manager-confirmed contact | `qualified_lead` | CRM/manual |

## Минимальный weekly report

Собирать по каждому событию дату, язык, source/medium/campaign, placement, услугу и статус лида. Внешний кабинет подключается к `dataLayer` или `gtag`; без этого события остаются доступными в браузерном CustomEvent для ручной отладки.
