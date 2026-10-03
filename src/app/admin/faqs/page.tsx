import type { Metadata } from 'next';
import Link from 'next/link';
import { asc } from 'drizzle-orm';
import { deleteFaq, moveFaq, toggleFaq } from '@/app/admin/actions';
import { AdminLogin } from '@/components/admin-login';
import { DeleteForm } from '@/components/admin-ui';
import { adminCopy as c } from '@/content/admin';
import { db } from '@/db';
import { faqs } from '@/db/schema';
import { getStaff } from '@/lib/auth';

export const metadata: Metadata = { title: c.faqs, robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function FaqsAdmin({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const admin = await getStaff();
  if (!admin) return <AdminLogin />;
  const rows = await db.select().from(faqs).orderBy(asc(faqs.sortOrder), asc(faqs.id));
  return (
    <>
      <div className="admin-heading"><h1>{c.faqs}</h1><Link className="btn btn-primary" href="/admin/faqs/new">{c.create}</Link></div>
      {(await searchParams).saved && <p className="notice">{c.saved}</p>}
      {rows.length === 0 ? <div className="card admin-empty">{c.empty}</div> : <div className="card admin-table-wrap"><table className="admin-table"><tbody>{rows.map((row) => (
        <tr key={row.id}>
          <td><Link href={`/admin/faqs/${row.id}`}>{row.question}</Link></td><td><span className={`status-pill ${row.questionEn && row.answerEn ? '' : 'off'}`} lang="en" dir="ltr">{row.questionEn && row.answerEn ? c.englishReady : c.englishMissing}</span></td>
          <td><form action={toggleFaq}><input type="hidden" name="id" value={row.id} /><input type="hidden" name="published" value={row.published ? 'false' : 'true'} /><button className="btn btn-outline">{row.published ? c.unpublish : c.publish}</button></form></td>
          <td><form action={moveFaq}><input type="hidden" name="id" value={row.id} /><input type="hidden" name="direction" value="up" /><button className="btn btn-ghost">{c.up}</button></form><form action={moveFaq}><input type="hidden" name="id" value={row.id} /><input type="hidden" name="direction" value="down" /><button className="btn btn-ghost">{c.down}</button></form></td>
          <td><DeleteForm action={deleteFaq} id={row.id} /></td>
        </tr>
      ))}</tbody></table></div>}
    </>
  );
}
