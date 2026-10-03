import { describe, expect, it } from 'vitest';
import {
  ABSOLUTE_MS,
  SLIDING_MS,
  evaluateSession,
  generateToken,
  hashToken,
  nextExpiry,
  shouldTouch,
} from './session-policy';

const hour = 60 * 60 * 1000;
const created = new Date('2026-01-01T00:00:00Z');

describe('session tokens', () => {
  it('generates unguessable tokens and stores only a SHA-256 hash', () => {
    const token = generateToken();
    expect(token.length).toBeGreaterThanOrEqual(43);
    expect(generateToken()).not.toBe(token);
    const hash = hashToken(token);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).not.toContain(token);
  });
});

describe('sliding expiry', () => {
  it('extends by 8 hours from now', () => {
    const now = new Date(created.getTime() + 3 * hour);
    expect(nextExpiry(now, created).getTime()).toBe(now.getTime() + SLIDING_MS);
  });

  it('never goes beyond 7 days from creation', () => {
    const now = new Date(created.getTime() + ABSOLUTE_MS - hour);
    expect(nextExpiry(now, created).getTime()).toBe(created.getTime() + ABSOLUTE_MS);
  });

  it('touches the row at most once a minute', () => {
    const now = new Date('2026-01-01T10:00:00Z');
    expect(shouldTouch(new Date(now.getTime() - 30_000), now)).toBe(false);
    expect(shouldTouch(new Date(now.getTime() - 120_000), now)).toBe(true);
  });
});

describe('session evaluation', () => {
  const now = new Date(created.getTime() + 2 * hour);
  const fresh = { createdAt: created, expiresAt: new Date(created.getTime() + SLIDING_MS), userActive: true };

  it('accepts a live session of an active user', () => {
    expect(evaluateSession(fresh, now)).toBe('ok');
  });

  it('treats a revoked (deleted) session as missing', () => {
    expect(evaluateSession(null, now)).toBe('missing');
  });

  it('rejects an idle-expired session', () => {
    expect(evaluateSession(fresh, new Date(created.getTime() + 9 * hour))).toBe('expired');
  });

  it('rejects sessions older than the absolute limit even if recently extended', () => {
    const extended = { ...fresh, expiresAt: new Date(created.getTime() + ABSOLUTE_MS + hour) };
    expect(evaluateSession(extended, new Date(created.getTime() + ABSOLUTE_MS + 1))).toBe('expired');
  });

  it('rejects sessions of deactivated users', () => {
    expect(evaluateSession({ ...fresh, userActive: false }, now)).toBe('inactive');
  });
});
