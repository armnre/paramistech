import { describe, expect, it } from 'vitest';
import { analyticsOriginFromEnv, buildCsp } from './csp';

describe('content security policy', () => {
  it('uses a nonce and no unsafe-inline for scripts', () => {
    const csp = buildCsp({ nonce: 'abc123' });
    const script = csp.split('; ').find((part) => part.startsWith('script-src')) ?? '';
    expect(script).toContain("'nonce-abc123'");
    expect(script).not.toContain('unsafe-inline');
    expect(script).not.toContain('unsafe-eval');
    expect(csp).toContain("frame-ancestors 'none'");
  });

  it('only allows eval in development', () => {
    expect(buildCsp({ nonce: 'n', isDev: true })).toContain("'unsafe-eval'");
  });

  it('adds the analytics origin only when configured with https', () => {
    expect(buildCsp({ nonce: 'n' })).not.toContain('stats.example');
    const origin = analyticsOriginFromEnv({ ANALYTICS_SCRIPT_URL: 'https://stats.example/u.js', ANALYTICS_SITE_ID: 'x' });
    expect(origin).toBe('https://stats.example');
    expect(buildCsp({ nonce: 'n', analyticsOrigin: origin })).toContain('https://stats.example');
    expect(analyticsOriginFromEnv({ ANALYTICS_SCRIPT_URL: 'http://stats.example/u.js', ANALYTICS_SITE_ID: 'x' })).toBeNull();
    expect(analyticsOriginFromEnv({ ANALYTICS_SCRIPT_URL: 'https://stats.example/u.js' })).toBeNull();
  });
});
