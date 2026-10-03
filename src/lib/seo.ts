import { locales, otherLocale, prefixPath, type Locale } from '@/lib/i18n/dictionary';

/** Unprefixed path of a page in each locale, or null when that locale has no version of it. */
export type LocalePaths = Record<Locale, string | null>;

export function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || 'https://paramistech.example').replace(/\/+$/, '');
}

/** Same path in both locales (static pages). */
export function samePaths(path: string): LocalePaths {
  return { fa: path, en: path };
}

export function absoluteUrl(locale: Locale, path: string) {
  const prefixed = prefixPath(locale, path);
  return `${siteUrl()}${prefixed === '/' ? '' : prefixed}`;
}

/** Canonical + hreflang (fa, en, x-default) for Next metadata. Only locales that really exist are listed. */
export function pageAlternates(locale: Locale, paths: LocalePaths) {
  const current = paths[locale];
  const languages: Record<string, string> = {};
  for (const code of locales) {
    const path = paths[code];
    if (path !== null) languages[code] = absoluteUrl(code, path);
  }
  const fallback = paths.fa !== null ? languages.fa : languages.en;
  if (fallback) languages['x-default'] = fallback;
  return {
    canonical: current !== null ? absoluteUrl(locale, current) : undefined,
    languages,
  };
}

/** Where the language switcher points: the equivalent page, or the other locale's home page. */
export function switcherHref(locale: Locale, paths: LocalePaths) {
  const target = otherLocale(locale);
  const path = paths[target];
  return prefixPath(target, path ?? '/');
}
