import type { Metadata } from 'next';
import { getDictionary } from '@/lib/i18n';
import { localeHtml, type Locale } from '@/lib/i18n/dictionary';
import { pageAlternates, type LocalePaths } from '@/lib/seo';
import { siteAssets } from '@/lib/site-assets';

export type SlugParams = { params: Promise<{ slug: string }> };

export function ogImageFor(locale: Locale) {
  return locale === 'en' ? siteAssets.ogImageEn : siteAssets.ogImage;
}

/** Title/description/canonical/hreflang/Open Graph shared by every page. */
export function pageMetadata(
  locale: Locale,
  paths: LocalePaths,
  meta: { title?: string; description?: string; noindex?: boolean; ogImage?: string | false },
): Metadata {
  const dict = getDictionary(locale);
  const alternates = pageAlternates(locale, paths);
  return {
    ...(meta.title ? { title: meta.title } : {}),
    description: meta.description ?? dict.site.description,
    alternates,
    openGraph: {
      type: 'website',
      locale: localeHtml[locale].og,
      siteName: dict.site.brand,
      title: meta.title ?? dict.site.tagline,
      description: meta.description ?? dict.site.description,
      url: alternates.canonical,
      // `ogImage: false` lets the opengraph-image file convention (dynamic card) supply the image.
      ...(meta.ogImage === false ? {} : { images: [{ url: meta.ogImage ?? ogImageFor(locale), width: 1200, height: 630 }] }),
    },
    ...(meta.noindex ? { robots: { index: false, follow: true } } : {}),
  };
}
