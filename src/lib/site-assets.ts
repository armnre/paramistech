// Every public/ file that page metadata or the web manifest points to.
export const siteAssets = {
  ogImage: '/og.png',
  ogImageEn: '/og-en.png',
  favicon: '/favicon.ico',
  favicon32: '/favicon-32.png',
  appleTouch: '/apple-touch-icon.png',
  icon192: '/icon-192.png',
  icon512: '/icon-512.png',
  manifest: '/site.webmanifest',
} as const;

export const referencedPublicAssets: string[] = Object.values(siteAssets);
