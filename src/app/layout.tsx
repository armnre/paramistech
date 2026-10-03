import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { headers } from 'next/headers';
import { ThemeProvider } from 'next-themes';
import { Analytics } from '@/components/analytics';
import { getDictionary } from '@/lib/i18n';
import { localeHtml } from '@/lib/i18n/dictionary';
import { getRequestLocale } from '@/lib/i18n/server';
import { siteUrl } from '@/lib/seo';
import { siteAssets } from '@/lib/site-assets';
import '@fontsource/vazirmatn/400.css';
import '@fontsource/vazirmatn/500.css';
import '@fontsource/vazirmatn/600.css';
import '@fontsource/vazirmatn/700.css';
import '@fontsource/vazirmatn/800.css';
import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-500.css';
import '@fontsource/inter/latin-600.css';
import '@fontsource/inter/latin-700.css';
import '@fontsource/inter/latin-800.css';
import './globals.css';
import './locale.css';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const dict = getDictionary(locale);
  const ogImage = locale === 'en' ? siteAssets.ogImageEn : siteAssets.ogImage;
  return {
    metadataBase: new URL(siteUrl()),
    title: { default: `${dict.site.brand} | ${dict.site.tagline}`, template: `%s | ${dict.site.brand}` },
    description: dict.site.description,
    openGraph: {
      type: 'website',
      locale: localeHtml[locale].og,
      siteName: dict.site.brand,
      title: dict.site.tagline,
      description: dict.site.description,
      images: [{ url: ogImage, width: 1200, height: 630, alt: dict.site.brand }],
    },
    icons: {
      icon: [{ url: siteAssets.favicon }, { url: siteAssets.favicon32, sizes: '32x32', type: 'image/png' }],
      apple: siteAssets.appleTouch,
    },
    manifest: siteAssets.manifest,
    alternates: { types: { 'application/rss+xml': locale === 'en' ? '/en/rss.xml' : '/rss.xml' } },
    robots: { index: true, follow: true },
  };
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = await getRequestLocale();
  // Per-request nonce from src/proxy.ts; next-themes needs it for its inline theme script.
  const nonce = (await headers()).get('x-nonce') ?? undefined;
  const { lang, dir } = localeHtml[locale];
  return (
    <html lang={lang} dir={dir} suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange nonce={nonce}>
          {children}
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
