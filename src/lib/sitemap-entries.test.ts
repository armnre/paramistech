import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildSitemapEntries } from './sitemap-entries';

afterEach(() => vi.unstubAllEnvs());
const now = new Date('2026-02-01T00:00:00Z');

const service = (slug: string, extra: object = {}) =>
  ({ id: 1, slug, slugEn: null, title: 'ف', titleEn: null, shortDescription: 'ت', shortDescriptionEn: null, bodyMd: 'م', bodyMdEn: null, icon: 'building', metaTitle: '', metaDescription: '', metaTitleEn: null, metaDescriptionEn: null, updatedAt: now, ...extra }) as never;
const post = (slug: string, extra: object = {}) => ({
  cover: null,
  post: { id: 1, slug, slugEn: null, title: 'ف', titleEn: null, excerpt: '', excerptEn: null, bodyMd: 'م', bodyMdEn: null, author: '', publishedAt: now, noindex: false, metaTitle: '', metaDescription: '', metaTitleEn: null, metaDescriptionEn: null, updatedAt: now, ...extra },
}) as never;

describe('sitemap', () => {
  it('lists static pages in both languages with hreflang alternates', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://example.com');
    const entries = buildSitemapEntries({ services: [], projects: [], posts: [] }, now);
    const urls = entries.map((entry) => entry.url);
    expect(urls).toContain('https://example.com');
    expect(urls).toContain('https://example.com/en');
    expect(urls).toContain('https://example.com/en/contact');
    const home = entries.find((entry) => entry.url === 'https://example.com/en');
    expect(home?.alternates?.languages).toEqual({
      fa: 'https://example.com',
      en: 'https://example.com/en',
      'x-default': 'https://example.com',
    });
  });

  it('adds an English entry only for items that have English content', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://example.com');
    const entries = buildSitemapEntries(
      {
        services: [service('only-fa'), service('both', { titleEn: 'T', shortDescriptionEn: 'D', bodyMdEn: 'B', slugEn: 'both-en' })],
        projects: [],
        posts: [],
      },
      now,
    );
    const urls = entries.map((entry) => entry.url);
    expect(urls).toContain('https://example.com/services/only-fa');
    expect(urls).not.toContain('https://example.com/en/services/only-fa');
    expect(urls).toContain('https://example.com/services/both');
    expect(urls).toContain('https://example.com/en/services/both-en');
    const fa = entries.find((entry) => entry.url === 'https://example.com/services/only-fa');
    expect(Object.keys(fa?.alternates?.languages ?? {}).sort()).toEqual(['fa', 'x-default']);
    const both = entries.find((entry) => entry.url === 'https://example.com/services/both');
    expect(both?.alternates?.languages).toMatchObject({ fa: 'https://example.com/services/both', en: 'https://example.com/en/services/both-en' });
  });

  it('keeps noindex posts out in every language and uses real lastModified dates', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://example.com');
    const entries = buildSitemapEntries(
      {
        services: [],
        projects: [],
        posts: [post('visible', { titleEn: 'T', bodyMdEn: 'B' }), post('hidden', { noindex: true, titleEn: 'T', bodyMdEn: 'B' })],
      },
      now,
    );
    const urls = entries.map((entry) => entry.url);
    expect(urls).toContain('https://example.com/blog/visible');
    expect(urls).toContain('https://example.com/en/blog/visible');
    expect(urls.some((url) => url.includes('hidden'))).toBe(false);
    expect(entries.find((entry) => entry.url.endsWith('/blog/visible'))?.lastModified).toEqual(now);
  });
});
