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
import { requestOriginAllowed } from '@/lib/origin';
import { hashClientIp, hashEmail, resolveClientIp } from '@/lib/request-security';

const credentials = z.object({
  email: z.email().max(255),
  password: z.string().min(1).max(200),
});

// Compared against when the user does not exist, so both paths cost one bcrypt verification.
let dummyHash: Promise<string> | undefined;
function getDummyHash() {
  dummyHash ??= hash('not-a-real-password-for-timing', 12);
  return dummyHash;
}

function invalid(status: number) {
  return NextResponse.json({ error: adminCopy.invalid }, { status });
}

export async function POST(request: NextRequest) {
  try {
    if (!requestOriginAllowed(request.headers)) return invalid(403);

    const body = credentials.safeParse(await request.json());
    if (!body.success) return invalid(400);
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
      return NextResponse.json({ error: adminCopy.limited }, { status: 429 });
    }

    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    const passwordMatches = await compare(body.data.password, user?.passwordHash ?? (await getDummyHash()));
    if (!user || !user.isActive || !passwordMatches) {
      await db.insert(adminLoginAttempts).values({ ipHash, emailHash });
      return invalid(401);
    }

    const token = await createSession(user.id, {
      ipHash,
      userAgent: request.headers.get('user-agent') ?? '',
    });
    await db.delete(adminLoginAttempts).where(eq(adminLoginAttempts.emailHash, emailHash));
    await writeAudit(user.id, 'login', 'session');

    const response = NextResponse.json({ ok: true });
    response.cookies.set(COOKIE_NAME, token, sessionCookieOptions());
    return response;
  } catch (error) {
    console.error('Admin login failed', error);
    return invalid(500);
  }
}
