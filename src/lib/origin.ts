export type OriginCheckInput = {
  origin: string | null;
  host: string | null;
  forwardedHost: string | null;
  siteUrl: string | undefined;
  trustProxy: boolean;
  nodeEnv?: string;
};

function hostOf(value: string | null | undefined) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.host : null;
  } catch {
    return null;
  }
}

export function allowedHosts(input: Omit<OriginCheckInput, 'origin'>) {
  const hosts = new Set<string>();
  const siteHost = hostOf(input.siteUrl);
  if (siteHost) hosts.add(siteHost);

  if (input.trustProxy) {
    if (input.host) hosts.add(input.host);
    const forwarded = input.forwardedHost?.split(',')[0]?.trim();
    if (forwarded) hosts.add(forwarded);
  }

  // Convenience for `next dev` only: without a configured site URL there is nothing to compare to.
  if (!siteHost && input.nodeEnv !== 'production' && input.host) hosts.add(input.host);
  return hosts;
}

/** Mutations must carry an Origin header whose host is explicitly allowed. */
export function isAllowedOrigin(input: OriginCheckInput) {
  if (!input.origin) return false;
  const originHost = hostOf(input.origin);
  if (!originHost) return false;
  return allowedHosts(input).has(originHost);
}

function originInput(headers: { get(name: string): string | null }, env: NodeJS.ProcessEnv) {
  return {
    host: headers.get('host'),
    forwardedHost: headers.get('x-forwarded-host'),
    siteUrl: env.NEXT_PUBLIC_SITE_URL,
    trustProxy: env.TRUST_PROXY === 'true',
    nodeEnv: env.NODE_ENV,
  };
}

export function requestOriginAllowed(headers: { get(name: string): string | null }, env: NodeJS.ProcessEnv = process.env) {
  return isAllowedOrigin({ ...originInput(headers, env), origin: headers.get('origin') });
}

/**
 * Same check, with a Referer fallback for plain HTML form posts (the no-JavaScript login/logout path).
 * Browsers omit Origin on some navigations and privacy tooling can strip it; Referer is still
 * host-checked. Both headers are browser-controlled, so a cross-site post cannot forge either.
 */
export function isAllowedRequestOrigin(headers: { get(name: string): string | null }, env: NodeJS.ProcessEnv = process.env) {
  const input = originInput(headers, env);
  const origin = headers.get('origin');
  // A present Origin is authoritative: a matching Referer must never rescue a foreign one.
  if (origin) return isAllowedOrigin({ ...input, origin });
  const referer = headers.get('referer');
  if (!referer) return false;
  return isAllowedOrigin({ ...input, origin: referer });
}
