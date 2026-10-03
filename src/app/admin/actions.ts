'use server';

import { and, asc, eq, ne, or } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { faqs, leads, media, posts, projects, services, settings } from '@/db/schema';
import { assertMutation } from '@/lib/admin-guard';
import { adminCopy } from '@/content/admin';
import { writeAudit } from '@/lib/audit';
import { faqSchema, postSchema, projectSchema, serviceSchema, settingsSchema } from '@/lib/content-schemas';
import { revalidateContent } from '@/lib/revalidate-content';
import { storeImage } from '@/lib/uploads';

function text(form: FormData, name: string) {
  return String(form.get(name) || '').trim();
}

/** Empty English fields are stored as NULL, which means "no English version". */
function textOrNull(form: FormData, name: string) {
  const value = text(form, name);
  return value === '' ? null : value;
}

function mdOrNull(form: FormData, name: string) {
  const value = String(form.get(name) || '');
  return value.trim() === '' ? null : value;
}

type Slugged = typeof services | typeof projects | typeof posts;

/** An English slug must not collide with another item's Persian or English slug. */
async function englishSlugTaken(table: Slugged, slugEn: string | null, excludeId: number) {
  if (!slugEn) return false;
  const rows = await db
    .select({ id: table.id })
    .from(table)
    .where(and(or(eq(table.slug, slugEn), eq(table.slugEn, slugEn)), ne(table.id, excludeId)))
    .limit(1);
  return rows.length > 0;
}

function flag(form: FormData, name: string) {
  return form.get(name) === 'on' || form.get(name) === 'true';
}

