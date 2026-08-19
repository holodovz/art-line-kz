# Marketing research notes

## Official local listings

1. Google Business Profile: Google presents Business Profile as a way to turn people who find a business on Google Search and Maps into customers. The official page provides profile creation/claim actions and links to Search, Maps, Analytics and Ads resources.
   Source: https://business.google.com/us/business-profile/

2. Yandex Business: the official quick-start guide states that adding a company profile is free; a profile can be created through Yandex Business or Yandex Maps, but editing company information happens in Yandex Business after ownership confirmation. Required core fields include company name, primary and additional categories, address or city/region, phone and website/social URL. After moderation, the company is published and automatically added to Yandex Maps; Yandex says users can find it in Yandex Search the next day after publication. The guide also mentions reviews and branch management.
   Source: https://yandex.com/support/business-priority/en/add-company/add-org

## Current published-site audit

The published site has a clear service proposition, six service categories, a portfolio section, process explanation, FAQ, WhatsApp CTA, address and route. The RU, KZ and EN paths expose localized body copy. The static export currently has a shared Russian `lang` value and shared Russian title/description in all language files; `robots.txt` and `sitemap.xml` are missing from the static package, and the inspected head does not show canonical, hreflang, Open Graph or structured LocalBusiness metadata. These are high-priority technical SEO fixes before buying traffic.

The site currently communicates a broad service set but does not yet expose dedicated indexable landing pages for high-intent clusters such as illuminated letters, storefront branding, lightboxes, wayfinding/signage, large-format printing and corporate rollouts. The first SEO content expansion should preserve the single-page brand experience while adding focused service pages or crawlable sections with unique titles, descriptions, FAQs, project proof and localized internal links.

## Competitor snapshot

A review of two visible competitors shows that the category is won with explicit commercial proof, not only visual presentation. One competitor emphasizes fast cost calculation, installation guarantees, same-day measurement/design, installment terms, compliance and long operating history. Another emphasizes 1-year warranty, contract-based work, 12 years of experience, 500+ projects, a 3-day turnkey promise, a large service taxonomy, WhatsApp/Telegram CTAs, 2GIS address and review links across Google, 2GIS and Yandex.

Art Line should not copy unverified claims. Instead, it should publish only owner-confirmed proof such as actual warranty terms, production capacity, verified case count, response time, design/measurement SLA, installation geography and corporate-project experience. A strong differentiation opportunity is a premium, technically precise offer built around a fast brief, documented process, approved portfolio, transparent next step and reliable WhatsApp follow-up rather than generic low-price messaging.

## Implementation verification

The development preview confirms the RU page now exposes a localized title and description, a canonical URL, RU/KK/EN plus x-default alternate links, and a LocalBusiness JSON-LD script. A controlled click test also emitted the custom `artline:marketing` event `quote_open` with language and placement parameters. The visual screenshots for RU, KZ and EN retain the existing design and layout.

The KZ browser test confirms `lang=kk`, a `/kz/` canonical, localized title, and the events `quote_open`, `quote_submit`, and `phone_click`. A preceding controlled KZ test also confirmed `whatsapp_click` and `route_open`. The quote submission test used non-customer test input only for event verification and did not create or store a lead.

The EN browser test confirms `lang=en`, an `/en/` canonical, localized title, four alternate-language links (`ru`, `kk`, `en`, `x-default`) and the LocalBusiness JSON-LD script. A full EN event test confirmed `quote_open`, `quote_submit`, `whatsapp_click`, `phone_click`, and `route_open`.

A full RU event test confirmed the same five events with `language=ru`. Both quote-submit checks used non-customer test input only for event verification and did not create or store a lead.

The RU browser contract test confirms `window.ArtLineMarketing.trackQualifiedLead(...)` is available, emits a `qualified_lead` CustomEvent, and creates/pushes to `window.dataLayer` when no tag container is installed. Contact WhatsApp and desktop header phone elements are present; the mobile-menu phone handler is present in source and is rendered only when the mobile menu is opened at a mobile breakpoint.

## Measurement and advertising-platform notes

Google Ads documentation distinguishes URL-based conversion setup for page-load events from code-based setup for button clicks and dynamic business logic. It also warns that conversion actions must be correctly designated as primary or secondary for bidding optimization. For Art Line, button/link events should be tracked for WhatsApp, phone, quote CTA, route opening and completed form-to-WhatsApp handoff, with only qualified lead events treated as primary after validation.

Official access research: Google Business Profile uses Business Profile settings → People and access → Add user, with Owner or Manager roles; Manager can handle daily profile operations but cannot add/remove users or remove the profile. Google Ads uses Admin → Access and security → plus → email → access level → Send invitation; Standard is appropriate for campaign work, while Admin/Billing can change payment settings and should not be granted for routine setup. Both official Google pages recommend separate user accounts rather than password sharing.

2GIS describes its Business Account as a free dashboard for managing company information, tracking metrics and buying ads. It supports profile details, photos, reviews, website links and statistics such as card opens, competitor counts and the information users inspect. This makes 2GIS both a local SEO hygiene channel and a potential paid test channel, but paid spend should follow profile completion and baseline card analytics.

Yandex Business official documentation: open Businesses, select the company/branch, open Access, enter the recipient's Yandex ID, choose Owner or Representative, and confirm. Representative is the safer role for profile editing, photos, posts and review responses; Owner can transfer rights and manage representatives. 2GIS Platform Manager: open the correct company, Users → Invite, specify email and role, and send; Administrator can manage users, company profile, subscriptions and keys, while Owner is reserved for the company creator/transfer. Invitations have visible statuses and can be revoked or users removed.

Sources:
- Google Ads conversion measurement: https://support.google.com/google-ads/answer/16560108?hl=en
- 2GIS Business Account: https://help.2gis.com/question/what-is-a-business-account

## Initial implication for Art Line

The first local-discovery workstream should claim and standardize profiles for Art Line in Google Business Profile, Yandex Business/Yandex Maps and 2GIS, using identical NAP data, categories, service descriptions, working hours, website URLs with UTM tags, portfolio photos and a review-response process. This is a recommendation based on the official profile capabilities above and requires owner access for verification.
