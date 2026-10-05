import { NextRequest, NextResponse } from 'next/server';
import { writeAudit } from '@/lib/audit';
import { COOKIE_NAME, getSessionUser, revokeSessionByToken } from '@/lib/auth';
import { isAllowedRequestOrigin } from '@/lib/origin';

const clearCookie = { path: '/', maxAge: 0, httpOnly: true, sameSite: 'strict' as const };

export async function POST(request: NextRequest) {
  // The logout button is a native form post, so it answers with a redirect instead of JSON.
  const contentType = request.headers.get('content-type') ?? '';
  const isNativeFormPost =
    contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data');

  if (!isAllowedRequestOrigin(request.headers)) {
    if (isNativeFormPost) return new NextResponse(null, { status: 303, headers: { location: '/admin?error=invalid' } });
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const user = await getSessionUser();
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (token) await revokeSessionByToken(token);
  if (user) await writeAudit(user.id, 'logout', 'session');

  if (isNativeFormPost) {
    const response = new NextResponse(null, { status: 303, headers: { location: '/admin' } });
    response.cookies.set(COOKIE_NAME, '', clearCookie);
    return response;
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(COOKIE_NAME, '', clearCookie);
  return response;
}
