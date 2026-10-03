import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { AdminShell } from '@/components/admin-ui';
import { getStaff } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const admin = await getStaff();
  if (!admin) return children;
  return <AdminShell email={admin.email} role={admin.role}>{children}</AdminShell>;
}
