import { afterEach, describe, expect, it, vi } from 'vitest';
import { attemptRetentionCutoff, requireRateLimitSalt, resolveClientIp } from './request-security';

const original = { ...process.env };

afterEach(() => {
  process.env = { ...original };
});

describe('request security', () => {
  it('retains attempt rows for seven days', () => {
    const now = new Date('2026-10-08T00:00:00.000Z');
    expect(attemptRetentionCutoff(now).toISOString()).toBe('2026-10-01T00:00:00.000Z');
  });

  it('ignores forwarded IP unless the proxy is explicitly trusted', () => {
    const headers = { get: (name: string) => (name === 'x-forwarded-for' ? '203.0.113.8, 10.0.0.1' : null) };
    delete process.env.TRUST_PROXY;
    expect(resolveClientIp(headers)).toBe('unknown');
    process.env.TRUST_PROXY = 'true';
    expect(resolveClientIp(headers)).toBe('203.0.113.8');
  });

  it('requires a long rate-limit salt in production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    delete process.env.RATE_LIMIT_SALT;
    expect(() => requireRateLimitSalt()).toThrow(/RATE_LIMIT_SALT/);
    process.env.RATE_LIMIT_SALT = 'long-enough-salt-value';
    expect(requireRateLimitSalt()).toBe('long-enough-salt-value');
  });
});
