import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { and, eq, ne } from 'drizzle-orm';
import { db } from '@/db';
import { sessions, users } from '@/db/schema';
import { isRole, type Role } from '@/lib/permissions';
import {
  ABSOLUTE_MS,
  evaluateSession,
  generateToken,
  hashToken,
  nextExpiry,
  shouldTouch,
} from '@/lib/session-policy';

export const COOKIE_NAME = 'paramis_session';

export type SessionUser = { id: number; email: string; role: Role; sessionId: number };

/** Secure cookies only make sense (and only work in Safari) when the site is served over https. */
export function isSecureDeployment() {
  return process.env.NODE_ENV === 'production' && (process.env.NEXT_PUBLIC_SITE_URL ?? '').startsWith('https://');
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: isSecureDeployment(),
    sameSite: 'strict' as const,
    path: '/',
    maxAge: Math.floor(ABSOLUTE_MS / 1000),
  };
}

export async function createSession(userId: number, context: { ipHash: string; userAgent: string }) {
  const token = generateToken();
  const now = new Date();
  await db.insert(sessions).values({
    userId,
    tokenHash: hashToken(token),
    createdAt: now,
    lastSeenAt: now,
    expiresAt: nextExpiry(now, now),
    ipHash: context.ipHash,
    userAgent: context.userAgent.slice(0, 300),
  });
  return token;
}

/** Cached per request. Returns null for missing, expired, revoked or deactivated sessions. */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  try {
    const token = (await cookies()).get(COOKIE_NAME)?.value;
    if (!token) return null;

    const now = new Date();
    const [row] = await db
      .select({
        sessionId: sessions.id,
        createdAt: sessions.createdAt,
        lastSeenAt: sessions.lastSeenAt,
        expiresAt: sessions.expiresAt,
        userId: users.id,
        email: users.email,
        role: users.role,
        isActive: users.isActive,
      })
      .from(sessions)
      .innerJoin(users, eq(sessions.userId, users.id))
      .where(eq(sessions.tokenHash, hashToken(token)))
      .limit(1);

    const status = evaluateSession(row ? { ...row, userActive: row.isActive } : null, now);
    if (status !== 'ok') {
      if (row) await db.delete(sessions).where(eq(sessions.id, row.sessionId));
      return null;
    }
    if (!isRole(row.role)) return null;

    if (shouldTouch(row.lastSeenAt, now)) {
      await db
        .update(sessions)
        .set({ lastSeenAt: now, expiresAt: nextExpiry(now, row.createdAt) })
        .where(eq(sessions.id, row.sessionId));
    }
    return { id: row.userId, email: row.email, role: row.role, sessionId: row.sessionId };
  } catch (error) {
    console.error('Session lookup failed', error);
    return null;
  }
});

/** Any signed-in staff member (admin or editor). Role checks happen separately via can(). */
export const getStaff = getSessionUser;

export async function revokeSessionByToken(token: string) {
  await db.delete(sessions).where(eq(sessions.tokenHash, hashToken(token)));
}

export async function revokeUserSessions(userId: number, exceptSessionId?: number) {
  const where = exceptSessionId
    ? and(eq(sessions.userId, userId), ne(sessions.id, exceptSessionId))
    : eq(sessions.userId, userId);
  await db.delete(sessions).where(where);
}
