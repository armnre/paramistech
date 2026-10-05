import { createHash } from 'node:crypto';

const DAY_MS = 24 * 60 * 60 * 1000;

export function attemptRetentionCutoff(now = new Date()) {
  return new Date(now.getTime() - 7 * DAY_MS);
}

export function requireRateLimitSalt() {
  const salt = process.env.RATE_LIMIT_SALT?.trim();
  if (process.env.NODE_ENV === 'production' && (!salt || salt.length < 16)) {
    throw new Error('RATE_LIMIT_SALT is required in production and must be at least 16 characters');
  }
  return salt || 'development-only-rate-limit-salt';
}

export function resolveClientIp(headerStore: { get(name: string): string | null }) {
  if (process.env.TRUST_PROXY === 'true') {
    // X-Real-IP is a single value and is overwritten by the proxies this project documents (Caddy sets
    // it). Prefer it when present: unlike X-Forwarded-For it cannot carry client-supplied entries.
    const realIp = headerStore.get('x-real-ip')?.trim();
    if (realIp) return realIp;
    // Fall back to the first hop of X-Forwarded-For. Only trustworthy when the proxy overwrites the
    // header (docker-compose.yml sets TRUST_PROXY=true for that reason); an appending proxy lets a
    // client prepend a value and rotate its own rate-limit bucket.
    const forwarded = headerStore.get('x-forwarded-for')?.split(',')[0]?.trim();
    if (forwarded) return forwarded;
  }
  return 'unknown';
}

export function hashClientIp(ip: string) {
  return createHash('sha256').update(`${ip}:${requireRateLimitSalt()}`).digest('hex');
}

export function hashEmail(email: string) {
  return createHash('sha256').update(`email:${email.trim().toLowerCase()}:${requireRateLimitSalt()}`).digest('hex');
}
