import { unstable_cache } from 'next/cache';
import { and, asc, desc, eq, or, type SQL } from 'drizzle-orm';
import { db } from '@/db';
import { faqs, media, posts, projects, services, settings } from '@/db/schema';
import type { Locale } from '@/lib/i18n/dictionary';
import {
  localizeFaq,
  localizePost,
  localizeProject,
  localizeService,
  localizeSettings,
  type ContactView,
  type FaqView,
  type PostView,
  type ProjectView,
  type ServiceView,
} from '@/lib/localize';
import { reviveDates } from '@/lib/revive-dates';
import { placeholdersAllowed } from '@/lib/visibility';

// Loaders return raw rows (both languages) and are cached by tag; the language rules in localize.ts are
// applied afterwards, so one cache entry serves /... and /en/... Admin writes call revalidateContent().

function visible(published: SQL, placeholder: SQL, includePlaceholders: boolean) {
  return includePlaceholders ? published : and(published, placeholder);
}

const loadServices = unstable_cache(
  async (includePlaceholders: boolean) =>
    db
      .select()
      .from(services)
      .where(visible(eq(services.published, true), eq(services.isPlaceholder, false), includePlaceholders))
      .orderBy(asc(services.sortOrder), asc(services.id)),
  ['content-services'],
  { tags: ['services'] },
);

const loadServicesBySlug = unstable_cache(
  async (slug: string, includePlaceholders: boolean) =>
    db
      .select()
      .from(services)
      .where(
        and(
          or(eq(services.slug, slug), eq(services.slugEn, slug)),
          visible(eq(services.published, true), eq(services.isPlaceholder, false), includePlaceholders),
        ),
      )
      .limit(2),
  ['content-services-by-slug'],
  { tags: ['services'] },
);

const loadProjects = unstable_cache(
  async (includePlaceholders: boolean) =>
    db
      .select({ project: projects, cover: media })
      .from(projects)
      .leftJoin(media, eq(projects.coverMediaId, media.id))
      .where(visible(eq(projects.published, true), eq(projects.isPlaceholder, false), includePlaceholders))
      .orderBy(asc(projects.sortOrder), asc(projects.id)),
  ['content-projects'],
  { tags: ['projects', 'media'] },
);

const loadProjectsBySlug = unstable_cache(
  async (slug: string, includePlaceholders: boolean) =>
    db
      .select({ project: projects, cover: media })
      .from(projects)
      .leftJoin(media, eq(projects.coverMediaId, media.id))
      .where(
        and(
          or(eq(projects.slug, slug), eq(projects.slugEn, slug)),
          visible(eq(projects.published, true), eq(projects.isPlaceholder, false), includePlaceholders),
        ),
      )
      .limit(2),
  ['content-projects-by-slug'],
  { tags: ['projects', 'media'] },
);

const loadPosts = unstable_cache(
  async (includePlaceholders: boolean) =>
    db
      .select({ post: posts, cover: media })
      .from(posts)
      .leftJoin(media, eq(posts.coverMediaId, media.id))
      .where(visible(eq(posts.published, true), eq(posts.isPlaceholder, false), includePlaceholders))
      .orderBy(desc(posts.publishedAt), desc(posts.id)),
  ['content-posts'],
  { tags: ['posts', 'media'] },
);

const loadPostsBySlug = unstable_cache(
  async (slug: string, includePlaceholders: boolean) =>
    db
      .select({ post: posts, cover: media })
      .from(posts)
      .leftJoin(media, eq(posts.coverMediaId, media.id))
      .where(
        and(
          or(eq(posts.slug, slug), eq(posts.slugEn, slug)),
          visible(eq(posts.published, true), eq(posts.isPlaceholder, false), includePlaceholders),
        ),
      )
      .limit(2),
  ['content-posts-by-slug'],
  { tags: ['posts', 'media'] },
);

const loadFaqs = unstable_cache(
  async (includePlaceholders: boolean) =>
    db
      .select()
      .from(faqs)
      .where(visible(eq(faqs.published, true), eq(faqs.isPlaceholder, false), includePlaceholders))
      .orderBy(asc(faqs.sortOrder), asc(faqs.id)),
  ['content-faqs'],
  { tags: ['faqs'] },
);

const loadSettings = unstable_cache(
  async (includePlaceholders: boolean) => {
    const [row] = await db.select().from(settings).where(eq(settings.id, 1)).limit(1);
    if (!row || (row.isPlaceholder && !includePlaceholders)) return null;
    return row;
  },
  ['content-settings'],
  { tags: ['settings'] },
);

const allowed = () => placeholdersAllowed();

// ---------- services ----------

export async function getLocalizedServices(locale: Locale): Promise<ServiceView[]> {
  const rows = reviveDates(await loadServices(allowed()));
  return rows.flatMap((row) => localizeService(row, locale) ?? []);
}

/** `slug` is the slug used in the URL of this locale (slug_en/slug for English, slug for Persian). */
export async function findService(locale: Locale, slug: string): Promise<ServiceView | null> {
  const rows = reviveDates(await loadServicesBySlug(slug, allowed()));
  for (const row of rows) {
    const view = localizeService(row, locale);
    if (view && view.slug === slug) return view;
  }
  return null;
}

// ---------- projects ----------

export async function getLocalizedProjects(locale: Locale): Promise<ProjectView[]> {
  const rows = reviveDates(await loadProjects(allowed()));
  return rows.flatMap((row) => localizeProject(row.project, row.cover, locale) ?? []);
}

export async function findProject(locale: Locale, slug: string): Promise<ProjectView | null> {
  const rows = reviveDates(await loadProjectsBySlug(slug, allowed()));
  for (const row of rows) {
    const view = localizeProject(row.project, row.cover, locale);
    if (view && view.slug === slug) return view;
  }
  return null;
}

// ---------- posts ----------

export async function getLocalizedPosts(locale: Locale): Promise<PostView[]> {
  const rows = reviveDates(await loadPosts(allowed()));
  return rows.flatMap((row) => localizePost(row.post, row.cover, locale) ?? []);
}

export async function findPost(locale: Locale, slug: string): Promise<PostView | null> {
  const rows = reviveDates(await loadPostsBySlug(slug, allowed()));
  for (const row of rows) {
    const view = localizePost(row.post, row.cover, locale);
    if (view && view.slug === slug) return view;
  }
  return null;
}

/** Latest three other posts that exist in this locale. */
export async function getRelatedPosts(locale: Locale, slug: string): Promise<PostView[]> {
  const all = await getLocalizedPosts(locale);
  return all.filter((post) => post.slug !== slug).slice(0, 3);
}

// ---------- FAQs and contact ----------

export async function getLocalizedFaqs(locale: Locale): Promise<FaqView[]> {
  const rows = reviveDates(await loadFaqs(allowed()));
  return rows.flatMap((row) => localizeFaq(row, locale) ?? []);
}

export async function getContact(locale: Locale): Promise<ContactView | null> {
  const row = reviveDates(await loadSettings(allowed()));
  return row ? localizeSettings(row, locale) : null;
}

// ---------- sitemap ----------

/** Raw published rows for the sitemap builder, which applies the per-language rules itself. */
export async function getSitemapRows() {
  const [serviceRows, projectRows, postRows] = await Promise.all([
    loadServices(allowed()),
    loadProjects(allowed()),
    loadPosts(allowed()),
  ]);
  return {
    services: reviveDates(serviceRows),
    projects: reviveDates(projectRows),
    posts: reviveDates(postRows),
  };
}

