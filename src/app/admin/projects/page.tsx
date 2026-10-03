import type { Metadata } from 'next';
import Link from 'next/link';
import { asc } from 'drizzle-orm';
import { deleteProject, moveProject, toggleProject } from '@/app/admin/actions';
import { AdminLogin } from '@/components/admin-login';
import { DeleteForm } from '@/components/admin-ui';
import { adminCopy as c } from '@/content/admin';
import { db } from '@/db';
import { projects } from '@/db/schema';
import { getStaff } from '@/lib/auth';
import { projectHasEnglish } from '@/lib/localize';

export const metadata: Metadata = { title: c.projects, robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function ProjectsAdmin({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const admin = await getStaff();
  if (!admin) return <AdminLogin />;
  const rows = await db.select().from(projects).orderBy(asc(projects.sortOrder), asc(projects.id));
  return (
    <>
      <div className="admin-heading"><h1>{c.projects}</h1><Link className="btn btn-primary" href="/admin/projects/new">{c.create}</Link></div>
      {(await searchParams).saved && <p className="notice">{c.saved}</p>}
      {rows.length === 0 ? <div className="card admin-empty">{c.empty}</div> : <div className="card admin-table-wrap"><table className="admin-table"><tbody>{rows.map((row) => (
        <tr key={row.id}>
          <td><Link href={`/admin/projects/${row.id}`}>{row.title}</Link></td><td><span className={`status-pill ${projectHasEnglish(row) ? '' : 'off'}`} lang="en" dir="ltr">{projectHasEnglish(row) ? c.englishReady : c.englishMissing}</span></td>
          <td><form action={toggleProject}><input type="hidden" name="id" value={row.id} /><input type="hidden" name="published" value={row.published ? 'false' : 'true'} /><button className="btn btn-outline">{row.published ? c.unpublish : c.publish}</button></form></td>
          <td><form action={moveProject}><input type="hidden" name="id" value={row.id} /><input type="hidden" name="direction" value="up" /><button className="btn btn-ghost">{c.up}</button></form><form action={moveProject}><input type="hidden" name="id" value={row.id} /><input type="hidden" name="direction" value="down" /><button className="btn btn-ghost">{c.down}</button></form></td>
          <td><DeleteForm action={deleteProject} id={row.id} /></td>
        </tr>
      ))}</tbody></table></div>}
    </>
  );
}
