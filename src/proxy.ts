import { NextResponse, type NextRequest } from 'next/server';
import { analyticsOriginFromEnv, buildCsp } from '@/lib/csp';
import { detectLocaleFromPath } from '@/lib/i18n/dictionary';
import { cachePolicyFor } from '@/lib/cache-policy';

/**
 * Runs for pages, feeds and files from /public. The matcher below excludes /api and /_next/*, so those
 * responses are never touched here: Next serves /_next/static as immutable and /api/media sets its own header.
 */
export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const csp = buildCsp({
    nonce,
    isDev: process.env.NODE_ENV !== 'production',
    analyticsOrigin: analyticsOriginFromEnv(),
  });

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('x-pathname', pathname);
  requestHeaders.set('x-locale', detectLocaleFromPath(pathname));
  requestHeaders.set('Content-Security-Policy', csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('Content-Security-Policy', csp);

  const cacheControl = cachePolicyFor(pathname);
  if (cacheControl) response.headers.set('Cache-Control', cacheControl);

  // HSTS is only meaningful (and only sent) over HTTPS; Caddy tells us via X-Forwarded-Proto.
  if (request.nextUrl.protocol === 'https:' || request.headers.get('x-forwarded-proto') === 'https') {
    response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  }
  return response;
}

export const config = {
  matcher: [
    {
      source: '/((?!api|_next/static|_next/image|_next/dev|_next/data).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
