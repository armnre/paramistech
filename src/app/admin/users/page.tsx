import type { Metadata } from 'next';
import { asc } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { createUser, resetUserPassword, setUserActive } from '@/app/admin/user-actions';
import { AdminLogin } from '@/components/admin-login';
import { adminCopy as c } from '@/content/admin';
import { toFa } from '@/lib/digits';
import { db } from '@/db';
import { users } from '@/db/schema';
import { getStaff } from '@/lib/auth';
import { can, roles } from '@/lib/permissions';

export const metadata: Metadata = { title: c.users, robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function UsersAdmin({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const staff = await getStaff();
  if (!staff) return <AdminLogin />;
  if (!can(staff.role, 'users:manage')) redirect('/admin');

  const query = await searchParams;
  const rows = await db.select().from(users).orderBy(asc(users.id));
  return (
    <>
      <h1>{c.users}</h1>
      {query.saved && <p className="notice" role="status">{c.saved}</p>}
      {query.error && <p className="notice error" role="alert">{query.error}</p>}

      <form className="card form-card" action={createUser} style={{ marginBlockEnd: 24 }}>
        <h2>{c.createUser}</h2>
        <div className="inline-form">
          <label htmlFor="new-email">{c.email}</label>
          <input id="new-email" name="email" type="email" dir="ltr" autoComplete="off" required />
          <label htmlFor="new-role">{c.role}</label>
          <select id="new-role" name="role" defaultValue="editor">
            {roles.map((role) => <option key={role} value={role}>{c.roles[role]}</option>)}
          </select>
          <label htmlFor="new-password">{c.tempPassword}</label>
          <input id="new-password" name="password" type="password" autoComplete="new-password" minLength={14} required />
          <button className="btn btn-primary" type="submit">{c.createUser}</button>
        </div>
      </form>

      <div className="card admin-table-wrap">
        <table className="admin-table">
          <thead><tr><th>{c.email}</th><th>{c.role}</th><th>{c.status}</th><th>{c.date}</th><th>{c.action}</th></tr></thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td dir="ltr">{row.email}</td>
                <td>{c.roles[row.role as 'admin' | 'editor'] ?? row.role}</td>
                <td><span className={`status-pill ${row.isActive ? '' : 'off'}`}>{row.isActive ? c.active : c.inactive}</span></td>
                <td>{toFa(row.createdAt.toISOString().slice(0, 10))}</td>
                <td>
                  <form action={resetUserPassword} className="inline-form">
                    <input type="hidden" name="id" value={row.id} />
                    <input name="password" type="password" aria-label={c.newPassword} placeholder={c.newPassword} autoComplete="new-password" minLength={14} required />
                    <button className="btn btn-outline" type="submit">{c.resetPassword}</button>
                  </form>
                  <form action={setUserActive}>
                    <input type="hidden" name="id" value={row.id} />
                    <input type="hidden" name="active" value={row.isActive ? 'false' : 'true'} />
                    <button className="btn btn-ghost" type="submit">{row.isActive ? c.deactivate : c.activate}</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
