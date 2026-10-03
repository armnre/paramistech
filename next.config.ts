import type { NextConfig } from 'next';

// CSP (per-request nonce), HSTS (https only) and Cache-Control are set in src/proxy.ts.
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'X-Frame-Options', value: 'DENY' },
];

const nextConfig: NextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  // Kept external so they are traced into .next/standalone/node_modules for the seed/migrate scripts.
  serverExternalPackages: ['bcryptjs', 'pg', 'sharp', 'nodemailer'],
  // Cover uploads go through server actions; the 1 MB default would reject valid 5 MB images.
  experimental: { serverActions: { bodySizeLimit: '6mb' } },
  outputFileTracingIncludes: {
    '/**': [
      './src/assets/fonts/**/*.ttf',
      // The standalone trace misses libvips' shared library, so sharp would silently fall back to
      // its WASM build (slower uploads, and no text rendering for OG images).
      './node_modules/@img/sharp-libvips-*/lib/*',
    ],
  },
  // Never ship secrets or tooling inside the standalone output, whatever the tracer decides to follow.
  outputFileTracingExcludes: {
    '/**': ['./.env*', './.git/**', './e2e/**', './artifacts/**', './data/**', './backups/**', './scripts/**', './drizzle/**', './*.md'],
  },
  images: { localPatterns: [{ pathname: '/api/media/**' }] },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
