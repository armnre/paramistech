import { describe, expect, it } from 'vitest';
import { isAllowedOrigin, isAllowedRequestOrigin, type OriginCheckInput } from './origin';

const base: OriginCheckInput = {
  origin: 'https://paramistech.example',
  host: 'app:3000',
  forwardedHost: null,
  siteUrl: 'https://paramistech.example',
  trustProxy: false,
  nodeEnv: 'production',
};

describe('admin mutation origin check', () => {
  it('rejects a missing Origin header', () => {
    expect(isAllowedOrigin({ ...base, origin: null })).toBe(false);
  });

  it('rejects an Origin that is not the configured site', () => {
    expect(isAllowedOrigin({ ...base, origin: 'https://evil.example' })).toBe(false);
    expect(isAllowedOrigin({ ...base, origin: 'not a url' })).toBe(false);
    expect(isAllowedOrigin({ ...base, origin: 'javascript:alert(1)' })).toBe(false);
  });

  it('accepts the configured site origin', () => {
    expect(isAllowedOrigin(base)).toBe(true);
  });

  it('ignores Host and X-Forwarded-Host unless the proxy is trusted', () => {
    const spoofed = { ...base, origin: 'https://evil.example', host: 'evil.example', forwardedHost: 'evil.example' };
    expect(isAllowedOrigin(spoofed)).toBe(false);
  });

  it('accepts forwarded host only when TRUST_PROXY is true', () => {
    const input = { ...base, siteUrl: undefined, origin: 'https://cms.example', forwardedHost: 'cms.example, other' };
    expect(isAllowedOrigin(input)).toBe(false);
    expect(isAllowedOrigin({ ...input, trustProxy: true })).toBe(true);
    expect(isAllowedOrigin({ ...input, trustProxy: true, origin: 'https://other.example' })).toBe(false);
  });

  it('only falls back to Host outside production when no site URL exists', () => {
    const input = { ...base, siteUrl: undefined, origin: 'http://localhost:3000', host: 'localhost:3000' };
    expect(isAllowedOrigin({ ...input, nodeEnv: 'development' })).toBe(true);
    expect(isAllowedOrigin({ ...input, nodeEnv: 'production' })).toBe(false);
  });
});

describe('no-JavaScript form posts (login/logout)', () => {
  const headers = (values: Record<string, string>) => ({ get: (name: string) => values[name] ?? null });
  const env = { NODE_ENV: 'production', NEXT_PUBLIC_SITE_URL: 'https://paramistech.example' } as NodeJS.ProcessEnv;

  it('accepts the configured origin', () => {
    expect(isAllowedRequestOrigin(headers({ origin: 'https://paramistech.example' }), env)).toBe(true);
  });

  it('falls back to a same-host Referer when the Origin header is missing', () => {
    expect(isAllowedRequestOrigin(headers({ referer: 'https://paramistech.example/admin' }), env)).toBe(true);
  });

  it('rejects a foreign Origin even with a valid Referer', () => {
    expect(
      isAllowedRequestOrigin(headers({ origin: 'https://evil.example', referer: 'https://paramistech.example/admin' }), env),
    ).toBe(false);
  });

  it('rejects a foreign or unparseable Referer', () => {
    expect(isAllowedRequestOrigin(headers({ referer: 'https://evil.example/form' }), env)).toBe(false);
    expect(isAllowedRequestOrigin(headers({ referer: 'not a url' }), env)).toBe(false);
    expect(isAllowedRequestOrigin(headers({}), env)).toBe(false);
  });
});
