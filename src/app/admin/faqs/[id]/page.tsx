import { notFound } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { saveFaq } from '@/app/admin/actions';
import { AdminLogin } from '@/components/admin-login';
import { AdminForm, EnglishSection } from '@/components/admin-ui';
import { adminCopy as c } from '@/content/admin';
import { db } from '@/db';
import { faqs } from '@/db/schema';
import { getStaff } from '@/lib/auth';
import { can } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

export default async function FaqEditor({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  const staff = await getStaff();
  if (!staff) return <AdminLogin />;
  if (!can(staff.role, 'content:write')) return null;
  const id = (await params).id;
  const row = id === 'new' ? null : (await db.select().from(faqs).where(eq(faqs.id, Number(id))).limit(1))[0];
  if (id !== 'new' && !row) notFound();
  const error = (await searchParams).error;
  return (
    <>
      <h1>{row ? c.edit : c.create}</h1>
      {error && <p className="notice error" role="alert">{error}</p>}
      <AdminForm action={saveFaq}>
        {row && <input type="hidden" name="id" value={row.id} />}
        <input type="hidden" name="sortOrder" value={row?.sortOrder ?? 0} />
        <div className="field"><label htmlFor="question">پرسش</label><input id="question" name="question" defaultValue={row?.question} required /></div>
        <div className="field"><label htmlFor="answer">پاسخ</label><textarea id="answer" name="answer" defaultValue={row?.answer} required /></div>
        <EnglishSection>
          <div className="field"><label htmlFor="questionEn">Question</label><input id="questionEn" name="questionEn" defaultValue={row?.questionEn ?? ''} /></div>
          <div className="field"><label htmlFor="answerEn">Answer</label><textarea id="answerEn" name="answerEn" defaultValue={row?.answerEn ?? ''} /></div>
        </EnglishSection>
        <label><input type="checkbox" name="published" defaultChecked={row?.published} /> {c.publish}</label>
        <button className="btn btn-primary" type="submit">{c.save}</button>
      </AdminForm>
    </>
  );
}
