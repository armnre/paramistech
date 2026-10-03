import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
};

export const leadAttempts = pgTable(
  'lead_attempts',
  {
    id: serial('id').primaryKey(),
    ipHash: varchar('ip_hash', { length: 64 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('lead_attempts_ip_created_idx').on(table.ipHash, table.createdAt)],
);

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: varchar('role', { length: 20 }).notNull().default('admin'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const sessions = pgTable(
  'sessions',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: varchar('token_hash', { length: 64 }).notNull().unique(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    ipHash: varchar('ip_hash', { length: 64 }).notNull().default(''),
    userAgent: varchar('user_agent', { length: 300 }).notNull().default(''),
  },
  (table) => [index('sessions_user_idx').on(table.userId), index('sessions_expires_idx').on(table.expiresAt)],
);

export const auditLog = pgTable(
  'audit_log',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
    action: varchar('action', { length: 60 }).notNull(),
    entity: varchar('entity', { length: 60 }).notNull(),
    entityId: varchar('entity_id', { length: 40 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('audit_log_created_idx').on(table.createdAt)],
);

export const adminLoginAttempts = pgTable(
  'admin_login_attempts',
  {
    id: serial('id').primaryKey(),
    ipHash: varchar('ip_hash', { length: 64 }).notNull(),
    emailHash: varchar('email_hash', { length: 64 }).notNull().default(''),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('admin_attempts_ip_created_idx').on(table.ipHash, table.createdAt),
    index('admin_attempts_email_created_idx').on(table.emailHash, table.createdAt),
  ],
);

export const leads = pgTable(
  'leads',
  {
    id: serial('id').primaryKey(),
    projectType: varchar('project_type', { length: 100 }).notNull(),
    budget: varchar('budget', { length: 100 }).notNull(),
    timeline: varchar('timeline', { length: 100 }).notNull(),
    name: varchar('name', { length: 160 }).notNull(),
    email: varchar('email', { length: 255 }).notNull(),
    phone: varchar('phone', { length: 40 }).notNull(),
    details: text('details').notNull(),
    consent: boolean('consent').notNull().default(false),
    consentAt: timestamp('consent_at', { withTimezone: true }),
    locale: varchar('locale', { length: 5 }).notNull().default('fa'),
    status: varchar('status', { length: 20 }).notNull().default('new'),
    notes: text('notes').notNull().default(''),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('leads_created_at_idx').on(table.createdAt)],
);

export const media = pgTable('media', {
  id: serial('id').primaryKey(),
  path: varchar('path', { length: 255 }).notNull(),
  mime: varchar('mime', { length: 80 }).notNull(),
  size: integer('size').notNull(),
  width: integer('width').notNull(),
  height: integer('height').notNull(),
  altText: text('alt_text').notNull(),
  isPlaceholder: boolean('is_placeholder').notNull().default(false),
  ...timestamps,
});

export const services = pgTable('services', {
  id: serial('id').primaryKey(),
  slug: varchar('slug', { length: 160 }).notNull().unique(),
  slugEn: varchar('slug_en', { length: 160 }).unique(),
  title: varchar('title', { length: 200 }).notNull(),
  titleEn: varchar('title_en', { length: 200 }),
  shortDescription: text('short_description').notNull(),
  shortDescriptionEn: text('short_description_en'),
  bodyMd: text('body_md').notNull().default(''),
  bodyMdEn: text('body_md_en'),
  icon: varchar('icon', { length: 40 }).notNull(),
  published: boolean('published').notNull().default(false),
  sortOrder: integer('sort_order').notNull().default(0),
  metaTitle: varchar('meta_title', { length: 200 }).notNull().default(''),
  metaDescription: text('meta_description').notNull().default(''),
  metaTitleEn: varchar('meta_title_en', { length: 200 }),
  metaDescriptionEn: text('meta_description_en'),
  isPlaceholder: boolean('is_placeholder').notNull().default(false),
  ...timestamps,
});

export const projects = pgTable('projects', {
  id: serial('id').primaryKey(),
  slug: varchar('slug', { length: 160 }).notNull().unique(),
  slugEn: varchar('slug_en', { length: 160 }).unique(),
  title: varchar('title', { length: 200 }).notNull(),
  titleEn: varchar('title_en', { length: 200 }),
  category: varchar('category', { length: 80 }).notNull(),
  categoryEn: varchar('category_en', { length: 80 }),
  year: varchar('year', { length: 40 }).notNull().default(''),
  summary: text('summary').notNull(),
  summaryEn: text('summary_en'),
  challengeMd: text('challenge_md').notNull().default(''),
  challengeMdEn: text('challenge_md_en'),
  solutionMd: text('solution_md').notNull().default(''),
  solutionMdEn: text('solution_md_en'),
  resultsMd: text('results_md').notNull().default(''),
  resultsMdEn: text('results_md_en'),
  techTags: text('tech_tags').array().notNull().default([]),
  coverMediaId: integer('cover_media_id').references(() => media.id, { onDelete: 'set null' }),
  published: boolean('published').notNull().default(false),
  sortOrder: integer('sort_order').notNull().default(0),
  metaTitle: varchar('meta_title', { length: 200 }).notNull().default(''),
  metaDescription: text('meta_description').notNull().default(''),
  metaTitleEn: varchar('meta_title_en', { length: 200 }),
  metaDescriptionEn: text('meta_description_en'),
  isPlaceholder: boolean('is_placeholder').notNull().default(false),
  ...timestamps,
});

export const posts = pgTable('posts', {
  id: serial('id').primaryKey(),
  slug: varchar('slug', { length: 160 }).notNull().unique(),
  slugEn: varchar('slug_en', { length: 160 }).unique(),
  title: varchar('title', { length: 200 }).notNull(),
  titleEn: varchar('title_en', { length: 200 }),
  excerpt: text('excerpt').notNull().default(''),
  excerptEn: text('excerpt_en'),
  bodyMd: text('body_md').notNull().default(''),
  bodyMdEn: text('body_md_en'),
  coverMediaId: integer('cover_media_id').references(() => media.id, { onDelete: 'set null' }),
  author: varchar('author', { length: 160 }).notNull().default(''),
  published: boolean('published').notNull().default(false),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  metaTitle: varchar('meta_title', { length: 200 }).notNull().default(''),
  metaDescription: text('meta_description').notNull().default(''),
  metaTitleEn: varchar('meta_title_en', { length: 200 }),
  metaDescriptionEn: text('meta_description_en'),
  noindex: boolean('noindex').notNull().default(false),
  isPlaceholder: boolean('is_placeholder').notNull().default(false),
  ...timestamps,
});

export const faqs = pgTable('faqs', {
  id: serial('id').primaryKey(),
  question: varchar('question', { length: 300 }).notNull(),
  questionEn: varchar('question_en', { length: 300 }),
  answer: text('answer').notNull(),
  answerEn: text('answer_en'),
  published: boolean('published').notNull().default(false),
  sortOrder: integer('sort_order').notNull().default(0),
  isPlaceholder: boolean('is_placeholder').notNull().default(false),
  ...timestamps,
});

export const settings = pgTable('settings', {
  id: integer('id').primaryKey(),
  contactEmail: varchar('contact_email', { length: 255 }).notNull().default(''),
  contactPhone: varchar('contact_phone', { length: 40 }).notNull().default(''),
  contactPhoneHref: varchar('contact_phone_href', { length: 40 }).notNull().default(''),
  contactAddress: varchar('contact_address', { length: 300 }).notNull().default(''),
  contactAddressEn: varchar('contact_address_en', { length: 300 }).default(''),
  socials: jsonb('socials').$type<Array<{ label: string; href: string }>>().notNull().default([]),
  isPlaceholder: boolean('is_placeholder').notNull().default(false),
  ...timestamps,
});
