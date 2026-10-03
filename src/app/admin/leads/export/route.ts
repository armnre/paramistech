import { eq } from 'drizzle-orm';
import { NextRequest } from 'next/server';
import { adminCopy as c } from '@/content/admin';
import { db } from '@/db';
import { leads } from '@/db/schema';
import { writeAudit } from '@/lib/audit';
import { getStaff } from '@/lib/auth';
import { toCsv } from '@/lib/csv';
import { can } from '@/lib/permissions';

export async function GET(request: NextRequest) {
  const user = await getStaff();
  if (!user) return new Response('Unauthorized', { status: 401 });
  if (!can(user.role, 'leads:export')) return new Response('Forbidden', { status: 403 });

  const status = request.nextUrl.searchParams.get('status') || '';
  const rows = await db
    .select()
    .from(leads)
    .where(status in c.statuses ? eq(leads.status, status) : undefined)
    .orderBy(leads.id);
  const csv = toCsv(
    rows.map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      projectType: row.projectType,
      locale: row.locale,
      budget: row.budget,
      timeline: row.timeline,
      status: row.status,
      createdAt: row.createdAt.toISOString(),
      details: row.details,
    })),
  );
  await writeAudit(user.id, 'lead.export', 'lead', rows.length);
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="leads.csv"',
      'Cache-Control': 'no-store',
    },
  });
}
