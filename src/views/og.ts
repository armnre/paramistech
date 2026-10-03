import { findPost, findProject } from '@/lib/content';
import type { Locale } from '@/lib/i18n/dictionary';
import { fallbackOgImage, renderOgCard } from '@/lib/og-card';
import { formatDate } from '@/lib/og-text';
import { getDictionary } from '@/lib/i18n';

export async function projectOgImage(locale: Locale, slug: string) {
  const project = await findProject(locale, slug);
  if (!project) return fallbackOgImage(locale);
  return renderOgCard({ locale, title: project.title, eyebrow: project.category ?? undefined });
}

export async function postOgImage(locale: Locale, slug: string) {
  const post = await findPost(locale, slug);
  if (!post) return fallbackOgImage(locale);
  const date = formatDate(post.publishedAt, locale);
  const label = locale === 'fa' ? 'مقاله' : 'Article';
  return renderOgCard({ locale, title: post.title, eyebrow: date ? `${label} · ${date}` : label });
}

export const ogAlt = (locale: Locale) => getDictionary(locale).site.brand;
