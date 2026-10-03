import type { Metadata } from 'next';
import { changeOwnPassword, logoutEverywhere } from '@/app/admin/user-actions';
import { AdminLogin } from '@/components/admin-login';
import { adminCopy as c } from '@/content/admin';
import { getStaff } from '@/lib/auth';

export const metadata: Metadata = { title: c.account, robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const staff = await getStaff();
  if (!staff) return <AdminLogin />;
  const query = await searchParams;
  return (
    <>
      <h1>{c.account}</h1>
      {query.saved && <p className="notice" role="status">{c.saved}</p>}
      {query.error && <p className="notice error" role="alert">{query.error}</p>}
      <form className="card form-card" action={changeOwnPassword} style={{ marginBlockEnd: 24 }}>
        <h2>{c.changePassword}</h2>
        <div className="field"><label htmlFor="current">{c.currentPassword}</label><input id="current" name="current" type="password" autoComplete="current-password" required /></div>
        <div className="field"><label htmlFor="next">{c.newPassword}</label><input id="next" name="next" type="password" autoComplete="new-password" minLength={14} required /></div>
        <div className="field"><label htmlFor="confirm">{c.confirmPassword}</label><input id="confirm" name="confirm" type="password" autoComplete="new-password" minLength={14} required /></div>
        <button className="btn btn-primary" type="submit">{c.changePassword}</button>
      </form>
      <form className="card form-card" action={logoutEverywhere}>
        <h2>{c.logoutEverywhere}</h2>
        <button className="btn btn-outline" type="submit">{c.logoutEverywhere}</button>
      </form>
    </>
  );
}
