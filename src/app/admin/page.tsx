import type { Metadata } from 'next';
import Link from 'next/link';
import { AdminLogin } from '@/components/admin-login';
import { adminCopy as c } from '@/content/admin';
import { toFa } from '@/lib/digits';
import { getStaff } from '@/lib/auth';
import { leadDashboard } from '@/lib/lead-stats';
import { notificationStatus } from '@/lib/notify-content';

export const metadata: Metadata = { title: c.dashboard, robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const admin = await getStaff();
  if (!admin) return <AdminLogin />;
  const stats = await leadDashboard();
  const notifications = notificationStatus();
  return (
    <>
      <h1>{c.dashboard}</h1>
      <div className="projects-grid admin-stats">
        <div className="card"><span>{c.total}</span><strong>{toFa(stats.total)}</strong></div>
        <div className="card"><span>{c.newLeads}</span><strong>{toFa(stats.fresh)}</strong></div>
        <div className="card"><span>{c.week}</span><strong>{toFa(stats.week)}</strong></div>
      </div>
      <div className="card" style={{ padding: 20, marginBlockEnd: 24 }}>
        <h2 style={{ fontSize: 18 }}>{c.notifications}</h2>
        <p>
          {c.emailNotify}:{' '}
          <span className={`status-pill ${notifications.email ? '' : 'off'}`}>{notifications.email ? c.configured : c.notConfigured}</span>
          {' · '}
          {c.telegramNotify}:{' '}
          <span className={`status-pill ${notifications.telegram ? '' : 'off'}`}>{notifications.telegram ? c.configured : c.notConfigured}</span>
        </p>
      </div>
      <h2>{c.latest}</h2>
      {stats.latest.length === 0 ? <div className="card admin-empty">{c.empty}</div> : (
        <div className="card admin-table-wrap">
          <table className="admin-table">
            <thead><tr><th>{c.name}</th><th>{c.type}</th><th>{c.localeColumn}</th><th>{c.date}</th><th>{c.status}</th></tr></thead>
            <tbody>
              {stats.latest.map((item) => (
                <tr key={item.id}>
                  <td><Link href={`/admin/leads/${item.id}`}>{item.name}</Link></td>
                  <td>{item.projectType}</td>
                  <td>{c.localeNames[item.locale as 'fa' | 'en'] ?? item.locale}</td>
                  <td>{toFa(item.createdAt.toISOString().slice(0, 10))}</td>
                  <td>{c.statuses[item.status as keyof typeof c.statuses] || item.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
