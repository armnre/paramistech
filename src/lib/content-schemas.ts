import { z } from 'zod';

export const serviceIcons = ['building', 'smartphone', 'cloud', 'brain'] as const;
const seo = { metaTitle: z.string().max(200).default(''), metaDescription: z.string().max(320).default('') };
// English translation fields are optional: empty means "not available in English" and are stored as NULL.
const en = (max: number) => z.string().max(max).nullable().default(null);
const seoEn = { metaTitleEn: en(200), metaDescriptionEn: en(320) };
const slug = z.string().min(1).max(160).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const serviceSchema = z.object({
  slug,
  title: z.string().min(2).max(200),
  shortDescription: z.string().min(10).max(500),
  bodyMd: z.string().max(20000).default(''),
  icon: z.enum(serviceIcons),
  published: z.boolean().default(false),
  sortOrder: z.number().int().min(0).max(10000).default(0),
  ...seo,
  slugEn: slug.nullable().default(null),
  titleEn: en(200),
  shortDescriptionEn: en(500),
  bodyMdEn: en(20000),
  ...seoEn,
});

export const projectSchema = z.object({
  slug,
  title: z.string().min(2).max(200),
  category: z.string().min(2).max(80),
  year: z.string().max(40).default(''),
  summary: z.string().min(10).max(800),
  challengeMd: z.string().max(20000).default(''),
  solutionMd: z.string().max(20000).default(''),
  resultsMd: z.string().max(20000).default(''),
  techTags: z.array(z.string().min(1).max(40)).max(12).default([]),
  coverMediaId: z.number().int().positive().nullable().default(null),
  published: z.boolean().default(false),
  sortOrder: z.number().int().min(0).max(10000).default(0),
  ...seo,
  slugEn: slug.nullable().default(null),
  titleEn: en(200),
  categoryEn: en(80),
  summaryEn: en(800),
  challengeMdEn: en(20000),
  solutionMdEn: en(20000),
  resultsMdEn: en(20000),
  ...seoEn,
});

export const postSchema = z.object({
  slug,
  title: z.string().min(2).max(200),
  excerpt: z.string().max(500).default(''),
  bodyMd: z.string().min(1).max(50000),
  coverMediaId: z.number().int().positive().nullable().default(null),
  author: z.string().max(160).default(''),
  published: z.boolean().default(false),
  noindex: z.boolean().default(false),
  ...seo,
  slugEn: slug.nullable().default(null),
  titleEn: en(200),
  excerptEn: en(500),
  bodyMdEn: en(50000),
  ...seoEn,
});

export const faqSchema = z.object({
  question: z.string().min(5).max(300),
  answer: z.string().min(5).max(5000),
  published: z.boolean().default(false),
  sortOrder: z.number().int().min(0).max(10000).default(0),
  questionEn: en(300),
  answerEn: en(5000),
});

export const settingsSchema = z.object({
  contactEmail: z.string().max(255).default(''),
  contactPhone: z.string().max(40).default(''),
  contactPhoneHref: z.string().max(40).default(''),
  contactAddress: z.string().max(300).default(''),
  contactAddressEn: en(300),
  socials: z.array(z.object({ label: z.string().min(1).max(40), href: z.url().max(300) })).max(6).default([]),
});

export const mediaSchema = z.object({
  altText: z.string().min(2).max(300),
});