function numberOrNull(form: FormData, name: string) {
  const value = text(form, name);
  if (!value) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function fail(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

async function coverFromForm(form: FormData, userId: number) {
  const file = form.get('cover');
  if (file instanceof File && file.size > 0) {
    const row = await storeImage(file, text(form, 'coverAlt'));
    await writeAudit(userId, 'media.upload', 'media', row.id);
    return row.id;
  }
  return numberOrNull(form, 'coverMediaId');
}

type Orderable = typeof services | typeof projects | typeof faqs;

async function move(table: Orderable, id: number, direction: 'up' | 'down') {
  const rows = await db.select().from(table).orderBy(asc(table.sortOrder), asc(table.id));
  const index = rows.findIndex((row) => row.id === id);
  const target = index + (direction === 'up' ? -1 : 1);
  if (index < 0 || target < 0 || target >= rows.length) return;
  const ordered = [...rows];
  [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
  for (const [position, row] of ordered.entries()) {
    await db.update(table).set({ sortOrder: position, updatedAt: new Date() }).where(eq(table.id, row.id));
  }
}

// ---------- services ----------

export async function saveService(form: FormData) {
  const user = await assertMutation('content:write');
  const id = Number(form.get('id') || 0);
  const back = id ? `/admin/services/${id}` : '/admin/services/new';
  const parsed = serviceSchema.safeParse({
    slug: text(form, 'slug'),
    title: text(form, 'title'),
    shortDescription: text(form, 'shortDescription'),
    bodyMd: String(form.get('bodyMd') || ''),
    icon: text(form, 'icon'),
    published: flag(form, 'published'),
    sortOrder: Number(form.get('sortOrder') || 0),
    metaTitle: text(form, 'metaTitle'),
    metaDescription: text(form, 'metaDescription'),
    slugEn: textOrNull(form, 'slugEn'),
    titleEn: textOrNull(form, 'titleEn'),
    shortDescriptionEn: textOrNull(form, 'shortDescriptionEn'),
    bodyMdEn: mdOrNull(form, 'bodyMdEn'),
    metaTitleEn: textOrNull(form, 'metaTitleEn'),
    metaDescriptionEn: textOrNull(form, 'metaDescriptionEn'),
  });
  if (!parsed.success) fail(back, 'اطلاعات خدمت معتبر نیست.');
  if (await englishSlugTaken(services, parsed.data.slugEn, id)) fail(back, adminCopy.slugEnTaken);

  const values = { ...parsed.data, isPlaceholder: false, updatedAt: new Date() };
  let entityId = id;
  try {
    if (id) {
      await db.update(services).set(values).where(eq(services.id, id));
    } else {
      const [row] = await db.insert(services).values(values).returning({ id: services.id });
      entityId = row.id;
    }
  } catch {
    fail(back, 'نشانی باید یکتا باشد.');
  }
  await writeAudit(user.id, id ? 'service.update' : 'service.create', 'service', entityId);
  revalidateContent([`/services/${parsed.data.slug}`]);
  redirect('/admin/services?saved=1');
}

export async function toggleService(form: FormData) {
  const user = await assertMutation('content:write');
  const id = Number(form.get('id'));
  const published = flag(form, 'published');
  await db.update(services).set({ published, isPlaceholder: false, updatedAt: new Date() }).where(eq(services.id, id));
  await writeAudit(user.id, published ? 'service.publish' : 'service.unpublish', 'service', id);
  revalidateContent();
}

export async function moveService(form: FormData) {
  const user = await assertMutation('content:write');
  const id = Number(form.get('id'));
  await move(services, id, text(form, 'direction') === 'up' ? 'up' : 'down');
  await writeAudit(user.id, 'service.reorder', 'service', id);
  revalidateContent();
}

export async function deleteService(form: FormData) {
  const user = await assertMutation('content:write');
  const id = Number(form.get('id'));
  await db.delete(services).where(eq(services.id, id));
  await writeAudit(user.id, 'service.delete', 'service', id);
  revalidateContent();
  redirect('/admin/services');
}

// ---------- projects ----------

export async function saveProject(form: FormData) {
  const user = await assertMutation('content:write');
  const id = Number(form.get('id') || 0);
  const back = id ? `/admin/projects/${id}` : '/admin/projects/new';
  let coverMediaId: number | null = null;
  try {
    coverMediaId = await coverFromForm(form, user.id);
  } catch (error) {
    fail(back, error instanceof Error ? error.message : 'بارگذاری تصویر انجام نشد.');
  }
  const parsed = projectSchema.safeParse({
    slug: text(form, 'slug'),
    title: text(form, 'title'),
    category: text(form, 'category'),
    year: text(form, 'year'),
    summary: text(form, 'summary'),
    challengeMd: String(form.get('challengeMd') || ''),
    solutionMd: String(form.get('solutionMd') || ''),
    resultsMd: String(form.get('resultsMd') || ''),
    techTags: text(form, 'techTags')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean),
    coverMediaId,
    published: flag(form, 'published'),
    sortOrder: Number(form.get('sortOrder') || 0),
    metaTitle: text(form, 'metaTitle'),
    metaDescription: text(form, 'metaDescription'),
    slugEn: textOrNull(form, 'slugEn'),
    titleEn: textOrNull(form, 'titleEn'),
    categoryEn: textOrNull(form, 'categoryEn'),
    summaryEn: textOrNull(form, 'summaryEn'),
    challengeMdEn: mdOrNull(form, 'challengeMdEn'),
    solutionMdEn: mdOrNull(form, 'solutionMdEn'),
    resultsMdEn: mdOrNull(form, 'resultsMdEn'),
    metaTitleEn: textOrNull(form, 'metaTitleEn'),
    metaDescriptionEn: textOrNull(form, 'metaDescriptionEn'),
  });
  if (!parsed.success) fail(back, 'اطلاعات پروژه معتبر نیست.');
  if (await englishSlugTaken(projects, parsed.data.slugEn, id)) fail(back, adminCopy.slugEnTaken);

  const values = { ...parsed.data, isPlaceholder: false, updatedAt: new Date() };
  let entityId = id;
  try {
    if (id) {
      await db.update(projects).set(values).where(eq(projects.id, id));
    } else {
      const [row] = await db.insert(projects).values(values).returning({ id: projects.id });
      entityId = row.id;
    }
  } catch {
    fail(back, 'نشانی باید یکتا باشد.');
  }
  await writeAudit(user.id, id ? 'project.update' : 'project.create', 'project', entityId);
  revalidateContent([`/projects/${parsed.data.slug}`]);
  redirect('/admin/projects?saved=1');
}

export async function toggleProject(form: FormData) {
  const user = await assertMutation('content:write');
  const id = Number(form.get('id'));
  const published = flag(form, 'published');
  await db.update(projects).set({ published, isPlaceholder: false, updatedAt: new Date() }).where(eq(projects.id, id));
  await writeAudit(user.id, published ? 'project.publish' : 'project.unpublish', 'project', id);
  revalidateContent();
}

export async function moveProject(form: FormData) {
  const user = await assertMutation('content:write');
  const id = Number(form.get('id'));
  await move(projects, id, text(form, 'direction') === 'up' ? 'up' : 'down');
  await writeAudit(user.id, 'project.reorder', 'project', id);
  revalidateContent();
}

export async function deleteProject(form: FormData) {
  const user = await assertMutation('content:write');
  const id = Number(form.get('id'));
  await db.delete(projects).where(eq(projects.id, id));
  await writeAudit(user.id, 'project.delete', 'project', id);
  revalidateContent();
  redirect('/admin/projects');
}

// ---------- posts ----------

export async function savePost(form: FormData) {
  const user = await assertMutation('content:write');
  const id = Number(form.get('id') || 0);
  const back = id ? `/admin/posts/${id}` : '/admin/posts/new';
  let coverMediaId: number | null = null;
  try {
    coverMediaId = await coverFromForm(form, user.id);
  } catch (error) {
    fail(back, error instanceof Error ? error.message : 'بارگذاری تصویر انجام نشد.');
  }
  const published = flag(form, 'published');
  const parsed = postSchema.safeParse({
    slug: text(form, 'slug'),
    title: text(form, 'title'),
    excerpt: text(form, 'excerpt'),
    bodyMd: String(form.get('bodyMd') || ''),
    coverMediaId,
    author: text(form, 'author'),
    published,
    noindex: flag(form, 'noindex'),
    metaTitle: text(form, 'metaTitle'),
    metaDescription: text(form, 'metaDescription'),
    slugEn: textOrNull(form, 'slugEn'),
    titleEn: textOrNull(form, 'titleEn'),
    excerptEn: textOrNull(form, 'excerptEn'),
    bodyMdEn: mdOrNull(form, 'bodyMdEn'),
    metaTitleEn: textOrNull(form, 'metaTitleEn'),
    metaDescriptionEn: textOrNull(form, 'metaDescriptionEn'),
  });
  if (!parsed.success) fail(back, 'اطلاعات مقاله معتبر نیست.');
  if (await englishSlugTaken(posts, parsed.data.slugEn, id)) fail(back, adminCopy.slugEnTaken);

  const values = {
    ...parsed.data,
    isPlaceholder: false,
    publishedAt: published ? new Date() : null,
    updatedAt: new Date(),
  };
  let entityId = id;
  try {
    if (id) {
      await db.update(posts).set(values).where(eq(posts.id, id));
    } else {
      const [row] = await db.insert(posts).values(values).returning({ id: posts.id });
      entityId = row.id;
    }
  } catch {
    fail(back, 'نشانی باید یکتا باشد.');
  }
  await writeAudit(user.id, id ? 'post.update' : 'post.create', 'post', entityId);
  revalidateContent([`/blog/${parsed.data.slug}`]);
  redirect('/admin/posts?saved=1');
}

export async function togglePost(form: FormData) {
  const user = await assertMutation('content:write');
  const id = Number(form.get('id'));
  const published = flag(form, 'published');
  await db
    .update(posts)
    .set({ published, isPlaceholder: false, publishedAt: published ? new Date() : null, updatedAt: new Date() })
    .where(eq(posts.id, id));
  await writeAudit(user.id, published ? 'post.publish' : 'post.unpublish', 'post', id);
  revalidateContent();
}

export async function deletePost(form: FormData) {
  const user = await assertMutation('content:write');
  const id = Number(form.get('id'));
  await db.delete(posts).where(eq(posts.id, id));
  await writeAudit(user.id, 'post.delete', 'post', id);
  revalidateContent();
  redirect('/admin/posts');
}

// ---------- FAQs ----------

export async function saveFaq(form: FormData) {
  const user = await assertMutation('content:write');
  const id = Number(form.get('id') || 0);
  const back = id ? `/admin/faqs/${id}` : '/admin/faqs/new';
  const parsed = faqSchema.safeParse({
    question: text(form, 'question'),
    answer: text(form, 'answer'),
    published: flag(form, 'published'),
    sortOrder: Number(form.get('sortOrder') || 0),
    questionEn: textOrNull(form, 'questionEn'),
    answerEn: textOrNull(form, 'answerEn'),
  });
  if (!parsed.success) fail(back, 'اطلاعات پرسش معتبر نیست.');

  const values = { ...parsed.data, isPlaceholder: false, updatedAt: new Date() };
  let entityId = id;
  if (id) {
    await db.update(faqs).set(values).where(eq(faqs.id, id));
  } else {
    const [row] = await db.insert(faqs).values(values).returning({ id: faqs.id });
    entityId = row.id;
  }
  await writeAudit(user.id, id ? 'faq.update' : 'faq.create', 'faq', entityId);
  revalidateContent(['/faq']);
  redirect('/admin/faqs?saved=1');
}

export async function toggleFaq(form: FormData) {
  const user = await assertMutation('content:write');
  const id = Number(form.get('id'));
  const published = flag(form, 'published');
  await db.update(faqs).set({ published, isPlaceholder: false, updatedAt: new Date() }).where(eq(faqs.id, id));
  await writeAudit(user.id, published ? 'faq.publish' : 'faq.unpublish', 'faq', id);
  revalidateContent(['/faq']);
}

export async function moveFaq(form: FormData) {
  const user = await assertMutation('content:write');
  const id = Number(form.get('id'));
  await move(faqs, id, text(form, 'direction') === 'up' ? 'up' : 'down');
  await writeAudit(user.id, 'faq.reorder', 'faq', id);
  revalidateContent(['/faq']);
}

export async function deleteFaq(form: FormData) {
  const user = await assertMutation('content:write');
  const id = Number(form.get('id'));
  await db.delete(faqs).where(eq(faqs.id, id));
  await writeAudit(user.id, 'faq.delete', 'faq', id);
  revalidateContent(['/faq']);
  redirect('/admin/faqs');
}

// ---------- settings (admin only) ----------

export async function saveSettings(form: FormData) {
  const user = await assertMutation('settings:write');
  const socials = [0, 1, 2].flatMap((index) => {
    const label = text(form, `socialLabel${index}`);
    const href = text(form, `socialHref${index}`);
    return label && href ? [{ label, href }] : [];
  });
  const parsed = settingsSchema.safeParse({
    contactEmail: text(form, 'contactEmail'),
    contactPhone: text(form, 'contactPhone'),
    contactPhoneHref: text(form, 'contactPhoneHref'),
    contactAddress: text(form, 'contactAddress'),
    contactAddressEn: textOrNull(form, 'contactAddressEn'),
    socials,
  });
  if (!parsed.success) fail('/admin/settings', 'اطلاعات تماس معتبر نیست.');

  await db
    .insert(settings)
    .values({ id: 1, ...parsed.data, isPlaceholder: false, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: settings.id,
      set: { ...parsed.data, isPlaceholder: false, updatedAt: new Date() },
    });
  await writeAudit(user.id, 'settings.update', 'settings', 1);
  revalidateContent(['/contact']);
  redirect('/admin/settings?saved=1');
}

// ---------- media ----------

export async function uploadMedia(form: FormData) {
  const user = await assertMutation('content:write');
  const file = form.get('file');
  if (!(file instanceof File)) fail('/admin/media', 'فایلی انتخاب نشده است.');
  try {
    const row = await storeImage(file, text(form, 'altText'));
    await writeAudit(user.id, 'media.upload', 'media', row.id);
  } catch (error) {
    fail('/admin/media', error instanceof Error ? error.message : 'بارگذاری انجام نشد.');
  }
  revalidatePath('/admin/media');
  redirect('/admin/media?saved=1');
}

export async function deleteMedia(form: FormData) {
  const user = await assertMutation('content:write');
  const id = Number(form.get('id'));
  await db.delete(media).where(eq(media.id, id));
  await writeAudit(user.id, 'media.delete', 'media', id);
  revalidateContent();
  redirect('/admin/media');
}

// ---------- leads ----------

export async function updateLead(form: FormData) {
  const user = await assertMutation('leads:update');
  const id = Number(form.get('id'));
  const status = text(form, 'status');
  const notes = String(form.get('notes') || '');
  if (!['new', 'contacted', 'won', 'lost'].includes(status) || notes.length > 5000) {
    fail(`/admin/leads/${id}`, 'اطلاعات درخواست معتبر نیست.');
  }
  await db.update(leads).set({ status, notes }).where(eq(leads.id, id));
  await writeAudit(user.id, 'lead.update', 'lead', id);
  redirect(`/admin/leads/${id}?saved=1`);
}

export async function deleteLead(form: FormData) {
  const user = await assertMutation('leads:delete');
  const id = Number(form.get('id'));
  await db.delete(leads).where(eq(leads.id, id));
  await writeAudit(user.id, 'lead.delete', 'lead', id);
  redirect('/admin/leads');
}
