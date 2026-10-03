import type { Metadata } from 'next';
import Link from 'next/link';
import { asc } from 'drizzle-orm';
import { deleteService, moveService, toggleService } from '@/app/admin/actions';
import { AdminLogin } from '@/components/admin-login';
import { DeleteForm } from '@/components/admin-ui';
import { adminCopy as c } from '@/content/admin';
import { db } from '@/db';
import { services } from '@/db/schema';
import { getStaff } from '@/lib/auth';
import { serviceHasEnglish } from '@/lib/localize';

export const metadata: Metadata = { title: c.services, robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function ServicesAdmin({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const admin = await getStaff();
  if (!admin) return <AdminLogin />;
  const rows = await db.select().from(services).orderBy(asc(services.sortOrder), asc(services.id));
  const saved = (await searchParams).saved;
  return (
    <>
      <div className="admin-heading"><h1>{c.services}</h1><Link className="btn btn-primary" href="/admin/services/new">{c.create}</Link></div>
      {saved && <p className="notice">{c.saved}</p>}
      {rows.length === 0 ? <div className="card admin-empty">{c.empty}</div> : (
        <div className="card admin-table-wrap"><table className="admin-table"><tbody>{rows.map((row) => (
          <tr key={row.id}>
            <td><Link href={`/admin/services/${row.id}`}>{row.title}</Link></td><td><span className={`status-pill ${serviceHasEnglish(row) ? '' : 'off'}`} lang="en" dir="ltr">{serviceHasEnglish(row) ? c.englishReady : c.englishMissing}</span></td>
            <td>
              <form action={toggleService}><input type="hidden" name="id" value={row.id} /><input type="hidden" name="published" value={row.published ? 'false' : 'true'} /><button className="btn btn-outline" type="submit">{row.published ? c.unpublish : c.publish}</button></form>
            </td>
            <td>
              <form action={moveService}><input type="hidden" name="id" value={row.id} /><input type="hidden" name="direction" value="up" /><button className="btn btn-ghost" type="submit">{c.up}</button></form>
              <form action={moveService}><input type="hidden" name="id" value={row.id} /><input type="hidden" name="direction" value="down" /><button className="btn btn-ghost" type="submit">{c.down}</button></form>
            </td>
            <td><DeleteForm action={deleteService} id={row.id} /></td>
          </tr>
        ))}</tbody></table></div>
      )}
    </>
  );
}
