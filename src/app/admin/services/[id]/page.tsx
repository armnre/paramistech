import { notFound } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { saveService } from '@/app/admin/actions';
import { AdminLogin } from '@/components/admin-login';
import { AdminForm, EnglishSection, MarkdownField, SlugField } from '@/components/admin-ui';
import { adminCopy as c } from '@/content/admin';
import { db } from '@/db';
import { services } from '@/db/schema';
import { getStaff } from '@/lib/auth';
import { serviceIcons } from '@/lib/content-schemas';
import { can } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

export default async function ServiceEditor({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  const staff = await getStaff();
  if (!staff) return <AdminLogin />;
  if (!can(staff.role, 'content:write')) return null;
  const id = (await params).id;
  const row = id === 'new' ? null : (await db.select().from(services).where(eq(services.id, Number(id))).limit(1))[0];
  if (id !== 'new' && !row) notFound();
  const error = (await searchParams).error;
  return (
    <>
      <h1>{row ? c.edit : c.create}</h1>
      {error && <p className="notice error" role="alert">{error}</p>}
      <AdminForm action={saveService}>
        {row && <input type="hidden" name="id" value={row.id} />}
        <input type="hidden" name="sortOrder" value={row?.sortOrder ?? 0} />
        <div className="field"><label htmlFor="title">عنوان</label><input id="title" name="title" defaultValue={row?.title} required /></div>
        <SlugField defaultValue={row?.slug} />
        <div className="field"><label htmlFor="icon">آیکن</label><select id="icon" name="icon" defaultValue={row?.icon || 'building'}>{serviceIcons.map((icon) => <option key={icon}>{icon}</option>)}</select></div>
        <div className="field"><label htmlFor="shortDescription">توضیح کوتاه</label><textarea id="shortDescription" name="shortDescription" defaultValue={row?.shortDescription} required /></div>
        <MarkdownField name="bodyMd" label="متن" defaultValue={row?.bodyMd} />
        <div className="field"><label htmlFor="metaTitle">عنوان سئو</label><input id="metaTitle" name="metaTitle" defaultValue={row?.metaTitle} /></div>
        <div className="field"><label htmlFor="metaDescription">توضیح سئو</label><textarea id="metaDescription" name="metaDescription" defaultValue={row?.metaDescription} /></div>

        <EnglishSection>
          <div className="field"><label htmlFor="titleEn">Title</label><input id="titleEn" name="titleEn" defaultValue={row?.titleEn ?? ''} /></div>
          <SlugField name="slugEn" label="URL slug (optional, defaults to the Persian slug)" titleField="titleEn" defaultValue={row?.slugEn ?? ''} required={false} />
          <div className="field"><label htmlFor="shortDescriptionEn">Short description</label><textarea id="shortDescriptionEn" name="shortDescriptionEn" defaultValue={row?.shortDescriptionEn ?? ''} /></div>
          <MarkdownField name="bodyMdEn" label="Body (Markdown)" defaultValue={row?.bodyMdEn ?? ''} dir="ltr" />
          <div className="field"><label htmlFor="metaTitleEn">SEO title</label><input id="metaTitleEn" name="metaTitleEn" defaultValue={row?.metaTitleEn ?? ''} /></div>
          <div className="field"><label htmlFor="metaDescriptionEn">SEO description</label><textarea id="metaDescriptionEn" name="metaDescriptionEn" defaultValue={row?.metaDescriptionEn ?? ''} /></div>
        </EnglishSection>

        <label><input type="checkbox" name="published" defaultChecked={row?.published} /> {c.publish}</label>
        <button className="btn btn-primary" type="submit">{c.save}</button>
      </AdminForm>
    </>
  );
}
