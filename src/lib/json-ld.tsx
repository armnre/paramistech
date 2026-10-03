import { headers } from 'next/headers';
import type { Locale } from '@/lib/i18n/dictionary';
import { absoluteUrl } from '@/lib/seo';

/** Inline JSON-LD; carries the per-request CSP nonce so no 'unsafe-inline' is needed for scripts. */
export async function JsonLd({ data }: { data: unknown }) {
  const nonce = (await headers()).get('x-nonce') ?? undefined;
  return (
    <script
      type="application/ld+json"
      nonce={nonce}
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  );
}

export const inLanguage = (locale: Locale) => (locale === 'fa' ? 'fa-IR' : 'en-US');

/** `path` values are unprefixed paths of this locale (e.g. /services/web); they are made absolute per locale. */
export function breadcrumbList(locale: Locale, items: Array<{ name: string; path: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    inLanguage: inLanguage(locale),
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(locale, item.path),
    })),
  };
}
