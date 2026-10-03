import type { Metadata } from 'next';
import Image from 'next/image';
import { desc } from 'drizzle-orm';
import { deleteMedia, uploadMedia } from '@/app/admin/actions';
import { AdminLogin } from '@/components/admin-login';
import { DeleteForm } from '@/components/admin-ui';
import { adminCopy as c } from '@/content/admin';
import { db } from '@/db';
import { media } from '@/db/schema';
import { getStaff } from '@/lib/auth';

export const metadata: Metadata = { title: c.media, robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function MediaAdmin({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const admin = await getStaff();
  if (!admin) return <AdminLogin />;
  const query = await searchParams;
  const rows = await db.select().from(media).orderBy(desc(media.createdAt));
  return (
    <>
      <h1>{c.media}</h1>
      {query.saved && <p className="notice">{c.saved}</p>}
      {query.error && <p className="notice error">{query.error}</p>}
      <form className="card form-card" action={uploadMedia}>
        <div className="field"><label htmlFor="file">{c.upload}</label><input id="file" name="file" type="file" accept="image/png,image/jpeg,image/webp" required /></div>
        <div className="field"><label htmlFor="altText">{c.alt}</label><input id="altText" name="altText" required /></div>
        <button className="btn btn-primary" type="submit">{c.upload}</button>
      </form>
      <div className="projects-grid" style={{ marginBlockStart: 24 }}>
        {rows.map((item) => (
          <article className="card" key={item.id} style={{ padding: 16 }}>
            <Image src={`/api/media/${item.id}`} alt={item.altText} width={item.width} height={item.height} style={{ width: '100%', height: 140, objectFit: 'cover' }} />
            <p>{item.altText}</p>
            <DeleteForm action={deleteMedia} id={item.id} />
          </article>
        ))}
      </div>
    </>
  );
}
