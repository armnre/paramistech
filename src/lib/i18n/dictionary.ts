export const locales = ['fa', 'en'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'fa';
// Empty-prefix locale is served at the root; English lives under /en.
export const localeSegments: Record<Locale, string> = { fa: '', en: '/en' };

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

export function detectLocaleFromPath(pathname: string): Locale {
  if (pathname === '/en' || pathname.startsWith('/en/')) return 'en';
  return 'fa';
}

export function prefixPath(locale: Locale, path: string): string {
  const cleaned = path.startsWith('/') ? path : `/${path}`;
  const prefix = localeSegments[locale];
  if (!prefix) return cleaned;
  if (cleaned === '/') return prefix || '/';
  return `${prefix}${cleaned}`;
}

export function stripLocalePrefix(pathname: string): { locale: Locale; rest: string } {
  const match = pathname.match(/^\/en(\/.*)?$/);
  if (match) return { locale: 'en', rest: match[1] || '/' };
  return { locale: 'fa', rest: pathname || '/' };
}

export const localeHtml: Record<Locale, { lang: string; dir: 'rtl' | 'ltr'; og: string }> = {
  fa: { lang: 'fa', dir: 'rtl', og: 'fa_IR' },
  en: { lang: 'en', dir: 'ltr', og: 'en_US' },
};

export function otherLocale(locale: Locale): Locale {
  return locale === 'fa' ? 'en' : 'fa';
}