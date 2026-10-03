import { NextRequest, NextResponse } from 'next/server';
import { writeAudit } from '@/lib/audit';
import { COOKIE_NAME, getSessionUser, revokeSessionByToken } from '@/lib/auth';
import { requestOriginAllowed } from '@/lib/origin';

export async function POST(request: NextRequest) {
  if (!requestOriginAllowed(request.headers)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const user = await getSessionUser();
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (token) await revokeSessionByToken(token);
  if (user) await writeAudit(user.id, 'logout', 'session');

  const response = NextResponse.json({ ok: true });
  response.cookies.set(COOKIE_NAME, '', { path: '/', maxAge: 0, httpOnly: true, sameSite: 'strict' });
  return response;
}
