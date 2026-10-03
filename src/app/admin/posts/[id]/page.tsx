import { notFound } from 'next/navigation';
import { asc, eq } from 'drizzle-orm';
import { savePost } from '@/app/admin/actions';
import { AdminLogin } from '@/components/admin-login';
import { AdminForm, EnglishSection, MarkdownField, SlugField } from '@/components/admin-ui';
import { adminCopy as c } from '@/content/admin';
import { db } from '@/db';
import { media, posts } from '@/db/schema';
import { getStaff } from '@/lib/auth';
import { can } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

export default async function PostEditor({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  const staff = await getStaff();
  if (!staff) return <AdminLogin />;
  if (!can(staff.role, 'content:write')) return null;
  const id = (await params).id;
  const row = id === 'new' ? null : (await db.select().from(posts).where(eq(posts.id, Number(id))).limit(1))[0];
  if (id !== 'new' && !row) notFound();
  const images = await db.select().from(media).orderBy(asc(media.id));
  const error = (await searchParams).error;
  return (
    <>
      <h1>{row ? c.edit : c.create}</h1>
      {error && <p className="notice error" role="alert">{error}</p>}
      <AdminForm action={savePost}>
        {row && <input type="hidden" name="id" value={row.id} />}
        <div className="field"><label htmlFor="title">عنوان</label><input id="title" name="title" defaultValue={row?.title} required /></div>
        <SlugField defaultValue={row?.slug} />
        <div className="field"><label htmlFor="author">نویسنده</label><input id="author" name="author" defaultValue={row?.author} /></div>
        <div className="field"><label htmlFor="excerpt">خلاصه</label><textarea id="excerpt" name="excerpt" defaultValue={row?.excerpt} /></div>
        <MarkdownField name="bodyMd" label="متن" defaultValue={row?.bodyMd} />
        <div className="field"><label htmlFor="coverMediaId">تصویر موجود</label><select id="coverMediaId" name="coverMediaId" defaultValue={row?.coverMediaId ?? ''}><option value="">بدون تصویر</option>{images.map((item) => <option key={item.id} value={item.id}>{item.altText}</option>)}</select></div>
        <div className="field"><label htmlFor="cover">تصویر جدید</label><input id="cover" name="cover" type="file" accept="image/png,image/jpeg,image/webp" /></div>
        <div className="field"><label htmlFor="coverAlt">{c.alt}</label><input id="coverAlt" name="coverAlt" /></div>
        <div className="field"><label htmlFor="metaTitle">عنوان سئو</label><input id="metaTitle" name="metaTitle" defaultValue={row?.metaTitle} /></div>
        <div className="field"><label htmlFor="metaDescription">توضیح سئو</label><textarea id="metaDescription" name="metaDescription" defaultValue={row?.metaDescription} /></div>

        <EnglishSection>
          <div className="field"><label htmlFor="titleEn">Title</label><input id="titleEn" name="titleEn" defaultValue={row?.titleEn ?? ''} /></div>
          <SlugField name="slugEn" label="URL slug (optional, defaults to the Persian slug)" titleField="titleEn" defaultValue={row?.slugEn ?? ''} required={false} />
          <div className="field"><label htmlFor="excerptEn">Excerpt</label><textarea id="excerptEn" name="excerptEn" defaultValue={row?.excerptEn ?? ''} /></div>
          <MarkdownField name="bodyMdEn" label="Body (Markdown)" defaultValue={row?.bodyMdEn ?? ''} dir="ltr" />
          <div className="field"><label htmlFor="metaTitleEn">SEO title</label><input id="metaTitleEn" name="metaTitleEn" defaultValue={row?.metaTitleEn ?? ''} /></div>
          <div className="field"><label htmlFor="metaDescriptionEn">SEO description</label><textarea id="metaDescriptionEn" name="metaDescriptionEn" defaultValue={row?.metaDescriptionEn ?? ''} /></div>
        </EnglishSection>

        <label><input type="checkbox" name="published" defaultChecked={row?.published} /> {c.publish}</label>
        <label><input type="checkbox" name="noindex" defaultChecked={row?.noindex} /> noindex</label>
        <button className="btn btn-primary" type="submit">{c.save}</button>
      </AdminForm>
    </>
  );
}
