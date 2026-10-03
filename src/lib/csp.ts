export type CspOptions = {
  nonce: string;
  isDev?: boolean;
  /** Origin of the optional analytics script, e.g. https://stats.example.com */
  analyticsOrigin?: string | null;
};

export function analyticsOriginFromEnv(env: Record<string, string | undefined> = process.env) {
  const url = env.ANALYTICS_SCRIPT_URL;
  if (!url || !env.ANALYTICS_SITE_ID) return null;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' ? parsed.origin : null;
  } catch {
    return null;
  }
}

export function buildCsp({ nonce, isDev = false, analyticsOrigin = null }: CspOptions) {
  const analytics = analyticsOrigin ? ` ${analyticsOrigin}` : '';
  const directives = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ''}${analytics}`,
    // React style props and framer-motion emit inline style attributes, so styles keep 'unsafe-inline'.
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob:${analytics}`,
    "font-src 'self'",
    `connect-src 'self'${analytics}${isDev ? ' ws: wss:' : ''}`,
    "manifest-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ];
  return directives.join('; ');
}
