import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { deleteLead, updateLead } from '@/app/admin/actions';
import { AdminLogin } from '@/components/admin-login';
import { DeleteForm } from '@/components/admin-ui';
import { adminCopy as c } from '@/content/admin';
import { toFa } from '@/lib/digits';
import { db } from '@/db';
import { leads } from '@/db/schema';
import { getStaff } from '@/lib/auth';
import { can } from '@/lib/permissions';

export const metadata: Metadata = { title: c.inbox, robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function LeadDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; error?: string }> }) {
  const admin = await getStaff();
  if (!admin) return <AdminLogin />;
  const id = Number((await params).id);
  if (!Number.isSafeInteger(id)) notFound();
  const [lead] = await db.select().from(leads).where(eq(leads.id, id)).limit(1);
  if (!lead) notFound();
  const query = await searchParams;
  return (
    <>
      <Link className="text-link" href="/admin/leads">← {c.back}</Link>
      <h1>{lead.name}</h1>
      {query.saved && <p className="notice" role="status">{c.saved}</p>}
      {query.error && <p className="notice error" role="alert">{query.error}</p>}
      <div className="card form-card">
        <dl className="lead-details">
          <div><dt>{c.email}</dt><dd><a href={`mailto:${lead.email}`}>{lead.email}</a></dd></div>
          <div><dt>{c.phone}</dt><dd><a href={`tel:${lead.phone}`}>{lead.phone}</a></dd></div>
          <div><dt>{c.type}</dt><dd>{lead.projectType}</dd></div>
          <div><dt>{c.localeColumn}</dt><dd>{c.localeNames[lead.locale as 'fa' | 'en'] ?? lead.locale}</dd></div>
          <div><dt>{c.budget}</dt><dd>{lead.budget}</dd></div>
          <div><dt>{c.timeline}</dt><dd>{lead.timeline}</dd></div>
          <div><dt>{c.date}</dt><dd>{toFa(lead.createdAt.toISOString().slice(0, 10))}</dd></div>
        </dl>
        <h2>{c.details}</h2>
        <p style={{ whiteSpace: 'pre-wrap' }}>{lead.details}</p>
        <form action={updateLead}>
          <input type="hidden" name="id" value={lead.id} />
          <div className="field"><label htmlFor="lead-status">{c.status}</label><select id="lead-status" name="status" defaultValue={lead.status}>{Object.entries(c.statuses).map(([key, value]) => <option key={key} value={key}>{value}</option>)}</select></div>
          <div className="field"><label htmlFor="lead-notes">{c.notes}</label><textarea id="lead-notes" name="notes" defaultValue={lead.notes} /></div>
          <button className="btn btn-primary" type="submit">{c.save}</button>
        </form>
        {can(admin.role, 'leads:delete') && <DeleteForm action={deleteLead} id={lead.id} />}
      </div>
    </>
  );
}
