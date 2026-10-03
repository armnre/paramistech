import type { faqs, media, posts, projects, services, settings } from '@/db/schema';
import { digits } from '@/lib/digits';
import type { Locale } from '@/lib/i18n/dictionary';

// Pure rules for turning DB rows into what a given language may show.
// English items appear only when their English title AND body exist; otherwise they are invisible in English
// (omitted from lists and the sitemap, and their English URL is a 404).

type ServiceRow = typeof services.$inferSelect;
type ProjectRow = typeof projects.$inferSelect;
type PostRow = typeof posts.$inferSelect;
type FaqRow = typeof faqs.$inferSelect;
type SettingsRow = typeof settings.$inferSelect;
type MediaRow = typeof media.$inferSelect;

/** Slug of the item in each language; `en` is null when there is no English version. */
export type ItemSlugs = { fa: string; en: string | null };

const filled = (value: string | null | undefined): value is string =>
  typeof value === 'string' && value.trim().length > 0;

/** Which concept illustration a project without a cover uses. Always derived from the Persian category. */
export type ArtVariant = 'finance' | 'health' | 'store';

export function artVariantFor(category: string): ArtVariant {
  if (category.includes('سلامت')) return 'health';
  if (category.includes('فروش')) return 'store';
  return 'finance';
}

export type CoverView = { id: number; altText: string; width: number; height: number } | null;

export function toCover(row: MediaRow | null | undefined): CoverView {
  return row ? { id: row.id, altText: row.altText, width: row.width, height: row.height } : null;
}

// ---------- services ----------

export type ServiceView = {
  slug: string;
  slugs: ItemSlugs;
  title: string;
  shortDescription: string;
  bodyMd: string;
  icon: string;
  metaTitle: string;
  metaDescription: string;
  updatedAt: Date;
};

export function serviceHasEnglish(row: ServiceRow) {
  return filled(row.titleEn) && filled(row.shortDescriptionEn) && filled(row.bodyMdEn);
}

export function localizeService(row: ServiceRow, locale: Locale): ServiceView | null {
  const hasEnglish = serviceHasEnglish(row);
  if (locale === 'en' && !hasEnglish) return null;
  const slugs: ItemSlugs = { fa: row.slug, en: hasEnglish ? row.slugEn || row.slug : null };
  if (locale === 'fa') {
    return {
      slug: row.slug,
      slugs,
      title: row.title,
      shortDescription: row.shortDescription,
      bodyMd: row.bodyMd,
      icon: row.icon,
      metaTitle: row.metaTitle,
      metaDescription: row.metaDescription,
      updatedAt: row.updatedAt,
    };
  }
  return {
    slug: slugs.en as string,
    slugs,
    title: row.titleEn as string,
    shortDescription: row.shortDescriptionEn as string,
    bodyMd: row.bodyMdEn as string,
    icon: row.icon,
    metaTitle: row.metaTitleEn ?? '',
    metaDescription: row.metaDescriptionEn ?? '',
    updatedAt: row.updatedAt,
  };
}

// ---------- projects ----------

export type ProjectView = {
  slug: string;
  slugs: ItemSlugs;
  title: string;
  category: string | null;
  year: string | null;
  summary: string;
  challengeMd: string;
  solutionMd: string;
  resultsMd: string;
  techTags: string[];
  art: ArtVariant;
  cover: CoverView;
  isPlaceholder: boolean;
  metaTitle: string;
  metaDescription: string;
  updatedAt: Date;
};

export function projectHasEnglish(row: ProjectRow) {
  const hasBody = filled(row.challengeMdEn) || filled(row.solutionMdEn) || filled(row.resultsMdEn);
  return filled(row.titleEn) && filled(row.summaryEn) && hasBody;
}

