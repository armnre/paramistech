import type { Metadata } from 'next';
import Link from 'next/link';
import { and, count, desc, eq, ilike, or } from 'drizzle-orm';
import { AdminLogin } from '@/components/admin-login';
import { adminCopy as c } from '@/content/admin';
import { toFa } from '@/lib/digits';
import { db } from '@/db';
import { leads } from '@/db/schema';
import { getStaff } from '@/lib/auth';
import { can } from '@/lib/permissions';

export const metadata: Metadata = { title: c.inbox, robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';
const pageSize = 20;

export default async function LeadsPage({ searchParams }: { searchParams: Promise<{ status?: string; page?: string; q?: string }> }) {
  const admin = await getStaff();
  if (!admin) return <AdminLogin />;
  const params = await searchParams;
  const status = params.status && params.status in c.statuses ? params.status : '';
  const page = Math.max(1, Number(params.page || 1) || 1);
  const query = (params.q || '').replace(/[%_]/g, '').slice(0, 80);
  const filters = [];
  if (status) filters.push(eq(leads.status, status));
  if (query) filters.push(or(ilike(leads.name, `%${query}%`), ilike(leads.email, `%${query}%`)));
  const where = filters.length ? and(...filters) : undefined;
  const [total, items] = await Promise.all([
    db.select({ total: count() }).from(leads).where(where),
    db.select().from(leads).where(where).orderBy(desc(leads.createdAt)).limit(pageSize).offset((page - 1) * pageSize),
  ]);
  const pages = Math.max(1, Math.ceil(total[0].total / pageSize));
  const exportHref = `/admin/leads/export${status ? `?status=${status}` : ''}`;
  return (
    <>
      <div className="admin-heading"><h1>{c.inbox}</h1>{can(admin.role, 'leads:export') && <a className="btn btn-outline" href={exportHref}>{c.export}</a>}</div>
      <form className="filter-row" method="get">
        <input name="q" defaultValue={query} aria-label={c.search} placeholder={c.search} />
        <Link className={`chip ${!status ? 'active' : ''}`} href="/admin/leads">{c.all}</Link>
        {Object.entries(c.statuses).map(([key, label]) => <Link key={key} className={`chip ${status === key ? 'active' : ''}`} href={`/admin/leads?status=${key}`}>{label}</Link>)}
      </form>
      {items.length === 0 ? <div className="card admin-empty">{c.empty}</div> : (
        <div className="card admin-table-wrap">
          <table className="admin-table">
            <thead><tr><th>{c.name}</th><th>{c.type}</th><th>{c.localeColumn}</th><th>{c.date}</th><th>{c.status}</th></tr></thead>
            <tbody>{items.map((item) => <tr key={item.id}><td><Link href={`/admin/leads/${item.id}`}>{item.name}</Link></td><td>{item.projectType}</td><td>{c.localeNames[item.locale as 'fa' | 'en'] ?? item.locale}</td><td>{toFa(item.createdAt.toISOString().slice(0, 10))}</td><td>{c.statuses[item.status as keyof typeof c.statuses]}</td></tr>)}</tbody>
          </table>
        </div>
      )}
      {pages > 1 && <nav className="filter-row">{Array.from({ length: pages }, (_, index) => <Link key={index} className={`chip ${page === index + 1 ? 'active' : ''}`} href={`/admin/leads?page=${index + 1}${status ? `&status=${status}` : ''}${query ? `&q=${encodeURIComponent(query)}` : ''}`}>{toFa(index + 1)}</Link>)}</nav>}
    </>
  );
}
