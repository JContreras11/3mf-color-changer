export const GA_MEASUREMENT_ID = 'G-LX5BH7CBDX';

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export function trackPageView(url: string) {
  if (typeof window.gtag !== 'function') {
    return;
  }

  window.gtag('event', 'page_view', {
    page_path: url,
    page_location: window.location.href,
    page_title: document.title,
  });
}
