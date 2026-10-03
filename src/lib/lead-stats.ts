import { count, desc, eq, gte } from 'drizzle-orm';
import { db } from '@/db';
import { leads } from '@/db/schema';

export async function leadDashboard() {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [all, fresh, week, latest] = await Promise.all([
    db.select({ total: count() }).from(leads),
    db.select({ total: count() }).from(leads).where(eq(leads.status, 'new')),
    db.select({ total: count() }).from(leads).where(gte(leads.createdAt, weekAgo)),
    db.select().from(leads).orderBy(desc(leads.createdAt)).limit(5),
  ]);
  return { total: all[0].total, fresh: fresh[0].total, week: week[0].total, latest };
}
