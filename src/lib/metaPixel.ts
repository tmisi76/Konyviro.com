// Meta Pixel (Facebook Pixel) helper
// A base pixel + PageView tracking az index.html-ben van inicializálva.
// Ez a modul a custom események (CompleteRegistration, Purchase) küldéséhez ad típusos wrappert.

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

export function trackFbEvent(
  event: string,
  params?: Record<string, unknown>,
): void {
  if (typeof window === "undefined") return;
  if (typeof window.fbq !== "function") return;
  try {
    if (params) {
      window.fbq("track", event, params);
    } else {
      window.fbq("track", event);
    }
  } catch (err) {
    console.warn("[MetaPixel] track error", err);
  }
}

export function trackCompleteRegistration(): void {
  trackFbEvent("CompleteRegistration");
}

export function trackPurchase(value?: number, currency = "HUF"): void {
  if (typeof value === "number" && !Number.isNaN(value)) {
    trackFbEvent("Purchase", { value, currency });
  } else {
    trackFbEvent("Purchase", { currency });
  }
}
