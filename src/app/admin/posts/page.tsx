import type { Metadata } from 'next';
import Link from 'next/link';
import { desc } from 'drizzle-orm';
import { deletePost, togglePost } from '@/app/admin/actions';
import { AdminLogin } from '@/components/admin-login';
import { DeleteForm } from '@/components/admin-ui';
import { adminCopy as c } from '@/content/admin';
import { db } from '@/db';
import { posts } from '@/db/schema';
import { getStaff } from '@/lib/auth';
import { postHasEnglish } from '@/lib/localize';

export const metadata: Metadata = { title: c.posts, robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function PostsAdmin({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const admin = await getStaff();
  if (!admin) return <AdminLogin />;
  const rows = await db.select().from(posts).orderBy(desc(posts.updatedAt));
  return (
    <>
      <div className="admin-heading"><h1>{c.posts}</h1><Link className="btn btn-primary" href="/admin/posts/new">{c.create}</Link></div>
      {(await searchParams).saved && <p className="notice">{c.saved}</p>}
      {rows.length === 0 ? <div className="card admin-empty">{c.empty}</div> : <div className="card admin-table-wrap"><table className="admin-table"><tbody>{rows.map((row) => (
        <tr key={row.id}>
          <td><Link href={`/admin/posts/${row.id}`}>{row.title}</Link></td><td><span className={`status-pill ${postHasEnglish(row) ? '' : 'off'}`} lang="en" dir="ltr">{postHasEnglish(row) ? c.englishReady : c.englishMissing}</span></td>
          <td><form action={togglePost}><input type="hidden" name="id" value={row.id} /><input type="hidden" name="published" value={row.published ? 'false' : 'true'} /><button className="btn btn-outline">{row.published ? c.unpublish : c.publish}</button></form></td>
          <td><DeleteForm action={deletePost} id={row.id} /></td>
        </tr>
      ))}</tbody></table></div>}
    </>
  );
}
