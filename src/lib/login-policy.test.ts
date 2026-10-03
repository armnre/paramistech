import { describe, expect, it } from 'vitest';
import { MAX_EMAIL_FAILURES, MAX_IP_FAILURES, isLockedOut } from './login-policy';

describe('login lockout', () => {
  it('allows attempts below both limits', () => {
    expect(isLockedOut({ ip: MAX_IP_FAILURES - 1, email: MAX_EMAIL_FAILURES - 1 })).toBe(false);
  });

  it('locks out when one email is attacked, regardless of IP', () => {
    expect(isLockedOut({ ip: 1, email: MAX_EMAIL_FAILURES })).toBe(true);
  });

  it('locks out an IP spraying many different emails', () => {
    expect(isLockedOut({ ip: MAX_IP_FAILURES, email: 0 })).toBe(true);
  });
});
