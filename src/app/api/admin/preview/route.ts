import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getStaff } from '@/lib/auth';
import { requestOriginAllowed } from '@/lib/origin';
import { renderMarkdown } from '@/lib/markdown';

const body = z.object({ markdown: z.string().max(50000) });

export async function POST(request: NextRequest) {
  const admin = await getStaff();
  if (!admin || !requestOriginAllowed(request.headers)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const parsed = body.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: 'Invalid' }, { status: 400 });
  return NextResponse.json({ html: await renderMarkdown(parsed.data.markdown) });
}
