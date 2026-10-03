// Cache-Control for responses that pass through src/proxy.ts. Returns null to keep the response's own header.

/** Brand files whose URL has no content hash: cache for a day, never "immutable". */
export const unhashedPublicFiles = new Set([
  '/og.png',
  '/og-en.png',
  '/favicon.ico',
  '/favicon-32.png',
  '/apple-touch-icon.png',
  '/icon-192.png',
  '/icon-512.png',
  '/icon.svg',
  '/site.webmanifest',
]);

const feeds = new Set(['/sitemap.xml', '/robots.txt', '/rss.xml', '/en/rss.xml']);

export function cachePolicyFor(pathname: string): string | null {
  if (unhashedPublicFiles.has(pathname)) return 'public, max-age=86400';
  if (feeds.has(pathname)) return 'public, max-age=600';
  // Dynamic OG cards choose their own (1 hour) policy.
  if (pathname.endsWith('/opengraph-image')) return null;
  // HTML is rendered per request (CSP nonce), so it must never be stored by a shared cache.
  return 'no-store, must-revalidate';
}
