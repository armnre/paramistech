import { readFile } from 'node:fs/promises';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { media } from '@/db/schema';
import { safeUploadPath } from '@/lib/uploads';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isSafeInteger(id)) return new Response('Not found', { status: 404 });
  const [item] = await db.select().from(media).where(eq(media.id, id)).limit(1);
  if (!item) return new Response('Not found', { status: 404 });
  try {
    const bytes = await readFile(/* turbopackIgnore: true */ safeUploadPath(item.path));
    return new Response(bytes, {
      headers: {
        'Content-Type': 'image/webp',
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Content-Type-Options': 'nosniff',
        'Content-Disposition': 'inline',
      },
    });
  } catch {
    return new Response('Not found', { status: 404 });
  }
}
