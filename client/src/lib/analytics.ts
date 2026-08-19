export type MarketingEvent =
  | "quote_open"
  | "quote_submit"
  | "qualified_lead"
  | "whatsapp_click"
  | "phone_click"
  | "route_open"
  | "language_switch"
  | "portfolio_open";

export function trackMarketingEvent(event: MarketingEvent, params: Record<string, string | number | boolean> = {}) {
  if (typeof window === "undefined") return;
  const payload = { event, ...params };
  const analyticsWindow = window as Window & { dataLayer?: unknown[] };
  const dataLayer = Array.isArray(analyticsWindow.dataLayer) ? analyticsWindow.dataLayer : (analyticsWindow.dataLayer = []);
  dataLayer.push(payload);
  const gtag = (window as Window & { gtag?: (...args: unknown[]) => void }).gtag;
  if (typeof gtag === "function") gtag("event", event, params);
  window.dispatchEvent(new CustomEvent("artline:marketing", { detail: payload }));
}

export function trackQualifiedLead(params: { language: string; source?: string; service?: string; value?: number }) {
  trackMarketingEvent("qualified_lead", params);
}

export function withUtm(url: string, source: string, medium: string, campaign: string) {
  try {
    const parsed = new URL(url, window.location.origin);
    parsed.searchParams.set("utm_source", source);
    parsed.searchParams.set("utm_medium", medium);
    parsed.searchParams.set("utm_campaign", campaign);
    return parsed.toString();
  } catch {
    return url;
  }
}

if (typeof window !== "undefined") {
  (window as Window & { ArtLineMarketing?: { trackMarketingEvent: typeof trackMarketingEvent; trackQualifiedLead: typeof trackQualifiedLead } }).ArtLineMarketing = { trackMarketingEvent, trackQualifiedLead };
}
