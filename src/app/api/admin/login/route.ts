import { NextRequest, NextResponse } from 'next/server';
import { compare, hash } from 'bcryptjs';
import { and, count, eq, gte } from 'drizzle-orm';
import { z } from 'zod';
import { adminCopy } from '@/content/admin';
import { db } from '@/db';
import { adminLoginAttempts, users } from '@/db/schema';
import { writeAudit } from '@/lib/audit';
import { COOKIE_NAME, createSession, sessionCookieOptions } from '@/lib/auth';
import { cleanupOldAttempts } from '@/lib/attempt-cleanup';
import { LOGIN_WINDOW_MS, isLockedOut } from '@/lib/login-policy';
import { isAllowedRequestOrigin } from '@/lib/origin';
import { hashClientIp, hashEmail, resolveClientIp } from '@/lib/request-security';

const credentials = z.object({
  email: z.email().max(255),
  password: z.string().min(1).max(200),
});

/**
 * The login form posts natively (form action/method) when JavaScript is unavailable or blocked, and
 * via fetch otherwise. Native posts must answer with a redirect: never JSON in a browser tab.
 */
function isNativeFormPost(request: NextRequest) {
  const contentType = request.headers.get('content-type') ?? '';
  return contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data');
}

async function readCredentials(request: NextRequest) {
  if (isNativeFormPost(request)) {
    const form = await request.formData().catch(() => null);
    if (!form) return null;
    return credentials.safeParse({ email: form.get('email'), password: form.get('password') });
  }
  return credentials.safeParse(await request.json().catch(() => null));
}

/** Redirect back to the form with a known code; AdminLogin maps it to copy (never free text). */
function redirectTo(path: string, cookie?: { name: string; value: string; options: ReturnType<typeof sessionCookieOptions> }) {
  const response = new NextResponse(null, { status: 303, headers: { location: path } });
  if (cookie) response.cookies.set(cookie.name, cookie.value, cookie.options);
  return response;
}

// Compared against when the user does not exist, so both paths cost one bcrypt verification.
let dummyHash: Promise<string> | undefined;
function getDummyHash() {
  dummyHash ??= hash('not-a-real-password-for-timing', 12);
  return dummyHash;
}

function invalid(status: number, request?: NextRequest, code: 'invalid' | 'limited' = 'invalid') {
  if (request && isNativeFormPost(request)) return redirectTo(`/admin?error=${code}`);
  return NextResponse.json({ error: code === 'limited' ? adminCopy.limited : adminCopy.invalid }, { status });
}

export async function POST(request: NextRequest) {
  try {
    if (!isAllowedRequestOrigin(request.headers)) return invalid(403, request);

    const body = await readCredentials(request);
    if (!body?.success) return invalid(400, request);
    const email = body.data.email.toLowerCase();

    await cleanupOldAttempts().catch((error) => console.error('Attempt cleanup failed', error));
    const ipHash = hashClientIp(resolveClientIp(request.headers));
    const emailHash = hashEmail(email);
    const since = new Date(Date.now() - LOGIN_WINDOW_MS);

    const [byIp] = await db
      .select({ total: count() })
      .from(adminLoginAttempts)
      .where(and(eq(adminLoginAttempts.ipHash, ipHash), gte(adminLoginAttempts.createdAt, since)));
    const [byEmail] = await db
      .select({ total: count() })
      .from(adminLoginAttempts)
      .where(and(eq(adminLoginAttempts.emailHash, emailHash), gte(adminLoginAttempts.createdAt, since)));
    if (isLockedOut({ ip: byIp.total, email: byEmail.total })) {
      return invalid(429, request, 'limited');
    }

    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    const passwordMatches = await compare(body.data.password, user?.passwordHash ?? (await getDummyHash()));
    if (!user || !user.isActive || !passwordMatches) {
      await db.insert(adminLoginAttempts).values({ ipHash, emailHash });
      return invalid(401, request);
    }

    const token = await createSession(user.id, {
      ipHash,
      userAgent: request.headers.get('user-agent') ?? '',
    });
    await db.delete(adminLoginAttempts).where(eq(adminLoginAttempts.emailHash, emailHash));
    await writeAudit(user.id, 'login', 'session');

    if (isNativeFormPost(request)) {
      // POST -> 303 -> GET: the browser lands in the panel and a refresh cannot resubmit credentials.
      return redirectTo('/admin', { name: COOKIE_NAME, value: token, options: sessionCookieOptions() });
    }

    const response = NextResponse.json({ ok: true });
    response.cookies.set(COOKIE_NAME, token, sessionCookieOptions());
    return response;
  } catch (error) {
    console.error('Admin login failed', error);
    return invalid(500, request);
  }
}
