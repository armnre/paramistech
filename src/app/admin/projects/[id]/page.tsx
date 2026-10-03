import { notFound } from 'next/navigation';
import { asc, eq } from 'drizzle-orm';
import { saveProject } from '@/app/admin/actions';
import { AdminLogin } from '@/components/admin-login';
import { AdminForm, EnglishSection, MarkdownField, SlugField } from '@/components/admin-ui';
import { adminCopy as c } from '@/content/admin';
import { db } from '@/db';
import { media, projects } from '@/db/schema';
import { getStaff } from '@/lib/auth';
import { can } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

export default async function ProjectEditor({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  const staff = await getStaff();
  if (!staff) return <AdminLogin />;
  if (!can(staff.role, 'content:write')) return null;
  const id = (await params).id;
  const row = id === 'new' ? null : (await db.select().from(projects).where(eq(projects.id, Number(id))).limit(1))[0];
  if (id !== 'new' && !row) notFound();
  const images = await db.select().from(media).orderBy(asc(media.id));
  const error = (await searchParams).error;
  return (
    <>
      <h1>{row ? c.edit : c.create}</h1>
      {error && <p className="notice error" role="alert">{error}</p>}
      <AdminForm action={saveProject}>
        {row && <input type="hidden" name="id" value={row.id} />}
        <input type="hidden" name="sortOrder" value={row?.sortOrder ?? 0} />
        <div className="field"><label htmlFor="title">عنوان</label><input id="title" name="title" defaultValue={row?.title} required /></div>
        <SlugField defaultValue={row?.slug} />
        <div className="field"><label htmlFor="category">دسته‌بندی</label><input id="category" name="category" defaultValue={row?.category} required /></div>
        <div className="field"><label htmlFor="year">سال</label><input id="year" name="year" defaultValue={row?.year} /></div>
        <div className="field"><label htmlFor="summary">خلاصه</label><textarea id="summary" name="summary" defaultValue={row?.summary} required /></div>
        <MarkdownField name="challengeMd" label="چالش" defaultValue={row?.challengeMd} />
        <MarkdownField name="solutionMd" label="راهکار" defaultValue={row?.solutionMd} />
        <MarkdownField name="resultsMd" label="نتیجه" defaultValue={row?.resultsMd} />
        <div className="field"><label htmlFor="techTags">فناوری‌ها (با ویرگول)</label><input id="techTags" name="techTags" dir="ltr" defaultValue={row?.techTags.join(', ')} /></div>
        <div className="field"><label htmlFor="coverMediaId">تصویر موجود</label><select id="coverMediaId" name="coverMediaId" defaultValue={row?.coverMediaId ?? ''}><option value="">بدون تصویر</option>{images.map((item) => <option key={item.id} value={item.id}>{item.altText}</option>)}</select></div>
        <div className="field"><label htmlFor="cover">تصویر جدید</label><input id="cover" name="cover" type="file" accept="image/png,image/jpeg,image/webp" /></div>
        <div className="field"><label htmlFor="coverAlt">{c.alt}</label><input id="coverAlt" name="coverAlt" /></div>
        <div className="field"><label htmlFor="metaTitle">عنوان سئو</label><input id="metaTitle" name="metaTitle" defaultValue={row?.metaTitle} /></div>
        <div className="field"><label htmlFor="metaDescription">توضیح سئو</label><textarea id="metaDescription" name="metaDescription" defaultValue={row?.metaDescription} /></div>

        <EnglishSection>
          <div className="field"><label htmlFor="titleEn">Title</label><input id="titleEn" name="titleEn" defaultValue={row?.titleEn ?? ''} /></div>
          <SlugField name="slugEn" label="URL slug (optional, defaults to the Persian slug)" titleField="titleEn" defaultValue={row?.slugEn ?? ''} required={false} />
          <div className="field"><label htmlFor="categoryEn">Category</label><input id="categoryEn" name="categoryEn" defaultValue={row?.categoryEn ?? ''} /></div>
          <div className="field"><label htmlFor="summaryEn">Summary</label><textarea id="summaryEn" name="summaryEn" defaultValue={row?.summaryEn ?? ''} /></div>
          <MarkdownField name="challengeMdEn" label="Challenge (Markdown)" defaultValue={row?.challengeMdEn ?? ''} dir="ltr" />
          <MarkdownField name="solutionMdEn" label="Solution (Markdown)" defaultValue={row?.solutionMdEn ?? ''} dir="ltr" />
          <MarkdownField name="resultsMdEn" label="Results (Markdown)" defaultValue={row?.resultsMdEn ?? ''} dir="ltr" />
          <div className="field"><label htmlFor="metaTitleEn">SEO title</label><input id="metaTitleEn" name="metaTitleEn" defaultValue={row?.metaTitleEn ?? ''} /></div>
          <div className="field"><label htmlFor="metaDescriptionEn">SEO description</label><textarea id="metaDescriptionEn" name="metaDescriptionEn" defaultValue={row?.metaDescriptionEn ?? ''} /></div>
        </EnglishSection>

        <label><input type="checkbox" name="published" defaultChecked={row?.published} /> {c.publish}</label>
        <button className="btn btn-primary" type="submit">{c.save}</button>
      </AdminForm>
    </>
  );
}
