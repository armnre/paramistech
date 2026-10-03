import { headers } from 'next/headers';
import { analyticsOriginFromEnv } from '@/lib/csp';

/**
 * Optional privacy-friendly analytics. Renders nothing unless ANALYTICS_SCRIPT_URL (https) and
 * ANALYTICS_SITE_ID are both set. Never loaded on admin pages. The script carries the CSP nonce.
 */
export async function Analytics() {
  if (!analyticsOriginFromEnv()) return null;
  const headerStore = await headers();
  if (headerStore.get('x-pathname')?.startsWith('/admin')) return null;
  return (
    <script
      defer
      src={process.env.ANALYTICS_SCRIPT_URL}
      data-website-id={process.env.ANALYTICS_SITE_ID}
      data-domain={process.env.ANALYTICS_SITE_ID}
      nonce={headerStore.get('x-nonce') ?? undefined}
    />
  );
}
