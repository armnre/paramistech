import { createHash, randomBytes } from 'node:crypto';

export const SLIDING_MS = 8 * 60 * 60 * 1000;
export const ABSOLUTE_MS = 7 * 24 * 60 * 60 * 1000;
const TOUCH_INTERVAL_MS = 60 * 1000;

export function generateToken() {
  return randomBytes(32).toString('base64url');
}

export function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

/** Sliding 8h expiry that can never pass the 7 day absolute limit. */
export function nextExpiry(now: Date, createdAt: Date) {
  return new Date(Math.min(now.getTime() + SLIDING_MS, createdAt.getTime() + ABSOLUTE_MS));
}

export function shouldTouch(lastSeenAt: Date, now: Date) {
  return now.getTime() - lastSeenAt.getTime() > TOUCH_INTERVAL_MS;
}

export type SessionRow = { createdAt: Date; expiresAt: Date; userActive: boolean };
export type SessionStatus = 'ok' | 'missing' | 'expired' | 'inactive';

/** `null` means the row does not exist, e.g. because the session was revoked. */
export function evaluateSession(row: SessionRow | null, now: Date): SessionStatus {
  if (!row) return 'missing';
  if (!row.userActive) return 'inactive';
  if (row.expiresAt.getTime() <= now.getTime()) return 'expired';
  if (row.createdAt.getTime() + ABSOLUTE_MS <= now.getTime()) return 'expired';
  return 'ok';
}
