import { describe, expect, it } from 'vitest';
import { isSecureDeployment, sessionCookieOptions, sessionSameSite } from './session-cookie';

const httpsEnv = { NODE_ENV: 'production', NEXT_PUBLIC_SITE_URL: 'https://paramistech.example' } as NodeJS.ProcessEnv;
const localEnv = { NODE_ENV: 'development', NEXT_PUBLIC_SITE_URL: 'http://localhost:3000' } as NodeJS.ProcessEnv;

describe('session cookie policy', () => {
  const withSameSite = (value: string) => ({ ...httpsEnv, SESSION_COOKIE_SAMESITE: value }) as NodeJS.ProcessEnv;

  it('defaults to SameSite=Strict', () => {
    expect(sessionSameSite({} as NodeJS.ProcessEnv)).toBe('strict');
    expect(sessionCookieOptions(httpsEnv).sameSite).toBe('strict');
  });

  it('supports lax and none, and ignores unknown values', () => {
    expect(sessionSameSite(withSameSite('lax'))).toBe('lax');
    expect(sessionSameSite(withSameSite('NONE'))).toBe('none');
    expect(sessionSameSite(withSameSite(' nOnE '))).toBe('none');
    expect(sessionSameSite(withSameSite('whatever'))).toBe('strict');
  });

  it('forces Secure whenever the cookie is SameSite=None (browsers reject it otherwise)', () => {
    const cookie = sessionCookieOptions({ ...localEnv, SESSION_COOKIE_SAMESITE: 'none' });
    expect(cookie.sameSite).toBe('none');
    expect(cookie.secure).toBe(true);
  });

  it('keeps the cookie http-only, site-wide and seven days long', () => {
    const cookie = sessionCookieOptions(httpsEnv);
    expect(cookie.httpOnly).toBe(true);
    expect(cookie.path).toBe('/');
    expect(cookie.maxAge).toBe(7 * 24 * 60 * 60);
  });

  it('only marks a production https deployment as secure by itself', () => {
    expect(isSecureDeployment(httpsEnv)).toBe(true);
    expect(isSecureDeployment(localEnv)).toBe(false);
    expect(isSecureDeployment({ NODE_ENV: 'production', NEXT_PUBLIC_SITE_URL: 'http://example.com' } as NodeJS.ProcessEnv)).toBe(false);
  });
});
