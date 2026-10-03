import { afterEach, describe, expect, it, vi } from 'vitest';
import { absoluteUrl, pageAlternates, samePaths, switcherHref } from './seo';
import { detectLocaleFromPath, prefixPath, stripLocalePrefix } from './i18n/dictionary';

afterEach(() => vi.unstubAllEnvs());

describe('locale routing helpers', () => {
  it('serves Persian at the root and English under /en', () => {
    expect(detectLocaleFromPath('/')).toBe('fa');
    expect(detectLocaleFromPath('/services')).toBe('fa');
    expect(detectLocaleFromPath('/en')).toBe('en');
    expect(detectLocaleFromPath('/en/projects/x')).toBe('en');
    expect(detectLocaleFromPath('/endpoint')).toBe('fa');
    expect(detectLocaleFromPath('/english')).toBe('fa');
  });

  it('prefixes and strips locale prefixes symmetrically', () => {
    expect(prefixPath('fa', '/blog')).toBe('/blog');
    expect(prefixPath('en', '/blog')).toBe('/en/blog');
    expect(prefixPath('en', '/')).toBe('/en');
    expect(prefixPath('fa', '/')).toBe('/');
    expect(stripLocalePrefix('/en/blog/a')).toEqual({ locale: 'en', rest: '/blog/a' });
    expect(stripLocalePrefix('/en')).toEqual({ locale: 'en', rest: '/' });
    expect(stripLocalePrefix('/blog')).toEqual({ locale: 'fa', rest: '/blog' });
  });
});

describe('hreflang and canonical', () => {
  it('lists fa, en and x-default for a page that exists in both languages', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://example.com/');
    const alt = pageAlternates('en', samePaths('/services'));
    expect(alt.canonical).toBe('https://example.com/en/services');
    expect(alt.languages).toEqual({
      fa: 'https://example.com/services',
      en: 'https://example.com/en/services',
      'x-default': 'https://example.com/services',
    });
  });

  it('uses locale-specific slugs and canonicalises each locale to itself', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://example.com');
    const paths = { fa: '/projects/smart-finance', en: '/projects/smart-finance-app' };
    expect(pageAlternates('fa', paths).canonical).toBe('https://example.com/projects/smart-finance');
    expect(pageAlternates('en', paths).canonical).toBe('https://example.com/en/projects/smart-finance-app');
    expect(pageAlternates('fa', paths).languages.en).toBe('https://example.com/en/projects/smart-finance-app');
  });

  it('omits a language that has no translation and falls back to home in the switcher', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://example.com');
    const onlyFa = { fa: '/blog/post', en: null };
    expect(Object.keys(pageAlternates('fa', onlyFa).languages).sort()).toEqual(['fa', 'x-default']);
    expect(switcherHref('fa', onlyFa)).toBe('/en');
    expect(switcherHref('en', { fa: '/blog/post', en: '/blog/post' })).toBe('/blog/post');
    expect(switcherHref('fa', samePaths('/contact'))).toBe('/en/contact');
    expect(switcherHref('fa', samePaths('/'))).toBe('/en');
  });

  it('builds absolute URLs without a trailing slash on the home page', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://example.com');
    expect(absoluteUrl('fa', '/')).toBe('https://example.com');
    expect(absoluteUrl('en', '/')).toBe('https://example.com/en');
  });
});
