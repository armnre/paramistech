import type { MetadataRoute } from 'next';
import type { posts, projects, services, media } from '@/db/schema';
import { locales, type Locale } from '@/lib/i18n/dictionary';
import { localizePost, localizeProject, localizeService, type ItemSlugs } from '@/lib/localize';
import { absoluteUrl } from '@/lib/seo';

type ServiceRow = typeof services.$inferSelect;
type ProjectJoin = { project: typeof projects.$inferSelect; cover: typeof media.$inferSelect | null };
type PostJoin = { post: typeof posts.$inferSelect; cover: typeof media.$inferSelect | null };

export type SitemapInput = { services: ServiceRow[]; projects: ProjectJoin[]; posts: PostJoin[] };

export const staticPagePaths = ['/', '/services', '/projects', '/blog', '/about', '/contact', '/faq'] as const;

type Entry = MetadataRoute.Sitemap[number];

function entriesFor(
  section: string,
  items: Array<{ slugs: ItemSlugs; updatedAt: Date; skip?: boolean }>,
  priority: number,
): Entry[] {
  const result: Entry[] = [];
  for (const item of items) {
    if (item.skip) continue;
    const paths: Record<Locale, string | null> = {
      fa: `${section}/${item.slugs.fa}`,
      en: item.slugs.en ? `${section}/${item.slugs.en}` : null,
    };
    const languages: Record<string, string> = {};
    for (const locale of locales) if (paths[locale]) languages[locale] = absoluteUrl(locale, paths[locale] as string);
    languages['x-default'] = languages.fa;
    for (const locale of locales) {
      const path = paths[locale];
      if (!path) continue; // an item without an English version has no English entry
      result.push({
        url: absoluteUrl(locale, path),
        lastModified: item.updatedAt,
        changeFrequency: 'monthly',
        priority,
        alternates: { languages },
      });
    }
  }
  return result;
}

/** Pure sitemap builder: static pages in both languages plus every item, per language it exists in. */
export function buildSitemapEntries(input: SitemapInput, now = new Date()): MetadataRoute.Sitemap {
  const staticEntries: Entry[] = staticPagePaths.flatMap((path) => {
    const languages = {
      fa: absoluteUrl('fa', path),
      en: absoluteUrl('en', path),
      'x-default': absoluteUrl('fa', path),
    };
    return locales.map((locale) => ({
      url: absoluteUrl(locale, path),
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: path === '/' ? 1 : 0.7,
      alternates: { languages },
    }));
  });

  const serviceItems = input.services.flatMap((row) => localizeService(row, 'fa') ?? []);
  const projectItems = input.projects.flatMap((row) => localizeProject(row.project, row.cover, 'fa') ?? []);
  const postItems = input.posts.flatMap((row) => localizePost(row.post, row.cover, 'fa') ?? []);

  return [
    ...staticEntries,
    ...entriesFor('/services', serviceItems, 0.6),
    ...entriesFor('/projects', projectItems, 0.6),
    // noindex posts are kept out of the sitemap in every language.
    ...entriesFor('/blog', postItems.map((post) => ({ ...post, skip: post.noindex })), 0.6),
  ];
}