export function localizeProject(
  row: ProjectRow,
  cover: MediaRow | null | undefined,
  locale: Locale,
): ProjectView | null {
  const hasEnglish = projectHasEnglish(row);
  if (locale === 'en' && !hasEnglish) return null;
  const slugs: ItemSlugs = { fa: row.slug, en: hasEnglish ? row.slugEn || row.slug : null };
  const common = {
    techTags: row.techTags,
    art: artVariantFor(row.category),
    cover: toCover(cover),
    isPlaceholder: row.isPlaceholder,
    updatedAt: row.updatedAt,
    slugs,
  };
  if (locale === 'fa') {
    return {
      ...common,
      slug: row.slug,
      title: row.title,
      category: row.category || null,
      year: row.year || null,
      summary: row.summary,
      challengeMd: row.challengeMd,
      solutionMd: row.solutionMd,
      resultsMd: row.resultsMd,
      metaTitle: row.metaTitle,
      metaDescription: row.metaDescription,
    };
  }
  return {
    ...common,
    slug: slugs.en as string,
    title: row.titleEn as string,
    category: filled(row.categoryEn) ? row.categoryEn : null,
    // A free-text year such as "نمونهٔ مفهومی" is Persian copy; English shows real years only.
    year: /^\d{4}$/.test(row.year) ? row.year : null,
    summary: row.summaryEn as string,
    challengeMd: row.challengeMdEn ?? '',
    solutionMd: row.solutionMdEn ?? '',
    resultsMd: row.resultsMdEn ?? '',
    metaTitle: row.metaTitleEn ?? '',
    metaDescription: row.metaDescriptionEn ?? '',
  };
}

// ---------- posts ----------

export type PostView = {
  slug: string;
  slugs: ItemSlugs;
  title: string;
  excerpt: string;
  bodyMd: string;
  author: string;
  publishedAt: Date | null;
  noindex: boolean;
  cover: CoverView;
  metaTitle: string;
  metaDescription: string;
  updatedAt: Date;
};

export function postHasEnglish(row: PostRow) {
  return filled(row.titleEn) && filled(row.bodyMdEn);
}

export function localizePost(row: PostRow, cover: MediaRow | null | undefined, locale: Locale): PostView | null {
  const hasEnglish = postHasEnglish(row);
  if (locale === 'en' && !hasEnglish) return null;
  const slugs: ItemSlugs = { fa: row.slug, en: hasEnglish ? row.slugEn || row.slug : null };
  const common = {
    author: row.author,
    publishedAt: row.publishedAt,
    noindex: row.noindex,
    cover: toCover(cover),
    updatedAt: row.updatedAt,
    slugs,
  };
  if (locale === 'fa') {
    return {
      ...common,
      slug: row.slug,
      title: row.title,
      excerpt: row.excerpt,
      bodyMd: row.bodyMd,
      metaTitle: row.metaTitle,
      metaDescription: row.metaDescription,
    };
  }
  return {
    ...common,
    slug: slugs.en as string,
    title: row.titleEn as string,
    excerpt: row.excerptEn ?? '',
    bodyMd: row.bodyMdEn as string,
    metaTitle: row.metaTitleEn ?? '',
    metaDescription: row.metaDescriptionEn ?? '',
  };
}

// ---------- FAQs ----------

export type FaqView = { id: number; question: string; answer: string };

export function localizeFaq(row: FaqRow, locale: Locale): FaqView | null {
  if (locale === 'fa') return { id: row.id, question: row.question, answer: row.answer };
  if (!filled(row.questionEn) || !filled(row.answerEn)) return null;
  return { id: row.id, question: row.questionEn, answer: row.answerEn };
}

// ---------- settings ----------

export type ContactView = {
  email: string;
  phone: string;
  phoneHref: string;
  address: string;
  socials: Array<{ label: string; href: string }>;
};

/** Email, phone and social links are language-neutral. A Persian address is never shown on English pages. */
export function localizeSettings(row: SettingsRow, locale: Locale): ContactView {
  return {
    email: row.contactEmail,
    // Digits follow the page language even if the admin typed Persian digits.
    phone: digits(locale, row.contactPhone),
    phoneHref: row.contactPhoneHref,
    address: locale === 'fa' ? row.contactAddress : (row.contactAddressEn ?? ''),
    socials: row.socials,
  };
}
