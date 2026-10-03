import type { Metadata } from 'next';
import Link from 'next/link';
import { desc, eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { AdminLogin } from '@/components/admin-login';
import { adminCopy as c } from '@/content/admin';
import { toFa } from '@/lib/digits';
import { db } from '@/db';
import { auditLog, users } from '@/db/schema';
import { getStaff } from '@/lib/auth';
import { can } from '@/lib/permissions';

export const metadata: Metadata = { title: c.audit, robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

const pageSize = 25;
const maxRows = 100;

export default async function AuditAdmin({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const staff = await getStaff();
  if (!staff) return <AdminLogin />;
  if (!can(staff.role, 'audit:read')) redirect('/admin');

  const pagesCount = maxRows / pageSize;
  const requested = Number((await searchParams).page || 1);
  const page = Number.isSafeInteger(requested) ? Math.min(Math.max(requested, 1), pagesCount) : 1;
  const rows = await db
    .select({ id: auditLog.id, action: auditLog.action, entity: auditLog.entity, entityId: auditLog.entityId, createdAt: auditLog.createdAt, email: users.email })
    .from(auditLog)
    .leftJoin(users, eq(auditLog.userId, users.id))
    .orderBy(desc(auditLog.createdAt), desc(auditLog.id))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  return (
    <>
      <h1>{c.audit}</h1>
      {rows.length === 0 ? <div className="card admin-empty">{c.empty}</div> : (
        <div className="card admin-table-wrap">
          <table className="admin-table">
            <thead><tr><th>{c.date}</th><th>{c.user}</th><th>{c.action}</th><th>{c.entity}</th></tr></thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td dir="ltr">{toFa(row.createdAt.toISOString().slice(0, 16).replace('T', ' '))}</td>
                  <td dir="ltr">{row.email ?? '—'}</td>
                  <td dir="ltr">{row.action}</td>
                  <td dir="ltr">{row.entity}{row.entityId ? ` #${row.entityId}` : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <nav className="filter-row" aria-label="صفحه‌بندی" style={{ marginBlockStart: 20 }}>
        {Array.from({ length: pagesCount }, (_, index) => (
          <Link key={index} className={`chip ${page === index + 1 ? 'active' : ''}`} href={`/admin/audit?page=${index + 1}`}>{toFa(index + 1)}</Link>
        ))}
      </nav>
    </>
  );
}
